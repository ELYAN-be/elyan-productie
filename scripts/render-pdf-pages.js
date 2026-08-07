#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var { createCanvas } = require('@napi-rs/canvas');
var pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

var OUT = path.join(__dirname, '..', 'tmp-pdf-qa');
var files = ['A-dak.pdf', 'B-badkamer.pdf', 'C-keuken.pdf', 'D-vloer.pdf', 'E-schilder.pdf'];

async function renderPdf(file) {
  var data = new Uint8Array(fs.readFileSync(path.join(OUT, file)));
  var doc = await pdfjs.getDocument({ data: data, useSystemFonts: true }).promise;
  var base = file.replace(/\.pdf$/, '');
  var dir = path.join(OUT, base);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  console.log(file, 'pages', doc.numPages);
  for (var i = 1; i <= doc.numPages; i++) {
    var page = await doc.getPage(i);
    var viewport = page.getViewport({ scale: 1.5 });
    var canvas = createCanvas(viewport.width, viewport.height);
    var ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    var out = path.join(dir, 'page-' + i + '.png');
    fs.writeFileSync(out, canvas.toBuffer('image/png'));
  }
  return doc.numPages;
}

(async function () {
  var summary = {};
  for (var f of files) {
    summary[f] = await renderPdf(f);
  }
  fs.writeFileSync(path.join(OUT, 'page-counts.json'), JSON.stringify(summary, null, 2));
  console.log(summary);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
