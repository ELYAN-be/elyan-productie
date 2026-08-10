#!/usr/bin/env node
/* Client/server pricing parity — shared engine vs api bridge */
var shared = require('../shared/pricing');
var server = require('../api/lib/pricing');

var samples = [
  {
    type: 'dak',
    province: 'antwerpen',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', province: 'antwerpen'
    }
  },
  {
    type: 'ramen',
    province: 'oost-vlaanderen',
    answers: {
      size: 15, level: 'standaard', frame: 'pvc', glazing: 'hr++', sliding: 'nee',
      doors: '1', removal: 'ja', access: 'normaal', housingAge: 'middel',
      urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    type: 'zonnepanelen',
    province: 'vlaams-brabant',
    answers: {
      sizeMode: 'kwp', kwp: 5, size: 5, level: 'standaard', roofType: 'hellend',
      access: 'normaal', electricalAdapt: 'beperkt', battery: 'nee',
      housingAge: 'middel', urgency: 'binnen6', province: 'vlaams-brabant'
    }
  }
];

var keys = ['price', 'low', 'high', 'labourHours', 'crewSize', 'workDays', 'vatAmount', 'totalInclVat', 'perM2'];
var ok = true;

samples.forEach(function (sample) {
  var a = shared.calcEstimate(sample.type, sample.province, sample.answers);
  var b = server.calcEstimate(sample.type, sample.province, sample.answers);
  keys.forEach(function (k) {
    if (a[k] !== b[k]) {
      console.log('MISMATCH', sample.type, k, a[k], b[k]);
      ok = false;
    }
  });
  if (JSON.stringify(a.amounts) !== JSON.stringify(b.amounts)) {
    console.log('MISMATCH amounts', sample.type, a.amounts, b.amounts);
    ok = false;
  }
  console.log(sample.type, 'shared', a.price, 'server', b.price);
});

console.log(ok ? 'PARITY OK' : 'PARITY FAIL');
process.exit(ok ? 0 : 1);
