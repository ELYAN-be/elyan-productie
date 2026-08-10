#!/usr/bin/env node
/* ============================================================
   ELYAN Calc2 — Adapter validation (Phase 3.5)
   ============================================================ */
'use strict';

var Adapters = require('../shared/calc2/answer-adapters');
var Engine = require('../shared/calc2/package-engine');
var Scope = require('../shared/calc2/scope-model');
var Pricing = require('../shared/pricing');

var PACKAGES = Scope.WORK_PACKAGES.map(function (p) { return p.id; });
var INTENSITIES = ['beperkt', 'grondig', 'volledig', 'weet_niet'];

var fails = [];
var passes = 0;
var remainingAssumptions = [];

function assert(cond, msg) {
  if (!cond) fails.push(msg);
  else passes++;
}

function baseState(overrides) {
  var state = {
    goal: 'homeowner',
    finishProfile: 'comfort',
    propertyProfile: {
      postcode: '9000',
      municipality: 'Gent',
      province: 'oost-vlaanderen',
      provinceDerived: true,
      propertyType: 'rijwoning',
      yearBuilt: '1971_1990',
      areaM2: 140,
      floors: '2',
      condition: 'verouderd',
      epc: 'E',
      occupiedDuringWorks: 'nee',
      ownershipStatus: 'owned'
    },
    scope: Scope.emptyScope(),
    packageDetails: {}
  };
  if (overrides) {
    Object.keys(overrides).forEach(function (k) {
      if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails') {
        state[k] = Object.assign({}, state[k], overrides[k]);
      } else {
        state[k] = overrides[k];
      }
    });
  }
  return state;
}

function detailsFor(pkg, scenario) {
  var limited = {
    dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 70, roofInsulation: 'nee', roofAccess: 'normaal', roofStructure: 'goed', roofGutters: 'nee', roofAsbestos: 'nee' },
    ramen: { windowQtyMethod: 'count', windowCountStd: '4', windowCountLarge: '0', slidingCount: '0', exteriorDoorCount: '0', windowFrame: 'pvc' },
    isolatie: { isoFocus: 'muren', isoPerformance: 'standaard' },
    verwarming: { heatDesired: 'ketel', underfloor: 'nee', heatDhw: 'behouden' },
    elektriciteit: { elecScope: 'partieel', elecBoard: 'nee', elecFitOut: 'basis' },
    ventilatie: { ventSystem: 'decentraal', ventBathCount: '1', ventToiletCount: '0', ventLaundry: 'nee', ventKitchen: 'nee' },
    keuken: { kitchenSize: 8, kitchenLayout: 'nee', kitchenAppliances: 'nee' },
    badkamer: { bathCount: '1', bathMainSize: 4, bathMainIntensity: 'beperkt' },
    vloeren: { floorShare: 'deel', floorMaterial: 'laminaat' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls', paintAreaMethod: 'estimate' },
    gevel: { facadeWork: 'reinigen', facadeElevations: '1', facadeAreaMethod: 'estimate', facadeFrontage: 6, facadeAccess: 'laag' }
  };
  var full = {
    dak: { roofType: 'hellend', roofMaterial: 'leien', roofArea: 130, roofInsulation: 'ja', roofAccess: 'moeilijk', roofStructure: 'slecht', roofGutters: 'ja', roofAsbestos: 'mogelijk' },
    ramen: { windowQtyMethod: 'm2', windowAreaM2: 28, exteriorDoorCount: '2plus', windowFrame: 'aluminium' },
    isolatie: { isoFocus: 'combi', isoPerformance: 'hoog' },
    verwarming: { heatDesired: 'lucht_water', underfloor: 'ja', heatDhw: 'nieuw' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'uitgebreid' },
    ventilatie: { ventSystem: 'systeem_d', ventBathCount: '2', ventToiletCount: '1', ventLaundry: 'ja' },
    keuken: { kitchenSize: 14, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
    badkamer: {
      bathCount: '3plus', bathMainSize: 8, bathMainIntensity: 'volledig',
      bathSecondarySize: 5, bathSecondaryIntensity: 'grondig',
      bathExtraCount: '1', bathExtraSize: 4, bathExtraIntensity: 'beperkt'
    },
    vloeren: { floorShare: 'alle', floorMaterial: 'parket' },
    schilderwerken: { paintScope: 'beide', paintInteriorSurfaces: 'whole_interior', paintAreaMethod: 'known', paintAreaM2: 320 },
    gevel: { facadeWork: 'isolatie', facadeElevations: '3plus', facadeAreaMethod: 'known', facadeAreaM2: 160, facadeAccess: 'hoog' }
  };
  var normal = {
    dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal', roofStructure: 'matig', roofGutters: 'nee', roofAsbestos: 'mogelijk' },
    ramen: { windowQtyMethod: 'count', windowCountStd: '6', windowCountLarge: '2', slidingCount: '1', exteriorDoorCount: '1', windowFrame: 'pvc' },
    isolatie: { isoFocus: 'muren', isoPerformance: 'standaard' },
    verwarming: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
    ventilatie: { ventSystem: 'systeem_c', ventBathCount: '1', ventToiletCount: '1', ventLaundry: 'nee' },
    keuken: { kitchenSize: 11, kitchenLayout: 'nee', kitchenAppliances: 'ja' },
    badkamer: { bathCount: '2', bathMainSize: 6, bathMainIntensity: 'grondig', bathSecondarySize: 4, bathSecondaryIntensity: 'beperkt' },
    vloeren: { floorShare: 'meeste', floorMaterial: 'vinyl' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
    gevel: { facadeWork: 'crepi', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 7, facadeAccess: 'middel' }
  };
  if (scenario === 'beperkt') return limited[pkg] || {};
  if (scenario === 'volledig') return full[pkg] || {};
  if (scenario === 'grondig') return normal[pkg] || {};
  return {};
}

function finishFor(scenario) {
  if (scenario === 'beperkt') return 'functioneel';
  if (scenario === 'volledig') return 'premium';
  return 'comfort';
}

console.log('=== Calc2 adapter scenarios (11 × 4) ===');
var scenarioCount = 0;

PACKAGES.forEach(function (pkg) {
  INTENSITIES.forEach(function (intensity) {
    scenarioCount++;
    var scope = Scope.emptyScope();
    scope[pkg] = intensity;
    var state = baseState({
      finishProfile: finishFor(intensity),
      scope: scope,
      packageDetails: (function () {
        var pd = {};
        pd[pkg] = detailsFor(pkg, intensity);
        return pd;
      })()
    });

    var adapted = Adapters.adaptPackageToCalc1(pkg, state);
    assert(adapted.type === Adapters.PACKAGE_TO_TYPE[pkg], pkg + '/' + intensity + ' wrong type');
    assert(Array.isArray(adapted.mappingMetadata) && adapted.mappingMetadata.length > 0, pkg + ' metadata');

    adapted.mappingMetadata.forEach(function (m) {
      assert(m.field && m.source && m.explanation, pkg + ' incomplete meta');
      assert(['direct', 'derived', 'assumed', 'unknown'].indexOf(m.source) !== -1, pkg + ' bad source');
    });

    if (intensity === 'weet_niet') {
      assert(adapted.statusHint === 'NEEDS_MORE_INFORMATION', pkg + '/weet_niet NMI');
    }

    // Material must not silently become pannen when unknown
    if (pkg === 'dak' && intensity === 'weet_niet') {
      assert(adapted.answers.material === 'onbekend' || adapted.statusHint === 'NEEDS_MORE_INFORMATION',
        'dak unknown must not force pannen as authoritative');
    }

    var result = Engine.pricePackage(pkg, state, { includeCalc1Snapshot: true });
    assert(result.status !== 'INVALID_RESULT', pkg + '/' + intensity + ' invalid');

    if (result.estimate) {
      var e = result.estimate;
      assert(Number.isFinite(e.low) && e.low >= 0 && e.low <= e.expected && e.expected <= e.high,
        pkg + '/' + intensity + ' band');
    }

    if (intensity === 'weet_niet') {
      assert(result.status === 'NEEDS_MORE_INFORMATION', pkg + ' result NMI');
      assert(!result.estimate, pkg + ' weet_niet must not have authoritative estimate');
    }

    if (adapted.answers && adapted.province) {
      var a1 = Pricing.calcEstimate(adapted.type, adapted.province, JSON.parse(JSON.stringify(adapted.answers)));
      var a2 = Pricing.calcEstimate(adapted.type, adapted.province, JSON.parse(JSON.stringify(adapted.answers)));
      assert(a1.price === a2.price, pkg + ' nondeterministic');
    }

    // Collect material assumptions on grondig scenarios for audit
    if (intensity === 'grondig') {
      adapted.mappingMetadata.forEach(function (m) {
        if (m.source === 'assumed') {
          remainingAssumptions.push({ package: pkg, field: m.field, explanation: m.explanation });
        }
      });
    }
  });
});

assert(scenarioCount >= 44, 'need ≥44 scenarios');

/* Multi-bathroom instance test */
console.log('=== Multi-bathroom instances ===');
var multiBath = baseState({
  scope: Object.assign(Scope.emptyScope(), { badkamer: 'grondig' }),
  packageDetails: {
    badkamer: {
      bathCount: '2',
      bathMainSize: 7,
      bathMainIntensity: 'volledig',
      bathSecondarySize: 4,
      bathSecondaryIntensity: 'beperkt'
    }
  }
});
var bathJobs = Adapters.listBathroomInstances(multiBath);
assert(bathJobs.length === 2, 'expected 2 bathroom instances');
var pricedBath = Engine.priceActivePackages(multiBath, { includeRawSum: true });
assert(!!pricedBath.packages['badkamer:main'], 'missing main bath instance');
assert(!!pricedBath.packages['badkamer:secondary'], 'missing secondary bath instance');
assert(pricedBath.packages['badkamer:main'].estimate.expected !== pricedBath.packages['badkamer:secondary'].estimate.expected,
  'main/secondary should differ when size/scope differ');
assert(!pricedBath.packages.badkamer, 'should not collapse to single badkamer key');

/* Roof material unknown */
var roofUnknown = baseState({
  scope: Object.assign(Scope.emptyScope(), { dak: 'grondig' }),
  packageDetails: { dak: { roofType: 'hellend', roofMaterial: 'weet_niet', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal' } }
});
var roofAd = Adapters.adaptPackageToCalc1('dak', roofUnknown);
assert(roofAd.answers.material === 'onbekend', 'unknown roof material → onbekend');
assert(roofAd.statusHint === 'NEEDS_MORE_INFORMATION', 'unknown roof material → NMI');

/* Window count derivation */
var win = baseState({
  scope: Object.assign(Scope.emptyScope(), { ramen: 'grondig' }),
  packageDetails: {
    ramen: {
      windowQtyMethod: 'count', windowCountStd: '4', windowCountLarge: '2', slidingCount: '1',
      exteriorDoorCount: '1', windowFrame: 'pvc'
    }
  }
});
var winAd = Adapters.adaptPackageToCalc1('ramen', win);
assert(winAd.answers.size === Math.round(4 * 1.5 + 2 * 3.2 + 1 * 6), 'window derived size');
assert(winAd.mappingMetadata.some(function (m) { return m.field === 'size' && m.source === 'derived'; }), 'window size derived meta');

/* Vent wet rooms */
var vent = baseState({
  scope: Object.assign(Scope.emptyScope(), { ventilatie: 'grondig' }),
  packageDetails: {
    ventilatie: { ventSystem: 'systeem_c', ventBathCount: '2', ventToiletCount: '1', ventLaundry: 'ja' }
  }
});
var ventAd = Adapters.adaptPackageToCalc1('ventilatie', vent);
assert(ventAd.answers.wetRooms === '3plus', 'wet rooms derived to 3plus');
assert(!ventAd.mappingMetadata.some(function (m) {
  return m.field === 'wetRooms' && m.source === 'assumed' && /→ 2/.test(m.explanation || '');
}), 'must not assume fixed 2 wet rooms');

/* Fixtures A–D */
console.log('=== Cross-package fixtures ===');
function fixture(name, builder) {
  var out = Engine.priceActivePackages(builder(), { includeRawSum: true });
  console.log(name + ':', Object.keys(out.packages).length, 'results | raw', out.rawPackageSum.expected,
    '| overlaps', out.projectOverlapFlags.map(function (f) { return f.code; }).filter(function (v, i, a) {
      return a.indexOf(v) === i;
    }).join(', ') || '(none)');
  return out;
}

fixture('A typical 1970s', function () {
  return baseState({
    finishProfile: 'comfort',
    propertyProfile: {
      yearBuilt: '1971_1990', areaM2: 155, floors: '2', condition: 'verouderd', epc: 'E',
      propertyType: 'halfopen', province: 'antwerpen'
    },
    scope: {
      dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', elektriciteit: 'volledig',
      verwarming: 'grondig', keuken: 'volledig', badkamer: 'volledig', vloeren: 'grondig',
      schilderwerken: 'grondig', ventilatie: 'niet_nodig', gevel: 'niet_nodig'
    },
    packageDetails: {
      dak: detailsFor('dak', 'grondig'),
      ramen: detailsFor('ramen', 'volledig'),
      isolatie: detailsFor('isolatie', 'grondig'),
      elektriciteit: detailsFor('elektriciteit', 'volledig'),
      verwarming: detailsFor('verwarming', 'grondig'),
      keuken: detailsFor('keuken', 'volledig'),
      badkamer: detailsFor('badkamer', 'volledig'),
      vloeren: detailsFor('vloeren', 'grondig'),
      schilderwerken: detailsFor('schilderwerken', 'grondig')
    }
  });
});

fixture('B light reno', function () {
  return baseState({
    finishProfile: 'functioneel',
    scope: {
      dak: 'niet_nodig', ramen: 'niet_nodig', isolatie: 'niet_nodig', verwarming: 'niet_nodig',
      elektriciteit: 'niet_nodig', ventilatie: 'niet_nodig', gevel: 'niet_nodig',
      keuken: 'beperkt', badkamer: 'beperkt', vloeren: 'beperkt', schilderwerken: 'grondig'
    },
    packageDetails: {
      keuken: detailsFor('keuken', 'beperkt'),
      badkamer: detailsFor('badkamer', 'beperkt'),
      vloeren: detailsFor('vloeren', 'beperkt'),
      schilderwerken: detailsFor('schilderwerken', 'grondig')
    }
  });
});

fixture('C deep energy', function () {
  return baseState({
    finishProfile: 'premium',
    propertyProfile: {
      yearBuilt: '1950_1970', areaM2: 170, floors: '2', condition: 'zwaar', epc: 'F',
      propertyType: 'open', province: 'vlaams-brabant'
    },
    scope: {
      dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
      ventilatie: 'volledig', gevel: 'grondig',
      elektriciteit: 'niet_nodig', keuken: 'niet_nodig', badkamer: 'niet_nodig',
      vloeren: 'niet_nodig', schilderwerken: 'niet_nodig'
    },
    packageDetails: {
      dak: detailsFor('dak', 'volledig'),
      ramen: detailsFor('ramen', 'volledig'),
      isolatie: { isoFocus: 'muren', isoPerformance: 'hoog' },
      verwarming: detailsFor('verwarming', 'volledig'),
      ventilatie: detailsFor('ventilatie', 'volledig'),
      gevel: detailsFor('gevel', 'grondig')
    }
  });
});

var fixtureD = fixture('D unknown purchase', function () {
  var scope = Scope.emptyScope();
  PACKAGES.forEach(function (id) { scope[id] = 'weet_niet'; });
  return baseState({
    finishProfile: 'comfort',
    propertyProfile: {
      yearBuilt: 'weet_niet', areaM2: 'weet_niet', floors: 'weet_niet',
      condition: 'weet_niet', epc: 'weet_niet', province: 'west-vlaanderen'
    },
    scope: scope,
    packageDetails: {}
  });
});

Object.keys(fixtureD.packages).forEach(function (id) {
  assert(fixtureD.packages[id].status === 'NEEDS_MORE_INFORMATION', 'D/' + id + ' NMI');
  assert(!fixtureD.packages[id].estimate, 'D/' + id + ' no authoritative estimate');
});
assert(fixtureD.rawPackageSum.expected === 0, 'D raw sum must be 0');

console.log('=== Remaining assumed fields (grondig baseline) ===');
remainingAssumptions.forEach(function (a) {
  console.log('-', a.package + '.' + a.field + ':', a.explanation);
});

console.log('=== Summary ===');
console.log('Scenarios:', scenarioCount);
console.log('Assertions passed:', passes);
console.log('Failures:', fails.length);
fails.forEach(function (f) { console.log('FAIL:', f); });
process.exit(fails.length ? 1 : 0);
