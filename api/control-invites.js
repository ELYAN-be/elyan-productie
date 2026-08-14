/**
 * POST /api/control/invites — staff only
 * Body: { email, role?, legalName?, displayName?, partnerId?, sendEmail? }
 * Creates partner (optional) + invite; optionally emails via Resend + Supabase generateLink.
 */
var { requireStaff } = require('./lib/tenancy');
var { createInvite, generateSupabaseInviteLink, revokeInvite, normalizeEmail, isValidEmail } = require('./lib/invites');
var { sendPartnerInviteEmail } = require('./lib/invite-email');
var { json, methodNotAllowed, errorJson, readJson } = require('./lib/http');
var { rateLimit, clientKey } = require('./lib/rate-limit');

module.exports = async function handler(req, res) {
  if (req.method === 'DELETE' || (req.method === 'POST' && req.query && req.query.action === 'revoke')) {
    // handled below for revoke via POST { action:'revoke', inviteId }
  } else if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

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
    var activateUrl = appUrl + '/professionals/activate?token=' + encodeURIComponent(created.rawToken);

    var authLink = null;
    var linkResult = await generateSupabaseInviteLink(
      email,
      appUrl + '/professionals/activate?token=' + encodeURIComponent(created.rawToken)
    );
    if (linkResult.ok) authLink = linkResult.actionLink;

    var emailResult = { ok: false, skipped: true };
    if (body.sendEmail !== false) {
      emailResult = await sendPartnerInviteEmail({
        to: email,
        partnerName: body.displayName || body.legalName || 'ELYAN Partner',
        activateUrl: activateUrl,
        authActionLink: authLink
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
      emailSent: !!(emailResult && emailResult.ok),
      // rawToken returned once to staff caller for ops tooling — never log to audit
      rawToken: created.rawToken
    });
  } catch (err) {
    if (err && err.code === 'missing_env') return errorJson(res, 503, 'missing_env');
    console.error('control_invites_handler', err);
    return errorJson(res, 500, 'server_error');
  }
};
