/**
 * POST /api/professionals/logout
 * Client clears Supabase session; we audit the event.
 */
var { requireUser } = require('../lib/tenancy');
var { json, methodNotAllowed, errorJson, readJson } = require('../lib/http');
var { writeAudit } = require('../lib/audit');
var { rateLimit, clientKey } = require('../lib/rate-limit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  var rl = rateLimit(clientKey(req, 'logout'), 30, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');

  try {
    await readJson(req);
    var auth = await requireUser(req);
    if (!auth.ok) {
      // Still OK to "logout" locally; report soft success
      return json(res, 200, { ok: true });
    }
    await writeAudit({
      req: req,
      actorUserId: auth.user.id,
      actorType: 'user',
      action: 'logout',
      meta: {}
    });
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('logout_handler', err);
    return errorJson(res, 500, 'server_error');
  }
};
