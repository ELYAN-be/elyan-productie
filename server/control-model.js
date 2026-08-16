/**
 * Phase B Sprint 8 — ELYAN Control status transitions, slug, snapshot, publication gate.
 * Source of truth: Phase B Productspecificatie V2 (frozen) + Phase A staff_users.
 */
var { draftHelpers, isStepId, STEP_IDS } = require('./onboarding-model');

/** Queue filters for Control list (UI labels map 1:1). */
var LIST_FILTERS = [
  'submitted',
  'changes_requested',
  'ready',
  'published',
  'paused',
  'hidden'
];

/**
 * Explicit profile lifecycle transitions (Control-only).
 * Onboarding approve is separate (submitted → approved + under_review → ready).
 */
var PROFILE_ACTIONS = {
  publish: { from: ['ready'], to: 'published' },
  pause: { from: ['published'], to: 'paused' },
  hide: { from: ['published', 'paused'], to: 'hidden' },
  restore: { from: ['paused', 'hidden'], to: 'published' }
};

function isListFilter(v) {
  return LIST_FILTERS.indexOf(v) >= 0;
}

function canApproveOnboarding(status) {
  return status === 'submitted';
}

function canRequestChanges(status) {
  return status === 'submitted' || status === 'changes_requested';
}

function canProfileAction(action, profileStatus) {
  var rule = PROFILE_ACTIONS[action];
  if (!rule) return false;
  return rule.from.indexOf(profileStatus) >= 0;
}

function nextProfileStatus(action) {
  var rule = PROFILE_ACTIONS[action];
  return rule ? rule.to : null;
}

/**
 * Approve rule for open review-items (ONE explicit consistent rule):
 * Approve is refused while any review-item is still open.
 * Partners resolve items via resubmit; Control must not approve with open feedback.
 */
function hasOpenReviewItems(items) {
  return (items || []).some(function (r) {
    return r && r.item_status === 'open';
  });
}

function slugifyBase(raw) {
  var s = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
  return s || 'partner';
}

/**
 * Build a stable slug candidate from approved company/partner names.
 * Uniqueness is enforced by the Control service against partner_profiles.slug.
 */
function buildSlugCandidate(opts) {
  var draft = opts && opts.draft && typeof opts.draft === 'object' ? opts.draft : {};
  var company = draft.company && typeof draft.company === 'object' ? draft.company : {};
  var name =
    (company.display_name && String(company.display_name).trim()) ||
    (company.legal_name && String(company.legal_name).trim()) ||
    (opts && opts.displayName) ||
    (opts && opts.legalName) ||
    'partner';
  return slugifyBase(name);
}

/**
 * published_snapshot — frozen public projection at publish time.
 * Built from the locked approved onboarding draft + assets (not a live editable draft).
 */
function buildPublishedSnapshot(opts) {
  var draft = opts.draft && typeof opts.draft === 'object' ? opts.draft : {};
  var company = draftHelpers.pickCompany(draft.company);
  var serviceArea = draftHelpers.pickServiceArea(draft.service_area);
  var craft = draftHelpers.pickCraft(draft.craft);
  var offer = draftHelpers.pickOffer(draft.offer);
  var story = draftHelpers.pickStory(draft.story);
  var assets = (opts.assets || []).map(function (a) {
    return {
      id: a.id,
      publicUrl: a.public_url || a.publicUrl || null,
      title: a.title || null,
      isCover: !!(a.is_cover || a.isCover),
      sortOrder: a.sort_order != null ? a.sort_order : a.sortOrder != null ? a.sortOrder : 0
    };
  });
  var coverId = opts.coverAssetId || null;
  var cover = assets.filter(function (a) {
    return coverId ? a.id === coverId : a.isCover;
  })[0] || assets[0] || null;

  return {
    version: 1,
    partnerId: opts.partnerId,
    slug: opts.slug || null,
    displayName: company.display_name || opts.displayName || null,
    legalName: company.legal_name || opts.legalName || null,
    specialtyLine: opts.specialtyLine || null,
    primaryCategoryId: craft.primary_category_id || opts.primaryCategoryId || null,
    company: company,
    serviceArea: serviceArea,
    craft: craft,
    offer: offer,
    story: story,
    assets: assets,
    coverAssetId: cover ? cover.id : null,
    coverUrl: cover ? cover.publicUrl : null,
    publishedAt: opts.publishedAt || null
  };
}

/**
 * Objective server-side publication gate (V2). No new product fields.
 * Portfolio photos are NOT a blocker. Open review-items block.
 */
function evaluatePublicationGate(opts) {
  var missing = [];
  var partner = opts.partner || {};
  var onboarding = opts.onboarding || {};
  var profile = opts.profile || {};
  var draft = onboarding.draft || {};

  if (partner.account_status !== 'active') {
    missing.push({
      code: 'account_inactive',
      message: 'Het partneraccount is niet actief.'
    });
  }
  if (onboarding.onboarding_status !== 'approved') {
    missing.push({
      code: 'onboarding_not_approved',
      message: 'Onboarding is nog niet goedgekeurd.'
    });
  }
  if (profile.profile_status !== 'ready') {
    missing.push({
      code: 'profile_not_ready',
      message: 'Profiel moet status klaar hebben vóór publicatie.'
    });
  }

  var p2 = draftHelpers.validateP2Complete(draft);
  if (!p2.ok) {
    missing.push({
      code: 'invalid_business_identity',
      message: 'Bedrijfsidentiteit of werkgebied is onvolledig.',
      details: p2.errors
    });
  }

  var p3 = draftHelpers.validateP3Complete(draft);
  if (!p3.ok) {
    missing.push({
      code: 'invalid_category_services',
      message: 'Categorie of diensten ontbreken.',
      details: p3.errors
    });
  }

  var p4 = draftHelpers.validateP4Complete(draft);
  if (!p4.ok) {
    missing.push({
      code: 'invalid_prices',
      message: 'Prijzen of beschikbaarheid zijn ongeldig.',
      details: p4.errors
    });
  }

  var p5 = draftHelpers.validateP5Complete(draft);
  if (!p5.ok) {
    missing.push({
      code: 'invalid_profile_fields',
      message: 'Verplichte profielvelden ontbreken.',
      details: p5.errors
    });
  }

  if (hasOpenReviewItems(opts.reviewItems)) {
    missing.push({
      code: 'open_review_items',
      message: 'Er staan nog open aanpassingspunten open.'
    });
  }

  return { ok: missing.length === 0, missing: missing };
}

/**
 * Marketplace preview card from approved/submitted draft (Control read-only).
 * Shape aligned with public vakmannen partner cards — not live seed data.
 */
function buildMarketplacePreview(opts) {
  var snap = buildPublishedSnapshot(opts);
  var catId = snap.primaryCategoryId;
  var cat = catId && draftHelpers.getCategory ? draftHelpers.getCategory(catId) : null;
  var services = (snap.craft.service_ids || []).map(function (sid) {
    var list = catId && draftHelpers.getServices ? draftHelpers.getServices(catId) : [];
    var hit = list.filter(function (s) { return s.id === sid; })[0];
    var sp = (snap.offer.service_prices && snap.offer.service_prices[sid]) || {};
    return {
      id: sid,
      label: hit ? hit.label : sid,
      pricingModel: sp.pricing_model || null,
      minPrice: sp.min_price != null ? sp.min_price : null,
      maxPrice: sp.max_price != null ? sp.max_price : null
    };
  });
  return {
    slug: snap.slug,
    status: opts.profileStatus || 'ready',
    name: snap.displayName,
    specialtyLine: snap.specialtyLine || (snap.story && snap.story.strength) || null,
    category: catId,
    categoryLabel: cat ? cat.label : catId,
    city: snap.company.gemeente || null,
    area: (snap.serviceArea && snap.serviceArea.public_text) || null,
    image: snap.coverUrl,
    strength: snap.story && snap.story.strength,
    prefer: snap.story && snap.story.prefer,
    capacity: snap.offer && snap.offer.capacity,
    startMonth: snap.offer && snap.offer.start_month,
    visitSpeed: snap.offer && snap.offer.visit_speed,
    services: services,
    gallery: snap.assets.map(function (a) { return a.publicUrl; }).filter(Boolean)
  };
}

function validateReviewItemInput(item) {
  if (!item || typeof item !== 'object') {
    return { ok: false, code: 'invalid_review_item' };
  }
  var message = item.message != null ? String(item.message).trim() : '';
  if (!message || message.length < 3 || message.length > 2000) {
    return { ok: false, code: 'invalid_review_item', message: 'Feedbacktekst is verplicht (3–2000 tekens).' };
  }
  var stepId = item.stepId != null ? String(item.stepId) : item.step_id != null ? String(item.step_id) : null;
  if (stepId != null && stepId !== '' && !isStepId(stepId)) {
    return { ok: false, code: 'invalid_step' };
  }
  var fieldKey = item.fieldKey != null ? String(item.fieldKey).trim() : item.field_key != null ? String(item.field_key).trim() : null;
  if (fieldKey && fieldKey.length > 120) {
    return { ok: false, code: 'invalid_review_item' };
  }
  return {
    ok: true,
    item: {
      step_id: stepId || null,
      field_key: fieldKey || null,
      message: message
    }
  };
}

module.exports = {
  LIST_FILTERS,
  PROFILE_ACTIONS,
  STEP_IDS,
  isListFilter,
  canApproveOnboarding,
  canRequestChanges,
  canProfileAction,
  nextProfileStatus,
  hasOpenReviewItems,
  slugifyBase,
  buildSlugCandidate,
  buildPublishedSnapshot,
  evaluatePublicationGate,
  buildMarketplacePreview,
  validateReviewItemInput
};
