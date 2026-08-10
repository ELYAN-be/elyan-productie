#!/usr/bin/env node
'use strict';
var fs = require('fs');
var files = [
  'calc2-A-homeowner-light.pdf',
  'calc2-B-homeowner-full.pdf',
  'calc2-C-homeowner-heavy.pdf',
  'calc2-D-investor-positive.pdf',
  'calc2-E-investor-negative.pdf',
  'calc2-F-investor-financed.pdf'
];
var patterns = [
  /\bNMI\b/, /MODEL_ASSUMPTION/, /USER_ASSUMPTION/, /PARTIAL_ESTIMATE/,
  /ALL_IN_INDICATIVE/, /investorReadiness/, /\bETICS\b/, /\bNaN\b/, /undefined/
];
files.forEach(function (f) {
  var t = fs.readFileSync('tmp-pdf-qa/' + f).toString('latin1');
  var pages = (t.match(/\/Type\s*\/Page[^s]/g) || []).length;
  var leaks = patterns.filter(function (p) { return p.test(t); }).map(String);
  console.log(f, 'pages~', pages, 'leaks', leaks.length ? leaks.join(' | ') : 'none');
});
