/**
 * /api/professionals — Phase A + Phase B Sprint 1 router
 * (single serverless function for Hobby limits)
 * Routes via ?action= or JSON body.action
 *
 * Phase A: public-config | session | activate | setup-password | logout | login-audit
 * Phase B: onboarding | onboarding-status | onboarding-save | onboarding-submit | onboarding-resubmit
 */
var { requireUser, listActiveMemberships, requirePartnerContext } = require('../server/tenancy');
var { previewInvite, acceptInviteForUser } = require('../server/invites');
var { setupPasswordForInvite } = require('../server/auth-password');
var {
  getOnboarding,
  getOnboardingStatus,
  saveOnboarding,
  submitOnboarding,
  resubmitOnboarding
} = require('../server/onboarding');
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

function statusForCode(code) {
  if (code === 'missing_token' || code === 'invalid_token') return 401;
  if (code === 'forbidden' || code === 'no_membership' || code === 'not_staff') return 403;
  if (code === 'version_conflict') return 409;
  if (code === 'rate_limited') return 429;
  if (code === 'missing_env') return 503;
  if (code === 'server_error') return 500;
  return 400;
}

function respondOnboarding(res, result) {
  if (!result.ok) {
    var extra = {};
    if (result.currentVersion != null) extra.currentVersion = result.currentVersion;
    if (result.onboardingStatus) extra.onboardingStatus = result.onboardingStatus;
    if (result.message) extra.detail = result.message;
    return errorJson(res, statusForCode(result.code), result.code, extra);
  }
  return json(res, 200, result);
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

async function withPartnerContext(req, res, body, handler) {
  var ctx = await requirePartnerContext(req, getPartnerId(req, body));
  if (!ctx.ok) return errorJson(res, ctx.status, ctx.code);
  return handler(ctx);
}

async function handleOnboardingGet(req, res, body) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  var rl = rateLimit(clientKey(req, 'onboarding_get'), 60, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  return withPartnerContext(req, res, body, async function (ctx) {
    var result = await getOnboarding({
      partnerId: ctx.partner.id,
      role: ctx.membership.role,
      userId: ctx.user.id
    });
    return respondOnboarding(res, result);
  });
}

async function handleOnboardingStatus(req, res, body) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  var rl = rateLimit(clientKey(req, 'onboarding_status'), 90, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  return withPartnerContext(req, res, body, async function (ctx) {
    var result = await getOnboardingStatus({
      partnerId: ctx.partner.id,
      role: ctx.membership.role,
      userId: ctx.user.id
    });
    return respondOnboarding(res, result);
  });
}

async function handleOnboardingSave(req, res, body) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return methodNotAllowed(res, 'PATCH, POST');
  }
  var rl = rateLimit(clientKey(req, 'onboarding_save'), 120, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  return withPartnerContext(req, res, body, async function (ctx) {
    var result = await saveOnboarding({
      partnerId: ctx.partner.id,
      role: ctx.membership.role,
      userId: ctx.user.id,
      draft: body && Object.prototype.hasOwnProperty.call(body, 'draft') ? body.draft : null,
      currentStepId: body && body.currentStepId != null ? body.currentStepId : null,
      expectedVersion: body && body.version,
      req: req
    });
    return respondOnboarding(res, result);
  });
}

async function handleOnboardingSubmit(req, res, body) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  var rl = rateLimit(clientKey(req, 'onboarding_submit'), 20, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  return withPartnerContext(req, res, body, async function (ctx) {
    var result = await submitOnboarding({
      partnerId: ctx.partner.id,
      role: ctx.membership.role,
      userId: ctx.user.id,
      expectedVersion: body && body.version,
      req: req
    });
    return respondOnboarding(res, result);
  });
}

async function handleOnboardingResubmit(req, res, body) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  var rl = rateLimit(clientKey(req, 'onboarding_resubmit'), 20, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');
  return withPartnerContext(req, res, body, async function (ctx) {
    var result = await resubmitOnboarding({
      partnerId: ctx.partner.id,
      role: ctx.membership.role,
      userId: ctx.user.id,
      expectedVersion: body && body.version,
      req: req
    });
    return respondOnboarding(res, result);
  });
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

    if (action === 'onboarding') return handleOnboardingGet(req, res, body);
    if (action === 'onboarding-status') return handleOnboardingStatus(req, res, body);
    if (action === 'onboarding-save') return handleOnboardingSave(req, res, body);
    if (action === 'onboarding-submit') return handleOnboardingSubmit(req, res, body);
    if (action === 'onboarding-resubmit') return handleOnboardingResubmit(req, res, body);

    return errorJson(res, 400, 'missing_fields', { message: 'Onbekende of ontbrekende action.' });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('professionals_router', err);
    return errorJson(res, 500, 'server_error');
  }
};
