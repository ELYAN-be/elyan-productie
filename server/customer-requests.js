/**
 * ELYAN Control — Customer Requests Core + Automation V1 (staff-only).
 * One internal request per successful Interest Intake (1:1 via interest_intake_id).
 * Partners never call these functions; BFF uses service_role after requireStaff.
 *
 * NEW SLA (internal only, not customer-facing):
 *   First response deadline = created_at + 2 business days.
 *   Business day = Mon–Fri (UTC calendar). Sat/Sun are skipped; no holiday engine.
 *   addBusinessDays walks forward calendar days until 2 weekday steps accumulate,
 *   preserving the original time-of-day (UTC).
 *   Overdue only while status === 'new'. Once contacted (or later), new-SLA
 *   attention does not apply.
 */
'use strict';

var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');
var { DECLINE_LABELS } = require('./partner-request-responses');

var REQUEST_STATUSES = ['new', 'contacted', 'qualified', 'closed_won', 'closed_lost'];
var CLOSED_STATUSES = ['closed_won', 'closed_lost'];

/** Valid forward transitions (server-side only). Terminal: closed_won, closed_lost. */
var STATUS_TRANSITIONS = {
  new: ['contacted', 'closed_lost'],
  contacted: ['qualified', 'closed_lost'],
  qualified: ['closed_won', 'closed_lost'],
  closed_won: [],
  closed_lost: []
};

var STATUS_LABELS_NL = {
  new: 'Nieuw',
  contacted: 'Contact opgenomen',
  qualified: 'Gekwalificeerd',
  closed_won: 'Succesvolle introductie',
  closed_lost: 'Afgesloten — niet gelukt'
};

/** Exact closed_lost reason keys (frozen). */
var CLOSED_LOST_REASONS = [
  'no_response',
  'not_qualified',
  'no_suitable_professional',
  'customer_cancelled',
  'duplicate',
  'out_of_scope',
  'other'
];

var CLOSED_LOST_REASON_LABELS_NL = {
  no_response: 'Geen reactie',
  not_qualified: 'Niet gekwalificeerd',
  no_suitable_professional: 'Geen geschikte professional',
  customer_cancelled: 'Klant geannuleerd',
  duplicate: 'Duplicaat',
  out_of_scope: 'Buiten scope',
  other: 'Andere'
};

var NEW_SLA_BUSINESS_DAYS = 2;

function isRequestStatus(v) {
  return REQUEST_STATUSES.indexOf(v) >= 0;
}

function isClosedStatus(v) {
  return CLOSED_STATUSES.indexOf(v) >= 0;
}

function canTransition(from, to) {
  if (!isRequestStatus(from) || !isRequestStatus(to)) return false;
  var allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.indexOf(to) >= 0;
}

function isClosedLostReason(v) {
  return CLOSED_LOST_REASONS.indexOf(v) >= 0;
}

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /customer_requests|customer_request_status_events|customer_request_notes|customer_request_activity/i.test(
      msg
    ) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('customer_requests_migration_needed');
    return 'missing_env';
  }
  return null;
}

/**
 * Add N business days (Mon–Fri) to a Date, UTC calendar, same clock time.
 * Weekends are skipped; holidays are NOT excluded.
 */
function addBusinessDays(fromDate, businessDays) {
  var d = new Date(fromDate.getTime());
  var n = Number(businessDays) || 0;
  if (n <= 0) return d;
  var added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    var day = d.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function newSlaDeadline(createdAt) {
  if (!createdAt) return null;
  var start = new Date(createdAt);
  if (isNaN(start.getTime())) return null;
  return addBusinessDays(start, NEW_SLA_BUSINESS_DAYS);
}

function isNewSlaOverdue(row, now) {
  if (!row || row.status !== 'new') return false;
  var deadline = newSlaDeadline(row.created_at);
  if (!deadline) return false;
  var t = now instanceof Date ? now : new Date(now || Date.now());
  return t.getTime() > deadline.getTime();
}

function isFollowUpOverdue(row, now) {
  if (!row || !row.next_follow_up_at) return false;
  if (isClosedStatus(row.status)) return false;
  var due = new Date(row.next_follow_up_at);
  if (isNaN(due.getTime())) return false;
  var t = now instanceof Date ? now : new Date(now || Date.now());
  return t.getTime() > due.getTime();
}

function computeAttention(row, now) {
  var reasons = [];
  if (isNewSlaOverdue(row, now)) reasons.push('new_sla');
  if (isFollowUpOverdue(row, now)) reasons.push('follow_up_overdue');
  return {
    attention: reasons.length > 0,
    attentionReasons: reasons
  };
}

function ageMs(createdAt, now) {
  var start = new Date(createdAt);
  if (isNaN(start.getTime())) return null;
  var t = now instanceof Date ? now : new Date(now || Date.now());
  return Math.max(0, t.getTime() - start.getTime());
}

function formatAgeLabel(ms) {
  if (ms == null) return '—';
  var hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return hours <= 1 ? '≤1 u' : hours + ' u';
  var days = Math.floor(hours / 24);
  return days === 1 ? '1 d' : days + ' d';
}

var PARTNER_RESPONSE_LABELS = {
  pending: 'Nog geen reactie',
  interested: 'Interesse',
  declined: 'Niet voor mij'
};

function mapPartnerResponse(row) {
  if (!row) {
    return {
      status: 'pending',
      statusLabel: PARTNER_RESPONSE_LABELS.pending,
      declineReason: null,
      declineReasonLabel: null,
      respondedAt: null
    };
  }
  var status = row.response_status || 'pending';
  return {
    status: status,
    statusLabel: PARTNER_RESPONSE_LABELS[status] || status,
    declineReason: row.decline_reason || null,
    declineReasonLabel: row.decline_reason
      ? DECLINE_LABELS[row.decline_reason] || row.decline_reason
      : null,
    respondedAt: row.responded_at || null
  };
}

function mapRequestRow(row, opts) {
  if (!row) return null;
  opts = opts || {};
  var now = opts.now || new Date();
  var att = computeAttention(row, now);
  var deadline = newSlaDeadline(row.created_at);
  var ms = ageMs(row.created_at, now);
  var partnerResponse = opts.partnerResponse != null
    ? opts.partnerResponse
    : mapPartnerResponse(null);
  return {
    id: row.id,
    interestIntakeId: row.interest_intake_id,
    source: row.source,
    partnerId: row.partner_id,
    partnerSlug: row.partner_slug,
    categoryId: row.category_id || null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone || null,
    locationText: row.location_text,
    message: row.message,
    consentAt: row.consent_at,
    status: row.status,
    statusLabel: STATUS_LABELS_NL[row.status] || row.status,
    statusChangedAt: row.status_changed_at || null,
    statusChangedBy: row.status_changed_by || null,
    ownerUserId: row.owner_user_id || null,
    ownerAssignedAt: row.owner_assigned_at || null,
    ownerAssignedBy: row.owner_assigned_by || null,
    nextFollowUpAt: row.next_follow_up_at || null,
    closedLostReason: row.closed_lost_reason || null,
    closedLostReasonLabel: row.closed_lost_reason
      ? CLOSED_LOST_REASON_LABELS_NL[row.closed_lost_reason] || row.closed_lost_reason
      : null,
    closedLostDetail: row.closed_lost_detail || null,
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ageMs: ms,
    ageLabel: formatAgeLabel(ms),
    newSlaDeadlineAt: deadline ? deadline.toISOString() : null,
    newSlaOverdue: isNewSlaOverdue(row, now),
    followUpOverdue: isFollowUpOverdue(row, now),
    attention: att.attention,
    attentionReasons: att.attentionReasons,
    allowedNextStatuses: (STATUS_TRANSITIONS[row.status] || []).map(function (s) {
      return { status: s, label: STATUS_LABELS_NL[s] || s };
    }),
    closedLostReasons: CLOSED_LOST_REASONS.map(function (k) {
      return { reason: k, label: CLOSED_LOST_REASON_LABELS_NL[k] || k };
    }),
    partnerResponseStatus: partnerResponse.status,
    partnerResponseStatusLabel: partnerResponse.statusLabel,
    partnerDeclineReason: partnerResponse.declineReason,
    partnerDeclineReasonLabel: partnerResponse.declineReasonLabel,
    partnerRespondedAt: partnerResponse.respondedAt
  };
}

function mapStatusEvent(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    fromLabel: row.from_status ? STATUS_LABELS_NL[row.from_status] || row.from_status : null,
    toLabel: STATUS_LABELS_NL[row.to_status] || row.to_status,
    actorUserId: row.actor_user_id || null,
    createdAt: row.created_at
  };
}

function mapNote(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    authorUserId: row.author_user_id,
    content: row.content,
    createdAt: row.created_at
  };
}

function mapActivity(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    action: row.action,
    actorUserId: row.actor_user_id || null,
    meta: row.meta || {},
    createdAt: row.created_at
  };
}

async function insertActivity(admin, opts) {
  var { error } = await admin.from('customer_request_activity_events').insert({
    request_id: opts.requestId,
    action: opts.action,
    actor_user_id: opts.actorUserId || null,
    meta: opts.meta || {}
  });
  if (error) {
    console.error('customer_request_activity_failed', error.message);
  }
}

async function assertStaffUserId(admin, userId) {
  if (!userId) return { ok: false, code: 'missing_fields' };
  var { data, error } = await admin
    .from('staff_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('customer_request_staff_lookup_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!data) return { ok: false, code: 'not_staff_owner' };
  return { ok: true };
}

/**
 * Build insert row from a successful interest_intakes insert result + input row.
 */
function buildRequestFromInterest(intakeRow) {
  if (!intakeRow || !intakeRow.id) return null;
  return {
    interest_intake_id: intakeRow.id,
    source: 'marketplace_interest',
    partner_id: intakeRow.partner_id,
    partner_slug: intakeRow.partner_slug,
    category_id: intakeRow.category_id || null,
    customer_name: intakeRow.name,
    customer_email: intakeRow.email,
    customer_phone: intakeRow.phone || null,
    location_text: intakeRow.location_text,
    message: intakeRow.description,
    consent_at: intakeRow.consent_at,
    status: 'new',
    created_at: intakeRow.created_at || new Date().toISOString(),
    updated_at: intakeRow.created_at || new Date().toISOString()
  };
}

/**
 * Create internal request after successful interest insert.
 * Idempotent on interest_intake_id (unique) — races resolve to the existing row.
 */
async function createRequestFromInterest(intakeRow) {
  var payload = buildRequestFromInterest(intakeRow);
  if (!payload) return { ok: false, code: 'server_error' };

  var admin = createAdminClient();
  var { data, error } = await admin
    .from('customer_requests')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message || '')) {
      var existing = await admin
        .from('customer_requests')
        .select('*')
        .eq('interest_intake_id', payload.interest_intake_id)
        .maybeSingle();
      if (existing.error) {
        var sc2 = schemaFailureCode(existing.error);
        if (sc2) return { ok: false, code: sc2 };
        console.error('customer_request_dedupe_fetch_failed', existing.error.message);
        return { ok: false, code: 'server_error' };
      }
      if (existing.data) {
        return { ok: true, request: mapRequestRow(existing.data), duplicate: true };
      }
    }
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_insert_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  await insertActivity(admin, {
    requestId: data.id,
    action: 'created',
    actorUserId: null,
    meta: { source: 'marketplace_interest' }
  });

  return { ok: true, request: mapRequestRow(data), duplicate: false };
}

var INTAKE_ENSURE_FIELDS =
  'id, partner_id, partner_slug, category_id, name, email, phone, location_text, description, consent_at, created_at, status';

/**
 * Ensure exactly one customer_request exists for an accepted interest_intake.
 * Safe for retries, duplicate-intake ensure, and staff orphan recovery.
 */
async function ensureRequestForIntakeId(intakeId) {
  intakeId = intakeId ? String(intakeId).trim() : '';
  if (!intakeId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var existing = await admin
    .from('customer_requests')
    .select('*')
    .eq('interest_intake_id', intakeId)
    .maybeSingle();

  if (existing.error) {
    var sc = schemaFailureCode(existing.error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_ensure_lookup_failed', existing.error.message);
    return { ok: false, code: 'server_error' };
  }
  if (existing.data) {
    return {
      ok: true,
      request: mapRequestRow(existing.data),
      duplicate: true,
      ensured: false
    };
  }

  var { data: intake, error } = await admin
    .from('interest_intakes')
    .select(INTAKE_ENSURE_FIELDS)
    .eq('id', intakeId)
    .maybeSingle();

  if (error) {
    var msg = error.message || '';
    if (
      /interest_intakes/i.test(msg) &&
      /(does not exist|Could not find the|schema cache)/i.test(msg)
    ) {
      console.error('customer_requests_migration_needed');
      return { ok: false, code: 'missing_env' };
    }
    var sc2 = schemaFailureCode(error);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_ensure_intake_failed', msg);
    return { ok: false, code: 'server_error' };
  }
  if (!intake) return { ok: false, code: 'not_found' };

  var created = await createRequestFromInterest(intake);
  if (!created.ok) return created;
  return {
    ok: true,
    request: created.request,
    duplicate: !!created.duplicate,
    ensured: !created.duplicate
  };
}

/**
 * Detect accepted interest_intakes with no customer_request.
 * Privacy-safe: returns ids/timestamps/partner refs only — never customer PII.
 */
async function listOrphanIntakes(opts) {
  opts = opts || {};
  var scanLimit = Math.min(Math.max(Number(opts.scanLimit) || 500, 1), 2000);
  var limit = Math.min(Math.max(Number(opts.limit) || 100, 1), 200);

  var admin = createAdminClient();
  var { data: intakes, error } = await admin
    .from('interest_intakes')
    .select('id, created_at, partner_id, partner_slug, status')
    .order('created_at', { ascending: false })
    .limit(scanLimit);

  if (error) {
    var msg = error.message || '';
    if (
      /interest_intakes/i.test(msg) &&
      /(does not exist|Could not find the|schema cache)/i.test(msg)
    ) {
      return { ok: false, code: 'missing_env' };
    }
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('orphan_intakes_list_failed', msg);
    return { ok: false, code: 'server_error' };
  }

  var intakeRows = intakes || [];
  if (!intakeRows.length) {
    return { ok: true, count: 0, scanned: 0, scanLimit: scanLimit, items: [] };
  }

  var ids = intakeRows.map(function (row) {
    return row.id;
  });
  var { data: linked, error: lErr } = await admin
    .from('customer_requests')
    .select('interest_intake_id')
    .in('interest_intake_id', ids);

  if (lErr) {
    var sc2 = schemaFailureCode(lErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('orphan_intakes_link_lookup_failed', lErr.message);
    return { ok: false, code: 'server_error' };
  }

  var linkedMap = {};
  (linked || []).forEach(function (row) {
    if (row && row.interest_intake_id) linkedMap[row.interest_intake_id] = true;
  });

  var orphans = intakeRows
    .filter(function (row) {
      return !linkedMap[row.id];
    })
    .slice(0, limit)
    .map(function (row) {
      return {
        intakeId: row.id,
        createdAt: row.created_at,
        partnerId: row.partner_id,
        partnerSlug: row.partner_slug,
        status: row.status
      };
    });

  return {
    ok: true,
    count: orphans.length,
    scanned: intakeRows.length,
    scanLimit: scanLimit,
    items: orphans
  };
}

/**
 * Staff/system recovery: create missing customer_requests for orphan intakes.
 * Idempotent — repeated runs never create duplicates (unique interest_intake_id).
 */
async function recoverOrphanRequests(opts) {
  opts = opts || {};
  var staffUserId = opts.staffUserId ? String(opts.staffUserId) : null;
  var intakeId = opts.intakeId ? String(opts.intakeId).trim() : '';
  var limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100);

  var targets = [];
  if (intakeId) {
    targets = [{ intakeId: intakeId }];
  } else {
    var listed = await listOrphanIntakes({
      limit: limit,
      scanLimit: opts.scanLimit
    });
    if (!listed.ok) return listed;
    targets = listed.items;
  }

  var recovered = 0;
  var skipped = 0;
  var failed = 0;
  var items = [];

  for (var i = 0; i < targets.length; i++) {
    var targetId = targets[i].intakeId;
    var result = await ensureRequestForIntakeId(targetId);
    if (!result.ok) {
      failed += 1;
      items.push({ intakeId: targetId, status: 'failed', code: result.code });
      continue;
    }
    if (result.ensured) {
      recovered += 1;
      items.push({
        intakeId: targetId,
        requestId: result.request && result.request.id,
        status: 'recovered'
      });
    } else {
      skipped += 1;
      items.push({
        intakeId: targetId,
        requestId: result.request && result.request.id,
        status: 'already_linked'
      });
    }
  }

  if (staffUserId && recovered > 0) {
    await writeAudit({
      req: opts.req,
      actorUserId: staffUserId,
      actorType: 'staff',
      partnerId: null,
      action: 'customer_request_orphans_recovered',
      meta: {
        recovered: recovered,
        skipped: skipped,
        failed: failed,
        mode: intakeId ? 'single' : 'batch'
      }
    });
  }

  return {
    ok: true,
    recovered: recovered,
    skipped: skipped,
    failed: failed,
    items: items
  };
}

function passesListFilters(row, opts, now) {
  if (opts.ownerFilter === 'unassigned') {
    if (row.owner_user_id) return false;
  } else if (opts.ownerFilter === 'me') {
    if (!opts.staffUserId || row.owner_user_id !== opts.staffUserId) return false;
  } else if (opts.ownerUserId) {
    if (row.owner_user_id !== opts.ownerUserId) return false;
  }

  if (opts.followUpFilter === 'overdue') {
    if (!isFollowUpOverdue(row, now)) return false;
  } else if (opts.followUpFilter === 'due') {
    if (!row.next_follow_up_at || isClosedStatus(row.status)) return false;
    if (isFollowUpOverdue(row, now)) return false;
  } else if (opts.followUpFilter === 'none') {
    if (row.next_follow_up_at) return false;
  } else if (opts.followUpFilter === 'set') {
    if (!row.next_follow_up_at) return false;
  }

  if (opts.attentionOnly) {
    if (!computeAttention(row, now).attention) return false;
  }

  if (opts.createdFrom) {
    if (String(row.created_at) < String(opts.createdFrom)) return false;
  }
  if (opts.createdTo) {
    if (String(row.created_at) > String(opts.createdTo)) return false;
  }

  if (opts.minAgeHours != null && opts.minAgeHours !== '') {
    var minMs = Number(opts.minAgeHours) * 60 * 60 * 1000;
    if (!isNaN(minMs) && ageMs(row.created_at, now) < minMs) return false;
  }

  return true;
}

async function listRequests(opts) {
  opts = opts || {};
  var now = opts.now || new Date();
  var admin = createAdminClient();
  var q = admin
    .from('customer_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (opts.status && opts.status !== 'all') {
    if (!isRequestStatus(opts.status)) return { ok: false, code: 'invalid_filter' };
    q = q.eq('status', opts.status);
  }
  if (opts.categoryId) {
    q = q.eq('category_id', String(opts.categoryId).trim());
  }
  if (opts.partnerId) {
    q = q.eq('partner_id', String(opts.partnerId).trim());
  }
  if (opts.partnerSlug) {
    q = q.eq('partner_slug', String(opts.partnerSlug).trim().toLowerCase());
  }

  var { data, error } = await q;
  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_requests_list_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var ownerFilter = opts.ownerFilter ? String(opts.ownerFilter).trim() : '';
  var followUpFilter = opts.followUpFilter ? String(opts.followUpFilter).trim() : '';
  var filterOpts = {
    ownerFilter: ownerFilter,
    ownerUserId: opts.ownerUserId ? String(opts.ownerUserId).trim() : '',
    staffUserId: opts.staffUserId ? String(opts.staffUserId) : null,
    followUpFilter: followUpFilter,
    attentionOnly: opts.attentionOnly === true || opts.attentionOnly === '1' || opts.attentionOnly === 'true',
    createdFrom: opts.createdFrom ? String(opts.createdFrom).trim() : '',
    createdTo: opts.createdTo ? String(opts.createdTo).trim() : '',
    minAgeHours: opts.minAgeHours
  };

  var items = (data || [])
    .filter(function (row) {
      return passesListFilters(row, filterOpts, now);
    })
    .map(function (row) {
      return mapRequestRow(row, { now: now });
    });

  return { ok: true, items: items, count: items.length };
}

async function getRequest(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  if (!requestId) return { ok: false, code: 'missing_fields' };
  var now = (opts && opts.now) || new Date();

  var admin = createAdminClient();
  var { data, error } = await admin
    .from('customer_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_get_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!data) return { ok: false, code: 'not_found' };

  var { data: events, error: eErr } = await admin
    .from('customer_request_status_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (eErr) {
    var sc2 = schemaFailureCode(eErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_events_failed', eErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: notes, error: nErr } = await admin
    .from('customer_request_notes')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (nErr) {
    var sc3 = schemaFailureCode(nErr);
    if (sc3) return { ok: false, code: sc3 };
    console.error('customer_request_notes_failed', nErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: activity, error: aErr } = await admin
    .from('customer_request_activity_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (aErr) {
    var sc4 = schemaFailureCode(aErr);
    if (sc4) return { ok: false, code: sc4 };
    console.error('customer_request_activity_list_failed', aErr.message);
    return { ok: false, code: 'server_error' };
  }

  var partnerResponseRow = null;
  if (data.partner_id) {
    var { data: prData, error: prErr } = await admin
      .from('partner_request_responses')
      .select('response_status, decline_reason, responded_at, created_at')
      .eq('customer_request_id', requestId)
      .eq('partner_id', data.partner_id)
      .maybeSingle();
    if (prErr) {
      var sc5 = schemaFailureCode(prErr);
      if (sc5) return { ok: false, code: sc5 };
      console.error('customer_request_partner_response_failed', prErr.message);
    } else {
      partnerResponseRow = prData;
    }
  }

  return {
    ok: true,
    request: mapRequestRow(data, {
      now: now,
      partnerResponse: mapPartnerResponse(partnerResponseRow)
    }),
    statusEvents: (events || []).map(mapStatusEvent),
    notes: (notes || []).map(mapNote),
    activity: (activity || []).map(mapActivity)
  };
}

function normalizeLostDetail(detail) {
  if (detail == null) return null;
  var s = String(detail).trim();
  if (!s) return null;
  if (s.length > 500) s = s.slice(0, 500);
  return s;
}

async function setRequestStatus(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  var toStatus = opts && opts.status ? String(opts.status).trim() : '';
  var staffUserId = opts && opts.staffUserId ? String(opts.staffUserId) : null;
  var closedLostReason =
    opts && opts.closedLostReason != null ? String(opts.closedLostReason).trim() : '';
  var closedLostDetail = normalizeLostDetail(opts && opts.closedLostDetail);

  if (!requestId || !toStatus) return { ok: false, code: 'missing_fields' };
  if (!isRequestStatus(toStatus)) return { ok: false, code: 'invalid_status_transition' };

  if (toStatus === 'closed_lost') {
    if (!closedLostReason || !isClosedLostReason(closedLostReason)) {
      return { ok: false, code: 'closed_lost_reason_required' };
    }
    if (closedLostReason === 'other' && !closedLostDetail) {
      return { ok: false, code: 'closed_lost_detail_required' };
    }
  }

  var admin = createAdminClient();
  var { data: current, error } = await admin
    .from('customer_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_status_load_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!current) return { ok: false, code: 'not_found' };

  if (current.status === toStatus) {
    return { ok: true, request: mapRequestRow(current), unchanged: true };
  }

  if (!canTransition(current.status, toStatus)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var now = new Date().toISOString();
  var patch = {
    status: toStatus,
    status_changed_at: now,
    status_changed_by: staffUserId,
    updated_at: now
  };

  if (isClosedStatus(toStatus)) {
    patch.closed_at = now;
    patch.closed_by = staffUserId;
    patch.next_follow_up_at = null;
    if (toStatus === 'closed_lost') {
      patch.closed_lost_reason = closedLostReason;
      patch.closed_lost_detail = closedLostReason === 'other' ? closedLostDetail : null;
    } else {
      patch.closed_lost_reason = null;
      patch.closed_lost_detail = null;
    }
  }

  var { data: updated, error: uErr } = await admin
    .from('customer_requests')
    .update(patch)
    .eq('id', requestId)
    .eq('status', current.status)
    .select('*')
    .maybeSingle();

  if (uErr) {
    var sc2 = schemaFailureCode(uErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_status_update_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var { error: evErr } = await admin.from('customer_request_status_events').insert({
    request_id: requestId,
    from_status: current.status,
    to_status: toStatus,
    actor_user_id: staffUserId
  });
  if (evErr) {
    console.error('customer_request_status_event_failed', evErr.message);
  }

  await insertActivity(admin, {
    requestId: requestId,
    action: 'status_changed',
    actorUserId: staffUserId,
    meta: { from: current.status, to: toStatus }
  });

  if (isClosedStatus(toStatus)) {
    await insertActivity(admin, {
      requestId: requestId,
      action: 'closed',
      actorUserId: staffUserId,
      meta: {
        outcome: toStatus,
        reason: toStatus === 'closed_lost' ? closedLostReason : null
      }
    });
  }

  await writeAudit({
    req: opts.req,
    actorUserId: staffUserId,
    actorType: 'staff',
    partnerId: updated.partner_id,
    action: 'customer_request_status_changed',
    meta: {
      requestId: requestId,
      interestIntakeId: updated.interest_intake_id,
      from: current.status,
      to: toStatus,
      closedLostReason: toStatus === 'closed_lost' ? closedLostReason : null
    }
  });

  return { ok: true, request: mapRequestRow(updated), unchanged: false };
}

async function setRequestOwner(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  var staffUserId = opts && opts.staffUserId ? String(opts.staffUserId) : null;
  var clear = opts && (opts.clear === true || opts.ownerUserId === null || opts.ownerUserId === '');
  var ownerUserId =
    !clear && opts && opts.ownerUserId != null ? String(opts.ownerUserId).trim() : null;

  if (!requestId || !staffUserId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var { data: current, error } = await admin
    .from('customer_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_owner_load_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!current) return { ok: false, code: 'not_found' };

  if (isClosedStatus(current.status) && ownerUserId) {
    return { ok: false, code: 'invalid_owner_on_closed' };
  }

  if (ownerUserId) {
    var staffCheck = await assertStaffUserId(admin, ownerUserId);
    if (!staffCheck.ok) return staffCheck;
  }

  var prevOwner = current.owner_user_id || null;
  var nextOwner = ownerUserId || null;
  if (prevOwner === nextOwner) {
    return { ok: true, request: mapRequestRow(current), unchanged: true };
  }

  var now = new Date().toISOString();
  var patch = {
    owner_user_id: nextOwner,
    owner_assigned_at: nextOwner ? now : null,
    owner_assigned_by: nextOwner ? staffUserId : null,
    updated_at: now
  };

  var { data: updated, error: uErr } = await admin
    .from('customer_requests')
    .update(patch)
    .eq('id', requestId)
    .select('*')
    .maybeSingle();

  if (uErr) {
    var sc2 = schemaFailureCode(uErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_owner_update_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }

  await insertActivity(admin, {
    requestId: requestId,
    action: 'owner_changed',
    actorUserId: staffUserId,
    meta: { from: prevOwner, to: nextOwner }
  });

  await writeAudit({
    req: opts.req,
    actorUserId: staffUserId,
    actorType: 'staff',
    partnerId: updated.partner_id,
    action: 'customer_request_owner_changed',
    meta: {
      requestId: requestId,
      from: prevOwner,
      to: nextOwner
    }
  });

  return { ok: true, request: mapRequestRow(updated), unchanged: false };
}

async function setRequestFollowUp(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  var staffUserId = opts && opts.staffUserId ? String(opts.staffUserId) : null;
  var clear = opts && (opts.clear === true || opts.nextFollowUpAt === null || opts.nextFollowUpAt === '');
  var nextRaw = !clear && opts && opts.nextFollowUpAt != null ? String(opts.nextFollowUpAt).trim() : null;

  if (!requestId || !staffUserId) return { ok: false, code: 'missing_fields' };

  var nextIso = null;
  if (!clear) {
    if (!nextRaw) return { ok: false, code: 'missing_fields' };
    var parsed = new Date(nextRaw);
    if (isNaN(parsed.getTime())) return { ok: false, code: 'invalid_follow_up' };
    nextIso = parsed.toISOString();
  }

  var admin = createAdminClient();
  var { data: current, error } = await admin
    .from('customer_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_followup_load_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!current) return { ok: false, code: 'not_found' };

  if (isClosedStatus(current.status) && nextIso) {
    return { ok: false, code: 'invalid_follow_up_on_closed' };
  }

  var prev = current.next_follow_up_at || null;
  if (prev === nextIso) {
    return { ok: true, request: mapRequestRow(current), unchanged: true };
  }

  var now = new Date().toISOString();
  var { data: updated, error: uErr } = await admin
    .from('customer_requests')
    .update({
      next_follow_up_at: nextIso,
      updated_at: now
    })
    .eq('id', requestId)
    .select('*')
    .maybeSingle();

  if (uErr) {
    var sc2 = schemaFailureCode(uErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_followup_update_failed', uErr.message);
    return { ok: false, code: 'server_error' };
  }

  var action = nextIso ? 'follow_up_changed' : 'follow_up_cleared';
  await insertActivity(admin, {
    requestId: requestId,
    action: action,
    actorUserId: staffUserId,
    meta: { from: prev, to: nextIso }
  });

  await writeAudit({
    req: opts.req,
    actorUserId: staffUserId,
    actorType: 'staff',
    partnerId: updated.partner_id,
    action: nextIso ? 'customer_request_follow_up_changed' : 'customer_request_follow_up_cleared',
    meta: {
      requestId: requestId,
      from: prev,
      to: nextIso
    }
  });

  return { ok: true, request: mapRequestRow(updated), unchanged: false };
}

async function addRequestNote(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  var staffUserId = opts && opts.staffUserId ? String(opts.staffUserId) : null;
  var content = opts && opts.content != null ? String(opts.content).trim() : '';

  if (!requestId || !staffUserId || !content) return { ok: false, code: 'missing_fields' };
  if (content.length > 4000) return { ok: false, code: 'invalid_note' };

  var admin = createAdminClient();
  var { data: current, error } = await admin
    .from('customer_requests')
    .select('id, partner_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    var sc = schemaFailureCode(error);
    if (sc) return { ok: false, code: sc };
    console.error('customer_request_note_load_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!current) return { ok: false, code: 'not_found' };

  var { data: note, error: nErr } = await admin
    .from('customer_request_notes')
    .insert({
      request_id: requestId,
      author_user_id: staffUserId,
      content: content
    })
    .select('*')
    .maybeSingle();

  if (nErr) {
    var sc2 = schemaFailureCode(nErr);
    if (sc2) return { ok: false, code: sc2 };
    console.error('customer_request_note_insert_failed', nErr.message);
    return { ok: false, code: 'server_error' };
  }

  await insertActivity(admin, {
    requestId: requestId,
    action: 'note_added',
    actorUserId: staffUserId,
    meta: { noteId: note.id }
  });

  await writeAudit({
    req: opts.req,
    actorUserId: staffUserId,
    actorType: 'staff',
    partnerId: current.partner_id,
    action: 'customer_request_note_added',
    meta: {
      requestId: requestId,
      noteId: note.id
    }
  });

  return { ok: true, note: mapNote(note) };
}

module.exports = {
  REQUEST_STATUSES: REQUEST_STATUSES,
  STATUS_TRANSITIONS: STATUS_TRANSITIONS,
  STATUS_LABELS_NL: STATUS_LABELS_NL,
  CLOSED_LOST_REASONS: CLOSED_LOST_REASONS,
  CLOSED_LOST_REASON_LABELS_NL: CLOSED_LOST_REASON_LABELS_NL,
  NEW_SLA_BUSINESS_DAYS: NEW_SLA_BUSINESS_DAYS,
  isRequestStatus: isRequestStatus,
  canTransition: canTransition,
  isClosedLostReason: isClosedLostReason,
  addBusinessDays: addBusinessDays,
  newSlaDeadline: newSlaDeadline,
  isNewSlaOverdue: isNewSlaOverdue,
  isFollowUpOverdue: isFollowUpOverdue,
  computeAttention: computeAttention,
  buildRequestFromInterest: buildRequestFromInterest,
  createRequestFromInterest: createRequestFromInterest,
  ensureRequestForIntakeId: ensureRequestForIntakeId,
  listOrphanIntakes: listOrphanIntakes,
  recoverOrphanRequests: recoverOrphanRequests,
  listRequests: listRequests,
  getRequest: getRequest,
  setRequestStatus: setRequestStatus,
  setRequestOwner: setRequestOwner,
  setRequestFollowUp: setRequestFollowUp,
  addRequestNote: addRequestNote,
  mapRequestRow: mapRequestRow
};
