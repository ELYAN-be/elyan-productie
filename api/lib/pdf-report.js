/* ============================================================
   ELYAN — Premium PDF-renovatierapport (pdfkit)
   Visueel premium, persoonlijk, gevuld met inzichten.
   Geen lege pagina's — elke pagina verdient zijn plaats.
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
  checkWhite: path.join(ASSETS, 'i-check-white.png'),
  shield: path.join(ASSETS, 'i-shield.png'),
  arrowRight: path.join(ASSETS, 'i-arrow-right.png'),
  bath: path.join(ASSETS, 'i-bath.png'),
  utensils: path.join(ASSETS, 'i-utensils.png'),
  roof: path.join(ASSETS, 'i-roof.png'),
  layers: path.join(ASSETS, 'i-layers.png'),
  roller: path.join(ASSETS, 'i-roller.png'),
  area: path.join(ASSETS, 'i-area.png'),
  pin: path.join(ASSETS, 'i-pin.png')
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
  white: '#FFFFFF'
};

var PAGE = { width: 595.28, height: 841.89 };
var MARGIN = 48;
var CONTENT_W = PAGE.width - MARGIN * 2;
var FOOTER_Y = PAGE.height - 40;
var CONTENT_BOTTOM = FOOTER_Y - 16;

function fmtDate(d) {
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
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
  doc.y = y + 32;
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

function sectionTitle(doc, iconKey, text, opts) {
  opts = opts || {};
  var size = opts.iconSize || 15;
  var yStart = doc.y;
  if (iconKey && ICON[iconKey]) {
    try { doc.image(ICON[iconKey], MARGIN, yStart - 1, { width: size, height: size }); } catch (e) { /* ignore missing */ }
  }
  doc.font('Helvetica-Bold').fontSize(opts.fontSize || 14).fillColor(COLOR.ink)
    .text(text, MARGIN + (iconKey ? size + 9 : 0), yStart, { width: CONTENT_W - (iconKey ? size + 9 : 0) });
  doc.y = Math.max(doc.y, yStart + size) + (opts.marginBottom !== undefined ? opts.marginBottom : 10);
}

function eyebrow(doc, text) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.primary)
    .text(String(text).toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.1 });
  doc.y += 5;
}

function bulletList(doc, items, opts, pageNum) {
  opts = opts || {};
  var iconKey = opts.icon || 'info';
  var iconSize = 11;
  items.forEach(function (item) {
    ensureSpace(doc, 36, pageNum);
    var yTop = doc.y;
    if (ICON[iconKey]) {
      try { doc.image(ICON[iconKey], MARGIN, yTop + 1, { width: iconSize, height: iconSize }); } catch (e) { /* */ }
    }
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + iconSize + 9, yTop, { width: CONTENT_W - iconSize - 9, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + iconSize) + 8;
  });
}

function numberedList(doc, items, pageNum) {
  items.forEach(function (item, i) {
    ensureSpace(doc, 40, pageNum);
    var yTop = doc.y;
    var bubble = 17;
    doc.circle(MARGIN + bubble / 2, yTop + bubble / 2, bubble / 2).fill(COLOR.primary);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.white)
      .text(String(i + 1), MARGIN, yTop + bubble / 2 - 5, { width: bubble, align: 'center' });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + bubble + 10, yTop + 1, { width: CONTENT_W - bubble - 10, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + bubble) + 10;
  });
}

function sandBox(doc, lines, minH) {
  var startY = doc.y;
  var pad = 14;
  var textW = CONTENT_W - pad * 2;
  var h = pad;
  lines.forEach(function (line, idx) {
    var font = line.bold ? 'Helvetica-Bold' : 'Helvetica';
    var size = line.size || 9.5;
    doc.font(font).fontSize(size);
    h += doc.heightOfString(line.text, { width: textW, lineGap: 2 }) + (idx < lines.length - 1 ? 6 : 0);
  });
  h += pad;
  if (minH) h = Math.max(h, minH);

  doc.roundedRect(MARGIN, startY, CONTENT_W, h, 8).fill(COLOR.sand);
  var y = startY + pad;
  lines.forEach(function (line, idx) {
    var font = line.bold ? 'Helvetica-Bold' : 'Helvetica';
    var size = line.size || 9.5;
    var color = line.color || COLOR.inkSoft;
    doc.font(font).fontSize(size).fillColor(color)
      .text(line.text, MARGIN + pad, y, { width: textW, lineGap: 2 });
    y = doc.y + (idx < lines.length - 1 ? 6 : 0);
  });
  doc.y = startY + h + 10;
}

function drawPriceHero(doc, r) {
  var y = doc.y;
  var h = 132;
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 12).fill(COLOR.primary);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.sandDeep)
    .text('GESCHATTE PRIJSVORK', MARGIN + 22, y + 18, { characterSpacing: 1 });

  doc.font('Helvetica-Bold').fontSize(28).fillColor(COLOR.white)
    .text(pricing.fmtEUR(r.low) + '  –  ' + pricing.fmtEUR(r.high), MARGIN + 22, y + 34, { width: CONTENT_W - 44 });

  doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
    .text('Richtprijs (midden van de vork): ' + pricing.fmtEUR(r.price), MARGIN + 22, y + 72);

  try { doc.image(ICON.clock, MARGIN + 22, y + 96, { width: 12, height: 12 }); } catch (e) { /* */ }
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.white)
    .text('Geschatte duurtijd: ' + r.weeksLow + ' – ' + r.weeksHigh + ' weken', MARGIN + 40, y + 95);

  doc.y = y + h + 12;
}

function buildReportPdf(data) {
  return new Promise(function (resolve, reject) {
    try {
      var cat = pricing.CATEGORIES[data.type];
      var prov = pricing.PROVINCES[data.province];
      var r = data.result;
      var answers = data.answers || {
        size: data.size,
        level: data.level,
        province: data.province,
        notes: data.notes
      };
      if (!answers.province) answers.province = data.province;
      if (!answers.size) answers.size = data.size;
      if (!answers.level) answers.level = data.level;

      var region = pricing.REGION_LINKS[prov.region];
      var pack = insightsLib.buildInsights(data.type, answers, r, pricing);
      var nextSteps = insightsLib.buildNextSteps(data.type, answers, r, pricing);
      var summaryRows = questionsLib.summarizeAnswers(data.type, answers);
      var catIconKey = { 'i-bath': 'bath', 'i-utensils': 'utensils', 'i-roof': 'roof', 'i-layers': 'layers', 'i-roller': 'roller' }[cat.icon] || 'target';

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
      /* ========== COVER ========== */
      doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.primaryDark);
      doc.save();
      doc.opacity(0.45);
      doc.circle(PAGE.width - 40, 80, 140).fill(COLOR.primarySoft);
      doc.opacity(0.2);
      doc.circle(30, PAGE.height - 40, 110).fill(COLOR.sand);
      doc.restore();

      var lx = MARGIN, ly = 72;
      doc.rect(lx, ly + 16, 8, 20).fill(COLOR.sand);
      doc.rect(lx + 12, ly + 8, 8, 28).fill(COLOR.sand);
      doc.rect(lx + 24, ly, 8, 36).fill(COLOR.sand);
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOR.white)
        .text('ELYAN', lx + 44, ly + 10, { characterSpacing: 0.6 });

      doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
        .text('PERSOONLIJK RENOVATIERAPPORT', MARGIN, 200, { characterSpacing: 1.4 });

      doc.font('Helvetica-Bold').fontSize(32).fillColor(COLOR.white)
        .text('Jouw ' + cat.resultNoun, MARGIN, 222, { width: CONTENT_W * 0.92 });
      doc.font('Helvetica').fontSize(15).fillColor(COLOR.sandDeep)
        .text('in ' + prov.label, MARGIN, doc.y + 6);

      doc.font('Helvetica').fontSize(11).fillColor(COLOR.sand)
        .text(pack.fingerprint, MARGIN, doc.y + 18, { width: CONTENT_W * 0.9, lineGap: 3 });

      // Cover price teaser
      var teaserY = 430;
      doc.roundedRect(MARGIN, teaserY, CONTENT_W, 88, 10).fill(COLOR.primary);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.sandDeep)
        .text('JOUW GESCHATTE PRIJSVORK', MARGIN + 20, teaserY + 18, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR.white)
        .text(pricing.fmtEUR(r.low) + '  –  ' + pricing.fmtEUR(r.high), MARGIN + 20, teaserY + 38);

      doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
        .text('Opgesteld op ' + fmtDate(new Date()) + '  ·  Voor ' + data.email, MARGIN, PAGE.height - 90, { width: CONTENT_W });
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.primarySoft)
        .text('Belgische mid-market richtprijzen  ·  Indicatief, geen bindende offerte', MARGIN, PAGE.height - 70, { width: CONTENT_W });

      /* ========== PAGE 2 — SAMENVATTING ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'In één oogopslag');
      sectionTitle(doc, 'target', 'Projectsamenvatting', { marginBottom: 8 });

      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
        .text('Op basis van jouw antwoorden stelden we een realistische Belgische prijsvork op. We tonen bewust een bereik — geen schijnnauwkeurigheid.', MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
      doc.y += 14;

      drawPriceHero(doc, r);

      // Meta chips row
      var meta = [
        { label: 'Renovatie', value: cat.label },
        { label: 'Provincie', value: prov.label },
        { label: 'Oppervlakte', value: (answers.size || data.size) + ' m²' },
        { label: 'Afwerking', value: r.levelLabel || 'Standaard' }
      ];
      var boxW = (CONTENT_W - 12) / 2;
      var boxH = 48;
      meta.forEach(function (m, i) {
        var col = i % 2;
        var row = Math.floor(i / 2);
        var x = MARGIN + col * (boxW + 12);
        var y = doc.y + row * (boxH + 8);
        doc.roundedRect(x, y, boxW, boxH, 8).fill(COLOR.sand);
        doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
          .text(m.label.toUpperCase(), x + 12, y + 10, { characterSpacing: 0.6 });
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.ink)
          .text(m.value, x + 12, y + 24, { width: boxW - 24 });
      });
      doc.y += 2 * (boxH + 8) + 6;

      sandBox(doc, [
        { text: 'Waarom een prijsvork?', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Renovaties verschillen door werfomstandigheden, materiaalkeuze en aannemer. Jouw richtprijs is ' + pricing.fmtEUR(r.price) + ' (ca. ' + pricing.fmtEUR(r.perM2) + '/m²). Vergelijkbare projecten in ' + prov.label + ' liggen typisch tussen ' + pricing.fmtEUR(r.peerLow) + ' en ' + pricing.fmtEUR(r.peerHigh) + '. Betrouwbaarheid van deze inschatting: ' + r.confidence + '.' }
      ]);

      if (data.notes) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.inkFaint)
          .text('JOUW OPMERKINGEN', MARGIN, doc.y, { characterSpacing: 0.6 });
        doc.y += 4;
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(COLOR.inkSoft)
          .text(data.notes, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
        doc.y += 10;
      }

      footer(doc, pageNum.n);

      /* ========== PAGE 3 — JOUW ANTWOORDEN + KOSTENDRIJVERS ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'Jouw project');
      sectionTitle(doc, catIconKey, 'Wat je hebt aangegeven', { marginBottom: 8 });

      var showRows = summaryRows.slice(0, 14);
      showRows.forEach(function (row, idx) {
        ensureSpace(doc, 28, pageNum);
        var y = doc.y;
        if (idx % 2 === 0) {
          doc.rect(MARGIN, y - 3, CONTENT_W, 22).fill(COLOR.sand);
        }
        doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkFaint)
          .text(row.question.replace(/\?$/, ''), MARGIN + 8, y, { width: CONTENT_W * 0.55 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
          .text(row.label, MARGIN + CONTENT_W * 0.55, y, { width: CONTENT_W * 0.45 - 8, align: 'right' });
        doc.y = y + 20;
      });

      doc.y += 10;
      ensureSpace(doc, 80, pageNum);
      eyebrow(doc, 'Wat de prijs beïnvloedt');
      sectionTitle(doc, 'info', 'Belangrijkste kostendrijvers', { marginBottom: 8 });
      var driverTexts = (r.drivers || []).map(function (d) { return d.text; });
      if (!driverTexts.length) driverTexts = pack.insights.slice(0, 3);
      bulletList(doc, driverTexts, { icon: 'info' }, pageNum);

      footer(doc, pageNum.n);

      /* ========== PAGE 4 — KOSTENDETAIL ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'Budget');
      sectionTitle(doc, 'euro', 'Gedetailleerde kostenraming', { marginBottom: 6 });
      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
        .text('Uitsplitsing van de richtprijs ' + pricing.fmtEUR(r.price) + '. Bedragen zijn afgerond en bedoeld als gespreksbasis met aannemers.', MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
      doc.y += 12;

      var items = (r.lineItems || []).filter(function (it) { return it.amount > 0; });
      if (!items.length) {
        items = [
          { label: 'Materiaal', amount: Math.round(r.price * r.split.materiaal) },
          { label: 'Arbeid', amount: Math.round(r.price * r.split.arbeid) },
          { label: 'Afwerking & overige', amount: r.price - Math.round(r.price * r.split.materiaal) - Math.round(r.price * r.split.arbeid) }
        ];
      }

      items.forEach(function (it) {
        ensureSpace(doc, 22, pageNum);
        var y = doc.y;
        doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.inkSoft)
          .text(it.label, MARGIN, y, { width: CONTENT_W - 90 });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink)
          .text(pricing.fmtEUR(it.amount), MARGIN, y, { width: CONTENT_W, align: 'right' });
        doc.y = y + 16;
        doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y).lineWidth(0.4).strokeColor(COLOR.line).stroke();
        doc.y += 6;
      });

      doc.y += 4;
      ensureSpace(doc, 100, pageNum);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.inkFaint)
        .text('RICHTPRIJS', MARGIN, doc.y, { characterSpacing: 0.6 });
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.primary)
        .text(pricing.fmtEUR(r.price), MARGIN, doc.y, { width: CONTENT_W, align: 'right' });
      doc.y += 8;
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft)
        .text('Prijsvork: ' + pricing.fmtEUR(r.low) + ' – ' + pricing.fmtEUR(r.high), MARGIN, doc.y, { width: CONTENT_W, align: 'right' });
      doc.y += 16;

      // Summary bars
      var rows = [
        { label: 'Materiaal', pct: r.split.materiaal },
        { label: 'Arbeid', pct: r.split.arbeid },
        { label: 'Afwerking & overige', pct: r.split.overige }
      ];
      var running = 0;
      rows.forEach(function (row, i) {
        var amt = (i === rows.length - 1) ? (r.price - running) : Math.round(r.price * row.pct);
        running += amt;
        ensureSpace(doc, 36, pageNum);
        var yTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text(row.label, MARGIN, yTop);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.primary)
          .text(pricing.fmtEUR(amt) + '  (' + Math.round(row.pct * 100) + '%)', MARGIN, yTop, { width: CONTENT_W, align: 'right' });
        doc.y = yTop + 14;
        doc.roundedRect(MARGIN, doc.y, CONTENT_W, 7, 3.5).fill(COLOR.sandDeep);
        doc.roundedRect(MARGIN, doc.y, Math.max(6, CONTENT_W * row.pct), 7, 3.5).fill(COLOR.primary);
        doc.y += 16;
      });

      ensureSpace(doc, 50, pageNum);
      sandBox(doc, [
        { text: 'Aanbevolen buffer: ' + pricing.fmtEUR(r.contingency), bold: true, color: COLOR.ink, size: 10 },
        { text: 'Houd 10–15% extra vrij voor onvoorziene posten (ondergrond, leidingen, meerwerk). Zo vermijd je verrassingen tijdens de werf.' }
      ]);

      footer(doc, pageNum.n);

      /* ========== PAGE 5 — INZICHTEN & AANBEVELINGEN ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'Op maat van jouw antwoorden');
      sectionTitle(doc, 'bulb', 'Inzichten & aanbevelingen', { marginBottom: 8 });

      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('Belangrijke inzichten', MARGIN, doc.y);
      doc.y += 8;
      bulletList(doc, pack.insights, { icon: 'info' }, pageNum);

      if (pack.risks.length) {
        doc.y += 6;
        ensureSpace(doc, 60, pageNum);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('Aandachtspunten & risico’s', MARGIN, doc.y);
        doc.y += 8;
        bulletList(doc, pack.risks, { icon: 'shield' }, pageNum);
      }

      doc.y += 6;
      ensureSpace(doc, 60, pageNum);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('Praktische aanbevelingen', MARGIN, doc.y);
      doc.y += 8;
      bulletList(doc, pack.recommendations, { icon: 'check' }, pageNum);

      footer(doc, pageNum.n);

      /* ========== PAGE 6 — PLANNING + PREMIES ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'Planning');
      sectionTitle(doc, 'clock', 'Planning & timing', { marginBottom: 8 });
      bulletList(doc, pack.planning, { icon: 'clock' }, pageNum);

      doc.y += 10;
      ensureSpace(doc, 140, pageNum);
      eyebrow(doc, 'Financieel voordeel');
      sectionTitle(doc, 'gift', 'Premies & btw', { marginBottom: 8 });

      sandBox(doc, [
        { text: cat.premieNote, size: 9.5 },
        { text: pack.btwTip, size: 9.5 },
        { text: 'Officieel loket: ' + region.label, bold: true, color: COLOR.primary, size: 9.5 }
      ]);
      // clickable link near last text — approximate
      var linkY = doc.y - 28;
      doc.link(MARGIN + 14, linkY, 280, 14, region.url);

      doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR.inkFaint)
        .text('Premies en voorwaarden wijzigen regelmatig. Raadpleeg steeds het officiële loket van jouw regio.', MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
      doc.y += 14;

      ensureSpace(doc, 80, pageNum);
      eyebrow(doc, 'Besparen zonder kwaliteitsverlies');
      sectionTitle(doc, 'bulb', 'Praktische tips', { marginBottom: 8 });
      bulletList(doc, pricing.PRAKTISCHE_TIPS, { icon: 'bulb' }, pageNum);

      footer(doc, pageNum.n);

      /* ========== PAGE 7 — NEXT STEPS ========== */
      doc.addPage(); pageNum.n++;
      header(doc);
      eyebrow(doc, 'Zo ga je verder');
      sectionTitle(doc, 'arrowRight', 'Aanbevolen volgende stappen', { marginBottom: 10 });
      numberedList(doc, nextSteps, pageNum);

      doc.y += 8;
      ensureSpace(doc, 120, pageNum);
      sandBox(doc, [
        { text: 'Dit rapport als onderhandelingsdocument', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Deel dit PDF-rapport met aannemers en vraag hen te reageren op dezelfde posten. Zo vergelijk je appels met appels — en zie je snel waar offertes afwijken van de Belgische mid-market vork.' }
      ]);

      ensureSpace(doc, 100, pageNum);
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y).lineWidth(0.75).strokeColor(COLOR.line).stroke();
      doc.y += 12;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('Disclaimer', MARGIN, doc.y);
      doc.y += 8;
      doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkFaint)
        .text('Dit rapport is indicatief en gebaseerd op gemiddelde Belgische mid-market prijzen en de gegevens die je zelf hebt opgegeven. Het vervangt geen offerte op maat en heeft geen contractuele waarde. Vraag steeds een offerte aan bij een erkende aannemer voor een bindende prijs. ELYAN is niet aansprakelijk voor beslissingen genomen op basis van dit rapport.', MARGIN, doc.y, { width: CONTENT_W, lineGap: 2.5 });
      doc.y += 14;

      var contactY = doc.y;
      doc.roundedRect(MARGIN, contactY, CONTENT_W, 56, 8).fill(COLOR.primary);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.white)
        .text('Vragen over dit rapport?', MARGIN + 18, contactY + 14);
      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.sandDeep)
        .text('Mail elyan.info@gmail.com — we helpen je graag verder.', MARGIN + 18, contactY + 32);

      footer(doc, pageNum.n);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildReportPdf: buildReportPdf };
