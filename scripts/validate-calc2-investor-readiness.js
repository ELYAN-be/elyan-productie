#!/usr/bin/env node
/* Phase 4.7 — investor readiness validation */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var Adapters = require('../shared/calc2/answer-adapters');

var fails = [];
var passes = 0;
function assert(c, m) { if (!c) fails.push(m); else passes++; }
function empty() { return Scope.emptyScope(); }

function base(o) {
  var st = {
    goal: 'investor',
    finishProfile: 'comfort',
    procurementModel: 'separate',
    structuralRisk: 'nee',
    softCostOverrides: {},
    costResolutions: {},
    propertyProfile: {
      province: 'antwerpen', propertyType: 'rijwoning', yearBuilt: '1991_2005',
      areaM2: 100, floors: '2', condition: 'matig', epc: 'D', occupiedDuringWorks: 'nee'
    },
    scope: empty(),
    packageDetails: {}
  };
  Object.keys(o || {}).forEach(function (k) {
    if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails' || k === 'costResolutions' || k === 'softCostOverrides') {
      st[k] = Object.assign({}, st[k], o[k]);
    } else st[k] = o[k];
  });
  return st;
}

function d(pkg) {
  var map = {
    dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'nee' },
    ramen: { windowQtyMethod: 'count', windowCountStd: '5', windowCountLarge: '1', slidingCount: '0', exteriorDoorCount: '1', windowFrame: 'pvc' },
    isolatie: { isoFocus: 'muren', isoPerformance: 'standaard' },
    isolatieCombi: { isoFocus: 'combi', isoPerformance: 'standaard' },
    verwarming: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
    ventilatie: { ventSystem: 'systeem_d', ventBathCount: '1', ventToiletCount: '1', ventLaundry: 'nee' },
    keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
    badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
    vloeren: { floorShare: 'meeste', floorMaterial: 'laminaat' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
    gevel: { facadeWork: 'isolatie', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 7, facadeAccess: 'middel' }
  };
  return map[pkg] || {};
}

function report(name, p) {
  var ir = p.investorReadiness || {};
  console.log('\n=== ' + name + ' ===');
  console.log('WORKS', p.budget.worksExpected, 'SOFT', p.budget.softCostsExpected, 'PROC', p.budget.procurementCostsExpected,
    'RES', p.budget.reserveExpected, 'ALLIN', p.budget.recommendedExpected);
  console.log('STATUS', p.allInStatus, 'CONF', p.confidence, 'IR', ir.status, ir.allowed);
  console.log('BLOCK', (ir.blockingItems || []).map(function (b) { return b.id; }).join(',') || '—');
  return p;
}

/* A light known */
var A = report('A LIGHT', ProjectEngine.calculateProject(base({
  scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') },
  costResolutions: {}
})));
assert(A.investorReadiness.allowed === true || (A.investorReadiness.blockingItems || []).length <= 2, 'A nearly ready');

/* B separate full — may need permits/site depending */
var B = report('B FULL SEPARATE', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
  structuralRisk: 'nee',
  procurementModel: 'separate',
  scope: Object.assign(empty(), {
    dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
    elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
    vloeren: 'grondig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: d('dak'), ramen: d('ramen'), isolatie: d('isolatie'), verwarming: d('verwarming'),
    elektriciteit: d('elektriciteit'), keuken: d('keuken'), badkamer: d('badkamer'),
    vloeren: d('vloeren'), schilderwerken: d('schilderwerken')
  },
  costResolutions: {
    permits: { mode: 'na' },
    site_temporary: { mode: 'na' }
  }
})));
assert(B.budget.procurementCostsExpected === 0, 'B no GC auto');
assert(B.investorReadiness.allowed === true, 'B ready after N/A confirmations: ' + JSON.stringify(B.investorReadiness.blockingItems));

/* C GC unresolved */
var C = report('C GC UNRESOLVED', ProjectEngine.calculateProject(base({
  procurementModel: 'general_contractor',
  propertyProfile: { yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
  scope: Object.assign(empty(), {
    dak: 'grondig', keuken: 'volledig', badkamer: 'volledig', elektriciteit: 'volledig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: d('dak'), keuken: d('keuken'), badkamer: d('badkamer'),
    elektriciteit: d('elektriciteit'), schilderwerken: d('schilderwerken')
  },
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } }
})));
assert(C.investorReadiness.allowed === false, 'C blocked on GC');
assert((C.investorReadiness.blockingItems || []).some(function (b) { return b.id === 'gc_coordination'; }), 'C gc block');

/* D GC user entered */
var D = report('D GC USER', ProjectEngine.calculateProject(base({
  procurementModel: 'general_contractor',
  propertyProfile: { yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
  scope: Object.assign(empty(), {
    dak: 'grondig', keuken: 'volledig', badkamer: 'volledig', elektriciteit: 'volledig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: d('dak'), keuken: d('keuken'), badkamer: d('badkamer'),
    elektriciteit: d('elektriciteit'), schilderwerken: d('schilderwerken')
  },
  costResolutions: {
    gc_coordination: { mode: 'percent', percent: 12 },
    permits: { mode: 'na' },
    site_temporary: { mode: 'na' }
  }
})));
assert(D.budget.procurementCostsExpected > 0, 'D GC user % applied');
assert(D.allInCosts.procurementCosts.some(function (l) {
  return l.id === 'gc_coordination' && l.sourceType === 'USER_ASSUMPTION';
}), 'D USER_ASSUMPTION');

/* E heavy 1930 structural unknown */
var E = report('E HEAVY 1930', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: 'voor_1950', condition: 'zwaar', areaM2: 200, propertyType: 'open' },
  structuralRisk: 'weet_niet',
  procurementModel: 'separate',
  scope: Object.assign(empty(), {
    dak: 'volledig', gevel: 'volledig', ramen: 'volledig', isolatie: 'volledig',
    verwarming: 'volledig', elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig'
  }),
  packageDetails: {
    dak: d('dak'), gevel: d('gevel'), ramen: d('ramen'), isolatie: d('isolatie'),
    verwarming: d('verwarming'), elektriciteit: d('elektriciteit'),
    keuken: d('keuken'), badkamer: d('badkamer')
  }
})));
assert(E.investorReadiness.allowed === false, 'E blocked');
assert((E.investorReadiness.blockingItems || []).some(function (b) {
  return /structural|heavy/i.test(b.id + b.reason);
}), 'E structural/heavy block');

/* F NMI */
var Fs = empty();
Scope.WORK_PACKAGES.forEach(function (p) { Fs[p.id] = 'weet_niet'; });
var F = report('F NMI', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: 'weet_niet', condition: 'weet_niet', areaM2: 'weet_niet' },
  structuralRisk: 'weet_niet',
  procurementModel: 'weet_niet',
  scope: Fs
})));
assert(F.investorReadiness.allowed === false, 'F blocked');
assert(F.budget.recommendedExpected === 0, 'F zero budget');

/* G all resolved manually */
var G = report('G ALL RESOLVED', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 140 },
  structuralRisk: 'ja',
  procurementModel: 'general_contractor',
  scope: Object.assign(empty(), {
    dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
    elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
    vloeren: 'grondig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: d('dak'), ramen: d('ramen'), isolatie: d('isolatie'), verwarming: d('verwarming'),
    elektriciteit: d('elektriciteit'), keuken: d('keuken'), badkamer: d('badkamer'),
    vloeren: d('vloeren'), schilderwerken: d('schilderwerken')
  },
  costResolutions: {
    gc_coordination: { mode: 'amount', amount: 22000 },
    structural_engineer: { mode: 'amount', amount: 2800 },
    permits: { mode: 'amount', amount: 900 },
    site_temporary: { mode: 'amount', amount: 1500 }
  }
})));
assert(G.investorReadiness.allowed === true, 'G ready: ' + JSON.stringify(G.investorReadiness.blockingItems));
assert(G.investorReadiness.renovationInput && G.investorReadiness.renovationInput.financeMustResolveVat === true, 'G vat gate');

/* H combi multi-instance */
var Hjobs = Adapters.listPricingJobs(base({
  scope: Object.assign(empty(), { isolatie: 'grondig' }),
  packageDetails: { isolatie: d('isolatieCombi') }
}));
assert(Hjobs.filter(function (j) { return j.packageType === 'isolatie'; }).length === 3, 'H three iso jobs');
var H = report('H COMBI ISO', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: '1950_1970', condition: 'verouderd', areaM2: 150 },
  structuralRisk: 'nee',
  procurementModel: 'separate',
  scope: Object.assign(empty(), {
    dak: 'grondig', isolatie: 'grondig', gevel: 'grondig', ramen: 'volledig'
  }),
  packageDetails: {
    dak: d('dak'), isolatie: d('isolatieCombi'), gevel: d('gevel'), ramen: d('ramen')
  },
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } }
})));
var isoKeys = H.rawPackages.filter(function (e) { return e.packageType === 'isolatie'; }).map(function (e) { return e.key; });
assert(isoKeys.length === 3, 'H three iso packages: ' + isoKeys.join(','));
assert(H.reconciliation.scopeSuppressions.some(function (s) {
  return /isolatie/.test(s.packageKey);
}), 'H suppresses colliding iso instances');

console.log('\n=== Summary ===');
console.log('passed', passes, 'fail', fails.length);
fails.forEach(function (f) { console.log('FAIL', f); });
process.exit(fails.length ? 1 : 0);
