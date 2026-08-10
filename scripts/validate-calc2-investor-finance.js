#!/usr/bin/env node
/* Phase 5 — Investor finance validation + reference deals + invariants */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');
var Acq = require('../shared/calc2/investor/acquisition-costs');
var Research = require('../shared/calc2/investor/research-params');

var fails = [];
var passes = 0;
function assert(c, m) { if (!c) fails.push(m); else passes++; }
function empty() { return Scope.emptyScope(); }

function baseState(o) {
  var st = {
    goal: 'investor',
    finishProfile: 'comfort',
    procurementModel: 'separate',
    structuralRisk: 'nee',
    softCostOverrides: {},
    costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } },
    propertyProfile: {
      province: 'antwerpen', propertyType: 'rijwoning', yearBuilt: '1991_2005',
      areaM2: 100, floors: '2', condition: 'matig', epc: 'D', occupiedDuringWorks: 'nee',
      ownershipStatus: 'considering', intendedPurchasePrice: 285000
    },
    scope: empty(),
    packageDetails: {}
  };
  Object.keys(o || {}).forEach(function (k) {
    if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails' || k === 'costResolutions') {
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
    verwarming: { heatDesired: 'hybride', underfloor: 'deels', heatDhw: 'nieuw' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
    keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
    badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
    vloeren: { floorShare: 'meeste', floorMaterial: 'laminaat' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
    gevel: { facadeWork: 'isolatie', facadeElevations: '2', facadeAreaMethod: 'estimate', facadeFrontage: 7, facadeAccess: 'middel' }
  };
  return map[pkg] || {};
}

function lightReady() {
  return baseState({
    scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
    packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') }
  });
}

function fullReady(extra) {
  return baseState(Object.assign({
    propertyProfile: { yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
    scope: Object.assign(empty(), {
      dak: 'grondig', ramen: 'volledig', isolatie: 'grondig', verwarming: 'grondig',
      elektriciteit: 'volledig', keuken: 'volledig', badkamer: 'volledig',
      vloeren: 'grondig', schilderwerken: 'grondig'
    }),
    packageDetails: {
      dak: d('dak'), ramen: d('ramen'), isolatie: d('isolatie'), verwarming: d('verwarming'),
      elektriciteit: d('elektriciteit'), keuken: d('keuken'), badkamer: d('badkamer'),
      vloeren: d('vloeren'), schilderwerken: d('schilderwerken')
    }
  }, extra || {}));
}

function fpBase(over) {
  var f = FinanceEngine.emptyFinanceProfile();
  f.purchasePrice = 285000;
  f.region = 'vlaanderen';
  f.intendedUse = 'flip';
  f.buyerType = 'natural';
  f.ownerOccupierOnlyHome = false;
  f.financing = { mode: 'own_funds', loanAmount: 0, interestRate: null, holdingMonths: 6, oneTimeCosts: 0 };
  f.holding = { monthlyTotal: 200, explicitZero: false };
  f.selling = { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 500, certificatesCosts: 0 };
  f.vat = { mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21, procurementVatRate: 0.21, worksSixPercentConfirmed: false };
  f.resale = { mode: 'scenarios', conservative: 380000, expected: 410000, strong: 440000 };
  f.targetRoiPercent = 15;
  Object.keys(over || {}).forEach(function (k) {
    if (typeof over[k] === 'object' && over[k] && !Array.isArray(over[k])) {
      f[k] = Object.assign({}, f[k], over[k]);
    } else f[k] = over[k];
  });
  return f;
}

console.log('Research params documented:', Research.PARAMETERS.length);
assert(Research.PARAMETERS.length >= 8, 'research params present');
assert(Acq.REGION_RATES.vlaanderen.registrationRate === 0.12, 'FL 12%');
assert(Acq.REGION_RATES.brussel.registrationRate === 0.125, 'BXL 12.5%');
assert(Acq.REGION_RATES.wallonie.registrationRate === 0.125, 'WAL 12.5%');

/* Gate enforcement */
var blockedProj = ProjectEngine.calculateProject(baseState({
  procurementModel: 'general_contractor',
  scope: Object.assign(empty(), { keuken: 'volledig', badkamer: 'volledig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer') },
  costResolutions: {}
}));
var blockedFin = FinanceEngine.analyse(blockedProj, fpBase(), blockedProj);
assert(blockedFin.ran === false && blockedFin.blocked === true, 'gate blocks finance');
assert(blockedFin.potentialProfit == null, 'no profit when blocked');

/* Ready project */
var light = ProjectEngine.calculateProject(lightReady());
assert(light.investorReadiness.allowed === true, 'light ready: ' + JSON.stringify(light.investorReadiness.blockingItems));

var A = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { conservative: 320000, expected: 340000, strong: 360000 },
  selling: { mode: 'self', otherSellingCosts: 800 }
}), lightReady());
assert(A.ran === true, 'A runs');
assert(A.potentialProfit > 0, 'A profitable light');
assert(A.status === 'POSITIVE' || A.status === 'STRONG_POSITIVE' || A.status === 'THIN_MARGIN', 'A positive-ish');

/* Invariants on A */
assert(
  Math.abs(A.potentialProfit - (A.metrics.netResaleProceeds - A.totalInvestment)) <= 50,
  'profit = net - TI'
);
var beProfit = FinanceEngine.__testInternals().metricsForResale(
  A.stack, A.breakEvenResalePrice, { mode: 'self', otherSellingCosts: 800 }
);
assert(Math.abs(beProfit.potentialProfit) <= 150, 'break-even ≈ 0 got ' + beProfit.potentialProfit);

/* Increasing reno reduces profit */
var A2 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { expected: 340000, conservative: 320000, strong: 360000 },
  selling: { mode: 'self', otherSellingCosts: 800 },
  vat: { mode: 'user_confirmed', userVatAmount: 50000 }
}), lightReady());
assert(A2.potentialProfit < A.potentialProfit, 'higher VAT cash reduces profit');

/* Increasing purchase reduces profit */
var A3 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 280000,
  resale: { expected: 340000, conservative: 320000, strong: 360000 },
  selling: { mode: 'self', otherSellingCosts: 800 }
}), lightReady());
assert(A3.potentialProfit < A.potentialProfit, 'higher purchase reduces profit');

/* Increasing resale increases profit */
var A4 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { expected: 380000, conservative: 360000, strong: 400000 },
  selling: { mode: 'self', otherSellingCosts: 800 }
}), lightReady());
assert(A4.potentialProfit > A.potentialProfit, 'higher resale increases profit');

/* Holding period */
var A5 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { expected: 340000, conservative: 320000, strong: 360000 },
  selling: { mode: 'self', otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 18 },
  holding: { monthlyTotal: 200 }
}), lightReady());
assert(A5.potentialProfit < A.potentialProfit, 'longer hold reduces profit');

/* Selling costs reduce profit */
var A6 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { expected: 340000, conservative: 320000, strong: 360000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 }
}), lightReady());
assert(A6.potentialProfit < A.potentialProfit, 'agent fees reduce profit');

/* Reject zero purchase / resale */
var bad = FinanceEngine.analyse(light, fpBase({ purchasePrice: 0 }), lightReady());
assert(bad.blocked === true, 'zero purchase rejected');
var bad2 = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 250000,
  resale: { expected: null, conservative: null, strong: null }
}), lightReady());
assert(bad2.blocked === true, 'missing resale rejected');

/* No NaN */
assert(isFinite(A.totalInvestment) && isFinite(A.potentialProfit) && isFinite(A.projectRoiPercent), 'no NaN');

/* Negative deal */
var Neg = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 320000,
  resale: { expected: 330000, conservative: 310000, strong: 350000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1000 },
  holding: { monthlyTotal: 400 },
  financing: { mode: 'own_funds', holdingMonths: 12 }
}), lightReady());
assert(Neg.potentialProfit < 0, 'negative profit supported');
assert(Neg.status === 'NEGATIVE', 'NEGATIVE status');
assert(/verlies/i.test(Neg.statusLabel), 'loss wording');

/* Max purchase iterative */
var MaxCase = FinanceEngine.analyse(light, fpBase({
  purchasePrice: 285000,
  targetRoiPercent: 15,
  resale: { expected: 400000, conservative: 380000, strong: 420000 },
  selling: { mode: 'self', otherSellingCosts: 500 }
}), lightReady());
assert(MaxCase.maxPurchasePrice != null && MaxCase.maxPurchasePrice > 0, 'max purchase solved');
var checkFp = fpBase({
  purchasePrice: MaxCase.maxPurchasePrice,
  targetRoiPercent: 15,
  resale: { expected: 400000, conservative: 380000, strong: 420000 },
  selling: { mode: 'self', otherSellingCosts: 500 }
});
var check = FinanceEngine.analyse(light, checkFp, lightReady());
assert(Math.abs(check.projectRoiPercent - 15) < 2.0, 'max purchase ~ target ROI got ' + check.projectRoiPercent);

/* Regional acquisition */
var fl = Acq.buildAcquisitionCosts({ purchasePrice: 300000, region: 'vlaanderen' });
var bx = Acq.buildAcquisitionCosts({ purchasePrice: 300000, region: 'brussel' });
var wa = Acq.buildAcquisitionCosts({ purchasePrice: 300000, region: 'wallonie' });
assert(fl.registrationDuties.expected === 36000, 'FL reg 12%');
assert(bx.registrationDuties.expected === 37500, 'BXL reg 12.5%');
assert(wa.registrationDuties.expected === 37500, 'WAL reg 12.5%');
assert(bx.totalAcquisitionCosts.expected > fl.totalAcquisitionCosts.expected, 'BXL higher acq than FL');

/* Reference deals table */
var deals = [];

function deal(name, region, province, purchase, renoState, financeOver) {
  var st = renoState;
  st.propertyProfile = Object.assign({}, st.propertyProfile, { province: province, intendedPurchasePrice: purchase });
  var proj = ProjectEngine.calculateProject(st);
  var regionCode = Acq.regionFromProvince(province);
  var f = fpBase(Object.assign({ purchasePrice: purchase, region: regionCode }, financeOver || {}));
  var an = FinanceEngine.analyse(proj, f, st);
  deals.push({
    name: name,
    region: region,
    purchase: purchase,
    acquisition: an.ran ? an.stack.acquisition.totalAcquisitionCosts.expected : null,
    renovation: an.ran ? an.renovationInputUsed.expected : null,
    vat: an.ran ? an.stack.vat.totalVat : null,
    financeHolding: an.ran
      ? an.stack.financing.totalFinancingCosts.expected + an.stack.holding.totalHoldingCosts.expected
      : null,
    selling: an.ran ? an.metrics.sellingCosts : null,
    totalInvestment: an.ran ? an.totalInvestment : null,
    resale: an.ran ? an.resale.expected : null,
    profit: an.ran ? an.potentialProfit : null,
    roi: an.ran ? an.projectRoiPercent : null,
    breakEven: an.ran ? an.breakEvenResalePrice : null,
    maxPurchase: an.ran ? an.maxPurchasePrice : null,
    confidence: an.ran ? an.confidence.FINANCIAL_CONFIDENCE : an.status,
    status: an.status,
    ran: an.ran
  });
  return an;
}

deal('A light profitable', 'Vlaanderen', 'antwerpen', 250000, lightReady(), {
  resale: { conservative: 320000, expected: 345000, strong: 365000 },
  selling: { mode: 'self', otherSellingCosts: 600 },
  financing: { mode: 'own_funds', holdingMonths: 5 },
  holding: { monthlyTotal: 150 }
});

deal('B full moderate', 'Vlaanderen', 'oost-vlaanderen', 275000, fullReady(), {
  resale: { conservative: 520000, expected: 560000, strong: 600000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 8 },
  holding: { monthlyTotal: 250 }
});

deal('C thin margin', 'Brussel', 'brussel', 380000, lightReady(), {
  resale: { conservative: 500000, expected: 520000, strong: 540000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1200 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 300 }
});

deal('D negative', 'Wallonië', 'luik', 220000, fullReady({
  propertyProfile: { province: 'luik', yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
  costResolutions: {
    permits: { mode: 'na' },
    site_temporary: { mode: 'na' },
    epb_reporter: { mode: 'amount', amount: 1800 }
  }
}), {
  resale: { conservative: 280000, expected: 300000, strong: 320000 },
  selling: { mode: 'agent', agentRateExVat: 0.035, otherSellingCosts: 1000 },
  financing: { mode: 'own_funds', holdingMonths: 10 },
  holding: { monthlyTotal: 280 }
});

deal('E financed', 'Vlaanderen', 'antwerpen', 285000, fullReady(), {
  resale: { conservative: 520000, expected: 570000, strong: 610000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 700 },
  financing: { mode: 'mortgage', loanAmount: 200000, interestRate: 3.5, holdingMonths: 9, oneTimeCosts: 1500 },
  holding: { monthlyTotal: 220 }
});

deal('F cash', 'Vlaanderen', 'limburg', 240000, lightReady(), {
  resale: { conservative: 300000, expected: 320000, strong: 340000 },
  selling: { mode: 'self', otherSellingCosts: 400 },
  financing: { mode: 'own_funds', holdingMonths: 4 },
  holding: { monthlyTotal: 100, explicitZero: false }
});

var gcState = fullReady({
  procurementModel: 'general_contractor',
  costResolutions: {
    permits: { mode: 'na' },
    site_temporary: { mode: 'na' },
    gc_coordination: { mode: 'percent', percent: 12 }
  }
});
deal('G GC coordinated', 'Vlaanderen', 'antwerpen', 270000, gcState, {
  resale: { conservative: 500000, expected: 545000, strong: 580000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 8 },
  holding: { monthlyTotal: 250 }
});

deal('H high acq BXL', 'Brussel', 'brussel', 420000, lightReady(), {
  resale: { conservative: 500000, expected: 530000, strong: 560000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1500 },
  financing: { mode: 'own_funds', holdingMonths: 7 },
  holding: { monthlyTotal: 350 }
});

deal('I long hold', 'Wallonië', 'henegouwen', 190000, baseState({
  propertyProfile: { province: 'henegouwen', intendedPurchasePrice: 190000 },
  scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') },
  costResolutions: {
    permits: { mode: 'na' },
    site_temporary: { mode: 'na' },
    epb_reporter: { mode: 'na' }
  }
}), {
  resale: { conservative: 250000, expected: 270000, strong: 290000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 24 },
  holding: { monthlyTotal: 220 }
});

deal('J optimistic resale', 'Vlaanderen', 'antwerpen', 260000, lightReady(), {
  resale: { conservative: 340000, expected: 390000, strong: 430000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 180 }
});

deal('K conservative resale', 'Vlaanderen', 'antwerpen', 260000, lightReady(), {
  resale: { conservative: 300000, expected: 310000, strong: 320000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 180 }
});

deal('L max purchase ROI', 'Vlaanderen', 'west-vlaanderen', 300000, lightReady(), {
  targetRoiPercent: 12,
  resale: { conservative: 360000, expected: 380000, strong: 400000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 150 }
});

console.log('\n=== REFERENCE DEALS ===');
deals.forEach(function (d) {
  console.log(
    d.name + ' | ' + d.region +
    ' | P ' + d.purchase +
    ' | Acq ' + d.acquisition +
    ' | Reno ' + d.renovation +
    ' | VAT ' + d.vat +
    ' | Fin/Hold ' + d.financeHolding +
    ' | Sell ' + d.selling +
    ' | TI ' + d.totalInvestment +
    ' | Resale ' + d.resale +
    ' | Profit ' + d.profit +
    ' | ROI ' + d.roi +
    ' | BE ' + d.breakEven +
    ' | MaxP ' + d.maxPurchase +
    ' | Conf ' + d.confidence +
    ' | ' + d.status
  );
  assert(d.ran === true, d.name + ' ran');
  if (d.ran) {
    assert(isFinite(d.totalInvestment) && isFinite(d.profit), d.name + ' finite outputs');
  }
});

assert(deals.length >= 12, '12 reference deals');

/* VAT presentation */
assert(A.vatPresentation === 'INDICATIVE_MIXED_VAT', 'VAT presentation');
assert(A.assumptionLedger.some(function (x) { return x.id === 'profit_tax'; }), 'profit tax disclosure');
assert(A.confidence.RESALE_ASSUMPTION_CONFIDENCE === 'USER_ASSUMPTION_ONLY', 'resale confidence separate');

/* Sensitivity present */
assert(A.sensitivity && A.sensitivity.length >= 4, 'sensitivity incl. combined');
assert(A.sensitivity.some(function (s) { return s.id === 'combined_downside'; }), 'combined downside');
assert(/vóór eventuele belasting/i.test(A.definitions.profit), 'profit wording pre-tax');
assert(A.scenarios.strong.optimisticCombo === true, 'upside flagged optimistic');
assert(A.stack.acquisition.notaryCosts.sourceType === 'OFFICIAL_REGULATION' ||
  A.stack.acquisition.notaryCosts.ereloonExVat > 0, 'notary ereloon present');

console.log('\nPassed:', passes, 'Failed:', fails.length);
if (fails.length) {
  fails.forEach(function (f) { console.log('FAIL:', f); });
  process.exit(1);
}
console.log('CALC2 INVESTOR FINANCE VALIDATION OK');
process.exit(0);
