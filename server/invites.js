/**
 * ELYAN partner invites — membership authorization only (not Auth identity).
 */
var crypto = require('crypto');
var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');

var INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function inviteFailureCode(invite) {
  if (!invite) return 'invite_invalid';
  if (invite.invite_status === 'revoked') return 'invite_revoked';
  if (invite.invite_status === 'accepted') return 'invite_used';
  if (invite.invite_status !== 'pending') return 'invite_invalid';
  if (new Date(invite.expires_at).getTime() < Date.now()) return 'invite_expired';
  return null;
}

async function findInviteByRawToken(rawToken) {
  var admin = createAdminClient();
  var tokenHash = hashToken(rawToken);
  var { data, error } = await admin
    .from('partner_invites')
    .select('id, partner_id, email, role, invite_status, expires_at, accepted_at, revoked_at, partners(id, display_name, legal_name, account_status)')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) {
    console.error('invite_lookup_failed', error.message);
    return { invite: null, error: 'server_error' };
  }
  return { invite: data, error: null };
}

/**
 * Staff: create partner (optional) + pending invite. Returns raw token once.
 */
async function createInvite(opts) {
  var admin = createAdminClient();
  var email = normalizeEmail(opts.email);
  if (!isValidEmail(email)) return { ok: false, code: 'invalid_email' };

  var role = opts.role || 'owner';
  if (['owner', 'admin', 'member'].indexOf(role) < 0) {
    return { ok: false, code: 'missing_fields' };
  }

  var partnerId = opts.partnerId || null;
  if (!partnerId) {
    var legalName = String(opts.legalName || '').trim();
    var displayName = String(opts.displayName || legalName).trim();
    if (!legalName) return { ok: false, code: 'missing_fields' };
    var { data: partner, error: pErr } = await admin
      .from('partners')
      .insert({
        legal_name: legalName,
        display_name: displayName,
        account_status: 'active'
      })
      .select('id, display_name, legal_name, account_status')
      .single();
    if (pErr || !partner) {
      console.error('partner_create_failed', pErr && pErr.message);
      return { ok: false, code: 'server_error' };
    }
    partnerId = partner.id;
  } else {
    var { data: existingPartner, error: epErr } = await admin
      .from('partners')
      .select('id, display_name, legal_name, account_status')
      .eq('id', partnerId)
      .maybeSingle();
    if (epErr || !existingPartner) return { ok: false, code: 'invite_invalid' };
    if (existingPartner.account_status !== 'active') {
      return { ok: false, code: 'invite_partner_inactive' };
    }
  }

  var rawToken = generateRawToken();
  var tokenHash = hashToken(rawToken);
  var expiresAt = new Date(Date.now() + (opts.ttlMs || INVITE_TTL_MS)).toISOString();

  var { data: invite, error: iErr } = await admin
    .from('partner_invites')
    .insert({
      partner_id: partnerId,
      email: email,
      role: role,
      token_hash: tokenHash,
      invite_status: 'pending',
      expires_at: expiresAt,
      invited_by_user_id: opts.invitedByUserId || null
    })
    .select('id, partner_id, email, role, invite_status, expires_at')
    .single();

  if (iErr || !invite) {
    console.error('invite_create_failed', iErr && iErr.message);
    if (iErr && iErr.code === '23505') {
      return { ok: false, code: 'missing_fields', message: 'Er bestaat al een openstaande uitnodiging voor dit e-mailadres bij deze partner.' };
    }
    return { ok: false, code: 'server_error' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.invitedByUserId || null,
    actorType: 'staff',
    partnerId: partnerId,
    action: 'invite_created',
    meta: { inviteId: invite.id, email: email, role: role }
  });

  return {
    ok: true,
    invite: invite,
    partnerId: partnerId,
    rawToken: rawToken
  };
}

async function revokeInvite(opts) {
  var admin = createAdminClient();
  var { data: invite, error } = await admin
    .from('partner_invites')
    .select('id, partner_id, invite_status')
    .eq('id', opts.inviteId)
    .maybeSingle();
  if (error || !invite) return { ok: false, code: 'invite_invalid' };
  if (invite.invite_status !== 'pending') return { ok: false, code: 'invite_invalid' };

  var { error: uErr } = await admin
    .from('partner_invites')
    .update({
      invite_status: 'revoked',
      revoked_at: new Date().toISOString()
    })
    .eq('id', invite.id)
    .eq('invite_status', 'pending');

  if (uErr) return { ok: false, code: 'server_error' };

  await writeAudit({
    req: opts.req,
    actorUserId: opts.actorUserId || null,
    actorType: 'staff',
    partnerId: invite.partner_id,
    action: 'invite_revoked',
    meta: { inviteId: invite.id }
  });

  return { ok: true };
}

/**
 * Claim membership for authenticated user with matching invite email.
 */
async function acceptInviteForUser(opts) {
  var rawToken = opts.rawToken;
  var user = opts.user;
  if (!rawToken || !user) return { ok: false, code: 'invite_invalid' };

  var found = await findInviteByRawToken(rawToken);
  if (found.error) return { ok: false, code: found.error };
  var invite = found.invite;
  var fail = inviteFailureCode(invite);
  if (fail) return { ok: false, code: fail };

  var partner = invite.partners;
  if (!partner || partner.account_status !== 'active') {
    return { ok: false, code: 'invite_partner_inactive' };
  }

  var userEmail = normalizeEmail(user.email);
  if (!userEmail || userEmail !== invite.email) {
    return { ok: false, code: 'invite_email_mismatch' };
  }

  var admin = createAdminClient();

  // Idempotent membership
  var { data: existingMember } = await admin
    .from('partner_members')
    .select('id, role, member_status')
    .eq('partner_id', invite.partner_id)
    .eq('user_id', user.id)
    .maybeSingle();

  var membershipId = existingMember && existingMember.id;
  if (!existingMember) {
    var { data: created, error: mErr } = await admin
      .from('partner_members')
      .insert({
        partner_id: invite.partner_id,
        user_id: user.id,
        role: invite.role,
        member_status: 'active'
      })
      .select('id, role, member_status')
      .single();
    if (mErr || !created) {
      console.error('membership_create_failed', mErr && mErr.message);
      return { ok: false, code: 'server_error' };
    }
    membershipId = created.id;
    await writeAudit({
      req: opts.req,
      actorUserId: user.id,
      actorType: 'user',
      partnerId: invite.partner_id,
      action: 'membership_created',
      meta: { membershipId: membershipId, role: invite.role, inviteId: invite.id }
    });
  } else if (existingMember.member_status !== 'active') {
    return { ok: false, code: 'member_disabled' };
  }

  var { data: accepted, error: aErr } = await admin
    .from('partner_invites')
    .update({
      invite_status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id
    })
    .eq('id', invite.id)
    .eq('invite_status', 'pending')
    .select('id')
    .maybeSingle();

  if (aErr) {
    console.error('invite_accept_failed', aErr.message);
    return { ok: false, code: 'server_error' };
  }
  // If already accepted in race, treat as used unless we just created membership
  if (!accepted && !existingMember) {
    return { ok: false, code: 'invite_used' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: user.id,
    actorType: 'user',
    partnerId: invite.partner_id,
    action: 'invite_accepted',
    meta: { inviteId: invite.id, membershipId: membershipId }
  });

  return {
    ok: true,
    partnerId: invite.partner_id,
    membershipId: membershipId,
    role: invite.role,
    partner: {
      id: partner.id,
      displayName: partner.display_name,
      legalName: partner.legal_name
    }
  };
}

/**
 * Preview invite (no consume) for activate page — never returns token_hash.
 */
async function previewInvite(rawToken) {
  var found = await findInviteByRawToken(rawToken);
  if (found.error) return { ok: false, code: found.error };
  var invite = found.invite;
  var fail = inviteFailureCode(invite);
  if (fail) return { ok: false, code: fail };
  var partner = invite.partners;
  if (!partner || partner.account_status !== 'active') {
    return { ok: false, code: 'invite_partner_inactive' };
  }
  return {
    ok: true,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expires_at,
    partner: {
      id: partner.id,
      displayName: partner.display_name,
      legalName: partner.legal_name
    }
  };
}

async function generateSupabaseInviteLink(email, redirectTo) {
  var admin = createAdminClient();
  var { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: normalizeEmail(email),
    options: redirectTo ? { redirectTo: redirectTo } : undefined
  });
  if (error) {
    console.error('generate_link_failed', error.message);
    return { ok: false, code: 'server_error', error: error.message };
  }
  var props = (data && data.properties) || {};
  var actionLink = props.action_link || (data && data.action_link) || null;
  var hashedToken = props.hashed_token || (data && data.hashed_token) || null;
  return { ok: true, actionLink: actionLink, hashedToken: hashedToken, data: data };
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  hashToken,
  generateRawToken,
  createInvite,
  revokeInvite,
  acceptInviteForUser,
  previewInvite,
  generateSupabaseInviteLink,
  inviteFailureCode,
  INVITE_TTL_MS
};
