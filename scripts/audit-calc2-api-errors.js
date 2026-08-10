#!/usr/bin/env node
/* Phase 6.5 — API validation smoke (no network / no email send) */
'use strict';

var path = require('path');
var handler = require('../api/send-project-report');

function mockRes() {
  var statusCode = 200;
  var body = null;
  return {
    statusCode: function () { return statusCode; },
    jsonBody: function () { return body; },
    setHeader: function () {},
    status: function (c) { statusCode = c; return this; },
    json: function (b) { body = b; return this; }
  };
}

async function call(payload) {
  var req = { method: 'POST', body: payload };
  var res = mockRes();
  await handler(req, res);
  return { status: res.statusCode(), body: res.jsonBody() };
}

async function main() {
  var fails = [];
  function assert(c, m) { if (!c) fails.push(m); }

  var bad = [
    [{ email: 'not-an-email', state: { goal: 'homeowner' } }, 400, 'invalid_email'],
    [{ email: 'test@elyan.be', state: null }, 400, 'invalid_state'],
    [{ email: 'test@elyan.be', state: { goal: 'alien', propertyProfile: { province: 'antwerpen' } } }, 400, 'invalid_goal'],
    [{ email: 'test@elyan.be', state: { goal: 'homeowner', propertyProfile: { province: 'mars' } } }, 400, 'invalid_province'],
    [{
      email: 'test@elyan.be',
      state: {
        goal: 'investor',
        propertyProfile: { province: 'antwerpen', yearBuilt: '1971_1990', areaM2: 100, propertyType: 'rijwoning', condition: 'matig', epc: 'D', floors: '2' },
        scope: { keuken: 'volledig', badkamer: 'volledig', schilderwerken: 'grondig' },
        packageDetails: {},
        finishProfile: 'comfort',
        procurementModel: 'separate',
        structuralRisk: 'nee',
        softCostOverrides: {},
        costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } },
        financeProfile: {
          purchasePrice: -100,
          resale: { expected: 300000 },
          financing: { mode: 'own_funds', holdingMonths: 6 },
          holding: { monthlyTotal: 100 },
          selling: { mode: 'self' },
          vat: { mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21, procurementVatRate: 0.21 }
        }
      }
    }, 400, null],
    [{
      email: 'test@elyan.be',
      state: {
        goal: 'investor',
        propertyProfile: { province: 'antwerpen', yearBuilt: '1971_1990', areaM2: 100, propertyType: 'rijwoning', condition: 'matig', epc: 'D', floors: '2' },
        scope: { keuken: 'volledig' },
        packageDetails: {},
        finishProfile: 'comfort',
        procurementModel: 'general_contractor',
        structuralRisk: 'ja',
        softCostOverrides: {},
        costResolutions: {},
        financeProfile: {
          purchasePrice: 250000,
          resale: { expected: 0 },
          financing: { mode: 'own_funds', holdingMonths: 6 },
          holding: { monthlyTotal: 100 },
          selling: { mode: 'self' },
          vat: { mode: 'indicative_mixed', worksVatRate: 0.21, softVatRate: 0.21, procurementVatRate: 0.21 }
        }
      }
    }, 400, null]
  ];

  for (var i = 0; i < bad.length; i++) {
    var item = bad[i];
    var out = await call(item[0]);
    assert(out.status === item[1], 'case ' + i + ' status expected ' + item[1] + ' got ' + out.status + ' body=' + JSON.stringify(out.body));
    if (item[2]) assert(out.body && out.body.error === item[2], 'case ' + i + ' error code ' + item[2] + ' got ' + JSON.stringify(out.body));
    assert(!(out.body && out.body.stack), 'case ' + i + ' leaked stack');
    assert(!(typeof out.body === 'string' && /Error:|at /.test(out.body)), 'case ' + i + ' leaked stack string');
  }

  if (fails.length) {
    console.error('API ERROR AUDIT FAIL');
    fails.forEach(function (f) { console.error(' - ' + f); });
    process.exit(1);
  }
  console.log('API ERROR AUDIT OK (' + bad.length + ' cases)');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
