#!/usr/bin/env node
/* Generate 5 reference PDFs + dump metrics JSON */
var fs = require('fs');
var path = require('path');
var pricing = require('../shared/pricing');
var buildReportPdf = require('../api/lib/pdf-report').buildReportPdf;

var OUT = path.join(__dirname, '..', 'tmp-pdf-qa');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

var REFS = [
  {
    file: 'A-dak.pdf',
    type: 'dak',
    province: 'oost-vlaanderen',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: 'B-badkamer.pdf',
    type: 'badkamer',
    province: 'antwerpen',
    answers: {
      size: 8, level: 'standaard', scope: 'volledig', sanitary: 'douche', tiling: 'volledig',
      plumbingMove: 'beperkt', ventilation: 'goed', ufh: 'nee', demolition: 'volledig',
      housingAge: 'middel', urgency: 'binnen6', province: 'antwerpen'
    }
  },
  {
    file: 'C-keuken.pdf',
    type: 'keuken',
    province: 'vlaams-brabant',
    answers: {
      size: 12, level: 'standaard', scope: 'vervangen', cabinets: 'midden', appliances: 'basis',
      worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee',
      housingAge: 'middel', urgency: 'binnen6', province: 'vlaams-brabant'
    }
  },
  {
    file: 'D-vloer.pdf',
    type: 'vloeren',
    province: 'west-vlaanderen',
    answers: {
      size: 50, level: 'standaard', floorMaterial: 'tegel', rooms: '2-3', removal: 'ja',
      substrate: 'matig', leveling: 'beperkt', ufh: 'nee', wetRooms: 'nee', skirting: 'ja',
      housingAge: 'middel', urgency: 'binnen6', province: 'west-vlaanderen'
    }
  },
  {
    file: 'E-schilder.pdf',
    type: 'schilderwerken',
    province: 'limburg',
    answers: {
      size: 100, level: 'standaard', paintScope: 'binnen', surface: 'matig', wallpaper: 'nee',
      colors: '1', darkColors: 'nee', woodwork: 'nee', housingAge: 'middel', urgency: 'binnen6',
      province: 'limburg'
    }
  }
];

function metrics(name, r) {
  return {
    name: name,
    low: r.low,
    expected: r.price,
    high: r.high,
    materiaal: r.amounts.materiaal,
    arbeid: r.amounts.arbeid,
    overige: r.amounts.overige,
    matPct: Math.round(r.split.materiaal * 100),
    arbPct: Math.round(r.split.arbeid * 100),
    ovPct: Math.round(r.split.overige * 100),
    labourHours: r.labourHours,
    crew: r.crewSize,
    workDays: r.workDays,
    effectiveRate: r.effectiveHourlyRate,
    perM2: r.perM2,
    vatLabel: r.vatLabel,
    vatAmount: r.vatAmount,
    inclVat: r.totalInclVat,
    marketLow: r.marketBenchmark.low,
    marketHigh: r.marketBenchmark.high,
    position: r.marketPosition
  };
}

async function main() {
  var report = [];
  for (var i = 0; i < REFS.length; i++) {
    var ref = REFS[i];
    var result = pricing.calcEstimate(ref.type, ref.province, ref.answers);
    var buf = await buildReportPdf({
      email: 'qa@elyan.be',
      type: ref.type,
      province: ref.province,
      size: ref.answers.size,
      level: ref.answers.level,
      notes: '',
      answers: ref.answers,
      result: result
    });
    var outPath = path.join(OUT, ref.file);
    fs.writeFileSync(outPath, buf);
    var m = metrics(ref.file, result);
    m.bytes = buf.length;
    // Count pages via PDF page markers
    var text = buf.toString('latin1');
    var pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
    m.pages = pages;
    report.push(m);
    console.log('Wrote', outPath, 'pages~', pages, 'price', result.price);
  }
  fs.writeFileSync(path.join(OUT, 'reference-metrics.json'), JSON.stringify(report, null, 2));
  console.log('Metrics saved');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
