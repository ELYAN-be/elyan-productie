/**
 * Marketplace Phase 1 — public read service (Design Freeze V3).
 * Fail closed: no PublicSnapshot ⇒ not public.
 */
'use strict';

var { createAdminClient } = require('./supabase');
var CI = require('../shared/vakmannen/intelligence');
var { toPublicCard, assertNoLeaks } = require('./public-snapshot');
var {
  geoFit,
  categoryFit,
  serviceFit,
  availabilityScore,
  qualityScore,
  relevanceScore,
  applyStaleAvailability,
  applyColdStartExploration,
  buildCoverageFromDraftArea
} = require('./marketplace-ranking');
var { normalizeLocation } = require('./marketplace-location');

var PROBLEMS = [
  { id: 'leak_roof', label: 'Lekkage of beschadigd dak', categoryId: 'dakwerken' },
  { id: 'new_roof', label: 'Dak renoveren of vernieuwen', categoryId: 'dakwerken' },
  { id: 'bathroom', label: 'Badkamer renoveren', categoryId: 'badkamer' },
  { id: 'kitchen', label: 'Keuken plaatsen of vernieuwen', categoryId: 'keuken' },
  { id: 'windows', label: 'Ramen of deuren vervangen', categoryId: 'ramen-deuren' },
  { id: 'insulation', label: 'Woning isoleren', categoryId: 'isolatie' },
  { id: 'heating', label: 'Verwarming of warmtepomp', categoryId: 'verwarming' },
  { id: 'electrical', label: 'Elektriciteit keuren of vernieuwen', categoryId: 'elektriciteit' },
  { id: 'facade', label: 'Gevel renoveren of isoleren', categoryId: 'gevel' },
  { id: 'floors', label: 'Vloer plaatsen of vernieuwen', categoryId: 'vloeren' },
  { id: 'painting', label: 'Schilderwerken binnen/buiten', categoryId: 'schilderwerken' },
  { id: 'ventilation', label: 'Ventilatie plaatsen', categoryId: 'ventilatie' },
  { id: 'solar', label: 'Zonnepanelen', categoryId: 'zonnepanelen' }
];

var SORTS = ['relevance', 'distance', 'newest'];
var DEFAULT_PAGE_SIZE = 12;
var MAX_PAGE_SIZE = 24;

/** Schema not ready (migration pending). Never expose DB details to clients. */
function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /public_snapshot/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('public_api_migration_needed', 'public_snapshot');
    return 'missing_env';
  }
  return null;
}

function engine() {
  return CI.PartnerOnboardingEngine || CI;
}

function listCategories() {
  var cats = engine().listCategories ? engine().listCategories() : [];
  return cats.map(function (c) {
    return {
      id: c.id,
      label: c.label,
      plural: c.plural || c.label
    };
  });
}

function listProblems() {
  return PROBLEMS.slice();
}

function isPubliclyVisible(partner, profile) {
  if (!partner || !profile) return false;
  if (partner.account_status !== 'active') return false;
  if (profile.profile_status !== 'published') return false;
  var snap = profile.public_snapshot;
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return false;
  if (!snap.slug || !snap.displayName || !snap.publicSnapshotVersion) return false;
  var leaks = assertNoLeaks(snap);
  if (leaks.length) return false;
  return true;
}

async function getProfessionalBySlug(slug) {
  slug = slug ? String(slug).trim().toLowerCase() : '';
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, code: 'not_found' };
  }

  var admin = createAdminClient();
  var { data: profile, error } = await admin
    .from('partner_profiles')
    .select('partner_id, profile_status, slug, public_snapshot, public_snapshot_version, published_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    var schemaCode = schemaFailureCode(error);
    if (schemaCode) return { ok: false, code: schemaCode };
    console.error('public_profile_lookup_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!profile) return { ok: false, code: 'not_found' };

  var { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, account_status')
    .eq('id', profile.partner_id)
    .maybeSingle();
  if (pErr) {
    console.error('public_partner_lookup_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }

  if (!isPubliclyVisible(partner, profile)) {
    return { ok: false, code: 'not_found' };
  }

  return { ok: true, professional: profile.public_snapshot };
}

function parsePage(q) {
  var page = parseInt(q.page, 10);
  if (!isFinite(page) || page < 1) page = 1;
  var pageSize = parseInt(q.pageSize, 10);
  if (!isFinite(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
  return { page: page, pageSize: pageSize };
}

function parseDiensten(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return String(raw)
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

/**
 * Search published professionals. Category required.
 */
async function searchProfessionals(query) {
  query = query || {};
  var category = query.category ? String(query.category).trim() : '';
  if (!category) return { ok: false, code: 'category_required' };
  if (!engine().getCategory(category)) {
    return { ok: false, code: 'not_found' };
  }

  var sort = query.sort ? String(query.sort) : 'relevance';
  if (SORTS.indexOf(sort) < 0) return { ok: false, code: 'validation_error' };

  var availability = query.availability ? String(query.availability).trim() : '';
  var allowedAvail = ['', 'all', 'available', 'limited', 'full'];
  if (availability && allowedAvail.indexOf(availability) < 0) {
    return { ok: false, code: 'validation_error' };
  }

  var includeUnpriced = query.includeUnpriced === true || query.includeUnpriced === 'true' || query.includeUnpriced == null;

  var locNorm = normalizeLocation({
    postcode: query.postcode,
    gemeente: query.gemeente
  });
  if (!locNorm.ok) return locNorm;
  var searchLoc = locNorm.location;

  var diensten = parseDiensten(query.dienst || query.diensten);
  var paging = parsePage(query);

  var admin = createAdminClient();
  var { data: rows, error } = await admin
    .from('partner_profiles')
    .select(
      'partner_id, profile_status, slug, public_snapshot, public_snapshot_version, published_at, primary_category_id'
    )
    .eq('profile_status', 'published')
    .eq('primary_category_id', category);

  if (error) {
    var searchSchemaCode = schemaFailureCode(error);
    if (searchSchemaCode) return { ok: false, code: searchSchemaCode };
    console.error('public_search_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var partnerIds = (rows || []).map(function (r) {
    return r.partner_id;
  });
  var partnersById = {};
  if (partnerIds.length) {
    var { data: partners, error: pErr } = await admin
      .from('partners')
      .select('id, account_status')
      .in('id', partnerIds);
    if (pErr) {
      console.error('public_search_partners_failed', pErr.message);
      return { ok: false, code: 'server_error' };
    }
    (partners || []).forEach(function (p) {
      partnersById[p.id] = p;
    });
  }

  // Need draft service_area for geo — load onboarding for candidates only
  var onboardingByPartner = {};
  if (partnerIds.length) {
    var { data: onbs, error: oErr } = await admin
      .from('partner_onboarding')
      .select('partner_id, draft')
      .in('partner_id', partnerIds);
    if (oErr) {
      console.error('public_search_onboarding_failed', oErr.message);
      return { ok: false, code: 'server_error' };
    }
    (onbs || []).forEach(function (o) {
      onboardingByPartner[o.partner_id] = o;
    });
  }

  var now = Date.now();
  var staleMs = 60 * 24 * 60 * 60 * 1000;
  var ranked = [];

  (rows || []).forEach(function (row) {
    var partner = partnersById[row.partner_id];
    if (!isPubliclyVisible(partner, row)) return;
    var snap = row.public_snapshot;
    if (snap.primaryCategoryId !== category) return;

    var draft = (onboardingByPartner[row.partner_id] && onboardingByPartner[row.partner_id].draft) || {};
    var area = (draft.service_area && typeof draft.service_area === 'object' ? draft.service_area : {}) || {};
    var company = (draft.company && typeof draft.company === 'object' ? draft.company : {}) || {};
    area._partnerGemeente = company.gemeente || (snap.location && snap.location.gemeente) || null;

    var coverage = buildCoverageFromDraftArea(area, searchLoc || {});
    var G = searchLoc ? geoFit(searchLoc, coverage) : 1;
    if (searchLoc && G === 0) return;

    var serviceIds = (snap.services || []).map(function (s) {
      return s.id;
    });
    if (diensten.length) {
      var hit = diensten.some(function (d) {
        return serviceIds.indexOf(d) >= 0;
      });
      if (!hit) return;
    }

    var capacityId = 'limited';
    if (snap.availability && snap.availability.capacityLabel === 'Nieuwe projecten mogelijk') {
      capacityId = 'available';
    } else if (snap.availability && snap.availability.capacityLabel === 'Momenteel volzet') {
      capacityId = 'full';
    }
    if (availability && availability !== 'all' && availability !== capacityId) return;

    var hasPriced = (snap.pricing || []).some(function (p) {
      return p.model && p.model !== 'on_request';
    });
    var hasOnRequest = (snap.pricing || []).some(function (p) {
      return p.model === 'on_request';
    });
    if (!includeUnpriced && !hasPriced) return;

    var story = snap.story || {};
    var hasStoryCore = !!(story.strength && story.prefer);
    var A = applyStaleAvailability(
      availabilityScore(capacityId),
      row.published_at && now - new Date(row.published_at).getTime() > staleMs
    );
    var Q = qualityScore({
      photoCount: (snap.assets || []).length,
      hasPriceOrOnRequest: hasPriced || hasOnRequest,
      hasStoryCore: hasStoryCore
    });
    var score = relevanceScore({
      categoryFit: categoryFit(snap.primaryCategoryId, category),
      serviceFit: serviceFit(serviceIds, diensten),
      geoFit: G,
      availability: A,
      quality: Q,
      verified: 1
    });

    ranked.push({
      slug: snap.slug,
      score: score,
      geoFit: G,
      publishedAtMs: row.published_at ? new Date(row.published_at).getTime() : 0,
      card: toPublicCard(snap),
      capacityId: capacityId
    });
  });

  if (sort === 'newest') {
    ranked.sort(function (a, b) {
      return b.publishedAtMs - a.publishedAtMs;
    });
  } else if (sort === 'distance') {
    ranked.sort(function (a, b) {
      if (b.geoFit !== a.geoFit) return b.geoFit - a.geoFit;
      return b.score - a.score;
    });
  } else {
    ranked.sort(function (a, b) {
      return b.score - a.score;
    });
    ranked = applyColdStartExploration(ranked, {
      pageSize: paging.pageSize,
      nowMs: now
    });
  }

  var total = ranked.length;
  var start = (paging.page - 1) * paging.pageSize;
  var slice = ranked.slice(start, start + paging.pageSize);
  var results = slice.map(function (r) {
    return r.card;
  });

  var zeroResultsHints = null;
  if (total === 0) {
    zeroResultsHints = {
      message: 'Geen vakbedrijven gevonden',
      suggestBroaderRegion: true
    };
  }

  return {
    ok: true,
    page: paging.page,
    pageSize: paging.pageSize,
    total: total,
    results: results,
    zeroResultsHints: zeroResultsHints
  };
}

module.exports = {
  PROBLEMS: PROBLEMS,
  SORTS: SORTS,
  DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: MAX_PAGE_SIZE,
  listCategories: listCategories,
  listProblems: listProblems,
  getProfessionalBySlug: getProfessionalBySlug,
  searchProfessionals: searchProfessionals,
  isPubliclyVisible: isPubliclyVisible
};
