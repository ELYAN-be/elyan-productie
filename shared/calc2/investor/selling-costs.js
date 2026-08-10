/* ============================================================
   ELYAN Calc2 Investor — Selling costs (Phase 5)
   Convention: selling costs deducted from gross resale (not in TI).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2SellingCosts = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  /* MARKET_BENCHMARK — BIV: no fixed tariff; observed 2–4% excl. 21% VAT */
  var AGENT_BENCHMARK = {
    lowExVat: 0.02,
    expectedExVat: 0.03,
    highExVat: 0.04,
    vatRate: 0.21,
    source: 'https://www.biv.be/kb/het-beroep/tarieven-en-erelonen/het-ereloon-van-de-vastgoedmakelaar',
    note: 'Geen wettelijk tarief (BIV). Marktband ca. 2–4% excl. 21% btw; default 3% excl. btw.'
  };

  function buildSellingCosts(opts) {
    opts = opts || {};
    var grossResale = Math.max(0, Number(opts.grossResale) || 0);
    var mode = opts.mode || 'unknown';
    var other = Number(opts.otherSellingCosts) || 0;
    var certificates = Number(opts.certificatesCosts) || 0;

    var agentExVat = 0;
    var agentInclVat = 0;
    var rateUsed = null;
    var sourceType = 'NOT_APPLICABLE';
    var confidence = 'high';
    var explanation = 'Geen makelaar gemodelleerd.';

    if (mode === 'agent') {
      rateUsed = opts.agentRateExVat != null
        ? Number(opts.agentRateExVat)
        : AGENT_BENCHMARK.expectedExVat;
      agentExVat = grossResale * rateUsed;
      agentInclVat = agentExVat * (1 + AGENT_BENCHMARK.vatRate);
      sourceType = opts.agentRateExVat != null ? 'USER_ASSUMPTION' : 'MARKET_BENCHMARK';
      confidence = opts.agentRateExVat != null ? 'medium' : 'low';
      explanation = AGENT_BENCHMARK.note + ' Toegepast: ' + (rateUsed * 100).toFixed(1) + '% excl. btw + 21% btw.';
    } else if (mode === 'self') {
      explanation = 'Zelf verkopen — geen makelaarscommissie. Eventuele marketing/attesten apart.';
      sourceType = 'USER_ASSUMPTION';
      confidence = 'medium';
    } else {
      explanation = 'Verkoopkanaal onbekend — makelaarskosten niet meegenomen; confidence verlaagd.';
      sourceType = 'UNRESOLVED';
      confidence = 'low';
    }

    var total = agentInclVat + other + certificates;

    return {
      mode: mode,
      grossResale: round50(grossResale),
      agentCommission: {
        id: 'agent_commission',
        label: 'Makelaarscommissie (incl. btw)',
        low: mode === 'agent' ? round50(grossResale * AGENT_BENCHMARK.lowExVat * 1.21) : 0,
        expected: round50(agentInclVat),
        high: mode === 'agent' ? round50(grossResale * AGENT_BENCHMARK.highExVat * 1.21) : 0,
        rateExVat: rateUsed,
        sourceType: sourceType,
        confidence: confidence,
        source: AGENT_BENCHMARK.source,
        explanation: explanation,
        userOverride: opts.agentRateExVat != null
      },
      certificates: {
        id: 'sale_certificates',
        label: 'Attesten / dossierkosten',
        expected: round50(certificates),
        sourceType: certificates ? 'USER_ASSUMPTION' : 'NOT_APPLICABLE'
      },
      otherSellingCosts: {
        id: 'other_selling',
        label: 'Andere verkoopkosten',
        expected: round50(other),
        sourceType: other ? 'USER_ASSUMPTION' : 'NOT_APPLICABLE'
      },
      totalSellingCosts: {
        low: round50((mode === 'agent' ? grossResale * AGENT_BENCHMARK.lowExVat * 1.21 : 0) + other + certificates),
        expected: round50(total),
        high: round50((mode === 'agent' ? grossResale * AGENT_BENCHMARK.highExVat * 1.21 : 0) + other + certificates)
      },
      variableWithResale: mode === 'agent',
      accountingNote: 'Verkoopkosten worden afgetrokken van bruto verkoopopbrengst (niet in totale investering).'
    };
  }

  /** Net proceeds given gross resale and selling opts (rate may depend on gross). */
  function netProceeds(grossResale, sellingOpts) {
    var sc = buildSellingCosts(Object.assign({}, sellingOpts || {}, { grossResale: grossResale }));
    return {
      gross: round50(grossResale),
      selling: sc.totalSellingCosts.expected,
      net: round50(grossResale - sc.totalSellingCosts.expected),
      detail: sc
    };
  }

  /**
   * Invert: find gross R such that R - selling(R) = targetNet.
   * For % agent: R * (1 - rateIncl) - fixed = targetNet
   */
  function grossForTargetNet(targetNet, sellingOpts) {
    sellingOpts = sellingOpts || {};
    var fixed = (Number(sellingOpts.otherSellingCosts) || 0) + (Number(sellingOpts.certificatesCosts) || 0);
    if (sellingOpts.mode !== 'agent') {
      return round50(Math.max(0, targetNet + fixed));
    }
    var rateEx = sellingOpts.agentRateExVat != null
      ? Number(sellingOpts.agentRateExVat)
      : AGENT_BENCHMARK.expectedExVat;
    var rateIncl = rateEx * (1 + AGENT_BENCHMARK.vatRate);
    if (rateIncl >= 1) return null;
    return round50((targetNet + fixed) / (1 - rateIncl));
  }

  return {
    AGENT_BENCHMARK: AGENT_BENCHMARK,
    buildSellingCosts: buildSellingCosts,
    netProceeds: netProceeds,
    grossForTargetNet: grossForTargetNet
  };
});
