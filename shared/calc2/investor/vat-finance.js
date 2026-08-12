/* ============================================================
   ELYAN Calc2 Investor. VAT cash layer (Phase 5)
   Does not invent a single national VAT rate.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2VatFinance = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  /**
   * Resolve renovation cash VAT for investment economics.
   * renovationInput amounts are excl. VAT from Calc2.
   */
  function resolveVat(renovationInput, opts) {
    opts = opts || {};
    renovationInput = renovationInput || {};
    var works = Number(renovationInput.worksExpected) || 0;
    var soft = Number(renovationInput.softCostsExpected) || 0;
    var proc = Number(renovationInput.procurementCostsExpected) || 0;
    var reserve = Number(renovationInput.reserveExpected) || 0;
    var mode = opts.mode || 'indicative_mixed';

    /* Audit 5.5: default works VAT = 21% until user confirms 6% eligibility (flip-safe). */
    var worksRateConservative = 0.21;
    var worksRateExpected = opts.worksVatRate != null ? Number(opts.worksVatRate) : 0.21;
    var softRate = opts.softVatRate != null ? Number(opts.softVatRate) : 0.21;
    var procRate = opts.procurementVatRate != null ? Number(opts.procurementVatRate) : 0.21;
    var reserveRate = opts.reserveVatRate != null ? Number(opts.reserveVatRate) : worksRateExpected;
    var sixConfirmed = opts.worksSixPercentConfirmed === true;

    var result = {
      mode: mode,
      presentation: null,
      worksExVat: round50(works),
      softExVat: round50(soft),
      procurementExVat: round50(proc),
      reserveExVat: round50(reserve),
      vatOnWorks: 0,
      vatOnSoft: 0,
      vatOnProcurement: 0,
      vatOnReserve: 0,
      totalVat: 0,
      renovationCashInclVat: 0,
      confidence: 'low',
      sourceType: 'ELYAN_MODEL_ASSUMPTION',
      explanation: '',
      rates: {
        worksExpected: worksRateExpected,
        worksConservative: worksRateConservative,
        soft: softRate,
        procurement: procRate,
        reserve: reserveRate
      }
    };

    if (mode === 'excl_cash' || mode === 'EXCL_VAT') {
      result.presentation = 'EXCL_VAT';
      result.renovationCashInclVat = round50(works + soft + proc + reserve);
      result.totalVat = 0;
      result.confidence = 'medium';
      result.explanation = 'Cash model excl. btw, alleen bruikbaar als btw volledig terugvorderbaar of buiten scope. Niet default voor private flip.';
      result.sourceType = 'USER_ASSUMPTION';
      return result;
    }

    if (mode === 'user_confirmed' || mode === 'USER_CONFIRMED_VAT') {
      var userVat = Number(opts.userVatAmount);
      if (!isFinite(userVat) || userVat < 0) {
        result.presentation = 'UNRESOLVED';
        result.confidence = 'low';
        result.explanation = 'USER_CONFIRMED_VAT gekozen zonder geldig btw-bedrag.';
        result.renovationCashInclVat = round50(works + soft + proc + reserve);
        return result;
      }
      result.presentation = 'USER_CONFIRMED_VAT';
      result.totalVat = round50(userVat);
      result.renovationCashInclVat = round50(works + soft + proc + reserve + userVat);
      result.confidence = 'high';
      result.sourceType = 'USER_ASSUMPTION';
      result.explanation = 'Gebruiker bevestigde totale btw-cashout op renovatieposten.';
      return result;
    }

    /* indicative mixed — default 21% on works unless 6% explicitly confirmed */
    var useConservative = opts.scenario === 'conservative';
    var requestedWorks = isFinite(worksRateExpected) && worksRateExpected >= 0 ? worksRateExpected : 0.21;
    /* Flip-safe: never apply <21% without explicit eligibility confirmation (even if worksVatRate=0.06) */
    var wRate = 0.21;
    if (!useConservative && sixConfirmed && requestedWorks <= 0.06) {
      wRate = 0.06;
    } else if (!useConservative && sixConfirmed && requestedWorks > 0) {
      wRate = requestedWorks;
    }
    result.vatOnWorks = round50(works * wRate);
    result.vatOnSoft = round50(soft * softRate);
    result.vatOnProcurement = round50(proc * procRate);
    result.vatOnReserve = round50(reserve * (useConservative ? worksRateConservative : Math.max(wRate, reserveRate)));
    result.totalVat = round50(
      result.vatOnWorks + result.vatOnSoft + result.vatOnProcurement + result.vatOnReserve
    );
    result.renovationCashInclVat = round50(works + soft + proc + reserve + result.totalVat);
    result.presentation = 'INDICATIVE_MIXED_VAT';
    result.confidence = sixConfirmed || (opts.worksVatRate != null) ? 'medium' : 'low';
    result.sourceType = 'ELYAN_MODEL_ASSUMPTION';
    result.explanation =
      'Indicatief mixed: werken @ ' + Math.round(wRate * 100) + '%, soft/procurement @ 21%. ' +
      'FOD: 6% enkel bij woning ≥10j, hoofdzakelijk privé na werken, factuur aan eindgebruiker. ' +
      'Default investor-cash = 21% tot je 6%-voorwaarden bevestigt. Soft/architect/engineering/procurement blijven 21%.';
    result.rates.worksApplied = wRate;
    return result;
  }

  return {
    resolveVat: resolveVat
  };
});
