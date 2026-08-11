/* ============================================================
   ELYAN Calc2 — Project engine orchestrator
   Phase 4.6: works → reconcile → reserve → all-in soft/procurement
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./package-engine'),
      require('./project-ledger'),
      require('./reconciliation'),
      require('./project-costs'),
      require('./uncertainty'),
      require('./sequencing'),
      require('./investor-readiness')
    );
  } else {
    root.ElyanCalc2ProjectEngine = factory(
      root.ElyanCalc2PackageEngine,
      root.ElyanCalc2ProjectLedger,
      root.ElyanCalc2Reconciliation,
      root.ElyanCalc2ProjectCosts,
      root.ElyanCalc2Uncertainty,
      root.ElyanCalc2Sequencing,
      root.ElyanCalc2InvestorReadiness
    );
  }
})(typeof self !== 'undefined' ? self : this, function (
  PackageEngine,
  Ledger,
  Reconciliation,
  ProjectCosts,
  Uncertainty,
  Sequencing,
  InvestorReadiness
) {
  'use strict';

  function round50(n) {
    return Ledger.round50(n);
  }

  function calculateProject(calc2State, options) {
    options = options || {};
    if (!PackageEngine || !Ledger || !Reconciliation) {
      throw new Error('[ELYAN Calc2] project-engine missing dependencies');
    }

    var packageBundle = PackageEngine.priceActivePackages(calc2State, {
      includeRawSum: true,
      includeCalc1Snapshot: !!options.includeCalc1Snapshot
    });

    var ledger = Ledger.buildLedger(packageBundle);
    var reconciliation = Reconciliation.reconcile(ledger);

    var uncertainty = Uncertainty.buildUncertainty(
      ledger,
      calc2State,
      reconciliation,
      reconciliation.reconciledExpected
    );

    var nmiCount = ledger.nmiKeys.length;
    var okCount = ledger.raw.packageCount;
    var packageStatus = 'COMPLETE';
    if (okCount === 0 && nmiCount === 0) packageStatus = 'EMPTY';
    else if (nmiCount > 0) packageStatus = 'PARTIAL_ESTIMATE';

    var reserveExpected = packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0
      ? 0
      : uncertainty.recommendedReserve;
    var reserveLow = packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0 ? 0 : uncertainty.contingencyLow;
    var reserveHigh = packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0 ? 0 : uncertainty.contingencyHigh;

    if (uncertainty.projectConfidence === 'INSUFFICIENT_INFORMATION' && okCount === 0) {
      reserveExpected = 0;
      reserveLow = 0;
      reserveHigh = 0;
    }

    var worksBands = {
      low: reconciliation.reconciledLow,
      expected: reconciliation.reconciledExpected,
      high: reconciliation.reconciledHigh
    };
    var reserveBands = {
      low: reserveLow,
      expected: reserveExpected,
      high: reserveHigh
    };

    var projectCosts = ProjectCosts.buildProjectCosts(
      ledger,
      reconciliation,
      calc2State,
      worksBands,
      reserveBands
    );

    var allIn = projectCosts.allIn;
    var softExpected = allIn ? allIn.softTotals.expected : 0;
    var procExpected = allIn ? allIn.procurementTotals.expected : projectCosts.totals.expected;
    var projectLayerExpected = allIn
      ? round50(softExpected + procExpected)
      : projectCosts.totals.expected;

    var budgetLow;
    var budgetExpected;
    var budgetHigh;
    if (allIn && allIn.recommendedBudget) {
      budgetLow = allIn.recommendedBudget.low;
      budgetExpected = allIn.recommendedBudget.expected;
      budgetHigh = allIn.recommendedBudget.high;
    } else {
      budgetLow = round50(worksBands.low + projectCosts.totals.low + reserveLow);
      budgetExpected = round50(worksBands.expected + projectCosts.totals.expected + reserveExpected);
      budgetHigh = round50(worksBands.high + projectCosts.totals.high + reserveHigh);
    }

    if (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0)) {
      budgetLow = 0;
      budgetExpected = 0;
      budgetHigh = 0;
    }

    if (budgetLow > budgetExpected) budgetLow = round50(budgetExpected * 0.92);
    if (budgetHigh < budgetExpected) budgetHigh = round50(budgetExpected * 1.12);

    var duration = Sequencing.estimateDuration(ledger, calc2State);

    var assumptions = [];
    var risks = (uncertainty.riskDrivers || []).slice();
    var warnings = []
      .concat(reconciliation.warnings || [])
      .concat(projectCosts.warnings || []);

    ledger.entries.forEach(function (e) {
      (e.assumptions || []).slice(0, 3).forEach(function (a) {
        assumptions.push(e.key + ': ' + a);
      });
    });

    if (packageStatus === 'PARTIAL_ESTIMATE') {
      warnings.push({
        code: 'partial_estimate',
        note: 'Gedeeltelijke raming: het getoonde bedrag geldt alleen voor onderdelen met voldoende informatie — geen volledig woningrenovatiebudget.'
      });
      risks.push('Gedeeltelijke raming — nog onvoldoende info bij sommige onderdelen');
    }

    if (allIn && allIn.allInStatus === 'ALL_IN_INDICATIVE') {
      warnings.push({
        code: 'all_in_indicative',
        note: 'Projectbudget is indicatief; structurele, vergunnings- of coördinatiekosten zijn nog niet volledig bepaald of berusten op Indicatieve banden.'
      });
    }

    var siteUnresolved = (reconciliation.warnings || []).some(function (w) {
      return w && (w.code === 'mobilisation_unresolved' || w.code === 'waste_logistics_unresolved');
    });
    if (siteUnresolved) {
      warnings.push({
        code: 'site_costs_incomplete',
        note: 'Werfinrichting / containerlogistiek / mobilisatie op projectniveau zijn niet als vaste forfait meegerekend — vraag dit expliciet in offertes. Dit budget is daardoor geen complete werfinrichting.'
      });
      if (exclusions && exclusions.body && exclusions.body.indexOf('werfinrichting') === -1) {
        exclusions = {
          title: exclusions.title,
          body: exclusions.body + ' Project-niveau werfinrichting, containerlogistiek en mobilisatie zijn niet als vaste forfait meegerekend.'
        };
      }
    }

    var pricedPackages = [];
    var unpricedPackages = [];
    ledger.entries.forEach(function (e) {
      if (e.status === 'SKIPPED') return;
      var label = e.instanceLabel || e.key;
      if (e.status === 'OK' && e.estimate && !(e.adjusted && e.adjusted.suppressed)) {
        pricedPackages.push({ key: e.key, label: label, expected: e.estimate.expected });
      } else if (e.status === 'NEEDS_MORE_INFORMATION' || e.status === 'NMI') {
        unpricedPackages.push({ key: e.key, label: label, reason: 'Nog onvoldoende informatie' });
      } else if (e.adjusted && e.adjusted.suppressed) {
        unpricedPackages.push({ key: e.key, label: label, reason: 'Meegenomen elders / onderdrukt' });
      }
    });

    var areaM2 = Number((calc2State.propertyProfile || {}).areaM2) || 0;
    var recForFlag = (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0))
      ? 0
      : budgetExpected;
    var eurPerM2 = areaM2 > 0 && recForFlag > 0 ? Math.round(recForFlag / areaM2) : null;
    var marketPositionNote = null;
    if (eurPerM2 != null && eurPerM2 >= 2200) {
      marketPositionNote =
        'Deze raming ligt aan de bovenkant van de markt door de combinatie van gekozen werken, afwerking en woningkenmerken.';
      risks.push(marketPositionNote);
    }

    var LabelsMod = null;
    try {
      LabelsMod = typeof require !== 'undefined' ? require('./result-labels') : null;
    } catch (eLab) { LabelsMod = null; }
    var exclusions = LabelsMod && LabelsMod.exclusionsCopy
      ? LabelsMod.exclusionsCopy()
      : {
        title: 'Niet automatisch inbegrepen',
        body: 'Niet automatisch inbegrepen: zonnepanelen, structurele herstelwerken, pleisterwerken, trappen, bepaalde rioleringswerken en buitenaanleg, volledige chape waar niet expliciet gemodelleerd, en bepaalde binnendeuren.'
      };

    if (reconciliation.deductionPctOfRaw > 20) {
      warnings.push({
        code: 'high_reconciliation_pct',
        note: 'Grote overlapaftrek (' + reconciliation.deductionPctOfRaw + '% van de ruwe som) — controleer of de scope niet dubbel telt.'
      });
    }

    var rawExpected = ledger.raw.expected;
    var reconciledWorks = reconciliation.reconciledExpected;
    var deltaPct = rawExpected > 0
      ? Math.round(((reconciledWorks - rawExpected) / rawExpected) * 1000) / 10
      : 0;

    var allInStatus = allIn ? allIn.allInStatus : packageStatus;
    if (packageStatus === 'EMPTY') allInStatus = 'INSUFFICIENT_INFORMATION';
    else if (packageStatus === 'PARTIAL_ESTIMATE') allInStatus = 'PARTIAL_ESTIMATE';

    var vatSummary = allIn && allIn.vatSummary
      ? allIn.vatSummary
      : {
        presentation: 'excl_vat',
        note: 'Projectbedragen zijn excl. btw. Het uiteindelijke btw-tarief kan per post verschillen.'
      };

    var result = {
      status: packageStatus,
      allInStatus: allInStatus,
      vatBasis: 'excl_vat',
      vatNote: vatSummary.note,
      vatSummary: vatSummary,
      allInCosts: allIn || null,
      rawPackages: ledger.entries,
      reconciliation: {
        rawLow: ledger.raw.low,
        rawExpected: ledger.raw.expected,
        rawHigh: ledger.raw.high,
        overlapAdjustments: reconciliation.adjustments.filter(function (a) {
          return a.type === 'shared_cost' || a.type === 'scope_overlap';
        }),
        scopeSuppressions: reconciliation.scopeSuppressions,
        allAdjustments: reconciliation.adjustments,
        projectCosts: projectCosts.items,
        projectCostHooks: projectCosts.hooks,
        reconciledLow: reconciliation.reconciledLow,
        reconciledExpected: reconciliation.reconciledExpected,
        reconciledHigh: reconciliation.reconciledHigh,
        deductionPctOfRaw: reconciliation.deductionPctOfRaw,
        rawVsReconciledPct: deltaPct
      },
      uncertainty: uncertainty,
      budget: {
        worksExpected: round50(reconciliation.reconciledExpected),
        softCostsExpected: allIn ? allIn.softTotals.expected : 0,
        procurementCostsExpected: allIn ? allIn.procurementTotals.expected : 0,
        projectCostsExpected: projectLayerExpected,
        reserveExpected: reserveExpected,
        recommendedExpected: (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0)) ? 0 : budgetExpected,
        low: (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0)) ? 0 : budgetLow,
        expected: (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0)) ? 0 : budgetExpected,
        high: (packageStatus === 'EMPTY' || (packageStatus === 'PARTIAL_ESTIMATE' && okCount === 0)) ? 0 : budgetHigh,
        worksLow: round50(reconciliation.reconciledLow),
        worksHigh: round50(reconciliation.reconciledHigh),
        authoritative: packageStatus === 'COMPLETE' && allInStatus === 'ALL_IN_COMPLETE',
        partial: packageStatus === 'PARTIAL_ESTIMATE',
        indicative: allInStatus === 'ALL_IN_INDICATIVE'
      },
      duration: duration,
      provisionalRiskRange: ledger.provisionalRisk,
      assumptions: assumptions,
      risks: risks,
      warnings: warnings,
      confidence: packageStatus === 'PARTIAL_ESTIMATE'
        ? 'PARTIAL'
        : (uncertainty.projectConfidence === 'INSUFFICIENT_INFORMATION'
          ? 'LOW'
          : uncertainty.projectConfidence),
      version: 'calc2-phase4.7-investor-readiness',
      packageBundleMeta: {
        version: packageBundle.version,
        overlapFlagCount: (packageBundle.projectOverlapFlags || []).length
      },
      presentation: {
        exclusions: exclusions,
        pricedPackages: pricedPackages,
        unpricedPackages: unpricedPackages,
        marketPositionNote: marketPositionNote,
        eurPerM2Budget: eurPerM2,
        siteCostsUnresolved: siteUnresolved,
        reserveLabel: 'Projectreserve voor onvoorziene posten',
        budgetScopeNote: 'Budget voor geselecteerde renovatiewerken + projectkosten — geen turnkey van elke denkbare kost.'
      }
    };

    if (InvestorReadiness && InvestorReadiness.evaluate) {
      result.investorReadiness = InvestorReadiness.evaluate(result, calc2State);
    } else {
      result.investorReadiness = {
        allowed: false,
        status: 'BLOCKED',
        reasons: ['Investor readiness module missing'],
        blockingItems: [],
        warnings: [],
        renovationInput: null
      };
    }
    return result;
  }

  return {
    calculateProject: calculateProject
  };
});
