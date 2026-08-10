#!/usr/bin/env node
/* Phase 6 — project report server recompute parity + PDF smoke */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');
var buildProjectReportPdf = require('../api/lib/pdf-project-report').buildProjectReportPdf;

function empty() { return Scope.emptyScope(); }
function d(pkg) {
  var map = {
    keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
    badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
    schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' },
    dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 100, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'nee' },
    elektriciteit: { elecScope: 'volledig', elecBoard: 'ja', elecFitOut: 'standaard' }
  };
  return map[pkg] || {};
}

function lightState() {
  var scope = empty();
  scope.keuken = 'volledig';
  scope.badkamer = 'volledig';
  scope.schilderwerken = 'grondig';
  return {
    goal: 'homeowner',
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
      keuken: d('keuken'), badkamer: d('badkamer'), schilderwerken: d('schilderwerken')
    },
    financeProfile: null
  };
}

function investorState() {
  var st = lightState();
  st.goal = 'investor';
  st.financeProfile = FinanceEngine.emptyFinanceProfile();
  st.financeProfile.purchasePrice = 275000;
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

async function main() {
  var fails = [];
  function assert(c, m) { if (!c) fails.push(m); }

  var a = ProjectEngine.calculateProject(lightState());
  var b = ProjectEngine.calculateProject(lightState());
  assert(a.budget.recommendedExpected === b.budget.recommendedExpected, 'homeowner project parity');

  var inv = investorState();
  var p1 = ProjectEngine.calculateProject(inv);
  var f1 = FinanceEngine.analyse(p1, inv.financeProfile, inv);
  var p2 = ProjectEngine.calculateProject(inv);
  var f2 = FinanceEngine.analyse(p2, inv.financeProfile, inv);
  assert(f1.ran && f2.ran, 'finance ran');
  assert(f1.totalInvestment === f2.totalInvestment, 'finance TI parity');
  assert(f1.potentialProfit === f2.potentialProfit, 'finance profit parity');
  assert(p1.investorReadiness.allowed === true, 'investor ready for report');

  /* PDF smoke */
  var pdfHome = await buildProjectReportPdf({
    email: 'qa@elyan.be',
    state: lightState(),
    project: a,
    finance: null
  });
  assert(Buffer.isBuffer(pdfHome) && pdfHome.length > 1000, 'homeowner pdf size');
  assert(pdfHome.slice(0, 4).toString() === '%PDF', 'homeowner pdf header');

  var pdfInv = await buildProjectReportPdf({
    email: 'qa@elyan.be',
    state: inv,
    project: p1,
    finance: f1
  });
  assert(Buffer.isBuffer(pdfInv) && pdfInv.length > 2000, 'investor pdf size');
  assert(pdfInv.slice(0, 4).toString() === '%PDF', 'investor pdf header');
  assert(pdfInv.length > pdfHome.length, 'investor pdf denser than homeowner');

  /* Negative investor still produces PDF */
  inv.financeProfile.resale = { expected: 280000, conservative: 270000, strong: 290000 };
  var pNeg = ProjectEngine.calculateProject(inv);
  var fNeg = FinanceEngine.analyse(pNeg, inv.financeProfile, inv);
  assert(fNeg.ran && fNeg.potentialProfit < 0, 'negative deal');
  var pdfNeg = await buildProjectReportPdf({ email: 'qa@elyan.be', state: inv, project: pNeg, finance: fNeg });
  assert(pdfNeg.slice(0, 4).toString() === '%PDF', 'negative investor pdf');

  /* Write samples for manual QA */
  var fs = require('fs');
  var path = require('path');
  var dir = path.join(__dirname, '..', 'tmp-pdf-qa');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'calc2-homeowner-light.pdf'), pdfHome);
  fs.writeFileSync(path.join(dir, 'calc2-investor-positive.pdf'), pdfInv);
  fs.writeFileSync(path.join(dir, 'calc2-investor-negative.pdf'), pdfNeg);
  console.log('Wrote calc2 PDF samples to tmp-pdf-qa/');
  console.log('Home TI', a.budget.recommendedExpected, 'Inv TI', f1.totalInvestment, 'profit', f1.potentialProfit);

  if (fails.length) {
    fails.forEach(function (f) { console.log('FAIL', f); });
    process.exit(1);
  }
  console.log('CALC2 PROJECT REPORT PARITY OK');
  process.exit(0);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
