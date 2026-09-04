/* ============================================================
   ELYAN Calc2. Premium results HTML (Phase 6)
   Presentation only, attaches window.ElyanCalc2UiResults
   ============================================================ */
(function () {
  'use strict';

  function packageLabelFromEntry(entry, Scope) {
    var pkg = Scope.packageById(entry.packageType);
    var base = pkg ? pkg.label : entry.packageType;
    if (entry.instanceLabel) return base + ': ' + entry.instanceLabel;
    return base;
  }

  function packageAmount(entry, fmtEUR) {
    if (entry.adjusted && entry.adjusted.suppressed) return '€0 (meegenomen elders)';
    if (entry.adjusted && entry.adjusted.expected != null) return fmtEUR(entry.adjusted.expected);
    if (entry.estimate && entry.estimate.expected != null) return fmtEUR(entry.estimate.expected);
    if (entry.provisionalEstimate && entry.provisionalEstimate.expected != null) {
      return 'Nog te bepalen · indicatie ' + fmtEUR(entry.provisionalEstimate.expected);
    }
    return '-';
  }

  function friendlyRisk(text) {
    var s = String(text || '');
    var map = [
      [/NMI packages?:/i, 'Nog onvoldoende info bij:'],
      [/Partial estimate/i, 'Gedeeltelijke schatting, niet elk onderdeel is ingeschat'],
      [/Property condition:/i, 'Staat van de woning:'],
      [/Building age uncertainty/i, 'Onzekerheid over bouwleeftijd'],
      [/Occupied during works/i, 'Bewoning tijdens werken'],
      [/Deep energy \/ envelope interaction/i, 'Combinatie energie- en schilwerken verhoogt complexiteit'],
      [/unresolved/i, 'Nog niet ingevuld'],
      [/overlap/i, 'Overlap tussen werken']
    ];
    map.forEach(function (pair) {
      s = s.replace(pair[0], pair[1]);
    });
    return s.replace(/_/g, ' ');
  }

  function topCostDrivers(project, Scope, fmtEUR, escapeHtml, limit) {
    var entries = (project.rawPackages || []).filter(function (e) {
      return e.status !== 'SKIPPED' && !(e.adjusted && e.adjusted.suppressed);
    });
    entries.sort(function (a, b) {
      var av = (a.adjusted && a.adjusted.expected) || (a.estimate && a.estimate.expected) ||
        (a.provisionalEstimate && a.provisionalEstimate.expected) || 0;
      var bv = (b.adjusted && b.adjusted.expected) || (b.estimate && b.estimate.expected) ||
        (b.provisionalEstimate && b.provisionalEstimate.expected) || 0;
      return bv - av;
    });
    return entries.slice(0, limit || 5).map(function (e) {
      var amt = (e.adjusted && e.adjusted.expected) || (e.estimate && e.estimate.expected) ||
        (e.provisionalEstimate && e.provisionalEstimate.expected) || 0;
      return '<li><span>' + escapeHtml(packageLabelFromEntry(e, Scope)) + '</span><strong>' +
        fmtEUR(amt) + '</strong></li>';
    }).join('');
  }

  function buildStatusBanner(project, Labels, escapeHtml, fmtEUR) {
    if (!project) return '';
    if (project.status === 'PARTIAL_ESTIMATE') {
      return '<div class="calc2-partial-banner calc2-partial-banner--dominant" role="status">' +
        '<strong>Gedeeltelijke raming</strong>' +
        '<p>Dit is <em>geen</em> volledig woningrenovatiebudget. Het bedrag hieronder geldt alleen voor onderdelen met voldoende informatie.</p>' +
        (project.provisionalRiskRange
          ? '<p>Extra risicoband (indicatief, niet autoritatief): ' +
            fmtEUR(project.provisionalRiskRange.low) + ' – ' + fmtEUR(project.provisionalRiskRange.high) + '</p>'
          : '') +
      '</div>';
    }
    var allInStatus = project.allInStatus || project.status;
    if (allInStatus === 'ALL_IN_INDICATIVE') {
      return '<div class="calc2-partial-banner calc2-indicative-banner" role="status">' +
        '<strong>Indicatief projectbudget</strong>' +
        '<p>Budget voor geselecteerde werken + projectlagen. Structurele, vergunnings- of coördinatiekosten zijn nog niet volledig bepaald.</p>' +
      '</div>';
    }
    return '';
  }

  function buildPartialUnpricedBlock(project, escapeHtml) {
    if (!project || project.status !== 'PARTIAL_ESTIMATE') return '';
    var unpriced = ((project.presentation && project.presentation.unpricedPackages) || [])
      .map(function (u) {
        return '<li>' + escapeHtml(u.label || u.key) +
          (u.reason ? ': ' + escapeHtml(u.reason) : '') + '</li>';
      }).join('');
    if (!unpriced) {
      return '<div class="calc2-partial-unpriced">' +
        '<p><strong>Nog niet betrouwbaar meegerekend</strong></p>' +
        '<p class="calc2-review-note">Vul open vragen aan om meer onderdelen te laten meerekenen.</p>' +
      '</div>';
    }
    return '<div class="calc2-partial-unpriced">' +
      '<p><strong>Nog niet betrouwbaar meegerekend</strong></p>' +
      '<ul class="calc2-partial-miss">' + unpriced + '</ul>' +
    '</div>';
  }

  function buildExclusionsCard(project, Labels, escapeHtml) {
    var ex = (project && project.presentation && project.presentation.exclusions) ||
      (Labels.exclusionsCopy && Labels.exclusionsCopy()) || null;
    if (!ex) return '';
    return '<div class="calc2-review-card calc2-exclusions">' +
      '<div class="calc2-review-head"><h3>' + escapeHtml(ex.title) + '</h3></div>' +
      '<p class="calc2-review-note">' + escapeHtml(ex.body) + '</p>' +
    '</div>';
  }

  function buildResultHero(project, statusLabel, confLabel, vatNote, duration, escapeHtml, fmtEUR) {
    var isPartial = project.status === 'PARTIAL_ESTIMATE';
    var kicker = isPartial
      ? 'Gedeeltelijke raming <span>(excl. btw)</span>'
      : 'Renovatiebudget voor jouw geselecteerde werken <span>(excl. btw)</span>';
    var recLabel = isPartial
      ? 'Indicatief bedrag (enkel inschattbare onderdelen)'
      : 'Aanbevolen projectbudget';
    var marketNote = project.presentation && project.presentation.marketPositionNote
      ? '<p class="calc2-review-note calc2-market-flag">' + escapeHtml(project.presentation.marketPositionNote) + '</p>'
      : '';
    var scopeNote = project.presentation && project.presentation.budgetScopeNote
      ? '<p class="calc2-review-note">' + escapeHtml(project.presentation.budgetScopeNote) + '</p>'
      : '<p class="calc2-review-note">Indicatieve raming op basis van jouw geselecteerde werken. Geen turnkey van elke denkbare kost.</p>';

    return '<section class="calc2-result-hero' + (isPartial ? ' is-partial' : '') + '" aria-label="Renovatiebudget">' +
      '<p class="calc2-hero-kicker">' + kicker + '</p>' +
      (isPartial
        ? '<p class="calc2-hero-partial-label">Voor de onderdelen waarvoor voldoende informatie beschikbaar is:</p>'
        : '') +
      '<p class="calc2-hero-range">' + fmtEUR(project.budget.low) + ' – ' + fmtEUR(project.budget.high) + '</p>' +
      '<p class="calc2-hero-recommended">' + escapeHtml(recLabel) + ': <strong>' +
        fmtEUR(project.budget.recommendedExpected) + '</strong></p>' +
      '<p class="calc2-confidence">' + escapeHtml(statusLabel) +
        ' · Betrouwbaarheid: <strong>' + escapeHtml(confLabel) + '</strong></p>' +
      '<p class="calc2-vat-note">' + escapeHtml(vatNote) + '</p>' +
      '<p class="calc2-duration">Indicatieve uitvoeringsduur: ongeveer ' + escapeHtml(duration) + '</p>' +
      scopeNote +
      marketNote +
    '</section>';
  }

  function buildInvestorGate(ctx) {
    var state = ctx.state;
    var project = ctx.project;
    var ir = ctx.ir || (project && project.investorReadiness);
    if (state.goal !== 'investor' || !ir) return '';

    var escapeHtml = ctx.escapeHtml;
    var blockRows = (ir.blockingItems || []).map(function (b) {
      return '<li><strong>' + escapeHtml(b.label) + '</strong>: ' + escapeHtml(b.reason) + '</li>';
    }).join('');

    var html = '<div class="calc2-review-card calc2-investor-gate" data-ready="' + (ir.allowed ? '1' : '0') + '">' +
      '<div class="calc2-review-head"><h3>Investeringsanalyse</h3></div>';

    if (ir.allowed) {
      html += '<p class="calc2-ready-ok">Je renovatiebudget is klaar voor een investeringsanalyse.</p>' +
        '<p class="calc2-review-note">In de volgende stap vergelijken we aankoop, renovatie, kosten en jouw verkoopscenario. Geen gegarandeerd resultaat.</p>';
    } else {
      html += '<p class="calc2-ready-blocked">Nog niet klaar voor investeringsanalyse</p>' +
        '<p class="calc2-review-note">Los eerst de belangrijkste open punten op. Winst en rendement worden pas berekend als het budget compleet genoeg is.</p>' +
        (blockRows ? '<ul class="calc2-risk-list">' + blockRows + '</ul>' : '');
    }
    html += '</div>';

    if (!ir.allowed && (ir.blockingItems || []).length) {
      var resIds = ['structural_engineer', 'permits', 'gc_coordination', 'design_build_overhead',
        'site_temporary', 'epb_reporter', 'architect_fees', 'asbestos_study', 'safety_coordinator'];
      var resCards = (ir.blockingItems || []).filter(function (b) {
        return resIds.indexOf(b.id) !== -1;
      }).map(function (b) {
        var friendly = ctx.Labels.softCostFriendly(b.id, b.label);
        var isProc = b.id === 'gc_coordination' || b.id === 'design_build_overhead';
        return '<div class="calc2-resolve-card" data-resolve-id="' + escapeHtml(b.id) + '">' +
          '<h4>' + escapeHtml(friendly) + '</h4>' +
          '<p>' + escapeHtml(b.reason) + '</p>' +
          '<div class="calc2-resolve-actions">' +
            '<label>Bedrag € <input type="number" min="0" step="50" data-res-amount="' + escapeHtml(b.id) + '"></label>' +
            (isProc ? '<label>% van werken <input type="number" min="0" max="40" step="0.5" data-res-pct="' + escapeHtml(b.id) + '"></label>' : '') +
            '<button type="button" class="btn btn-ghost" data-res-na="' + escapeHtml(b.id) + '">Niet van toepassing</button>' +
            '<button type="button" class="btn btn-ghost" data-res-unknown="' + escapeHtml(b.id) + '">Nog onbekend</button>' +
            '<button type="button" class="btn btn-primary" data-res-apply="' + escapeHtml(b.id) + '">Toepassen</button>' +
          '</div></div>';
      }).join('');
      if (resCards) {
        html += '<div class="calc2-resolve-panel" id="calc2ResolvePanel">' +
          '<p class="calc2-review-note">Vul onderstaande projectkosten in voor een betrouwbaardere analyse.</p>' +
          resCards + '</div>';
      }
    }
    return html;
  }

  function buildSoftOverrideSection(ctx, project) {
    var state = ctx.state;
    var Labels = ctx.Labels;
    var escapeHtml = ctx.escapeHtml;
    var ai = project.allInCosts;
    if (!ai) return '';

    var includedSoft = (ai.softCosts || []).filter(function (l) { return l.included; });
    var includedProc = (ai.procurementCosts || []).filter(function (l) { return l.included; });
    var overrideable = [].concat(includedSoft, includedProc, (ai.softCosts || []).filter(function (l) {
      return !l.included && l.userOverrideAllowed &&
        (l.status === 'UNRESOLVED' || l.id === 'structural_engineer' || l.id === 'permits');
    }));
    var overrideIds = {};
    var overrideControls = overrideable.filter(function (l) {
      if (overrideIds[l.id]) return false;
      overrideIds[l.id] = true;
      return l.userOverrideAllowed;
    }).map(function (l) {
      var cur = state.softCostOverrides && state.softCostOverrides[l.id];
      var val = cur != null && cur !== 'exclude' ? escapeHtml(String(cur)) : '';
      var friendly = Labels.softCostFriendly(l.id, l.label);
      return '<label class="calc2-override-row">' +
        '<span>' + escapeHtml(friendly) + '</span>' +
        '<input type="number" min="0" step="50" inputmode="numeric" data-soft-override="' +
          escapeHtml(l.id) + '" placeholder="Eigen € (excl. btw)" value="' + val + '">' +
      '</label>';
    }).join('');

    if (!overrideControls) return '';
    return '<details class="calc2-recon">' +
      '<summary>Eigen inschatting projectkosten</summary>' +
      '<p class="calc2-review-note">Overschrijf een indicatieve post met jouw bedrag excl. btw. Leeg laten herstelt de modelwaarde.</p>' +
      '<div class="calc2-override-grid">' + overrideControls + '</div>' +
      '<button type="button" class="btn btn-ghost" id="calc2ApplyOverrides">Toepassen</button>' +
    '</details>';
  }

  function buildHomeownerResultHtml(ctx) {
    var project = ctx.project;
    var state = ctx.state;
    var Scope = ctx.Scope;
    var Property = ctx.Property;
    var StateApi = ctx.StateApi;
    var Labels = ctx.Labels;
    var escapeHtml = ctx.escapeHtml;
    var fmtEUR = ctx.fmtEUR;
    var p = state.propertyProfile;

    if (!project) {
      return '<div class="calc2-review-card"><p class="calc2-review-note">Projectberekening niet beschikbaar.</p></div>';
    }

    var allInStatus = project.allInStatus || project.status;
    var confLabel = Labels.confidenceLabel(project.confidence);
    var statusLabel = Labels.allInStatusLabel(allInStatus);
    var ai = project.allInCosts;
    var softExp = project.budget.softCostsExpected != null
      ? project.budget.softCostsExpected
      : (ai && ai.softTotals ? ai.softTotals.expected : 0);
    var procExp = project.budget.procurementCostsExpected != null
      ? project.budget.procurementCostsExpected
      : (ai && ai.procurementTotals ? ai.procurementTotals.expected : 0);
    var procLabel = StateApi.procurementLabel
      ? StateApi.procurementLabel(state.procurementModel)
      : (state.procurementModel || '-');
    var vatNote = (project.vatSummary && project.vatSummary.note) || project.vatNote ||
      'Projectbedragen zijn excl. btw. Het uiteindelijke btw-tarief kan per post verschillen.';
    var duration = project.duration
      ? project.duration.minWeeks + '–' + project.duration.maxWeeks + ' weken'
      : '-';
    var durationNote = (project.duration && project.duration.explanation) || '';

    var pkgDetails = (project.rawPackages || []).filter(function (e) {
      return e.status !== 'SKIPPED';
    }).map(function (e) {
      var statusLbl = Labels.packageStatusLabel(e.status);
      return '<details class="calc2-pkg-detail">' +
        '<summary><span>' + escapeHtml(packageLabelFromEntry(e, Scope)) + '</span>' +
          '<strong>' + packageAmount(e, fmtEUR) + '</strong></summary>' +
        '<p class="calc2-review-note">Status: ' + escapeHtml(statusLbl) + '</p>' +
      '</details>';
    }).join('');

    var drivers = topCostDrivers(project, Scope, fmtEUR, escapeHtml, 5);
    var riskItems = (project.warnings || []).concat(
      (project.risks || []).map(function (r) { return { note: r }; }),
      ((project.uncertainty && project.uncertainty.unresolvedUnknowns) || []).map(function (u) {
        return { note: u };
      })
    ).slice(0, 8);
    var riskRows = riskItems.map(function (w) {
      return '<li>' + escapeHtml(friendlyRisk(w.note || w.code || String(w))) + '</li>';
    }).join('');

    var seqRows = ((project.duration && project.duration.phases) || []).map(function (ph, i) {
      return '<li><span>' + (i + 1) + '. ' + escapeHtml(ph.label) + '</span>' +
        '<strong>~' + ph.weeks + ' wk</strong></li>';
    }).join('');

    var nextSteps = Labels.nextStepsHomeowner(project, state).map(function (step) {
      return '<li>' + escapeHtml(step) + '</li>';
    }).join('');

    var active = Scope.activePackages(state.scope);
    var scopeRows = Scope.WORK_PACKAGES.map(function (pkg) {
      return '<li><span>' + escapeHtml(pkg.label) + '</span><strong>' +
        escapeHtml(Scope.intensityLabel(state.scope[pkg.id])) + '</strong></li>';
    }).join('');

    var ir = ctx.ir || project.investorReadiness;
    var financeReady = ir && ir.allowed;
    var toFinanceBtn = state.goal === 'investor'
      ? (financeReady
        ? '<button type="button" class="btn btn-primary btn-lg" id="calc2ToFinance">Naar investeringsanalyse</button>'
        : '<button type="button" class="btn btn-primary btn-lg" id="calc2ToFinance" disabled title="Los eerst de open punten op">Naar investeringsanalyse</button>')
      : '<button type="button" class="btn btn-primary btn-lg" id="calc2CloseDone">Sluiten</button>';

    return '<div class="calc2-project-result">' +
      buildStatusBanner(project, Labels, escapeHtml, fmtEUR) +

      buildResultHero(project, statusLabel, confLabel, vatNote, duration, escapeHtml, fmtEUR) +

      buildPartialUnpricedBlock(project, escapeHtml) +

      '<div class="calc2-review-card">' +
        '<div class="calc2-review-head"><h3>Budgetoverzicht</h3></div>' +
        '<ul class="calc2-review-list calc2-budget-split">' +
          '<li><span>Renovatiewerken</span><strong>' + fmtEUR(project.budget.worksExpected) + '</strong></li>' +
          '<li><span>Projectkosten</span><strong>' + fmtEUR(softExp) + '</strong></li>' +
          '<li><span>Organisatie / ' + escapeHtml(procLabel) + '</span><strong>' + fmtEUR(procExp) + '</strong></li>' +
          '<li><span>' + escapeHtml((project.presentation && project.presentation.reserveLabel) ||
            'Projectreserve voor onvoorziene posten') + '</span><strong>' +
            fmtEUR(project.budget.reserveExpected) + '</strong></li>' +
          '<li class="is-total"><span>' +
            (project.status === 'PARTIAL_ESTIMATE'
              ? 'Indicatief subtotaal (inschattbare onderdelen)'
              : 'Aanbevolen projectbudget') +
            '</span><strong>' + fmtEUR(project.budget.recommendedExpected) + '</strong></li>' +
        '</ul>' +
      '</div>' +

      buildExclusionsCard(project, Labels, escapeHtml) +

      (pkgDetails
        ? '<details class="calc2-recon" open><summary>Werkpakketten in detail</summary>' +
            '<div class="calc2-pkg-details">' + pkgDetails + '</div></details>'
        : '') +

      (drivers
        ? '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Grootste kostendrijvers</h3></div>' +
            '<ul class="calc2-review-list calc2-driver-list">' + drivers + '</ul></div>'
        : '') +

      (riskRows
        ? '<div class="calc2-review-card calc2-risks"><div class="calc2-review-head"><h3>Risico\'s & onzekerheden</h3></div>' +
            '<ul class="calc2-risk-list">' + riskRows + '</ul></div>'
        : '') +

      (seqRows
        ? '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Indicatieve werfvolgorde</h3></div>' +
            '<ol class="calc2-seq-list">' + seqRows + '</ol>' +
            (durationNote ? '<p class="calc2-review-note">' + escapeHtml(durationNote) + '</p>' : '') +
          '</div>'
        : (durationNote ? '<p class="calc2-review-note">' + escapeHtml(durationNote) + '</p>' : '')) +

      '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Volgende stappen</h3></div>' +
        '<ul class="calc2-risk-list">' + nextSteps + '</ul></div>' +

      buildInvestorGate(ctx) +
      buildSoftOverrideSection(ctx, project) +

      '<div class="calc2-review-card calc2-jump-card" data-jump-card="goal">' +
        '<div class="calc2-review-head"><h3>Doel</h3>' +
          '<button type="button" class="calc2-edit" data-jump="goal">Wijzigen</button></div>' +
        '<p>' + escapeHtml(StateApi.goalLabel(state.goal)) + '</p>' +
      '</div>' +
      '<div class="calc2-review-card calc2-jump-card" data-jump-card="location">' +
        '<div class="calc2-review-head"><h3>Woning</h3>' +
          '<button type="button" class="calc2-edit" data-jump="location">Wijzigen</button></div>' +
        '<ul class="calc2-review-list">' +
          '<li><span>Provincie</span><strong>' + escapeHtml(Property.provinceLabel(p.province)) + '</strong></li>' +
          '<li><span>Type</span><strong>' + escapeHtml(Property.labelOf(Property.PROPERTY_TYPES, p.propertyType)) + '</strong></li>' +
          '<li><span>Oppervlakte</span><strong>' + escapeHtml(p.areaM2 === 'weet_niet' ? 'Weet ik niet' : (p.areaM2 + ' m²')) + '</strong></li>' +
          '<li><span>Afwerking</span><strong>' + escapeHtml(StateApi.finishLabel(state.finishProfile)) + '</strong></li>' +
          '<li><span>Organisatie</span><strong>' + escapeHtml(procLabel) + '</strong></li>' +
        '</ul>' +
      '</div>' +
      '<div class="calc2-review-card calc2-jump-card" data-jump-card="scope">' +
        '<div class="calc2-review-head"><h3>Renovatie</h3>' +
          '<button type="button" class="calc2-edit" data-jump="scope">Wijzigen</button></div>' +
        '<p class="calc2-review-note">' + active.length + ' actieve onderdelen.</p>' +
        '<ul class="calc2-review-list">' + scopeRows + '</ul>' +
      '</div>' +

      /* Investor report requires completed finance analysis — CTA lives on finance result only */
      (state.goal === 'investor'
        ? '<p class="calc2-review-note">Wil je het investeringsrapport per e-mail? Rond eerst de investeringsanalyse af.</p>'
        : '<div id="calc2ReportCapture"></div>') +

      '<div class="calc2-nav">' +
        '<button type="button" class="btn btn-ghost btn-lg" id="calc2Restart">Nieuw plan</button>' +
        toFinanceBtn +
      '</div>' +
    '</div>';
  }

  function scenarioCard(key, sc, fmtEUR, escapeHtml, isBase) {
    if (!sc) return '';
    var title = key === 'conservative' ? 'Nadeel' : key === 'expected' ? 'Basis' : 'Optimistisch';
    var baseCls = isBase ? ' calc2-scenario is-base' : ' calc2-scenario';
    return '<article class="' + baseCls.trim() + '">' +
      '<h4>' + escapeHtml(title) + '</h4>' +
      '<p class="calc2-scenario-profit">' + fmtEUR(sc.potentialProfit) + '</p>' +
      '<p class="calc2-scenario-meta">ROI ' +
        (sc.projectRoiPercent != null ? sc.projectRoiPercent + '%' : '-') +
        ' · TI ' + fmtEUR(sc.totalInvestment) + '</p>' +
      (sc.grossResale != null
        ? '<p class="calc2-scenario-meta">Verkoop (jouw aanname): ' + fmtEUR(sc.grossResale) + '</p>'
        : '') +
      '<p class="calc2-review-note">' + escapeHtml(sc.changes) + '</p>' +
    '</article>';
  }

  function buildInvestorResultHtml(ctx) {
    var analysis = ctx.analysis;
    var project = ctx.project;
    var Labels = ctx.Labels;
    var escapeHtml = ctx.escapeHtml;
    var fmtEUR = ctx.fmtEUR;

    if (!analysis || analysis.blocked) {
      var ir = ctx.ir || (project && project.investorReadiness);
      var blocks = (ir && ir.blockingItems || []).map(function (b) {
        return '<li><strong>' + escapeHtml(b.label) + '</strong>: ' + escapeHtml(b.reason) + '</li>';
      }).join('');
      var reasons = ((analysis && analysis.reasons) || []).map(function (r) {
        return '<li>' + escapeHtml(String(r)) + '</li>';
      }).join('');
      return '<div class="calc2-screen calc2-review calc2-finance-result">' +
        '<h2 class="calc2-title">Investeringsanalyse niet beschikbaar</h2>' +
        '<p class="calc2-hint">Los eerst de open punten in je renovatiebudget op. Daarna kunnen we scenario\'s doorrekenen, zonder garantie op winst.</p>' +
        (blocks ? '<ul class="calc2-risk-list">' + blocks + '</ul>' : '') +
        (reasons ? '<ul class="calc2-risk-list">' + reasons + '</ul>' : '') +
        '<div class="calc2-nav">' +
          '<button type="button" class="btn btn-ghost btn-lg" id="finBackReview">Terug naar renovatie</button>' +
          '<button type="button" class="btn btn-primary btn-lg" id="calc2CloseDone">Sluiten</button>' +
        '</div></div>';
    }

    var sc = analysis.scenarios || {};
    var money = analysis.moneyMap || {};
    var dealLabel = Labels.dealStatusLabel(analysis.status);
    var sens = (analysis.sensitivity || []).map(function (s) {
      var isCombined = s.id === 'combined_downside';
      return '<li' + (isCombined ? ' class="is-stress"' : '') + '><span>' + escapeHtml(s.label) + '</span><strong>' +
        (s.profitDelta >= 0 ? '+' : '') + fmtEUR(s.profitDelta) + '</strong></li>';
    }).join('');
    var ledger = (analysis.assumptionLedger || []).slice(0, 14).map(function (a) {
      return '<li><span>' + escapeHtml(a.label) + '</span><strong>' +
        (a.value == null ? '-' : fmtEUR(a.value)) + '</strong></li>';
    }).join('');

    var nextSteps = Labels.nextStepsInvestor(analysis).map(function (step) {
      return '<li>' + escapeHtml(step) + '</li>';
    }).join('');

    var renoSummary = project && project.budget
      ? fmtEUR(project.budget.recommendedExpected)
      : '-';

    return '<div class="calc2-screen calc2-review calc2-finance-result">' +
      '<div class="calc2-renovation-strip">' +
        '<span>Renovatiebudget: <strong>' + renoSummary + '</strong></span>' +
        '<button type="button" class="calc2-edit" data-jump="review">Bekijk / wijzig</button>' +
      '</div>' +

      '<h2 class="calc2-title">Investeringsanalyse</h2>' +
      '<p class="calc2-hint">' + escapeHtml(analysis.disclaimer) + '</p>' +

      '<section class="calc2-result-hero calc2-finance-hero" data-status="' + escapeHtml(analysis.status) + '" aria-label="Investeringskern">' +
        '<p class="calc2-hero-kicker">Totale projectinvestering</p>' +
        '<p class="calc2-hero-range">' + fmtEUR(analysis.totalInvestment) + '</p>' +
        '<div class="calc2-kpi-grid">' +
          '<div class="calc2-kpi"><span>Potentiële projectwinst</span><strong>' + fmtEUR(analysis.potentialProfit) + '</strong></div>' +
          '<div class="calc2-kpi"><span>Project-ROI</span><strong>' +
            (analysis.projectRoiPercent != null ? analysis.projectRoiPercent + '%' : '-') + '</strong></div>' +
          '<div class="calc2-kpi"><span>Projectmarge</span><strong>' +
            (analysis.profitMarginPercent != null ? analysis.profitMarginPercent + '%' : '-') + '</strong></div>' +
          '<div class="calc2-kpi"><span>Break-even verkoop</span><strong>' + fmtEUR(analysis.breakEvenResalePrice) + '</strong></div>' +
          '<div class="calc2-kpi"><span>Max. aankoopprijs</span><strong>' +
            (analysis.maxPurchasePrice != null ? fmtEUR(analysis.maxPurchasePrice) : 'Niet haalbaar') + '</strong></div>' +
        '</div>' +
        '<p class="calc2-confidence"><span class="calc2-badge-subtle">' + escapeHtml(dealLabel) + '</span></p>' +
        '<p class="calc2-review-note calc2-qualification">Potentiële projectwinst vóór eventuele belasting op gerealiseerde winst/meerwaarde. Verkoopwaarde = door jou ingevoerde aanname.</p>' +
      '</section>' +

      (analysis.offerHeadroom
        ? '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Maximale aankoopprijs volgens jouw doelrendement</h3></div>' +
            '<p class="calc2-hero-recommended">' + fmtEUR(analysis.offerHeadroom.maxPurchaseForTarget) + '</p>' +
            '<ul class="calc2-review-list">' +
              '<li><span>Huidige / beoogde aankoopprijs</span><strong>' + fmtEUR(analysis.offerHeadroom.askingOrIntendedPurchase) + '</strong></li>' +
              '<li><span>Verschil</span><strong>' +
                (analysis.offerHeadroom.difference > 0 ? '−' : '+') +
                fmtEUR(Math.abs(analysis.offerHeadroom.difference)) + '</strong></li>' +
            '</ul>' +
            '<p class="calc2-review-note">' + escapeHtml(analysis.offerHeadroom.interpretation) +
            ' Dit is een scenarioberekening, geen aankoopadvies.</p></div>'
        : '') +

      '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Break-even verkoopprijs</h3></div>' +
        '<p class="calc2-hero-recommended">' + fmtEUR(analysis.breakEvenResalePrice) + '</p>' +
        '<p class="calc2-review-note">Bij deze verkoopprijs komt het project volgens de huidige aannames ongeveer op €0 projectwinst uit, vóór eventuele niet-gemodelleerde belastingen.</p>' +
      '</div>' +

      '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Scenario\'s</h3></div>' +
        '<div class="calc2-scenario-grid">' +
          scenarioCard('conservative', sc.conservative, fmtEUR, escapeHtml, false) +
          scenarioCard('expected', sc.expected, fmtEUR, escapeHtml, true) +
          scenarioCard('strong', sc.strong, fmtEUR, escapeHtml, false) +
        '</div>' +
        '<p class="calc2-review-note calc2-qualification">Optimistisch combineert gunstige aannames, geen waarschijnlijk scenario.</p>' +
      '</div>' +

      '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Waar gaat het geld naartoe?</h3></div>' +
        '<ul class="calc2-review-list">' +
          '<li><span>Aankoop</span><strong>' + fmtEUR(money.aankoop) + '</strong></li>' +
          '<li><span>Aankoopkosten</span><strong>' + fmtEUR(money.aankoopkosten) + '</strong></li>' +
          '<li><span>Renovatie (excl. btw-componenten)</span><strong>' + fmtEUR(money.renovatieExVatComponents) + '</strong></li>' +
          '<li><span>BTW (cash)</span><strong>' + fmtEUR(money.btw) + '</strong></li>' +
          '<li><span>Financiering</span><strong>' + fmtEUR(money.financiering) + '</strong></li>' +
          '<li><span>Holding</span><strong>' + fmtEUR(money.holding) + '</strong></li>' +
          '<li><span>Verkoopkosten</span><strong>' + fmtEUR(money.verkoopkosten) + '</strong></li>' +
        '</ul>' +
        '<p class="calc2-review-note">Verkoopkosten worden afgetrokken van de bruto verkoopopbrengst.</p>' +
      '</div>' +

      '<details class="calc2-recon" open><summary>Wat als het tegenzit?</summary>' +
        '<ul class="calc2-review-list">' + sens + '</ul>' +
        '<p class="calc2-review-note">Gecombineerde stress: renovatie duurder, lagere verkoop en langere holding tegelijk.</p>' +
      '</details>' +

      '<details class="calc2-recon"><summary>Gebruikte aannames</summary>' +
        '<p class="calc2-review-note"><strong>Jouw invoer</strong> en <strong>ELYAN-berekening</strong> staan hieronder. Niet automatisch opgenomen: belasting op gerealiseerde winst/meerwaarde waar van toepassing, en open kostenposten.</p>' +
        '<ul class="calc2-review-list">' + ledger + '</ul>' +
        '<p class="calc2-review-note calc2-qualification">Gebaseerd op de door jou ingevoerde verkoopwaarde. Geen geautomatiseerde waardebepaling.</p>' +
      '</details>' +

      (nextSteps
        ? '<div class="calc2-review-card"><div class="calc2-review-head"><h3>Volgende stappen</h3></div>' +
            '<ul class="calc2-risk-list">' + nextSteps + '</ul></div>'
        : '') +

      '<div id="calc2ReportCapture"></div>' +

      '<div class="calc2-nav">' +
        '<button type="button" class="btn btn-ghost btn-lg" id="finBackEdit">Aannames wijzigen</button>' +
        '<button type="button" class="btn btn-primary btn-lg" id="calc2CloseDone">Sluiten</button>' +
      '</div>' +
    '</div>';
  }

  function buildEmailCaptureHtml(ctx) {
    var escapeHtml = ctx.escapeHtml;
    var isInvestor = ctx.state && ctx.state.goal === 'investor';
    var title = isInvestor
      ? 'Ontvang je renovatie- & investeringsrapport'
      : 'Ontvang je renovatierapport';
    var desc = isInvestor
      ? 'Een PDF met budget, scenario\'s en aannames, indicatief, geen garantie.'
      : 'Een PDF met budget, werkpakketten en vervolgstappen op maat van jouw antwoorden.';

    return '<div class="calc2-email-card">' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<p>' + escapeHtml(desc) + '</p>' +
      '<div id="calc2EmailForm">' +
        '<label class="calc2-field"><span>E-mailadres</span>' +
          '<input type="email" id="calc2EmailInput" autocomplete="email" placeholder="jouw@email.com"></label>' +
        '<button type="button" class="btn btn-primary" id="calc2EmailSubmit">' +
          '<span class="btn-spinner" aria-hidden="true"></span>' +
          '<span class="btn-label">Ontvang mijn rapport</span></button>' +
        '<p class="calc2-email-error" id="calc2EmailError" role="alert"></p>' +
      '</div>' +
      '<div class="calc2-email-success" id="calc2EmailSuccess" hidden>' +
        '<p><strong>Bedankt!</strong> Je rapport is onderweg. Kijk ook in je spamfolder als je niets ziet.</p>' +
      '</div>' +
      '<p class="calc2-review-note">Geen spam · niet doorverkocht · direct verzonden</p>' +
    '</div>';
  }

  function buildAnalysisLoadingHtml(messages) {
    var msg = (messages && messages.length) ? messages[messages.length - 1] : 'Even geduld…';
    return '<div class="calc2-screen calc2-analysis-loading" role="status" aria-live="polite">' +
      '<div class="calc2-analysis-spinner" aria-hidden="true"></div>' +
      '<p class="calc2-analysis-msg">' + String(msg).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>' +
    '</div>';
  }

  window.ElyanCalc2UiResults = {
    buildHomeownerResultHtml: buildHomeownerResultHtml,
    buildInvestorResultHtml: buildInvestorResultHtml,
    buildEmailCaptureHtml: buildEmailCaptureHtml,
    buildAnalysisLoadingHtml: buildAnalysisLoadingHtml
  };
})();
