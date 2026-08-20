/**
 * ELYAN Control — Customer Requests / Intake Core (staff-only).
 * One internal request per successful Interest Intake (1:1 via interest_intake_id).
 * Partners never call these functions; BFF uses service_role after requireStaff.
 */
'use strict';

var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');

var REQUEST_STATUSES = ['new', 'contacted', 'qualified', 'closed_won', 'closed_lost'];

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
  contacted: 'Gecontacteerd',
  qualified: 'Gekwalificeerd',
  closed_won: 'Afgesloten — gewonnen',
  closed_lost: 'Afgesloten — verloren'
};

function isRequestStatus(v) {
  return REQUEST_STATUSES.indexOf(v) >= 0;
}

function canTransition(from, to) {
  if (!isRequestStatus(from) || !isRequestStatus(to)) return false;
  var allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.indexOf(to) >= 0;
}

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /customer_requests|customer_request_status_events/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('customer_requests_migration_needed');
    return 'missing_env';
  }
  return null;
}

function mapRequestRow(row) {
  if (!row) return null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allowedNextStatuses: (STATUS_TRANSITIONS[row.status] || []).map(function (s) {
      return { status: s, label: STATUS_LABELS_NL[s] || s };
    })
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
 * Idempotent on interest_intake_id (unique) — duplicate intake path never calls this.
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
    // Race / retry: unique violation → fetch existing
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

  return { ok: true, request: mapRequestRow(data), duplicate: false };
}

async function listRequests(opts) {
  opts = opts || {};
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

  var items = (data || []).map(mapRequestRow);
  return { ok: true, items: items, count: items.length };
}

async function getRequest(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  if (!requestId) return { ok: false, code: 'missing_fields' };

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

  return {
    ok: true,
    request: mapRequestRow(data),
    statusEvents: (events || []).map(mapStatusEvent)
  };
}

async function setRequestStatus(opts) {
  var requestId = opts && opts.requestId ? String(opts.requestId).trim() : '';
  var toStatus = opts && opts.status ? String(opts.status).trim() : '';
  var staffUserId = opts && opts.staffUserId ? String(opts.staffUserId) : null;

  if (!requestId || !toStatus) return { ok: false, code: 'missing_fields' };
  if (!isRequestStatus(toStatus)) return { ok: false, code: 'invalid_status_transition' };

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
  var { data: updated, error: uErr } = await admin
    .from('customer_requests')
    .update({
      status: toStatus,
      status_changed_at: now,
      status_changed_by: staffUserId,
      updated_at: now
    })
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
      to: toStatus
    }
  });

  return { ok: true, request: mapRequestRow(updated), unchanged: false };
}

module.exports = {
  REQUEST_STATUSES: REQUEST_STATUSES,
  STATUS_TRANSITIONS: STATUS_TRANSITIONS,
  STATUS_LABELS_NL: STATUS_LABELS_NL,
  isRequestStatus: isRequestStatus,
  canTransition: canTransition,
  buildRequestFromInterest: buildRequestFromInterest,
  createRequestFromInterest: createRequestFromInterest,
  listRequests: listRequests,
  getRequest: getRequest,
  setRequestStatus: setRequestStatus,
  mapRequestRow: mapRequestRow
};
