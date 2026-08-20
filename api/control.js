/**
 * POST|GET /api/control — ELYAN Control (staff only, Phase B Sprint 8)
 * Reuses Phase A staff_users / requireStaff. No partner membership path.
 *
 * Actions:
 *   session | list | review | request-changes | approve | publish |
 *   rebuild-public-snapshot | pause | hide | restore |
 *   requests-list | requests-get | requests-set-status
 */
var { requireStaff, isStaff, requireUser } = require('../server/tenancy');
var {
  listReviews,
  getReview,
  requestChanges,
  approvePartner,
  publishPartner,
  rebuildPublicSnapshot,
  pausePartner,
  hidePartner,
  restorePartner
} = require('../server/control');
var {
  listRequests,
  getRequest,
  setRequestStatus
} = require('../server/customer-requests');
var { json, methodNotAllowed, errorJson, readJson } = require('../server/http');
var { rateLimit, clientKey } = require('../server/rate-limit');

function getAction(req, body) {
  if (req.query && req.query.action) return String(req.query.action);
  if (body && body.action) return String(body.action);
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      if (u.searchParams.get('action')) return u.searchParams.get('action');
    } catch (e) { /* ignore */ }
  }
  return '';
}

function getPartnerId(req, body) {
  if (body && body.partnerId) return String(body.partnerId).trim();
  if (req.query && req.query.partnerId) return String(req.query.partnerId).trim();
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      var q = u.searchParams.get('partnerId');
      if (q) return String(q).trim();
    } catch (e) { /* ignore */ }
  }
  return '';
}

function getFilter(req, body) {
  if (body && body.filter) return String(body.filter).trim();
  if (req.query && req.query.filter) return String(req.query.filter).trim();
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      var q = u.searchParams.get('filter');
      if (q) return String(q).trim();
    } catch (e) { /* ignore */ }
  }
  return 'submitted';
}

function getQueryParam(req, body, key) {
  if (body && body[key] != null && String(body[key]).trim()) return String(body[key]).trim();
  if (req.query && req.query[key] != null && String(req.query[key]).trim()) {
    return String(req.query[key]).trim();
  }
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      var q = u.searchParams.get(key);
      if (q) return String(q).trim();
    } catch (e) { /* ignore */ }
  }
  return '';
}

function statusForCode(code) {
  if (code === 'missing_token' || code === 'invalid_token') return 401;
  if (code === 'forbidden' || code === 'not_staff' || code === 'no_membership') return 403;
  if (code === 'not_found') return 404;
  if (code === 'rate_limited') return 429;
  if (code === 'missing_env') return 503;
  if (code === 'server_error') return 500;
  return 400;
}

function respond(res, result) {
  if (!result.ok) {
    var extra = {};
    if (result.message) extra.detail = result.message;
    if (result.missing) extra.missing = result.missing;
    return errorJson(res, statusForCode(result.code), result.code, extra);
  }
  return json(res, 200, result);
}

async function withStaff(req, res, handler) {
  var staff = await requireStaff(req);
  if (!staff.ok) return errorJson(res, staff.status, staff.code);
  return handler(staff);
}

async function handleSession(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(res, 'GET, POST');
  }
  var auth = await requireUser(req);
  if (!auth.ok) return errorJson(res, auth.status, auth.code);
  var staff = await isStaff(auth.user.id);
  if (!staff.staff) {
    return errorJson(res, 403, 'not_staff');
  }
  return json(res, 200, {
    ok: true,
    user: { id: auth.user.id, email: auth.user.email },
    staff: { role: staff.role }
  });
}

module.exports = async function handler(req, res) {
  try {
    var body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      body = await readJson(req);
    }
    var action = getAction(req, body);

    if (action === 'session') {
      var rlS = rateLimit(clientKey(req, 'control_session'), 60, 60 * 1000);
      if (!rlS.ok) return errorJson(res, 429, 'rate_limited');
      return handleSession(req, res);
    }

    // All remaining actions require staff
    return withStaff(req, res, async function (staff) {
      if (action === 'list') {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return methodNotAllowed(res, 'GET, POST');
        }
        var rlL = rateLimit(clientKey(req, 'control_list'), 60, 60 * 1000);
        if (!rlL.ok) return errorJson(res, 429, 'rate_limited');
        var listed = await listReviews({ filter: getFilter(req, body) });
        return respond(res, listed);
      }

      if (action === 'review') {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return methodNotAllowed(res, 'GET, POST');
        }
        var rlR = rateLimit(clientKey(req, 'control_review'), 60, 60 * 1000);
        if (!rlR.ok) return errorJson(res, 429, 'rate_limited');
        var reviewed = await getReview({ partnerId: getPartnerId(req, body) });
        return respond(res, reviewed);
      }

      if (action === 'request-changes') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlC = rateLimit(clientKey(req, 'control_request_changes'), 30, 60 * 1000);
        if (!rlC.ok) return errorJson(res, 429, 'rate_limited');
        var changed = await requestChanges({
          partnerId: getPartnerId(req, body),
          items: body.items,
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, changed);
      }

      if (action === 'approve') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlA = rateLimit(clientKey(req, 'control_approve'), 30, 60 * 1000);
        if (!rlA.ok) return errorJson(res, 429, 'rate_limited');
        var approved = await approvePartner({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, approved);
      }

      if (action === 'publish') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlP = rateLimit(clientKey(req, 'control_publish'), 30, 60 * 1000);
        if (!rlP.ok) return errorJson(res, 429, 'rate_limited');
        var published = await publishPartner({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, published);
      }

      if (action === 'rebuild-public-snapshot') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlRb = rateLimit(clientKey(req, 'control_rebuild_public'), 30, 60 * 1000);
        if (!rlRb.ok) return errorJson(res, 429, 'rate_limited');
        var rebuilt = await rebuildPublicSnapshot({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, rebuilt);
      }

      if (action === 'pause') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlPa = rateLimit(clientKey(req, 'control_pause'), 30, 60 * 1000);
        if (!rlPa.ok) return errorJson(res, 429, 'rate_limited');
        var paused = await pausePartner({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, paused);
      }

      if (action === 'hide') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlH = rateLimit(clientKey(req, 'control_hide'), 30, 60 * 1000);
        if (!rlH.ok) return errorJson(res, 429, 'rate_limited');
        var hidden = await hidePartner({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, hidden);
      }

      if (action === 'restore') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlRe = rateLimit(clientKey(req, 'control_restore'), 30, 60 * 1000);
        if (!rlRe.ok) return errorJson(res, 429, 'rate_limited');
        var restored = await restorePartner({
          partnerId: getPartnerId(req, body),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, restored);
      }

      // --- Customer Requests (staff-only; partners have no path) ---
      if (action === 'requests-list') {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return methodNotAllowed(res, 'GET, POST');
        }
        var rlRl = rateLimit(clientKey(req, 'control_requests_list'), 60, 60 * 1000);
        if (!rlRl.ok) return errorJson(res, 429, 'rate_limited');
        var listedReq = await listRequests({
          status: getQueryParam(req, body, 'status') || 'all',
          categoryId: getQueryParam(req, body, 'categoryId') || null,
          partnerId: getQueryParam(req, body, 'partnerId') || null,
          partnerSlug: getQueryParam(req, body, 'partnerSlug') || null
        });
        return respond(res, listedReq);
      }

      if (action === 'requests-get') {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return methodNotAllowed(res, 'GET, POST');
        }
        var rlRg = rateLimit(clientKey(req, 'control_requests_get'), 60, 60 * 1000);
        if (!rlRg.ok) return errorJson(res, 429, 'rate_limited');
        var gotReq = await getRequest({
          requestId: getQueryParam(req, body, 'requestId')
        });
        return respond(res, gotReq);
      }

      if (action === 'requests-set-status') {
        if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
        var rlRs = rateLimit(clientKey(req, 'control_requests_status'), 30, 60 * 1000);
        if (!rlRs.ok) return errorJson(res, 429, 'rate_limited');
        var setReq = await setRequestStatus({
          requestId: getQueryParam(req, body, 'requestId'),
          status: getQueryParam(req, body, 'status'),
          staffUserId: staff.user.id,
          req: req
        });
        return respond(res, setReq);
      }

      return errorJson(res, 400, 'missing_fields', { message: 'Onbekende of ontbrekende action.' });
    });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('control_handler', err);
    return errorJson(res, 500, 'server_error');
  }
};
