/**
 * /api/professionals — Phase A router (single serverless function for Hobby limits)
 * Routes via ?action= or JSON body.action
 * actions: public-config | session | activate | setup-password | logout | login-audit
 */
var { requireUser, listActiveMemberships } = require('../server/tenancy');
var { previewInvite, acceptInviteForUser } = require('../server/invites');
var { setupPasswordForInvite } = require('../server/auth-password');
var { json, methodNotAllowed, errorJson, readJson } = require('../server/http');
var { writeAudit } = require('../server/audit');
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

function getToken(req, body) {
  if (body && body.token) return String(body.token).trim();
  if (req.query && req.query.token) return String(req.query.token).trim();
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      return (u.searchParams.get('token') || '').trim();
    } catch (e) { return ''; }
  }
  return '';
}

async function handlePublicConfig(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  var url = process.env.SUPABASE_URL;
  var anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return errorJson(res, 503, 'missing_env');
  return json(res, 200, {
    ok: true,
    supabaseUrl: url,
    supabaseAnonKey: anon,
    appUrl: (process.env.PROFESSIONALS_APP_URL || '').replace(/\/$/, '')
  });
}

async function handleSession(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  var auth = await requireUser(req);
  if (!auth.ok) return errorJson(res, auth.status, auth.code);
  var listed = await listActiveMemberships(auth.user.id);
  if (listed.error) return errorJson(res, 500, 'server_error');
  return json(res, 200, {
    ok: true,
    user: { id: auth.user.id, email: auth.user.email },
    memberships: listed.memberships
  });
}

async function handleActivate(req, res, body) {
  if (req.method === 'GET') {
    var rlGet = rateLimit(clientKey(req, 'activate_get'), 40, 60 * 1000);
    if (!rlGet.ok) return errorJson(res, 429, 'rate_limited');
    var token = getToken(req, body);
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
    var rawToken = getToken(req, body);
    if (!rawToken) return errorJson(res, 400, 'invite_invalid');
    var auth = await requireUser(req);
    if (!auth.ok) return errorJson(res, auth.status, auth.code);
    var accepted = await acceptInviteForUser({ rawToken: rawToken, user: auth.user, req: req });
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
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  var rl = rateLimit(clientKey(req, 'logout'), 30, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  var auth = await requireUser(req);
  if (auth.ok) {
    await writeAudit({
      req: req,
      actorUserId: auth.user.id,
      actorType: 'user',
      action: 'logout',
      meta: {}
    });
  }
  return json(res, 200, { ok: true });
}

async function handleSetupPassword(req, res, body) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  var rl = rateLimit(clientKey(req, 'setup_password'), 10, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  var token = getToken(req, body);
  var password = body && body.password != null ? String(body.password) : '';
  if (!token) return errorJson(res, 400, 'invite_invalid');
  var result = await setupPasswordForInvite({
    rawToken: token,
    password: password,
    req: req
  });
  if (!result.ok) {
    var status = result.code === 'password_too_weak' ? 400 : 400;
    return errorJson(res, status, result.code);
  }
  return json(res, 200, {
    ok: true,
    email: result.email,
    inviteToken: result.inviteToken,
    claimed: !!result.claimed,
    membershipId: result.membershipId || null,
    role: result.role || null,
    partner: result.partner || null
  });
}

async function handleLoginAudit(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  var rl = rateLimit(clientKey(req, 'login_audit'), 30, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  var auth = await requireUser(req);
  if (!auth.ok) return errorJson(res, auth.status, auth.code);
  await writeAudit({
    req: req,
    actorUserId: auth.user.id,
    actorType: 'user',
    action: 'login_success',
    meta: {}
  });
  return json(res, 200, { ok: true });
}

module.exports = async function handler(req, res) {
  try {
    var body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      body = await readJson(req);
    }
    var action = getAction(req, body) || (req.method === 'GET' && getToken(req, body) ? 'activate' : '');

    if (action === 'public-config' || action === 'config') return handlePublicConfig(req, res);
    if (action === 'session') return handleSession(req, res);
    if (action === 'activate') return handleActivate(req, res, body);
    if (action === 'setup-password') return handleSetupPassword(req, res, body);
    if (action === 'logout') return handleLogout(req, res);
    if (action === 'login-audit') return handleLoginAudit(req, res);

    return errorJson(res, 400, 'missing_fields', { message: 'Onbekende of ontbrekende action.' });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('professionals_router', err);
    return errorJson(res, 500, 'server_error');
  }
};
