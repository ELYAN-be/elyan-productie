#!/usr/bin/env node
/* ============================================================
   ELYAN Calc2 — Client/server parity via shared modules
   (api/lib/pricing re-exports shared/pricing — same path as Calc1)
   ============================================================ */
'use strict';

var Adapters = require('../shared/calc2/answer-adapters');
var EngineShared = require('../shared/calc2/package-engine');
var Scope = require('../shared/calc2/scope-model');
var sharedPricing = require('../shared/pricing');
var serverPricing = require('../api/lib/pricing');

var fails = [];

function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

function stateFor(pkg, intensity) {
  var scope = Scope.emptyScope();
  scope[pkg] = intensity;
  var details = {};
  if (pkg === 'dak') {
    details.dak = {
      roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100,
      roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'mogelijk'
    };
  } else if (pkg === 'ramen') {
    details.ramen = {
      windowQtyMethod: 'count', windowCountStd: '6', windowCountLarge: '1',
      slidingCount: '0', exteriorDoorCount: '1', windowFrame: 'pvc'
    };
  } else if (pkg === 'isolatie') {
    details.isolatie = { isoFocus: 'muren', isoPerformance: 'standaard' };
  } else if (pkg === 'verwarming') {
    details.verwarming = {
      heatDesired: intensity === 'volledig' ? 'lucht_water' : 'hybride',
      underfloor: 'deels',
      heatDhw: 'nieuw'
    };
  } else if (pkg === 'elektriciteit') {
    details.elektriciteit = { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' };
  } else if (pkg === 'ventilatie') {
    details.ventilatie = { ventSystem: 'systeem_c', ventBathCount: '1', ventToiletCount: '1', ventLaundry: 'nee' };
  } else if (pkg === 'keuken') {
    details.keuken = { kitchenSize: 12, kitchenLayout: 'ja', kitchenAppliances: 'ja' };
  } else if (pkg === 'badkamer') {
    details.badkamer = { bathCount: '1', bathMainSize: 6, bathMainIntensity: intensity === 'beperkt' ? 'beperkt' : 'grondig' };
  } else if (pkg === 'vloeren') {
    details.vloeren = { floorShare: 'meeste', floorMaterial: 'laminaat' };
  } else if (pkg === 'schilderwerken') {
    details.schilderwerken = { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' };
  } else if (pkg === 'gevel') {
    details.gevel = { facadeWork: 'crepi', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 7, facadeAccess: 'middel' };
  }
  return {
    goal: 'homeowner',
    finishProfile: intensity === 'beperkt' ? 'functioneel' : intensity === 'volledig' ? 'premium' : 'comfort',
    propertyProfile: {
      province: 'antwerpen',
      propertyType: 'rijwoning',
      yearBuilt: '1971_1990',
      areaM2: 130,
      floors: '2',
      condition: 'verouderd',
      epc: 'D'
    },
    scope: scope,
    packageDetails: details
  };
}

var samples = [
  { pkg: 'dak', intensity: 'grondig' },
  { pkg: 'ramen', intensity: 'volledig' },
  { pkg: 'isolatie', intensity: 'grondig' },
  { pkg: 'verwarming', intensity: 'volledig' },
  { pkg: 'elektriciteit', intensity: 'volledig' },
  { pkg: 'ventilatie', intensity: 'grondig' },
  { pkg: 'keuken', intensity: 'volledig' },
  { pkg: 'badkamer', intensity: 'grondig' },
  { pkg: 'vloeren', intensity: 'beperkt' },
  { pkg: 'schilderwerken', intensity: 'grondig' },
  { pkg: 'gevel', intensity: 'grondig' }
];

samples.forEach(function (s) {
  var state = stateFor(s.pkg, s.intensity);
  var adapted = Adapters.adaptPackageToCalc1(s.pkg, state);
  assert(adapted.answers && adapted.province, s.pkg + ' missing adapted answers');

  var answersA = JSON.parse(JSON.stringify(adapted.answers));
  var answersB = JSON.parse(JSON.stringify(adapted.answers));
  var a = sharedPricing.calcEstimate(adapted.type, adapted.province, answersA);
  var b = serverPricing.calcEstimate(adapted.type, adapted.province, answersB);

  ['price', 'low', 'high', 'labourHours', 'totalInclVat'].forEach(function (k) {
    assert(a[k] === b[k], s.pkg + ' mismatch ' + k + ' shared=' + a[k] + ' server=' + b[k]);
  });
  assert(JSON.stringify(a.amounts) === JSON.stringify(b.amounts), s.pkg + ' amounts mismatch');

  var packaged = EngineShared.pricePackage(s.pkg, state);
  var wrapped = packaged.estimate || packaged.provisionalEstimate;
  assert(wrapped && wrapped.expected === a.price,
    s.pkg + ' package-engine diverges from Calc1');

  console.log(s.pkg, s.intensity, '→', a.price,
    packaged.status === 'OK' ? 'parity OK' : 'parity OK (' + packaged.status + ')');
});

var fullScope = Scope.emptyScope();
['dak', 'ramen', 'isolatie', 'verwarming', 'elektriciteit'].forEach(function (id) {
  fullScope[id] = 'grondig';
});
var project = EngineShared.priceActivePackages({
  finishProfile: 'comfort',
  propertyProfile: {
    province: 'oost-vlaanderen', yearBuilt: '1971_1990', areaM2: 140,
    floors: '2', condition: 'matig', epc: 'E', propertyType: 'rijwoning'
  },
  scope: fullScope,
  packageDetails: {}
}, { includeRawSum: true });

assert(project.rawPackageSum && /NOT A PROJECT ESTIMATE/.test(project.rawPackageSum.label),
  'raw sum label missing');
assert(Object.keys(project.packages).length === 5, 'expected 5 active packages');

console.log(fails.length ? 'CALC2 PARITY FAIL' : 'CALC2 PARITY OK');
fails.forEach(function (f) { console.log('FAIL:', f); });
process.exit(fails.length ? 1 : 0);
