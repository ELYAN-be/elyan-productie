#!/usr/bin/env node
/* Phase 5.5 — Financial market audit: 20 deals + 5 independent manual cross-checks */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');
var Acq = require('../shared/calc2/investor/acquisition-costs');
var Selling = require('../shared/calc2/investor/selling-costs');
var Vat = require('../shared/calc2/investor/vat-finance');
var FinHold = require('../shared/calc2/investor/financing-holding');

var fails = [];
var passes = 0;
function assert(c, m) { if (!c) fails.push(m); else passes++; }
function empty() { return Scope.emptyScope(); }
function r50(n) { return Math.round(Number(n) / 50) * 50; }

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

function base(o) {
  var st = {
    goal: 'investor', finishProfile: 'comfort', procurementModel: 'separate', structuralRisk: 'nee',
    softCostOverrides: {},
    costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } },
    propertyProfile: {
      province: 'antwerpen', propertyType: 'rijwoning', yearBuilt: '1991_2005',
      areaM2: 100, floors: '2', condition: 'matig', epc: 'D', occupiedDuringWorks: 'nee'
    },
    scope: empty(), packageDetails: {}
  };
  Object.keys(o || {}).forEach(function (k) {
    if (k === 'propertyProfile' || k === 'scope' || k === 'packageDetails' || k === 'costResolutions') {
      st[k] = Object.assign({}, st[k], o[k]);
    } else st[k] = o[k];
  });
  return st;
}

function light(province) {
  return base({
    propertyProfile: { province: province || 'antwerpen' },
    scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
    packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') }
  });
}

function full(province, extra) {
  return base(Object.assign({
    propertyProfile: { province: province || 'antwerpen', yearBuilt: '1971_1990', condition: 'verouderd', areaM2: 120 },
    costResolutions: Object.assign({
      permits: { mode: 'na' }, site_temporary: { mode: 'na' }
    }, (province === 'luik' || province === 'henegouwen' || province === 'brussel')
      ? { epb_reporter: { mode: 'amount', amount: 1800 } } : {}),
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

function fp(over) {
  var f = FinanceEngine.emptyFinanceProfile();
  f.purchasePrice = 280000;
  f.buyerType = 'natural';
  f.intendedUse = 'flip';
  f.ownerOccupierOnlyHome = false;
  f.financing = { mode: 'own_funds', holdingMonths: 6, oneTimeCosts: 0 };
  f.holding = { monthlyTotal: 200, explicitZero: false };
  f.selling = { mode: 'self', otherSellingCosts: 500, certificatesCosts: 0 };
  f.vat = { mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21, procurementVatRate: 0.21, worksSixPercentConfirmed: false };
  f.resale = { conservative: 360000, expected: 390000, strong: 420000 };
  f.targetRoiPercent = 15;
  Object.keys(over || {}).forEach(function (k) {
    if (typeof over[k] === 'object' && over[k] && !Array.isArray(over[k])) f[k] = Object.assign({}, f[k], over[k]);
    else f[k] = over[k];
  });
  return f;
}

/* ---------- Independent manual calculator (does NOT call FinanceEngine.analyse) ---------- */
function manualDeal(opts) {
  var purchase = opts.purchase;
  var region = opts.region;
  var loan = opts.loan || 0;
  var rate = opts.rate || 0;
  var months = opts.months || 6;
  var monthlyHold = opts.monthlyHold || 0;
  var oneTime = opts.oneTime || 0;
  var reno = opts.reno; /* {works, soft, proc, reserve} excl VAT */
  var worksVat = opts.worksVat != null ? opts.worksVat : 0.21;
  var softVat = 0.21;
  var grossResale = opts.grossResale;
  var sellMode = opts.sellMode || 'self';
  var agentEx = opts.agentEx != null ? opts.agentEx : 0.03;
  var sellOther = opts.sellOther || 0;

  var regRate = region === 'vlaanderen' ? 0.12 : 0.125;
  var registration = purchase * regRate;
  var ereloon = Acq.estimateNotaryEreloon(purchase);
  var admin = 950;
  var notary = ereloon + admin + (ereloon + admin) * 0.21;
  var mortReg = loan > 0 ? loan * 0.01 : 0;
  var mortDeed = loan > 0 ? (Acq.estimateNotaryEreloon(loan) * 0.45 + 350) * 1.21 : 0;
  var acqTotal = registration + notary + mortReg + mortDeed;

  var vatWorks = reno.works * worksVat;
  var vatSoft = reno.soft * softVat;
  var vatProc = reno.proc * softVat;
  var vatRes = reno.reserve * worksVat;
  var vatTotal = vatWorks + vatSoft + vatProc + vatRes;
  var renoCash = reno.works + reno.soft + reno.proc + reno.reserve + vatTotal;

  var interest = loan > 0 && rate > 0 ? loan * (rate / 100) * (months / 12) : 0;
  var financing = interest + oneTime;
  var holding = monthlyHold * months;

  var ti = purchase + acqTotal + renoCash + financing + holding;

  var agent = sellMode === 'agent' ? grossResale * agentEx * 1.21 : 0;
  var selling = agent + sellOther;
  var net = grossResale - selling;
  var profit = net - ti;
  var roi = ti > 0 ? (profit / ti) * 100 : null;
  var margin = net > 0 ? (profit / net) * 100 : null;

  var be;
  if (sellMode === 'agent') {
    var rateIncl = agentEx * 1.21;
    be = (ti + sellOther) / (1 - rateIncl);
  } else {
    be = ti + sellOther;
  }

  return {
    registration: r50(registration),
    notary: r50(notary),
    mortgage: r50(mortReg + mortDeed),
    acqTotal: r50(acqTotal),
    vatTotal: r50(vatTotal),
    renoCash: r50(renoCash),
    financing: r50(financing),
    holding: r50(holding),
    ti: r50(ti),
    selling: r50(selling),
    net: r50(net),
    profit: r50(profit),
    roi: roi == null ? null : Math.round(roi * 10) / 10,
    margin: margin == null ? null : Math.round(margin * 10) / 10,
    breakEven: r50(be)
  };
}

/* Notary KB sanity */
var e300 = Acq.estimateNotaryEreloon(300000);
assert(e300 > 2400 && e300 < 2600, 'KB ereloon ~2478 at 300k got ' + e300);
assert(Acq.REGION_RATES.vlaanderen.registrationRate === 0.12, 'FL 12%');
assert(Acq.REGION_RATES.brussel.registrationRate === 0.125, 'BXL 12.5%');
assert(Acq.REGION_RATES.wallonie.registrationRate === 0.125, 'WAL 12.5%');

/* Company cannot get reduced rate */
var co = Acq.buildAcquisitionCosts({
  purchasePrice: 300000, region: 'vlaanderen', buyerType: 'company', ownerOccupierOnlyHome: true
});
assert(co.registrationDuties.rate === 0.12, 'company blocked from 2%');

/* Break-even algebra across modes */
function beCheck(name, stackTI, sellOpts, grossGuess) {
  var be = Selling.grossForTargetNet(stackTI, sellOpts);
  var np = Selling.netProceeds(be, sellOpts);
  var profit = np.net - stackTI;
  assert(Math.abs(profit) <= 100, name + ' BE profit≈0 got ' + profit);
}
beCheck('self', 350000, { mode: 'self', otherSellingCosts: 800 });
beCheck('agent', 350000, { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 500 });
beCheck('agent-fixed', 400000, { mode: 'agent', agentRateExVat: 0.025, otherSellingCosts: 1200, certificatesCosts: 400 });

/* Max purchase extreme */
var maxOk = FinanceEngine.__testInternals().solveMaxPurchase({
  targetRoiPercent: 10,
  grossResale: 500000,
  sellingOpts: { mode: 'self', otherSellingCosts: 500 },
  fixedOther: 80000,
  financeProfile: { region: 'vlaanderen', financing: { mode: 'own_funds' }, buyerType: 'natural' }
});
assert(maxOk.value != null && maxOk.value > 0, 'max P solvable');

var maxImp = FinanceEngine.__testInternals().solveMaxPurchase({
  targetRoiPercent: 50,
  grossResale: 200000,
  sellingOpts: { mode: 'self', otherSellingCosts: 0 },
  fixedOther: 180000,
  financeProfile: { region: 'brussel', financing: { mode: 'own_funds' }, buyerType: 'natural' }
});
assert(maxImp.impossible === true || maxImp.value == null, 'impossible max P flagged');

/* Default VAT conservative */
var vatDef = Vat.resolveVat({ worksExpected: 100000, softCostsExpected: 10000, procurementCostsExpected: 0, reserveExpected: 5000 }, { mode: 'indicative_mixed' });
assert(Math.abs(vatDef.rates.worksApplied - 0.21) < 0.001, 'default works VAT 21%');
var vat6 = Vat.resolveVat({ worksExpected: 100000, softCostsExpected: 0, procurementCostsExpected: 0, reserveExpected: 0 }, {
  mode: 'indicative_mixed', worksVatRate: 0.06, worksSixPercentConfirmed: true
});
assert(Math.abs(vat6.rates.worksApplied - 0.06) < 0.001, 'confirmed 6% applied');

/* ---------- 20 reference deals ---------- */
var deals = [];
function runDeal(name, st, financeOver) {
  var proj = ProjectEngine.calculateProject(st);
  var region = Acq.regionFromProvince(st.propertyProfile.province);
  var f = fp(Object.assign({ region: region, purchasePrice: financeOver.purchasePrice || 280000 }, financeOver));
  var an = FinanceEngine.analyse(proj, f, st);
  var ri = an.renovationInputUsed || {};
  deals.push({
    name: name,
    region: region,
    purchase: an.purchasePrice,
    acquisition: an.ran ? an.stack.acquisition.totalAcquisitionCosts.expected : null,
    works: an.ran ? an.renovationInputUsed && proj.budget.worksExpected : null,
    soft: an.ran ? proj.budget.softCostsExpected : null,
    reserve: an.ran ? proj.budget.reserveExpected : null,
    vat: an.ran ? an.stack.vat.totalVat : null,
    finance: an.ran ? an.stack.financing.totalFinancingCosts.expected : null,
    finCost: an.ran ? an.stack.financing.totalFinancingCosts.expected : null,
    holding: an.ran ? an.stack.holding.totalHoldingCosts.expected : null,
    selling: an.ran ? an.metrics.sellingCosts : null,
    ti: an.ran ? an.totalInvestment : null,
    resale: an.ran ? an.resale.expected : null,
    net: an.ran ? an.metrics.netResaleProceeds : null,
    profit: an.ran ? an.potentialProfit : null,
    roi: an.ran ? an.projectRoiPercent : null,
    margin: an.ran ? an.profitMarginPercent : null,
    be: an.ran ? an.breakEvenResalePrice : null,
    maxP: an.ran ? an.maxPurchasePrice : null,
    conf: an.ran ? an.confidence.COST_MODEL_CONFIDENCE : an.status,
    status: an.status,
    ran: an.ran,
    analysis: an,
    state: st,
    financeProfile: f,
    project: proj
  });
  assert(an.ran === true, name + ' ran');
  if (an.ran) {
    assert(isFinite(an.potentialProfit), name + ' finite profit');
    var beP = FinanceEngine.__testInternals().metricsForResale(an.stack, an.breakEvenResalePrice, f.selling);
    assert(Math.abs(beP.potentialProfit) <= 150, name + ' BE≈0 got ' + beP.potentialProfit);
  }
  return an;
}

runDeal('01 VL light cash self', light('antwerpen'), {
  purchasePrice: 250000,
  resale: { conservative: 320000, expected: 345000, strong: 365000 },
  selling: { mode: 'self', otherSellingCosts: 600 },
  financing: { mode: 'own_funds', holdingMonths: 5 },
  holding: { monthlyTotal: 150 }
});
runDeal('02 VL full agent', full('oost-vlaanderen'), {
  purchasePrice: 275000,
  resale: { conservative: 520000, expected: 560000, strong: 600000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 8 },
  holding: { monthlyTotal: 250 }
});
runDeal('03 BXL thin', light('brussel'), {
  purchasePrice: 380000,
  resale: { conservative: 500000, expected: 520000, strong: 540000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1200 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 300 }
});
runDeal('04 WAL negative full', full('luik'), {
  purchasePrice: 220000,
  resale: { conservative: 280000, expected: 300000, strong: 320000 },
  selling: { mode: 'agent', agentRateExVat: 0.035, otherSellingCosts: 1000 },
  financing: { mode: 'own_funds', holdingMonths: 10 },
  holding: { monthlyTotal: 280 }
});
runDeal('05 VL financed', full('antwerpen'), {
  purchasePrice: 285000,
  resale: { conservative: 520000, expected: 570000, strong: 610000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 700 },
  financing: { mode: 'mortgage', loanAmount: 200000, interestRate: 3.5, holdingMonths: 9, oneTimeCosts: 1500 },
  holding: { monthlyTotal: 220 }
});
runDeal('06 VL cash light', light('limburg'), {
  purchasePrice: 240000,
  resale: { conservative: 300000, expected: 320000, strong: 340000 },
  selling: { mode: 'self', otherSellingCosts: 400 },
  financing: { mode: 'own_funds', holdingMonths: 4 },
  holding: { monthlyTotal: 100 }
});
runDeal('07 VL GC', full('antwerpen', {
  procurementModel: 'general_contractor',
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' }, gc_coordination: { mode: 'percent', percent: 12 } }
}), {
  purchasePrice: 270000,
  resale: { conservative: 500000, expected: 545000, strong: 580000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 8 },
  holding: { monthlyTotal: 250 }
});
runDeal('08 BXL high acq', light('brussel'), {
  purchasePrice: 420000,
  resale: { conservative: 500000, expected: 530000, strong: 560000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1500 },
  financing: { mode: 'own_funds', holdingMonths: 7 },
  holding: { monthlyTotal: 350 }
});
runDeal('09 WAL long hold', base({
  propertyProfile: { province: 'henegouwen' },
  scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') },
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' }, epb_reporter: { mode: 'na' } }
}), {
  purchasePrice: 190000,
  resale: { conservative: 250000, expected: 270000, strong: 290000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 24 },
  holding: { monthlyTotal: 220 }
});
runDeal('10 VL optimistic resale', light('antwerpen'), {
  purchasePrice: 260000,
  resale: { conservative: 340000, expected: 390000, strong: 430000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 180 }
});
runDeal('11 VL cons resale', light('antwerpen'), {
  purchasePrice: 260000,
  resale: { conservative: 300000, expected: 310000, strong: 320000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 800 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 180 }
});
runDeal('12 VL maxP target', light('west-vlaanderen'), {
  purchasePrice: 300000,
  targetRoiPercent: 12,
  resale: { conservative: 360000, expected: 380000, strong: 400000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 150 }
});
runDeal('13 VL heavy reno', full('vlaams-brabant'), {
  purchasePrice: 310000,
  resale: { conservative: 480000, expected: 530000, strong: 570000 },
  selling: { mode: 'agent', agentRateExVat: 0.028, otherSellingCosts: 900 },
  financing: { mode: 'mixed', loanAmount: 150000, interestRate: 3.2, holdingMonths: 12, oneTimeCosts: 1200 },
  holding: { monthlyTotal: 300 }
});
runDeal('14 BXL cash high value', light('brussel'), {
  purchasePrice: 550000,
  resale: { conservative: 620000, expected: 660000, strong: 700000 },
  selling: { mode: 'agent', agentRateExVat: 0.025, otherSellingCosts: 2000 },
  financing: { mode: 'own_funds', holdingMonths: 5 },
  holding: { monthlyTotal: 400 }
});
runDeal('15 WAL cash self', base({
  propertyProfile: { province: 'namen' },
  scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') },
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' }, epb_reporter: { mode: 'na' } }
}), {
  purchasePrice: 175000,
  resale: { conservative: 230000, expected: 250000, strong: 270000 },
  selling: { mode: 'self', otherSellingCosts: 350 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 160 }
});
runDeal('16 VL unknown sell channel', light('antwerpen'), {
  purchasePrice: 255000,
  resale: { conservative: 330000, expected: 350000, strong: 370000 },
  selling: { mode: 'unknown', otherSellingCosts: 0 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 200 }
});
runDeal('17 VL 6pct VAT confirmed', light('antwerpen'), {
  purchasePrice: 250000,
  resale: { conservative: 330000, expected: 355000, strong: 375000 },
  selling: { mode: 'self', otherSellingCosts: 500 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 180 },
  vat: { mode: 'indicative_mixed', worksVatRate: 0.06, worksSixPercentConfirmed: true, softVatRate: 0.21, procurementVatRate: 0.21 }
});
runDeal('18 WAL financed light', base({
  propertyProfile: { province: 'luik' },
  scope: Object.assign(empty(), { keuken: 'beperkt', badkamer: 'beperkt', schilderwerken: 'grondig' }),
  packageDetails: { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') },
  costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' }, epb_reporter: { mode: 'na' } }
}), {
  purchasePrice: 200000,
  resale: { conservative: 260000, expected: 285000, strong: 305000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 600 },
  financing: { mode: 'mortgage', loanAmount: 140000, interestRate: 3.8, holdingMonths: 10, oneTimeCosts: 1000 },
  holding: { monthlyTotal: 190 }
});
runDeal('19 VL zero holding explicit', light('antwerpen'), {
  purchasePrice: 265000,
  resale: { conservative: 340000, expected: 360000, strong: 380000 },
  selling: { mode: 'self', otherSellingCosts: 400 },
  financing: { mode: 'own_funds', holdingMonths: 6 },
  holding: { monthlyTotal: 0, explicitZero: true }
});
runDeal('20 BXL full moderate', full('brussel'), {
  purchasePrice: 400000,
  resale: { conservative: 560000, expected: 610000, strong: 650000 },
  selling: { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 1500 },
  financing: { mode: 'own_funds', holdingMonths: 9 },
  holding: { monthlyTotal: 350 }
});

assert(deals.length >= 20, '20 deals');
assert(deals.some(function (d) { return d.status === 'NEGATIVE'; }), 'has negative');
assert(deals.some(function (d) { return d.profit > 0; }), 'has positive');

console.log('\n=== 20-DEAL AUDIT TABLE ===');
deals.forEach(function (d) {
  console.log([
    d.name, d.region, 'P' + d.purchase, 'Acq' + d.acquisition,
    'W' + d.works, 'S' + d.soft, 'R' + d.reserve, 'VAT' + d.vat,
    'Fin' + d.finCost, 'Hold' + d.holding, 'Sell' + d.selling,
    'TI' + d.ti, 'Res' + d.resale, 'Net' + d.net, 'Prof' + d.profit,
    'ROI' + d.roi, 'Mar' + d.margin, 'BE' + d.be, 'Max' + d.maxP,
    'Conf' + d.conf, d.status
  ].join(' | '));
});

/* ---------- 5 independent manual cross-checks ---------- */
console.log('\n=== MANUAL CROSS-CHECKS ===');
var crossIds = [0, 2, 4, 7, 14]; /* pick diverse */
crossIds.forEach(function (idx) {
  var d = deals[idx];
  var an = d.analysis;
  var proj = d.project;
  var f = d.financeProfile;
  var reno = {
    works: proj.budget.worksExpected,
    soft: proj.budget.softCostsExpected,
    proc: proj.budget.procurementCostsExpected,
    reserve: proj.budget.reserveExpected
  };
  var man = manualDeal({
    purchase: f.purchasePrice,
    region: Acq.regionFromProvince(d.state.propertyProfile.province),
    loan: (f.financing.loanAmount) || 0,
    rate: f.financing.interestRate || 0,
    months: f.financing.holdingMonths || 6,
    monthlyHold: f.holding.monthlyTotal || 0,
    oneTime: f.financing.oneTimeCosts || 0,
    reno: reno,
    worksVat: (f.vat.worksSixPercentConfirmed ? f.vat.worksVatRate : 0.21),
    grossResale: f.resale.expected,
    sellMode: f.selling.mode,
    agentEx: f.selling.agentRateExVat != null ? f.selling.agentRateExVat : 0.03,
    sellOther: f.selling.otherSellingCosts || 0
  });

  var engTI = an.totalInvestment;
  var engProfit = an.potentialProfit;
  var engBE = an.breakEvenResalePrice;
  var dTI = Math.abs(man.ti - engTI);
  var dProfit = Math.abs(man.profit - engProfit);
  var dBE = Math.abs(man.breakEven - engBE);

  console.log(d.name + ' MANUAL ti=' + man.ti + ' profit=' + man.profit + ' be=' + man.breakEven +
    ' | ENGINE ti=' + engTI + ' profit=' + engProfit + ' be=' + engBE +
    ' | Δti=' + dTI + ' Δprofit=' + dProfit + ' Δbe=' + dBE);

  assert(dTI <= 100, d.name + ' manual TI delta ' + dTI);
  assert(dProfit <= 100, d.name + ' manual profit delta ' + dProfit);
  assert(dBE <= 150, d.name + ' manual BE delta ' + dBE);
});

/* Combined sensitivity present on first deal */
assert(deals[0].analysis.sensitivity.some(function (s) { return s.id === 'combined_downside'; }), 'combined stress');

console.log('\nPassed:', passes, 'Failed:', fails.length);
if (fails.length) {
  fails.forEach(function (f) { console.log('FAIL:', f); });
  process.exit(1);
}
console.log('CALC2 INVESTOR FINANCE AUDIT 5.5 OK');
process.exit(0);
