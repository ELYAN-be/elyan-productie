'use strict';

var { listAutopilotCandidates } = require('./store');
var { evaluateAutopilotReadiness } = require('./readiness');
var { createAdminClient } = require('../supabase');

var QUEUE_FILTERS = {
  review_required: 'review_required',
  ready_for_review: 'ready_for_review',
  published: 'published',
  blocked: 'blocked'
};

function issueSummary(issues) {
  if (!issues || !issues.length) return null;
  return issues[0].message;
}

async function listAutopilotQueue(filter) {
  var counts = {
    review_required: 0,
    ready_for_review: 0,
    published: 0,
    blocked: 0
  };
  var rows = [];

  var candidates = await listAutopilotCandidates('all');
  if (!candidates.ok) return candidates;

  (candidates.items || []).forEach(function (c) {
    var bucket = c.autopilotStatus;
    if (bucket === 'invited' || bucket === 'onboarding') bucket = 'review_required';
    if (!counts[bucket] && bucket !== 'interest_received' && bucket !== 'screening') {
      /* skip unknown */
    } else if (counts[bucket] != null) {
      counts[bucket] += 1;
    }
    if (!filter || filter === 'all' || filter === bucket) {
      rows.push({
        kind: 'candidate',
        id: c.id,
        partnerId: c.partnerId,
        company: c.companyName,
        category: c.categoryId || c.specialty,
        region: c.region,
        status: c.autopilotStatus,
        issueReason: issueSummary((c.screeningResult && c.screeningResult.issues) || []),
        createdAt: c.createdAt
      });
    }
  });

  var admin = createAdminClient();
  var { data: partners, error } = await admin
    .from('partners')
    .select('id, display_name, legal_name, account_status, partner_onboarding(onboarding_status, draft), partner_profiles(profile_status, primary_category_id, published_at, publication_source)')
    .eq('account_status', 'active')
    .limit(300);
  if (!error && partners) {
    partners.forEach(function (p) {
      var onboarding = p.partner_onboarding;
      var profile = p.partner_profiles;
      if (Array.isArray(onboarding)) onboarding = onboarding[0];
      if (Array.isArray(profile)) profile = profile[0];
      if (!onboarding || !profile) return;

      var readiness = evaluateAutopilotReadiness({
        partner: p,
        onboarding: onboarding,
        profile: profile,
        checkUnsupportedClaims: false
      });

      var status = 'review_required';
      if (profile.profile_status === 'published') status = 'published';
      else if (readiness.verdict === 'READY_FOR_PUBLISH' && onboarding.onboarding_status === 'approved' && profile.profile_status === 'ready') {
        status = 'ready_for_review';
      } else if (readiness.verdict === 'BLOCKED') status = 'blocked';

      if (counts[status] != null) counts[status] += 1;

      if (!filter || filter === 'all' || filter === status) {
        rows.push({
          kind: 'partner',
          id: p.id,
          partnerId: p.id,
          company: p.display_name || p.legal_name,
          category: profile.primary_category_id,
          region: null,
          status: status,
          issueReason: issueSummary(readiness.issues),
          onboardingStatus: onboarding.onboarding_status,
          profileStatus: profile.profile_status,
          publishedAt: profile.published_at,
          publicationSource: profile.publication_source
        });
      }
    });
  }

  return { ok: true, filter: filter || 'all', counts: counts, items: rows };
}

module.exports = {
  listAutopilotQueue: listAutopilotQueue,
  QUEUE_FILTERS: QUEUE_FILTERS
};
