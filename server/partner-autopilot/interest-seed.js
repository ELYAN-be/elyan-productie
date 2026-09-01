'use strict';

var { mapSpecialtyToCategory } = require('./categories');

var REGION_TO_PROVINCE = {
  antwerpen: 'antwerpen',
  'vlaams-brabant': 'vlaams_brabant',
  'waals-brabant': 'waals_brabant',
  'west-vlaanderen': 'west_vlaanderen',
  'oost-vlaanderen': 'oost_vlaanderen',
  limburg: 'limburg',
  brussel: 'brussel',
  henegouwen: 'henegouwen',
  luik: 'luik',
  luxemburg: 'luxemburg',
  namen: 'namen'
};

function draftNeedsInterestSeed(draft) {
  draft = draft || {};
  var company = draft.company || {};
  var craft = draft.craft || {};
  if (company.contact_name || company.email || company.phone) return false;
  if (craft.primary_category_id) return false;
  return true;
}

function buildDraftSeedFromCandidate(candidate) {
  if (!candidate) return null;
  var categoryId = candidate.categoryId || mapSpecialtyToCategory(candidate.specialty);
  var region = String(candidate.region || '').trim().toLowerCase();
  var provinceId = REGION_TO_PROVINCE[region] || null;
  var seed = {
    company: {
      legal_name: candidate.companyName || '',
      display_name: candidate.companyName || '',
      contact_name: candidate.contactName || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      website: candidate.website || ''
    }
  };
  if (categoryId) {
    seed.craft = { primary_category_id: categoryId };
  }
  if (provinceId && region !== 'meerdere') {
    seed.service_area = {
      mode: 'provincies',
      provinces: [provinceId],
      radius_km: 25
    };
  }
  return seed;
}

async function maybeSeedOnboardingFromInterest(admin, partnerId, onboardingRow) {
  if (!admin || !partnerId || !onboardingRow) {
    return { ok: true, seeded: false, onboarding: onboardingRow };
  }
  var draft = onboardingRow.draft || {};
  if (!draftNeedsInterestSeed(draft)) {
    return { ok: true, seeded: false, onboarding: onboardingRow };
  }

  var { data: candidate, error } = await admin
    .from('partner_interest_candidates')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error || !candidate) {
    return { ok: true, seeded: false, onboarding: onboardingRow };
  }

  var seed = buildDraftSeedFromCandidate({
    companyName: candidate.company_name,
    contactName: candidate.contact_name,
    email: candidate.email,
    phone: candidate.phone,
    website: candidate.website,
    specialty: candidate.specialty,
    region: candidate.region,
    categoryId: candidate.category_id
  });
  if (!seed) {
    return { ok: true, seeded: false, onboarding: onboardingRow };
  }

  var nextDraft = Object.assign({}, draft);
  if (seed.company) {
    nextDraft.company = Object.assign({}, draft.company || {}, seed.company);
  }
  if (seed.craft) {
    nextDraft.craft = Object.assign({}, draft.craft || {}, seed.craft);
  }
  if (seed.service_area) {
    nextDraft.service_area = Object.assign({}, draft.service_area || {}, seed.service_area);
  }

  var now = new Date().toISOString();
  var { error: uErr } = await admin
    .from('partner_onboarding')
    .update({ draft: nextDraft, updated_at: now })
    .eq('partner_id', partnerId);
  if (uErr) {
    console.error('interest_seed_failed', uErr.message);
    return { ok: true, seeded: false, onboarding: onboardingRow };
  }

  onboardingRow.draft = nextDraft;
  return { ok: true, seeded: true, onboarding: onboardingRow };
}

module.exports = {
  REGION_TO_PROVINCE: REGION_TO_PROVINCE,
  draftNeedsInterestSeed: draftNeedsInterestSeed,
  buildDraftSeedFromCandidate: buildDraftSeedFromCandidate,
  maybeSeedOnboardingFromInterest: maybeSeedOnboardingFromInterest
};
