/**
 * GET  /api/professionals/activate?token=…  — preview invite
 * POST /api/professionals/activate         — claim membership { token }
 */
var { requireUser } = require('../lib/tenancy');
var { previewInvite, acceptInviteForUser } = require('../lib/invites');
var { json, methodNotAllowed, errorJson, readJson } = require('../lib/http');
var { rateLimit, clientKey } = require('../lib/rate-limit');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      var rlGet = rateLimit(clientKey(req, 'activate_get'), 40, 60 * 1000);
      if (!rlGet.ok) return errorJson(res, 429, 'rate_limited');

      var token = (req.query && req.query.token) || '';
      if (!token && req.url) {
        try {
          var u = new URL(req.url, 'http://localhost');
          token = u.searchParams.get('token') || '';
        } catch (e) { /* ignore */ }
      }
      if (!token) return errorJson(res, 400, 'invite_invalid');

      var preview = await previewInvite(token);
      if (!preview.ok) return errorJson(res, 400, preview.code);
      return json(res, 200, {
        ok: true,
        email: preview.email,
        role: preview.role,
        expiresAt: preview.expiresAt,
        partner: preview.partner
      });
    }

    if (req.method === 'POST') {
      var rlPost = rateLimit(clientKey(req, 'activate_post'), 15, 60 * 1000);
      if (!rlPost.ok) return errorJson(res, 429, 'rate_limited');

      var body = await readJson(req);
      var rawToken = String(body.token || '').trim();
      if (!rawToken) return errorJson(res, 400, 'invite_invalid');

      var auth = await requireUser(req);
      if (!auth.ok) return errorJson(res, auth.status, auth.code);

      var accepted = await acceptInviteForUser({
        rawToken: rawToken,
        user: auth.user,
        req: req
      });
      if (!accepted.ok) return errorJson(res, 400, accepted.code);

      return json(res, 200, {
        ok: true,
        partnerId: accepted.partnerId,
        membershipId: accepted.membershipId,
        role: accepted.role,
        partner: accepted.partner
      });
    }

    return methodNotAllowed(res, 'GET, POST');
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('activate_handler', err);
    return errorJson(res, 500, 'server_error');
  }
};
