/* ============================================================
   ELYAN Report Master V4 — final art direction + page balance
   Approved Calc1 premium visual template for all categories via pdf-report.buildReportPdf.
   A4 portrait. Pricing logic frozen. Dynamic category content from engine + insights.
   Brand mark: official site #i-logo geometry (api/_pdf-assets/elyan-mark.svg)
   ============================================================ */

var path = require('path');
var fs = require('fs');
var PDFDocument = require('pdfkit');
var pricing = require('./pricing');
var insightsLib = require('./insights');

var C = {
  /* Deep olive — logo, rules, labels, accents. Solid RGB. */
  olive: '#3F4A36',
  oliveDeep: '#3F4A36',
  /* Soft secondary olive-grey. Solid RGB. */
  oliveSoft: '#7A7F77',
  page: '#FFFFFF',
  /* Architectural white-grey — visibly grey, calm, no blue/warm cast. Solid RGB. */
  cover: '#E6E6E6',
  /* Light neutral panels on white interior pages */
  panel: '#F2F2F2',
  rule: '#D4D4D4',
  ink: '#1A1C1B',
  soft: '#3A3D3A',
  muted: '#5F6563',
  white: '#FFFFFF',
  coverMuted: '#9AA3A8',
  coverMark: '#3F4A36',
  /* Cover motif — grey first, subtle deep army-olive undertone. Solid RGB. */
  coverMotif: '#7A7F77'
};

/* A4 portrait, print-safe margins */
var W = 595.28;
var H = 841.89;
var ML = 48;
var MR = 48;
var MT = 58;
var CW = W - ML - MR;
var COL = CW / 12;
var FOOTER_Y = H - 36;
var BOTTOM = FOOTER_Y - 16;

var FONT_DIR = path.join(__dirname, '..', '_pdf-assets', 'fonts');
var FONTS = {
  display: 'SG',
  displayMed: 'SG-Med',
  displaySemi: 'SG-Semi',
  displayBold: 'SG-Bold',
  body: 'Inter',
  bodyMed: 'Inter-Med',
  bodySemi: 'Inter-Semi'
};

function registerFonts(doc) {
  var map = [
    [FONTS.display, 'SpaceGrotesk-Regular.ttf'],
    [FONTS.displayMed, 'SpaceGrotesk-Medium.ttf'],
    [FONTS.displaySemi, 'SpaceGrotesk-SemiBold.ttf'],
    [FONTS.displayBold, 'SpaceGrotesk-Bold.ttf'],
    [FONTS.body, 'Inter-Regular.ttf'],
    [FONTS.bodyMed, 'Inter-Medium.ttf'],
    [FONTS.bodySemi, 'Inter-SemiBold.ttf']
  ];
  var ok = true;
  map.forEach(function (pair) {
    var fp = path.join(FONT_DIR, pair[1]);
    if (fs.existsSync(fp)) doc.registerFont(pair[0], fp);
    else ok = false;
  });
  if (!ok) {
    FONTS.display = 'Helvetica';
    FONTS.displayMed = 'Helvetica';
    FONTS.displaySemi = 'Helvetica-Bold';
    FONTS.displayBold = 'Helvetica-Bold';
    FONTS.body = 'Helvetica';
    FONTS.bodyMed = 'Helvetica';
    FONTS.bodySemi = 'Helvetica-Bold';
  }
  return ok;
}

function fmtDate(d) {
  var m = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
}

function euro(n) {
  return pricing.fmtEUR(n);
}

function fmtAuditDate(isoOrText) {
  if (!isoOrText) return null;
  var s = String(isoOrText);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return String(parseInt(m[3], 10)) + ' ' + months[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

function packageLabel(it) {
  return (it && it.label) ? String(it.label) : 'Onderdeel';
}

function systemLabelFromAnswers(answers) {
  var pt = answers && answers.projectType;
  if (pt === 'lucht_water') return 'Lucht-water warmtepomp';
  if (pt === 'hybride') return 'Hybride warmtepomp';
  if (pt === 'ketel_vervangen') return 'Ketelvervanging';
  if (pt === 'vloerverwarming') return 'Vloerverwarming';
  if (pt === 'radiatoren') return 'Radiatoren';
  return String(pt || 'Verwarmingssysteem');
}

function housingAgeLabel(v) {
  if (v === 'jong') return 'Jonger dan 10 jaar';
  if (v === 'middel') return '10 tot 25 jaar';
  if (v === 'oud') return 'Ouder dan 25 jaar';
  return v ? String(v) : 'Onbekend';
}

function projectFactExtra(type, answers, pack, cat) {
  if (type === 'verwarming') {
    return { l: 'Systeem', v: systemLabelFromAnswers(answers) };
  }
  if (pack && pack.included && pack.included[0]) {
    return { l: 'Scope', v: pack.included[0] };
  }
  return { l: 'Renovatie', v: (cat && cat.label) || type };
}

function marketPositionSentence(r, cat) {
  var pos = r.marketPosition;
  var noun = (cat && cat.resultNoun) || 'renovatie';
  if (pos === 'lager') {
    return 'De raming ligt onder de gebruikelijke Belgische marktband voor een vergelijkbare ' + noun + '.';
  }
  if (pos === 'hoger') {
    return 'De raming ligt boven de gebruikelijke Belgische marktband voor een vergelijkbare ' + noun + '.';
  }
  if (pos === 'niet-direct-vergelijkbaar') {
    return 'De raming is niet één-op-één te vergelijken met een publicatiemarktband door afwijkende scope.';
  }
  return 'De raming ligt binnen de gebruikelijke Belgische marktband voor een vergelijkbare ' + noun + '.';
}

function vatScenarioLabel(r, pack) {
  if (r && r.vatLabel) return String(r.vatLabel);
  if (pack && pack.btwTip) {
    var tip = String(pack.btwTip);
    if (tip.length > 72) tip = tip.slice(0, 69) + '...';
    return tip;
  }
  return 'Indicatief btw-scenario op basis van jouw projectgegevens';
}

/** Consistent calendar/phase notation — not additive productive labour days. */
function phaseDayLabel(step) {
  if (step.days == null) return '';
  var n = Number(step.days);
  return '±' + n + (n === 1 ? ' kalenderdag' : ' kalenderdagen');
}

/** Customer-facing rewrite of engine driver copy (no internal shorthand). */
function driverReasonCustomer(driver, type) {
  var raw = (driver && driver.reason) || '';
  if (type === 'verwarming' && /WP\b|ketelvervanging/i.test(raw)) {
    return 'Een lucht-waterwarmtepomp vraagt doorgaans een grotere investering dan een ketelvervanging.';
  }
  return raw || 'De belangrijkste kostendrijver bepaalt een groot deel van jouw raming.';
}

/* Official ELYAN mark — exact geometry from site symbol #i-logo / elyan-mark.svg
   viewBox 0 0 32 32:
   bar1: x=4  y=14 w=6 h=14 rx=2
   bar2: x=13 y=8  w=6 h=20 rx=2
   bar3: x=22 y=2  w=6 h=26 rx=2
*/
function drawElyanMark(doc, x, y, size, color) {
  var s = size / 32;
  var r = Math.max(0.6, 2 * s);
  doc.save();
  doc.fillColor(color || C.olive);
  doc.roundedRect(x + 4 * s, y + 14 * s, 6 * s, 14 * s, r).fill();
  doc.roundedRect(x + 13 * s, y + 8 * s, 6 * s, 20 * s, r).fill();
  doc.roundedRect(x + 22 * s, y + 2 * s, 6 * s, 26 * s, r).fill();
  doc.restore();
}

/** Official mark + wordmark lockup (product/site brand). */
function drawElyanLogo(doc, x, y, opts) {
  opts = opts || {};
  var markSize = opts.markSize != null ? opts.markSize : 14;
  var color = opts.color || C.olive;
  var wordSize = opts.wordSize != null ? opts.wordSize : 11;
  var gap = opts.gap != null ? opts.gap : 7;
  var spacing = opts.spacing != null ? opts.spacing : 1.4;
  drawElyanMark(doc, x, y, markSize, color);
  var textY = y + (markSize - wordSize) * 0.42;
  doc.font(FONTS.displayBold).fontSize(wordSize).fillColor(color)
    .text('ELYAN', x + markSize + gap, textY, {
      characterSpacing: spacing,
      lineBreak: false
    });
  return markSize;
}

function footer(doc, n, date) {
  var old = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.moveTo(ML, FOOTER_Y).lineTo(W - MR, FOOTER_Y)
    .lineWidth(0.5).strokeColor(C.rule).stroke();
  doc.rect(ML, FOOTER_Y, 22, 1.35).fill(C.olive);
  doc.font(FONTS.body).fontSize(7.6).fillColor(C.soft)
    .text('ELYAN  ·  Renovatieanalyse  ·  ' + date, ML + 28, FOOTER_Y + 9, {
      width: CW - 92, lineBreak: false
    });
  doc.font(FONTS.displayMed).fontSize(8.2).fillColor(C.olive)
    .text(String(n).padStart(2, '0'), ML, FOOTER_Y + 8, {
      width: CW, align: 'right', lineBreak: false
    });
  doc.page.margins.bottom = old;
}

function pageHeader(doc) {
  withOpenMargins(doc, function () {
    drawElyanLogo(doc, ML, 26, {
      markSize: 12,
      wordSize: 9.2,
      gap: 6,
      spacing: 1.5,
      color: C.olive
    });
    doc.moveTo(ML, 46).lineTo(W - MR, 46)
      .lineWidth(0.5).strokeColor(C.rule).stroke();
    doc.rect(ML, 46, 18, 1.1).fill(C.olive);
  });
}

function newPage(doc, ctx) {
  if (ctx.isCover) {
    ctx.isCover = false;
  } else {
    footer(doc, ctx.n, ctx.date);
  }
  doc.addPage();
  ctx.n++;
  pageHeader(doc);
  doc.y = MT;
}

function oliveRule(doc, x, y, w) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(1.15).strokeColor(C.olive).stroke();
}

function greyRule(doc, x, y, w) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.5).strokeColor(C.rule).stroke();
}

function sectionLabel(doc, text, x, y) {
  doc.font(FONTS.displayMed).fontSize(7.6).fillColor(C.olive)
    .text(String(text).toUpperCase(), x, y, { characterSpacing: 1.25 });
  return y + 12;
}

function pageTitle(doc, text, x, y) {
  doc.font(FONTS.displayMed).fontSize(19).fillColor(C.ink)
    .text(text, x, y, {
      width: CW,
      lineGap: 1,
      height: Math.max(12, BOTTOM - y),
      ellipsis: true
    });
  return Math.min(doc.y + 6, BOTTOM);
}

function sectionTitle(doc, text, x, y, w) {
  doc.font(FONTS.displayMed).fontSize(12.5).fillColor(C.ink)
    .text(text, x, y, {
      width: w || CW,
      height: Math.max(12, BOTTOM - y),
      ellipsis: true
    });
  return Math.min(doc.y + 4, BOTTOM);
}

/** Text that never auto-paginates: height-clamped to page content bottom. */
function body(doc, text, x, y, opts) {
  opts = opts || {};
  var maxH = Math.max(0, BOTTOM - y);
  if (maxH < 8) return y;
  doc.font(opts.font || FONTS.body).fontSize(opts.size || 9.6).fillColor(opts.color || C.soft)
    .text(String(text || ''), x, y, {
      width: opts.w || CW,
      lineGap: opts.gap != null ? opts.gap : 2.6,
      align: opts.align || 'left',
      height: maxH,
      ellipsis: true
    });
  return Math.min(doc.y, BOTTOM);
}

function meta(doc, text, x, y, w) {
  var maxH = Math.max(0, BOTTOM - y);
  if (maxH < 8) return y;
  doc.font(FONTS.body).fontSize(8).fillColor(C.muted)
    .text(String(text || ''), x, y, {
      width: w || CW,
      lineGap: 2,
      height: maxH,
      ellipsis: true
    });
  return Math.min(doc.y, BOTTOM);
}

/** Keep a block together: if it does not fit, start an intentional continuation page. */
function ensureBlock(doc, ctx, y, needed) {
  if (y + needed <= BOTTOM) return y;
  newPage(doc, ctx);
  return MT;
}

function withOpenMargins(doc, fn) {
  var oldT = doc.page.margins.top;
  var oldB = doc.page.margins.bottom;
  var oldL = doc.page.margins.left;
  var oldR = doc.page.margins.right;
  doc.page.margins.top = 0;
  doc.page.margins.bottom = 0;
  doc.page.margins.left = 0;
  doc.page.margins.right = 0;
  fn();
  doc.page.margins.top = oldT;
  doc.page.margins.bottom = oldB;
  doc.page.margins.left = oldL;
  doc.page.margins.right = oldR;
}

/* ---------------- COVER — light mineral dossier ---------------- */

function drawCover(doc, cat, prov, id, date) {
  withOpenMargins(doc, function () {
    /* Cool mineral grey cover — distinct from white inside pages */
    doc.rect(0, 0, W, H).fill(C.cover);
    doc.rect(0, 0, 5, H).fill(C.olive);
    /* Large cropped official mark — solid soft olive (no opacity) */
    doc.fillColor(C.coverMotif);
    (function () {
      var mx = W - 268;
      var my = H - 390;
      var size = 340;
      var s = size / 32;
      var rr = Math.max(0.6, 2 * s);
      doc.roundedRect(mx + 4 * s, my + 14 * s, 6 * s, 14 * s, rr).fill();
      doc.roundedRect(mx + 13 * s, my + 8 * s, 6 * s, 20 * s, rr).fill();
      doc.roundedRect(mx + 22 * s, my + 2 * s, 6 * s, 26 * s, rr).fill();
    })();
  });

  var x = ML + 22;

  drawElyanLogo(doc, x, 68, {
    markSize: 23,
    wordSize: 16,
    gap: 10,
    spacing: 2.4,
    color: C.olive
  });

  /* Title block — BOTH lines: Inter (bodyMed / bodySemi). Title uppercase; tighter stack. */
  doc.font(FONTS.bodyMed).fontSize(11).fillColor(C.muted)
    .text('Persoonlijke renovatieanalyse', x, 172, {
      characterSpacing: 1.15,
      lineBreak: false
    });
  doc.font(FONTS.bodySemi).fontSize(23).fillColor(C.ink)
    .text(String(cat.label).toUpperCase(), x, 190, {
      width: CW - 80,
      lineGap: 4,
      characterSpacing: 0.35
    });

  /* Document identity strip — REGIO | DATUM | REFERENTIE (raised for balance) */
  var stripY = 318;
  var stripW = CW - 40;
  var colW = stripW / 3;
  doc.moveTo(x, stripY).lineTo(x + stripW, stripY)
    .lineWidth(0.55).strokeColor(C.rule).stroke();
  stripY += 16;

  [
    { l: 'Regio', v: prov.label },
    { l: 'Datum', v: date },
    { l: 'Referentie', v: id }
  ].forEach(function (row, i) {
    var cx = x + i * colW;
    if (i > 0) {
      doc.moveTo(cx - 12, stripY).lineTo(cx - 12, stripY + 40)
        .lineWidth(0.45).strokeColor(C.rule).stroke();
    }
    doc.font(FONTS.bodyMed).fontSize(8).fillColor(C.muted)
      .text(row.l.toUpperCase(), cx, stripY, { characterSpacing: 1.15 });
    doc.font(FONTS.bodyMed).fontSize(12).fillColor(C.ink)
      .text(row.v, cx, stripY + 18, { width: colW - 20 });
  });

  /* Compact disclaimer — tight to text so brand motif stays visible */
  var noteText = 'Indicatieve renovatieanalyse · geen bindende offerte.';
  var notePadX = 11;
  var notePadY = 8;
  doc.font(FONTS.body).fontSize(8.6);
  var noteTw = Math.min(doc.widthOfString(noteText) + notePadX * 2 + 8, COL * 6.8);
  var noteH = 30;
  var noteY = H - 94;
  withOpenMargins(doc, function () {
    /* Disclaimer left edge = footer line start (ML) */
    var noteX = ML;
    doc.rect(noteX, noteY, noteTw, noteH).fill(C.olive);
    doc.rect(noteX, noteY, 2.2, noteH).fill(C.oliveDeep);
    doc.font(FONTS.body).fontSize(8.6).fillColor(C.white)
      .text(noteText, noteX + notePadX + 2, noteY + notePadY, {
        width: noteTw - notePadX * 2 - 4,
        lineBreak: false
      });
    doc.moveTo(ML, FOOTER_Y).lineTo(W - MR, FOOTER_Y)
      .lineWidth(0.45).strokeColor(C.rule).stroke();
    doc.font(FONTS.body).fontSize(8).fillColor(C.muted)
      .text('ELYAN  ·  Renovatieanalyse  ·  ' + date, ML, FOOTER_Y + 9, {
        width: CW - 60, lineBreak: false
      });
    doc.font(FONTS.displayMed).fontSize(8.5).fillColor(C.olive)
      .text('01', ML, FOOTER_Y + 8, { width: CW, align: 'right', lineBreak: false });
  });
}

/* ---------------- PAGE 2 — wow / investment ---------------- */

function pageInvestment(doc, ctx, cat, prov, answers, r, sizeMeta, pack, type) {
  newPage(doc, ctx);
  var y = MT;

  y = sectionLabel(doc, 'Project', ML, y);
  y = pageTitle(doc, 'Projectoverzicht', ML, y);
  y += 10;

  var facts = [
    { l: 'Renovatie', v: cat.label },
    { l: 'Locatie', v: prov.label },
    { l: sizeMeta.fieldLabel || 'Oppervlakte', v: sizeMeta.text },
    { l: 'Afwerking', v: (pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level },
    { l: 'Woning', v: housingAgeLabel(answers.housingAge) },
    projectFactExtra(type, answers, pack, cat)
  ];

  var zoneH = 108;
  doc.rect(ML, y, CW, zoneH).fill(C.panel);
  doc.rect(ML, y, 3, zoneH).fill(C.olive);

  var padX = 16;
  var padY = 14;
  var colW = (CW - padX * 2 - 20) / 3;
  var gapX = 10;
  facts.forEach(function (f, i) {
    var col = i % 3;
    var row = Math.floor(i / 3);
    var fx = ML + padX + col * (colW + gapX);
    var fy = y + padY + row * 44;
    if (col > 0) {
      doc.moveTo(fx - gapX / 2, fy).lineTo(fx - gapX / 2, fy + 32)
        .lineWidth(0.4).strokeColor(C.rule).stroke();
    }
    if (row === 1 && col === 0) {
      greyRule(doc, ML + padX, fy - 8, CW - padX * 2);
    }
    doc.font(FONTS.body).fontSize(7.5).fillColor(C.muted).text(f.l, fx, fy);
    doc.font(FONTS.bodySemi).fontSize(10.4).fillColor(C.ink)
      .text(String(f.v), fx, fy + 14, { width: colW - 4 });
  });
  y += zoneH + 20;

  y = sectionLabel(doc, 'Investering', ML, y);
  y = pageTitle(doc, 'Indicatieve investering', ML, y);
  y += 14;

  var leftW = COL * 6.2;
  var rightX = ML + COL * 7;
  var rightW = COL * 5;

  /* Primary figure — olive vertical accent only */
  doc.rect(ML, y, 3, 86).fill(C.olive);
  doc.font(FONTS.body).fontSize(8).fillColor(C.muted)
    .text('Indicatieve richtprijs', ML + 16, y + 6);
  doc.font(FONTS.displayMed).fontSize(24).fillColor(C.olive)
    .text(euro(r.price), ML + 16, y + 24, { width: leftW - 24 });
  doc.font(FONTS.body).fontSize(9.5).fillColor(C.soft).text('excl. btw', ML + 16, y + 58);

  /* Support column — typography + spacing only, no decorative mini-rules */
  var support = [
    { l: 'Waarschijnlijke bandbreedte', v: euro(r.low) + ' tot ' + euro(r.high) },
    { l: 'Indicatief incl. btw', v: euro(r.totalInclVat) },
    { l: 'Indicatieve uitvoeringsduur', v: r.weeksLow + ' tot ' + r.weeksHigh + ' weken' }
  ];
  var ry = y + 4;
  support.forEach(function (s) {
    doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted).text(s.l, rightX, ry, { width: rightW });
    doc.font(FONTS.displayMed).fontSize(12.5).fillColor(C.ink)
      .text(s.v, rightX, ry + 14, { width: rightW });
    ry += 32;
  });

  y = Math.max(y + 96, ry) + 10;
  y = meta(doc,
    'Alle bedragen in dit rapport zijn indicatieve ramingen en geen bindende offerte.',
    ML, y);
  y += 22;

  var leftBlockW = COL * 5.8;
  var rightBlockX = ML + COL * 6.5;
  var rightBlockW = COL * 5.5;

  var yL = sectionLabel(doc, 'Invloed', ML, y);
  yL = sectionTitle(doc, 'Wat bepaalt jouw prijs?', ML, yL, leftBlockW);
  yL += 12;
  var driver = (r.drivers && r.drivers[0]) || {
    text: (cat && cat.label) || 'Belangrijkste kostendrijver',
    reason: 'De belangrijkste kostendrijver bepaalt een groot deel van jouw raming.'
  };
  doc.font(FONTS.bodySemi).fontSize(11.2).fillColor(C.ink)
    .text(driver.text, ML, yL, { width: leftBlockW, height: 28, ellipsis: true });
  yL = body(doc, driverReasonCustomer(driver, type), ML, yL + 18, {
    size: 9.4, w: leftBlockW, color: C.soft, gap: 2.6
  });
  yL += 12;
  yL = body(doc,
    'Toets offertes eerst op scope, materialen en uitvoeringsvoorwaarden.',
    ML, yL, { size: 9, w: leftBlockW, color: C.muted });

  var yR = sectionLabel(doc, 'Scope', rightBlockX, y);
  yR = sectionTitle(doc, 'Wat zit in deze raming?', rightBlockX, yR, rightBlockW);
  yR += 12;
  var scopeItems = (pack && pack.included && pack.included.length)
    ? pack.included.slice(0, 4)
    : (r.costBreakdown || []).filter(function (it) { return it.amount > 0; }).slice(0, 4)
      .map(function (it) { return packageLabel(it); });
  scopeItems.forEach(function (text, idx) {
    if (yR + 22 > BOTTOM) return;
    if (idx > 0) {
      greyRule(doc, rightBlockX, yR, rightBlockW);
      yR += 10;
    }
    doc.font(FONTS.bodySemi).fontSize(9.6).fillColor(C.ink)
      .text(String(text), rightBlockX, yR, {
        width: rightBlockW, height: 18, ellipsis: true
      });
    yR += 20;
  });

  doc.y = Math.min(Math.max(yL, yR) + 6, BOTTOM);
}

/* ---------------- PAGE 3 — budget + buffer ---------------- */

function pageBudget(doc, ctx, r, cat) {
  newPage(doc, ctx);
  var y = MT;
  var safe = (r.price || 0) + (r.contingency || 0);

  y = sectionLabel(doc, 'Budget', ML, y);
  y = pageTitle(doc, 'Waar gaat je budget naartoe?', ML, y);
  y += 4;
  y = meta(doc, 'Bedragen excl. btw, opgebouwd uit werkpakketten.', ML, y);
  y += 10;

  doc.rect(ML, y, CW, 24).fill(C.oliveDeep);
  doc.font(FONTS.displayMed).fontSize(8).fillColor(C.white)
    .text('Onderdeel', ML + 12, y + 7)
    .text('Raming', ML, y + 7, { width: CW - 12, align: 'right' });
  y += 24;

  /* Reserve space so market + tip + buffer stay together on this page */
  var reservedTail = 248;
  var rowH = 28;
  var roomForRows = Math.max(rowH * 2, BOTTOM - y - reservedTail);
  var maxRows = Math.max(2, Math.min(6, Math.floor(roomForRows / rowH)));
  var rows = (r.costBreakdown || []).filter(function (it) { return it.amount > 0; }).slice(0, maxRows);
  rows.forEach(function (it, idx) {
    var rh = rowH;
    if (idx % 2 === 0) doc.rect(ML, y, CW, rh).fill(C.panel);
    doc.font(FONTS.body).fontSize(9.2).fillColor(C.ink)
      .text(packageLabel(it), ML + 12, y + 8, {
        width: CW - 130, height: rh - 10, ellipsis: true, lineBreak: false
      });
    doc.font(FONTS.bodyMed).fontSize(9.2).fillColor(C.ink)
      .text(euro(it.amount), ML, y + 8, { width: CW - 12, align: 'right', lineBreak: false });
    y += rh;
  });

  doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(1.1).strokeColor(C.olive).stroke();
  y += 8;
  doc.font(FONTS.bodySemi).fontSize(10).fillColor(C.ink)
    .text('Totaal excl. btw', ML + 12, y);
  doc.font(FONTS.displayMed).fontSize(11.5).fillColor(C.olive)
    .text(euro(r.subtotalExVat || r.price), ML, y, { width: CW - 12, align: 'right' });
  y += 22;

  y = sectionLabel(doc, 'Samenstelling', ML, y);
  y += 8;
  var parts = [
    { l: 'Materialen', a: r.amounts.materiaal, p: Math.round(r.split.materiaal * 100) },
    { l: 'Arbeid', a: r.amounts.arbeid, p: Math.round(r.split.arbeid * 100) },
    { l: 'Overige', a: r.amounts.overige, p: Math.round(r.split.overige * 100) }
  ];
  var pw = (CW - 24) / 3;
  parts.forEach(function (p, i) {
    var x = ML + i * (pw + 12);
    doc.font(FONTS.body).fontSize(7.8).fillColor(C.muted).text(p.l, x, y);
    doc.font(FONTS.displayMed).fontSize(14).fillColor(C.ink).text(euro(p.a), x, y + 14);
    doc.font(FONTS.bodyMed).fontSize(9.2).fillColor(C.olive).text(p.p + '%', x, y + 34);
  });
  y += 54;
  greyRule(doc, ML, y, CW);
  y += 12;

  y = sectionLabel(doc, 'Markt', ML, y);
  y = sectionTitle(doc, 'Vergelijking met de markt', ML, y);
  y += 10;

  doc.font(FONTS.body).fontSize(7.8).fillColor(C.muted).text('ELYAN-raming', ML, y);
  doc.font(FONTS.displayMed).fontSize(15).fillColor(C.olive).text(euro(r.price), ML, y + 13);
  doc.font(FONTS.body).fontSize(8).fillColor(C.muted).text('excl. btw', ML, y + 34);

  var bm = r.marketBenchmark || {};
  var mx = ML + COL * 6.2;
  doc.font(FONTS.body).fontSize(7.8).fillColor(C.muted).text('Gebruikelijke marktband', mx, y);
  doc.font(FONTS.displayMed).fontSize(14).fillColor(C.ink)
    .text(euro(bm.low) + ' tot ' + euro(bm.high), mx, y + 13, { width: COL * 5.8 });
  doc.font(FONTS.body).fontSize(8).fillColor(C.muted).text('excl. btw', mx, y + 34);
  y += 48;

  y = body(doc, marketPositionSentence(r, cat), ML, y, { size: 9.4, w: CW * 0.94 });
  y += 8;
  var bmScope = (r.marketBenchmark && r.marketBenchmark.scope)
    ? String(r.marketBenchmark.scope)
    : 'vergelijkbare renovatie, excl. btw';
  y = meta(doc, 'Marktdata gecontroleerd op ' + (fmtAuditDate(r.asOf) || '2026') +
    ' · Scope: ' + bmScope + '.', ML, y);

  y += 10;
  /* Tip + Buffer are atomic on this page — never page-break mid-panel */
  var tipH = 52;
  var ph = 62;
  var needTail = tipH + 10 + 12 + ph;
  if (y + needTail > BOTTOM) {
    /* Compact previous content already reserved; clamp rather than spawn blank pages */
    y = Math.min(y, BOTTOM - needTail);
  }
  doc.rect(ML, y, CW, tipH).fill(C.panel);
  doc.rect(ML, y, 3, tipH).fill(C.olive);
  doc.font(FONTS.displayMed).fontSize(7.4).fillColor(C.olive)
    .text('HOE DEZE TABEL TE GEBRUIKEN', ML + 14, y + 10, {
      characterSpacing: 0.7, lineBreak: false
    });
  doc.font(FONTS.body).fontSize(9).fillColor(C.soft)
    .text('Vraag aannemers dezelfde werkpakketten te specificeren. Zo vergelijk je scope, materialen en oplevering, niet alleen een totaalbedrag.',
      ML + 14, y + 24, { width: CW - 28, lineGap: 2, height: 24, ellipsis: true });
  y += tipH + 10;

  /* Buffer — keep label + panel as one unit */
  y = sectionLabel(doc, 'Buffer', ML, y);
  doc.rect(ML, y, CW, ph).fill(C.panel);
  doc.rect(ML, y, 3.2, ph).fill(C.olive);
  doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted)
    .text('Aanbevolen budgetbuffer', ML + 14, y + 12, { lineBreak: false });
  doc.font(FONTS.displayMed).fontSize(18).fillColor(C.olive)
    .text(euro(r.contingency), ML + 14, y + 28, { lineBreak: false });
  doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted)
    .text('Veilig werkbudget', ML + COL * 6.5, y + 12, { lineBreak: false });
  doc.font(FONTS.displayMed).fontSize(13).fillColor(C.ink)
    .text(euro(safe) + ' excl. btw', ML + COL * 6.5, y + 30, {
      width: COL * 5.2, lineBreak: false
    });
  doc.font(FONTS.body).fontSize(8.2).fillColor(C.soft)
    .text('Voor kleine afwijkingen in uitvoering of materiaalkeuze.', ML + 14, y + 46, {
      width: COL * 10, lineBreak: false
    });

  doc.y = Math.min(y + ph + 4, BOTTOM);
}

/* ---------------- PAGE 4 — execution / planning ---------------- */

function pageExecution(doc, ctx, r, pack) {
  newPage(doc, ctx);
  var y = MT;
  var lp = r.labourPlan || {};

  y = sectionLabel(doc, 'Uitvoering', ML, y);
  y = pageTitle(doc, 'Uitvoering en planning', ML, y);
  y += 10;

  var cells = [
    { l: 'Arbeidsinspanning', v: String(lp.labourHours || r.labourHours) + ' manuren' },
    { l: 'Typische ploeg', v: String(lp.crewSize || r.crewSize) + ' vakmensen' },
    { l: 'Productieve werkdagen', v: '±' + String(lp.workDays || r.workDays) + ' dagen' },
    { l: 'Indicatieve uitvoeringsduur', v: r.weeksLow + ' tot ' + r.weeksHigh + ' weken' }
  ];
  var cellW = (CW - 18) / 4;
  cells.forEach(function (c, i) {
    var x = ML + i * (cellW + 6);
    doc.font(FONTS.body).fontSize(7.5).fillColor(C.muted)
      .text(c.l, x, y, { width: cellW - 4 });
    doc.font(FONTS.displayMed).fontSize(12).fillColor(C.ink)
      .text(c.v, x, y + 16, { width: cellW - 4 });
  });
  y += 44;
  greyRule(doc, ML, y, CW);
  y += 8;
  y = meta(doc,
    'Productieve werkdagen zijn effectieve werfdagen. De uitvoeringsduur is kalenderduur (levering, afstemming).',
    ML, y);
  y += 16;

  y = sectionLabel(doc, 'Fasering', ML, y);
  y = sectionTitle(doc, 'Indicatieve fasering', ML, y);
  y += 4;
  y = meta(doc,
    'Fasewaarden zijn kalenderinschattingen per fase en geen optelsom van productieve werkdagen.',
    ML, y);
  y += 10;

  /* Professional project phasing schedule — no decorative numbering / spine */
  var phases = (pack.timeline || []).slice(0, 3);
  var cFase = COL * 4.2;
  var cWerk = COL * 4.6;
  var cDuur = COL * 3.2;
  var headerH = 24;
  doc.rect(ML, y, CW, headerH).fill(C.oliveDeep);
  doc.font(FONTS.displayMed).fontSize(7.3).fillColor(C.white)
    .text('Fase', ML + 12, y + 8)
    .text('Werkzaamheden', ML + cFase + 12, y + 8)
    .text('Indicatieve duur', ML + cFase + cWerk + 8, y + 8);
  y += headerH;

  phases.forEach(function (step, i) {
    var rh = 32;
    if (i % 2 === 0) doc.rect(ML, y, CW, rh).fill(C.panel);
    doc.font(FONTS.bodySemi).fontSize(9.6).fillColor(C.ink)
      .text(step.phase, ML + 12, y + 9, {
        width: cFase - 16, height: rh - 12, ellipsis: true
      });
    doc.font(FONTS.body).fontSize(9.2).fillColor(C.soft)
      .text(step.note || '', ML + cFase + 12, y + 9, {
        width: cWerk - 16, height: rh - 12, ellipsis: true
      });
    doc.font(FONTS.bodyMed).fontSize(9.2).fillColor(C.ink)
      .text(phaseDayLabel(step), ML + cFase + cWerk + 8, y + 9, {
        width: cDuur - 16, height: rh - 12, ellipsis: true, lineBreak: false
      });
    y += rh;
  });
  y += 16;

  /* Lower page — two distinct editorial zones using remaining height */
  var leftW = COL * 5.8;
  var rightX = ML + COL * 6.4;
  var rightW = COL * 5.6;
  var colTop = y;
  var colBottom = BOTTOM - 4;

  var yL = sectionLabel(doc, 'Aannames', ML, colTop);
  yL = sectionTitle(doc, 'Aannames in deze raming', ML, yL, leftW);
  yL += 10;
  var assumptionItems = (pack.assumptions && pack.assumptions.length)
    ? pack.assumptions.slice(0, 3)
    : [
      'Normale leveromstandigheden; geen uitzonderlijke prijsstijgingen tijdens de werf.',
      'Geen structurele verborgen schade buiten wat is aangegeven.'
    ];
  assumptionItems.forEach(function (a, i) {
    if (yL + 28 > colBottom) return;
    if (i > 0) {
      greyRule(doc, ML, yL, leftW);
      yL += 8;
    }
    var aH = Math.min(42, colBottom - yL);
    doc.font(FONTS.body).fontSize(8.9).fillColor(C.soft)
      .text(a, ML, yL, { width: leftW, lineGap: 2, height: aH, ellipsis: true });
    yL = Math.min(doc.y + 10, colBottom);
  });

  var yR = sectionLabel(doc, 'Onzekerheden', rightX, colTop);
  yR = sectionTitle(doc, 'Uitvoeringsonzekerheden', rightX, yR, rightW);
  yR += 10;
  var uncertaintyItems = (pack.riskRows && pack.riskRows.length)
    ? pack.riskRows.slice(0, 2).map(function (row) {
      return { t: row.risk, d: row.check || row.impact || '' };
    })
    : (pack.risks || []).slice(0, 2).map(function (t) {
      return { t: 'Aandachtspunt', d: String(t) };
    });
  if (!uncertaintyItems.length) {
    uncertaintyItems = [{ t: 'Scopebevestiging', d: 'Laat open punten schriftelijk vastleggen vóór start.' }];
  }
  uncertaintyItems.forEach(function (u, i) {
    if (yR + 36 > colBottom) return;
    if (i > 0) {
      greyRule(doc, rightX, yR, rightW);
      yR += 10;
    }
    doc.font(FONTS.bodySemi).fontSize(9.6).fillColor(C.ink)
      .text(u.t, rightX, yR, { width: rightW, height: 16, ellipsis: true });
    yR += 14;
    var uH = Math.min(48, colBottom - yR);
    doc.font(FONTS.body).fontSize(8.8).fillColor(C.soft).text(u.d, rightX, yR, {
      width: rightW, lineGap: 2, height: uH, ellipsis: true
    });
    yR = Math.min(doc.y + 12, colBottom);
  });

  doc.y = Math.min(Math.max(yL, yR), BOTTOM);
}

/* ---------------- PAGE 5 — offers + next steps ---------------- */

function pageOfferReview(doc, ctx, nextSteps, pack) {
  newPage(doc, ctx);
  var y = MT;

  y = sectionLabel(doc, 'Offertes', ML, y);
  y = pageTitle(doc, 'Offertes beoordelen', ML, y);
  y += 5;
  y = meta(doc, 'Controlelijst om offertes naast elkaar te leggen.', ML, y);
  y += 12;

  var col1 = COL * 3.1;
  var col2 = COL * 4.1;
  var col3 = COL * 4.8;
  var headerH = 26;

  doc.rect(ML, y, CW, headerH).fill(C.oliveDeep);
  doc.font(FONTS.displayMed).fontSize(7.3).fillColor(C.white)
    .text('Controlepunt', ML + 10, y + 9)
    .text('Waarom belangrijk', ML + col1 + 10, y + 9)
    .text('Wat moet je controleren?', ML + col1 + col2 + 10, y + 9);
  y += headerH;

  var checkRows = (pack.quoteChecks || []).slice(0, 5).map(function (c) {
    return {
      point: String(c),
      why: 'Nodig om offertes eerlijk te vergelijken.',
      check: 'Vraag schriftelijke bevestiging in elke offerte.'
    };
  });
  if (!checkRows.length) {
    checkRows = [
      {
        point: 'Scope en hoeveelheden',
        why: 'Zonder scope zijn totalen niet vergelijkbaar.',
        check: 'Laat alle werkposten expliciet opsommen.'
      },
      {
        point: 'Materialen en merken',
        why: 'Materiaalkeuze bepaalt prijs en kwaliteit.',
        check: 'Controleer specificaties en alternatieven.'
      },
      {
        point: 'Btw / garantie',
        why: 'Offertes moeten onderling vergelijkbaar zijn.',
        check: 'Controleer btw-behandeling, garanties en uitsluitingen.'
      }
    ];
  }
  /* Cap rows so signals + next steps remain on this page */
  var maxChecks = Math.max(3, Math.min(checkRows.length, Math.floor((BOTTOM - y - 220) / 40)));
  checkRows.slice(0, maxChecks).forEach(function (row, idx) {
    var textH = 40;
    if (idx % 2 === 0) doc.rect(ML, y, CW, textH).fill(C.panel);
    doc.moveTo(ML, y + textH).lineTo(W - MR, y + textH)
      .lineWidth(0.35).strokeColor(C.rule).stroke();
    doc.font(FONTS.bodySemi).fontSize(8.4).fillColor(C.ink)
      .text(row.point, ML + 10, y + 7, {
        width: col1 - 14, height: textH - 12, ellipsis: true
      });
    doc.font(FONTS.body).fontSize(8).fillColor(C.soft)
      .text(row.why, ML + col1 + 10, y + 7, {
        width: col2 - 14, height: textH - 12, ellipsis: true
      });
    doc.font(FONTS.body).fontSize(8).fillColor(C.soft)
      .text(row.check, ML + col1 + col2 + 10, y + 7, {
        width: col3 - 18, height: textH - 12, ellipsis: true
      });
    y += textH;
  });

  y += 14;
  greyRule(doc, ML, y, CW);
  y += 14;

  var leftW = COL * 5.8;
  var rightX = ML + COL * 6.4;
  var rightW = COL * 5.6;

  var yL = sectionLabel(doc, 'Signalen', ML, y);
  yL = sectionTitle(doc, 'Waarschuwingssignalen', ML, yL, leftW);
  yL += 10;
  (pack.redFlags || []).slice(0, 3).forEach(function (f) {
    doc.font(FONTS.body).fontSize(8.8).fillColor(C.soft)
      .text('·  ' + f, ML, yL, {
        width: leftW, lineGap: 1.4, height: 36, ellipsis: true
      });
    yL = Math.min(doc.y + 6, BOTTOM);
  });

  var yR = sectionLabel(doc, 'Optimalisatie', rightX, y);
  yR = sectionTitle(doc, 'Mogelijke optimalisaties', rightX, yR, rightW);
  yR += 10;
  var optItems = (pack.recommendations || []).slice(0, 2).map(function (rec) {
    return { t: 'Advies', d: String(rec) };
  });
  if (!optItems.length) {
    optItems = [{
      t: 'Vergelijk op scope',
      d: 'Vergelijk offertes niet alleen op totaalprijs, maar op dezelfde werkpakketten.'
    }];
  }
  optItems.forEach(function (o) {
    doc.font(FONTS.bodySemi).fontSize(9.4).fillColor(C.ink)
      .text(o.t, rightX, yR, { width: rightW, lineBreak: false });
    yR += 12;
    doc.font(FONTS.body).fontSize(8.5).fillColor(C.soft)
      .text(o.d, rightX, yR, {
        width: rightW, lineGap: 1.8, height: 48, ellipsis: true
      });
    yR = Math.min(doc.y + 10, BOTTOM);
  });

  y = Math.max(yL, yR) + 12;
  if (y + 80 > BOTTOM) y = Math.max(MT, BOTTOM - 80);
  greyRule(doc, ML, y, CW);
  y += 12;

  /* Next steps */
  y = sectionLabel(doc, 'Actie', ML, y);
  y = sectionTitle(doc, 'Jouw volgende stappen', ML, y);
  y += 8;
  nextSteps.slice(0, 3).forEach(function (step, i) {
    if (y + 28 > BOTTOM) return;
    doc.font(FONTS.displayMed).fontSize(8.4).fillColor(C.olive)
      .text(String(i + 1).padStart(2, '0'), ML, y + 1, { lineBreak: false });
    doc.font(FONTS.body).fontSize(9).fillColor(C.soft)
      .text(step, ML + 26, y, {
        width: CW - 26, lineGap: 1.5, height: 28, ellipsis: true
      });
    y = Math.min(doc.y + 8, BOTTOM);
  });

  doc.y = y;
}

/* ---------------- PAGE 6 — financial + calm close ---------------- */

function pageFinanceAndClose(doc, ctx, r, pack) {
  newPage(doc, ctx);
  var y = MT;
  var safe = (r.price || 0) + (r.contingency || 0);
  var pr = (r.premies || [])[0];

  y = sectionLabel(doc, 'Financieel', ML, y);
  y = pageTitle(doc, 'Financieel kader', ML, y);
  y += 14;

  var leftW = COL * 5.6;
  var rightX = ML + COL * 6.4;
  var rightW = COL * 5.6;

  var yL = sectionLabel(doc, 'Btw', ML, y);
  yL = sectionTitle(doc, 'Indicatief btw-scenario', ML, yL, leftW);
  yL += 12;
  doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted)
    .text('Scenario', ML, yL, { lineBreak: false });
  doc.font(FONTS.bodySemi).fontSize(9.6).fillColor(C.ink)
    .text(vatScenarioLabel(r, pack), ML, yL + 12, {
      width: leftW, height: 28, ellipsis: true
    });
  yL += 36;
  doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted)
    .text('Indicatieve btw', ML, yL, { lineBreak: false });
  doc.font(FONTS.displayMed).fontSize(16).fillColor(C.olive)
    .text(euro(r.vatAmount), ML, yL + 14, { lineBreak: false });
  yL += 40;
  doc.font(FONTS.body).fontSize(7.7).fillColor(C.muted)
    .text('Indicatief totaal incl. btw', ML, yL, { lineBreak: false });
  doc.font(FONTS.displayMed).fontSize(13).fillColor(C.ink)
    .text(euro(r.totalInclVat), ML, yL + 14, { lineBreak: false });
  yL += 38;
  yL = meta(doc, 'Het definitieve tarief staat op de factuur van de aannemer.', ML, yL, leftW);

  var yR = sectionLabel(doc, 'Premies', rightX, y);
  yR = sectionTitle(doc, 'Premies en steun', rightX, yR, rightW);
  yR += 12;
  if (pr) {
    doc.font(FONTS.bodySemi).fontSize(10.2).fillColor(C.ink)
      .text(pr.scheme === 'Warmtepomppremie (Vlaanderen)'
        ? 'Warmtepomppremie Vlaanderen'
        : pr.scheme, rightX, yR, { width: rightW, height: 28, ellipsis: true });
    yR += 16;
    doc.font(FONTS.body).fontSize(8.8).fillColor(C.soft)
      .text('Mogelijk relevant op basis van de bekende projectgegevens.', rightX, yR, {
        width: rightW, lineGap: 2, height: 28, ellipsis: true
      });
    yR = Math.min(doc.y + 12, BOTTOM);

    doc.font(FONTS.bodyMed).fontSize(8).fillColor(C.olive)
      .text('Nog te bevestigen', rightX, yR, { lineBreak: false });
    yR += 13;
    ['Inkomenscategorie', 'Eigendomssituatie', 'Technische voorwaarden'].forEach(function (m) {
      doc.font(FONTS.body).fontSize(8.8).fillColor(C.soft)
        .text('·  ' + m, rightX, yR, { width: rightW, lineBreak: false });
      yR += 14;
    });

    yR += 8;
    greyRule(doc, rightX, yR, rightW);
    yR += 12;
    doc.font(FONTS.displayMed).fontSize(7.4).fillColor(C.olive)
      .text('OVER DEZE INSCHATTING', rightX, yR, {
        characterSpacing: 0.7, lineBreak: false
      });
    yR += 12;
    doc.font(FONTS.body).fontSize(8.4).fillColor(C.muted)
      .text('ELYAN berekent geen premiebedrag zonder de gegevens die nodig zijn om recht en bedrag correct te bepalen.',
        rightX, yR, { width: rightW, lineGap: 2, height: 36, ellipsis: true });
    yR = Math.min(doc.y + 8, BOTTOM);
    yR = meta(doc,
      'Premieregelgeving gecontroleerd op ' + (fmtAuditDate(pr.checkedAt) || fmtAuditDate(pr.regulationDate) || '2026') +
      (pr.regulationDate ? ' · Regeling van ' + fmtAuditDate(pr.regulationDate) : ''),
      rightX, yR, rightW);
  }

  y = Math.max(yL, yR) + 16;
  if (y + 180 > BOTTOM) y = Math.max(MT, BOTTOM - 180);
  greyRule(doc, ML, y, CW);
  y += 14;

  /* Premium conclusion zone — one composition, not cards */
  y = sectionLabel(doc, 'Besluit', ML, y);
  y = sectionTitle(doc, 'Wat betekent dit voor jouw project?', ML, y);
  y += 10;

  var zoneH = 78;
  doc.rect(ML, y, CW, zoneH).fill(C.panel);
  doc.rect(ML, y, 3.2, zoneH).fill(C.olive);

  var attention = (pack.riskRows && pack.riskRows[0] && pack.riskRows[0].risk)
    || (r.drivers && r.drivers[0] && r.drivers[0].text)
    || 'Scopebevestiging';
  var qw = (CW - 40) / 3;
  [
    { l: 'Richtprijs', v: euro(r.price) + ' excl. btw' },
    { l: 'Veilig werkbudget', v: euro(safe) + ' excl. btw' },
    { l: 'Belangrijkste aandachtspunt', v: String(attention) }
  ].forEach(function (item, i) {
    var x = ML + 16 + i * (qw + 8);
    if (i > 0) {
      doc.moveTo(x - 8, y + 16).lineTo(x - 8, y + zoneH - 16)
        .lineWidth(0.45).strokeColor(C.rule).stroke();
    }
    doc.font(FONTS.body).fontSize(7.5).fillColor(C.muted)
      .text(item.l, x, y + 18, { width: qw - 4, lineBreak: false });
    doc.font(FONTS.bodySemi).fontSize(10.5).fillColor(C.ink)
      .text(item.v, x, y + 36, { width: qw - 4, height: 32, ellipsis: true });
  });
  y += zoneH + 12;

  var closing = (pack.executiveConclusion && String(pack.executiveConclusion))
    || 'Gebruik dit rapport om offertes op dezelfde scope te vergelijken vóór je een keuze maakt.';
  if (closing.length > 220) closing = closing.slice(0, 217) + '...';
  y = body(doc, closing, ML, y, { size: 9.4, w: CW * 0.94, gap: 2.6 });
  y += 18;

  greyRule(doc, ML, y, CW);
  y += 12;
  doc.font(FONTS.displayMed).fontSize(7.4).fillColor(C.olive)
    .text('BRONNEN EN UITGANGSPUNTEN', ML, y, {
      characterSpacing: 0.7, lineBreak: false
    });
  y += 12;
  var marketDate = fmtAuditDate(r.asOf) || '2026';
  var premieDate = fmtAuditDate(pr && pr.checkedAt) || fmtAuditDate(pr && pr.regulationDate);
  y = meta(doc,
    'Marktdata gecontroleerd op ' + marketDate +
    (premieDate ? ' · Premieregelgeving gecontroleerd op ' + premieDate : '') +
    '. Gebaseerd op de projectgegevens die ELYAN kent. Vervangt geen offerte op maat.',
    ML, y);
  y += 14;
  if (y + 20 <= BOTTOM) {
    drawElyanLogo(doc, ML, y, {
      markSize: 11,
      wordSize: 9,
      gap: 6,
      spacing: 1.3,
      color: C.olive
    });
    doc.font(FONTS.body).fontSize(8.2).fillColor(C.soft)
      .text('elyan.info@gmail.com', ML + 72, y + 1, { lineBreak: false });
  }

  doc.y = Math.min(y + 14, BOTTOM);
}

/* ---------------- BUILD ---------------- */

function buildMasterV4(data) {
  return new Promise(function (resolve, reject) {
    try {
      var cat = pricing.CATEGORIES[data.type];
      var prov = pricing.PROVINCES[data.province];
      var r = data.result;
      var answers = data.answers;
      var pack = insightsLib.buildInsights(data.type, answers, r, pricing);
      var rawSteps = insightsLib.buildNextSteps(data.type, answers, r, pricing);
      var nextSteps = [];
      rawSteps.forEach(function (s) {
        var lower = String(s).toLowerCase();
        if (nextSteps.length >= 4) return;
        if (nextSteps.length && /kostentabel|elyan-kostentabel/.test(lower) &&
            nextSteps.some(function (x) { return /kostentabel|scope/.test(String(x).toLowerCase()); })) {
          return;
        }
        nextSteps.push(s);
      });
      if (nextSteps.length < 4) {
        rawSteps.forEach(function (s) {
          if (nextSteps.length >= 4) return;
          if (nextSteps.indexOf(s) === -1) nextSteps.push(s);
        });
      }

      var reportId = data.reportId || ('EL-' + String(Date.now()).slice(-8));
      var reportDate = fmtDate(new Date());
      var sizeMeta = (pricing.sizeDisplay && pricing.sizeDisplay(data.type, answers, r))
        || { fieldLabel: 'Oppervlakte', text: (answers.size || r.size) + ' m²' };

      var doc = new PDFDocument({
        size: 'A4',
        margins: { top: MT, bottom: H - BOTTOM, left: ML, right: MR },
        info: {
          Title: 'ELYAN Renovatieanalyse: ' + cat.label,
          Author: 'ELYAN',
          Subject: 'Indicatieve renovatieanalyse'
        }
      });
      registerFonts(doc);

      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var ctx = { n: 1, date: reportDate, ref: reportId, isCover: true };

      drawCover(doc, cat, prov, reportId, reportDate);
      pageInvestment(doc, ctx, cat, prov, answers, r, sizeMeta, pack, data.type);
      pageBudget(doc, ctx, r, cat);
      pageExecution(doc, ctx, r, pack);
      pageOfferReview(doc, ctx, nextSteps, pack);
      pageFinanceAndClose(doc, ctx, r, pack);

      footer(doc, ctx.n, reportDate);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildMasterV4: buildMasterV4 };
