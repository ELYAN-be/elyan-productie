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

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

assert('flag off', flags.PUBLIC_CALCULATORS_ENABLED === false);
assert('insight section hidden', /id="prijsinzicht"[^>]*\bhidden\b/.test(read('index.html')));
assert('calc markup retained', read('index.html').indexOf('data-action="start-calculator"') >= 0);
assert('calc2 markup retained', read('index.html').indexOf('data-action="start-calculator-2"') >= 0);
assert('index footer no prijs-berekenen', read('index.html').indexOf('href="/prijs-berekenen"') < 0);
assert('vakmannen no prijs-berekenen', read('vakmannen.html').indexOf('href="/prijs-berekenen"') < 0);
assert('over-ons no prijs-berekenen', read('over-ons.html').indexOf('href="/prijs-berekenen"') < 0);
assert('vercel redirect', /"source":\s*"\/prijs-berekenen"/.test(read('vercel.json')));
assert('sitemap gated', read('api/sitemap.xml.js').indexOf('requiresCalculators') >= 0);
assert('deep link gated', read('js/homepage-v3.js').indexOf('PUBLIC_CALCULATORS_ENABLED') >= 0);
assert('calc1 gated', read('js/calculator.js').indexOf('PUBLIC_CALCULATORS_ENABLED') >= 0);
assert('calc2 gated', read('js/calculator2.js').indexOf('PUBLIC_CALCULATORS_ENABLED') >= 0);
assert('calc files retained', fs.existsSync(path.join(__dirname, '..', 'js/calculator.js')));
assert('calc2 files retained', fs.existsSync(path.join(__dirname, '..', 'js/calculator2.js')));
assert('chooser retained', fs.existsSync(path.join(__dirname, '..', 'prijs-berekenen.html')));

console.log(fails ? '\nFAILED: ' + fails : '\nCALCULATORS LAUNCH-OFF CHECKS OK');
process.exit(fails ? 1 : 0);
