#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var flags = require('../shared/feature-flags');
var fails = 0;

function assert(name, cond, detail) {
  if (!cond) {
    console.error('FAIL', name, detail || '');
    fails++;
  } else {
    console.log('OK', name);
  }
}

assert('flag off', flags.PUBLIC_PDF_REPORTS_ENABLED === false);

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

assert('calc1 cta hidden', /id="reportEmailCta"[^>]*hidden/.test(read('index.html')));
assert('calc1 no public PDF CTA label visible structure', read('index.html').indexOf('reportEmailCta') >= 0);
assert('send-report gate', read('api/send-report.js').indexOf('report_disabled') >= 0);
assert('send-project-report gate', read('api/send-project-report.js').indexOf('report_disabled') >= 0);
assert('calc2 email empty', /function buildEmailCaptureHtml\(\)\s*\{\s*\/\* Launch/.test(read('js/calc2-ui-results.js')) ||
  read('js/calc2-ui-results.js').indexOf('return \'\';') >= 0 &&
  read('js/calc2-ui-results.js').indexOf('buildEmailCaptureHtml') >= 0);
assert('pdf code retained', fs.existsSync(path.join(__dirname, '..', 'api/lib/pdf-report-v4.js')));
assert('pricing untouched path', fs.existsSync(path.join(__dirname, '..', 'shared/pricing.js')));

/* Smoke: APIs refuse without generating */
var sendReport = require('../api/send-report');
var sendProject = require('../api/send-project-report');

function mockRes() {
  var out = { statusCode: 0, body: null };
  return {
    status: function (c) { out.statusCode = c; return this; },
    json: function (b) { out.body = b; return this; },
    setHeader: function () { return this; },
    _out: out
  };
}

async function runApis() {
  var r1 = mockRes();
  await sendReport({ method: 'POST', body: { email: 'a@b.com' }, headers: {}, socket: {} }, r1);
  assert('send-report 503', r1._out.statusCode === 503 && r1._out.body.error === 'report_disabled');

  var r2 = mockRes();
  await sendProject({ method: 'POST', body: { email: 'a@b.com' }, headers: {}, socket: {} }, r2);
  assert('send-project-report 503', r2._out.statusCode === 503 && r2._out.body.error === 'report_disabled');
}

runApis().then(function () {
  console.log(fails ? '\nFAILED: ' + fails : '\nPDF LAUNCH-OFF CHECKS OK');
  process.exit(fails ? 1 : 0);
}).catch(function (e) {
  console.error(e);
  process.exit(1);
});
