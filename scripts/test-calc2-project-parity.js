#!/usr/bin/env node
/* Calc2 project-engine parity: shared modules only (same path client/server) */
'use strict';

var ProjectEngine = require('../shared/calc2/project-engine');
var Scope = require('../shared/calc2/scope-model');

function state() {
  var scope = Scope.emptyScope();
  scope.dak = 'grondig';
  scope.gevel = 'grondig';
  scope.ramen = 'grondig';
  return {
    finishProfile: 'comfort',
    propertyProfile: {
      province: 'oost-vlaanderen', yearBuilt: '1971_1990', areaM2: 140,
      floors: '2', condition: 'matig', epc: 'E', propertyType: 'rijwoning'
    },
    scope: scope,
    packageDetails: {
      dak: {
        roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100,
        roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'mogelijk'
      },
      gevel: {
        facadeWork: 'crepi', facadeElevations: '2', facadeAreaMethod: 'estimate',
        facadeFrontage: 7, facadeAccess: 'middel'
      },
      ramen: {
        windowQtyMethod: 'count', windowCountStd: '5', windowCountLarge: '1',
        slidingCount: '0', exteriorDoorCount: '1', windowFrame: 'pvc'
      }
    }
  };
}

var a = ProjectEngine.calculateProject(state());
var b = ProjectEngine.calculateProject(state());
var ok = a.budget.recommendedExpected === b.budget.recommendedExpected
  && a.reconciliation.reconciledExpected === b.reconciliation.reconciledExpected
  && a.status === b.status;

console.log('project A', a.budget.recommendedExpected, a.reconciliation.reconciledExpected);
console.log('project B', b.budget.recommendedExpected, b.reconciliation.reconciledExpected);
console.log(ok ? 'CALC2 PROJECT PARITY OK' : 'CALC2 PROJECT PARITY FAIL');
process.exit(ok ? 0 : 1);
