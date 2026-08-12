/* ============================================================
   ELYAN Calc2. High-level project duration / sequencing
   Indicative ranges only, not sum(workDays).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2Sequencing = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PHASES = [
    { id: 'prep', label: 'Voorbereiding / onderzoek', weeks: 1, packages: [] },
    { id: 'envelope', label: 'Schil / structureel', weeks: 2, packages: ['gevel', 'dak'] },
    { id: 'windows', label: 'Ramen & buitenschrijnwerk', weeks: 1.5, packages: ['ramen'] },
    { id: 'tech_rough', label: 'Ruwe technieken', weeks: 2.5, packages: ['elektriciteit', 'verwarming', 'ventilatie'] },
    { id: 'insulation', label: 'Isolatie (indien apart)', weeks: 1.5, packages: ['isolatie'] },
    { id: 'wet', label: 'Badkamer / keuken', weeks: 3, packages: ['badkamer', 'keuken'] },
    { id: 'floors', label: 'Vloeren / chape-afwerking', weeks: 2, packages: ['vloeren'] },
    { id: 'paint', label: 'Schilderwerken / finishing', weeks: 2, packages: ['schilderwerken'] },
    { id: 'closeout', label: 'Oplevering / cleanup', weeks: 1, packages: [] }
  ];

  function activeTypes(ledger) {
    var set = {};
    (ledger.entries || []).forEach(function (e) {
      if (e.status === 'OK' && e.estimate && !(e.adjusted && e.adjusted.suppressed)) {
        set[e.packageType] = true;
      } else if (e.status === 'NEEDS_MORE_INFORMATION') {
        set[e.packageType] = true; // still occupies schedule uncertainty
      }
    });
    return set;
  }

  /**
   * Market audit (Phase 4.5): suppressing Isolatie in € must NOT drop calendar time.
   * Roof/ETICS ownership still consumes drying, weather and finishing weeks.
   */
  function ownedInsulationWeeks(ledger) {
    var weeks = 0;
    (ledger.entries || []).forEach(function (e) {
      if (e.packageType !== 'isolatie') return;
      if (e.adjusted && e.adjusted.suppressed) weeks += 1.5;
    });
    return weeks;
  }

  function estimateDuration(ledger, calc2State) {
    var active = activeTypes(ledger);
    var count = Object.keys(active).length;
    if (count === 0) {
      return {
        minWeeks: 0,
        expectedWeeks: 0,
        maxWeeks: 0,
        explanation: 'Geen actieve pakketten.',
        phases: []
      };
    }

    var usedPhases = [];
    var base = 0;
    PHASES.forEach(function (ph) {
      var hit = ph.packages.length === 0
        ? (count >= 3 && (ph.id === 'prep' || ph.id === 'closeout'))
        : ph.packages.some(function (p) { return active[p]; });
      if (!hit) return;
      var w = ph.weeks;
      // Complex multi-trade: Belgian prep (quotes, asbestos/EPB, lead times) > 1 week
      if (ph.id === 'prep' && count >= 5) w += 2;
      else if (ph.id === 'prep' && count >= 3) w += 1;
      // Chape / wet finishing drying often understated in pure phase sums
      if (ph.id === 'floors' && (active.badkamer || active.keuken)) w += 1;
      usedPhases.push({ id: ph.id, label: ph.label, weeks: w });
      base += w;
    });

    var ownedIso = ownedInsulationWeeks(ledger);
    if (ownedIso > 0) {
      usedPhases.push({
        id: 'insulation_owned',
        label: 'Isolatie (meegenomen in dak/gevel, duur behouden)',
        weeks: ownedIso
      });
      base += ownedIso;
    }

    // Parallel credit for exterior cluster
    if (active.dak && active.gevel && active.ramen) base *= 0.88;
    else if ((active.dak && active.gevel) || (active.gevel && active.ramen)) base *= 0.92;

    // Complexity wideners
    var complexity = 1;
    if (count >= 8) complexity = 1.25;
    else if (count >= 5) complexity = 1.15;
    if (calc2State && calc2State.propertyProfile && calc2State.propertyProfile.occupiedDuringWorks === 'ja') {
      complexity *= 1.15;
    }
    if ((ledger.nmiKeys || []).length) complexity *= 1.1;
    var profile = (calc2State && calc2State.propertyProfile) || {};
    if (profile.condition === 'zwaar' || profile.condition === 'verouderd') {
      complexity *= 1.08;
    }

    var expected = Math.max(2, Math.round(base * complexity));
    var minW = Math.max(1, Math.round(expected * 0.75));
    var maxW = Math.max(expected + 1, Math.round(expected * 1.4));

    return {
      minWeeks: minW,
      expectedWeeks: expected,
      maxWeeks: maxW,
      explanation: 'Indicatieve uitvoeringsvenster (incl. beperkte prep/droogtijden), geen som van Calc1 workDays; vergunning/lange lead times kunnen langer lopen.',
      phases: usedPhases,
      activePackageTypes: Object.keys(active)
    };
  }

  return {
    PHASES: PHASES,
    estimateDuration: estimateDuration
  };
});
