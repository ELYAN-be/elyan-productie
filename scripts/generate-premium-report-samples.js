#!/usr/bin/env node
'use strict';
/**
 * Premium report redesign — sample PDFs + email previews
 * Presentation only; engine untouched.
 */
var fs = require('fs');
var path = require('path');
var pricing = require('../shared/pricing');
var buildReportPdf = require('../api/lib/pdf-report').buildReportPdf;
var buildEmailHtml = require('../api/send-report').buildEmailHtml;

var OUT = path.join(__dirname, '..', 'tmp-pdf-premium-redesign');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

var CASES = [
  {
    file: '01-keuken-appliances.pdf',
    type: 'keuken',
    province: 'oost-vlaanderen',
    answers: {
      size: 12, level: 'standaard', scope: 'vervangen', cabinets: 'midden', appliances: 'basis',
      worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee',
      housingAge: 'oud', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '02-warmtepomp-jong.pdf',
    type: 'verwarming',
    province: 'oost-vlaanderen',
    answers: {
      size: 120, level: 'standaard', projectType: 'lucht_water', insulationLevel: 'matig',
      distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'nieuw',
      housingAge: 'jong', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '03-badkamer-complex.pdf',
    type: 'badkamer',
    province: 'antwerpen',
    answers: {
      size: 9, level: 'premium', scope: 'volledig', sanitary: 'bad+douche', tiling: 'volledig',
      plumbingMove: 'ja', ventilation: 'matig', ufh: 'ja', demolition: 'volledig',
      housingAge: 'oud', urgency: 'binnen6', province: 'antwerpen'
    }
  },
  {
    file: '04-dak-isolatie.pdf',
    type: 'dak',
    province: 'oost-vlaanderen',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '05-brussel-dak.pdf',
    type: 'dak',
    province: 'brussel',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', urgency: 'binnen6', province: 'brussel'
    }
  }
];

function wrapEmailPreview(html, widthLabel, widthPx) {
  return '<!DOCTYPE html><html lang="nl-BE"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>ELYAN email preview — ' + widthLabel + '</title>' +
    '<style>body{margin:0;background:#ddd;} .frame{width:' + widthPx +
    'px;max-width:100%;margin:24px auto;box-shadow:0 8px 24px rgba(0,0,0,.12);}</style></head>' +
    '<body><div class="frame">' + html + '</div></body></html>';
}

async function main() {
  var summary = [];
  for (var i = 0; i < CASES.length; i++) {
    var c = CASES[i];
    var result = pricing.calcEstimate(c.type, c.province, c.answers);
    var buf = await buildReportPdf({
      type: c.type,
      province: c.province,
      size: c.answers.size,
      level: c.answers.level,
      answers: c.answers,
      result: result,
      reportId: 'EL-PREVIEW' + (i + 1),
      email: 'qa@elyan.be',
      notes: ''
    });
    var outPath = path.join(OUT, c.file);
    fs.writeFileSync(outPath, buf);
    var text = buf.toString('latin1');
    var pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
    var banned = {
      hasLowHighExpected: /\bLOW\b|\bHIGH\b|\bEXPECTED\b/.test(text),
      hasExecutive: /EXECUTIVE SUMMARY/i.test(text),
      hasConfidenceKpi: /CONFIDENCE/i.test(text),
      hasMarktconformBand: /MARKTCONFORM/.test(text)
    };
    console.log('Wrote', c.file, 'pages=' + pages, 'bytes=' + buf.length,
      'price=' + result.price, 'vat=' + result.vatLabel);
    summary.push({
      file: c.file,
      pages: pages,
      bytes: buf.length,
      price: result.price,
      low: result.low,
      high: result.high,
      vatLabel: result.vatLabel,
      premie: result.premies && result.premies[0] && result.premies[0].relevance,
      banned: banned
    });
  }

  // Email previews from heat-pump case
  var emailCase = CASES[1];
  var emailResult = pricing.calcEstimate(emailCase.type, emailCase.province, emailCase.answers);
  var emailHtml = buildEmailHtml({
    type: emailCase.type,
    province: emailCase.province,
    result: emailResult
  });
  fs.writeFileSync(path.join(OUT, 'email-desktop.html'), wrapEmailPreview(emailHtml, 'desktop', 640));
  fs.writeFileSync(path.join(OUT, 'email-mobile-390.html'), wrapEmailPreview(emailHtml, '390px', 390));
  fs.writeFileSync(path.join(OUT, 'email-raw.html'), emailHtml);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('Email previews written');
  console.log('OUT', OUT);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
