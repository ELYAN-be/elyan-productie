#!/usr/bin/env node
/* ============================================================
   ELYAN Calc2 Phase 4 — Project engine tests + reconciliation audit
   ============================================================ */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var PackageEngine = require('../shared/calc2/package-engine');

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
    if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails') {
      st[k] = Object.assign({}, st[k], overrides[k]);
    } else st[k] = overrides[k];
  });
  return st;
}

function details(pkg, kind) {
  var map = {
    dak: {
      light: null,
      typical: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 110, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'mogelijk' },
      deep: { roofType: 'hellend', roofMaterial: 'leien', roofArea: 140, roofInsulation: 'ja', roofAccess: 'moeilijk', roofGutters: 'ja', roofAsbestos: 'mogelijk' }
    },
    ramen: {
      typical: { windowQtyMethod: 'count', windowCountStd: '6', windowCountLarge: '2', slidingCount: '1', exteriorDoorCount: '1', windowFrame: 'pvc' },
      deep: { windowQtyMethod: 'm2', windowAreaM2: 30, exteriorDoorCount: '2plus', windowFrame: 'aluminium' }
    },
    isolatie: {
      typical: { isoFocus: 'muren', isoPerformance: 'standaard' },
      deep: { isoFocus: 'muren', isoPerformance: 'hoog' },
      roof: { isoFocus: 'dak', isoPerformance: 'standaard' }
    },
    verwarming: {
      typical: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
      deep: { heatDesired: 'lucht_water', underfloor: 'ja', heatDhw: 'nieuw' }
    },
    elektriciteit: {
      typical: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' }
    },
    ventilatie: {
      deep: { ventSystem: 'systeem_d', ventBathCount: '2', ventToiletCount: '1', ventLaundry: 'ja' }
    },
    keuken: {
      light: { kitchenSize: 9, kitchenLayout: 'nee', kitchenAppliances: 'nee' },
      typical: { kitchenSize: 12, kitchenLayout: 'ja', kitchenAppliances: 'ja' }
    },
    badkamer: {
      light: { bathCount: '1', bathMainSize: 4, bathMainIntensity: 'beperkt' },
      typical: { bathCount: '1', bathMainSize: 6, bathMainIntensity: 'volledig' },
      multi: {
        bathCount: '2', bathMainSize: 7, bathMainIntensity: 'volledig',
        bathSecondarySize: 4, bathSecondaryIntensity: 'beperkt'
      }
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
      deep: { facadeWork: 'isolatie', facadeElevations: '3plus', facadeAreaMethod: 'known', facadeAreaM2: 150, facadeAccess: 'hoog' },
      exterior: { facadeWork: 'crepi', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 8, facadeAccess: 'middel' }
    }
  };
  return (map[pkg] && map[pkg][kind]) || {};
}

function audit(name, project) {
  var r = project.reconciliation;
  console.log('\n=== ' + name + ' ===');
  console.log('STATUS:', project.status, '| CONFIDENCE:', project.confidence);
  console.log('RAW PACKAGE SUM:', r.rawExpected);
  console.log('ADJUSTMENTS:');
  (r.allAdjustments || []).forEach(function (a) {
    console.log('  ', a.type, a.costClass, a.expectedAdjustment, '|', a.method, '|', a.confidence);
  });
  console.log('PROJECT COSTS expected:', project.budget.projectCostsExpected,
    '(soft', project.budget.softCostsExpected, '+ proc', project.budget.procurementCostsExpected + ')');
  console.log('ALL_IN STATUS:', project.allInStatus);
  console.log('RECONCILED WORKS:', r.reconciledExpected, '| delta vs raw', r.rawVsReconciledPct + '%');
  console.log('RESERVE:', project.budget.reserveExpected);
  console.log('RECOMMENDED BUDGET:', project.budget.recommendedExpected,
    '(range', project.budget.low, '–', project.budget.high + ')');
  return project;
}

function invariants(name, p) {
  assert(['COMPLETE', 'PARTIAL_ESTIMATE', 'EMPTY'].indexOf(p.status) !== -1, name + ' status');
  assert(Number.isFinite(p.budget.low) && Number.isFinite(p.budget.expected) && Number.isFinite(p.budget.high), name + ' finite');
  assert(!(p.budget.low !== p.budget.low), name + ' NaN');
  if (p.status !== 'EMPTY' && p.budget.expected > 0) {
    assert(p.budget.low <= p.budget.expected && p.budget.expected <= p.budget.high, name + ' band order');
  }
  assert(p.budget.reserveExpected >= 0, name + ' reserve >=0');
  assert(p.reconciliation.deductionPctOfRaw <= 30, name + ' reconciliation too aggressive: ' + p.reconciliation.deductionPctOfRaw);
  (p.reconciliation.allAdjustments || []).forEach(function (a) {
    assert(!!a.reason && !!a.method && !!a.confidence, name + ' adjustment incomplete');
    assert(a.expectedAdjustment <= 0 || a.costClass === 'scaffolding' || a.expectedAdjustment === 0, name + ' unexpected positive adj');
  });
  // suppressed packages not fully charged in reconciled path
  (p.reconciliation.scopeSuppressions || []).forEach(function (s) {
    var entry = p.rawPackages.filter(function (e) { return e.key === s.packageKey; })[0];
    if (entry && entry.adjusted) {
      assert(entry.adjusted.expected === 0, name + ' suppressed still charged: ' + s.packageKey);
    }
  });
  // NMI not silently €0 complete
  if (p.status === 'PARTIAL_ESTIMATE') {
    assert(p.budget.partial === true || p.budget.authoritative === false, name + ' partial flag');
    assert(p.warnings.some(function (w) { return w.code === 'partial_estimate'; }), name + ' partial warning');
  }
  // no arbitrary global multiplier fingerprint: reconciled should relate to raw via explicit adjustments
  var adjSum = 0;
  (p.reconciliation.allAdjustments || []).forEach(function (a) { adjSum += a.expectedAdjustment; });
  assert(Math.abs((p.reconciliation.rawExpected + adjSum) - p.reconciliation.reconciledExpected) <= 100,
    name + ' ledger identity broken');
}

/* ---- Fixtures ---- */

var A = audit('A LIGHT', ProjectEngine.calculateProject(base({
  finishProfile: 'functioneel',
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
invariants('A', A);

var B = audit('B TYPICAL 1970s', ProjectEngine.calculateProject(base({
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
invariants('B', B);
assert(B.status === 'COMPLETE', 'B complete');
assert(B.reconciliation.allAdjustments.some(function (a) {
  return a.costClass === 'kitchen_electrical' || a.costClass === 'bathroom_electrical';
}), 'B should deduct electrical components');

var C = audit('C DEEP ENERGY', ProjectEngine.calculateProject(base({
  finishProfile: 'premium',
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
invariants('C', C);
assert(C.reconciliation.scopeSuppressions.some(function (s) { return s.packageKey === 'isolatie'; }),
  'C should suppress isolatie vs gevel ETICS');
assert(C.reconciliation.allAdjustments.some(function (a) { return a.costClass === 'scaffolding'; }),
  'C scaffold MAX');

var D = audit('D MULTI-BATH', ProjectEngine.calculateProject(base({
  scope: Object.assign(emptyScope(), { badkamer: 'grondig', elektriciteit: 'volledig' }),
  packageDetails: {
    badkamer: details('badkamer', 'multi'),
    elektriciteit: details('elektriciteit', 'typical')
  }
})));
invariants('D', D);
assert(D.rawPackages.filter(function (e) { return e.packageType === 'badkamer'; }).length === 2, 'D two baths');

var E = audit('E EXTERIOR', ProjectEngine.calculateProject(base({
  scope: Object.assign(emptyScope(), {
    dak: 'grondig', ramen: 'grondig', gevel: 'grondig', isolatie: 'grondig'
  }),
  packageDetails: {
    dak: details('dak', 'typical'),
    ramen: details('ramen', 'typical'),
    gevel: details('gevel', 'exterior'),
    isolatie: details('isolatie', 'roof')
  }
})));
invariants('E', E);
// dak has insulation + isolatie dak focus → suppress isolatie
assert(E.reconciliation.scopeSuppressions.some(function (s) { return s.packageKey === 'isolatie'; }),
  'E roof iso suppression');

var Fscope = emptyScope();
Scope.WORK_PACKAGES.forEach(function (p) { Fscope[p.id] = 'weet_niet'; });
var F = audit('F UNKNOWN NMI', ProjectEngine.calculateProject(base({
  propertyProfile: { yearBuilt: 'weet_niet', areaM2: 'weet_niet', floors: 'weet_niet', condition: 'weet_niet', epc: 'weet_niet', province: 'west-vlaanderen' },
  scope: Fscope,
  packageDetails: {}
})));
invariants('F', F);
assert(F.status === 'PARTIAL_ESTIMATE', 'F partial');
assert(F.budget.worksExpected === 0, 'F no authoritative works from NMI-only');
assert(F.provisionalRiskRange, 'F provisional risk present');

var G = audit('G MINIMAL', ProjectEngine.calculateProject(base({
  scope: Object.assign(emptyScope(), { schilderwerken: 'grondig' }),
  packageDetails: { schilderwerken: details('schilderwerken', 'light') }
})));
invariants('G', G);
assert(G.status === 'COMPLETE', 'G complete');
assert((G.reconciliation.allAdjustments || []).length === 0, 'G no bogus adjustments');

var Hscope = emptyScope();
Scope.WORK_PACKAGES.forEach(function (p) { Hscope[p.id] = 'grondig'; });
var H = audit('H NEAR-COMPLETE', ProjectEngine.calculateProject(base({
  finishProfile: 'comfort',
  scope: Hscope,
  packageDetails: {
    dak: details('dak', 'typical'),
    ramen: details('ramen', 'typical'),
    isolatie: details('isolatie', 'typical'),
    verwarming: details('verwarming', 'typical'),
    elektriciteit: details('elektriciteit', 'typical'),
    ventilatie: details('ventilatie', 'deep'),
    keuken: details('keuken', 'typical'),
    badkamer: details('badkamer', 'multi'),
    vloeren: details('vloeren', 'typical'),
    schilderwerken: details('schilderwerken', 'typical'),
    gevel: details('gevel', 'exterior')
  }
})));
invariants('H', H);
assert(H.duration.expectedWeeks > 0 && H.duration.minWeeks <= H.duration.expectedWeeks, 'H duration');

/* Parity: identical input → identical output */
var B2 = ProjectEngine.calculateProject(base({
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
assert(B.budget.recommendedExpected === B2.budget.recommendedExpected, 'deterministic budget');

/* Reserve separate from works */
assert(B.budget.recommendedExpected === B.budget.worksExpected + B.budget.projectCostsExpected + B.budget.reserveExpected,
  'budget identity');
assert(B.budget.projectCostsExpected === (B.budget.softCostsExpected || 0) + (B.budget.procurementCostsExpected || 0),
  'project layer = soft + procurement');

/* Calc1 contingency not stacked: package engine estimate === calc1 price (ex contingency) */
var single = PackageEngine.pricePackage('dak', base({
  scope: Object.assign(emptyScope(), { dak: 'grondig' }),
  packageDetails: { dak: details('dak', 'typical') }
}), { includeCalc1Snapshot: true });
assert(single.calc1Meta && single.calc1Meta.contingencyIncludedInPrice === false, 'contingency not in price');
assert(single.estimate.expected === single.calc1Snapshot.price, 'estimate uses price not price+contingency');

console.log('\n=== Summary ===');
console.log('Assertions passed:', passes);
console.log('Failures:', fails.length);
fails.forEach(function (f) { console.log('FAIL:', f); });
process.exit(fails.length ? 1 : 0);
