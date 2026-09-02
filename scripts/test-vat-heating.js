#!/usr/bin/env node
'use strict';
var pricing = require('../shared/pricing');
var PROV = 'oost-vlaanderen';
var fails = 0;

function est(answers) {
  return pricing.calcEstimate('verwarming', PROV, Object.assign({ province: PROV, size: 120, level: 'standaard', urgency: 'binnen6' }, answers));
}

function assert(name, cond, detail) {
  if (!cond) {
    console.error('FAIL', name, detail || '');
    fails++;
  } else {
    console.log('OK', name);
  }
}

function base(age, pt, extra) {
  return Object.assign({
    housingAge: age,
    projectType: pt,
    insulationLevel: 'matig',
    distribution: 'radiatoren',
    dhw: 'behouden',
    replaceVsNew: 'vervangen'
  }, extra || {});
}

// A. Young dwelling → 21% on entire subtotal
var young = est(base('jong', 'ketel_vervangen'));
assert('A young ketel 21%', young.vatRate === 0.21 && !young.vatMixed);
assert('A young excl unchanged', young.price === young.subtotalExVat);

// B. Older qualifying non-fossil → 6%
var hp = est(base('oud', 'lucht_water', { dhw: 'nieuw', replaceVsNew: 'nieuw' }));
assert('B heat pump 6%', hp.vatRate === 0.06 && !hp.vatMixed);

// C. Fossil boiler → not entirely 6%
var ketel = est(base('oud', 'ketel_vervangen'));
assert('C fossil ketel not full 6%', ketel.vatRate > 0.06);
assert('C fossil ketel excl unchanged', ketel.price === ketel.subtotalExVat);
assert('C fossil vat21 base > 0', (ketel.vatBreakdown && ketel.vatBreakdown.taxableBase21) > 0);

// D. Fossil + distribution (gemengd UFH)
var mixed = est(base('oud', 'ketel_vervangen', { distribution: 'gemengd' }));
assert('D mixed VAT flag', mixed.vatMixed === true);
assert('D both bases', mixed.vatBreakdown.taxableBase6 > 0 && mixed.vatBreakdown.taxableBase21 > 0);

// E. Heat pump preserved
assert('E HP no fossil exception', hp.vatBreakdown.taxableBase21 === 0);

// F. Hybrid FOD 35/65 on core
var hyb = est(base('oud', 'hybride', { distribution: 'gemengd', dhw: 'nieuw' }));
assert('F hybrid mixed', hyb.vatMixed === true);
var core = hyb.workPackages.filter(function (p) { return p.vatClass === 'hybrid_core'; })
  .reduce(function (s, p) { return s + p.totalBase; }, 0);
var expected21 = Math.round(core * 0.35 / 50) * 50;
assert('F hybrid fossil base ~35% core', Math.abs(hyb.vatBreakdown.taxableBase21 - expected21) <= 100);

// G. Breakdown sums
[ketel, mixed, hyb, hp, young].forEach(function (r, i) {
  var bd = r.vatBreakdown || {};
  assert('G breakdown sum ' + i, (bd.vat6 || 0) + (bd.vat21 || 0) === r.vatAmount);
  assert('G incl vat ' + i, r.totalInclVat === r.subtotalExVat + r.vatAmount);
});

// Non-heating category unchanged
var dak = pricing.calcEstimate('dak', PROV, { province: PROV, size: 80, level: 'standaard', housingAge: 'oud', workType: 'vernieuwen', insulation: 'ja', urgency: 'binnen6' });
assert('Non-heating dak still 6%', dak.vatRate === 0.06 && !dak.vatMixed);

console.log(fails ? '\nVAT HEATING TESTS FAILED: ' + fails : '\nVAT HEATING TESTS OK');
process.exit(fails ? 1 : 0);
