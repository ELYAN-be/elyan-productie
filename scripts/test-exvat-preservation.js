#!/usr/bin/env node
'use strict';
/**
 * Ex-VAT price preservation — launch calibration locked 2026-09-04.
 * Any drift in low/expected/high excl. VAT = FAIL.
 */
var pricing = require('../shared/pricing');
var fails = 0;
var PROV = 'oost-vlaanderen';

var EXPECTED = {
  dak: { low: 12450, price: 17700, high: 26000 },
  badkamer: { low: 6850, price: 11500, high: 19800 },
  keuken: { low: 11350, price: 16850, high: 25350 },
  ramen: { low: 3350, price: 4950, high: 7150 },
  isolatie: { low: 950, price: 1500, high: 2450 },
  verwarming: { low: 6700, price: 10500, high: 15350 },
  elektriciteit: { low: 2150, price: 3600, high: 5500 },
  gevel: { low: 650, price: 1200, high: 2150 },
  vloeren: { low: 1000, price: 1700, high: 2950 },
  schilderwerken: { low: 1400, price: 2050, high: 3150 },
  ventilatie: { low: 2950, price: 4900, high: 7600 },
  zonnepanelen: { low: 5550, price: 7550, high: 10050 }
};

var ANSWERS = {
  dak: { size: 80, workType: 'volledig', insulation: 'ja', roofType: 'hellend', access: 'normaal', asbestos: 'nee' },
  badkamer: { size: 8, scope: 'volledig', demolition: 'volledig', plumbingMove: 'nee', tiling: 'volledig', sanitary: 'midden', ufh: 'nee', ventilation: 'goed' },
  keuken: { size: 12, scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee' },
  ramen: { size: 12, material: 'pvc', glazing: 'hrplusplus', count: 6 },
  isolatie: { size: 60, subtype: 'spouw', performance: 'standaard', prep: 'beperkt', access: 'normaal', finish: 'nee' },
  verwarming: { size: 120, projectType: 'lucht_water', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'nieuw' },
  elektriciteit: { size: 100, scope: 'gedeeltelijk', board: 'behouden', points: 'normaal' },
  gevel: { size: 80, intervention: 'reinigen', access: 'normaal', height: 'laag' },
  vloeren: { size: 40, material: 'laminaat', substrate: 'goed', ufh: 'nee', prep: 'normaal' },
  schilderwerken: { size: 80, surface: 'goed', prep: 'standaard', rooms: 'heelhuis' },
  ventilatie: { size: 120, system: 'D', routing: 'renovatie' },
  zonnepanelen: { size: 8, roofType: 'hellend', access: 'normaal', battery: 'nee', electricalAdapt: 'nee' }
};

function assert(name, cond, detail) {
  if (!cond) {
    console.error('FAIL', name, detail || '');
    fails++;
  } else {
    console.log('OK', name);
  }
}

Object.keys(EXPECTED).forEach(function (cat) {
  var a = Object.assign({
    province: PROV,
    level: 'standaard',
    housingAge: 'oud',
    urgency: 'binnen6'
  }, ANSWERS[cat]);
  var r = pricing.calcEstimate(cat, PROV, a);
  var e = EXPECTED[cat];
  assert(cat + ' low', r.low === e.low, 'got ' + r.low + ' expected ' + e.low);
  assert(cat + ' price', r.price === e.price, 'got ' + r.price + ' expected ' + e.price);
  assert(cat + ' high', r.high === e.high, 'got ' + r.high + ' expected ' + e.high);
});

// Brussels multiplier must remain 1.12 (spot-check vs VL)
assert('BRU mult', pricing.PROVINCES.brussel.mult === 1.12);

console.log(fails ? '\nEX-VAT PRESERVATION FAILED: ' + fails : '\nEX-VAT PRESERVATION OK');
process.exit(fails ? 1 : 0);
