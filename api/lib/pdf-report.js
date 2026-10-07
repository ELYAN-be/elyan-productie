/* ============================================================
   ELYAN — Premium editorial PDF renovatierapport (pdfkit)
   Presentation layer ONLY. Pricing / VAT / premies = engine truth.
   Calm · architectural · human · no dashboard language.
   ============================================================ */

var PDFDocument = require('pdfkit');
var pricing = require('./pricing');
var insightsLib = require('./insights');

var COLOR = {
  olive: '#3F4A32',
  oliveDeep: '#2C3423',
  mineral: '#F7F5EF',
  stone: '#E8E4D8',
  ink: '#14150F',
  soft: '#5B5D4F',
  faint: '#6E7062',
  white: '#FFFFFF',
  panel: '#F3F1EA'
};

var PAGE = { width: 595.28, height: 841.89 };
var MARGIN = 52;
var CONTENT_W = PAGE.width - MARGIN * 2;
var FOOTER_Y = PAGE.height - 40;
var CONTENT_BOTTOM = FOOTER_Y - 18;

function fmtDate(d) {
  var months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function housingAgeLabel(v) {
  if (v === 'jong') return 'Jonger dan 10 jaar';
  if (v === 'middel') return '10–30 jaar';
  if (v === 'oud') return 'Ouder dan 30 jaar';
  return v || null;
}

function marketPositionCopy(pos) {
  if (pos === 'lager') return 'ligt onder de gebruikelijke Belgische marktband voor een vergelijkbare scope';
  if (pos === 'hoger') return 'ligt boven de gebruikelijke Belgische marktband voor een vergelijkbare scope';
  if (pos === 'niet-direct-vergelijkbaar') {
    return 'is niet één-op-één te vergelijken met een publicatiemarktband door afwijkende scope';
  }
  return 'ligt binnen de gebruikelijke Belgische marktband voor een vergelijkbare scope';
}

function premieRelevanceCopy(relevance) {
  if (relevance === 'mogelijk') return 'Mogelijk relevant op basis van de bekende projectgegevens.';
  if (relevance === 'niet_beschikbaar') return 'Momenteel geen aanvraag mogelijk.';
  return 'Beperkt relevant op basis van de bekende projectgegevens.';
}

/* ---------- page chrome ---------- */

function drawFooter(doc, pageNum, reportDate) {
  var old = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  var y = FOOTER_Y;
  doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y)
    .lineWidth(0.5).strokeColor(COLOR.stone).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.faint)
    .text('ELYAN · Indicatieve renovatieanalyse' + (reportDate ? '  ·  ' + reportDate : ''),
      MARGIN, y + 8, { width: CONTENT_W - 80, lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.faint)
    .text('Pagina ' + String(pageNum), MARGIN, y + 8, {
      width: CONTENT_W, align: 'right', lineBreak: false
    });
  doc.page.margins.bottom = old;
}

function ensureSpace(doc, needed, ctx) {
  if (doc.y + needed > CONTENT_BOTTOM) {
    drawFooter(doc, ctx.page.n, ctx.reportDate);
    doc.addPage();
    ctx.page.n++;
    doc.y = MARGIN;
    return true;
  }
  return false;
}

function newContentPage(doc, ctx) {
  drawFooter(doc, ctx.page.n, ctx.reportDate);
  doc.addPage();
  ctx.page.n++;
  doc.y = MARGIN;
}

function thinRule(doc, after) {
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y)
    .lineWidth(0.5).strokeColor(COLOR.stone).stroke();
  doc.y += after != null ? after : 16;
}

function sectionHeading(doc, title, ctx, opts) {
  opts = opts || {};
  ensureSpace(doc, 36 + (opts.keepWith || 48), ctx);
  if (opts.spaceBefore) doc.y += opts.spaceBefore;
  doc.font('Helvetica-Bold').fontSize(opts.size || 13).fillColor(COLOR.ink)
    .text(title, MARGIN, doc.y, { width: CONTENT_W });
  doc.y += opts.after != null ? opts.after : 12;
}

function paragraph(doc, text, ctx, opts) {
  opts = opts || {};
  if (!text) return;
  ensureSpace(doc, 28, ctx);
  doc.font('Helvetica').fontSize(opts.size || 9.5).fillColor(opts.color || COLOR.soft)
    .text(text, MARGIN, doc.y, {
      width: opts.width || CONTENT_W * 0.92,
      lineGap: opts.lineGap != null ? opts.lineGap : 3.2,
      align: opts.align || 'left'
    });
  doc.y += opts.after != null ? opts.after : 10;
}

function labelValue(doc, label, value, ctx, opts) {
  opts = opts || {};
  ensureSpace(doc, 28, ctx);
  doc.font('Helvetica').fontSize(8).fillColor(COLOR.faint)
    .text(label, MARGIN, doc.y, { width: CONTENT_W });
  doc.y += 3;
  doc.font(opts.boldValue === false ? 'Helvetica' : 'Helvetica-Bold')
    .fontSize(opts.valueSize || 11).fillColor(COLOR.ink)
    .text(String(value), MARGIN, doc.y, { width: CONTENT_W });
  doc.y += opts.after != null ? opts.after : 14;
}

function twoColFacts(doc, pairs, ctx) {
  var colW = (CONTENT_W - 24) / 2;
  var i = 0;
  while (i < pairs.length) {
    ensureSpace(doc, 36, ctx);
    var y0 = doc.y;
    var hMax = 0;
    for (var c = 0; c < 2 && i < pairs.length; c++, i++) {
      var p = pairs[i];
      var x = MARGIN + c * (colW + 24);
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.faint)
        .text(p.label, x, y0, { width: colW });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
        .text(String(p.value), x, y0 + 12, { width: colW });
      hMax = Math.max(hMax, 28);
    }
    doc.y = y0 + hMax + 8;
  }
}

function oliveCallout(doc, lines, ctx) {
  var padX = 16;
  var padY = 14;
  var textW = CONTENT_W - padX * 2 - 4;
  var h = padY * 2;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9.5);
    h += doc.heightOfString(line.text, { width: textW, lineGap: 2.5 });
    if (idx < lines.length - 1) h += 6;
  });
  ensureSpace(doc, h + 12, ctx);
  var y = doc.y;
  doc.rect(MARGIN, y, CONTENT_W, h).fill(COLOR.panel);
  doc.rect(MARGIN, y, 2.5, h).fill(COLOR.olive);
  var ty = y + padY;
  lines.forEach(function (line, idx) {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(line.size || 9.5)
      .fillColor(line.color || COLOR.ink)
      .text(line.text, MARGIN + padX + 2, ty, { width: textW, lineGap: 2.5 });
    ty = doc.y + (idx < lines.length - 1 ? 6 : 0);
  });
  doc.y = y + h + 16;
}

function simpleTable(doc, headers, rows, ctx, opts) {
  opts = opts || {};
  var col1 = opts.col1 != null ? opts.col1 : CONTENT_W * 0.62;
  var col2 = CONTENT_W - col1;
  var rowH = 22;

  function drawHeader() {
    ensureSpace(doc, rowH + 8, ctx);
    var y = doc.y;
    doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y)
      .lineWidth(0.6).strokeColor(COLOR.ink).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.faint)
      .text(headers[0], MARGIN, y + 6, { width: col1 })
      .text(headers[1], MARGIN + col1, y + 6, { width: col2, align: 'right' });
    doc.y = y + rowH;
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y)
      .lineWidth(0.4).strokeColor(COLOR.stone).stroke();
    doc.y += 4;
  }

  drawHeader();
  rows.forEach(function (row, idx) {
    var broke = ensureSpace(doc, rowH + 6, ctx);
    if (broke) {
      paragraph(doc, 'Kostentabel (vervolg)', ctx, { size: 8, color: COLOR.faint, after: 6 });
      drawHeader();
    }
    var y = doc.y;
    if (row.total) {
      doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y)
        .lineWidth(0.5).strokeColor(COLOR.stone).stroke();
      y += 6;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.ink)
        .text(row.label, MARGIN, y, { width: col1 })
        .text(row.value, MARGIN + col1, y, { width: col2, align: 'right' });
      doc.y = y + 20;
    } else {
      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.ink)
        .text(row.label, MARGIN, y + 3, { width: col1 - 8 });
      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.ink)
        .text(row.value, MARGIN + col1, y + 3, { width: col2, align: 'right' });
      doc.y = y + rowH;
      if (idx < rows.length - 1 && !rows[idx + 1].total) {
        doc.moveTo(MARGIN, doc.y).lineTo(PAGE.width - MARGIN, doc.y)
          .lineWidth(0.35).strokeColor(COLOR.stone).stroke();
      }
    }
  });
  doc.y += 10;
}

function checklist(doc, items, ctx) {
  items.forEach(function (item) {
    ensureSpace(doc, 20, ctx);
    var y = doc.y;
    doc.rect(MARGIN, y + 1.5, 7, 7).lineWidth(0.8).strokeColor(COLOR.olive).stroke();
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.soft)
      .text(item, MARGIN + 14, y, { width: CONTENT_W - 14, lineGap: 2 });
    doc.y += 8;
  });
  doc.y += 4;
}

function numberedPlain(doc, items, ctx) {
  items.forEach(function (item, i) {
    ensureSpace(doc, 28, ctx);
    var y = doc.y;
    var num = String(i + 1);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.olive)
      .text(num + '.', MARGIN, y, { width: 18 });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.soft)
      .text(item, MARGIN + 22, y, { width: CONTENT_W - 22, lineGap: 2.5 });
    doc.y += 8;
  });
}

function editorialNumberedBlocks(doc, blocks, ctx) {
  blocks.forEach(function (b, i) {
    ensureSpace(doc, 56, ctx);
    var num = String(i + 1).padStart(2, '0');
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.olive)
      .text(num, MARGIN, doc.y);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.ink)
      .text(b.title, MARGIN + 32, doc.y, { width: CONTENT_W - 32 });
    doc.y += 4;
    if (b.body) {
      paragraph(doc, b.body, ctx, { size: 9.2, after: 4, width: CONTENT_W - 32 });
      // indent body under title — paragraph resets to MARGIN; nudge visually via left pad on next if needed
    }
    if (b.ask) {
      doc.font('Helvetica-Oblique').fontSize(8.8).fillColor(COLOR.faint)
        .text(b.ask, MARGIN + 32, doc.y, { width: CONTENT_W - 32, lineGap: 2 });
      doc.y += 12;
    } else {
      doc.y += 8;
    }
  });
}

/* ---------- cover ---------- */

function drawCover(doc, cat, prov, reportId, reportDate) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.mineral);

  // subtle olive accent rule
  doc.rect(MARGIN, 72, 36, 2).fill(COLOR.olive);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.ink)
    .text('ELYAN', MARGIN, 92, { characterSpacing: 1.2 });

  doc.font('Helvetica').fontSize(11).fillColor(COLOR.soft)
    .text('Persoonlijke renovatieanalyse', MARGIN, 160, { width: CONTENT_W * 0.85 });

  doc.font('Helvetica-Bold').fontSize(26).fillColor(COLOR.ink)
    .text(cat.label, MARGIN, 188, { width: CONTENT_W * 0.88, lineGap: 2 });

  doc.y = 280;
  thinRule(doc, 22);

  doc.font('Helvetica').fontSize(10).fillColor(COLOR.soft)
    .text(prov.label, MARGIN, doc.y);
  doc.y += 18;
  doc.font('Helvetica').fontSize(10).fillColor(COLOR.soft)
    .text(reportDate, MARGIN, doc.y);
  doc.y += 18;
  doc.font('Helvetica').fontSize(10).fillColor(COLOR.faint)
    .text('Referentie ' + reportId, MARGIN, doc.y);

  doc.font('Helvetica').fontSize(8).fillColor(COLOR.faint)
    .text('Indicatieve analyse op basis van Belgische marktgegevens. Geen bindende offerte.',
      MARGIN, PAGE.height - 72, { width: CONTENT_W * 0.8, lineGap: 2 });
}

/* ---------- main builder ---------- */

var buildMasterV4 = require('./pdf-report-v4').buildMasterV4;

function normalizeReportAnswers(data) {
  var answers = data.answers || {
    size: data.size, level: data.level, province: data.province, notes: data.notes
  };
  if (!answers.province) answers.province = data.province;
  if (!answers.size) answers.size = data.size;
  if (!answers.level) answers.level = data.level;
  return answers;
}

/** Production Calc1 entry: approved V4 premium visual system for all Calc1 categories. */
function buildReportPdf(data) {
  var answers = normalizeReportAnswers(data || {});
  return buildMasterV4({
    type: data.type,
    province: data.province,
    answers: answers,
    result: data.result,
    reportId: data.reportId || ('EL-' + String(Date.now()).slice(-8))
  });
}

function buildReportPdfLegacy(data) {
  return new Promise(function (resolve, reject) {
    try {
      var cat = pricing.CATEGORIES[data.type];
      var prov = pricing.PROVINCES[data.province];
      var r = data.result;
      var answers = normalizeReportAnswers(data);

      var pack = insightsLib.buildInsights(data.type, answers, r, pricing);
      var nextSteps = insightsLib.buildNextSteps(data.type, answers, r, pricing).slice(0, 4);
      var reportId = data.reportId || ('EL-' + String(Date.now()).slice(-8));
      var reportDate = fmtDate(new Date());
      var lp = r.labourPlan || {};
      var safeBudget = (r.price || 0) + (r.contingency || 0);
      var sizeMeta = (pricing.sizeDisplay && pricing.sizeDisplay(data.type, answers, r))
        || r.sizeDisplay
        || { fieldLabel: 'Omvang', text: (answers.size || r.size) + ' m²', short: (answers.size || r.size) + ' m²' };
      var bm = r.marketBenchmark || {};
      var pctL = r.contingencyPct ? Math.round(r.contingencyPct.low * 100) : 10;
      var pctH = r.contingencyPct ? Math.round(r.contingencyPct.high * 100) : 15;

      var doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: 52, left: MARGIN, right: MARGIN },
        info: {
          Title: 'ELYAN renovatieanalyse — ' + cat.label,
          Author: 'ELYAN',
          Subject: 'Persoonlijke renovatieanalyse'
        }
      });
      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var ctx = { page: { n: 1 }, reportDate: reportDate, type: data.type };

      /* ===== COVER ===== */
      drawCover(doc, cat, prov, reportId, reportDate);

      /* ===== PAGE — Projectoverzicht + prijs ===== */
      doc.addPage();
      ctx.page.n++;
      doc.y = MARGIN;

      sectionHeading(doc, 'Projectoverzicht', ctx, { keepWith: 80, after: 16 });

      var facts = [
        { label: 'Type renovatie', value: cat.label },
        { label: 'Locatie', value: prov.label },
        { label: sizeMeta.fieldLabel || 'Omvang', value: sizeMeta.text },
        { label: 'Afwerkingsniveau', value: (pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level || '—' }
      ];
      if (housingAgeLabel(answers.housingAge)) {
        facts.push({ label: 'Woningouderdom', value: housingAgeLabel(answers.housingAge) });
      }
      twoColFacts(doc, facts, ctx);

      if (data.notes) {
        doc.y += 4;
        paragraph(doc, 'Opmerking bij dit project: ' + data.notes, ctx, { size: 9, after: 8 });
      }

      doc.y += 8;
      thinRule(doc, 20);

      sectionHeading(doc, 'Indicatieve investering', ctx, { keepWith: 120, after: 18 });

      labelValue(doc, 'Richtprijs', pricing.fmtEUR(r.price) + ' excl. btw', ctx, {
        valueSize: 22, after: 18
      });
      labelValue(doc, 'Waarschijnlijke bandbreedte',
        pricing.fmtEUR(r.low) + ' – ' + pricing.fmtEUR(r.high) + ' excl. btw', ctx, {
          valueSize: 12, after: 14
        });
      labelValue(doc, 'Indicatief incl. btw', pricing.fmtEUR(r.totalInclVat || r.price), ctx, {
        valueSize: 11, after: 14
      });
      labelValue(doc, 'Indicatieve uitvoeringsduur',
        r.weeksLow + '–' + r.weeksHigh + ' weken', ctx, {
          valueSize: 11, after: 18
        });

      paragraph(doc,
        'De richtprijs is het meest waarschijnlijke middenpunt. De bandbreedte weerspiegelt gebruikelijke marktvariatie bij vergelijkbare scope.',
        ctx, { size: 9, after: 16 });

      if (r.drivers && r.drivers.length) {
        sectionHeading(doc, 'Wat bepaalt jouw prijs?', ctx, { keepWith: 90, after: 14 });
        r.drivers.slice(0, 3).forEach(function (d) {
          ensureSpace(doc, 40, ctx);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
            .text(d.text, MARGIN, doc.y, { width: CONTENT_W });
          doc.y += 3;
          if (d.reason) {
            paragraph(doc, d.reason, ctx, { size: 9.2, after: 12 });
          } else {
            doc.y += 10;
          }
        });
      }

      /* ===== PAGE — Budget + markt ===== */
      newContentPage(doc, ctx);
      sectionHeading(doc, 'Waar gaat je budget naartoe?', ctx, { keepWith: 100, after: 10 });
      paragraph(doc, 'Alle bedragen exclusief btw. Opgebouwd uit werkpakketten, niet uit vaste percentages.', ctx, {
        size: 9, after: 14
      });

      var costRows = (r.costBreakdown || [])
        .filter(function (it) { return it.amount > 0; })
        .map(function (it) {
          return { label: it.label, value: pricing.fmtEUR(it.amount) };
        });
      costRows.push({
        label: 'Totaal excl. btw',
        value: pricing.fmtEUR(r.subtotalExVat || r.price),
        total: true
      });
      simpleTable(doc, ['Onderdeel', 'Raming'], costRows, ctx);

      // Secondary composition table (no bars)
      sectionHeading(doc, 'Samenstelling', ctx, { keepWith: 60, spaceBefore: 8, after: 10 });
      simpleTable(doc, ['Categorie', 'Aandeel'], [
        {
          label: 'Materiaal',
          value: pricing.fmtEUR(r.amounts.materiaal) + '  ·  ' + Math.round(r.split.materiaal * 100) + '%'
        },
        {
          label: 'Arbeid',
          value: pricing.fmtEUR(r.amounts.arbeid) + '  ·  ' + Math.round(r.split.arbeid * 100) + '%'
        },
        {
          label: 'Overige',
          value: pricing.fmtEUR(r.amounts.overige) + '  ·  ' + Math.round(r.split.overige * 100) + '%'
        }
      ], ctx);

      sectionHeading(doc, 'Vergelijking met de markt', ctx, { keepWith: 80, spaceBefore: 6, after: 12 });
      paragraph(doc,
        'Deze raming ' + marketPositionCopy(r.marketPosition) + '.',
        ctx, { size: 9.5, after: 12 });

      if (bm.low != null && bm.high != null && r.marketPosition !== 'niet-direct-vergelijkbaar') {
        labelValue(doc, 'ELYAN-raming', pricing.fmtEUR(r.comparableSubtotal != null ? r.comparableSubtotal : r.price) + ' excl. btw', ctx, {
          valueSize: 11, after: 10
        });
        labelValue(doc, 'Marktband', pricing.fmtEUR(bm.low) + ' – ' + pricing.fmtEUR(bm.high) + ' excl. btw', ctx, {
          valueSize: 11, after: 10
        });
      } else if (r.comparableNote) {
        paragraph(doc, r.comparableNote, ctx, { size: 9, after: 8 });
      }

      paragraph(doc,
        'Marktdata gecontroleerd: ' + (r.asOf || '2026') +
        (bm.scope ? '. Scope: ' + bm.scope : '.') +
        ' Gebruik de kostentabel bij het vergelijken van offertes, niet alleen het totaal.',
        ctx, { size: 8, color: COLOR.faint, after: 6 });

      /* ===== PAGE — Uitvoering + fasering ===== */
      newContentPage(doc, ctx);
      sectionHeading(doc, 'Uitvoering en planning', ctx, { keepWith: 100, after: 16 });

      twoColFacts(doc, [
        { label: 'Geschatte arbeidsinspanning', value: String(lp.labourHours || r.labourHours || '—') + ' manuren' },
        { label: 'Typische ploeg', value: String(lp.crewSize || r.crewSize || '—') + ' vakmensen' },
        { label: 'Productieve werkdagen', value: '±' + String(lp.workDays || r.workDays || '—') + ' dagen' },
        { label: 'Indicatieve uitvoeringsduur', value: r.weeksLow + '–' + r.weeksHigh + ' weken' }
      ], ctx);

      paragraph(doc,
        'De kalenderduur kan langer zijn door levering, droogtijd, fasering of afstemming tussen verschillende vakdisciplines.',
        ctx, { size: 9, after: 18 });

      if (pack.timeline && pack.timeline.length) {
        sectionHeading(doc, 'Indicatieve fasering', ctx, { keepWith: 90, after: 16 });
        pack.timeline.slice(0, 6).forEach(function (step, i) {
          ensureSpace(doc, 44, ctx);
          var num = String(i + 1).padStart(2, '0');
          doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.olive)
            .text(num, MARGIN, doc.y);
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.ink)
            .text(step.phase, MARGIN + 32, doc.y, { width: CONTENT_W - 90 });
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.faint)
            .text(step.days != null ? '±' + step.days + ' d' : '', MARGIN, doc.y, {
              width: CONTENT_W, align: 'right'
            });
          doc.y += 4;
          if (step.note) {
            paragraph(doc, step.note, ctx, { size: 9, after: 14, width: CONTENT_W - 32 });
          } else {
            doc.y += 12;
          }
        });
      }

      if (pack.assumptions && pack.assumptions.length) {
        sectionHeading(doc, 'Uitgangspunten van deze raming', ctx, {
          keepWith: 60, spaceBefore: 4, after: 10
        });
        pack.assumptions.slice(0, 4).forEach(function (a) {
          paragraph(doc, '·  ' + a, ctx, { size: 9, after: 5 });
        });
      }

      /* ===== Risks + buffer ===== */
      newContentPage(doc, ctx);
      sectionHeading(doc, 'Waar moet je rekening mee houden?', ctx, { keepWith: 100, after: 14 });
      paragraph(doc,
        'Deze aandachtspunten helpen om offertes en technische keuzes beter te beoordelen.',
        ctx, { size: 9.2, after: 16 });

      var riskBlocks = [];
      if (pack.riskRows && pack.riskRows.length) {
        pack.riskRows.slice(0, 4).forEach(function (row) {
          riskBlocks.push({
            title: row.risk,
            body: null,
            ask: row.check ? ('Vraag: ' + row.check) : null
          });
        });
      } else if (pack.risks && pack.risks.length) {
        pack.risks.slice(0, 4).forEach(function (t) {
          riskBlocks.push({ title: t, body: null, ask: null });
        });
      }
      if (!riskBlocks.length) {
        paragraph(doc, 'Geen bijzondere hoog-risico signalen op basis van de bekende projectgegevens. Blijf standaard werfrisico’s controleren in de offerte.', ctx, { after: 12 });
      } else {
        // Convert riskRows: use risk as title, check as ask; add short body from impact-free text
        editorialNumberedBlocks(doc, riskBlocks.map(function (b) {
          return {
            title: b.title,
            body: b.body,
            ask: b.ask
          };
        }), ctx);
      }

      sectionHeading(doc, 'Aanbevolen budgetbuffer', ctx, { keepWith: 80, spaceBefore: 10, after: 12 });
      oliveCallout(doc, [
        { text: pricing.fmtEUR(r.contingency || 0), bold: true, size: 16, color: COLOR.ink },
        {
          text: 'Voor dit project is een buffer van ongeveer ' + pctL + '–' + pctH +
            '% verstandig voor kleine afwijkingen in uitvoering of materiaalkeuze.',
          size: 9.2, color: COLOR.soft
        },
        {
          text: 'Veilig werkbudget  ' + pricing.fmtEUR(safeBudget) + ' excl. btw',
          bold: true, size: 10, color: COLOR.ink
        }
      ], ctx);
      if (pack.bufferReason) {
        paragraph(doc, pack.bufferReason, ctx, { size: 8.5, color: COLOR.faint, after: 6 });
      }

      /* ===== Offertes + vragen ===== */
      newContentPage(doc, ctx);

      if (pack.quoteChecks && pack.quoteChecks.length) {
        sectionHeading(doc, 'Zo vergelijk je offertes', ctx, { keepWith: 80, after: 10 });
        paragraph(doc, 'Controleer of iedere offerte het volgende vermeldt:', ctx, {
          size: 9.2, after: 12
        });
        checklist(doc, pack.quoteChecks.slice(0, 8), ctx);
      }

      if (pack.contractorQuestions && pack.contractorQuestions.length) {
        sectionHeading(doc, 'Vragen die je best stelt', ctx, {
          keepWith: 70, spaceBefore: 14, after: 12
        });
        numberedPlain(doc, pack.contractorQuestions.slice(0, 6), ctx);
      }

      /* ===== Signalen + besparen ===== */
      newContentPage(doc, ctx);

      if (pack.redFlags && pack.redFlags.length) {
        sectionHeading(doc, 'Rode vlaggen', ctx, { keepWith: 60, after: 10 });
        paragraph(doc, 'Signalen om offertes kritisch te lezen — geen juridisch advies.', ctx, {
          size: 9, after: 10
        });
        pack.redFlags.slice(0, 6).forEach(function (f) {
          paragraph(doc, '·  ' + f, ctx, { size: 9.2, after: 6 });
        });
      }

      if (pack.savings && pack.savings.length) {
        var saves = pack.savings.slice(0, 3).map(function (s) { return s.text || s; })
          .filter(Boolean);
        if (saves.length) {
          sectionHeading(doc, 'Waar kun je mogelijk besparen?', ctx, {
            keepWith: 50, spaceBefore: 14, after: 10
          });
          saves.forEach(function (s) {
            paragraph(doc, '·  ' + s, ctx, { size: 9.2, after: 6 });
          });
        }
      }

      /* ===== BTW + premies ===== */
      newContentPage(doc, ctx);

      sectionHeading(doc, 'Indicatief btw-scenario', ctx, { keepWith: 90, after: 12 });
      labelValue(doc, 'Scenario', r.vatLabel || 'Indicatief', ctx, { valueSize: 12, after: 12 });

      if (r.vatMixed && r.vatBreakdown) {
        paragraph(doc,
          '6% op ' + pricing.fmtEUR(r.vatBreakdown.taxableBase6 || 0) +
          ' → ' + pricing.fmtEUR(r.vatBreakdown.vat6 || 0) +
          '    ·    21% op ' + pricing.fmtEUR(r.vatBreakdown.taxableBase21 || 0) +
          ' → ' + pricing.fmtEUR(r.vatBreakdown.vat21 || 0),
          ctx, { size: 9, after: 10 });
      }

      labelValue(doc, 'Indicatieve btw', pricing.fmtEUR(r.vatAmount || 0), ctx, {
        valueSize: 11, after: 10
      });
      labelValue(doc, 'Indicatief totaal incl. btw', pricing.fmtEUR(r.totalInclVat || r.price), ctx, {
        valueSize: 11, after: 12
      });

      if (r.vatNote) {
        paragraph(doc, r.vatNote, ctx, { size: 8.8, after: 8 });
      }
      paragraph(doc,
        'Het definitieve btw-tarief hangt af van de wettelijke voorwaarden en wordt bevestigd op de factuur van de aannemer.',
        ctx, { size: 9, after: 18 });

      sectionHeading(doc, 'Mogelijke steunmaatregelen', ctx, { keepWith: 70, after: 12 });
      var premies = (r.premies || []).slice(0, 2);
      if (!premies.length) {
        paragraph(doc, 'Geen specifieke steunmaatregel aangeduid voor dit projectprofiel.', ctx, {
          size: 9.2, after: 12
        });
      } else {
        premies.forEach(function (pr) {
          ensureSpace(doc, 70, ctx);
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.ink)
            .text(pr.scheme, MARGIN, doc.y, { width: CONTENT_W });
          doc.y += 4;
          paragraph(doc, premieRelevanceCopy(pr.relevance), ctx, { size: 9.2, after: 6 });
          if (pr.reason) {
            paragraph(doc, pr.reason, ctx, { size: 9, after: 6 });
          }
          if (pr.missing && pr.missing.length) {
            paragraph(doc, 'Nog te controleren: ' + pr.missing.join(', ') + '.', ctx, {
              size: 8.8, color: COLOR.faint, after: 6
            });
          }
          paragraph(doc,
            'Gecontroleerd ' + (pr.checkedAt || r.asOf || '2026') +
            (pr.regulationDate ? ' · Regelgeving ' + pr.regulationDate : ''),
            ctx, { size: 7.5, color: COLOR.faint, after: 14 });
        });
      }
      paragraph(doc, 'ELYAN berekent geen exact premiebedrag zonder inkomen en eigendomstype.', ctx, {
        size: 8.5, color: COLOR.faint, after: 16
      });

      /* ===== Conclusie + stappen ===== */
      newContentPage(doc, ctx);

      sectionHeading(doc, 'Wat betekent dit voor jouw project?', ctx, { keepWith: 90, after: 14 });

      labelValue(doc, 'Verwachte investering', pricing.fmtEUR(r.price) + ' excl. btw', ctx, {
        valueSize: 12, after: 12
      });
      labelValue(doc, 'Veilig werkbudget', pricing.fmtEUR(safeBudget) + ' excl. btw', ctx, {
        valueSize: 12, after: 12
      });

      var focusPoint = (pack.riskRows[0] && pack.riskRows[0].risk)
        || (pack.risks[0])
        || (r.drivers && r.drivers[0] && r.drivers[0].text)
        || 'Vergelijk offertes op identieke scope en voorwaarden.';
      labelValue(doc, 'Belangrijkste aandachtspunt', focusPoint, ctx, {
        valueSize: 10.5, after: 12
      });

      if (pack.executiveConclusion) {
        paragraph(doc, pack.executiveConclusion, ctx, { size: 9.2, after: 16 });
      }

      sectionHeading(doc, 'Jouw volgende stappen', ctx, { keepWith: 70, after: 14 });
      nextSteps.forEach(function (step, i) {
        ensureSpace(doc, 36, ctx);
        var num = String(i + 1).padStart(2, '0');
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.olive)
          .text(num, MARGIN, doc.y);
        doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.soft)
          .text(step, MARGIN + 32, doc.y, { width: CONTENT_W - 32, lineGap: 2.5 });
        doc.y += 12;
      });

      doc.y += 8;
      thinRule(doc, 14);
      sectionHeading(doc, 'Bronnen en uitgangspunten', ctx, { keepWith: 40, after: 8 });
      paragraph(doc,
        'Marktdata gecontroleerd: ' + (r.asOf || '2026') +
        ' · Dataset ' + (r.marketDataVersion || '2026') +
        '. Alle bedragen zijn indicatief en exclusief btw tenzij anders vermeld.',
        ctx, { size: 8, color: COLOR.faint, after: 10 });

      var disclaimer =
        'Dit rapport is indicatief en gebaseerd op Belgische mid-market componentprijzen en de projectgegevens die ELYAN kent. Het vervangt geen offerte op maat en heeft geen contractuele waarde. Vraag steeds een offerte bij een erkende aannemer.';
      paragraph(doc, disclaimer, ctx, { size: 7.5, color: COLOR.faint, after: 16 });

      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
        .text('ELYAN', MARGIN, doc.y);
      doc.y += 4;
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.faint)
        .text('Vragen over dit rapport?  elyan.info@gmail.com', MARGIN, doc.y);

      drawFooter(doc, ctx.page.n, reportDate);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildReportPdf: buildReportPdf };
