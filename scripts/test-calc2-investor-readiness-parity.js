#!/usr/bin/env node
'use strict';
var ProjectEngine = require('../shared/calc2/project-engine');
var Scope = require('../shared/calc2/scope-model');

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
      floors: '2', condition: 'matig', epc: 'D', propertyType: 'rijwoning'
    },
    scope: scope,
    packageDetails: {
      keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
      badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
      schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' }
    }
  };
}
var a = ProjectEngine.calculateProject(state());
var b = ProjectEngine.calculateProject(state());
var ok = a.budget.recommendedExpected === b.budget.recommendedExpected
  && a.investorReadiness.allowed === b.investorReadiness.allowed
  && a.investorReadiness.status === b.investorReadiness.status;
console.log('IR A', a.investorReadiness.status, a.budget.recommendedExpected);
console.log('IR B', b.investorReadiness.status, b.budget.recommendedExpected);
console.log(ok ? 'CALC2 INVESTOR READINESS PARITY OK' : 'CALC2 INVESTOR READINESS PARITY FAIL');
process.exit(ok ? 0 : 1);
