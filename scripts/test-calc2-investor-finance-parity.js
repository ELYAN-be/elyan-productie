#!/usr/bin/env node
'use strict';
var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');

function state() {
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
      floors: '2', condition: 'matig', epc: 'D', propertyType: 'rijwoning',
      intendedPurchasePrice: 275000
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

function finance() {
  var f = FinanceEngine.emptyFinanceProfile();
  f.purchasePrice = 275000;
  f.region = 'vlaanderen';
  f.financing = { mode: 'own_funds', holdingMonths: 6, oneTimeCosts: 0 };
  f.holding = { monthlyTotal: 200 };
  f.selling = { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 500 };
  f.vat = { mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21, procurementVatRate: 0.21, worksSixPercentConfirmed: false };
  f.resale = { conservative: 360000, expected: 390000, strong: 420000 };
  f.targetRoiPercent = 15;
  return f;
}

var st = state();
var proj = ProjectEngine.calculateProject(st);
var a = FinanceEngine.analyse(proj, finance(), st);
var b = FinanceEngine.analyse(ProjectEngine.calculateProject(state()), finance(), state());

function pick(x) {
  return {
    ti: x.totalInvestment,
    profit: x.potentialProfit,
    roi: x.projectRoiPercent,
    be: x.breakEvenResalePrice,
    max: x.maxPurchasePrice,
    vat: x.vatPresentation,
    status: x.status
  };
}

var pa = pick(a);
var pb = pick(b);
var ok = a.ran && b.ran &&
  pa.ti === pb.ti &&
  pa.profit === pb.profit &&
  pa.roi === pb.roi &&
  pa.be === pb.be &&
  pa.max === pb.max &&
  pa.vat === pb.vat &&
  pa.status === pb.status;

console.log('FINANCE A', JSON.stringify(pa));
console.log('FINANCE B', JSON.stringify(pb));
console.log(ok ? 'CALC2 INVESTOR FINANCE PARITY OK' : 'CALC2 INVESTOR FINANCE PARITY FAIL');
process.exit(ok ? 0 : 1);
