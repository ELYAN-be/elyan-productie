/**
 * ELYAN data retention — service_role maintenance only.
 * Default dry-run. Never browser/public. Idempotent planning.
 *
 * Policy (launch):
 * 1. Closed customer requests (+ cascaded responses/events): 24 months after closed_at
 * 2. Non-continuing interest candidates: 12 months after updated_at
 * 3. Incomplete onboarding partners: 12 months inactivity
 * 4. Active professionals: retain
 * 5. Closed partner accounts: operational purge 24 months after closed_at; force non-public first
 * 6. Assets: deleted with partner purge (within 30-day window of final account deletion)
 * 7. Calculator PDF/email: N/A (transient generation; no ELYAN PDF store)
 * 8. Request/profile-linked control trails: removed with parent case / partner purge
 * 9. Ordinary platform logs: not in Postgres (Vercel) — manual/vendor
 * 10. Security-incident evidence: retention_holds
 * 11. analytics_daily_counts: 36 months by event_date
 */
'use strict';

var POLICY = {
  closedRequestMonths: 24,
  interestCandidateMonths: 12,
  incompleteOnboardingMonths: 12,
  closedPartnerMonths: 24,
  assetsAfterDeletionDays: 30,
  analyticsMonths: 36
};

var CANDIDATE_NON_CONTINUE = {
  interest_received: true,
  screening: true,
  review_required: true,
  blocked: true
};

var INCOMPLETE_ONBOARDING = {
  not_started: true,
  in_progress: true,
  changes_requested: true
};

function monthsAgo(now, months) {
  var d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function iso(d) {
  return d.toISOString();
}

function holdKey(type, id) {
  return String(type) + ':' + String(id);
}

function isHeld(holds, type, id) {
  return !!holds[holdKey(type, id)];
}

/**
 * Load active retention holds into a lookup map.
 */
async function loadHolds(admin) {
  var map = Object.create(null);
  var { data, error } = await admin
    .from('retention_holds')
    .select('subject_type, subject_id, reason')
    .is('cleared_at', null);
  if (error) {
    // Table may not exist until migration is applied — fail closed (no deletes).
    return { ok: false, code: 'holds_unavailable', error: error.message, holds: map };
  }
  (data || []).forEach(function (row) {
    map[holdKey(row.subject_type, row.subject_id)] = row.reason || true;
  });
  return { ok: true, holds: map };
}

/**
 * Ensure a closed/suspended partner profile is not public.
 * Used before operational purge and as immediate termination safeguard.
 */
async function ensurePartnerNonPublic(admin, partnerId, opts) {
  opts = opts || {};
  var dryRun = !!opts.dryRun;
  var { data: profile, error } = await admin
    .from('partner_profiles')
    .select('partner_id, profile_status, public_snapshot')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error) return { ok: false, code: 'server_error', error: error.message };
  if (!profile) return { ok: true, changed: false };
  if (profile.profile_status !== 'published' && profile.profile_status !== 'paused') {
    return { ok: true, changed: false };
  }
  if (dryRun) {
    return { ok: true, changed: true, dryRun: true, from: profile.profile_status };
  }
  var now = opts.now || new Date();
  var { error: uErr } = await admin
    .from('partner_profiles')
    .update({
      profile_status: 'hidden',
      hidden_at: iso(now),
      paused_at: null,
      updated_at: iso(now)
    })
    .eq('partner_id', partnerId);
  if (uErr) return { ok: false, code: 'server_error', error: uErr.message };

  // Best-effort public derivative revoke (blobs).
  try {
    var assets = require('./assets');
    await assets.revokePublicDerivatives({ admin: admin, partnerId: partnerId });
  } catch (e) {
    /* keep going — status already non-public */
  }
  return { ok: true, changed: true, from: profile.profile_status };
}

/**
 * Close partner account (service-side). Sets closed_at and forces non-public.
 * Not exposed to browsers. Control UX may call later; retention uses closed rows.
 */
async function closePartnerAccount(admin, partnerId, opts) {
  opts = opts || {};
  var now = opts.now || new Date();
  var dryRun = !!opts.dryRun;
  if (!partnerId) return { ok: false, code: 'missing_fields' };
  if (dryRun) {
    return { ok: true, dryRun: true, partnerId: partnerId };
  }
  var { error } = await admin
    .from('partners')
    .update({
      account_status: 'closed',
      closed_at: iso(now),
      updated_at: iso(now)
    })
    .eq('id', partnerId);
  if (error) return { ok: false, code: 'server_error', error: error.message };
  var np = await ensurePartnerNonPublic(admin, partnerId, { now: now, dryRun: false });
  if (!np.ok) return np;
  return { ok: true, partnerId: partnerId, unpublished: !!np.changed };
}

async function purgePartnerAssetBlobs(admin, partnerId, opts) {
  opts = opts || {};
  var dryRun = !!opts.dryRun;
  var blob = require('./blob-storage');
  var { data, error } = await admin
    .from('partner_profile_assets')
    .select('id, private_storage_key, public_storage_key, public_url, storage_key')
    .eq('partner_id', partnerId);
  if (error) return { ok: false, code: 'server_error', error: error.message };
  var rows = data || [];
  if (dryRun) return { ok: true, dryRun: true, count: rows.length };
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var { error: dErr } = await admin
      .from('partner_profile_assets')
      .delete()
      .eq('id', row.id)
      .eq('partner_id', partnerId);
    if (dErr) return { ok: false, code: 'server_error', error: dErr.message };
    if (row.private_storage_key) await blob.deletePrivateObject(row.private_storage_key);
    if (row.public_storage_key || row.public_url) {
      await blob.deletePublicObject(row.public_url || row.public_storage_key);
    } else if (row.storage_key && row.public_url) {
      await blob.deletePublicObject(row.public_url || row.storage_key);
    }
  }
  return { ok: true, count: rows.length };
}

/**
 * Build an idempotent retention plan. Does not mutate data.
 */
async function planRetention(admin, opts) {
  opts = opts || {};
  var now = opts.now instanceof Date ? opts.now : new Date();
  var holdsLoad = await loadHolds(admin);
  if (!holdsLoad.ok && !opts.allowMissingHolds) {
    return {
      ok: false,
      code: holdsLoad.code || 'holds_unavailable',
      error: holdsLoad.error,
      actions: [],
      summary: {}
    };
  }
  var holds = holdsLoad.holds || Object.create(null);
  var actions = [];

  function push(action) {
    actions.push(action);
  }

  // 1. Closed customer requests (24 months)
  var reqCutoff = monthsAgo(now, POLICY.closedRequestMonths);
  var { data: closedReqs, error: reqErr } = await admin
    .from('customer_requests')
    .select('id, status, closed_at, interest_intake_id, customer_email')
    .in('status', ['closed_won', 'closed_lost'])
    .not('closed_at', 'is', null)
    .lt('closed_at', iso(reqCutoff));
  if (reqErr) return { ok: false, code: 'server_error', error: reqErr.message, actions: [] };
  (closedReqs || []).forEach(function (row) {
    if (isHeld(holds, 'customer_request', row.id)) return;
    if (row.interest_intake_id && isHeld(holds, 'interest_intake', row.interest_intake_id)) return;
    push({
      category: 'closed_customer_requests',
      action: 'delete_interest_intake_cascade',
      subjectType: 'interest_intake',
      subjectId: row.interest_intake_id || null,
      requestId: row.id,
      closedAt: row.closed_at,
      detail: '24 months after request closure'
    });
  });

  // 2. Non-continuing interest candidates (12 months)
  var candCutoff = monthsAgo(now, POLICY.interestCandidateMonths);
  var { data: cands, error: candErr } = await admin
    .from('partner_interest_candidates')
    .select('id, autopilot_status, updated_at, partner_id, published_at')
    .lt('updated_at', iso(candCutoff));
  if (candErr) return { ok: false, code: 'server_error', error: candErr.message, actions: [] };
  (cands || []).forEach(function (row) {
    if (!CANDIDATE_NON_CONTINUE[row.autopilot_status]) return;
    if (row.published_at) return;
    if (row.partner_id) return;
    if (isHeld(holds, 'partner_interest_candidate', row.id)) return;
    push({
      category: 'interest_candidates_non_continue',
      action: 'delete_candidate',
      subjectType: 'partner_interest_candidate',
      subjectId: row.id,
      updatedAt: row.updated_at,
      detail: '12 months after last activity; did not continue'
    });
  });

  // 3. Incomplete onboarding (12 months inactivity)
  var onbCutoff = monthsAgo(now, POLICY.incompleteOnboardingMonths);
  var { data: onbs, error: onbErr } = await admin
    .from('partner_onboarding')
    .select('partner_id, onboarding_status, last_saved_at, updated_at, started_at')
    .in('onboarding_status', Object.keys(INCOMPLETE_ONBOARDING));
  if (onbErr) return { ok: false, code: 'server_error', error: onbErr.message, actions: [] };

  var incompleteIds = (onbs || []).map(function (r) { return r.partner_id; });
  var partnerById = Object.create(null);
  var profileById = Object.create(null);
  if (incompleteIds.length) {
    var { data: parts, error: pErr } = await admin
      .from('partners')
      .select('id, account_status, updated_at, closed_at')
      .in('id', incompleteIds);
    if (pErr) return { ok: false, code: 'server_error', error: pErr.message, actions: [] };
    (parts || []).forEach(function (p) { partnerById[p.id] = p; });
    var { data: profiles, error: prErr } = await admin
      .from('partner_profiles')
      .select('partner_id, profile_status, published_at')
      .in('partner_id', incompleteIds);
    if (prErr) return { ok: false, code: 'server_error', error: prErr.message, actions: [] };
    (profiles || []).forEach(function (p) { profileById[p.partner_id] = p; });
  }

  (onbs || []).forEach(function (row) {
    var partner = partnerById[row.partner_id];
    var profile = profileById[row.partner_id];
    if (!partner || partner.account_status !== 'active') return;
    if (profile && (profile.profile_status === 'published' || profile.profile_status === 'paused' || profile.published_at)) {
      return;
    }
    if (profile && (profile.profile_status === 'ready' || profile.profile_status === 'under_review')) {
      return;
    }
    var last = row.last_saved_at || row.updated_at || row.started_at || partner.updated_at;
    if (!last || new Date(last) >= onbCutoff) return;
    if (isHeld(holds, 'partner', row.partner_id)) return;
    push({
      category: 'incomplete_onboarding',
      action: 'delete_partner',
      subjectType: 'partner',
      subjectId: row.partner_id,
      lastActivityAt: last,
      detail: '12 months inactivity; incomplete onboarding'
    });
  });

  // 5. Closed partners — 24 months after closed_at (assets purged with partner)
  var partnerCutoff = monthsAgo(now, POLICY.closedPartnerMonths);
  var { data: closedPartners, error: cpErr } = await admin
    .from('partners')
    .select('id, account_status, closed_at, updated_at')
    .eq('account_status', 'closed');
  if (cpErr) return { ok: false, code: 'server_error', error: cpErr.message, actions: [] };
  (closedPartners || []).forEach(function (row) {
    if (isHeld(holds, 'partner', row.id)) return;
    var closedAt = row.closed_at || null;
    if (!closedAt) {
      push({
        category: 'closed_partners',
        action: 'needs_closed_at',
        subjectType: 'partner',
        subjectId: row.id,
        detail: 'closed without closed_at; set closed_at before purge'
      });
      return;
    }
    // Force non-public if somehow still public (immediate policy), then age purge.
    push({
      category: 'closed_partners',
      action: 'ensure_non_public',
      subjectType: 'partner',
      subjectId: row.id,
      closedAt: closedAt,
      detail: 'public profile must not remain public after termination'
    });
    if (new Date(closedAt) >= partnerCutoff) return;
    push({
      category: 'closed_partners',
      action: 'delete_partner',
      subjectType: 'partner',
      subjectId: row.id,
      closedAt: closedAt,
      detail: '24 months after account closure; assets deleted with final purge (within 30 days of deletion)'
    });
  });

  // 11. Analytics aggregates — 36 months
  var analyticsCutoff = monthsAgo(now, POLICY.analyticsMonths);
  var analyticsDay = analyticsCutoff.toISOString().slice(0, 10);
  if (!isHeld(holds, 'analytics_day', analyticsDay)) {
    push({
      category: 'analytics_daily_counts',
      action: 'delete_analytics_before',
      subjectType: 'analytics_day',
      subjectId: analyticsDay,
      beforeDate: analyticsDay,
      detail: '36 months aggregate retention (no user identifiers)'
    });
  }

  // 8. Orphan audit logs older than 24 months with no live partner (best-effort)
  var auditCutoff = monthsAgo(now, POLICY.closedRequestMonths);
  var { data: oldAudits, error: aErr } = await admin
    .from('audit_logs')
    .select('id, partner_id, action, created_at')
    .lt('created_at', iso(auditCutoff))
    .limit(500);
  if (aErr) {
    // grant/migration may lag — skip without failing whole plan
    oldAudits = [];
  }
  (oldAudits || []).forEach(function (row) {
    if (isHeld(holds, 'audit_log', row.id)) return;
    if (isHeld(holds, 'security_incident', row.id)) return;
    if (row.partner_id && isHeld(holds, 'partner', row.partner_id)) return;
    // Only purge audits whose partner is already gone or null (case closed long ago).
    // Partner-linked audits for still-existing partners are kept until partner purge CASCADE/SET NULL.
    if (row.partner_id) return;
    push({
      category: 'control_audit_history',
      action: 'delete_audit_log',
      subjectType: 'audit_log',
      subjectId: row.id,
      createdAt: row.created_at,
      detail: '24 months; unlinked control/audit trail'
    });
  });

  var summary = Object.create(null);
  actions.forEach(function (a) {
    summary[a.category] = (summary[a.category] || 0) + 1;
  });

  return {
    ok: true,
    now: iso(now),
    policy: POLICY,
    dryRunDefault: true,
    actions: actions,
    summary: summary,
    notes: {
      calculator_reports: 'NOT_APPLICABLE — PDFs generated transiently; no ELYAN persistent PDF table',
      ordinary_logs: 'MANUAL — Vercel/platform logs outside Postgres',
      security_incidents: 'MANUAL — use retention_holds',
      active_professionals: 'RETAIN while account_status=active'
    }
  };
}

async function applyAction(admin, action, opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false; // default true
  if (dryRun) {
    return { ok: true, dryRun: true, action: action };
  }

  if (action.action === 'needs_closed_at') {
    return { ok: true, skipped: true, reason: 'needs_closed_at' };
  }

  if (action.action === 'ensure_non_public') {
    return ensurePartnerNonPublic(admin, action.subjectId, { dryRun: false, now: opts.now });
  }

  if (action.action === 'delete_interest_intake_cascade') {
    if (action.subjectId) {
      var { error } = await admin.from('interest_intakes').delete().eq('id', action.subjectId);
      if (error) return { ok: false, code: 'server_error', error: error.message };
      return { ok: true };
    }
    // Fallback: delete request only if intake missing
    var { error: rErr } = await admin.from('customer_requests').delete().eq('id', action.requestId);
    if (rErr) return { ok: false, code: 'server_error', error: rErr.message };
    return { ok: true };
  }

  if (action.action === 'delete_candidate') {
    var { error: cErr } = await admin
      .from('partner_interest_candidates')
      .delete()
      .eq('id', action.subjectId);
    if (cErr) return { ok: false, code: 'server_error', error: cErr.message };
    return { ok: true };
  }

  if (action.action === 'delete_partner') {
    var blobs = await purgePartnerAssetBlobs(admin, action.subjectId, { dryRun: false });
    if (!blobs.ok) return blobs;
    await ensurePartnerNonPublic(admin, action.subjectId, { dryRun: false, now: opts.now });
    var { error: pErr } = await admin.from('partners').delete().eq('id', action.subjectId);
    if (pErr) return { ok: false, code: 'server_error', error: pErr.message };
    return { ok: true, assetsRemoved: blobs.count };
  }

  if (action.action === 'delete_analytics_before') {
    var { error: anErr } = await admin
      .from('analytics_daily_counts')
      .delete()
      .lt('event_date', action.beforeDate);
    if (anErr) return { ok: false, code: 'server_error', error: anErr.message };
    return { ok: true };
  }

  if (action.action === 'delete_audit_log') {
    var { error: auErr } = await admin.from('audit_logs').delete().eq('id', action.subjectId);
    if (auErr) return { ok: false, code: 'server_error', error: auErr.message };
    return { ok: true };
  }

  return { ok: false, code: 'unknown_action' };
}

/**
 * Apply a plan. dryRun defaults to true.
 * Never deletes when dryRun=true.
 */
async function applyRetention(admin, plan, opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  if (!plan || !plan.ok) {
    return { ok: false, code: 'invalid_plan', results: [] };
  }
  var results = [];
  var actions = plan.actions || [];
  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    var res = await applyAction(admin, action, { dryRun: dryRun, now: opts.now });
    results.push({ action: action, result: res });
    if (!res.ok && !dryRun) {
      return { ok: false, code: res.code || 'apply_failed', dryRun: dryRun, results: results };
    }
  }
  return {
    ok: true,
    dryRun: dryRun,
    applied: dryRun ? 0 : results.filter(function (r) { return r.result && r.result.ok && !r.result.skipped; }).length,
    planned: actions.length,
    results: results
  };
}

async function runRetention(admin, opts) {
  opts = opts || {};
  var dryRun = opts.dryRun !== false;
  var plan = await planRetention(admin, opts);
  if (!plan.ok) return plan;
  var applied = await applyRetention(admin, plan, { dryRun: dryRun, now: opts.now });
  return {
    ok: applied.ok,
    dryRun: dryRun,
    plan: plan,
    apply: applied
  };
}

module.exports = {
  POLICY,
  planRetention,
  applyRetention,
  applyAction,
  runRetention,
  loadHolds,
  closePartnerAccount,
  ensurePartnerNonPublic,
  purgePartnerAssetBlobs,
  monthsAgo,
  CANDIDATE_NON_CONTINUE,
  INCOMPLETE_ONBOARDING
};
