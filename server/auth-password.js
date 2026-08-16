/**
 * Server-side password setup for invite claims.
 * Does NOT use client verifyOtp / one-time Auth links (scanner-safe).
 */
var { createAdminClient } = require('./supabase');
var {
  normalizeEmail,
  findInviteByRawToken,
  inviteFailureCode,
  acceptInviteForUser
} = require('./invites');
var { writeAudit } = require('./audit');

function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * Resolve auth user id for an email without relying on client OTP.
 * Uses generateLink metadata only (does not send email).
 */
async function resolveAuthUserIdByEmail(admin, email) {
  var { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email
  });
  if (error) {
    // No user yet
    if (/not\s*found|unable to find|user not found/i.test(String(error.message || ''))) {
      return { userId: null, error: null };
    }
    console.error('auth_user_resolve_failed', error.message);
    return { userId: null, error: error.message };
  }
  var user = (data && data.user) || null;
  return { userId: user && user.id ? user.id : null, error: null };
}

/**
 * Set password for the invite email using service role.
 * Creates a confirmed auth user when needed; updates password when user exists.
 */
async function setupPasswordForInvite(opts) {
  var rawToken = String(opts.rawToken || '').trim();
  var password = opts.password;
  if (!rawToken) return { ok: false, code: 'invite_invalid' };
  if (!isStrongPassword(password)) return { ok: false, code: 'password_too_weak' };

  var found = await findInviteByRawToken(rawToken);
  if (found.error) return { ok: false, code: found.error };
  var invite = found.invite;
  var fail = inviteFailureCode(invite);
  // Allow password setup for pending invites only (not revoked/expired/used).
  if (fail) return { ok: false, code: fail };

  var partner = invite.partners;
  if (!partner || partner.account_status !== 'active') {
    return { ok: false, code: 'invite_partner_inactive' };
  }

  var email = normalizeEmail(invite.email);
  var admin = createAdminClient();

  var resolved = await resolveAuthUserIdByEmail(admin, email);
  if (resolved.error && !resolved.userId) {
    // recovery generateLink can fail for never-created users depending on GoTrue version;
    // fall through to createUser.
  }

  var userId = resolved.userId;
  if (!userId) {
    var created = await admin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    if (created.error) {
      // Race: user appeared between resolve and create — try update path.
      if (/already|registered|exists/i.test(String(created.error.message || ''))) {
        var again = await resolveAuthUserIdByEmail(admin, email);
        if (!again.userId) {
          console.error('setup_password_create_exists_but_unresolved', created.error.message);
          return { ok: false, code: 'server_error' };
        }
        userId = again.userId;
        var updExisting = await admin.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true
        });
        if (updExisting.error) {
          console.error('setup_password_update_failed', updExisting.error.message);
          return { ok: false, code: 'server_error' };
        }
      } else {
        console.error('setup_password_create_failed', created.error.message);
        return { ok: false, code: 'server_error' };
      }
    } else {
      userId = created.data && created.data.user && created.data.user.id;
      if (!userId) return { ok: false, code: 'server_error' };
    }
  } else {
    var updated = await admin.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true
    });
    if (updated.error) {
      console.error('setup_password_update_failed', updated.error.message);
      return { ok: false, code: 'server_error' };
    }
  }

  await writeAudit({
    req: opts.req,
    actorUserId: userId,
    actorType: 'user',
    partnerId: invite.partner_id,
    action: 'password_setup_completed',
    meta: { inviteId: invite.id, email: email }
  });

  // Claim membership in the same BFF step so the happy path does not depend on
  // a second browser click on /professionals/activate after password setup.
  var claimed = false;
  var claim = null;
  var { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData || !userData.user) {
    console.error('setup_password_claim_user_lookup_failed', userErr && userErr.message);
  } else {
    claim = await acceptInviteForUser({
      rawToken: rawToken,
      user: userData.user,
      req: opts.req
    });
    claimed = !!(claim && claim.ok);
    if (!claimed) {
      console.error('setup_password_claim_failed', claim && claim.code);
    }
  }

  return {
    ok: true,
    email: email,
    userId: userId,
    inviteToken: rawToken,
    partnerId: invite.partner_id,
    claimed: claimed,
    membershipId: claim && claim.ok ? claim.membershipId : null,
    role: claim && claim.ok ? claim.role : null,
    partner: claim && claim.ok ? claim.partner : null
  };
}

module.exports = {
  setupPasswordForInvite,
  resolveAuthUserIdByEmail,
  isStrongPassword
};
