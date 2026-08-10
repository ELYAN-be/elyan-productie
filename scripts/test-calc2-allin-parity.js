#!/usr/bin/env node
/* Calc2 all-in parity: identical input → identical all-in budget */
'use strict';

var ProjectEngine = require('../shared/calc2/project-engine');
var Scope = require('../shared/calc2/scope-model');

function state() {
  var scope = Scope.emptyScope();
  scope.dak = 'grondig';
  scope.ramen = 'volledig';
  scope.keuken = 'volledig';
  scope.badkamer = 'volledig';
  scope.elektriciteit = 'volledig';
  scope.schilderwerken = 'grondig';
  return {
    finishProfile: 'comfort',
    procurementModel: 'general_contractor',
    structuralRisk: 'nee',
    softCostOverrides: {},
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
      ramen: {
        windowQtyMethod: 'count', windowCountStd: '5', windowCountLarge: '1',
        slidingCount: '0', exteriorDoorCount: '1', windowFrame: 'pvc'
      },
      keuken: { kitchenSize: 11, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
      badkamer: { bathCount: '1', bathMainSize: 6, bathMainIntensity: 'volledig' },
      elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
      schilderwerken: {
        paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate'
      }
    }
  };
}

var a = ProjectEngine.calculateProject(state());
var b = ProjectEngine.calculateProject(state());
var ok = a.budget.recommendedExpected === b.budget.recommendedExpected
  && a.budget.worksExpected === b.budget.worksExpected
  && a.budget.softCostsExpected === b.budget.softCostsExpected
  && a.budget.procurementCostsExpected === b.budget.procurementCostsExpected
  && a.allInStatus === b.allInStatus;

console.log('all-in A', a.budget.recommendedExpected, a.budget.worksExpected, a.budget.softCostsExpected, a.budget.procurementCostsExpected);
console.log('all-in B', b.budget.recommendedExpected, b.budget.worksExpected, b.budget.softCostsExpected, b.budget.procurementCostsExpected);
console.log(ok ? 'CALC2 ALL-IN PARITY OK' : 'CALC2 ALL-IN PARITY FAIL');
process.exit(ok ? 0 : 1);
