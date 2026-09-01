'use strict';

var { createInvite, normalizeEmail } = require('../invites');
var { sendPartnerInviteEmail } = require('../invite-email');
var { buildActivateUrl, buildPasswordSetupUrl } = require('../invite-links');
var { updateCandidateStatus, recordAutopilotEvent } = require('./store');
var { statusFromVerdict } = require('./screening');
var { isAutoInviteOnReady } = require('./config');
var { sendInterestReceivedEmail, sendContinueProfileEmail } = require('../partner-autopilot-emails');

async function provisionInviteFromCandidate(candidate, opts) {
  opts = opts || {};
  if (!candidate || !candidate.email) return { ok: false, code: 'missing_fields' };
  if (candidate.inviteId && candidate.inviteSentAt) {
    return { ok: true, skipped: true, partnerId: candidate.partnerId, inviteId: candidate.inviteId };
  }

  var email = normalizeEmail(candidate.email);
  var appUrl = (process.env.PROFESSIONALS_APP_URL || '').replace(/\/$/, '');
  if (!appUrl) return { ok: false, code: 'missing_env' };

  var created = await createInvite({
    email: email,
    role: 'owner',
    legalName: candidate.companyName,
    displayName: candidate.companyName,
    invitedByUserId: opts.staffUserId || null
  });
  if (!created.ok) return created;

  var activateUrl = buildActivateUrl(appUrl, created.rawToken);
  var passwordSetupUrl = buildPasswordSetupUrl(appUrl, created.rawToken);

  var emailResult = { ok: false, skipped: true };
  if (opts.sendEmail !== false) {
    emailResult = await sendContinueProfileEmail({
      to: email,
      companyName: candidate.companyName,
      activateUrl: activateUrl,
      passwordSetupUrl: passwordSetupUrl
    });
    if (!emailResult.ok) {
      emailResult = await sendPartnerInviteEmail({
        to: email,
        partnerName: candidate.companyName,
        activateUrl: activateUrl,
        passwordSetupUrl: passwordSetupUrl
      });
    }
  }

  var now = new Date().toISOString();
  await updateCandidateStatus(candidate.id, {
    autopilot_status: 'invited',
    partner_id: created.partnerId,
    invite_id: created.invite.id,
    invite_sent_at: now
  });

  await recordAutopilotEvent({
    candidateId: candidate.id,
    partnerId: created.partnerId,
    eventType: 'invite_sent',
    actorType: opts.staffUserId ? 'staff' : 'system',
    actorUserId: opts.staffUserId || null,
    payload: { emailSent: !!(emailResult && emailResult.ok), inviteId: created.invite.id },
    req: opts.req
  });

  return {
    ok: true,
    partnerId: created.partnerId,
    inviteId: created.invite.id,
    emailSent: !!(emailResult && emailResult.ok)
  };
}

async function processScreeningOutcome(candidate, screening, opts) {
  opts = opts || {};
  var status = statusFromVerdict(screening.verdict);
  if (screening.verdict === 'READY' && isAutoInviteOnReady()) {
    status = 'invited';
  } else if (screening.verdict === 'READY') {
    status = 'review_required';
  }

  var updated = await updateCandidateStatus(candidate.id, {
    autopilot_status: status,
    category_id: screening.categoryId || candidate.categoryId,
    screening_result: {
      verdict: screening.verdict,
      issues: screening.issues,
      screenedAt: new Date().toISOString()
    }
  });
  if (!updated.ok) return updated;

  await recordAutopilotEvent({
    candidateId: candidate.id,
    eventType: 'screening_complete',
    payload: screening,
    req: opts.req
  });

  if (screening.verdict === 'READY' && isAutoInviteOnReady()) {
    return provisionInviteFromCandidate(updated.candidate, opts);
  }
  return { ok: true, candidate: updated.candidate, screening: screening };
}

module.exports = {
  provisionInviteFromCandidate: provisionInviteFromCandidate,
  processScreeningOutcome: processScreeningOutcome,
  sendInterestReceivedEmail: sendInterestReceivedEmail
};
