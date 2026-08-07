/* ============================================================
   ELYAN — Premium PDF-renovatierapport (pdfkit)
   Document-flow: nieuwe pagina alleen wanneer content niet past.
   Data komt uitsluitend uit de pricing engine + insights.
   ============================================================ */

var PDFDocument = require('pdfkit');
var path = require('path');
var pricing = require('./pricing');
var insightsLib = require('./insights');
var questionsLib = require('./questions');

var ASSETS = path.join(__dirname, '..', '_pdf-assets');
var ICON = {
  target: path.join(ASSETS, 'i-target.png'),
  euro: path.join(ASSETS, 'i-euro.png'),
  clock: path.join(ASSETS, 'i-clock.png'),
  gift: path.join(ASSETS, 'i-gift.png'),
  info: path.join(ASSETS, 'i-info.png'),
  bulb: path.join(ASSETS, 'i-bulb.png'),
  check: path.join(ASSETS, 'i-check.png'),
  shield: path.join(ASSETS, 'i-shield.png'),
  arrowRight: path.join(ASSETS, 'i-arrow-right.png'),
  bath: path.join(ASSETS, 'i-bath.png'),
  utensils: path.join(ASSETS, 'i-utensils.png'),
  roof: path.join(ASSETS, 'i-roof.png'),
  layers: path.join(ASSETS, 'i-layers.png'),
  roller: path.join(ASSETS, 'i-roller.png')
};

var COLOR = {
  primary: '#3F4A32',
  primaryDark: '#2C3423',
  primarySoft: '#7C8863',
  sand: '#F6F4EC',
  sandDeep: '#EEEADA',
  ink: '#14150F',
  inkSoft: '#5B5D4F',
  inkFaint: '#6E7062',
  line: '#E7E3D3',
  white: '#FFFFFF',
  riskHigh: '#6B3A2A',
  riskMid: '#7A5C2E',
  riskLow: '#3F4A32'
};

var PAGE = { width: 595.28, height: 841.89 };
var MARGIN = 48;
var CONTENT_W = PAGE.width - MARGIN * 2;
var FOOTER_Y = PAGE.height - 40;
var CONTENT_BOTTOM = FOOTER_Y - 18;
var GAP = 10;

function fmtDate(d) {
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function safeIcon(doc, key, x, y, size) {
  if (!key || !ICON[key]) return;
  try { doc.image(ICON[key], x, y, { width: size, height: size }); } catch (e) { /* missing asset */ }
}

function header(doc) {
  var y = 30;
  doc.save();
  doc.fillColor(COLOR.primary);
  doc.rect(MARGIN, y + 6, 3.2, 7).fill(COLOR.primary);
  doc.rect(MARGIN + 5, y + 3, 3.2, 10).fill(COLOR.primary);
  doc.rect(MARGIN + 10, y, 3.2, 13).fill(COLOR.primary);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.ink)
    .text('ELYAN', MARGIN + 18, y - 1, { characterSpacing: 0.3 });
  doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkFaint)
    .text('Persoonlijk renovatierapport', MARGIN, y - 1, { width: CONTENT_W, align: 'right' });
  doc.moveTo(MARGIN, y + 20).lineTo(PAGE.width - MARGIN, y + 20).lineWidth(0.75).strokeColor(COLOR.line).stroke();
  doc.y = y + 28;
}

function footer(doc, pageNum) {
  var oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  var y = FOOTER_Y - 4;
  doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y).lineWidth(0.75).strokeColor(COLOR.line).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
    .text('Indicatief rapport — elyan.info@gmail.com', MARGIN, y + 8, { width: CONTENT_W - 60, lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
    .text('Pagina ' + String(pageNum), MARGIN, y + 8, { width: CONTENT_W, align: 'right', lineBreak: false });
  doc.page.margins.bottom = oldBottom;
}

function ensureSpace(doc, needed, pageNum) {
  if (doc.y + needed > CONTENT_BOTTOM) {
    footer(doc, pageNum.n);
    doc.addPage();
    pageNum.n++;
    header(doc);
    return true;
  }
  return false;
}

function eyebrow(doc, text) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.primary)
    .text(String(text).toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.1 });
  doc.y += 4;
}

function sectionTitle(doc, iconKey, text, pageNum, opts) {
  opts = opts || {};
  ensureSpace(doc, 36, pageNum);
  var size = opts.iconSize || 14;
  var yStart = doc.y;
  safeIcon(doc, iconKey, MARGIN, yStart - 1, size);
  doc.font('Helvetica-Bold').fontSize(opts.fontSize || 13).fillColor(COLOR.ink)
    .text(text, MARGIN + (iconKey ? size + 8 : 0), yStart, { width: CONTENT_W - (iconKey ? size + 8 : 0) });
  doc.y = Math.max(doc.y, yStart + size) + (opts.marginBottom !== undefined ? opts.marginBottom : 8);
}

function bodyText(doc, text, pageNum) {
  ensureSpace(doc, 28, pageNum);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
    .text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
  doc.y += 6;
}

function sandCard(doc, lines, pageNum, minH) {
  var pad = 12;
  var textW = CONTENT_W - pad * 2;
  var h = pad;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9.5);
    h += doc.heightOfString(line.text, { width: textW, lineGap: 2 }) + (idx < lines.length - 1 ? 5 : 0);
  });
  h += pad;
  if (minH) h = Math.max(h, minH);
  ensureSpace(doc, h + 8, pageNum);
  var startY = doc.y;
  doc.roundedRect(MARGIN, startY, CONTENT_W, h, 8).fill(COLOR.sand);
  var y = startY + pad;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9.5)
      .fillColor(line.color || COLOR.inkSoft)
      .text(line.text, MARGIN + pad, y, { width: textW, lineGap: 2 });
    y = doc.y + (idx < lines.length - 1 ? 5 : 0);
  });
  doc.y = startY + h + GAP;
}

function bulletList(doc, items, pageNum, iconKey) {
  iconKey = iconKey || 'info';
  var iconSize = 10;
  items.forEach(function (item) {
    ensureSpace(doc, 28, pageNum);
    var yTop = doc.y;
    safeIcon(doc, iconKey, MARGIN, yTop + 1, iconSize);
    doc.font('Helvetica').fontSize(9.2).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + iconSize + 8, yTop, { width: CONTENT_W - iconSize - 8, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + iconSize) + 6;
  });
}

function numberedList(doc, items, pageNum) {
  items.forEach(function (item, i) {
    ensureSpace(doc, 34, pageNum);
    var yTop = doc.y;
    var bubble = 16;
    doc.circle(MARGIN + bubble / 2, yTop + bubble / 2, bubble / 2).fill(COLOR.primary);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.white)
      .text(String(i + 1), MARGIN, yTop + bubble / 2 - 4.5, { width: bubble, align: 'center' });
    doc.font('Helvetica').fontSize(9.2).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + bubble + 9, yTop + 1, { width: CONTENT_W - bubble - 9, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + bubble) + 7;
  });
}

function metaGrid(doc, cells, pageNum) {
  var boxW = (CONTENT_W - 10) / 2;
  var boxH = 44;
  var i = 0;
  while (i < cells.length) {
    ensureSpace(doc, boxH + 8, pageNum);
    var rowY = doc.y;
    for (var col = 0; col < 2 && i < cells.length; col++, i++) {
      var m = cells[i];
      var x = MARGIN + col * (boxW + 10);
      doc.roundedRect(x, rowY, boxW, boxH, 7).fill(COLOR.sand);
      doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
        .text(String(m.label).toUpperCase(), x + 10, rowY + 9, { characterSpacing: 0.5 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
        .text(String(m.value), x + 10, rowY + 23, { width: boxW - 20 });
    }
    doc.y = rowY + boxH + 8;
  }
}

function drawBudgetBars(doc, r, pageNum) {
  var rows = [
    { label: 'Materiaal', amt: r.amounts.materiaal, pct: r.split.materiaal },
    { label: 'Arbeid', amt: r.amounts.arbeid, pct: r.split.arbeid },
    { label: 'Overige', amt: r.amounts.overige, pct: r.split.overige }
  ];
  rows.forEach(function (row) {
    ensureSpace(doc, 34, pageNum);
    var yTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink).text(row.label, MARGIN, yTop);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.primary)
      .text(pricing.fmtEUR(row.amt) + '  (' + Math.round(row.pct * 100) + '%)', MARGIN, yTop, { width: CONTENT_W, align: 'right' });
    doc.y = yTop + 13;
    doc.roundedRect(MARGIN, doc.y, CONTENT_W, 6, 3).fill(COLOR.sandDeep);
    doc.roundedRect(MARGIN, doc.y, Math.max(4, CONTENT_W * row.pct), 6, 3).fill(COLOR.primary);
    doc.y += 14;
  });
}

function costTable(doc, r, pageNum) {
  var rows = (r.costBreakdown || []).filter(function (it) { return it.amount > 0; });
  var col = { label: 0, mat: 210, lab: 275, oth: 340, tot: 405 };
  var headerH = 22;

  ensureSpace(doc, headerH + 30, pageNum);
  var hy = doc.y;
  doc.roundedRect(MARGIN, hy, CONTENT_W, headerH, 4).fill(COLOR.primaryDark);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.sand);
  doc.text('WERKPAKKET', MARGIN + 8, hy + 7);
  doc.text('MATERIAAL', MARGIN + col.mat, hy + 7, { width: 60, align: 'right' });
  doc.text('ARBEID', MARGIN + col.lab, hy + 7, { width: 60, align: 'right' });
  doc.text('OVERIGE', MARGIN + col.oth, hy + 7, { width: 60, align: 'right' });
  doc.text('TOTAAL', MARGIN + col.tot, hy + 7, { width: CONTENT_W - col.tot - 8, align: 'right' });
  doc.y = hy + headerH + 2;

  rows.forEach(function (it, idx) {
    ensureSpace(doc, 20, pageNum);
    var y = doc.y;
    if (idx % 2 === 0) doc.rect(MARGIN, y - 2, CONTENT_W, 18).fill(COLOR.sand);
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft)
      .text(it.label, MARGIN + 8, y, { width: col.mat - 12 });
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.ink)
      .text(pricing.fmtEUR(it.material || 0), MARGIN + col.mat, y, { width: 60, align: 'right' })
      .text(pricing.fmtEUR(it.labour || 0), MARGIN + col.lab, y, { width: 60, align: 'right' })
      .text(pricing.fmtEUR(it.other || 0), MARGIN + col.oth, y, { width: 60, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.ink)
      .text(pricing.fmtEUR(it.amount), MARGIN + col.tot, y, { width: CONTENT_W - col.tot - 8, align: 'right' });
    doc.y = y + 17;
  });

  ensureSpace(doc, 70, pageNum);
  doc.y += 4;
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y).lineWidth(0.6).strokeColor(COLOR.line).stroke();
  doc.y += 8;
  var totals = [
    { label: 'Totaal excl. btw', value: pricing.fmtEUR(r.subtotalExVat || r.price), bold: true },
    { label: 'BTW ' + (r.vatLabel || ''), value: pricing.fmtEUR(r.vatAmount || 0), bold: false },
    { label: 'Indicatief totaal incl. btw', value: pricing.fmtEUR(r.totalInclVat || r.price), bold: true }
  ];
  totals.forEach(function (t) {
    doc.font(t.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(COLOR.ink)
      .text(t.label, MARGIN, doc.y);
    doc.font(t.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(COLOR.primary)
      .text(t.value, MARGIN, doc.y, { width: CONTENT_W, align: 'right' });
    doc.y += 16;
  });
  doc.y += 4;
}

function buildReportPdf(data) {
  return new Promise(function (resolve, reject) {
    try {
      var cat = pricing.CATEGORIES[data.type];
      var prov = pricing.PROVINCES[data.province];
      var r = data.result;
      var answers = data.answers || {
        size: data.size, level: data.level, province: data.province, notes: data.notes
      };
      if (!answers.province) answers.province = data.province;
      if (!answers.size) answers.size = data.size;
      if (!answers.level) answers.level = data.level;

      var pack = insightsLib.buildInsights(data.type, answers, r, pricing);
      var nextSteps = insightsLib.buildNextSteps(data.type, answers, r, pricing);
      var reportId = 'EL-' + String(Date.now()).slice(-8);
      var catIconKey = { 'i-bath': 'bath', 'i-utensils': 'utensils', 'i-roof': 'roof', 'i-layers': 'layers', 'i-roller': 'roller' }[cat.icon] || 'target';
      var lp = r.labourPlan || {};

      var doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: 52, left: MARGIN, right: MARGIN },
        info: {
          Title: 'ELYAN Renovatierapport — ' + cat.label,
          Author: 'ELYAN',
          Subject: 'Persoonlijke renovatie-inschatting voor ' + data.email
        }
      });
      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var pageNum = { n: 1 };

      /* ===== COVER ===== */
      doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.primaryDark);
      doc.save();
      doc.opacity(0.4);
      doc.circle(PAGE.width - 40, 80, 140).fill(COLOR.primarySoft);
      doc.opacity(0.18);
      doc.circle(30, PAGE.height - 40, 110).fill(COLOR.sand);
      doc.restore();

      var lx = MARGIN, ly = 72;
      doc.rect(lx, ly + 16, 8, 20).fill(COLOR.sand);
      doc.rect(lx + 12, ly + 8, 8, 28).fill(COLOR.sand);
      doc.rect(lx + 24, ly, 8, 36).fill(COLOR.sand);
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOR.white)
        .text('ELYAN', lx + 44, ly + 10, { characterSpacing: 0.6 });

      doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
        .text('JOUW PERSOONLIJK RENOVATIERAPPORT', MARGIN, 190, { characterSpacing: 1.3 });
      doc.font('Helvetica-Bold').fontSize(30).fillColor(COLOR.white)
        .text('Jouw ' + cat.resultNoun, MARGIN, 212, { width: CONTENT_W * 0.92 });
      doc.font('Helvetica').fontSize(14).fillColor(COLOR.sandDeep)
        .text(prov.label + '  ·  ' + fmtDate(new Date()), MARGIN, doc.y + 8);
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.sand)
        .text(pack.fingerprint, MARGIN, doc.y + 14, { width: CONTENT_W * 0.9, lineGap: 3 });

      var teaserY = 400;
      doc.roundedRect(MARGIN, teaserY, CONTENT_W, 100, 10).fill(COLOR.primary);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.sandDeep)
        .text('VERWACHT BUDGET (EXCL. BTW)', MARGIN + 20, teaserY + 16, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(26).fillColor(COLOR.white)
        .text(pricing.fmtEUR(r.price), MARGIN + 20, teaserY + 36);
      doc.font('Helvetica').fontSize(11).fillColor(COLOR.sandDeep)
        .text('Vork  ' + pricing.fmtEUR(r.low) + '  –  ' + pricing.fmtEUR(r.high), MARGIN + 20, teaserY + 70);

      doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
        .text('Rapport-ID ' + reportId + '  ·  Voor ' + data.email, MARGIN, PAGE.height - 88, { width: CONTENT_W });
      doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.primarySoft)
        .text('Belgische marktprijzen ' + (r.asOf || '2026') + '  ·  Indicatief, geen bindende offerte', MARGIN, PAGE.height - 68);

      /* ===== CONTENT FLOW ===== */
      doc.addPage(); pageNum.n++;
      header(doc);

      // 1. Executive summary
      eyebrow(doc, 'Executive summary');
      sectionTitle(doc, 'target', 'In één oogopslag', pageNum);

      doc.roundedRect(MARGIN, doc.y, CONTENT_W, 78, 10).fill(COLOR.primary);
      var hy = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.sandDeep)
        .text('VERWACHT BUDGET EXCL. BTW', MARGIN + 18, hy + 12, { characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOR.white)
        .text(pricing.fmtEUR(r.price), MARGIN + 18, hy + 28);
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
        .text(pricing.fmtEUR(r.low) + '  –  ' + pricing.fmtEUR(r.high) + '   ·   ' + pricing.fmtEUR(r.perM2) + '/m²', MARGIN + 18, hy + 56);
      doc.y = hy + 88;

      metaGrid(doc, [
        { label: 'Oppervlakte', value: (answers.size || data.size) + ' m²' },
        { label: 'Doorlooptijd', value: r.weeksLow + '–' + r.weeksHigh + ' weken' },
        { label: 'Manuren', value: String(r.labourHours || lp.labourHours || '–') + ' u' },
        { label: 'Ploeg / werkdagen', value: (r.crewSize || lp.crewSize || '–') + ' / ' + (r.workDays || lp.workDays || '–') + ' d' },
        { label: 'Confidence', value: r.confidence || 'indicatief' },
        { label: 'BTW-scenario', value: r.vatLabel || 'indicatief' }
      ], pageNum);

      drawBudgetBars(doc, r, pageNum);

      ensureSpace(doc, 80, pageNum);
      eyebrow(doc, 'Persoonlijk');
      sectionTitle(doc, 'bulb', 'De 3 belangrijkste conclusies', pageNum, { marginBottom: 6 });
      numberedList(doc, pack.conclusions, pageNum);

      if (data.notes) {
        ensureSpace(doc, 50, pageNum);
        sandCard(doc, [
          { text: 'Jouw opmerkingen', bold: true, color: COLOR.ink, size: 10 },
          { text: data.notes }
        ], pageNum);
      }

      // 2. Cost origin
      ensureSpace(doc, 120, pageNum);
      eyebrow(doc, 'Kostentransparantie');
      sectionTitle(doc, 'euro', 'Waar komt jouw prijs vandaan?', pageNum);
      bodyText(doc, 'Alle bedragen excl. btw, afgerond. Opgebouwd uit werkpakketten — geen vaste percentages.', pageNum);
      costTable(doc, r, pageNum);

      // 3. Labour plan
      if ((r.labourHours || 0) > 0) {
        ensureSpace(doc, 100, pageNum);
        eyebrow(doc, 'Uitvoering');
        sectionTitle(doc, 'clock', 'Jouw arbeidsplan', pageNum);
        metaGrid(doc, [
          { label: 'Geschatte manuren', value: (lp.labourHours || r.labourHours) + ' u' },
          { label: 'Geschatte ploeg', value: String(lp.crewSize || r.crewSize) + ' personen' },
          { label: 'Effectieve werkdagen', value: String(lp.workDays || r.workDays) + ' dagen' },
          { label: 'Effectief uurtarief', value: pricing.fmtEUR(lp.effectiveHourlyRate || r.effectiveHourlyRate) + '/u' }
        ], pageNum);
        bodyText(doc, 'Productieve uren per dag: ' + (lp.productiveHoursPerDay || 6.5) + ' (niet 8 factureerbare uren). Kalenderdoorlooptijd is langer door levertijden en planning.', pageNum);
        if (lp.topLabourPackages && lp.topLabourPackages.length) {
          bodyText(doc, 'Waar de meeste manuren naartoe gaan:', pageNum);
          lp.topLabourPackages.slice(0, 5).forEach(function (p) {
            ensureSpace(doc, 18, pageNum);
            doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft).text(p.label, MARGIN, doc.y);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
              .text(Math.round(p.hours) + ' u', MARGIN, doc.y, { width: CONTENT_W, align: 'right' });
            doc.y += 15;
          });
          doc.y += 4;
        }
      }

      // 4. Cost drivers
      if (r.drivers && r.drivers.length) {
        ensureSpace(doc, 90, pageNum);
        eyebrow(doc, 'Impact');
        sectionTitle(doc, 'info', 'Jouw belangrijkste kostendrijvers', pageNum);
        r.drivers.forEach(function (d) {
          ensureSpace(doc, 40, pageNum);
          var y = doc.y;
          doc.roundedRect(MARGIN, y, CONTENT_W, 36, 7).fill(COLOR.sand);
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink)
            .text(d.text, MARGIN + 12, y + 8, { width: CONTENT_W - 110 });
          if (d.amount) {
            var sign = d.amount > 0 ? '+' : '−';
            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.primary)
              .text(sign + pricing.fmtEUR(Math.abs(d.amount)), MARGIN + 12, y + 8, { width: CONTENT_W - 24, align: 'right' });
          }
          if (d.reason) {
            doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkFaint)
              .text(d.reason, MARGIN + 12, y + 22, { width: CONTENT_W - 24 });
          }
          doc.y = y + 42;
        });
      }

      // 5. Market position
      ensureSpace(doc, 110, pageNum);
      eyebrow(doc, 'Markt 2026');
      sectionTitle(doc, 'target', 'Jouw project vs. Belgische markt', pageNum);
      var bm = r.marketBenchmark || { low: r.peerLow, high: r.peerHigh };
      var posLabel = r.marketPosition === 'lager' ? 'Lager dan typische band'
        : r.marketPosition === 'hoger' ? 'Hoger dan typische band' : 'Marktconform';
      sandCard(doc, [
        { text: posLabel, bold: true, color: COLOR.ink, size: 11 },
        { text: 'Belgische benchmark: ' + pricing.fmtEUR(bm.low) + ' – ' + pricing.fmtEUR(bm.high) + ' excl. btw.' },
        { text: 'Jouw verwachte prijs: ' + pricing.fmtEUR(r.price) + ' (' + pricing.fmtEUR(r.perM2) + '/m²).' },
        { text: r.marketPosition === 'hoger'
          ? 'Hoger betekent hier meestal meer scope, bereikbaarheid of materiaalniveau — niet automatisch een te dure offerte.'
          : r.marketPosition === 'lager'
            ? 'Lager komt vaak door beperkte scope of efficiënte keuzes (zelfde layout, basisafwerking).'
            : 'Je zit binnen de gangbare Belgische mid-market range voor vergelijkbare projecten.' }
      ], pageNum);

      // 6. Included
      ensureSpace(doc, 100, pageNum);
      eyebrow(doc, 'Scope');
      sectionTitle(doc, 'check', 'Wat is inbegrepen?', pageNum);
      bulletList(doc, pack.included, pageNum, 'check');
      if (pack.confirmItems && pack.confirmItems.length) {
        doc.y += 4;
        bodyText(doc, 'Te bevestigen in offerte:', pageNum);
        bulletList(doc, pack.confirmItems, pageNum, 'info');
      }

      // 7. Assumptions
      ensureSpace(doc, 80, pageNum);
      eyebrow(doc, 'Transparantie');
      sectionTitle(doc, 'info', 'Aannames van de raming', pageNum);
      bulletList(doc, pack.assumptions, pageNum, 'info');

      // 8. Risks
      ensureSpace(doc, 90, pageNum);
      eyebrow(doc, 'Risico\'s');
      sectionTitle(doc, 'shield', 'Risicoanalyse', pageNum);
      if (pack.riskRows && pack.riskRows.length) {
        pack.riskRows.forEach(function (row) {
          ensureSpace(doc, 42, pageNum);
          var y = doc.y;
          doc.roundedRect(MARGIN, y, CONTENT_W, 38, 7).fill(COLOR.sand);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink).text(row.risk, MARGIN + 12, y + 7);
          var impactColor = row.impact === 'HOOG' ? COLOR.riskHigh : row.impact === 'MIDDEL' ? COLOR.riskMid : COLOR.riskLow;
          doc.font('Helvetica-Bold').fontSize(8).fillColor(impactColor)
            .text(row.impact, MARGIN + 12, y + 7, { width: CONTENT_W - 24, align: 'right' });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft)
            .text(row.check, MARGIN + 12, y + 22, { width: CONTENT_W - 24 });
          doc.y = y + 44;
        });
      } else if (pack.risks.length) {
        bulletList(doc, pack.risks, pageNum, 'shield');
      } else {
        bodyText(doc, 'Geen bijzondere hoog-risico signalen op basis van jouw antwoorden. Blijf wel standaard werfrisico\'s checken.', pageNum);
      }

      // 9. Buffer
      ensureSpace(doc, 70, pageNum);
      eyebrow(doc, 'Buffer');
      sectionTitle(doc, 'euro', 'Budgetbuffer', pageNum);
      var pctL = r.contingencyPct ? Math.round(r.contingencyPct.low * 100) : 10;
      var pctH = r.contingencyPct ? Math.round(r.contingencyPct.high * 100) : 15;
      sandCard(doc, [
        { text: 'Aanbevolen buffer: ' + pricing.fmtEUR(r.contingency) + ' (' + pctL + '–' + pctH + '%)', bold: true, color: COLOR.ink, size: 10 },
        { text: 'De buffer hangt af van onzekerheid in jouw antwoorden (bijv. onbekende ondergrond, asbest, leidingen). Dit is geen verborgen opslag in de richtprijs, maar een advies erbovenop.' }
      ], pageNum);

      // 10. Timeline
      if (pack.timeline && pack.timeline.length) {
        ensureSpace(doc, 90, pageNum);
        eyebrow(doc, 'Planning');
        sectionTitle(doc, 'clock', 'Renovatietijdlijn', pageNum);
        bodyText(doc, 'Onderscheid: effectieve werkdagen vs. kalenderdoorlooptijd (' + r.weeksLow + '–' + r.weeksHigh + ' weken).', pageNum);
        pack.timeline.forEach(function (step, idx) {
          ensureSpace(doc, 28, pageNum);
          var y = doc.y;
          doc.circle(MARGIN + 6, y + 7, 5).fill(COLOR.primary);
          if (idx < pack.timeline.length - 1) {
            doc.moveTo(MARGIN + 6, y + 13).lineTo(MARGIN + 6, y + 26).lineWidth(1.2).strokeColor(COLOR.line).stroke();
          }
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink)
            .text(step.phase, MARGIN + 20, y);
          doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkSoft)
            .text('±' + step.days + ' werkdag' + (step.days === 1 ? '' : 'en') + ' — ' + step.note, MARGIN + 20, y + 13, { width: CONTENT_W - 20 });
          doc.y = y + 28;
        });
      }

      // 11. Savings
      if (pack.savings && pack.savings.length) {
        ensureSpace(doc, 70, pageNum);
        eyebrow(doc, 'Besparen');
        sectionTitle(doc, 'bulb', 'Bespaarkansen voor jouw project', pageNum);
        bulletList(doc, pack.savings.map(function (s) { return s.text; }), pageNum, 'bulb');
      }

      // 12. Quote check
      if (pack.quoteChecks && pack.quoteChecks.length) {
        ensureSpace(doc, 90, pageNum);
        eyebrow(doc, 'Offertes');
        sectionTitle(doc, 'check', 'Offerte-check', pageNum);
        bodyText(doc, 'Controleer of elke aannemersofferte minstens dit vermeldt:', pageNum);
        pack.quoteChecks.forEach(function (c) {
          ensureSpace(doc, 16, pageNum);
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft)
            .text('☐  ' + c, MARGIN, doc.y);
          doc.y += 14;
        });
        doc.y += 4;
      }

      // 13. Questions
      if (pack.contractorQuestions && pack.contractorQuestions.length) {
        ensureSpace(doc, 90, pageNum);
        eyebrow(doc, 'Gesprek');
        sectionTitle(doc, 'info', 'Vragen aan de aannemer', pageNum);
        numberedList(doc, pack.contractorQuestions, pageNum);
      }

      // 14. Red flags
      ensureSpace(doc, 80, pageNum);
      eyebrow(doc, 'Waarschuwingen');
      sectionTitle(doc, 'shield', 'Rode vlaggen', pageNum);
      bodyText(doc, 'Geen juridisch advies — wel signalen om offertes kritisch te lezen:', pageNum);
      bulletList(doc, pack.redFlags, pageNum, 'shield');

      // 15. VAT
      ensureSpace(doc, 70, pageNum);
      eyebrow(doc, 'BTW');
      sectionTitle(doc, 'euro', 'Indicatief btw-scenario', pageNum);
      sandCard(doc, [
        { text: r.vatLabel || 'Indicatief', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Subtotaal excl. btw: ' + pricing.fmtEUR(r.subtotalExVat || r.price) },
        { text: 'BTW-bedrag: ' + pricing.fmtEUR(r.vatAmount || 0) },
        { text: 'Indicatief incl. btw: ' + pricing.fmtEUR(r.totalInclVat || r.price) },
        { text: r.vatDisclaimer || pack.btwTip, size: 8.5 }
      ], pageNum);

      // 16. Premies
      ensureSpace(doc, 90, pageNum);
      eyebrow(doc, 'Premies');
      sectionTitle(doc, 'gift', 'Mogelijke premies', pageNum);
      (r.premies || []).forEach(function (pr) {
        sandCard(doc, [
          { text: pr.scheme + ' — ' + (pr.relevance === 'mogelijk' ? 'mogelijk relevant' : 'beperkt relevant'), bold: true, color: COLOR.ink, size: 10 },
          { text: pr.reason },
          { text: 'Ontbrekend in ELYAN: ' + (pr.missing || []).join('; '), size: 8.5 },
          { text: 'Officieel: ' + pr.officialUrl + (pr.regulationDate ? '  ·  Regelgeving sinds ' + pr.regulationDate : '') + '  ·  Gecontroleerd ' + (pr.checkedAt || ''), size: 8 }
        ], pageNum);
      });
      bodyText(doc, 'ELYAN berekent geen exact premiebedrag zonder inkomen en eigendomstype.', pageNum);

      // 17–18. Next steps + decision + disclaimer as a tight closing block
      var closingNeeded = 320;
      ensureSpace(doc, closingNeeded, pageNum);
      eyebrow(doc, 'Actie');
      sectionTitle(doc, 'arrowRight', 'Volgende stappen', pageNum);
      numberedList(doc, nextSteps, pageNum);

      // Keep decision + disclaimer + contact together when possible
      var endBlockH = 210;
      ensureSpace(doc, endBlockH, pageNum);
      eyebrow(doc, 'Besluit');
      sectionTitle(doc, 'target', 'ELYAN decision summary', pageNum);
      var topRisk = (pack.riskRows[0] && pack.riskRows[0].risk) || (pack.risks[0] || 'Standaard werfrisico\'s');
      var topSave = (pack.savings[0] && pack.savings[0].text) || 'Vergelijk 3 offertes op identieke scope.';
      sandCard(doc, [
        { text: 'Verwacht budget: ' + pricing.fmtEUR(r.price) + ' excl. btw', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Veilig budget (met buffer): ' + pricing.fmtEUR((r.price || 0) + (r.contingency || 0)) },
        { text: 'Belangrijkste risico: ' + topRisk },
        { text: 'Belangrijkste bespaarkans: ' + topSave },
        { text: 'Eerste volgende stap: ' + (nextSteps[0] || 'Vraag drie vergelijkbare offertes.') }
      ], pageNum);

      ensureSpace(doc, 100, pageNum);
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y).lineWidth(0.75).strokeColor(COLOR.line).stroke();
      doc.y += 8;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink).text('Disclaimer', MARGIN, doc.y);
      doc.y += 5;
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
        .text('Dit rapport is indicatief en gebaseerd op Belgische mid-market componentprijzen (' + (r.asOf || '2026') + ') en jouw antwoorden. Het vervangt geen offerte op maat en heeft geen contractuele waarde. Vraag steeds een offerte bij een erkende aannemer. ELYAN is niet aansprakelijk voor beslissingen op basis van dit rapport.', MARGIN, doc.y, { width: CONTENT_W, lineGap: 1.5 });
      doc.y += 10;

      ensureSpace(doc, 52, pageNum);
      var contactY = doc.y;
      doc.roundedRect(MARGIN, contactY, CONTENT_W, 48, 8).fill(COLOR.primary);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.white)
        .text('Vragen over dit rapport?', MARGIN + 16, contactY + 11);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
        .text('Mail elyan.info@gmail.com — we helpen je graag verder.', MARGIN + 16, contactY + 28);
      doc.y = contactY + 56;

      footer(doc, pageNum.n);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildReportPdf: buildReportPdf };
