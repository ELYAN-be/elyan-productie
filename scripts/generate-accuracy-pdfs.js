#!/usr/bin/env node
'use strict';
/** Representative report-accuracy PDFs for sprint QA */
var fs = require('fs');
var path = require('path');
var pricing = require('../shared/pricing');
var buildReportPdf = require('../api/lib/pdf-report').buildReportPdf;

var OUT = path.join(__dirname, '..', 'tmp-pdf-qa-accuracy');
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
    file: '03-hybride-oud.pdf',
    type: 'verwarming',
    province: 'oost-vlaanderen',
    answers: {
      size: 120, level: 'standaard', projectType: 'hybride', insulationLevel: 'matig',
      distribution: 'gemengd', dhw: 'nieuw', replaceVsNew: 'vervangen',
      housingAge: 'oud', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '04-dak-vlaanderen.pdf',
    type: 'dak',
    province: 'oost-vlaanderen',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '05-brussel-renovatie.pdf',
    type: 'dak',
    province: 'brussel',
    answers: {
      size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig',
      material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal',
      housingAge: 'middel', asbestos: 'nee', urgency: 'binnen6', province: 'brussel'
    }
  },
  {
    file: '06-ventilatie.pdf',
    type: 'ventilatie',
    province: 'oost-vlaanderen',
    answers: {
      size: 120, level: 'standaard', system: 'D', routing: 'renovatie',
      housingAge: 'oud', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  },
  {
    file: '07-zonnepanelen.pdf',
    type: 'zonnepanelen',
    province: 'oost-vlaanderen',
    answers: {
      size: 8, level: 'standaard', roofType: 'hellend', access: 'normaal',
      battery: 'nee', electricalAdapt: 'nee',
      housingAge: 'oud', urgency: 'binnen6', province: 'oost-vlaanderen'
    }
  }
];

async function main() {
  var fails = 0;
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
      reportId: 'QA-' + c.file.replace(/\.pdf$/, ''),
      email: 'qa@elyan.be',
      notes: ''
    });
    var outPath = path.join(OUT, c.file);
    fs.writeFileSync(outPath, buf);
    var text = buf.toString('latin1');
    var pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
    var ok = Buffer.isBuffer(buf) && buf.length > 2000 && buf.slice(0, 5).toString() === '%PDF-';
    var hasKalender = /Kalender(?!duur)/.test(text) && /\/Kalender\b/.test(text);
    // soft content checks via latin1 (pdfkit often embeds readable strings)
    var checks = {
      indicativeDuration: /Indicatieve (duur|uitvoeringsduur)/i.test(text),
      indicativeVat: /Indicatief btw-scenario/i.test(text),
      noSlider: !/range-slider|pill-cluster/i.test(text)
    };
    if (c.file.indexOf('brussel') !== -1) {
      checks.bruNoMogelijk = /geen aanvraag mogelijk|niet_beschikbaar|momenteel geen/i.test(text);
      checks.bruNotMogelijkLabel = !/RENOLUTION[^\n]{0,40}mogelijk relevant/i.test(text);
    }
    if (c.file.indexOf('keuken') !== -1) {
      checks.mixedVat = result.vatMixed === true;
    }
    if (c.file.indexOf('warmtepomp-jong') !== -1) {
      checks.tempHp = /tijdelijk|warmtepomp/i.test(result.vatLabel + (result.vatNote || ''));
    }

    if (!ok || pages < 3 || pages > 12) {
      console.error('FAIL PDF structure', c.file, 'pages=', pages, 'bytes=', buf.length);
      fails++;
    } else {
      console.log('OK', c.file, 'pages=' + pages, 'bytes=' + buf.length,
        'vat=' + result.vatLabel,
        'premie=' + ((result.premies && result.premies[0] && result.premies[0].relevance) || '-'));
    }
    summary.push({
      file: c.file,
      bytes: buf.length,
      pages: pages,
      vatLabel: result.vatLabel,
      vatMixed: result.vatMixed,
      taxableBase6: result.vatBreakdown && result.vatBreakdown.taxableBase6,
      taxableBase21: result.vatBreakdown && result.vatBreakdown.taxableBase21,
      premieRelevance: result.premies && result.premies[0] && result.premies[0].relevance,
      premieScheme: result.premies && result.premies[0] && result.premies[0].scheme,
      price: result.price,
      checks: checks
    });
  }

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(fails ? '\nPDF QA FAILED: ' + fails : '\nPDF QA OK → ' + OUT);
  process.exit(fails ? 1 : 0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
