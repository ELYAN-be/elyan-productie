/* ============================================================
   ELYAN. Calculator 2 project dossier PDF (pdfkit)
   Presentation only, design family aligned with pdf-report.js
   Does NOT modify Calculator 1. Does NOT change calculation values.
   ============================================================ */
'use strict';

var PDFDocument = require('pdfkit');
var path = require('path');
var Labels = require('../../shared/calc2/result-labels');

var ASSETS = path.join(__dirname, '..', '_pdf-assets');
var ICON = {
  target: path.join(ASSETS, 'i-target.png'),
  euro: path.join(ASSETS, 'i-euro.png'),
  clock: path.join(ASSETS, 'i-clock.png'),
  info: path.join(ASSETS, 'i-info.png'),
  bulb: path.join(ASSETS, 'i-bulb.png'),
  check: path.join(ASSETS, 'i-check.png'),
  shield: path.join(ASSETS, 'i-shield.png')
};

var COLOR = {
  primary: '#3F4A32',
  primaryDark: '#2C3423',
  primarySoft: '#7C8863',
  sand: '#F6F4EC',
  sandDeep: '#EEEADA',
  mint: '#E8EDE3',
  ink: '#14150F',
  inkSoft: '#5B5D4F',
  inkFaint: '#6E7062',
  line: '#E7E3D3',
  white: '#FFFFFF',
  risk: '#6B3A2A'
};

var PAGE = { width: 595.28, height: 841.89 };
var MARGIN = 44;
var CONTENT_W = PAGE.width - MARGIN * 2;
var FOOTER_Y = PAGE.height - 36;
var CONTENT_BOTTOM = FOOTER_Y - 16;
/* Balanced editorial scale — breathe without sparse gaps */
var SPACE = { XS: 3, S: 5, M: 8, L: 12, XL: 18, XXL: 24 };
var GAP = SPACE.M;
var TABLE_ROW_H = 22;
var TABLE_HEADER_H = 22;
var HEADER_AFTER = 50; /* approx doc.y just under page header */

function fmtEUR(n) {
  if (n == null || !isFinite(Number(n))) return '-';
  var v = Math.round(Number(n));
  var neg = v < 0;
  var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + '€ ' + s;
}

function fmtDate(d) {
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function safeIcon(doc, key, x, y, size) {
  if (!key || !ICON[key]) return;
  try { doc.image(ICON[key], x, y, { width: size, height: size }); } catch (e) { /* missing */ }
}

function header(doc, subtitle) {
  var y = 26;
  doc.save();
  doc.rect(MARGIN, y + 5, 2.8, 6).fill(COLOR.primary);
  doc.rect(MARGIN + 4.5, y + 2.5, 2.8, 8.5).fill(COLOR.primary);
  doc.rect(MARGIN + 9, y, 2.8, 11).fill(COLOR.primary);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
    .text('ELYAN', MARGIN + 16, y - 1, { characterSpacing: 0.4 });
  doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkFaint)
    .text(subtitle || 'Renovatieanalyse', MARGIN, y - 1, { width: CONTENT_W, align: 'right' });
  doc.moveTo(MARGIN, y + 16).lineTo(PAGE.width - MARGIN, y + 16)
    .lineWidth(0.7).strokeColor(COLOR.line).stroke();
  doc.y = y + 24;
}

function footer(doc, pageNum, reportDate) {
  var oldBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  var y = FOOTER_Y - 2;
  doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y)
    .lineWidth(0.7).strokeColor(COLOR.line).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('Indicatieve projectraming · ELYAN' + (reportDate ? '  ·  ' + reportDate : ''), MARGIN, y + 6, {
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
    header(doc, ctx.subtitle);
    return true;
  }
  return false;
}

/** Break before drawing if the whole block won't fit — avoids orphaned tails */
function keepBlock(doc, needed, ctx) {
  return ensureSpace(doc, Math.max(needed, 1), ctx);
}

function measureTextH(doc, text, font, size, width, lineGap) {
  doc.font(font || 'Helvetica').fontSize(size || 9);
  return doc.heightOfString(String(text || ''), { width: width || CONTENT_W, lineGap: lineGap != null ? lineGap : 1.6 });
}

function estimateNumberedListH(doc, items) {
  var bubble = 15;
  var h = 0;
  (items || []).forEach(function (item) {
    var th = measureTextH(doc, item, 'Helvetica', 8.7, CONTENT_W - bubble - 9, 1.5);
    h += Math.max(bubble, th) + SPACE.S;
  });
  return h + SPACE.XS;
}

function estimateBulletListH(doc, items) {
  var iconSize = 9;
  var h = 0;
  (items || []).forEach(function (item) {
    var th = measureTextH(doc, item, 'Helvetica', 8.8, CONTENT_W - iconSize - 7, 1.5);
    h += Math.max(iconSize, th) + SPACE.S;
  });
  return h + SPACE.XS;
}

function estimateSandCardH(doc, lines) {
  var pad = 12;
  var textW = CONTENT_W - pad * 2;
  var h = pad;
  (lines || []).forEach(function (line, idx) {
    h += measureTextH(doc, line.text, line.bold ? 'Helvetica-Bold' : 'Helvetica', line.size || 9, textW, 2);
    if (idx < lines.length - 1) h += SPACE.S;
  });
  return h + pad;
}

function eyebrow(doc, text) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.primary)
    .text(String(text).toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.15 });
  doc.y += SPACE.S;
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
  doc.y = Math.max(doc.y, yStart + size) + (opts.marginBottom !== undefined ? opts.marginBottom : SPACE.M);
}

/**
 * Start a major section. keepWith = estimated body height after the heading.
 * opts.atomic: keep heading+body together (small lists/cards); otherwise
 * allow the body to continue if the heading can start usefully.
 * Page-break is decided BEFORE applying the pre-section gap.
 */
function startSection(doc, ctx, opts) {
  opts = opts || {};
  var keepWith = opts.keepWith != null ? opts.keepWith : 56;
  var headerH = (opts.eyebrow ? 16 : 0) + 26;
  var midPage = doc.y >= HEADER_AFTER + 4;
  var gap = midPage ? SPACE.L : 0;
  var remaining = CONTENT_BOTTOM - doc.y;
  var totalNeed = gap + headerH + keepWith;
  var mustBreak = false;
  if (midPage && totalNeed > remaining) {
    if (opts.atomic) {
      mustBreak = true;
    } else {
      /* Heading + first content must fit; rest may continue */
      mustBreak = remaining < gap + headerH + 56;
    }
  }
  if (mustBreak) {
    footer(doc, ctx.page.n, ctx.reportDate);
    doc.addPage();
    ctx.page.n++;
    header(doc, ctx.subtitle);
  } else if (midPage) {
    doc.y += gap;
  } else {
    ensureSpace(doc, headerH + Math.min(keepWith, 72), ctx);
  }
  if (opts.eyebrow) eyebrow(doc, opts.eyebrow);
  sectionTitle(doc, opts.icon || null, opts.title, ctx, Object.assign({ skipEnsure: true }, opts.titleOpts || {}));
}

function bodyText(doc, text, ctx, opts) {
  opts = opts || {};
  ensureSpace(doc, 24, ctx);
  doc.font('Helvetica').fontSize(opts.size || 9).fillColor(opts.color || COLOR.inkSoft)
    .text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2.2 });
  doc.y += opts.after !== undefined ? opts.after : SPACE.M;
}

function sandCard(doc, lines, ctx, minH) {
  var pad = 12;
  var textW = CONTENT_W - pad * 2;
  var h = estimateSandCardH(doc, lines);
  if (minH) h = Math.max(h, minH);
  keepBlock(doc, h + SPACE.S, ctx);
  var startY = doc.y;
  doc.roundedRect(MARGIN, startY, CONTENT_W, h, 8).fill(COLOR.sand);
  var y = startY + pad;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9)
      .fillColor(line.color || COLOR.inkSoft)
      .text(line.text, MARGIN + pad, y, { width: textW, lineGap: 2 });
    y = doc.y + (idx < lines.length - 1 ? SPACE.S : 0);
  });
  doc.y = startY + h + SPACE.L;
}

function mintBudgetCard(doc, budget, statusLabel, confLabel, durationText, ctx, opts) {
  opts = opts || {};
  var isPartial = !!opts.isPartial;
  var h = isPartial ? 138 : 118;
  keepBlock(doc, h + SPACE.M, ctx);
  var y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 10).fill(COLOR.mint);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 10).lineWidth(0.9).strokeColor(COLOR.primarySoft).stroke();

  if (isPartial) {
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('GEDEELTELIJKE RAMING: ENKEL INSCHATTBARE ONDERDELEN', MARGIN + 16, y + 12, { characterSpacing: 0.6 });
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft)
      .text('Voor de onderdelen waarvoor voldoende informatie beschikbaar is:', MARGIN + 16, y + 28, {
        width: CONTENT_W - 32
      });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.ink)
      .text(fmtEUR(budget.low) + '  –  ' + fmtEUR(budget.high), MARGIN + 16, y + 44, { width: CONTENT_W - 32 });
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('INDICATIEF BEDRAG (NIET COMPLEET)', MARGIN + 16, y + 72, { characterSpacing: 0.6 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR.primaryDark)
      .text(fmtEUR(budget.recommendedExpected), MARGIN + 16, y + 86);
  } else {
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('REALISTISCHE RANGE', MARGIN + 16, y + 14, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.ink)
      .text(fmtEUR(budget.low) + '  –  ' + fmtEUR(budget.high), MARGIN + 16, y + 28, { width: CONTENT_W - 32 });

    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('AANBEVOLEN PROJECTBUDGET (GESELECTEERDE WERKEN)', MARGIN + 16, y + 56, { characterSpacing: 0.55 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.primaryDark)
      .text(fmtEUR(budget.recommendedExpected), MARGIN + 16, y + 70);
  }

  doc.font('Helvetica').fontSize(8).fillColor(COLOR.inkSoft)
    .text(statusLabel + '  ·  Betrouwbaarheid: ' + confLabel + (durationText ? '  ·  ' + durationText : ''),
      MARGIN + 16, y + h - 22, { width: CONTENT_W - 32 });
  doc.y = y + h + SPACE.L;
}

function kpiRow(doc, cells, ctx) {
  var n = cells.length;
  var gap = SPACE.S;
  var boxW = (CONTENT_W - gap * (n - 1)) / n;
  var boxH = 52;
  keepBlock(doc, boxH + SPACE.M, ctx);
  var rowY = doc.y;
  cells.forEach(function (m, i) {
    var x = MARGIN + i * (boxW + gap);
    doc.roundedRect(x, rowY, boxW, boxH, 7).fill(COLOR.sand);
    doc.font('Helvetica').fontSize(6.4).fillColor(COLOR.inkFaint)
      .text(String(m.label).toUpperCase(), x + 8, rowY + 10, { width: boxW - 16, characterSpacing: 0.35 });
    doc.font('Helvetica-Bold').fontSize(m.big ? 12 : 10).fillColor(COLOR.ink)
      .text(String(m.value), x + 8, rowY + 28, { width: boxW - 16 });
  });
  doc.y = rowY + boxH + SPACE.L;
}

function metaGrid(doc, cells, ctx) {
  var boxW = (CONTENT_W - SPACE.S) / 2;
  var boxH = 36;
  var i = 0;
  while (i < cells.length) {
    ensureSpace(doc, boxH + SPACE.S, ctx);
    var rowY = doc.y;
    for (var col = 0; col < 2 && i < cells.length; col++, i++) {
      var m = cells[i];
      var x = MARGIN + col * (boxW + SPACE.S);
      doc.roundedRect(x, rowY, boxW, boxH, 6).fill(COLOR.sand);
      doc.font('Helvetica').fontSize(6.2).fillColor(COLOR.inkFaint)
        .text(String(m.label).toUpperCase(), x + 10, rowY + 8, { characterSpacing: 0.35 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
        .text(String(m.value), x + 10, rowY + 20, { width: boxW - 20 });
    }
    doc.y = rowY + boxH + SPACE.S;
  }
  doc.y += SPACE.XS;
}

function tableHeader(doc, cols, y) {
  doc.roundedRect(MARGIN, y, CONTENT_W, TABLE_HEADER_H, 5).fill(COLOR.sandDeep);
  var x = MARGIN + 10;
  cols.forEach(function (c) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.inkFaint)
      .text(c.label.toUpperCase(), x, y + 7, { width: c.w, characterSpacing: 0.4 });
    x += c.w;
  });
}

function tableRow(doc, cols, values, y, zebra) {
  if (zebra) doc.rect(MARGIN, y, CONTENT_W, TABLE_ROW_H).fill('#FAF9F4');
  var x = MARGIN + 10;
  cols.forEach(function (c, i) {
    doc.font(i === cols.length - 1 ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5).fillColor(COLOR.ink)
      .text(String(values[i] == null ? '-' : values[i]), x, y + 6, {
        width: c.w - 4, align: c.align || 'left', lineBreak: false
      });
    x += c.w;
  });
}

function bulletList(doc, items, ctx, iconKey, opts) {
  opts = opts || {};
  iconKey = iconKey || 'check';
  var iconSize = 9;
  if (opts.keepTogether && items && items.length && items.length <= 8) {
    keepBlock(doc, estimateBulletListH(doc, items), ctx);
  }
  items.forEach(function (item) {
    var th = measureTextH(doc, item, 'Helvetica', 8.8, CONTENT_W - iconSize - 7, 1.5);
    ensureSpace(doc, Math.max(iconSize, th) + SPACE.S + 2, ctx);
    var yTop = doc.y;
    safeIcon(doc, iconKey, MARGIN, yTop + 1, iconSize);
    doc.font('Helvetica').fontSize(8.8).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + iconSize + 7, yTop, { width: CONTENT_W - iconSize - 7, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + iconSize) + SPACE.S;
  });
  doc.y += SPACE.XS;
}

function numberedList(doc, items, ctx, opts) {
  opts = opts || {};
  var bubble = 15;
  if (opts.keepTogether && items && items.length && items.length <= 6) {
    keepBlock(doc, estimateNumberedListH(doc, items), ctx);
  }
  items.forEach(function (item, i) {
    var th = measureTextH(doc, item, 'Helvetica', 8.7, CONTENT_W - bubble - 9, 1.5);
    ensureSpace(doc, Math.max(bubble, th) + SPACE.S + 2, ctx);
    var yTop = doc.y;
    doc.circle(MARGIN + bubble / 2, yTop + bubble / 2, bubble / 2).fill(COLOR.primary);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.white)
      .text(String(i + 1), MARGIN, yTop + bubble / 2 - 3.5, { width: bubble, align: 'center' });
    doc.font('Helvetica').fontSize(8.7).fillColor(COLOR.inkSoft)
      .text(item, MARGIN + bubble + 9, yTop + 1, { width: CONTENT_W - bubble - 9, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yTop + bubble) + SPACE.S;
  });
  doc.y += SPACE.XS;
}

function subHeading(doc, text, ctx, keepWith) {
  var block = SPACE.S + 14 + (keepWith || 40);
  keepBlock(doc, block, ctx);
  doc.y += SPACE.S;
  doc.font('Helvetica-Bold').fontSize(9.2).fillColor(COLOR.primaryDark).text(text, MARGIN, doc.y);
  doc.y += SPACE.S;
}

function friendlyRisk(text) {
  var s = String(text || '');
  var map = [
    [/NMI packages?:/i, 'Nog onvoldoende info bij:'],
    [/Partial estimate[^\n]*/i, 'Gedeeltelijke schatting, niet elk onderdeel is volledig ingeschat.'],
    [/Building age uncertainty[^\n]*/i, 'Oudere woning, grotere kans op verborgen gebreken.'],
    [/Occupied during works/i, 'Woning blijft bewoond tijdens de werken, dit kan planning en uitvoering beïnvloeden.'],
    [/Property condition:\s*/i, 'Staat van de woning: '],
    [/Deep energy \/ envelope interaction/i, 'Combinatie van energie- en schilwerken verhoogt de complexiteit.'],
    [/unresolved/i, 'Nog niet bevestigd'],
    [/\bNMI\b/g, 'onvoldoende informatie'],
    [/PARTIAL_ESTIMATE/g, 'gedeeltelijke schatting'],
    [/MODEL_ASSUMPTION/g, 'modelaanname'],
    [/USER_ASSUMPTION/g, 'jouw aanname']
  ];
  map.forEach(function (pair) { s = s.replace(pair[0], pair[1]); });
  return s.replace(/_/g, ' ').trim();
}

function categorizeRisk(text) {
  var t = String(text || '').toLowerCase();
  if (/asbest|structur|dragend|stabil|gevel|dak|techn/.test(t)) return 'technisch';
  if (/vergun|bewoon|planning|aannemer|coördin|coordinat|organis/.test(t)) return 'project';
  if (/budget|reserve|kost|btw|prijs|overlap|aftrek/.test(t)) return 'budget';
  return 'open';
}

function packageAmount(entry) {
  if (entry.adjusted && entry.adjusted.suppressed) return '€0 (elders)';
  if (entry.adjusted && entry.adjusted.expected != null) return fmtEUR(entry.adjusted.expected);
  if (entry.estimate && entry.estimate.expected != null) return fmtEUR(entry.estimate.expected);
  if (entry.provisionalEstimate && entry.provisionalEstimate.expected != null) {
    return 'Indicatie ' + fmtEUR(entry.provisionalEstimate.expected);
  }
  return '-';
}

function packageLabel(entry) {
  return entry.instanceLabel
    ? ((entry.label || entry.packageType || entry.key) + ': ' + entry.instanceLabel)
    : (entry.label || entry.packageType || entry.key || '-');
}

function drawCover(doc, ctx, project, state, profile) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.primaryDark);
  doc.save();
  doc.opacity(0.32);
  doc.circle(PAGE.width - 30, 80, 150).fill(COLOR.primarySoft);
  doc.opacity(0.14);
  doc.circle(24, PAGE.height - 40, 120).fill(COLOR.sand);
  doc.restore();

  var lx = MARGIN + 4;
  var ly = 72;
  doc.rect(lx, ly + 14, 7, 18).fill(COLOR.sand);
  doc.rect(lx + 11, ly + 7, 7, 25).fill(COLOR.sand);
  doc.rect(lx + 22, ly, 7, 32).fill(COLOR.sand);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLOR.white)
    .text('ELYAN', lx + 40, ly + 8, { characterSpacing: 0.8 });

  doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
    .text(ctx.isInvestor ? 'RENOVATIE- & INVESTERINGSANALYSE' : 'RENOVATIEANALYSE',
      MARGIN + 4, 200, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(26).fillColor(COLOR.white)
    .text(ctx.isInvestor ? 'Jouw ELYAN renovatie- & investeringsanalyse' : 'Jouw ELYAN renovatieanalyse',
      MARGIN + 4, 222, { width: CONTENT_W * 0.92 });

  var goal = state.goal === 'investor' ? 'Kopen, renoveren & doorverkopen' : 'Eigen woning renoveren';
  var meta = [
    (profile.province || '-'),
    (profile.propertyType || '-'),
    profile.areaM2 === 'weet_niet' ? 'Oppervlakte onbekend' : ((profile.areaM2 || '-') + ' m²'),
    goal
  ].join('  ·  ');
  doc.font('Helvetica').fontSize(11).fillColor(COLOR.sand)
    .text(meta, MARGIN + 4, 310, { width: CONTENT_W - 8 });
  doc.font('Helvetica').fontSize(10).fillColor(COLOR.sandDeep)
    .text(ctx.reportDate, MARGIN + 4, doc.y + 10);

  var budget = project.budget || {};
  var isPartial = project.status === 'PARTIAL_ESTIMATE';
  var cardY = 400;
  var cardH = isPartial ? 168 : 150;
  doc.roundedRect(MARGIN, cardY, CONTENT_W, cardH, 12).fill(COLOR.mint);
  if (isPartial) {
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('GEDEELTELIJKE RAMING', MARGIN + 18, cardY + 16, { characterSpacing: 0.8 });
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft)
      .text('Voor de onderdelen waarvoor voldoende informatie beschikbaar is:', MARGIN + 18, cardY + 34, {
        width: CONTENT_W - 36
      });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.ink)
      .text(fmtEUR(budget.low) + '  –  ' + fmtEUR(budget.high), MARGIN + 18, cardY + 52);
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('INDICATIEF BEDRAG (NIET COMPLEET)', MARGIN + 18, cardY + 84, { characterSpacing: 0.55 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.primaryDark)
      .text(fmtEUR(budget.recommendedExpected), MARGIN + 18, cardY + 100);
  } else {
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('REALISTISCHE RANGE', MARGIN + 18, cardY + 18, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLOR.ink)
      .text(fmtEUR(budget.low) + '  –  ' + fmtEUR(budget.high), MARGIN + 18, cardY + 34);
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLOR.primary)
      .text('AANBEVOLEN PROJECTBUDGET (GESELECTEERDE WERKEN)', MARGIN + 18, cardY + 68, { characterSpacing: 0.45 });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.primaryDark)
      .text(fmtEUR(budget.recommendedExpected), MARGIN + 18, cardY + 84);
  }
  var status = Labels.allInStatusLabel(project.allInStatus || project.status);
  var conf = Labels.confidenceLabel(project.confidence);
  var dur = project.duration
    ? ('Indicatief ' + project.duration.minWeeks + '–' + project.duration.maxWeeks + ' weken')
    : '';
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft)
    .text(status + '  ·  ' + conf + (dur ? '  ·  ' + dur : ''), MARGIN + 18, cardY + cardH - 28, {
      width: CONTENT_W - 36
    });

  doc.font('Helvetica').fontSize(9).fillColor(COLOR.sandDeep)
    .text('Indicatieve raming voor geselecteerde werken. Geen offerte. Geen turnkey van elke denkbare kost.',
      MARGIN + 4, PAGE.height - 70, { width: CONTENT_W });
}

function buildProjectReportPdf(data) {
  return new Promise(function (resolve, reject) {
    try {
      var doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 48, left: MARGIN, right: MARGIN }
      });
      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var project = data.project || {};
      var state = data.state || {};
      var finance = data.finance || null;
      var profile = state.propertyProfile || {};
      var isInvestor = state.goal === 'investor' && finance && finance.ran;
      var reportDate = fmtDate(new Date());
      var ctx = {
        page: { n: 1 },
        reportDate: reportDate,
        subtitle: isInvestor ? 'Renovatie- & investeringsanalyse' : 'Renovatieanalyse',
        isInvestor: isInvestor
      };

      /* ---- COVER ---- */
      drawCover(doc, ctx, project, state, profile);
      footer(doc, ctx.page.n, reportDate);
      doc.addPage();
      ctx.page.n = 2;
      header(doc, ctx.subtitle);

      var budget = project.budget || {};
      var statusLabel = Labels.allInStatusLabel(project.allInStatus || project.status);
      var confLabel = Labels.confidenceLabel(project.confidence);
      var durationText = project.duration
        ? ('ongeveer ' + project.duration.minWeeks + '–' + project.duration.maxWeeks + ' weken')
        : '';

      /* ---- Executive ---- */
      startSection(doc, ctx, { eyebrow: 'Samenvatting', icon: 'target', title: 'Executive overview', keepWith: 200 });
      bodyText(doc,
        'Indicatieve raming voor jouw geselecteerde renovatiewerken + projectlagen. Bedragen excl. btw tenzij anders vermeld. Geen turnkey van elke denkbare kost.',
        ctx, { after: SPACE.S });

      if (project.status === 'PARTIAL_ESTIMATE') {
        var miss = ((project.presentation && project.presentation.unpricedPackages) || [])
          .map(function (u) { return (u.label || u.key) + (u.reason ? ' (' + u.reason + ')' : ''); });
        sandCard(doc, [
          { text: 'Gedeeltelijke raming', bold: true, size: 10, color: COLOR.ink },
          { text: 'Het bedrag hieronder geldt alleen voor onderdelen met voldoende informatie, geen volledig woningrenovatiebudget.', size: 9 },
          miss.length
            ? { text: 'Nog niet betrouwbaar meegerekend: ' + miss.join('; ') + '.', size: 9 }
            : { text: 'Vul open vragen aan om meer onderdelen te laten meerekenen.', size: 9 }
        ], ctx);
      }

      mintBudgetCard(doc, budget, statusLabel, confLabel,
        durationText ? ('Duur: ' + durationText) : '', ctx, {
          isPartial: project.status === 'PARTIAL_ESTIMATE'
        });

      if (project.presentation && project.presentation.marketPositionNote) {
        bodyText(doc, project.presentation.marketPositionNote, ctx, { after: SPACE.S });
      }

      metaGrid(doc, [
        { label: 'Doel', value: state.goal === 'investor' ? 'Kopen & renoveren' : 'Eigen woning' },
        { label: 'Provincie', value: profile.province || '-' },
        { label: 'Type', value: profile.propertyType || '-' },
        {
          label: 'Oppervlakte',
          value: profile.areaM2 === 'weet_niet' ? 'Weet ik niet' : ((profile.areaM2 || '-') + (profile.areaM2 && profile.areaM2 !== 'weet_niet' ? ' m²' : ''))
        },
        { label: 'Afwerking', value: state.finishProfile || '-' },
        { label: 'Organisatie', value: state.procurementModel || '-' }
      ], ctx);

      /* Drivers teaser */
      var pkgs = (project.rawPackages || []).filter(function (e) {
        return e.status === 'OK' || e.status === 'NEEDS_MORE_INFORMATION';
      });
      var drivers = pkgs.filter(function (e) {
        return e.status === 'OK' && ((e.adjusted && e.adjusted.expected) || (e.estimate && e.estimate.expected));
      }).sort(function (a, b) {
        var av = (a.adjusted && a.adjusted.expected) || (a.estimate && a.estimate.expected) || 0;
        var bv = (b.adjusted && b.adjusted.expected) || (b.estimate && b.estimate.expected) || 0;
        return bv - av;
      }).slice(0, 5);

      if (drivers.length) {
        startSection(doc, ctx, {
          eyebrow: 'Focus', icon: 'euro', title: 'Grootste kostendrijvers',
          keepWith: Math.min(drivers.length, 5) * 34 + 8
        });
        drivers.forEach(function (e, i) {
          var amt = (e.adjusted && e.adjusted.expected) || (e.estimate && e.estimate.expected) || 0;
          ensureSpace(doc, 32, ctx);
          var y = doc.y;
          doc.roundedRect(MARGIN, y, CONTENT_W, 26, 6).fill(i === 0 ? COLOR.mint : COLOR.sand);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
            .text((i + 1) + '.  ' + packageLabel(e), MARGIN + 12, y + 8, { width: CONTENT_W * 0.62 });
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.primaryDark)
            .text(fmtEUR(amt), MARGIN + CONTENT_W * 0.62, y + 8, { width: CONTENT_W * 0.35, align: 'right' });
          doc.y = y + 26 + SPACE.S;
        });
        doc.y += SPACE.XS;
      }

      /* ---- Budget breakdown ---- */
      var budgetRows = 5;
      startSection(doc, ctx, {
        eyebrow: 'Budget', icon: 'euro', title: 'Budgetopbouw',
        keepWith: TABLE_HEADER_H + budgetRows * TABLE_ROW_H + 48
      });
      var soft = budget.softCostsExpected != null ? budget.softCostsExpected : 0;
      var proc = budget.procurementCostsExpected != null ? budget.procurementCostsExpected : 0;
      var colsBudget = [
        { label: 'Laag', w: CONTENT_W * 0.46 },
        { label: 'Bedrag', w: CONTENT_W * 0.54, align: 'right' }
      ];
      var ty = doc.y;
      tableHeader(doc, colsBudget, ty);
      ty += TABLE_HEADER_H;
      [
        ['Renovatiewerken', fmtEUR(budget.worksExpected)],
        ['Projectkosten', fmtEUR(soft)],
        ['Organisatie / coördinatie', fmtEUR(proc)],
        ['Projectreserve voor onvoorziene posten', fmtEUR(budget.reserveExpected)],
        [project.status === 'PARTIAL_ESTIMATE'
          ? 'Indicatief subtotaal (inschattbare onderdelen)'
          : 'Aanbevolen projectbudget (geselecteerde werken)',
          fmtEUR(budget.recommendedExpected)]
      ].forEach(function (row, i) {
        tableRow(doc, colsBudget, row, ty, i % 2 === 1);
        ty += TABLE_ROW_H;
      });
      doc.y = ty + SPACE.M;
      bodyText(doc, 'Range ' + fmtEUR(budget.low) + ' – ' + fmtEUR(budget.high) +
        '. De projectreserve dekt typische onvoorziene interactierisico’s; geen garantie tegen alle meerwerken. Package-ranges dragen aparte onzekerheid.', ctx);

      var ex = (project.presentation && project.presentation.exclusions) ||
        (Labels.exclusionsCopy && Labels.exclusionsCopy());
      if (ex) {
        startSection(doc, ctx, {
          eyebrow: 'Scope', icon: 'info', title: ex.title,
          keepWith: 64
        });
        bodyText(doc, ex.body, ctx);
      }

      /* ---- Work packages ---- */
      startSection(doc, ctx, {
        eyebrow: 'Scope', icon: 'info', title: 'Werkpakketten',
        keepWith: TABLE_HEADER_H + TABLE_ROW_H * 3 + 8
      });
      var colsPkg = [
        { label: 'Onderdeel', w: CONTENT_W * 0.42 },
        { label: 'Status', w: CONTENT_W * 0.28 },
        { label: 'Verwachte kost', w: CONTENT_W * 0.30, align: 'right' }
      ];
      ty = doc.y;
      tableHeader(doc, colsPkg, ty);
      ty += TABLE_HEADER_H;
      var pkgRows = pkgs.slice(0, 16);
      if (!pkgRows.length) {
        bodyText(doc, 'Geen actieve werkpakketten in deze raming.', ctx);
      } else {
        pkgRows.forEach(function (e, i) {
          if (ty + TABLE_ROW_H + SPACE.S > CONTENT_BOTTOM) {
            doc.y = ty;
            keepBlock(doc, TABLE_HEADER_H + TABLE_ROW_H + 8, ctx);
            ty = doc.y;
            tableHeader(doc, colsPkg, ty);
            ty += TABLE_HEADER_H;
          }
          var status = Labels.packageStatusLabel(e.status);
          if (status === 'Nog onvoldoende informatie') status = 'Nog te bepalen';
          tableRow(doc, colsPkg, [packageLabel(e), status, packageAmount(e)], ty, i % 2 === 1);
          ty += TABLE_ROW_H;
        });
        doc.y = ty + SPACE.M;
      }

      /* ---- Risks ---- */
      startSection(doc, ctx, {
        eyebrow: 'Risico’s', icon: 'shield', title: 'Risico’s & open punten',
        keepWith: 72
      });
      var rawRisks = []
        .concat(project.warnings || [])
        .concat(project.risks || [])
        .concat(((project.allInCosts && project.allInCosts.unresolvedCosts) || []).map(function (u) {
          return Labels.softCostFriendly(u.id, u.label) + (u.reason ? ': ' + u.reason : '');
        }));
      var grouped = { technisch: [], project: [], budget: [], open: [] };
      rawRisks.forEach(function (r) {
        var t = typeof r === 'string' ? r : (r.note || r.code || String(r));
        var friendly = friendlyRisk(t);
        if (!friendly) return;
        grouped[categorizeRisk(friendly)].push(friendly);
      });
      var riskSections = [
        { key: 'technisch', title: 'Technisch' },
        { key: 'project', title: 'Project' },
        { key: 'budget', title: 'Budget' },
        { key: 'open', title: 'Nog te bevestigen' }
      ];
      var anyRisk = false;
      riskSections.forEach(function (sec) {
        var items = grouped[sec.key].slice(0, 5);
        if (!items.length) return;
        anyRisk = true;
        var groupH = estimateBulletListH(doc, items);
        subHeading(doc, sec.title, ctx, Math.min(groupH, 80));
        bulletList(doc, items, ctx, 'info', { keepTogether: items.length <= 4 });
        doc.y += SPACE.S;
      });
      if (!anyRisk) bodyText(doc, 'Geen zware open waarschuwingen in deze raming.', ctx);

      /* ---- Sequence ---- */
      var phaseCount = ((project.duration && project.duration.phases) || []).length;
      startSection(doc, ctx, {
        eyebrow: 'Planning', icon: 'clock', title: 'Indicatieve werfvolgorde',
        keepWith: Math.min(phaseCount, 4) * 32 + 40
      });
      var phases = (project.duration && project.duration.phases) || [];
      if (phases.length) {
        phases.forEach(function (ph, i) {
          ensureSpace(doc, 32, ctx);
          var y = doc.y;
          doc.roundedRect(MARGIN, y, CONTENT_W, 24, 6).fill(COLOR.sand);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.ink)
            .text((i + 1) + '.  ' + ph.label, MARGIN + 12, y + 7, { width: CONTENT_W * 0.7 });
          doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.inkSoft)
            .text('~' + ph.weeks + ' w.', MARGIN, y + 7, { width: CONTENT_W - 12, align: 'right' });
          doc.y = y + 24 + SPACE.S;
        });
        doc.y += SPACE.S;
        bodyText(doc,
          'Totaal indicatief: ' + project.duration.minWeeks + '–' + project.duration.maxWeeks +
          ' weken. Planning kan wijzigen door vergunningen, levertermijnen en beschikbaarheid van aannemers.',
          ctx, { after: SPACE.M });
      } else if (durationText) {
        bodyText(doc, 'Indicatieve uitvoeringsduur: ' + durationText + '.', ctx);
      }

      /* ---- VAT ---- */
      var vatLines = [{
        text: (project.vatSummary && project.vatSummary.note) ||
          'Projectbedragen zijn in principe excl. btw. Het toepasselijke tarief (vaak 6% of 21%) hangt af van feiten en moet bevestigd worden met aannemer/boekhouder.',
        size: 9
      }];
      startSection(doc, ctx, {
        eyebrow: 'BTW', icon: 'info', title: 'BTW-toelichting',
        keepWith: estimateSandCardH(doc, vatLines) + 8,
        atomic: true
      });
      sandCard(doc, vatLines, ctx);

      /* ---- Quote checklist ---- */
      var checklistItems = [
        'Vraag offertes op dezelfde scope en intensiteit.',
        'Laat meenemen: afbraak, afvoer, steigers, keuringen en btw.',
        'Vraag uitsluitingen en meerwerken expliciet.',
        'Vergelijk planning en bereikbaarheid, niet enkel prijs.',
        'Check verzekering, erkenning en referenties.'
      ];
      startSection(doc, ctx, {
        eyebrow: 'Offertes', icon: 'check', title: 'Offertechecklist',
        keepWith: estimateBulletListH(doc, checklistItems),
        atomic: true
      });
      bulletList(doc, checklistItems, ctx, 'check', { keepTogether: true });

      /* ---- Contractor questions ---- */
      var contractorQs = [
        'Welke posten zitten precies in / buiten deze offerte?',
        'Hoe gaan jullie om met onvoorziene asbest of structurele ontdekkingen?',
        'Wat is de geplande volgorde en hoe lang duurt elke fase indicatief?',
        'Welk btw-tarief passen jullie toe en onder welke voorwaarden?'
      ];
      startSection(doc, ctx, {
        eyebrow: 'Gesprek', icon: 'bulb', title: 'Vragen voor aannemers',
        keepWith: estimateNumberedListH(doc, contractorQs),
        atomic: true
      });
      numberedList(doc, contractorQs, ctx, { keepTogether: true });

      /* ---- Next steps ---- */
      var nextSteps = Labels.nextStepsHomeowner(project, state);
      startSection(doc, ctx, {
        eyebrow: 'Actie', icon: 'target', title: 'Jouw volgende stappen',
        keepWith: estimateNumberedListH(doc, nextSteps),
        atomic: true
      });
      numberedList(doc, nextSteps, ctx, { keepTogether: true });

      /* ---- Investor ---- */
      if (isInvestor) {
        footer(doc, ctx.page.n, reportDate);
        doc.addPage();
        ctx.page.n += 1;
        header(doc, ctx.subtitle);

        startSection(doc, ctx, { eyebrow: 'Investering', icon: 'euro', title: 'Investeringsanalyse', keepWith: 200 });
        bodyText(doc,
          'Gebaseerd op de door jou ingevoerde verkoopwaarde. Potentiële projectwinst is vóór eventuele belasting op gerealiseerde winst/meerwaarde. Geen geautomatiseerde waardering en geen gegarandeerd rendement.',
          ctx, { after: SPACE.S });

        kpiRow(doc, [
          { label: 'Totale investering', value: fmtEUR(finance.totalInvestment), big: true },
          { label: 'Potentiële winst', value: fmtEUR(finance.potentialProfit), big: true },
          { label: 'Project-ROI', value: finance.projectRoiPercent != null ? finance.projectRoiPercent + '%' : '-' }
        ], ctx);
        kpiRow(doc, [
          { label: 'Break-even verkoop', value: fmtEUR(finance.breakEvenResalePrice) },
          { label: 'Max. aankoop (doel-ROI)', value: finance.maxPurchasePrice != null ? fmtEUR(finance.maxPurchasePrice) : 'Niet haalbaar' },
          { label: 'Basisscenario', value: Labels.dealStatusLabel(finance.status) }
        ], ctx);

        startSection(doc, ctx, { eyebrow: 'Geldstroom', icon: 'euro', title: 'Waar gaat het geld naartoe?', keepWith: 7 * SPACE.L + 8 });
        var mm = finance.moneyMap || {};
        [
          ['Aankoop', fmtEUR(mm.aankoop)],
          ['Aankoopkosten', fmtEUR(mm.aankoopkosten)],
          ['Renovatie (excl. btw-componenten)', fmtEUR(mm.renovatieExVatComponents)],
          ['BTW (cash)', fmtEUR(mm.btw)],
          ['Financiering', fmtEUR(mm.financiering)],
          ['Holding', fmtEUR(mm.holding)],
          ['Verkoopkosten (van opbrengst)', fmtEUR(mm.verkoopkosten)]
        ].forEach(function (row) {
          ensureSpace(doc, 20, ctx);
          var y = doc.y;
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft).text(row[0], MARGIN, y, { width: CONTENT_W * 0.62 });
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
            .text(row[1], MARGIN + CONTENT_W * 0.62, y, { width: CONTENT_W * 0.38, align: 'right' });
          doc.y = y + SPACE.L;
        });
        doc.y += SPACE.S;

        startSection(doc, ctx, { eyebrow: 'Scenario’s', icon: 'target', title: 'Nadeel · Basis · Optimistisch', keepWith: 3 * 58 + 28 });
        bodyText(doc, 'Optimistisch combineert gunstige aannames, het is geen waarschijnlijk basisscenario.', ctx, { after: SPACE.S });
        var scOrder = [
          { key: 'conservative', title: 'Nadeel' },
          { key: 'expected', title: 'Basis' },
          { key: 'strong', title: 'Optimistisch' }
        ];
        scOrder.forEach(function (s) {
          var sc = finance.scenarios && finance.scenarios[s.key];
          if (!sc) return;
          keepBlock(doc, 56, ctx);
          var y = doc.y;
          var bg = s.key === 'expected' ? COLOR.mint : COLOR.sand;
          doc.roundedRect(MARGIN, y, CONTENT_W, 48, 8).fill(bg);
          if (s.key === 'expected') {
            doc.roundedRect(MARGIN, y, CONTENT_W, 48, 8).lineWidth(1).strokeColor(COLOR.primarySoft).stroke();
          }
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
            .text(s.title, MARGIN + 14, y + 10);
          doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.primaryDark)
            .text(fmtEUR(sc.potentialProfit) + '   ·   ROI ' +
              (sc.projectRoiPercent != null ? sc.projectRoiPercent + '%' : '-'),
              MARGIN + 14, y + 26);
          doc.y = y + 48 + SPACE.M;
        });

        var sens = finance.sensitivity || [];
        startSection(doc, ctx, {
          eyebrow: 'Gevoeligheid', icon: 'info', title: 'Wat als het tegenzit?',
          keepWith: Math.min(sens.length, 4) * SPACE.L + 8
        });
        sens.forEach(function (s) {
          ensureSpace(doc, 20, ctx);
          var y = doc.y;
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft).text(s.label, MARGIN, y, { width: CONTENT_W * 0.62 });
          doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
            .text((s.profitDelta >= 0 ? '+' : '') + fmtEUR(s.profitDelta), MARGIN + CONTENT_W * 0.62, y, {
              width: CONTENT_W * 0.38, align: 'right'
            });
          doc.y = y + SPACE.L;
        });
        doc.y += SPACE.S;

        var assumeLines = [
          { text: 'Verkoopwaarde = door jou ingevoerde aanname (geen geautomatiseerde waardering).', size: 9 },
          { text: 'Eventuele belasting op meerwaarde/winst is niet automatisch opgenomen.', size: 9, color: COLOR.inkFaint },
          { text: finance.disclaimer || 'Indicatieve scenariomodellering, geen beleggingsadvies.', size: 8.5, color: COLOR.inkFaint }
        ];
        var invNext = Labels.nextStepsInvestor(finance);
        startSection(doc, ctx, {
          eyebrow: 'Aannames', icon: 'shield', title: 'Aannames & uitsluitingen',
          keepWith: estimateSandCardH(doc, assumeLines) + estimateNumberedListH(doc, invNext) + 8
        });
        sandCard(doc, assumeLines, ctx);
        numberedList(doc, invNext, ctx, { keepTogether: true });
      }

      /* ---- Methodology ---- */
      var methodLines = [
        {
          text: 'ELYAN combineert Belgische marktreferenties met jouw projectantwoorden. Resultaten zijn indicatief en geen offerte, beleggings-, fiscaal of juridisch advies.',
          size: 8.5
        },
        {
          text: 'Individuele werkpakketten volgen de bevroren Calculator 1-prijsreferenties. Projectlagen (overlap, reserve, all-in, investering) zijn apart gemodelleerd.',
          size: 8.5,
          color: COLOR.inkFaint
        }
      ];
      startSection(doc, ctx, {
        eyebrow: 'Methode', icon: 'info', title: 'Methodologie & disclaimer',
        keepWith: estimateSandCardH(doc, methodLines) + 8,
        atomic: true
      });
      sandCard(doc, methodLines, ctx);

      footer(doc, ctx.page.n, reportDate);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  buildProjectReportPdf: buildProjectReportPdf,
  fmtEUR: fmtEUR
};
