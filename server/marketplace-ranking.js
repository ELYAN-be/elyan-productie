/**
 * Marketplace Phase 1 — ranking + geo (Design Freeze V3 §12).
 * Deterministic, unit-testable. No sponsored ranking.
 */
'use strict';

var Draft = require('../js/professionals/onboarding-draft');

function provinceById(id) {
  var list = Draft.PROVINCES || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

/**
 * Geo fit G ∈ [0,1] per freeze table.
 * searchLoc: { gemeente?, provincieId?, gewestId? }
 * area: service_area from draft OR derived flags on snapshot meta
 * coverage: { mode, provinces[], regions[], radiusKm?, coversGemeente?, coversProvincie?, coversGewest? }
 */
function geoFit(searchLoc, coverage) {
  coverage = coverage || {};
  searchLoc = searchLoc || {};
  var mode = coverage.mode || '';

  if (coverage.coversGemeente === true) return 1.0;
  if (mode === 'radius' && coverage.radiusContainsSearch === true) {
    var r = coverage.radiusKm != null ? Number(coverage.radiusKm) : null;
    if (r != null && r > 75 && coverage.coversGemeente !== true) return Math.min(0.45, 0.45);
    return 1.0;
  }

  if (mode === 'heel_belgie') return 0.35;

  if (mode === 'radius' && coverage.radiusKm != null && Number(coverage.radiusKm) > 75) {
    if (coverage.coversGemeente !== true) return 0.45;
  }

  var searchProv = searchLoc.provincieId || null;
  var searchGewest = searchLoc.gewestId || null;

  if (mode === 'provincies') {
    var provs = coverage.provinces || [];
    if (searchProv && provs.indexOf(searchProv) >= 0) {
      return coverage.coversGemeente ? 1.0 : 0.75;
    }
    return 0.0;
  }

  if (mode === 'gewest') {
    var regions = coverage.regions || [];
    if (searchGewest && regions.indexOf(searchGewest) >= 0) {
      if (coverage.coversGemeente) return 1.0;
      if (coverage.coversProvincie) return 0.75;
      return 0.5;
    }
    return 0.0;
  }

  if (coverage.coversProvincie === true) return 0.75;
  if (coverage.coversGewest === true) return 0.5;

  return 0.0;
}

function categoryFit(primaryCategoryId, searchCategoryId) {
  return primaryCategoryId && searchCategoryId && primaryCategoryId === searchCategoryId ? 1 : 0;
}

function serviceFit(partnerServiceIds, filterServiceIds) {
  var filter = filterServiceIds || [];
  if (!filter.length) return 1;
  var set = partnerServiceIds || [];
  if (!set.length) return 0;
  var inter = 0;
  filter.forEach(function (id) {
    if (set.indexOf(id) >= 0) inter += 1;
  });
  var union = {};
  filter.forEach(function (id) {
    union[id] = true;
  });
  set.forEach(function (id) {
    union[id] = true;
  });
  var u = Object.keys(union).length;
  return u ? inter / u : 0;
}

function availabilityScore(capacityId) {
  if (capacityId === 'available') return 1.0;
  if (capacityId === 'limited') return 0.6;
  if (capacityId === 'full') return 0.25;
  return 0.5;
}

/**
 * Quality Q capped per freeze.
 * opts: { photoCount, hasPriceOrOnRequest, hasStoryCore }
 */
function qualityScore(opts) {
  opts = opts || {};
  var photos = Math.min(opts.photoCount || 0, 4);
  var q =
    0.4 +
    0.1 * photos +
    (opts.hasPriceOrOnRequest ? 0.2 : 0) +
    (opts.hasStoryCore ? 0.2 : 0);
  return Math.min(1, q);
}

function relevanceScore(parts) {
  var C = parts.categoryFit != null ? parts.categoryFit : 0;
  var S = parts.serviceFit != null ? parts.serviceFit : 0;
  var G = parts.geoFit != null ? parts.geoFit : 0;
  var A = parts.availability != null ? parts.availability : 0;
  var Q = parts.quality != null ? parts.quality : 0;
  var V = parts.verified != null ? parts.verified : 1;
  return 0.3 * C + 0.2 * S + 0.25 * G + 0.1 * A + 0.1 * Q + 0.05 * V;
}

/**
 * Apply stale availability penalty (V3 §14.3): multiply A by 0.7 if stale.
 */
function applyStaleAvailability(A, isStale) {
  return isStale ? A * 0.7 : A;
}

/**
 * Cold-start exploration: when pool < 20, reserve up to 20% of page-1 (min 1)
 * for partners published within 45 days.
 */
function applyColdStartExploration(ranked, opts) {
  opts = opts || {};
  var pageSize = opts.pageSize || 12;
  var poolSize = ranked.length;
  if (poolSize >= 20) return ranked;

  var reserve = Math.max(1, Math.floor(pageSize * 0.2));
  var cutoff = opts.nowMs != null ? opts.nowMs : Date.now();
  var windowMs = 45 * 24 * 60 * 60 * 1000;

  var recent = [];
  var rest = [];
  ranked.forEach(function (row) {
    var pub = row.publishedAtMs != null ? row.publishedAtMs : 0;
    if (pub && cutoff - pub <= windowMs) recent.push(row);
    else rest.push(row);
  });

  recent.sort(function (a, b) {
    return b.score - a.score;
  });
  rest.sort(function (a, b) {
    return b.score - a.score;
  });

  var out = [];
  var takeRecent = Math.min(reserve, recent.length, pageSize);
  for (var i = 0; i < takeRecent; i++) out.push(recent[i]);

  var recentIds = {};
  out.forEach(function (r) {
    recentIds[r.slug] = true;
  });

  for (var j = 0; j < rest.length && out.length < ranked.length; j++) {
    if (!recentIds[rest[j].slug]) out.push(rest[j]);
  }
  // append remaining recent not taken
  for (var k = takeRecent; k < recent.length; k++) {
    if (!recentIds[recent[k].slug]) out.push(recent[k]);
  }
  return out;
}

function buildCoverageFromDraftArea(area, searchLoc) {
  area = area || {};
  searchLoc = searchLoc || {};
  var mode = area.mode || '';
  var provinces = Array.isArray(area.provinces) ? area.provinces : [];
  var regions = Array.isArray(area.regions) ? area.regions : [];
  var radiusKm = area.radius_km != null ? Number(area.radius_km) : null;

  var coversProvincie =
    mode === 'provincies' && searchLoc.provincieId
      ? provinces.indexOf(searchLoc.provincieId) >= 0
      : false;
  var coversGewest =
    mode === 'gewest' && searchLoc.gewestId
      ? regions.indexOf(searchLoc.gewestId) >= 0
      : false;
  // Gemeente-level exact match requires gazetteer; Phase 1 uses partner gemeente string compare
  var coversGemeente = false;
  if (searchLoc.gemeente && area._partnerGemeente) {
    coversGemeente =
      String(searchLoc.gemeente).toLowerCase() === String(area._partnerGemeente).toLowerCase() &&
      (mode === 'radius' || coversProvincie || coversGewest || mode === 'heel_belgie');
  }

  return {
    mode: mode,
    provinces: provinces,
    regions: regions,
    radiusKm: radiusKm,
    coversGemeente: coversGemeente,
    coversProvincie: coversProvincie,
    coversGewest: coversGewest,
    radiusContainsSearch: coversGemeente && mode === 'radius'
  };
}

module.exports = {
  geoFit: geoFit,
  categoryFit: categoryFit,
  serviceFit: serviceFit,
  availabilityScore: availabilityScore,
  qualityScore: qualityScore,
  relevanceScore: relevanceScore,
  applyStaleAvailability: applyStaleAvailability,
  applyColdStartExploration: applyColdStartExploration,
  buildCoverageFromDraftArea: buildCoverageFromDraftArea,
  provinceById: provinceById
};
