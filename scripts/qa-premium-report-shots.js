#!/usr/bin/env node
'use strict';
/** Visual QA: rasterize premium redesign PDFs + email previews via Playwright + PDF.js */
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');

var ROOT = path.join(__dirname, '..', 'tmp-pdf-premium-redesign');
var SHOTS = path.join(ROOT, 'qa-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

var PDFS = [
  '01-keuken-appliances.pdf',
  '02-warmtepomp-jong.pdf',
  '03-badkamer-complex.pdf',
  '04-dak-isolatie.pdf',
  '05-brussel-dak.pdf'
];

var RENDER_HTML = function (pdfUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{margin:0;background:#777;font-family:sans-serif}
  #pages{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px}
  canvas{background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.25)}
</style></head><body>
<div id="pages"></div>
<script type="module">
  import * as pdfjs from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
  const url = ${JSON.stringify(pdfUrl)};
  try {
    const b64 = url.split(',')[1];
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    window.__pageCount = pdf.numPages;
    const host = document.getElementById('pages');
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.dataset.page = String(i);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      host.appendChild(canvas);
    }
    window.__ready = true;
  } catch (e) {
    window.__fail = String(e && e.message ? e.message : e);
  }
</script></body></html>`;
};

async function shotEmail(browser, file, width, outName) {
  var page = await browser.newPage({ viewport: { width: width, height: 900 } });
  var fileUrl = 'file:///' + path.join(ROOT, file).replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(SHOTS, outName),
    fullPage: true
  });
  await page.close();
  console.log('email shot', outName);
}

async function shotPdf(browser, pdfName) {
  var pdfPath = path.join(ROOT, pdfName);
  var b64 = fs.readFileSync(pdfPath).toString('base64');
  var page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  page.on('pageerror', function (err) { console.error('pageerror', pdfName, err.message); });
  page.on('console', function (msg) { if (msg.type() === 'error') console.error('console', msg.text()); });
  await page.goto('about:blank');
  await page.setContent(RENDER_HTML('data:application/pdf;base64,' + b64), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__ready === true || window.__fail', { timeout: 90000 });
  var fail = await page.evaluate('window.__fail || null');
  if (fail) throw new Error('pdf render fail: ' + fail);
  var count = await page.evaluate('window.__pageCount');
  var canvases = page.locator('canvas');
  for (var i = 0; i < count; i++) {
    var out = path.join(SHOTS, pdfName.replace(/\.pdf$/, '') + '-p' + String(i + 1).padStart(2, '0') + '.png');
    await canvases.nth(i).screenshot({ path: out });
    console.log('pdf shot', path.basename(out));
  }
  await page.close();
  return count;
}

async function main() {
  var browser = await chromium.launch({ headless: true });
  await shotEmail(browser, 'email-desktop.html', 720, 'email-desktop.png');
  await shotEmail(browser, 'email-mobile-390.html', 390, 'email-mobile-390.png');
  var meta = {};
  for (var i = 0; i < PDFS.length; i++) {
    meta[PDFS[i]] = await shotPdf(browser, PDFS[i]);
  }
  fs.writeFileSync(path.join(SHOTS, 'pages.json'), JSON.stringify(meta, null, 2));
  await browser.close();
  console.log('done', SHOTS);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
