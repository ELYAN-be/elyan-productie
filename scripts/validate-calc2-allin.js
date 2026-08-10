#!/usr/bin/env node
/* ============================================================
   ELYAN Calc2 Phase 4.6 — All-in project cost validation
   ============================================================ */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var AllIn = require('../shared/calc2/all-in-costs');

var fails = [];
var passes = 0;

function assert(cond, msg) {
  if (!cond) fails.push(msg);
  else passes++;
}

function emptyScope() { return Scope.emptyScope(); }

function base(overrides) {
  var st = {
    goal: 'homeowner',
    finishProfile: 'comfort',
    procurementModel: null,
    structuralRisk: null,
    softCostOverrides: {},
    propertyProfile: {
      province: 'antwerpen',
      propertyType: 'rijwoning',
      yearBuilt: '1971_1990',
      areaM2: 145,
      floors: '2',
      condition: 'verouderd',
      epc: 'E',
      occupiedDuringWorks: 'nee'
    },
    scope: emptyScope(),
    packageDetails: {}
  };
  if (!overrides) return st;
  Object.keys(overrides).forEach(function (k) {
    if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails' || k === 'softCostOverrides') {
      st[k] = Object.assign({}, st[k], overrides[k]);
    } else st[k] = overrides[k];
  });
  return st;
}

function details(pkg, kind) {
  var map = {
    dak: {
      typical: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 110, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'mogelijk' },
      deep: { roofType: 'hellend', roofMaterial: 'leien', roofArea: 140, roofInsulation: 'ja', roofAccess: 'moeilijk', roofGutters: 'ja', roofAsbestos: 'ja' }
    },
    ramen: {
      typical: { windowQtyMethod: 'count', windowCountStd: '6', windowCountLarge: '2', slidingCount: '1', exteriorDoorCount: '1', windowFrame: 'pvc' },
      deep: { windowQtyMethod: 'm2', windowAreaM2: 30, exteriorDoorCount: '2plus', windowFrame: 'aluminium' }
    },
    isolatie: {
      typical: { isoFocus: 'muren', isoPerformance: 'standaard' },
      deep: { isoFocus: 'muren', isoPerformance: 'hoog' }
    },
    verwarming: {
      typical: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
      deep: { heatDesired: 'lucht_water', underfloor: 'ja', heatDhw: 'nieuw' }
    },
    elektriciteit: { typical: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' } },
    ventilatie: { deep: { ventSystem: 'systeem_d', ventBathCount: '2', ventToiletCount: '1', ventLaundry: 'ja' } },
    keuken: {
      light: { kitchenSize: 9, kitchenLayout: 'nee', kitchenAppliances: 'nee' },
      typical: { kitchenSize: 12, kitchenLayout: 'ja', kitchenAppliances: 'ja' }
    },
    badkamer: {
      light: { bathCount: '1', bathMainSize: 4, bathMainIntensity: 'beperkt' },
      typical: { bathCount: '1', bathMainSize: 6, bathMainIntensity: 'volledig' }
    },
    vloeren: {
      light: { floorShare: 'deel', floorMaterial: 'laminaat' },
      typical: { floorShare: 'meeste', floorMaterial: 'vinyl' }
    },
    schilderwerken: {
      light: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
      typical: { paintScope: 'binnen', paintInteriorSurfaces: 'whole_interior', paintAreaMethod: 'estimate' }
    },
    gevel: {
      deep: { facadeWork: 'isolatie', facadeElevations: '3plus', facadeAreaMethod: 'known', facadeAreaM2: 150, facadeAccess: 'hoog' }
    }
  };
  return (map[pkg] && map[pkg][kind]) || {};
}

function report(name, p) {
  var ai = p.allInCosts;
  console.log('\n=== ' + name + ' ===');
  console.log('STATUS packages:', p.status, '| ALL_IN:', p.allInStatus, '| CONF:', p.confidence);
  console.log('WORKS:', p.budget.worksExpected);
  console.log('SOFT:', p.budget.softCostsExpected);
  console.log('PROCUREMENT:', p.budget.procurementCostsExpected);
  console.log('RESERVE:', p.budget.reserveExpected);
  console.log('UNRESOLVED:', (ai && ai.unresolvedCosts || []).map(function (u) { return u.id; }).join(', ') || '—');
  console.log('RECOMMENDED:', p.budget.recommendedExpected, '(', p.budget.low, '–', p.budget.high, ')');
  return p;
}

function identity(name, p) {
  var sum = p.budget.worksExpected + p.budget.softCostsExpected + p.budget.procurementCostsExpected + p.budget.reserveExpected;
  assert(Math.abs(sum - p.budget.recommendedExpected) <= 100, name + ' all-in identity ' + sum + ' vs ' + p.budget.recommendedExpected);
  assert(p.allInCosts, name + ' has allInCosts');
  assert(p.vatSummary && /btw/i.test(p.vatSummary.note || ''), name + ' vat note');
  assert(['ALL_IN_COMPLETE', 'ALL_IN_INDICATIVE', 'PARTIAL_ESTIMATE', 'INSUFFICIENT_INFORMATION'].indexOf(p.allInStatus) !== -1,
    name + ' allInStatus');
}

/* A light + separate contractors */
var A = report('A LIGHT SEPARATE', ProjectEngine.calculateProject(base({
  finishProfile: 'functioneel',
  procurementModel: 'separate',
  structuralRisk: 'nee',
  propertyProfile: { yearBuilt: '1991_2005', condition: 'matig' },
  scope: Object.assign(emptyScope(), {
    keuken: 'beperkt', badkamer: 'beperkt', vloeren: 'beperkt', schilderwerken: 'grondig'
  }),
  packageDetails: {
    keuken: details('keuken', 'light'),
    badkamer: details('badkamer', 'light'),
    vloeren: details('vloeren', 'light'),
    schilderwerken: details('schilderwerken', 'light')
  }
})));
identity('A', A);
assert(A.budget.procurementCostsExpected === 0, 'A no GC markup');
assert(!(A.allInCosts.softCosts || []).some(function (l) {
  return l.id === 'architect_fees' && l.included;
}), 'A no architect on light cosmetic');

/* B standard + GC */
var B = report('B STANDARD GC', ProjectEngine.calculateProject(base({
  procurementModel: 'general_contractor',
  structuralRisk: 'nee',
  scope: Object.assign(emptyScope(), {
    dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
    elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
    vloeren: 'grondig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: details('dak', 'typical'),
    ramen: details('ramen', 'typical'),
    isolatie: details('isolatie', 'typical'),
    verwarming: details('verwarming', 'typical'),
    elektriciteit: details('elektriciteit', 'typical'),
    keuken: details('keuken', 'typical'),
    badkamer: details('badkamer', 'typical'),
    vloeren: details('vloeren', 'typical'),
    schilderwerken: details('schilderwerken', 'typical')
  }
})));
identity('B', B);
assert(B.budget.procurementCostsExpected === 0, 'B GC markup NOT auto-included (user-entered required)');
assert((B.allInCosts.unresolvedCosts || []).some(function (u) {
  return u.id === 'gc_coordination' || u.id === 'design_build_overhead';
}) || (B.allInCosts.procurementCosts || []).some(function (l) {
  return l.id === 'gc_coordination' && l.resolution === 'UNRESOLVED_MATERIAL';
}), 'B GC unresolved until user input');
assert(B.allInStatus === 'ALL_IN_INDICATIVE' || B.allInStatus === 'ALL_IN_COMPLETE', 'B all-in status');

/* C deep energy */
var C = report('C DEEP ENERGY', ProjectEngine.calculateProject(base({
  finishProfile: 'premium',
  procurementModel: 'design_build',
  structuralRisk: 'weet_niet',
  propertyProfile: { yearBuilt: '1950_1970', areaM2: 170, floors: '2', condition: 'zwaar', epc: 'F', propertyType: 'open', province: 'vlaams-brabant' },
  scope: Object.assign(emptyScope(), {
    dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
    ventilatie: 'volledig', gevel: 'grondig'
  }),
  packageDetails: {
    dak: details('dak', 'deep'),
    ramen: details('ramen', 'deep'),
    isolatie: details('isolatie', 'deep'),
    verwarming: details('verwarming', 'deep'),
    ventilatie: details('ventilatie', 'deep'),
    gevel: details('gevel', 'deep')
  }
})));
identity('C', C);
assert(C.budget.procurementCostsExpected === 0, 'C design-build NOT auto-included');
assert((C.allInCosts.unresolvedCosts || []).some(function (u) {
  return /design_build|gc_coordination/.test(u.id);
}) || (C.allInCosts.procurementCosts || []).some(function (l) {
  return !l.included && /design_build|gc_coordination/.test(l.id);
}), 'C D&B unresolved');

/* D heavy + structural */
var D = report('D HEAVY STRUCTURAL', ProjectEngine.calculateProject(base({
  procurementModel: 'general_contractor',
  structuralRisk: 'ja',
  propertyProfile: { yearBuilt: 'voor_1950', areaM2: 180, floors: '2', condition: 'zwaar', epc: 'F', propertyType: 'open', province: 'oost-vlaanderen' },
  scope: Object.assign(emptyScope(), {
    dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
    ventilatie: 'volledig', gevel: 'volledig', elektriciteit: 'volledig',
    keuken: 'volledig', badkamer: 'volledig', vloeren: 'volledig', schilderwerken: 'volledig'
  }),
  packageDetails: {
    dak: details('dak', 'deep'),
    ramen: details('ramen', 'deep'),
    isolatie: details('isolatie', 'deep'),
    verwarming: details('verwarming', 'deep'),
    ventilatie: details('ventilatie', 'deep'),
    gevel: details('gevel', 'deep'),
    elektriciteit: details('elektriciteit', 'typical'),
    keuken: details('keuken', 'typical'),
    badkamer: details('badkamer', 'typical'),
    vloeren: details('vloeren', 'typical'),
    schilderwerken: details('schilderwerken', 'typical')
  }
})));
identity('D', D);
assert((D.allInCosts.unresolvedCosts || []).some(function (u) { return u.id === 'structural_engineer'; }),
  'D structural unresolved without auto €');
assert((D.allInCosts.unresolvedCosts || []).some(function (u) { return u.id === 'permits'; }),
  'D permits unresolved');
assert(D.allInStatus === 'ALL_IN_INDICATIVE', 'D indicative due to unresolved');

/* E investor-style — no profit */
var E = report('E INVESTOR STYLE', ProjectEngine.calculateProject(base({
  goal: 'investor',
  procurementModel: 'separate',
  structuralRisk: 'nee',
  propertyProfile: { yearBuilt: '1971_1990', areaM2: 120, condition: 'verouderd', ownershipStatus: 'considering', intendedPurchasePrice: 275000 },
  scope: Object.assign(emptyScope(), {
    dak: 'grondig', keuken: 'volledig', badkamer: 'volledig', elektriciteit: 'volledig',
    vloeren: 'grondig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: details('dak', 'typical'),
    keuken: details('keuken', 'typical'),
    badkamer: details('badkamer', 'typical'),
    elektriciteit: details('elektriciteit', 'typical'),
    vloeren: details('vloeren', 'typical'),
    schilderwerken: details('schilderwerken', 'typical')
  }
})));
identity('E', E);
assert(E.budget.procurementCostsExpected === 0, 'E separate no markup');
assert(typeof E.budget.recommendedExpected === 'number', 'E budget exists without ROI fields');
assert(!E.roi && !E.profit && !E.maxPurchasePrice, 'E no investor finance fields');

/* F unknown */
var Fscope = emptyScope();
Scope.WORK_PACKAGES.forEach(function (p) { Fscope[p.id] = 'weet_niet'; });
var F = report('F UNKNOWN', ProjectEngine.calculateProject(base({
  procurementModel: 'weet_niet',
  structuralRisk: 'weet_niet',
  propertyProfile: { yearBuilt: 'weet_niet', areaM2: 'weet_niet', floors: 'weet_niet', condition: 'weet_niet', epc: 'weet_niet' },
  scope: Fscope
})));
assert(F.allInStatus === 'PARTIAL_ESTIMATE', 'F partial');
assert(F.budget.worksExpected === 0, 'F no works');
assert(F.budget.recommendedExpected === 0, 'F no false complete budget');

/* Overrides */
var Bove = ProjectEngine.calculateProject(base({
  procurementModel: 'general_contractor',
  structuralRisk: 'nee',
  softCostOverrides: { architect_fees: 12000, gc_coordination: 18000 },
  scope: Object.assign(emptyScope(), {
    dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
    elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
    vloeren: 'grondig', schilderwerken: 'grondig'
  }),
  packageDetails: {
    dak: details('dak', 'typical'),
    ramen: details('ramen', 'typical'),
    isolatie: details('isolatie', 'typical'),
    verwarming: details('verwarming', 'typical'),
    elektriciteit: details('elektriciteit', 'typical'),
    keuken: details('keuken', 'typical'),
    badkamer: details('badkamer', 'typical'),
    vloeren: details('vloeren', 'typical'),
    schilderwerken: details('schilderwerken', 'typical')
  }
}));
report('B OVERRIDE', Bove);
identity('Bove', Bove);
assert((Bove.allInCosts.softCosts || []).some(function (l) {
  return l.id === 'architect_fees' && l.userOverridden && l.expected === 12000;
}), 'architect override');
assert((Bove.allInCosts.procurementCosts || []).some(function (l) {
  return (l.id === 'gc_coordination' || l.id === 'design_build_overhead') && l.userOverridden && l.expected === 18000;
}), 'gc override');

/* Architect not applicable */
var lightNoArch = AllIn.architectApplicable({
  scope: { keuken: 'beperkt', badkamer: 'beperkt' },
  propertyProfile: { condition: 'matig' },
  structuralRisk: 'nee'
}, 2);
assert(!lightNoArch.yes, 'architect gate closed for light');

/* Safety separate multi-trade */
var saf = AllIn.safetyApplicable({ procurementModel: 'separate' }, 4);
assert(saf.yes, 'safety for separate multi-trade');

/* Mixed VAT classifications present */
assert(B.vatSummary.classifications.likely_21.length >= 1 || B.vatSummary.softCostsVat === 'likely_21',
  'vat classifications');

console.log('\n=== Summary ===');
console.log('Assertions passed:', passes);
console.log('Failures:', fails.length);
fails.forEach(function (f) { console.log('FAIL:', f); });
process.exit(fails.length ? 1 : 0);
