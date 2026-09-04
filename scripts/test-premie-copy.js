#!/usr/bin/env node
'use strict';
var pricing = require('../shared/pricing');
var fails = 0;

function assert(name, cond, detail) {
  if (!cond) {
    console.error('FAIL', name, detail || '');
    fails++;
  } else {
    console.log('OK', name);
  }
}

function premies(type, answers, prov) {
  var r = pricing.calcEstimate(type, prov, Object.assign({
    province: prov,
    size: type === 'zonnepanelen' ? 8 : 80,
    level: 'standaard',
    housingAge: 'oud',
    urgency: 'binnen6'
  }, answers || {}));
  return r.premies || [];
}

// Brussels: no longer "mogelijk"
var bru = premies('dak', { workType: 'volledig', insulation: 'ja' }, 'brussel');
assert('BRU has item', bru.length >= 1);
assert('BRU not mogelijk', bru[0].relevance !== 'mogelijk');
assert('BRU wording', /geen aanvraag|niet.*mogelijk|geen beslissing/i.test(bru[0].reason + ' ' + bru[0].scheme));
assert('BRU checkedAt', bru[0].checkedAt === '2026-09-04');

// Floors: UFH nieuw must NOT trigger floor-insulation MVP
var floors = premies('vloeren', { ufh: 'nieuw', material: 'laminaat', substrate: 'goed' }, 'oost-vlaanderen');
assert('FLOORS no vloerisolatie scheme', !floors.some(function (p) {
  return /vloerisolatie/i.test(p.scheme);
}));
assert('FLOORS limited', floors[0].relevance === 'beperkt');

// Ventilation: no standalone MVB claim
var vent = premies('ventilatie', { system: 'D', routing: 'renovatie' }, 'oost-vlaanderen');
assert('VENT limited', vent[0].relevance === 'beperkt');
assert('VENT no standalone MVP', /geen aparte|niet.*aparte|geen.*Mijn VerbouwPremie voor het plaatsen/i.test(vent[0].reason));

// Solar: no installation premium claim
var solar = premies('zonnepanelen', { roofType: 'hellend', access: 'normaal', battery: 'nee', electricalAdapt: 'nee' }, 'oost-vlaanderen');
assert('SOLAR limited', solar[0].relevance === 'beperkt');
assert('SOLAR no installatiepremie', /geen.*installatiepremie|geen directe/i.test(solar[0].reason));
assert('SOLAR mentions VerbouwLening or no premium', /VerbouwLening|geen.*premie/i.test(solar[0].reason + solar[0].scheme));

// Flanders envelope caveat
var dak = premies('dak', { workType: 'volledig', insulation: 'ja' }, 'oost-vlaanderen');
assert('DAK mogelijk', dak[0].relevance === 'mogelijk');
assert('DAK 2026 income caveat', /inkomenscategorie 1 en 2|categorie 1 en 2/i.test(dak[0].reason));
assert('DAK regulationDate', dak[0].regulationDate === '2026-03-01');

// Heating: fossil boiler not WP premium
var ketel = premies('verwarming', { projectType: 'ketel_vervangen', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden' }, 'oost-vlaanderen');
assert('KETEL limited', ketel[0].relevance === 'beperkt');
assert('KETEL not warmtepomppremie alone', !/^Warmtepomppremie/.test(ketel[0].scheme));

var wp = premies('verwarming', { projectType: 'lucht_water', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'nieuw' }, 'oost-vlaanderen');
assert('WP mogelijk', wp[0].relevance === 'mogelijk');
assert('WP scheme', /warmtepomp/i.test(wp[0].scheme));

console.log(fails ? '\nPREMIE COPY TESTS FAILED: ' + fails : '\nPREMIE COPY TESTS OK');
process.exit(fails ? 1 : 0);
