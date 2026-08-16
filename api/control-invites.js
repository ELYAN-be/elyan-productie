/**
 * POST /api/control-invites — staff only (Phase A)
 */
var { requireStaff } = require('../server/tenancy');
var { createInvite, revokeInvite, normalizeEmail, isValidEmail } = require('../server/invites');
var { sendPartnerInviteEmail } = require('../server/invite-email');
var { buildActivateUrl, buildPasswordSetupUrl, isPasswordSetupUrl } = require('../server/invite-links');
var { json, methodNotAllowed, errorJson, readJson } = require('../server/http');
var { rateLimit, clientKey } = require('../server/rate-limit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  var rl = rateLimit(clientKey(req, 'control_invites'), 20, 60 * 1000);
  if (!rl.ok) return errorJson(res, 429, 'rate_limited');

  try {
    var staff = await requireStaff(req);
    if (!staff.ok) return errorJson(res, staff.status, staff.code);

    var body = await readJson(req);

    if (body.action === 'revoke') {
      var revoked = await revokeInvite({
        inviteId: body.inviteId,
        actorUserId: staff.user.id,
        req: req
      });
      if (!revoked.ok) return errorJson(res, 400, revoked.code);
      return json(res, 200, { ok: true });
    }

    var email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return errorJson(res, 400, 'invalid_email');

    var created = await createInvite({
      email: email,
      role: body.role || 'owner',
      partnerId: body.partnerId || null,
      legalName: body.legalName,
      displayName: body.displayName,
      invitedByUserId: staff.user.id,
      req: req
    });
    if (!created.ok) return errorJson(res, 400, created.code);

    var appUrl = (process.env.PROFESSIONALS_APP_URL || '').replace(/\/$/, '');
    if (!appUrl) {
      return errorJson(res, 503, 'missing_env', { hint: 'PROFESSIONALS_APP_URL' });
    }
    var activateUrl = buildActivateUrl(appUrl, created.rawToken);

    // Password CTA embeds ONLY the Elyan invite token. Auth password is set
    // server-side on submit (no Supabase OTP in the email — scanner-safe).
    var passwordSetupUrl = buildPasswordSetupUrl(appUrl, created.rawToken);
    if (!passwordSetupUrl || !isPasswordSetupUrl(passwordSetupUrl)) {
      console.error('invite_password_setup_url_missing', {
        passwordSetupUrl: passwordSetupUrl || null
      });
      return errorJson(res, 500, 'server_error');
    }

    var emailResult = { ok: false, skipped: true };
    if (body.sendEmail !== false) {
      emailResult = await sendPartnerInviteEmail({
        to: email,
        partnerName: body.displayName || body.legalName || 'ELYAN Partner',
        activateUrl: activateUrl,
        passwordSetupUrl: passwordSetupUrl
      });
    }

    return json(res, 200, {
      ok: true,
      inviteId: created.invite.id,
      partnerId: created.partnerId,
      email: created.invite.email,
      role: created.invite.role,
      expiresAt: created.invite.expires_at,
      activateUrl: activateUrl,
      passwordSetupUrl: passwordSetupUrl,
      emailSent: !!(emailResult && emailResult.ok),
      rawToken: created.rawToken
    });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('control_invites_handler', err);
    return errorJson(res, 500, 'server_error');
  }
};
