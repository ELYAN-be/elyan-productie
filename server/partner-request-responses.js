'use strict';

/**
 * Partner-facing request response layer — separate from customer_request lifecycle.
 */
var { createAdminClient } = require('./supabase');
var { DECLINE_REASONS } = require('./partner-autopilot/readiness');
var { getCategoryLabel } = require('./partner-autopilot/categories');
var { writeAudit } = require('./audit');

var DECLINE_LABELS = {
  te_ver: 'Te ver',
  niet_mijn_werk: 'Niet mijn type werk',
  geen_beschikbaarheid: 'Geen beschikbaarheid',
  project_grootte: 'Project te klein/groot',
  andere: 'Andere'
};

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /partner_request_responses/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    return 'migration_needed';
  }
  return null;
}

function partnerSafeRequestCard(row, response) {
  var categoryLabel = getCategoryLabel(row.category_id) || row.category_id || 'Renovatie';
  return {
    id: row.id,
    title: categoryLabel + (row.location_text ? ' — ' + row.location_text : ''),
    categoryId: row.category_id,
    categoryLabel: categoryLabel,
    locationText: row.location_text,
    messageExcerpt: String(row.message || '').slice(0, 280),
    createdAt: row.created_at,
    responseStatus: (response && response.response_status) || 'pending',
    declineReason: response && response.decline_reason ? response.decline_reason : null
  };
}

function partnerSafeRequestDetail(row, response) {
  var card = partnerSafeRequestCard(row, response);
  return Object.assign({}, card, {
    message: String(row.message || '').slice(0, 2000)
  });
}

async function listPartnerRequests(partnerId) {
  if (!partnerId) return { ok: false, code: 'missing_fields' };
  var admin = createAdminClient();
  var { data: requests, error } = await admin
    .from('customer_requests')
    .select('id, category_id, location_text, message, created_at, status')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    var code = schemaFailureCode(error);
    if (code) return { ok: false, code: code };
    console.error('partner_requests_list_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var ids = (requests || []).map(function (r) { return r.id; });
  var responsesMap = {};
  if (ids.length) {
    var { data: responses, error: rErr } = await admin
      .from('partner_request_responses')
      .select('*')
      .eq('partner_id', partnerId)
      .in('customer_request_id', ids);
    if (rErr) {
      var rCode = schemaFailureCode(rErr);
      if (rCode) return { ok: false, code: rCode };
    } else {
      (responses || []).forEach(function (resp) {
        responsesMap[resp.customer_request_id] = resp;
      });
    }
  }

  return {
    ok: true,
    items: (requests || []).map(function (row) {
      return partnerSafeRequestCard(row, responsesMap[row.id]);
    })
  };
}

async function getPartnerRequest(partnerId, requestId) {
  if (!partnerId || !requestId) return { ok: false, code: 'missing_fields' };
  var admin = createAdminClient();
  var { data: row, error } = await admin
    .from('customer_requests')
    .select('id, category_id, location_text, message, created_at, status, partner_id')
    .eq('id', requestId)
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error) {
    console.error('partner_request_get_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!row) return { ok: false, code: 'not_found' };

  var { data: response } = await admin
    .from('partner_request_responses')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('customer_request_id', requestId)
    .maybeSingle();

  return { ok: true, request: partnerSafeRequestDetail(row, response) };
}

async function respondToPartnerRequest(opts) {
  var partnerId = opts.partnerId;
  var requestId = opts.requestId;
  var action = opts.action;
  var declineReason = opts.declineReason || null;

  if (!partnerId || !requestId || !action) return { ok: false, code: 'missing_fields' };
  if (action !== 'interested' && action !== 'declined') {
    return { ok: false, code: 'invalid_action' };
  }
  if (action === 'declined' && declineReason && DECLINE_REASONS.indexOf(declineReason) < 0) {
    return { ok: false, code: 'invalid_decline_reason' };
  }

  var admin = createAdminClient();
  var { data: request, error: reqErr } = await admin
    .from('customer_requests')
    .select('id, partner_id')
    .eq('id', requestId)
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (reqErr || !request) return { ok: false, code: 'not_found' };

  var status = action === 'interested' ? 'interested' : 'declined';
  var now = new Date().toISOString();
  var payload = {
    partner_id: partnerId,
    customer_request_id: requestId,
    response_status: status,
    decline_reason: action === 'declined' ? declineReason : null,
    responded_at: now,
    updated_at: now
  };

  var { data: existing } = await admin
    .from('partner_request_responses')
    .select('id, response_status')
    .eq('partner_id', partnerId)
    .eq('customer_request_id', requestId)
    .maybeSingle();

  var saved;
  if (existing) {
    if (existing.response_status === status) {
      return { ok: true, responseStatus: status, idempotent: true };
    }
    var { data: updated, error: uErr } = await admin
      .from('partner_request_responses')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (uErr) return { ok: false, code: 'server_error' };
    saved = updated;
  } else {
    payload.created_at = now;
    var { data: inserted, error: iErr } = await admin
      .from('partner_request_responses')
      .insert(payload)
      .select('*')
      .single();
    if (iErr) {
      if (iErr.code === '23505') {
        return { ok: true, responseStatus: status, idempotent: true };
      }
      var code = schemaFailureCode(iErr);
      if (code) return { ok: false, code: code };
      return { ok: false, code: 'server_error' };
    }
    saved = inserted;
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: partnerId,
    action: 'partner_request_' + status,
    meta: { requestId: requestId, declineReason: declineReason }
  });

  return { ok: true, responseStatus: saved.response_status, declineReason: saved.decline_reason };
}

module.exports = {
  listPartnerRequests: listPartnerRequests,
  getPartnerRequest: getPartnerRequest,
  respondToPartnerRequest: respondToPartnerRequest,
  partnerSafeRequestCard: partnerSafeRequestCard,
  DECLINE_REASONS: DECLINE_REASONS,
  DECLINE_LABELS: DECLINE_LABELS
};
