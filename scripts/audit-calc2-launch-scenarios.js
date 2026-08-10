#!/usr/bin/env node
'use strict';
var Scope = require('../shared/calc2/scope-model');
var PE = require('../shared/calc2/project-engine');
var FE = require('../shared/calc2/investor/finance-engine');
var UiLabels = require('../shared/calc2/result-labels');

function light() {
  var scope = Scope.emptyScope();
  scope.keuken = 'volledig';
  scope.badkamer = 'volledig';
  scope.schilderwerken = 'grondig';
  return {
    goal: 'investor',
    finishProfile: 'comfort',
    procurementModel: 'separate',
    structuralRisk: 'nee',
    costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } },
    softCostOverrides: {},
    propertyProfile: {
      province: 'antwerpen', yearBuilt: '1991_2005', areaM2: 100,
      floors: '2', condition: 'matig', epc: 'D', propertyType: 'rijwoning'
    },
    scope: scope,
    packageDetails: {
      keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
      badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
      schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' }
    },
    financeProfile: null
  };
}

var st = light();
st.financeProfile = FE.emptyFinanceProfile();
st.financeProfile.purchasePrice = 320000;
st.financeProfile.region = 'vlaanderen';
st.financeProfile.financing = { mode: 'own_funds', holdingMonths: 6, oneTimeCosts: 0 };
st.financeProfile.holding = { monthlyTotal: 200 };
st.financeProfile.selling = { mode: 'self', otherSellingCosts: 500 };
st.financeProfile.vat = {
  mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21,
  procurementVatRate: 0.21, worksSixPercentConfirmed: false
};
st.financeProfile.resale = { conservative: 280000, expected: 300000, strong: 320000 };
st.financeProfile.targetRoiPercent = 15;
var p = PE.calculateProject(st);
var a = FE.analyse(p, st.financeProfile, st);
console.log('NEG', UiLabels.dealStatusLabel(a.status), a.potentialProfit, a.projectRoiPercent);

var h = light();
h.goal = 'homeowner';
h.propertyProfile.yearBuilt = 'voor_1945';
h.structuralRisk = 'weet_niet';
h.procurementModel = 'general_contractor';
['dak', 'ramen', 'isolatie', 'verwarming', 'elektriciteit', 'keuken', 'badkamer', 'gevel'].forEach(function (k) {
  h.scope[k] = 'zwaar';
  h.packageDetails[k] = {};
});
var hp = PE.calculateProject(h);
console.log(
  'HEAVY', hp.status, hp.allInStatus, hp.budget.recommendedExpected,
  'ready', hp.investorReadiness.allowed,
  (hp.investorReadiness.blockingItems || []).map(function (b) { return b.label; }).join('|')
);

var s1 = light();
s1.goal = 'homeowner';
var p1 = PE.calculateProject(s1).budget.recommendedExpected;
s1.propertyProfile.areaM2 = 180;
s1.scope.keuken = 'beperkt';
var p2 = PE.calculateProject(s1).budget.recommendedExpected;
console.log('STALE_EDIT', p1, '->', p2, 'changed', p1 !== p2);

// UI finance pass-through (no UI-side math)
console.log('FINANCE_PASS', {
  ti: a.totalInvestment,
  profit: a.potentialProfit,
  roi: a.projectRoiPercent,
  margin: a.profitMarginPercent,
  be: a.breakEvenResalePrice,
  max: a.maxPurchasePrice
});
