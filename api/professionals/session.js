/**
 * GET /api/professionals/session
 * Returns authenticated user + active memberships.
 */
var { requireUser, listActiveMemberships } = require('../lib/tenancy');
var { json, methodNotAllowed, errorJson } = require('../lib/http');
var { writeAudit } = require('../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  try {
    var auth = await requireUser(req);
    if (!auth.ok) return errorJson(res, auth.status, auth.code);

    var listed = await listActiveMemberships(auth.user.id);
    if (listed.error) return errorJson(res, 500, 'server_error');

    return json(res, 200, {
      ok: true,
      user: {
        id: auth.user.id,
        email: auth.user.email
      },
      memberships: listed.memberships
    });
  } catch (err) {
    if (err && err.code === 'missing_env') {
      return errorJson(res, 503, 'missing_env');
    }
    console.error('session_handler', err);
    await writeAudit({
      req: req,
      actorType: 'system',
      action: 'authorization_denied',
      meta: { reason: 'session_exception' }
    }).catch(function () {});
    return errorJson(res, 500, 'server_error');
  }
};
