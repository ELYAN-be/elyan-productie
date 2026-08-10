/* ============================================================
   ELYAN Calc2 — Consumer-facing Dutch labels (Phase 6)
   Presentation only — does not change calculation engines.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2ResultLabels = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function allInStatusLabel(status) {
    var map = {
      ALL_IN_COMPLETE: 'Volledig projectbudget',
      ALL_IN_INDICATIVE: 'Indicatief projectbudget',
      PARTIAL_ESTIMATE: 'Gedeeltelijke schatting',
      INSUFFICIENT_INFORMATION: 'Nog onvoldoende informatie',
      EMPTY: 'Nog geen bruikbare schatting'
    };
    return map[status] || 'Indicatieve raming';
  }

  function confidenceLabel(c) {
    var map = {
      HIGH: 'Hoog',
      MEDIUM: 'Gemiddeld',
      LOW: 'Voorzichtig',
      PARTIAL: 'Gedeeltelijk'
    };
    return map[c] || (c || '—');
  }

  function packageStatusLabel(status) {
    if (status === 'OK') return 'Ingeschat';
    if (status === 'NEEDS_MORE_INFORMATION' || status === 'NMI') return 'Nog onvoldoende informatie';
    if (status === 'SUPPRESSED') return 'Meegenomen elders';
    return status || '—';
  }

  function dealStatusLabel(status) {
    var map = {
      STRONG_POSITIVE: 'Sterk positief basisscenario (indicatief)',
      POSITIVE: 'Positief basisscenario',
      THIN_MARGIN: 'Beperkte marge',
      BREAK_EVEN: 'Rond break-even',
      NEGATIVE: 'Negatief basisscenario',
      INSUFFICIENT_INFORMATION: 'Onvoldoende informatie'
    };
    return map[status] || status || '—';
  }

  function softCostFriendly(id, label) {
    var map = {
      gc_coordination: 'Coördinatie hoofdaannemer',
      design_build_overhead: 'Design & build / totaalpartner',
      architect_fees: 'Architect',
      structural_engineer: 'Stabiliteitsingenieur',
      epb_reporter: 'EPB / energieverslaggeving',
      safety_coordinator: 'Veiligheidscoördinatie',
      asbestos_study: 'Asbestinventaris',
      permits: 'Vergunningen / administratie',
      site_temporary: 'Tijdelijke voorzieningen / werfinrichting'
    };
    return map[id] || label || id;
  }

  function nextStepsHomeowner(project, state) {
    var steps = [
      'Vraag minstens 2–3 vergelijkbare offertes op dezelfde scope.',
      'Laat open punten (asbest, structureel, vergunning) eerst verduidelijken.',
      'Vergelijk offertes op scope, niet alleen op totaalprijs.'
    ];
    if (state && (state.structuralRisk === 'ja' || state.structuralRisk === 'weet_niet')) {
      steps.unshift('Overweeg een technische inspectie of stabiliteitsadvies vóór je vastlegt.');
    }
    if (project && project.allInStatus === 'PARTIAL_ESTIMATE') {
      steps.unshift('Vul eerst de open vragen aan — je budget is nog niet volledig.');
    }
    if (state && (state.procurementModel === 'weet_niet' || !state.procurementModel)) {
      steps.push('Beslis hoe je wil organiseren: losse vakmannen of hoofdaannemer.');
    }
    return steps.slice(0, 5);
  }

  function nextStepsInvestor(analysis) {
    var steps = [
      'Behandel verkoopwaarde als jouw aanname — geen geautomatiseerde waardering.',
      'Toets het nadeelscenario en de gecombineerde stress vóór je verder gaat.',
      'Bevestig btw-behandeling en aankoopkosten met aannemer/notaris/boekhouder.'
    ];
    if (analysis && analysis.status === 'NEGATIVE') {
      steps.unshift('Het basisscenario toont potentieel verlies — herbekijk aankoopprijs, scope of exit.');
    }
    if (analysis && analysis.offerHeadroom && analysis.offerHeadroom.difference > 0) {
      steps.push('Vergelijk jouw aankoopprijs met de berekende maximale aankoopprijs voor jouw doelrendement (scenario, geen aankoopadvies).');
    }
    return steps.slice(0, 5);
  }

  return {
    allInStatusLabel: allInStatusLabel,
    confidenceLabel: confidenceLabel,
    packageStatusLabel: packageStatusLabel,
    dealStatusLabel: dealStatusLabel,
    softCostFriendly: softCostFriendly,
    nextStepsHomeowner: nextStepsHomeowner,
    nextStepsInvestor: nextStepsInvestor
  };
});
