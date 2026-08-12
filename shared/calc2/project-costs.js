/* ============================================================
   ELYAN Calc2. Project-level costs (Phase 4.6)
   Thin wrapper: scaffold note + delegates all-in soft/procurement.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./project-ledger') : null,
      typeof require !== 'undefined' ? require('./all-in-costs') : null
    );
  } else {
    root.ElyanCalc2ProjectCosts = factory(root.ElyanCalc2ProjectLedger, root.ElyanCalc2AllInCosts);
  }
})(typeof self !== 'undefined' ? self : this, function (Ledger, AllIn) {
  'use strict';

  function round50(n) {
    return Ledger && Ledger.round50 ? Ledger.round50(n) : Math.round(Number(n) / 50) * 50;
  }

  /**
   * Legacy-compatible project costs object used by project-engine.
   * Soft/procurement euros live in allIn; this totals included soft+procurement.
   */
  function buildProjectCosts(ledger, reconciliation, calc2State, worksBands, reserveBands) {
    var allIn = AllIn && AllIn.buildAllInCosts
      ? AllIn.buildAllInCosts(ledger, reconciliation, calc2State, worksBands, reserveBands)
      : null;

    var costs = [];
    var hooks = [];
    var warnings = [];

    var hasScaffoldAdj = (reconciliation.adjustments || []).some(function (a) {
      return a.costClass === 'scaffolding';
    });
    if (hasScaffoldAdj) {
      costs.push({
        id: 'scaffold_campaign_note',
        label: 'Steigercampagne (gedeeld)',
        low: 0,
        expected: 0,
        high: 0,
        kind: 'MODEL_ASSUMPTION',
        method: 'Already retained via MAX inside trade costs after shared-cost deduction',
        source: 'Calc1 scaffold components (dak/gevel/schilder)',
        vatBasis: 'excl_vat_same_as_calc1',
        note: '€0 add-on: grootste steiger blijft in trade totals; duplicaten zijn afgetrokken in reconciliation.'
      });
    }

    if (allIn) {
      (allIn.softCosts || []).forEach(function (l) {
        if (!l.included) {
          hooks.push({
            id: l.id,
            label: l.label,
            status: l.status,
            reason: l.applicability || l.explanation,
            applicability: l.applicability,
            recommendedHandling: l.userOverrideAllowed ? 'user_selectable' : 'warning_only'
          });
          return;
        }
        costs.push({
          id: l.id,
          label: l.label,
          low: l.low,
          expected: l.expected,
          high: l.high,
          kind: l.sourceType,
          confidence: l.confidence,
          vatBasis: l.vatTreatment,
          note: l.explanation,
          userOverridden: l.userOverridden
        });
      });
      (allIn.procurementCosts || []).forEach(function (l) {
        if (!l.included) {
          hooks.push({
            id: l.id,
            label: l.label,
            status: l.status,
            reason: l.applicability || l.explanation,
            applicability: l.applicability,
            recommendedHandling: 'user_selectable_procurement'
          });
          return;
        }
        costs.push({
          id: l.id,
          label: l.label,
          low: l.low,
          expected: l.expected,
          high: l.high,
          kind: l.sourceType,
          confidence: l.confidence,
          vatBasis: l.vatTreatment,
          note: l.explanation,
          userOverridden: l.userOverridden
        });
      });
      warnings = warnings.concat(allIn.warnings || []);
    }

    var occupied = calc2State && calc2State.propertyProfile
      && calc2State.propertyProfile.occupiedDuringWorks === 'ja';
    if (occupied) {
      warnings.push({
        code: 'occupied_renovation',
        note: 'Bewoonde renovatie kan planning/bescherming verhogen, geen aparte €-post toegevoegd zonder bron.'
      });
    }

    var sum = { low: 0, expected: 0, high: 0 };
    costs.forEach(function (c) {
      sum.low += c.low || 0;
      sum.expected += c.expected || 0;
      sum.high += c.high || 0;
    });

    return {
      items: costs,
      hooks: hooks,
      warnings: warnings,
      totals: {
        low: round50(sum.low),
        expected: round50(sum.expected),
        high: round50(sum.high)
      },
      allIn: allIn,
      documentation: {
        policy: 'All-in soft/procurement via all-in-costs.js; scaffold sharing in reconciliation only.',
        vat: 'All amounts excl. VAT; mixed VAT presented separately.'
      }
    };
  }

  return {
    buildProjectCosts: buildProjectCosts
  };
});
