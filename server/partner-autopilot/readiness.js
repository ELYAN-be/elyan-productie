'use strict';

var { evaluatePublicationGate } = require('../control-model');
var { composeProfileFromDraft, sanitizeComposedProfile } = require('./profile-composer');
var { isSupportedCategory } = require('./categories');

var DECLINE_REASONS = ['te_ver', 'niet_mijn_werk', 'geen_beschikbaarheid', 'project_grootte', 'andere'];

/**
 * Deterministic readiness before publication.
 * @returns {{ verdict: 'READY_FOR_PUBLISH'|'REVIEW_REQUIRED'|'BLOCKED', issues: Array }}
 */
function evaluateAutopilotReadiness(opts) {
  opts = opts || {};
  var issues = [];
  var draft = (opts.onboarding && opts.onboarding.draft) || opts.draft || {};
  var craft = draft.craft || {};
  var area = draft.service_area || {};
  var offer = draft.offer || {};
  var categoryId = craft.primary_category_id || null;

  if (!categoryId || !isSupportedCategory(categoryId)) {
    issues.push({
      level: 'blocking',
      code: 'unsupported_category',
      message: 'Voeg een ondersteunde ELYAN-categorie toe.'
    });
  }

  if (!area.public_text && !area.gemeente && !(area.radius_km > 0)) {
    issues.push({
      level: 'blocking',
      code: 'missing_work_area',
      message: 'Voeg je werkgebied toe.'
    });
  }

  if (!offer.capacity && !offer.start_month) {
    issues.push({
      level: 'review',
      code: 'missing_availability',
      message: 'Beschikbaarheid ontbreekt.'
    });
  }

  var prices = offer.service_prices || {};
  var serviceIds = Array.isArray(craft.service_ids) ? craft.service_ids : [];
  var hasPublicPriceWithoutConsent = false;
  serviceIds.forEach(function (sid) {
    var sp = prices[sid];
    if (!sp || !sp.pricing_model || sp.pricing_model === 'on_request') return;
    if (sp.public_consent !== true) {
      hasPublicPriceWithoutConsent = true;
    }
  });
  if (hasPublicPriceWithoutConsent) {
    issues.push({
      level: 'review',
      code: 'price_consent_missing',
      message: 'Bevestig welke prijzen publiek mogen worden getoond.'
    });
  }

  if (opts.screening && opts.screening.issues) {
    opts.screening.issues.forEach(function (issue) {
      if (issue.code === 'company_verification_required') {
        issues.push({
          level: 'review',
          code: issue.code,
          message: 'Bedrijfscontrole vereist.'
        });
      }
    });
  }

  var composed = opts.composedProfile || composeProfileFromDraft(draft, opts.composeOpts || {});
  sanitizeComposedProfile(composed);
  if (opts.checkUnsupportedClaims !== false) {
    var text = (composed.introduction || '') + ' ' + (composed.description || '');
    if (/\bjaar\b/i.test(text) && !(composed.evidence && composed.evidence.yearsActive)) {
      issues.push({
        level: 'blocking',
        code: 'unsupported_claim',
        message: 'Profiel bevat niet-ondersteunde beweringen.'
      });
    }
  }

  var gate = evaluatePublicationGate({
    partner: opts.partner || { account_status: 'active' },
    onboarding: opts.onboarding || { onboarding_status: 'approved', draft: draft },
    profile: opts.profile || { profile_status: 'ready' },
    reviewItems: opts.reviewItems || []
  });
  if (!gate.ok) {
    gate.missing.forEach(function (m) {
      issues.push({
        level: m.code === 'open_review_items' ? 'review' : 'blocking',
        code: m.code,
        message: m.message
      });
    });
  }

  var blocking = issues.filter(function (i) { return i.level === 'blocking'; });
  var review = issues.filter(function (i) { return i.level === 'review'; });
  var verdict = 'READY_FOR_PUBLISH';
  if (blocking.length) verdict = 'BLOCKED';
  else if (review.length) verdict = 'REVIEW_REQUIRED';

  return { verdict: verdict, issues: issues, composedProfile: composed };
}

module.exports = {
  evaluateAutopilotReadiness: evaluateAutopilotReadiness,
  DECLINE_REASONS: DECLINE_REASONS
};
