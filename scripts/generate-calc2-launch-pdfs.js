#!/usr/bin/env node
/* Phase 6.5 — generate representative Calc2 PDFs for visual QA */
'use strict';

var fs = require('fs');
var path = require('path');
var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');
var build = require('../api/lib/pdf-project-report').buildProjectReportPdf;

var OUT = path.join(__dirname, '..', 'tmp-pdf-qa');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function empty() { return Scope.emptyScope(); }
function d(pkg) {
  var map = {
    keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
    badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
    dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'nee' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' },
    ramen: { windowQtyMethod: 'count', windowCountStd: '8', windowCountLarge: '0', slidingCount: '0', exteriorDoorCount: '1', windowFrame: 'pvc' },
    isolatie: { insulationAreas: ['dak', 'spouw'], insulationMethod: 'estimate' },
    verwarming: { heatSystem: 'warmtepomp', heatEmitters: 'bestaand' },
    gevel: { facadeWork: 'crepi', facadeArea: 120 },
    vloeren: { floorArea: 80, floorType: 'laminaat' }
  };
  return map[pkg] || {};
}

function base(goal) {
  return {
    goal: goal,
    finishProfile: 'comfort',
    procurementModel: 'separate',
    structuralRisk: 'nee',
    costResolutions: {
      permits: { mode: 'na' },
      site_temporary: { mode: 'na' },
      asbestos_study: { mode: 'na' },
      safety_coordinator: { mode: 'na' }
    },
    softCostOverrides: {},
    propertyProfile: {
      province: 'antwerpen', yearBuilt: '1971_1990', areaM2: 120,
      floors: '2', condition: 'matig', epc: 'D', propertyType: 'rijwoning'
    },
    scope: empty(),
    packageDetails: {},
    financeProfile: null
  };
}

function financeReady(st) {
  st.financeProfile = FinanceEngine.emptyFinanceProfile();
  st.financeProfile.purchasePrice = 250000;
  st.financeProfile.region = 'vlaanderen';
  st.financeProfile.financing = { mode: 'own_funds', holdingMonths: 6, oneTimeCosts: 0 };
  st.financeProfile.holding = { monthlyTotal: 200, explicitZero: false };
  st.financeProfile.selling = { mode: 'self', otherSellingCosts: 500 };
  st.financeProfile.vat = {
    mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21,
    procurementVatRate: 0.21, worksSixPercentConfirmed: false
  };
  st.financeProfile.resale = { conservative: 360000, expected: 390000, strong: 420000 };
  st.financeProfile.targetRoiPercent = 15;
  return st;
}

async function write(name, state) {
  var project = ProjectEngine.calculateProject(state);
  var finance = null;
  if (state.goal === 'investor' && project.investorReadiness && project.investorReadiness.allowed) {
    finance = FinanceEngine.analyse(project, state.financeProfile, state);
  }
  var buf = await build({ email: 'qa@elyan.be', state: state, project: project, finance: finance });
  var file = path.join(OUT, name);
  fs.writeFileSync(file, buf);
  var pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(name, 'bytes', buf.length, 'pages~', pages,
    'rec', project.budget && project.budget.recommendedExpected,
    finance ? ('status=' + finance.status + ' profit=' + finance.potentialProfit) : 'no-finance');
}

(async function () {
  var A = base('homeowner');
  A.scope.keuken = 'volledig';
  A.scope.badkamer = 'volledig';
  A.scope.schilderwerken = 'grondig';
  A.packageDetails = { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') };
  await write('calc2-A-homeowner-light.pdf', A);

  var B = base('homeowner');
  ['dak', 'ramen', 'isolatie', 'verwarming', 'elektriciteit', 'keuken', 'badkamer', 'vloeren', 'schilderwerken'].forEach(function (k) {
    B.scope[k] = k === 'vloeren' ? 'beperkt' : (k === 'schilderwerken' ? 'grondig' : 'volledig');
    B.packageDetails[k] = d(k);
  });
  await write('calc2-B-homeowner-full.pdf', B);

  var C = base('homeowner');
  C.propertyProfile.yearBuilt = 'voor_1945';
  C.structuralRisk = 'weet_niet';
  C.procurementModel = 'general_contractor';
  ['dak', 'ramen', 'isolatie', 'verwarming', 'elektriciteit', 'keuken', 'badkamer', 'gevel'].forEach(function (k) {
    C.scope[k] = 'zwaar';
    C.packageDetails[k] = {};
  });
  await write('calc2-C-homeowner-heavy.pdf', C);

  var D = financeReady(base('investor'));
  D.scope.keuken = 'volledig';
  D.scope.badkamer = 'volledig';
  D.scope.schilderwerken = 'grondig';
  D.packageDetails = { keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken') };
  await write('calc2-D-investor-positive.pdf', D);

  var E = JSON.parse(JSON.stringify(D));
  E.financeProfile.purchasePrice = 320000;
  E.financeProfile.resale = { conservative: 280000, expected: 300000, strong: 320000 };
  await write('calc2-E-investor-negative.pdf', E);

  var F = JSON.parse(JSON.stringify(D));
  F.financeProfile.financing = { mode: 'loan', holdingMonths: 9, loanAmount: 200000, interestRatePercent: 3.5, oneTimeCosts: 1500 };
  F.financeProfile.selling = { mode: 'agent', agentRateExVat: 0.03, otherSellingCosts: 500 };
  await write('calc2-F-investor-financed.pdf', F);

  console.log('PDF QA SET OK');
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
