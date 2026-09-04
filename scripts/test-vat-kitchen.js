#!/usr/bin/env node
'use strict';
var pricing = require('../shared/pricing');
var PROV = 'oost-vlaanderen';
var fails = 0;

function assert(name, cond, detail) {
  if (!cond) {
    console.error('FAIL', name, detail || '');
    fails++;
  } else {
    console.log('OK', name);
  }
}

function est(extra) {
  return pricing.calcEstimate('keuken', PROV, Object.assign({
    province: PROV,
    size: 12,
    level: 'standaard',
    scope: 'vervangen',
    cabinets: 'midden',
    worktop: 'composiet',
    connections: 'nee',
    splashback: 'ja',
    flooring: 'nee',
    urgency: 'binnen6'
  }, extra || {}));
}

// 1. Qualifying older home + appliances → mixed VAT
var withApp = est({ housingAge: 'oud', appliances: 'basis' });
assert('1 mixed VAT', withApp.vatMixed === true);
assert('1 appliances 21%', withApp.vatBreakdown.taxableBase21 > 0);
assert('1 fixed works 6%', withApp.vatBreakdown.taxableBase6 > 0);
assert('1 appliances package tagged', withApp.workPackages.some(function (p) {
  return p.id === 'appliances' && p.vatClass === 'appliances';
}));
var appBase = withApp.workPackages.filter(function (p) { return p.id === 'appliances'; })
  .reduce(function (s, p) { return s + p.totalBase; }, 0);
assert('1 taxableBase21 ≈ appliances', Math.abs(withApp.vatBreakdown.taxableBase21 - appBase) <= 50);
assert('1 excl unchanged', withApp.price === withApp.subtotalExVat);

// 2. Qualifying older home without appliances → no artificial 21%
var noApp = est({ housingAge: 'oud', appliances: 'nee' });
assert('2 no appliances package', !noApp.workPackages.some(function (p) { return p.id === 'appliances'; }));
assert('2 full 6%', noApp.vatRate === 0.06 && noApp.vatBreakdown.taxableBase21 === 0);
assert('2 excl unchanged', noApp.price === noApp.subtotalExVat);

// 3. Young home kitchen → generic renovation reduction not applied
var young = est({ housingAge: 'jong', appliances: 'basis' });
assert('3 young full 21%', young.vatRate === 0.21 && young.vatBreakdown.taxableBase6 === 0);
assert('3 young excl unchanged', young.price === young.subtotalExVat);

console.log(fails ? '\nVAT KITCHEN TESTS FAILED: ' + fails : '\nVAT KITCHEN TESTS OK');
process.exit(fails ? 1 : 0);
