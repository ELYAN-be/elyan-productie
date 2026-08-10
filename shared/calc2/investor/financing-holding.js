/* ============================================================
   ELYAN Calc2 Investor — Financing + holding costs (Phase 5)
   Simple transparent holding model — no opaque amortisation.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2FinancingHolding = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  function buildFinancingCosts(opts) {
    opts = opts || {};
    var mode = opts.mode || 'unknown';
    var loan = Math.max(0, Number(opts.loanAmount) || 0);
    var rate = Number(opts.interestRate);
    if (!isFinite(rate)) rate = null;
    var months = Math.max(0, Number(opts.holdingMonths) || 0);
    var oneTime = Number(opts.oneTimeCosts) || 0;

    var interest = 0;
    var confidence = 'medium';
    var explanation = '';
    var sourceType = 'USER_ASSUMPTION';

    if (mode === 'cash' || mode === 'own_funds') {
      explanation = 'Enkel eigen middelen — geen rente gemodelleerd.';
      confidence = 'high';
      sourceType = 'USER_ASSUMPTION';
      loan = 0;
    } else if (mode === 'unknown') {
      explanation = 'Financiering nog onbekend — rente/setup niet meegenomen; financial confidence verlaagd.';
      confidence = 'low';
      sourceType = 'UNRESOLVED';
    } else if ((mode === 'mortgage' || mode === 'mixed') && loan > 0) {
      if (rate == null || months <= 0) {
        explanation = 'Lening bekend maar rente en/of holdingperiode ontbreekt — rente = €0 tot aangevuld.';
        confidence = 'low';
        sourceType = 'UNRESOLVED';
      } else {
        /* Estimated interest expense during hold — NOT full loan cashflow */
        interest = loan * (rate / 100) * (months / 12);
        explanation =
          'Geschatte rente-uitgave tijdens holdingperiode: lening × jaarlijkse rente% × (maanden/12). ' +
          'Dit is géén amortiserend leningsschema, géén interest-only cashflow-model, en géén equity-ROI. ' +
          'Aflossing van kapitaal zit niet in de projectkost (blijft schuld/equity-shift).';
        confidence = 'medium';
        sourceType = 'ELYAN_MODEL_ASSUMPTION';
      }
    } else {
      explanation = 'Financieringsmodus zonder bruikbaar leenbedrag.';
      confidence = 'low';
    }

    var total = interest + oneTime;
    return {
      mode: mode,
      loanAmount: round50(loan),
      interestRatePercent: rate,
      holdingMonths: months,
      interestDuringHold: {
        id: 'financing_interest',
        label: 'Geschatte rente-uitgave tijdens holding (geen lening-cashflow)',
        expected: round50(interest),
        sourceType: sourceType,
        confidence: confidence,
        explanation: explanation
      },
      oneTimeCosts: {
        id: 'financing_onetime',
        label: 'Eenmalige financieringskosten (bank)',
        expected: round50(oneTime),
        sourceType: oneTime ? 'USER_ASSUMPTION' : 'NOT_APPLICABLE'
      },
      totalFinancingCosts: {
        expected: round50(total),
        low: round50(total),
        high: round50(total * 1.1)
      }
    };
  }

  function buildHoldingCosts(opts) {
    opts = opts || {};
    var months = Math.max(0, Number(opts.holdingMonths) || 0);
    var monthly =
      opts.monthlyTotal != null && opts.monthlyTotal !== ''
        ? Number(opts.monthlyTotal)
        : null;

    var propertyTaxAnnual = Number(opts.propertyTaxAnnual) || 0;
    var insuranceMonthly = Number(opts.insuranceMonthly) || 0;
    var utilitiesMonthly = Number(opts.utilitiesMonthly) || 0;
    var otherMonthly = Number(opts.otherMonthly) || 0;

    var derivedMonthly = null;
    if (monthly == null || !isFinite(monthly)) {
      derivedMonthly =
        insuranceMonthly + utilitiesMonthly + otherMonthly +
        (propertyTaxAnnual > 0 ? propertyTaxAnnual / 12 : 0);
      monthly = derivedMonthly;
    }

    var total = monthly * months;
    var complete = months > 0 && (monthly > 0 || opts.explicitZero === true);
    var confidence = 'medium';
    var explanation = '';

    if (months <= 0) {
      confidence = 'low';
      explanation = 'Holdingperiode ontbreekt — holdingkosten = €0.';
    } else if (!complete && monthly === 0) {
      confidence = 'low';
      explanation = 'Geen holdingkosten ingevoerd — €0 gemodelleerd (kan onderschatten).';
    } else {
      explanation = 'Holding = maandelijks × maanden. Geen universeel Belgisch forfait.';
      confidence = opts.monthlyTotal != null ? 'medium' : 'low';
    }

    return {
      holdingMonths: months,
      monthlyHolding: {
        id: 'monthly_holding',
        label: 'Maandelijkse holdingkosten',
        expected: round50(monthly || 0),
        sourceType: opts.monthlyTotal != null ? 'USER_ASSUMPTION' : 'ELYAN_MODEL_ASSUMPTION',
        confidence: confidence,
        explanation: explanation,
        components: {
          propertyTaxAnnual: propertyTaxAnnual,
          insuranceMonthly: insuranceMonthly,
          utilitiesMonthly: utilitiesMonthly,
          otherMonthly: otherMonthly
        }
      },
      totalHoldingCosts: {
        expected: round50(total),
        low: round50(total),
        high: round50(total * 1.15)
      }
    };
  }

  return {
    buildFinancingCosts: buildFinancingCosts,
    buildHoldingCosts: buildHoldingCosts
  };
});
