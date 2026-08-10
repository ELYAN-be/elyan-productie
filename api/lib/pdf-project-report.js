/* ============================================================
   ELYAN — Calculator 2 project dossier PDF (pdfkit)
   NEW file — does not modify Calculator 1 pdf-report.js
   Presentation only; callers must pass server-recomputed project/finance.
   ============================================================ */
'use strict';

var PDFDocument = require('pdfkit');
var path = require('path');
var Labels = require('../../shared/calc2/result-labels');

var ASSETS = path.join(__dirname, '..', '_pdf-assets');
var COLOR = {
  primary: '#3F4A32',
  primaryDark: '#2C3423',
  sand: '#F6F4EC',
  sandDeep: '#EEEADA',
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

function fmtEUR(n) {
  if (n == null || !isFinite(Number(n))) return '—';
  var v = Math.round(Number(n));
  var neg = v < 0;
  var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + '€ ' + s;
}

function fmtDate(d) {
  var months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function header(doc, subtitle) {
  var y = 26;
  doc.save();
  doc.rect(MARGIN, y + 5, 2.8, 6).fill(COLOR.primary);
  doc.rect(MARGIN + 4.5, y + 2.5, 2.8, 8.5).fill(COLOR.primary);
  doc.rect(MARGIN + 9, y, 2.8, 11).fill(COLOR.primary);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink).text('ELYAN', MARGIN + 16, y - 1);
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
  doc.moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y).lineWidth(0.7).strokeColor(COLOR.line).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('Indicatieve projectraming — ELYAN' + (reportDate ? '  ·  ' + reportDate : ''), MARGIN, y + 6, {
      width: CONTENT_W - 70, lineBreak: false
    });
  doc.font('Helvetica').fontSize(7).fillColor(COLOR.inkFaint)
    .text('Pagina ' + String(pageNum), MARGIN, y + 6, { width: CONTENT_W, align: 'right', lineBreak: false });
  doc.page.margins.bottom = oldBottom;
}

function ensureSpace(doc, need, pageNumRef, reportDate, subtitle) {
  if (doc.y + need > FOOTER_Y - 18) {
    footer(doc, pageNumRef.n, reportDate);
    doc.addPage();
    pageNumRef.n += 1;
    header(doc, subtitle);
  }
}

function sectionTitle(doc, title) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.primaryDark).text(title, MARGIN, doc.y);
  doc.moveDown(0.35);
}

function body(doc, text) {
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft).text(text, MARGIN, doc.y, {
    width: CONTENT_W, lineGap: 2
  });
  doc.moveDown(0.4);
}

function kpiBox(doc, items) {
  var y = doc.y;
  var h = 54;
  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 6).fill(COLOR.primary);
  doc.restore();
  var colW = CONTENT_W / items.length;
  items.forEach(function (it, i) {
    var x = MARGIN + i * colW;
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.sandDeep)
      .text(it.label, x + 10, y + 10, { width: colW - 16 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.white)
      .text(it.value, x + 10, y + 26, { width: colW - 16 });
  });
  doc.y = y + h + 12;
}

function row(doc, label, value) {
  var y = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.inkSoft).text(label, MARGIN, y, { width: CONTENT_W * 0.62 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink)
    .text(value, MARGIN + CONTENT_W * 0.62, y, { width: CONTENT_W * 0.38, align: 'right' });
  doc.y = y + 14;
}

function buildProjectReportPdf(data) {
  return new Promise(function (resolve, reject) {
    try {
      var doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 48, left: MARGIN, right: MARGIN } });
      var chunks = [];
      doc.on('data', function (c) { chunks.push(c); });
      doc.on('end', function () { resolve(Buffer.concat(chunks)); });
      doc.on('error', reject);

      var reportDate = fmtDate(new Date());
      var pageNum = { n: 1 };
      var project = data.project || {};
      var state = data.state || {};
      var finance = data.finance || null;
      var profile = state.propertyProfile || {};
      var isInvestor = state.goal === 'investor' && finance && finance.ran;
      var subtitle = isInvestor ? 'Renovatie- & investeringsanalyse' : 'Renovatieanalyse';

      header(doc, subtitle);

      /* Cover / executive */
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.ink)
        .text(isInvestor ? 'Je ELYAN renovatie- & investeringsanalyse' : 'Je ELYAN renovatieanalyse', MARGIN, doc.y);
      doc.moveDown(0.4);
      body(doc, 'Indicatieve raming op basis van jouw projectgegevens. Geen offerte en geen gegarandeerde prijs of winst.');
      body(doc, 'Datum: ' + reportDate + (data.email ? '  ·  Verzonden naar ' + data.email : ''));

      var budget = project.budget || {};
      kpiBox(doc, [
        { label: 'Realistische range', value: fmtEUR(budget.low) + ' – ' + fmtEUR(budget.high) },
        { label: 'Aanbevolen budget', value: fmtEUR(budget.recommendedExpected) },
        { label: 'Status', value: Labels.allInStatusLabel(project.allInStatus) }
      ]);

      sectionTitle(doc, '1. Executive summary');
      body(doc, 'Betrouwbaarheid: ' + Labels.confidenceLabel(project.confidence) +
        '. Bedragen excl. btw tenzij anders vermeld; btw-tarief kan per post verschillen.');
      if (project.duration) {
        body(doc, 'Indicatieve uitvoeringsduur: ongeveer ' +
          project.duration.minWeeks + '–' + project.duration.maxWeeks + ' weken. Planning kan wijzigen door vergunningen, levertermijnen en beschikbaarheid.');
      }

      ensureSpace(doc, 120, pageNum, reportDate, subtitle);
      sectionTitle(doc, '2. Woning & scope');
      row(doc, 'Doel', state.goal === 'investor' ? 'Kopen, renoveren & doorverkopen' : 'Eigen woning renoveren');
      row(doc, 'Provincie', profile.province || '—');
      row(doc, 'Type', profile.propertyType || '—');
      row(doc, 'Oppervlakte', profile.areaM2 === 'weet_niet' ? 'Weet ik niet' : ((profile.areaM2 || '—') + (profile.areaM2 && profile.areaM2 !== 'weet_niet' ? ' m²' : '')));
      row(doc, 'Afwerking', state.finishProfile || '—');
      row(doc, 'Organisatie', state.procurementModel || '—');
      doc.moveDown(0.3);

      ensureSpace(doc, 140, pageNum, reportDate, subtitle);
      sectionTitle(doc, '3. Budgetopbouw');
      row(doc, 'Renovatiewerken', fmtEUR(budget.worksExpected));
      row(doc, 'Projectkosten', fmtEUR(budget.softCostsExpected));
      row(doc, 'Organisatie / coördinatie', fmtEUR(budget.procurementCostsExpected));
      row(doc, 'Projectreserve', fmtEUR(budget.reserveExpected));
      row(doc, 'Aanbevolen projectbudget', fmtEUR(budget.recommendedExpected));
      doc.moveDown(0.3);

      ensureSpace(doc, 160, pageNum, reportDate, subtitle);
      sectionTitle(doc, '4. Werkpakketten');
      var pkgs = (project.rawPackages || []).filter(function (e) {
        return e.status === 'OK' || e.status === 'NEEDS_MORE_INFORMATION';
      }).slice(0, 14);
      pkgs.forEach(function (e) {
        var exp = e.estimate && e.estimate.expected != null ? e.estimate.expected :
          (e.adjusted && e.adjusted.expected != null ? e.adjusted.expected : null);
        row(doc, (e.label || e.packageType || e.key) + ' · ' + Labels.packageStatusLabel(e.status),
          exp != null ? fmtEUR(exp) : '—');
      });
      if (!pkgs.length) body(doc, 'Geen actieve werkpakketten.');

      /* Cost drivers */
      ensureSpace(doc, 120, pageNum, reportDate, subtitle);
      sectionTitle(doc, '5. Grootste kostendrijvers');
      var drivers = pkgs.filter(function (e) {
        return e.status === 'OK' && e.estimate && e.estimate.expected > 0;
      }).sort(function (a, b) {
        return (b.estimate.expected || 0) - (a.estimate.expected || 0);
      }).slice(0, 5);
      if (!drivers.length) body(doc, 'Nog geen betrouwbare kostendrijvers.');
      drivers.forEach(function (e, i) {
        row(doc, (i + 1) + '. ' + (e.label || e.packageType), fmtEUR(e.estimate.expected));
      });

      ensureSpace(doc, 120, pageNum, reportDate, subtitle);
      sectionTitle(doc, '6. Risico’s & open punten');
      var risks = (project.warnings || []).concat(project.risks || []).slice(0, 8);
      if (!risks.length) body(doc, 'Geen zware open waarschuwingen in deze raming.');
      risks.forEach(function (r) {
        var t = typeof r === 'string' ? r : (r.note || r.code || JSON.stringify(r));
        body(doc, '• ' + String(t).replace(/NMI/g, 'onvoldoende informatie').replace(/PARTIAL_ESTIMATE/g, 'gedeeltelijke schatting'));
      });
      (project.allInCosts && project.allInCosts.unresolvedCosts || []).slice(0, 6).forEach(function (u) {
        body(doc, '• Open: ' + Labels.softCostFriendly(u.id, u.label) + ' — ' + (u.reason || ''));
      });

      ensureSpace(doc, 120, pageNum, reportDate, subtitle);
      sectionTitle(doc, '7. Indicatieve volgorde & duur');
      var phases = (project.duration && project.duration.phases) || [];
      phases.forEach(function (ph, i) {
        row(doc, (i + 1) + '. ' + ph.label, '~' + ph.weeks + ' w.');
      });
      if (project.duration) {
        body(doc, 'Totaal indicatief: ' + project.duration.minWeeks + '–' + project.duration.maxWeeks +
          ' weken. Dit is geen exacte aannemersplanning.');
      }

      ensureSpace(doc, 100, pageNum, reportDate, subtitle);
      sectionTitle(doc, '8. BTW');
      body(doc, (project.vatSummary && project.vatSummary.note) ||
        'Projectbedragen zijn in principe excl. btw. Het toepasselijke tarief (vaak 6% of 21%) hangt af van feiten en moet bevestigd worden.');

      ensureSpace(doc, 120, pageNum, reportDate, subtitle);
      sectionTitle(doc, '9. Offertechecklist');
      [
        'Vraag offertes op dezelfde scope en intensiteit.',
        'Laat meenemen: afbraak, afvoer, steigers, keuringen, btw.',
        'Vraag uitsluitingen en meerwerken expliciet.',
        'Vergelijk planning en bereikbaarheid, niet enkel prijs.',
        'Check verzekering, erkenning en referenties.'
      ].forEach(function (s) { body(doc, '• ' + s); });

      ensureSpace(doc, 100, pageNum, reportDate, subtitle);
      sectionTitle(doc, '10. Vragen voor aannemers');
      [
        'Welke posten zitten precies in / buiten deze offerte?',
        'Hoe gaan jullie om met onvoorziene asbest of structurele ontdekkingen?',
        'Wat is de geplande volgorde en hoe lang duurt elke fase indicatief?',
        'Welk btw-tarief passen jullie toe en onder welke voorwaarden?'
      ].forEach(function (s) { body(doc, '• ' + s); });

      ensureSpace(doc, 100, pageNum, reportDate, subtitle);
      sectionTitle(doc, '11. Volgende stappen');
      Labels.nextStepsHomeowner(project, state).forEach(function (s) { body(doc, '• ' + s); });

      if (isInvestor) {
        footer(doc, pageNum.n, reportDate);
        doc.addPage();
        pageNum.n += 1;
        header(doc, subtitle);

        sectionTitle(doc, '12. Investeringssamenvatting');
        body(doc, 'Gebaseerd op de door jou ingevoerde verkoopwaarde. Potentiële projectwinst is vóór eventuele belasting op gerealiseerde winst/meerwaarde.');
        kpiBox(doc, [
          { label: 'Totale projectinvestering', value: fmtEUR(finance.totalInvestment) },
          { label: 'Potentiële projectwinst', value: fmtEUR(finance.potentialProfit) },
          { label: 'Project-ROI', value: (finance.projectRoiPercent != null ? finance.projectRoiPercent + '%' : '—') }
        ]);
        row(doc, 'Break-even verkoopprijs', fmtEUR(finance.breakEvenResalePrice));
        row(doc, 'Maximale aankoopprijs (doel-ROI)', finance.maxPurchasePrice != null ? fmtEUR(finance.maxPurchasePrice) : 'Niet haalbaar');
        row(doc, 'Basisscenario', Labels.dealStatusLabel(finance.status));
        doc.moveDown(0.3);

        ensureSpace(doc, 120, pageNum, reportDate, subtitle);
        sectionTitle(doc, '13. Waar gaat het geld naartoe?');
        var mm = finance.moneyMap || {};
        row(doc, 'Aankoop', fmtEUR(mm.aankoop));
        row(doc, 'Aankoopkosten', fmtEUR(mm.aankoopkosten));
        row(doc, 'Renovatie (excl. btw-componenten)', fmtEUR(mm.renovatieExVatComponents));
        row(doc, 'BTW-cashlaag', fmtEUR(mm.btw));
        row(doc, 'Financiering', fmtEUR(mm.financiering));
        row(doc, 'Holding', fmtEUR(mm.holding));
        row(doc, 'Verkoopkosten (van opbrengst)', fmtEUR(mm.verkoopkosten));

        ensureSpace(doc, 140, pageNum, reportDate, subtitle);
        sectionTitle(doc, '14. Scenario’s');
        body(doc, 'Optimistisch combineert gunstige aannames — het is geen waarschijnlijk basisscenario.');
        ['conservative', 'expected', 'strong'].forEach(function (k) {
          var s = finance.scenarios && finance.scenarios[k];
          if (!s) return;
          row(doc, s.label + ' — winst / ROI',
            fmtEUR(s.potentialProfit) + ' / ' + (s.projectRoiPercent != null ? s.projectRoiPercent + '%' : '—'));
        });

        ensureSpace(doc, 120, pageNum, reportDate, subtitle);
        sectionTitle(doc, '15. Gevoeligheid');
        (finance.sensitivity || []).forEach(function (s) {
          row(doc, s.label, (s.profitDelta >= 0 ? '+' : '') + fmtEUR(s.profitDelta));
        });

        ensureSpace(doc, 120, pageNum, reportDate, subtitle);
        sectionTitle(doc, '16. Aannames & uitsluitingen');
        body(doc, 'Door jou ingevoerde verkoopwaarde = jouw aanname (geen geautomatiseerde waardering).');
        body(doc, 'Eventuele belasting op meerwaarde/winst is niet automatisch opgenomen.');
        body(doc, finance.disclaimer || '');
        Labels.nextStepsInvestor(finance).forEach(function (s) { body(doc, '• ' + s); });
      }

      ensureSpace(doc, 90, pageNum, reportDate, subtitle);
      sectionTitle(doc, 'Methodologie & disclaimer');
      body(doc, 'ELYAN combineert Belgische marktreferenties met jouw projectantwoorden. Resultaten zijn indicatief en geen beleggings-, fiscaal of juridisch advies. Calculator 1-prijzen blijven de bevroren referentie voor individuele werkpakketten.');

      footer(doc, pageNum.n, reportDate);
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
