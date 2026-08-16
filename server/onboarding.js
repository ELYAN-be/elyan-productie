/**
 * Phase B onboarding service — BFF uses service_role after membership authZ.
 */
var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');
var {
  isStepId,
  canEditRole,
  canReadRole,
  mergeDraft,
  validateDraftStructure,
  canAutosave,
  canSubmit,
  canResubmit,
  editableSectionsFor,
  isReviewHub,
  draftCompletion,
  mapOnboardingRow,
  mapProfileRow,
  mapReviewItem
} = require('./onboarding-model');
var { mapAsset, sortAssets } = require('./assets');

async function ensureRows(admin, partnerId) {
  var { error: oErr } = await admin.from('partner_onboarding').upsert(
    { partner_id: partnerId },
    { onConflict: 'partner_id', ignoreDuplicates: true }
  );
  if (oErr) {
    console.error('onboarding_ensure_failed', oErr.message);
    return { ok: false, code: 'server_error' };
  }
  var { error: pErr } = await admin.from('partner_profiles').upsert(
    { partner_id: partnerId },
    { onConflict: 'partner_id', ignoreDuplicates: true }
  );
  if (pErr) {
    console.error('profile_ensure_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true };
}

async function loadOnboarding(admin, partnerId) {
  var ensured = await ensureRows(admin, partnerId);
  if (!ensured.ok) return ensured;

  var { data: onboarding, error: oErr } = await admin
    .from('partner_onboarding')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (oErr || !onboarding) {
    console.error('onboarding_load_failed', oErr && oErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: profile, error: pErr } = await admin
    .from('partner_profiles')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (pErr || !profile) {
    console.error('profile_load_failed', pErr && pErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: reviewItems, error: rErr } = await admin
    .from('partner_review_items')
    .select('id, step_id, field_key, message, item_status, created_at, resolved_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true });
  if (rErr) {
    console.error('review_items_load_failed', rErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: assets, error: aErr } = await admin
    .from('partner_profile_assets')
    .select('*')
    .eq('partner_id', partnerId);
  if (aErr) {
    console.error('assets_load_failed', aErr.message);
    return { ok: false, code: 'server_error' };
  }

  return {
    ok: true,
    onboarding: onboarding,
    profile: profile,
    reviewItems: reviewItems || [],
    assets: sortAssets(assets || [])
  };
}

function buildPayload(loaded, role) {
  var onboarding = mapOnboardingRow(loaded.onboarding);
  var profile = mapProfileRow(loaded.profile);
  var status = onboarding.onboardingStatus;
  return {
    ok: true,
    partnerId: onboarding.partnerId,
    role: role,
    onboarding: onboarding,
    profile: profile,
    draft: onboarding.draft,
    version: onboarding.version,
    currentStepId: onboarding.currentStepId,
    onboardingStatus: status,
    profileStatus: profile.profileStatus,
    reviewItems: (loaded.reviewItems || []).map(mapReviewItem),
    assets: (loaded.assets || []).map(mapAsset),
    coverAssetId: profile.coverAssetId || null,
    reviewHub: isReviewHub(status),
    editableSections: editableSectionsFor(status),
    canEdit: canEditRole(role) && editableSectionsFor(status).length > 0,
    canSubmit: canEditRole(role) && canSubmit(status),
    canResubmit: canEditRole(role) && canResubmit(status),
    completion: draftCompletion(onboarding.draft)
  };
}

async function getOnboarding(opts) {
  if (!canReadRole(opts.role)) return { ok: false, code: 'forbidden' };
  var admin = createAdminClient();
  var loaded = await loadOnboarding(admin, opts.partnerId);
  if (!loaded.ok) return loaded;
  return buildPayload(loaded, opts.role);
}

async function getOnboardingStatus(opts) {
  if (!canReadRole(opts.role)) return { ok: false, code: 'forbidden' };
  var admin = createAdminClient();
  var loaded = await loadOnboarding(admin, opts.partnerId);
  if (!loaded.ok) return loaded;
  var onboarding = mapOnboardingRow(loaded.onboarding);
  var profile = mapProfileRow(loaded.profile);
  return {
    ok: true,
    partnerId: opts.partnerId,
    role: opts.role,
    onboardingStatus: onboarding.onboardingStatus,
    profileStatus: profile.profileStatus,
    currentStepId: onboarding.currentStepId,
    version: onboarding.version,
    reviewHub: isReviewHub(onboarding.onboardingStatus),
    canEdit: canEditRole(opts.role) && editableSectionsFor(onboarding.onboardingStatus).length > 0,
    canSubmit: canEditRole(opts.role) && canSubmit(onboarding.onboardingStatus),
    canResubmit: canEditRole(opts.role) && canResubmit(onboarding.onboardingStatus),
    openReviewCount: (loaded.reviewItems || []).filter(function (r) {
      return r.item_status === 'open';
    }).length,
    lastSavedAt: onboarding.lastSavedAt,
    submittedAt: onboarding.submittedAt
  };
}

function parseExpectedVersion(raw) {
  if (raw == null || raw === '') return null;
  var n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * Autosave: merge draft + optional current_step_id with optimistic lock.
 * First save from not_started → in_progress and profile not_created → draft.
 */
async function saveOnboarding(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };

  var expectedVersion = parseExpectedVersion(opts.expectedVersion);
  if (expectedVersion == null) return { ok: false, code: 'version_required' };

  var draftCheck = validateDraftStructure(opts.draft);
  if (!draftCheck.ok) return draftCheck;

  var stepId = opts.currentStepId != null ? String(opts.currentStepId) : null;
  if (stepId != null && !isStepId(stepId)) {
    return { ok: false, code: 'invalid_step' };
  }

  var admin = createAdminClient();
  var loaded = await loadOnboarding(admin, opts.partnerId);
  if (!loaded.ok) return loaded;

  var row = loaded.onboarding;
  var profile = loaded.profile;
  var previousStatus = row.onboarding_status;

  if (row.version !== expectedVersion) {
    return {
      ok: false,
      code: 'version_conflict',
      currentVersion: row.version,
      onboardingStatus: row.onboarding_status
    };
  }

  if (!canAutosave(previousStatus)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  // During submitted, only polish domains may change (structural gate for Sprint 1).
  if (previousStatus === 'submitted' && opts.draft != null) {
    var forbidden = Object.keys(opts.draft).filter(function (k) {
      return k !== 'portfolio' && k !== 'story' && k !== 'cover_asset_id';
    });
    if (forbidden.length) {
      return { ok: false, code: 'section_locked' };
    }
  }

  var now = new Date().toISOString();
  var nextStatus = previousStatus;
  var startedAt = row.started_at;
  if (nextStatus === 'not_started') {
    nextStatus = 'in_progress';
    startedAt = now;
  }

  var nextDraft = row.draft;
  if (opts.draft != null) {
    nextDraft = mergeDraft(row.draft, draftCheck.draft);
  }

  var nextStep = stepId != null ? stepId : row.current_step_id;
  // After first progress away from start, keep step; if still not_started→in_progress at start, ok.
  if (nextStatus === 'in_progress' && nextStep === 'review_hub') {
    return { ok: false, code: 'invalid_step' };
  }
  if (
    (nextStatus === 'submitted' || nextStatus === 'approved') &&
    stepId != null &&
    stepId !== 'review_hub' &&
    stepId !== row.current_step_id
  ) {
    // Allow staying on review_hub; ignore wizard jumps while submitted unless polish-only.
    if (nextStatus === 'submitted' && (stepId === 'portfolio' || stepId === 'verhaal' || stepId === 'review_hub')) {
      nextStep = stepId;
    } else if (nextStatus !== 'submitted') {
      return { ok: false, code: 'invalid_step' };
    }
  }

  var update = {
    draft: nextDraft,
    current_step_id: nextStep,
    onboarding_status: nextStatus,
    started_at: startedAt,
    last_saved_at: now,
    last_saved_by: opts.userId,
    version: row.version + 1
  };

  var { data: updated, error: uErr } = await admin
    .from('partner_onboarding')
    .update(update)
    .eq('partner_id', opts.partnerId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle();

  if (uErr) {
    console.error('onboarding_save_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    return { ok: false, code: 'version_conflict', currentVersion: row.version };
  }

  if (profile.profile_status === 'not_created' && nextStatus === 'in_progress') {
    var { error: pErr } = await admin
      .from('partner_profiles')
      .update({ profile_status: 'draft' })
      .eq('partner_id', opts.partnerId)
      .eq('profile_status', 'not_created');
    if (pErr) {
      console.error('profile_draft_transition_failed', pErr.message);
      return { ok: false, code: 'server_error' };
    }
  }

  // Sync denormalized profile hints from draft (cover stays on assets API).
  var profilePatch = {};
  if (nextDraft && nextDraft.craft && nextDraft.craft.primary_category_id) {
    profilePatch.primary_category_id = String(nextDraft.craft.primary_category_id);
  }
  if (nextDraft && typeof nextDraft.specialty_line === 'string') {
    profilePatch.specialty_line = nextDraft.specialty_line.slice(0, 160) || null;
  }
  if (Object.keys(profilePatch).length) {
    await admin.from('partner_profiles').update(profilePatch).eq('partner_id', opts.partnerId);
  }

  if (previousStatus === 'not_started') {
    await writeAudit({
      req: opts.req,
      actorUserId: opts.userId,
      actorType: 'user',
      partnerId: opts.partnerId,
      action: 'onboarding_started',
      meta: { step: nextStep }
    });
  } else {
    await writeAudit({
      req: opts.req,
      actorUserId: opts.userId,
      actorType: 'user',
      partnerId: opts.partnerId,
      action: 'onboarding_saved',
      meta: { step: nextStep, version: updated.version }
    });
  }

  var refreshed = await loadOnboarding(admin, opts.partnerId);
  if (!refreshed.ok) return refreshed;
  return buildPayload(refreshed, opts.role);
}

async function submitOnboarding(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };

  var expectedVersion = parseExpectedVersion(opts.expectedVersion);
  if (expectedVersion == null) return { ok: false, code: 'version_required' };

  var admin = createAdminClient();
  var loaded = await loadOnboarding(admin, opts.partnerId);
  if (!loaded.ok) return loaded;

  var row = loaded.onboarding;
  if (row.version !== expectedVersion) {
    return {
      ok: false,
      code: 'version_conflict',
      currentVersion: row.version,
      onboardingStatus: row.onboarding_status
    };
  }
  if (!canSubmit(row.onboarding_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var draftCheck = validateDraftStructure(row.draft);
  if (!draftCheck.ok) return draftCheck;
  if (!draftCheck.draft || typeof draftCheck.draft !== 'object') {
    return { ok: false, code: 'invalid_draft' };
  }

  var now = new Date().toISOString();
  var { data: updated, error: uErr } = await admin
    .from('partner_onboarding')
    .update({
      onboarding_status: 'submitted',
      current_step_id: 'review_hub',
      submitted_at: now,
      submitted_by: opts.userId,
      last_saved_at: now,
      last_saved_by: opts.userId,
      version: row.version + 1
    })
    .eq('partner_id', opts.partnerId)
    .eq('version', expectedVersion)
    .eq('onboarding_status', 'in_progress')
    .select('*')
    .maybeSingle();

  if (uErr) {
    console.error('onboarding_submit_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    return { ok: false, code: 'version_conflict' };
  }

  var { error: pErr } = await admin
    .from('partner_profiles')
    .update({ profile_status: 'under_review' })
    .eq('partner_id', opts.partnerId)
    .in('profile_status', ['not_created', 'draft']);
  if (pErr) {
    console.error('profile_under_review_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'onboarding_submitted',
    meta: { version: updated.version }
  });

  var refreshed = await loadOnboarding(admin, opts.partnerId);
  if (!refreshed.ok) return refreshed;
  return buildPayload(refreshed, opts.role);
}

async function resubmitOnboarding(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };

  var expectedVersion = parseExpectedVersion(opts.expectedVersion);
  if (expectedVersion == null) return { ok: false, code: 'version_required' };

  var admin = createAdminClient();
  var loaded = await loadOnboarding(admin, opts.partnerId);
  if (!loaded.ok) return loaded;

  var row = loaded.onboarding;
  if (row.version !== expectedVersion) {
    return {
      ok: false,
      code: 'version_conflict',
      currentVersion: row.version,
      onboardingStatus: row.onboarding_status
    };
  }
  if (!canResubmit(row.onboarding_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var draftCheck = validateDraftStructure(row.draft);
  if (!draftCheck.ok) return draftCheck;

  var now = new Date().toISOString();
  var { data: updated, error: uErr } = await admin
    .from('partner_onboarding')
    .update({
      onboarding_status: 'submitted',
      current_step_id: 'review_hub',
      submitted_at: now,
      submitted_by: opts.userId,
      last_saved_at: now,
      last_saved_by: opts.userId,
      changes_requested_at: null,
      version: row.version + 1
    })
    .eq('partner_id', opts.partnerId)
    .eq('version', expectedVersion)
    .eq('onboarding_status', 'changes_requested')
    .select('*')
    .maybeSingle();

  if (uErr) {
    console.error('onboarding_resubmit_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    return { ok: false, code: 'version_conflict' };
  }

  var { error: rErr } = await admin
    .from('partner_review_items')
    .update({
      item_status: 'resolved',
      resolved_at: now,
      resolved_by: opts.userId
    })
    .eq('partner_id', opts.partnerId)
    .eq('item_status', 'open');
  if (rErr) {
    console.error('review_items_resolve_failed', rErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { error: pErr } = await admin
    .from('partner_profiles')
    .update({ profile_status: 'under_review' })
    .eq('partner_id', opts.partnerId);
  if (pErr) {
    console.error('profile_resubmit_status_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'onboarding_resubmitted',
    meta: { version: updated.version }
  });

  var refreshed = await loadOnboarding(admin, opts.partnerId);
  if (!refreshed.ok) return refreshed;
  return buildPayload(refreshed, opts.role);
}

module.exports = {
  getOnboarding,
  getOnboardingStatus,
  saveOnboarding,
  submitOnboarding,
  resubmitOnboarding,
  ensureRows,
  loadOnboarding,
  buildPayload
};
