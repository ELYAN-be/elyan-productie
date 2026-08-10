#!/usr/bin/env node
/* Phase 4.5 market-audit reference runner — no Calc1 changes */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');

function empty() { return Scope.emptyScope(); }

function run(name, state) {
  var p = ProjectEngine.calculateProject(state);
  var area = Number(state.propertyProfile.areaM2) || 0;
  var works = p.budget.worksExpected;
  var budget = p.budget.recommendedExpected;
  var epm2Works = area ? Math.round(works / area) : null;
  var epm2Budget = area ? Math.round(budget / area) : null;
  console.log('\n### ' + name);
  console.log(JSON.stringify({
    status: p.status,
    confidence: p.confidence,
    areaM2: area,
    low: p.budget.low,
    expectedWorks: works,
    high: p.budget.high,
    reserve: p.budget.reserveExpected,
    recommendedBudget: budget,
    eurPerM2_works: epm2Works,
    eurPerM2_budget: epm2Budget,
    raw: p.reconciliation.rawExpected,
    reconciled: p.reconciliation.reconciledExpected,
    deltaPct: p.reconciliation.rawVsReconciledPct,
    duration: p.duration.minWeeks + '-' + p.duration.maxWeeks + 'w (exp ' + p.duration.expectedWeeks + ')',
    adjustments: (p.reconciliation.allAdjustments || []).map(function (a) {
      return { class: a.costClass, adj: a.expectedAdjustment, method: a.method, conf: a.confidence, reason: a.reason };
    }),
    suppressions: p.reconciliation.scopeSuppressions,
    partial: p.status === 'PARTIAL_ESTIMATE',
    provisional: p.provisionalRiskRange
  }, null, 2));
  return p;
}

var details = {
  dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'mogelijk' },
  ramen: { windowQtyMethod: 'count', windowCountStd: '6', windowCountLarge: '2', slidingCount: '1', exteriorDoorCount: '1', windowFrame: 'pvc' },
  isolatie_muren: { isoFocus: 'muren', isoPerformance: 'standaard' },
  isolatie_dak: { isoFocus: 'dak', isoPerformance: 'standaard' },
  verwarming: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
  verwarming_wp: { heatDesired: 'lucht_water', underfloor: 'ja', heatDhw: 'nieuw' },
  elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
  ventilatie: { ventSystem: 'systeem_d', ventBathCount: '1', ventToiletCount: '1', ventLaundry: 'nee' },
  keuken: { kitchenSize: 11, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
  keuken_light: { kitchenSize: 8, kitchenLayout: 'nee', kitchenAppliances: 'nee' },
  badkamer: { bathCount: '1', bathMainSize: 6, bathMainIntensity: 'volledig' },
  badkamer_light: { bathCount: '1', bathMainSize: 4, bathMainIntensity: 'beperkt' },
  badkamer_multi: { bathCount: '2', bathMainSize: 7, bathMainIntensity: 'volledig', bathSecondarySize: 4, bathSecondaryIntensity: 'beperkt' },
  vloeren: { floorShare: 'meeste', floorMaterial: 'laminaat' },
  vloeren_all: { floorShare: 'alle', floorMaterial: 'parket' },
  schilder: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
  schilder_full: { paintScope: 'binnen', paintInteriorSurfaces: 'whole_interior', paintAreaMethod: 'estimate' },
  gevel_etics: { facadeWork: 'isolatie', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 7, facadeAccess: 'middel' },
  gevel_crepi: { facadeWork: 'crepi', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 8, facadeAccess: 'middel' }
};

function base(area, type, year, condition, finish, scope, pd, province) {
  return {
    goal: 'homeowner',
    finishProfile: finish || 'comfort',
    propertyProfile: {
      province: province || 'antwerpen',
      propertyType: type,
      yearBuilt: year,
      areaM2: area,
      floors: type === 'appartement' ? '1' : '2',
      condition: condition,
      epc: condition === 'zwaar' ? 'F' : 'E',
      occupiedDuringWorks: 'nee'
    },
    scope: Object.assign(empty(), scope),
    packageDetails: pd
  };
}

/* 1. 90 m² apartment — light */
run('1_APT_90_LIGHT', base(90, 'appartement', '1991_2005', 'matig', 'functioneel', {
  keuken: 'beperkt', badkamer: 'beperkt', vloeren: 'beperkt', schilderwerken: 'grondig'
}, {
  keuken: details.keuken_light, badkamer: details.badkamer_light,
  vloeren: details.vloeren, schilderwerken: details.schilder
}));

/* 2. 120 m² row — standard full */
run('2_ROW_120_STANDARD', base(120, 'rijwoning', '1971_1990', 'verouderd', 'comfort', {
  dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
  elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
  vloeren: 'grondig', schilderwerken: 'grondig'
}, {
  dak: Object.assign({}, details.dak, { roofArea: 95 }),
  ramen: details.ramen, isolatie: details.isolatie_muren, verwarming: details.verwarming,
  elektriciteit: details.elektriciteit, keuken: details.keuken, badkamer: details.badkamer,
  vloeren: details.vloeren, schilderwerken: details.schilder_full
}));

/* 3. 150 m² semi — deep energy + finishing */
run('3_SEMI_150_DEEP', base(150, 'halfopen', '1950_1970', 'verouderd', 'premium', {
  dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
  ventilatie: 'volledig', gevel: 'grondig', elektriciteit: 'volledig',
  keuken: 'volledig', badkamer: 'volledig', vloeren: 'grondig', schilderwerken: 'grondig'
}, {
  dak: Object.assign({}, details.dak, { roofArea: 130, roofMaterial: 'leien', roofInsulation: 'ja', roofGutters: 'ja' }),
  ramen: details.ramen, isolatie: details.isolatie_muren, verwarming: details.verwarming_wp,
  ventilatie: details.ventilatie, gevel: details.gevel_etics, elektriciteit: details.elektriciteit,
  keuken: details.keuken, badkamer: details.badkamer, vloeren: details.vloeren_all,
  schilderwerken: details.schilder_full
}, 'vlaams-brabant'));

/* 4. 180 m² detached — heavy */
run('4_DET_180_HEAVY', base(180, 'open', 'voor_1950', 'zwaar', 'comfort', {
  dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
  ventilatie: 'volledig', gevel: 'volledig', elektriciteit: 'volledig',
  keuken: 'volledig', badkamer: 'volledig', vloeren: 'volledig', schilderwerken: 'volledig'
}, {
  dak: Object.assign({}, details.dak, { roofArea: 160, roofMaterial: 'leien', roofAccess: 'moeilijk', roofAsbestos: 'ja', roofGutters: 'ja' }),
  ramen: Object.assign({}, details.ramen, { windowQtyMethod: 'm2', windowAreaM2: 35, exteriorDoorCount: '2plus' }),
  isolatie: { isoFocus: 'combi', isoPerformance: 'hoog' },
  verwarming: details.verwarming_wp, ventilatie: details.ventilatie,
  gevel: Object.assign({}, details.gevel_etics, { facadeElevations: '3plus', facadeAccess: 'hoog', facadeAreaMethod: 'known', facadeAreaM2: 180 }),
  elektriciteit: details.elektriciteit, keuken: details.keuken,
  badkamer: details.badkamer_multi, vloeren: details.vloeren_all, schilderwerken: details.schilder_full
}, 'oost-vlaanderen'));

/* 5. 200 m² heavy unknown purchase */
var unk = empty();
Scope.WORK_PACKAGES.forEach(function (p) { unk[p.id] = 'weet_niet'; });
run('5_DET_200_UNKNOWN', {
  goal: 'investor',
  finishProfile: 'comfort',
  propertyProfile: {
    province: 'west-vlaanderen', propertyType: 'open', yearBuilt: 'weet_niet',
    areaM2: 200, floors: 'weet_niet', condition: 'weet_niet', epc: 'weet_niet',
    occupiedDuringWorks: 'weet_niet'
  },
  scope: unk,
  packageDetails: {}
});

/* Stress: exterior-only high reconciliation */
run('X_EXTERIOR_ROOF_ISO', base(140, 'rijwoning', '1971_1990', 'verouderd', 'comfort', {
  dak: 'grondig', ramen: 'grondig', gevel: 'grondig', isolatie: 'grondig'
}, {
  dak: Object.assign({}, details.dak, { roofInsulation: 'ja' }),
  ramen: details.ramen, gevel: details.gevel_crepi, isolatie: details.isolatie_dak
}));

/* Stress: deep energy facade+iso double */
run('X_DEEP_ETICS_ISO', base(160, 'open', '1950_1970', 'zwaar', 'premium', {
  dak: 'volledig', ramen: 'volledig', isolatie: 'volledig', verwarming: 'volledig',
  ventilatie: 'volledig', gevel: 'grondig'
}, {
  dak: Object.assign({}, details.dak, { roofArea: 140, roofInsulation: 'ja' }),
  ramen: details.ramen, isolatie: details.isolatie_muren, verwarming: details.verwarming_wp,
  ventilatie: details.ventilatie, gevel: details.gevel_etics
}));

/* Partial: roof unknown only amid priced packages */
run('X_PARTIAL_ROOF_NMI', base(120, 'rijwoning', '1971_1990', 'verouderd', 'comfort', {
  dak: 'weet_niet', keuken: 'volledig', badkamer: 'volledig', schilderwerken: 'grondig', vloeren: 'grondig'
}, {
  keuken: details.keuken, badkamer: details.badkamer, schilderwerken: details.schilder, vloeren: details.vloeren
}));
