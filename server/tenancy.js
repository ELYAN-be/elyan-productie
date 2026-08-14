/**
 * Tenancy & authorization helpers (Phase A)
 */
var { createAdminClient, getUserFromAccessToken, extractBearer } = require('./supabase');
var { writeAudit } = require('./audit');

async function requireUser(req) {
  var token = extractBearer(req);
  var result = await getUserFromAccessToken(token);
  if (!result.user) {
    return { ok: false, status: 401, code: result.error === 'missing_token' ? 'missing_token' : 'invalid_token' };
  }
  return { ok: true, user: result.user, accessToken: token };
}

async function isStaff(userId) {
  var admin = createAdminClient();
  var { data, error } = await admin
    .from('staff_users')
    .select('user_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('staff_lookup_failed', error.message);
    return { staff: false, role: null };
  }
  if (!data) return { staff: false, role: null };
  return { staff: true, role: data.role };
}

async function requireStaff(req) {
  var auth = await requireUser(req);
  if (!auth.ok) return auth;
  var staff = await isStaff(auth.user.id);
  if (!staff.staff) {
    await writeAudit({
      req: req,
      actorUserId: auth.user.id,
      actorType: 'user',
      action: 'authorization_denied',
      meta: { reason: 'not_staff', path: req.url || '' }
    });
    return { ok: false, status: 403, code: 'not_staff', user: auth.user };
  }
  return { ok: true, user: auth.user, staffRole: staff.role, accessToken: auth.accessToken };
}

/**
 * Active memberships for a user (member_status=active, partner account_status=active).
 */
async function listActiveMemberships(userId) {
  var admin = createAdminClient();
  var { data, error } = await admin
    .from('partner_members')
    .select('id, role, member_status, partner_id, partners!inner(id, display_name, legal_name, account_status)')
    .eq('user_id', userId)
    .eq('member_status', 'active');
  if (error) {
    console.error('memberships_lookup_failed', error.message);
    return { memberships: [], error: error.message };
  }
  var memberships = (data || [])
    .filter(function (row) {
      return row.partners && row.partners.account_status === 'active';
    })
    .map(function (row) {
      return {
        membershipId: row.id,
        role: row.role,
        partnerId: row.partner_id,
        partner: {
          id: row.partners.id,
          displayName: row.partners.display_name,
          legalName: row.partners.legal_name,
          accountStatus: row.partners.account_status
        }
      };
    });
  return { memberships: memberships, error: null };
}

async function requireActiveMembership(req, partnerId) {
  var auth = await requireUser(req);
  if (!auth.ok) return auth;

  var admin = createAdminClient();
  var { data: member, error: mErr } = await admin
    .from('partner_members')
    .select('id, role, member_status, partner_id')
    .eq('user_id', auth.user.id)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (mErr) {
    console.error('membership_check_failed', mErr.message);
    return { ok: false, status: 500, code: 'server_error', user: auth.user };
  }
  if (!member) {
    await writeAudit({
      req: req,
      actorUserId: auth.user.id,
      actorType: 'user',
      partnerId: partnerId,
      action: 'authorization_denied',
      meta: { reason: 'no_membership' }
    });
    return { ok: false, status: 403, code: 'no_membership', user: auth.user };
  }
  if (member.member_status !== 'active') {
    return { ok: false, status: 403, code: 'member_disabled', user: auth.user };
  }

  var { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, display_name, legal_name, account_status')
    .eq('id', partnerId)
    .maybeSingle();

  if (pErr || !partner) {
    return { ok: false, status: 403, code: 'no_membership', user: auth.user };
  }
  if (partner.account_status === 'suspended') {
    return { ok: false, status: 403, code: 'partner_suspended', user: auth.user, partner: partner };
  }
  if (partner.account_status === 'closed') {
    return { ok: false, status: 403, code: 'partner_closed', user: auth.user, partner: partner };
  }
  if (partner.account_status !== 'active') {
    return { ok: false, status: 403, code: 'partner_suspended', user: auth.user, partner: partner };
  }

  return {
    ok: true,
    user: auth.user,
    membership: member,
    partner: partner,
    accessToken: auth.accessToken
  };
}

module.exports = {
  requireUser,
  requireStaff,
  isStaff,
  listActiveMemberships,
  requireActiveMembership
};
