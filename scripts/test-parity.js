#!/usr/bin/env node
/* Client/server pricing parity — shared engine vs api bridge */
var shared = require('../shared/pricing');
var server = require('../api/lib/pricing');

var sample = {
  type: 'dak',
  province: 'antwerpen',
  answers: {
    size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
    material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
    housingAge: 'middel', asbestos: 'nee', province: 'antwerpen'
  }
};

var a = shared.calcEstimate(sample.type, sample.province, sample.answers);
var b = server.calcEstimate(sample.type, sample.province, sample.answers);

var keys = ['price', 'low', 'high', 'labourHours', 'crewSize', 'workDays', 'vatAmount', 'totalInclVat', 'perM2'];
var ok = true;
keys.forEach(function (k) {
  if (a[k] !== b[k]) {
    console.log('MISMATCH', k, a[k], b[k]);
    ok = false;
  }
});
if (JSON.stringify(a.amounts) !== JSON.stringify(b.amounts)) {
  console.log('MISMATCH amounts', a.amounts, b.amounts);
  ok = false;
}

console.log(ok ? 'PARITY OK' : 'PARITY FAIL');
console.log('shared price', a.price, 'server price', b.price);
process.exit(ok ? 0 : 1);
