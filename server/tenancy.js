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
 * Primary source: partner_members.
 * Fallback: accepted partner_invites claimed by this user — required when service_role
 * lacks GRANT on partner_members (Phase A production gap).
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
  } else {
    // Only short-circuit on a non-empty result. An empty [] must fall through to
    // partner_invites / app_metadata — production may have SELECT but not INSERT
    // on partner_members, so claims land in metadata while this query returns [].
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
    if (memberships.length) {
      return { memberships: memberships, error: null, source: 'partner_members' };
    }
  }

  var { data: invites, error: iErr } = await admin
    .from('partner_invites')
    .select('id, role, partner_id, partners!inner(id, display_name, legal_name, account_status)')
    .eq('accepted_by', userId)
    .eq('invite_status', 'accepted');

  if (iErr) {
    console.error('memberships_invite_fallback_failed', iErr.message);
  } else {
    var fromInvites = (invites || [])
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
          },
          viaInviteClaim: true
        };
      });
    if (fromInvites.length) {
      return { memberships: fromInvites, error: null, source: 'partner_invites' };
    }
  }

  var { listMembershipsFromAppMetadata } = require('./invites');
  var metaListed = await listMembershipsFromAppMetadata(admin, userId);
  if (metaListed.error && !(metaListed.memberships && metaListed.memberships.length)) {
    return {
      memberships: [],
      error: (error && error.message) || (iErr && iErr.message) || metaListed.error
    };
  }
  return {
    memberships: metaListed.memberships || [],
    error: null,
    source: 'app_metadata'
  };
}

async function requireActiveMembership(req, partnerId) {
  var auth = await requireUser(req);
  if (!auth.ok) return auth;

  var listed = await listActiveMemberships(auth.user.id);
  if (listed.error) {
    return { ok: false, status: 500, code: 'server_error', user: auth.user };
  }
  var hit = (listed.memberships || []).find(function (m) {
    return m.partnerId === partnerId;
  });
  if (!hit) {
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

  return {
    ok: true,
    user: auth.user,
    membership: {
      id: hit.membershipId,
      role: hit.role,
      member_status: 'active',
      partner_id: hit.partnerId
    },
    partner: {
      id: hit.partner.id,
      display_name: hit.partner.displayName,
      legal_name: hit.partner.legalName,
      account_status: hit.partner.accountStatus
    },
    accessToken: auth.accessToken
  };
}

/**
 * Resolve partner context from memberships.
 * partnerId optional when the user has exactly one active membership.
 */
async function requirePartnerContext(req, partnerId) {
  var auth = await requireUser(req);
  if (!auth.ok) return auth;

  var listed = await listActiveMemberships(auth.user.id);
  if (listed.error) {
    return { ok: false, status: 500, code: 'server_error', user: auth.user };
  }
  var memberships = listed.memberships || [];
  if (!memberships.length) {
    await writeAudit({
      req: req,
      actorUserId: auth.user.id,
      actorType: 'user',
      partnerId: partnerId || null,
      action: 'authorization_denied',
      meta: { reason: 'no_membership' }
    });
    return { ok: false, status: 403, code: 'no_membership', user: auth.user };
  }

  var pid = partnerId ? String(partnerId) : '';
  var hit = null;
  if (pid) {
    hit = memberships.find(function (m) {
      return m.partnerId === pid;
    });
    if (!hit) {
      await writeAudit({
        req: req,
        actorUserId: auth.user.id,
        actorType: 'user',
        partnerId: pid,
        action: 'authorization_denied',
        meta: { reason: 'no_membership' }
      });
      return { ok: false, status: 403, code: 'no_membership', user: auth.user };
    }
  } else if (memberships.length === 1) {
    hit = memberships[0];
  } else {
    return { ok: false, status: 400, code: 'partner_required', user: auth.user };
  }

  return {
    ok: true,
    user: auth.user,
    membership: {
      id: hit.membershipId,
      role: hit.role,
      member_status: 'active',
      partner_id: hit.partnerId
    },
    partner: {
      id: hit.partner.id,
      display_name: hit.partner.displayName,
      legal_name: hit.partner.legalName,
      account_status: hit.partner.accountStatus
    },
    accessToken: auth.accessToken
  };
}

module.exports = {
  requireUser,
  requireStaff,
  isStaff,
  listActiveMemberships,
  requireActiveMembership,
  requirePartnerContext
};
