#!/usr/bin/env node
/* POST one Calc2 report to preview deployment — no secrets printed */
'use strict';

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');

var BASE = process.env.ELYAN_PREVIEW_URL || 'https://elyan-356utdpug-elyan2.vercel.app';
var TO = process.env.ELYAN_TEST_EMAIL || 'elyan.info@gmail.com';

function lightState() {
  var scope = Scope.emptyScope();
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
      keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
      badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
      schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' }
    },
    financeProfile: null
  };
}

(async function () {
  var state = lightState();
  var localProject = ProjectEngine.calculateProject(state);
  var localTotals = {
    recommendedExpected: localProject.budget.recommendedExpected,
    low: localProject.budget.low,
    high: localProject.budget.high
  };

  var res = await fetch(BASE + '/api/send-project-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TO, state: state })
  });
  var text = await res.text();
  var json = null;
  try { json = JSON.parse(text); } catch (e) {}

  console.log('HTTP=' + res.status);
  console.log('TO=' + TO);
  console.log('BASE=' + BASE);
  console.log('LOCAL_TOTALS=' + JSON.stringify(localTotals));
  if (json) {
    console.log('RESP_KEYS=' + Object.keys(json).join(','));
    if (json.error) console.log('ERROR=' + json.error);
    if (json.ok) console.log('OK=true');
    if (json.totals) {
      console.log('SERVER_TOTALS=' + JSON.stringify(json.totals));
      var match =
        json.totals.recommendedExpected === localTotals.recommendedExpected &&
        json.totals.low === localTotals.low &&
        json.totals.high === localTotals.high;
      console.log('TOTALS_MATCH=' + match);
    }
  } else {
    console.log('RESP_EMPTY_OR_NON_JSON len=' + text.length);
  }
})().catch(function (err) {
  console.log('FATAL=' + err.message);
  process.exit(1);
});
