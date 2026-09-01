'use strict';

var { getCategoryLabel } = require('./categories');

var FORBIDDEN_CLAIM_PATTERNS = [
  /\b\d+\s*jaar\s*ervaring/i,
  /\bgecertificeerd\b/i,
  /\baward\b/i,
  /\bpremium\b/i,
  /\bgoogle\s*rating\b/i,
  /\b\d+[,.]?\d*\s*\/\s*5\b/i,
  /\b\d+\s*medewerkers/i,
  /\b\d+\s*werknemers/i
];

/**
 * Evidence-backed profile composition. AI optional via opts.aiCompose (server-only).
 * Never invents facts absent from structured input.
 */
function composeProfileFromDraft(draft, opts) {
  opts = opts || {};
  draft = draft && typeof draft === 'object' ? draft : {};
  var company = draft.company || {};
  var craft = draft.craft || {};
  var area = draft.service_area || {};
  var offer = draft.offer || {};
  var story = draft.story || {};

  var displayName = String(company.display_name || company.legal_name || opts.displayName || '').trim();
  var categoryId = craft.primary_category_id || opts.categoryId || null;
  var categoryLabel = getCategoryLabel(categoryId) || 'renovatiewerkzaamheden';
  var workArea = String(area.public_text || area.gemeente || opts.region || '').trim();

  var specialisations = [];
  if (Array.isArray(craft.service_ids) && opts.getServiceLabel) {
    craft.service_ids.forEach(function (sid) {
      var lab = opts.getServiceLabel(categoryId, sid);
      if (lab) specialisations.push(lab);
    });
  }

  var introParts = [];
  if (displayName) {
    introParts.push(displayName + ' voert ' + categoryLabel.toLowerCase() + ' uit');
    if (workArea) introParts.push('in ' + workArea);
  }
  var introduction = introParts.length ? introParts.join(' ') + '.' : '';

  var description = '';
  if (story.strength && String(story.strength).trim()) {
    description = String(story.strength).trim();
  } else if (introduction) {
    description = introduction;
  }

  var availability = offer.capacity || offer.start_month || null;
  var composed = {
    introduction: introduction,
    description: description,
    specialisationLabels: specialisations,
    workAreaCopy: workArea || null,
    availabilityCopy: availability ? String(availability) : null,
    priceCopy: [],
    source: 'deterministic',
    evidence: {
      displayName: !!displayName,
      categoryId: !!categoryId,
      workArea: !!workArea,
      specialisations: specialisations.length > 0,
      yearsActive: !!(story.years_active && story.show_years_public !== false),
      teamSize: !!(story.team_size && story.show_team_public === true)
    }
  };

  if (story.years_active && story.show_years_public !== false && opts.yearsLabel) {
    composed.yearsActive = opts.yearsLabel(story.years_active);
  }
  if (story.team_size && story.show_team_public === true && opts.teamLabel) {
    composed.teamSize = opts.teamLabel(story.team_size);
  }

  sanitizeComposedProfile(composed);
  return composed;
}

function sanitizeComposedProfile(composed) {
  if (!composed || typeof composed !== 'object') return composed;
  ['introduction', 'description', 'workAreaCopy', 'availabilityCopy'].forEach(function (key) {
    if (!composed[key]) return;
    var text = String(composed[key]);
    FORBIDDEN_CLAIM_PATTERNS.forEach(function (re) {
      if (re.test(text) && !composed.evidence) {
        composed[key] = '';
      }
    });
    if (composed.evidence) {
      if (key === 'introduction' || key === 'description') {
        if (/\bjaar\b/i.test(text) && !composed.evidence.yearsActive) {
          composed[key] = stripYearsClaims(text);
        }
        if (/\bgecertificeerd\b/i.test(text)) {
          composed[key] = text.replace(/\bgecertificeerd\b/gi, '').trim();
        }
      }
    }
  });
  return composed;
}

function stripYearsClaims(text) {
  return String(text || '')
    .replace(/\b\d+\+?\s*jaar\s*(ervaring)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function composeProfile(draft, opts) {
  var base = composeProfileFromDraft(draft, opts);
  if (opts && typeof opts.aiCompose === 'function') {
    try {
      var aiResult = await opts.aiCompose(draft, base);
      if (aiResult && typeof aiResult === 'object') {
        var merged = Object.assign({}, base, aiResult, { source: 'ai_assisted' });
        return sanitizeComposedProfile(merged);
      }
    } catch (e) {
      /* fall through to deterministic */
    }
  }
  return base;
}

module.exports = {
  composeProfile: composeProfile,
  composeProfileFromDraft: composeProfileFromDraft,
  sanitizeComposedProfile: sanitizeComposedProfile,
  FORBIDDEN_CLAIM_PATTERNS: FORBIDDEN_CLAIM_PATTERNS
};
