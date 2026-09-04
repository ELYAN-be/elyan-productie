/* ============================================================
   ELYAN. Premium PDF renovatierapport (pdfkit)
   Presentation layer ONLY, pricing engine is single source of truth.
   Dense layout, dynamic pagination, category-personalised content.
   ============================================================ */

var PDFDocument = require('pdfkit');
var path = require('path');
var pricing = require('./pricing');
var insightsLib = require('./insights');

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
var MARGIN = 44;
var CONTENT_W = PAGE.width - MARGIN * 2;
var FOOTER_Y = PAGE.height - 36;
var CONTENT_BOTTOM = FOOTER_Y - 14;
var GAP = 10;

function fmtDate(d) {
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function housingAgeLabel(v) {
  if (v === 'jong') return 'Jonger dan 10 jaar';
  if (v === 'middel') return '10–30 jaar';
  if (v === 'oud') return 'Ouder dan 30 jaar';
  return v || '-';
}

function safeIcon(doc, key, x, y, size) {
  if (!key || !ICON[key]) return;
  try { doc.image(ICON[key], x, y, { width: size, height: size }); } catch (e) { /* missing */ }
}

function header(doc, reportDate) {
  var y = 26;
  doc.save();
  doc.rect(MARGIN, y + 5, 2.8, 6).fill(COLOR.primary);
  doc.rect(MARGIN + 4.5, y + 2.5, 2.8, 8.5).fill(COLOR.primary);
  doc.rect(MARGIN + 9, y, 2.8, 11).fill(COLOR.primary);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
    .text('ELYAN', MARGIN + 16, y - 1, { characterSpacing: 0.4 });
  doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkFaint)
    .text('Renovatierapport', MARGIN, y - 1, { width: CONTENT_W, align: 'right' });
  doc.moveTo(MARGIN, y + 16).lineTo(PAGE.width - MARGIN, y + 16)
    .lineWidth(0.7).strokeColor(COLOR.line).stroke();
  doc.y = y + 24;
}

function footer(doc, pageNum, reportDate, totalHint) {
  var oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  var y = FOOTER_Y - 2;
  doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y)
    .lineWidth(0.7).strokeColor(COLOR.line).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('Indicatieve renovatieraming. ELYAN' + (reportDate ? '  ·  ' + reportDate : ''), MARGIN, y + 6, {
      width: CONTENT_W - 70, lineBreak: false
    });
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('Pagina ' + String(pageNum), MARGIN, y + 6, { width: CONTENT_W, align: 'right', lineBreak: false });
  doc.page.margins.bottom = oldBottom;
}

function ensureSpace(doc, needed, ctx) {
  if (doc.y + needed > CONTENT_BOTTOM) {
    footer(doc, ctx.page.n, ctx.reportDate);
    doc.addPage();
    ctx.page.n++;
    header(doc, ctx.reportDate);
    return true;
  }
  return false;
}

function startSectionPage(doc, ctx) {
  footer(doc, ctx.page.n, ctx.reportDate);
  doc.addPage();
  ctx.page.n++;
  header(doc, ctx.reportDate);
}

function maybeNewSection(doc, ctx, minNeeded) {
  minNeeded = minNeeded || 168;
  if (CONTENT_BOTTOM - doc.y < minNeeded) {
    startSectionPage(doc, ctx);
  } else {
    doc.y += 10;
  }
}

function eyebrow(doc, text) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.primary)
    .text(String(text).toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.15 });
  doc.y += 3;
}

function sectionTitle(doc, iconKey, text, ctx, opts) {
  opts = opts || {};
  if (!opts.skipEnsure) ensureSpace(doc, 32 + (opts.keepWith || 0), ctx);
  var size = opts.iconSize || 13;
  var yStart = doc.y;
  safeIcon(doc, iconKey, MARGIN, yStart - 1, size);
  doc.font('Helvetica-Bold').fontSize(opts.fontSize || 12.5).fillColor(COLOR.ink)
    .text(text, MARGIN + (iconKey ? size + 7 : 0), yStart, {
      width: CONTENT_W - (iconKey ? size + 7 : 0)
    });
  doc.y = Math.max(doc.y, yStart + size) + (opts.marginBottom !== undefined ? opts.marginBottom : 8);
}

/* Keep eyebrow + title with at least the first content block (no orphan headings). */
function startSection(doc, ctx, opts) {
  opts = opts || {};
  var keepWith = opts.keepWith != null ? opts.keepWith : 56;
  ensureSpace(doc, 40 + keepWith, ctx);
  if (opts.eyebrow) eyebrow(doc, opts.eyebrow);
  sectionTitle(doc, opts.icon || null, opts.title, ctx, Object.assign({ skipEnsure: true }, opts.titleOpts || {}));
}

function bodyText(doc, text, ctx, opts) {
  opts = opts || {};
  ensureSpace(doc, 24, ctx);
  doc.font('Helvetica').fontSize(opts.size || 9).fillColor(opts.color || COLOR.inkSoft)
    .text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 1.8 });
  doc.y += opts.after !== undefined ? opts.after : 5;
}

function sandCard(doc, lines, ctx, minH) {
  var pad = 11;
  var textW = CONTENT_W - pad * 2;
  var h = pad;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9);
    h += doc.heightOfString(line.text, { width: textW, lineGap: 1.8 }) + (idx < lines.length - 1 ? 4 : 0);
  });
  h += pad;
  if (minH) h = Math.max(h, minH);
  ensureSpace(doc, h + 6, ctx);
  var startY = doc.y;
  doc.roundedRect(MARGIN, startY, CONTENT_W, h, 7).fill(COLOR.sand);
  var y = startY + pad;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9)
      .fillColor(line.color || COLOR.inkSoft)
      .text(line.text, MARGIN + pad, y, { width: textW, lineGap: 1.8 });
    y = doc.y + (idx < lines.length - 1 ? 4 : 0);
  });
  doc.y = startY + h + GAP;
}

function bulletList(doc, items, ctx, iconKey) {
  iconKey = iconKey || 'info';
  var iconSize = 9;
  items.forEach(function (item) {
    ensureSpace(doc, 22, ctx);
    var yTop = doc.y;
    safeIcon(doc, iconKey, MARGIN, yTop + 1, iconSize);
    doc.font('Helvetica').fontSize(8.8).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + iconSize + 7, yTop, { width: CONTENT_W - iconSize - 7, lineGap: 1.2 });
    doc.y = Math.max(doc.y, yTop + iconSize) + 5;
  });
}

function numberedList(doc, items, ctx) {
  items.forEach(function (item, i) {
    ensureSpace(doc, 24, ctx);
    var yTop = doc.y;
    var bubble = 14;
    doc.circle(MARGIN + bubble / 2, yTop + bubble / 2, bubble / 2).fill(COLOR.primary);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.white)
      .text(String(i + 1), MARGIN, yTop + bubble / 2 - 3.5, { width: bubble, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + bubble + 8, yTop + 1, { width: CONTENT_W - bubble - 8, lineGap: 1.15 });
    doc.y = Math.max(doc.y, yTop + bubble) + 4;
  });
}

function kpiRow(doc, cells, ctx) {
  var n = cells.length;
  var gap = 8;
  var boxW = (CONTENT_W - gap * (n - 1)) / n;
  var boxH = 52;
  ensureSpace(doc, boxH + 8, ctx);
  var rowY = doc.y;
  cells.forEach(function (m, i) {
    var x = MARGIN + i * (boxW + gap);
    doc.roundedRect(x, rowY, boxW, boxH, 5).fill(COLOR.sand);
    doc.font('Helvetica').fontSize(6.5).fillColor(COLOR.inkFaint)
      .text(String(m.label).toUpperCase(), x + 8, rowY + 10, { width: boxW - 16, characterSpacing: 0.4 });
    doc.font('Helvetica-Bold').fontSize(m.big ? 12.5 : 10).fillColor(COLOR.ink)
      .text(String(m.value), x + 8, rowY + 26, { width: boxW - 16 });
  });
  doc.y = rowY + boxH + 10;
}

function metaGrid2(doc, cells, ctx) {
  var boxW = (CONTENT_W - 8) / 2;
  var boxH = 34;
  var i = 0;
  while (i < cells.length) {
    ensureSpace(doc, boxH + 5, ctx);
    var rowY = doc.y;
    for (var col = 0; col < 2 && i < cells.length; col++, i++) {
      var m = cells[i];
      var x = MARGIN + col * (boxW + 8);
      doc.roundedRect(x, rowY, boxW, boxH, 5).fill(COLOR.sand);
      doc.font('Helvetica').fontSize(6.2).fillColor(COLOR.inkFaint)
        .text(String(m.label).toUpperCase(), x + 9, rowY + 6, { characterSpacing: 0.4 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
        .text(String(m.value), x + 9, rowY + 17, { width: boxW - 18 });
    }
    doc.y = rowY + boxH + 5;
  }
}

function drawRangeBar(doc, low, mid, high, ctx) {
  ensureSpace(doc, 62, ctx);
  var y = doc.y;
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('LOW', MARGIN, y)
    .text('HIGH', MARGIN, y, { width: CONTENT_W, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
    .text('EXPECTED', MARGIN, y, { width: CONTENT_W, align: 'center', characterSpacing: 0.5 });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.ink)
    .text(pricing.fmtEUR(low), MARGIN, y + 13)
    .text(pricing.fmtEUR(high), MARGIN, y + 13, { width: CONTENT_W, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.primaryDark)
    .text(pricing.fmtEUR(mid), MARGIN, y + 12, { width: CONTENT_W, align: 'center' });
  var barY = y + 36;
  doc.roundedRect(MARGIN, barY, CONTENT_W, 7, 3).fill(COLOR.sandDeep);
  var span = Math.max(1, high - low);
  var midX = MARGIN + ((mid - low) / span) * CONTENT_W;
  doc.roundedRect(MARGIN, barY, Math.max(8, midX - MARGIN), 7, 3).fill(COLOR.primarySoft);
  doc.circle(midX, barY + 3.5, 5).fill(COLOR.primary);
  doc.y = barY + 18;
}

function drawSplitBars(doc, r, ctx) {
  var rows = [
    { label: 'Materiaal', amt: r.amounts.materiaal, pct: r.split.materiaal },
    { label: 'Arbeid', amt: r.amounts.arbeid, pct: r.split.arbeid },
    { label: 'Overige', amt: r.amounts.overige, pct: r.split.overige }
  ];
  rows.forEach(function (row) {
    ensureSpace(doc, 28, ctx);
    var yTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink).text(row.label, MARGIN, yTop);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.primary)
      .text(pricing.fmtEUR(row.amt) + '   ·   ' + Math.round(row.pct * 100) + '%', MARGIN, yTop, {
        width: CONTENT_W, align: 'right'
      });
    doc.y = yTop + 12;
    doc.roundedRect(MARGIN, doc.y, CONTENT_W, 5, 2.5).fill(COLOR.sandDeep);
    doc.roundedRect(MARGIN, doc.y, Math.max(4, CONTENT_W * row.pct), 5, 2.5).fill(COLOR.primary);
    doc.y += 12;
  });
}

/* Mobile-friendly 2-line cost rows — header repeats on page break */
function drawCostTableHeader(doc) {
  var hy = doc.y;
  doc.roundedRect(MARGIN, hy, CONTENT_W, 22, 4).fill(COLOR.primaryDark);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.sand)
    .text('WERKPAKKET', MARGIN + 8, hy + 5)
    .text('TOTAAL', MARGIN, hy + 5, { width: CONTENT_W - 8, align: 'right' });
  doc.font('Helvetica').fontSize(6.5).fillColor(COLOR.sandDeep)
    .text('Materiaal  ·  Arbeid  ·  Overige  ·  uren', MARGIN + 8, hy + 13);
  doc.y = hy + 26;
}

function costTable(doc, r, ctx) {
  var rows = (r.costBreakdown || []).filter(function (it) { return it.amount > 0; });
  ensureSpace(doc, 44, ctx);
  drawCostTableHeader(doc);

  rows.forEach(function (it, idx) {
    var rowH = 32;
    var broke = ensureSpace(doc, rowH + 4, ctx);
    if (broke) {
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
        .text('Kostentabel (vervolg)', MARGIN, doc.y);
      doc.y += 10;
      drawCostTableHeader(doc);
    }
    var y = doc.y;
    if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT_W, rowH).fill(COLOR.sand);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.ink)
      .text(it.label, MARGIN + 8, y + 5, { width: CONTENT_W - 90 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.primary)
      .text(pricing.fmtEUR(it.amount), MARGIN, y + 5, { width: CONTENT_W - 8, align: 'right' });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
      .text(
        'Mat. ' + pricing.fmtEUR(it.material || 0) +
        '   ·   Arb. ' + pricing.fmtEUR(it.labour || 0) +
        '   ·   Ovr. ' + pricing.fmtEUR(it.other || 0) +
        ((it.labourHours > 0) ? '   ·   ' + Math.round(it.labourHours) + ' u' : ''),
        MARGIN + 8, y + 18, { width: CONTENT_W - 16 }
      );
    doc.y = y + rowH;
  });

  ensureSpace(doc, 58, ctx);
  doc.y += 4;
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y)
    .lineWidth(0.6).strokeColor(COLOR.line).stroke();
  doc.y += 6;
  [
    { label: 'Totaal excl. btw', value: pricing.fmtEUR(r.subtotalExVat || r.price), bold: true },
    { label: 'BTW-scenario (' + (r.vatLabel || 'indicatief') + ')', value: pricing.fmtEUR(r.vatAmount || 0), bold: false },
    { label: 'Indicatief totaal incl. btw', value: pricing.fmtEUR(r.totalInclVat || r.price), bold: true }
  ].forEach(function (t) {
    doc.font(t.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLOR.ink)
      .text(t.label, MARGIN, doc.y);
    doc.font(t.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLOR.primary)
      .text(t.value, MARGIN, doc.y, { width: CONTENT_W, align: 'right' });
    doc.y += 13;
  });
  doc.y += 2;
}

function marketBar(doc, r, ctx) {
  var bm = r.marketBenchmark || { low: r.peerLow, high: r.peerHigh };
  var compare = r.comparableSubtotal != null ? r.comparableSubtotal : r.price;
  var scopeMatch = r.scopeMatch || (bm && bm.scopeMatch) || 'direct';
  var pos = r.marketPosition || 'marktconform';

  ensureSpace(doc, 100, ctx);
  if (scopeMatch === 'not-direct' || pos === 'niet-direct-vergelijkbaar') {
    sandCard(doc, [
      { text: 'Niet direct vergelijkbaar', bold: true, color: COLOR.ink, size: 10 },
      { text: 'De marktbande en jouw project hebben een andere scope. Gebruik de kostentabel, niet alleen het totaal, om offertes te beoordelen.' },
      { text: bm.label ? ('Benchmark-label: ' + bm.label) : (r.comparableNote || 'Scope-match: niet-direct.') }
    ], ctx);
    return;
  }

  sandCard(doc, [
    {
      text: pos === 'lager' ? 'Lager dan typische band'
        : pos === 'hoger' ? 'Hoger dan typische band' : 'Marktconform',
      bold: true, color: COLOR.ink, size: 10
    },
    { text: 'Jouw vergelijkbare bedrag: ' + pricing.fmtEUR(compare) +
      (function () {
        var ur = (pricing.unitRateDisplay && pricing.unitRateDisplay(ctx.type, r)) || r.unitRate;
        if (ur && ur.formatted) return '  ·  ' + ur.formatted + ur.suffix + ' (totaalraming)';
        if (r.perM2) return '  ·  ' + pricing.fmtEUR(r.perM2) + '/m² (totaalraming)';
        return '';
      })() },
    { text: 'Belgische marktband (excl. btw): ' + pricing.fmtEUR(bm.low) + ' – ' + pricing.fmtEUR(bm.high) },
    { text: (bm.scope || bm.reason || 'Scope-identieke vergelijking volgens pricing-engine.') +
      (bm.vatStatus ? '  ·  BTW-status benchmark: ' + bm.vatStatus : '') }
  ], ctx);

  ensureSpace(doc, 36, ctx);
  var y = doc.y;
  var labels = ['LAGER', 'MARKTCONFORM', 'HOGER'];
  var segW = CONTENT_W / 3;
  labels.forEach(function (lab, i) {
    var x = MARGIN + i * segW;
    doc.roundedRect(x + 1, y, segW - 2, 18, 4).fill(i === 1 ? COLOR.sandDeep : COLOR.sand);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.inkSoft)
      .text(lab, x, y + 5, { width: segW, align: 'center' });
  });
  var markerSeg = pos === 'lager' ? 0 : pos === 'hoger' ? 2 : 1;
  var mx = MARGIN + markerSeg * segW + segW / 2;
  doc.circle(mx, y + 9, 4).fill(COLOR.primary);
  doc.y = y + 26;
  if (r.comparableNote) {
    bodyText(doc, r.comparableNote, ctx, { size: 8, color: COLOR.inkFaint, after: 4 });
  }
}

function drawRiskTableHeader(doc) {
  var hy = doc.y;
  doc.roundedRect(MARGIN, hy, CONTENT_W, 18, 4).fill(COLOR.primaryDark);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.sand);
  doc.text('RISICO', MARGIN + 8, hy + 5);
  doc.text('NIVEAU', MARGIN + 175, hy + 5);
  doc.text('WAT CONTROLEREN?', MARGIN + 230, hy + 5);
  doc.y = hy + 22;
}

function riskTable(doc, rows, ctx) {
  ensureSpace(doc, 28, ctx);
  drawRiskTableHeader(doc);

  rows.forEach(function (row, idx) {
    var checkH = doc.heightOfString(row.check || '', { width: CONTENT_W - 238 });
    var rowH = Math.max(28, checkH + 12);
    var broke = ensureSpace(doc, rowH + 2, ctx);
    if (broke) {
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
        .text('Risicotabel (vervolg)', MARGIN, doc.y);
      doc.y += 10;
      drawRiskTableHeader(doc);
    }
    var y = doc.y;
    if (idx % 2 === 0) doc.rect(MARGIN, y, CONTENT_W, rowH).fill(COLOR.sand);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.ink)
      .text(row.risk, MARGIN + 8, y + 6, { width: 160 });
    var impactColor = row.impact === 'HOOG' ? COLOR.riskHigh
      : row.impact === 'MIDDEL' ? COLOR.riskMid : COLOR.riskLow;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(impactColor)
      .text(row.impact || 'MIDDEL', MARGIN + 175, y + 7);
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkSoft)
      .text(row.check || '', MARGIN + 230, y + 6, { width: CONTENT_W - 238 });
    doc.y = y + rowH;
  });
  doc.y += 4;
}

function drawCheckbox(doc, x, y, size) {
  size = size || 8;
  doc.save();
  doc.lineWidth(0.9).strokeColor(COLOR.primarySoft);
  doc.rect(x, y, size, size).stroke();
  doc.restore();
}

function checklistTwoCol(doc, items, ctx) {
  var colW = (CONTENT_W - 10) / 2;
  var i = 0;
  while (i < items.length) {
    ensureSpace(doc, 18, ctx);
    var y = doc.y;
    var rowH = 14;
    for (var c = 0; c < 2 && i < items.length; c++, i++) {
      var x = MARGIN + c * (colW + 10);
      drawCheckbox(doc, x, y + 1, 7.5);
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft);
      var h = doc.heightOfString(items[i], { width: colW - 14, lineGap: 1 });
      doc.text(items[i], x + 12, y, { width: colW - 14, lineGap: 1 });
      rowH = Math.max(rowH, h + 2);
    }
    doc.y = y + rowH + 3;
  }
  doc.y += 2;
}

function decisionCards(doc, cards, ctx) {
  var gap = 7;
  var boxW = (CONTENT_W - gap) / 2;
  var pad = 10;
  var i = 0;
  while (i < cards.length) {
    var pair = [cards[i], cards[i + 1]].filter(Boolean);
    var heights = pair.map(function (m) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      return 18 + doc.heightOfString(String(m.value), { width: boxW - pad * 2, lineGap: 1.3 });
    });
    var boxH = Math.max(44, Math.max.apply(null, heights) + pad);
    ensureSpace(doc, boxH + 6, ctx);
    var rowY = doc.y;
    pair.forEach(function (m, col) {
      var x = MARGIN + col * (boxW + gap);
      doc.roundedRect(x, rowY, boxW, boxH, 7).fill(COLOR.sand);
      doc.font('Helvetica').fontSize(6.5).fillColor(COLOR.inkFaint)
        .text(String(m.label).toUpperCase(), x + pad, rowY + 8, { characterSpacing: 0.4 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.ink)
        .text(String(m.value), x + pad, rowY + 20, { width: boxW - pad * 2, lineGap: 1.3 });
    });
    doc.y = rowY + boxH + 6;
    i += 2;
  }
}

function labourHourBars(doc, hourRows, ctx) {
  if (!hourRows.length) return;
  var maxH = Math.max.apply(null, hourRows.map(function (p) { return p.hours; })) || 1;
  bodyText(doc, 'Waar zitten de arbeidsuren?', ctx, { after: 4 });
  hourRows.forEach(function (p) {
    ensureSpace(doc, 22, ctx);
    var y = doc.y;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft)
      .text(p.label, MARGIN, y, { width: CONTENT_W - 70 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.ink)
      .text(Math.round(p.hours) + ' u', MARGIN, y, { width: CONTENT_W, align: 'right' });
    var barY = y + 11;
    doc.roundedRect(MARGIN, barY, CONTENT_W, 4, 2).fill(COLOR.sandDeep);
    doc.roundedRect(MARGIN, barY, Math.max(3, CONTENT_W * (p.hours / maxH)), 4, 2).fill(COLOR.primary);
    doc.y = barY + 10;
  });
  doc.y += 2;
}

function drawTimeline(doc, timeline, ctx) {
  var railX = MARGIN + 6;
  var textW = CONTENT_W - 28;
  timeline.forEach(function (step, idx) {
    doc.font('Helvetica').fontSize(7.5);
    var noteH = doc.heightOfString(step.note || '', { width: textW, lineGap: 1.1 });
    var stepH = Math.max(26, 14 + noteH + 6);
    var broke = ensureSpace(doc, stepH + 2, ctx);
    if (broke && idx > 0) {
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
        .text('Projectplanning, vervolg', MARGIN, doc.y);
      doc.y += 10;
    }
    var y = doc.y;
    doc.circle(railX, y + 5, 3.5).fill(COLOR.primary);
    if (idx < timeline.length - 1) {
      doc.moveTo(railX, y + 9).lineTo(railX, y + stepH)
        .lineWidth(1.15).strokeColor(COLOR.line).stroke();
    }
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
      .text(step.phase, MARGIN + 18, y, { width: CONTENT_W - 100 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.primary)
      .text('±' + step.days + ' d', MARGIN, y, { width: CONTENT_W, align: 'right' });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkSoft)
      .text(step.note || '', MARGIN + 18, y + 12, { width: textW, lineGap: 1.1 });
    doc.y = y + stepH;
  });
  doc.y += 2;
}

function drawCover(doc, cat, prov, answers, r, pack, reportId, reportDate, type) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.primaryDark);
  doc.save();
  doc.opacity(0.35);
  doc.circle(PAGE.width - 30, 70, 150).fill(COLOR.primarySoft);
  doc.opacity(0.14);
  doc.circle(20, PAGE.height - 30, 120).fill(COLOR.sand);
  doc.restore();

  var lx = MARGIN + 4;
  var ly = 78;
  doc.rect(lx, ly + 14, 7, 18).fill(COLOR.sand);
  doc.rect(lx + 11, ly + 7, 7, 25).fill(COLOR.sand);
  doc.rect(lx + 22, ly, 7, 32).fill(COLOR.sand);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLOR.white)
    .text('ELYAN', lx + 40, ly + 8, { characterSpacing: 0.8 });

  doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
    .text('RENOVATIERAPPORT', MARGIN + 4, 210, { characterSpacing: 1.6 });
  doc.font('Helvetica-Bold').fontSize(28).fillColor(COLOR.white)
    .text('Persoonlijke kostenanalyse', MARGIN + 4, 232, { width: CONTENT_W * 0.9 });
  doc.font('Helvetica').fontSize(14).fillColor(COLOR.sandDeep)
    .text('voor jouw ' + cat.resultNoun, MARGIN + 4, doc.y + 4);

  var sizeMeta = (pricing.sizeDisplay && pricing.sizeDisplay(type, answers, r))
    || r.sizeDisplay
    || { short: (answers.size || r.size) + ' m²' };
  doc.font('Helvetica').fontSize(11).fillColor(COLOR.sand)
    .text(prov.label + '  ·  ' + sizeMeta.short + '  ·  ' +
      ((pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level || 'Standaard'),
      MARGIN + 4, 320);
  doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
    .text(reportDate, MARGIN + 4, doc.y + 8);
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.primarySoft)
    .text('Referentie  ' + reportId, MARGIN + 4, doc.y + 10);

  doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
    .text('Persoonlijk opgesteld voor jou', MARGIN + 4, PAGE.height - 100);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.primarySoft)
    .text('Belgische marktprijzen ' + (r.asOf || '2026') + '  ·  Indicatief, geen bindende offerte',
      MARGIN + 4, PAGE.height - 78);
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
      var nextSteps = insightsLib.buildNextSteps(data.type, answers, r, pricing).slice(0, 5);
      var reportId = 'EL-' + String(Date.now()).slice(-8);
      var reportDate = fmtDate(new Date());
      var lp = r.labourPlan || {};
      var safeBudget = (r.price || 0) + (r.contingency || 0);
      var topRisk = (pack.riskRows[0] && pack.riskRows[0].risk) || (pack.risks[0] || 'Standaard werfrisico\'s');
      var topSave = (pack.savings[0] && (pack.savings[0].text || pack.savings[0])) ||
        'Vergelijk drie offertes op identieke scope.';
      topSave = String(topSave);
      
      var doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: 48, left: MARGIN, right: MARGIN },
        info: {
          Title: 'ELYAN Renovatierapport. ' + cat.label,
          Author: 'ELYAN',
          Subject: 'Persoonlijke renovatie-inschatting'
        }
      });
      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var ctx = { page: { n: 1 }, reportDate: reportDate, type: data.type };
      var sizeMeta = (pricing.sizeDisplay && pricing.sizeDisplay(data.type, answers, r))
        || r.sizeDisplay
        || { fieldLabel: 'Oppervlakte', text: (answers.size || r.size) + ' m²', short: (answers.size || r.size) + ' m²' };
      var unitMeta = (pricing.unitRateDisplay && pricing.unitRateDisplay(data.type, r))
        || r.unitRate
        || { label: '€ / m²', formatted: pricing.fmtEUR(r.perM2), suffix: '/m²' };

      /* ===== COVER ===== */
      drawCover(doc, cat, prov, answers, r, pack, reportId, reportDate, data.type);

      /* ===== 1. EXECUTIVE SUMMARY ===== */
      doc.addPage(); ctx.page.n++;
      header(doc, reportDate);

      eyebrow(doc, 'Executive summary');
      sectionTitle(doc, 'target', 'Jouw project in één oogopslag', ctx);

      metaGrid2(doc, [
        { label: 'Project', value: cat.label },
        { label: 'Locatie', value: prov.label },
        { label: sizeMeta.fieldLabel || 'Oppervlakte', value: sizeMeta.text },
        { label: 'Afwerking', value: (pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level || '-' },
        { label: 'Woningouderdom', value: housingAgeLabel(answers.housingAge) },
        { label: 'Confidence', value: r.confidence || 'indicatief' }
      ], ctx);

      startSection(doc, ctx, {
        eyebrow: 'Investering excl. btw',
        icon: 'euro',
        title: 'Jouw verwachte investering',
        keepWith: 70,
        titleOpts: { marginBottom: 4 }
      });
      drawRangeBar(doc, r.low, r.price, r.high, ctx);

      kpiRow(doc, [
        { label: unitMeta.label || '€ / m²', value: unitMeta.formatted || pricing.fmtEUR(r.perM2), big: true },
        { label: 'Arbeidsuren', value: String(r.labourHours || lp.labourHours || '-') + ' u' },
        { label: 'Ploeg', value: String(r.crewSize || lp.crewSize || '-') },
        { label: 'Werkdagen', value: '±' + String(r.workDays || lp.workDays || '-') },
        { label: 'Kalender', value: r.weeksLow + '–' + r.weeksHigh + ' w' },
        { label: 'Dataset', value: (r.marketDataVersion || '2026').replace('audit', '').trim() || '2026' }
      ].slice(0, 5), ctx);

      startSection(doc, ctx, {
        eyebrow: 'Verdeling',
        icon: null,
        title: 'Kostenverdeling',
        keepWith: 56,
        titleOpts: { marginBottom: 4 }
      });
      drawSplitBars(doc, r, ctx);

      sandCard(doc, [
        { text: 'Onze belangrijkste conclusie', bold: true, color: COLOR.ink, size: 10 },
        { text: pack.executiveConclusion || pack.conclusions[0] || '' }
      ], ctx);

      if (data.notes) {
        sandCard(doc, [
          { text: 'Jouw opmerkingen', bold: true, color: COLOR.ink, size: 9 },
          { text: data.notes }
        ], ctx);
      }

      /* ===== 2. COST BREAKDOWN ===== */
      maybeNewSection(doc, ctx, 240);
      startSection(doc, ctx, {
        eyebrow: 'Kostentransparantie',
        icon: 'euro',
        title: 'Waar gaat jouw budget naartoe?',
        keepWith: 72
      });
      bodyText(doc, 'Alle bedragen excl. btw. Opgebouwd uit werkpakketten van de ELYAN pricing engine, geen vaste percentages.', ctx);
      costTable(doc, r, ctx);

      /* ===== 3. LABOUR ===== */
      if ((r.labourHours || 0) > 0) {
        startSection(doc, ctx, {
          eyebrow: 'Uitvoering',
          icon: 'clock',
          title: 'De arbeid achter jouw renovatie',
          keepWith: 58
        });
        kpiRow(doc, [
          { label: 'Manuren', value: String(lp.labourHours || r.labourHours) + ' u', big: true },
          { label: 'Ploeg', value: String(lp.crewSize || r.crewSize) + ' vakmensen' },
          { label: 'Werkdagen', value: '±' + String(lp.workDays || r.workDays) },
          { label: 'Effectief tarief', value: pricing.fmtEUR(lp.effectiveHourlyRate || r.effectiveHourlyRate) + '/u' }
        ], ctx);
        bodyText(doc, 'Werkdagen ≠ kalenderdagen. Productieve uren/dag: ' +
          (lp.productiveHoursPerDay || 6.5) +
          '. Kalenderdoorlooptijd: ' + r.weeksLow + '–' + r.weeksHigh +
          ' weken (incl. planning, levering en weersafhankelijkheid).', ctx);

        var hourRows = (lp.topLabourPackages && lp.topLabourPackages.length)
          ? lp.topLabourPackages
          : (r.costBreakdown || []).filter(function (it) { return it.labourHours > 0; })
            .map(function (it) { return { label: it.label, hours: it.labourHours }; })
            .sort(function (a, b) { return b.hours - a.hours; })
            .slice(0, 6);

        if (hourRows.length) {
          labourHourBars(doc, hourRows, ctx);
        }
      }

      /* ===== 4. PLANNING ===== */
      if (pack.timeline && pack.timeline.length) {
        maybeNewSection(doc, ctx, 90);
        startSection(doc, ctx, {
          eyebrow: 'Planning',
          icon: 'clock',
          title: 'Projectplanning',
          keepWith: 100
        });
        bodyText(doc, 'Indicatieve fasering in productieve werkdagen. Kalenderdoorlooptijd is langer: ' +
          r.weeksLow + '–' + r.weeksHigh + ' weken.', ctx);
        drawTimeline(doc, pack.timeline, ctx);
      }

      /* ===== 5. MARKET ===== */
      maybeNewSection(doc, ctx, 180);
      startSection(doc, ctx, {
        eyebrow: 'Markt 2026',
        icon: 'target',
        title: 'Hoe verhoudt jouw raming zich tot de Belgische markt?',
        keepWith: 90
      });
      marketBar(doc, r, ctx);

      /* ===== 6. DRIVERS ===== */
      if (r.drivers && r.drivers.length) {
        startSection(doc, ctx, {
          eyebrow: 'Impact',
          icon: 'info',
          title: 'Belangrijkste kostendrijvers',
          keepWith: 46
        });
        r.drivers.forEach(function (d) {
          ensureSpace(doc, 38, ctx);
          var y = doc.y;
          doc.roundedRect(MARGIN, y, CONTENT_W, 34, 6).fill(COLOR.sand);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
            .text(d.text, MARGIN + 11, y + 7, { width: CONTENT_W - 100 });
          if (d.amount) {
            var sign = d.amount > 0 ? '+' : '−';
            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.primary)
              .text(sign + pricing.fmtEUR(Math.abs(d.amount)), MARGIN + 11, y + 7, {
                width: CONTENT_W - 22, align: 'right'
              });
          }
          if (d.reason) {
            doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.inkFaint)
              .text(d.reason, MARGIN + 11, y + 20, { width: CONTENT_W - 22 });
          }
          doc.y = y + 40;
        });
      }

      /* ===== 7. ASSUMPTIONS ===== */
      startSection(doc, ctx, {
        eyebrow: 'Transparantie',
        icon: 'info',
        title: 'Welke aannames zitten in jouw raming?',
        keepWith: 28
      });
      bulletList(doc, pack.assumptions, ctx, 'info');

      /* ===== 8. RISKS ===== */
      startSection(doc, ctx, {
        eyebrow: 'Risico\'s',
        icon: 'shield',
        title: 'Wat kan jouw uiteindelijke offerte nog beïnvloeden?',
        keepWith: 52
      });
      if (pack.riskRows && pack.riskRows.length) {
        riskTable(doc, pack.riskRows, ctx);
      } else if (pack.risks.length) {
        bulletList(doc, pack.risks, ctx, 'shield');
      } else {
        bodyText(doc, 'Geen bijzondere hoog-risico signalen op basis van jouw antwoorden. Blijf standaard werfrisico\'s checken.', ctx);
      }

      /* ===== 9. BUFFER ===== */
      startSection(doc, ctx, {
        eyebrow: 'Buffer',
        icon: 'euro',
        title: 'Budgetbuffer',
        keepWith: 82
      });
      var pctL = r.contingencyPct ? Math.round(r.contingencyPct.low * 100) : 10;
      var pctH = r.contingencyPct ? Math.round(r.contingencyPct.high * 100) : 15;
      sandCard(doc, [
        { text: 'Aanbevolen buffer: ' + pricing.fmtEUR(r.contingency) + '  (' + pctL + '–' + pctH + '%)', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Veilig budget (expected + buffer): ' + pricing.fmtEUR(safeBudget) + ' excl. btw' },
        { text: pack.bufferReason || 'Buffer hangt af van onzekerheid in jouw antwoorden. Dit is geen opslag in de richtprijs, maar advies erbovenop.' }
      ], ctx);

      /* ===== 10. QUOTE CHECK ===== */
      maybeNewSection(doc, ctx, 200);
      if (pack.quoteChecks && pack.quoteChecks.length) {
        startSection(doc, ctx, {
          eyebrow: 'Offertes',
          icon: 'check',
          title: 'Gebruik dit wanneer je aannemersoffertes vergelijkt',
          keepWith: 48
        });
        bodyText(doc, 'Checklist, categorie-specifiek voor jouw ' + cat.resultNoun + ':', ctx);
        checklistTwoCol(doc, pack.quoteChecks, ctx);
      }

      /* ===== 11. QUESTIONS ===== */
      if (pack.contractorQuestions && pack.contractorQuestions.length) {
        startSection(doc, ctx, {
          eyebrow: 'Gesprek',
          icon: 'info',
          title: 'Vragen aan de aannemer',
          keepWith: 30
        });
        numberedList(doc, pack.contractorQuestions, ctx);
      }

      /* ===== 12. RED FLAGS ===== */
      startSection(doc, ctx, {
        eyebrow: 'Signalen',
        icon: 'shield',
        title: 'Rode vlaggen',
        keepWith: 48
      });
      bodyText(doc, 'Geen juridisch advies, wel signalen om offertes kritisch te lezen:', ctx);
      bulletList(doc, pack.redFlags.slice(0, 8), ctx, 'shield');

      /* ===== 13. SAVINGS ===== */
      if (pack.savings && pack.savings.length) {
        startSection(doc, ctx, {
          eyebrow: 'Besparen',
          icon: 'bulb',
          title: 'Bespaarkansen voor jouw project',
          keepWith: 28
        });
        bulletList(doc, pack.savings.map(function (s) { return s.text || s; }), ctx, 'bulb');
      }

      /* ===== 14. VAT + PREMIES ===== */
      maybeNewSection(doc, ctx, 180);
      startSection(doc, ctx, {
        eyebrow: 'BTW',
        icon: 'euro',
        title: 'Indicatief btw-scenario',
        keepWith: 88
      });
      sandCard(doc, [
        { text: r.vatLabel || 'Indicatief', bold: true, color: COLOR.ink, size: 10 },
        { text: 'Subtotaal excl. btw: ' + pricing.fmtEUR(r.subtotalExVat || r.price) },
        r.vatMixed && r.vatBreakdown ? {
          text: '6% op ' + pricing.fmtEUR(r.vatBreakdown.taxableBase6 || 0) +
            ' → ' + pricing.fmtEUR(r.vatBreakdown.vat6 || 0) +
            '   ·   21% op ' + pricing.fmtEUR(r.vatBreakdown.taxableBase21 || 0) +
            ' → ' + pricing.fmtEUR(r.vatBreakdown.vat21 || 0),
          size: 8.5
        } : null,
        r.vatNote ? { text: r.vatNote, size: 8.5 } : null,
        { text: 'BTW-bedrag: ' + pricing.fmtEUR(r.vatAmount || 0) },
        { text: 'Indicatief incl. btw: ' + pricing.fmtEUR(r.totalInclVat || r.price) },
        { text: (r.vatDisclaimer || 'Dit is een indicatieve fiscale inschatting. De aannemer moet bevestigen of aan alle wettelijke voorwaarden is voldaan.'), size: 8 }
      ].filter(Boolean), ctx);

      startSection(doc, ctx, {
        eyebrow: 'Premies',
        icon: 'gift',
        title: 'Mogelijke premies',
        keepWith: 78
      });
      (r.premies || []).forEach(function (pr) {
        sandCard(doc, [
          {
            text: pr.scheme + '. ' + (pr.relevance === 'mogelijk' ? 'mogelijk relevant' : 'beperkt relevant'),
            bold: true, color: COLOR.ink, size: 9.5
          },
          { text: pr.reason },
          { text: 'Nog nodig: ' + ((pr.missing || []).join('; ') || 'bevestiging via officieel loket'), size: 8 },
          {
            text: 'Officieel: ' + pr.officialUrl +
              (pr.regulationDate ? '  ·  Regelgeving: ' + pr.regulationDate : '') +
              '  ·  Gecontroleerd ' + (pr.checkedAt || r.asOf || '2026'),
            size: 7.5
          }
        ], ctx);
      });
      bodyText(doc, 'ELYAN berekent geen exact premiebedrag zonder inkomen en eigendomstype.', ctx, { size: 8 });

      /* ===== 15. DECISION SUMMARY + CLOSING ===== */
      // Full closing block (decision + steps + disclaimer + contact) stays together —
      // never orphan disclaimer/contact on a near-empty last page.
      maybeNewSection(doc, ctx, 268);
      startSection(doc, ctx, {
        eyebrow: 'Besluit',
        icon: 'target',
        title: 'Jouw ELYAN beslissingssamenvatting',
        keepWith: 56
      });
      decisionCards(doc, [
        { label: 'Verwacht budget', value: pricing.fmtEUR(r.price) },
        { label: 'Veilig budget', value: pricing.fmtEUR(safeBudget) },
        { label: 'Belangrijkste risico', value: topRisk },
        { label: 'Beste bespaarkans', value: topSave }
      ], ctx);

      startSection(doc, ctx, {
        eyebrow: 'Actie',
        icon: 'arrowRight',
        title: 'Jouw volgende 5 stappen',
        keepWith: 30
      });
      numberedList(doc, nextSteps, ctx);

      var disclaimer =
        'Dit rapport is indicatief en gebaseerd op Belgische mid-market componentprijzen (' +
        (r.asOf || '2026') + ', dataset ' + (r.marketDataVersion || '') +
        ') en jouw antwoorden. Het vervangt geen offerte op maat en heeft geen contractuele waarde. Vraag steeds een offerte bij een erkende aannemer. ELYAN is niet aansprakelijk voor beslissingen op basis van dit rapport.';
      var contactH = 38;
      doc.font('Helvetica').fontSize(6.5);
      var discH = doc.heightOfString(disclaimer, { width: CONTENT_W, lineGap: 1.0 });
      var closeBlock = 10 + discH + 8 + contactH;
      // If closing barely overflows, nudge up instead of starting an empty page
      if (doc.y + closeBlock > CONTENT_BOTTOM) {
        var overflow = doc.y + closeBlock - CONTENT_BOTTOM;
        if (overflow < 36) doc.y = Math.max(doc.y - overflow - 2, MARGIN + 40);
      }
      doc.y += 2;
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y)
        .lineWidth(0.55).strokeColor(COLOR.line).stroke();
      doc.y += 4;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.inkFaint).text('Disclaimer', MARGIN, doc.y);
      doc.y += 2;
      doc.font('Helvetica').fontSize(6.5).fillColor(COLOR.inkFaint)
        .text(disclaimer, MARGIN, doc.y, { width: CONTENT_W, lineGap: 1.0 });
      doc.y += 6;

      var contactY = Math.min(doc.y, CONTENT_BOTTOM - contactH);
      doc.roundedRect(MARGIN, contactY, CONTENT_W, contactH, 6).fill(COLOR.primary);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.white)
        .text('ELYAN. Jouw renovatie. Duidelijker.', MARGIN + 12, contactY + 7);
      doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.sandDeep)
        .text('Vragen over dit rapport?  elyan.info@gmail.com', MARGIN + 12, contactY + 22);
      doc.y = contactY + contactH + 2;

      footer(doc, ctx.page.n, reportDate);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildReportPdf: buildReportPdf };
