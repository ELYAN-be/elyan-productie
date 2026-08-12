/* ============================================================
   ELYAN Calc2. Project uncertainty & recommended reserve
   Does NOT stack Calc1 package contingency advisories.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./project-ledger') : null
    );
  } else {
    root.ElyanCalc2Uncertainty = factory(root.ElyanCalc2ProjectLedger);
  }
})(typeof self !== 'undefined' ? self : this, function (Ledger) {
  'use strict';

  function round50(n) {
    return Ledger && Ledger.round50 ? Ledger.round50(n) : Math.round(Number(n) / 50) * 50;
  }

  /**
   * Calc1 audit (documented for callers):
   * - price/low/high = mat+labour+other ONLY (excl VAT)
   * - contingency = SEPARATE advisory % of price, NOT included in price
   * - package low/high already widen trade uncertainty
   * Therefore project reserve covers ONLY interaction / incomplete-info risks
   * not already expressed as trade bands. We do NOT add calc1Meta.contingency.
   */

  var RESERVE_BANDS = {
    /* MODEL_ASSUMPTION — project interaction reserve, not a market €/m² */
    LOW: { low: 0.04, expected: 0.06, high: 0.08 },
    MEDIUM: { low: 0.07, expected: 0.10, high: 0.14 },
    /* Raised HIGH expected for older/heavy interaction risk (package bands still carry trade uncertainty) */
    HIGH: { low: 0.12, expected: 0.16, high: 0.22 },
    INSUFFICIENT_INFORMATION: { low: 0, expected: 0, high: 0 }
  };

  function classifyProject(ledger, calc2State, reconciliation) {
    var nmi = (ledger.nmiKeys || []).length;
    var ok = ledger.raw.packageCount;
    var profile = (calc2State && calc2State.propertyProfile) || {};
    var risks = [];
    var score = 0;

    if (nmi > 0) {
      score += 3 + Math.min(3, nmi);
      risks.push('Nog onvoldoende info bij: ' + ledger.nmiKeys.join(', '));
    }
    if (ok >= 8) score += 2;
    else if (ok >= 5) score += 1;

    if (profile.condition === 'zwaar' || profile.condition === 'verouderd') {
      score += 1;
      risks.push('Property condition: ' + profile.condition);
    }
    if (profile.yearBuilt === 'voor_1950' || profile.yearBuilt === '1950_1970' || profile.yearBuilt === 'weet_niet') {
      score += 1;
      risks.push('Building age uncertainty / older stock');
    }
    if (profile.occupiedDuringWorks === 'ja') {
      score += 1;
      risks.push('Occupied during works');
    }
    if (calc2State && calc2State.structuralRisk === 'ja') {
      score += 2;
      risks.push('Structureel risico aangegeven, hogere projectreserve');
    }
    if (profile.yearBuilt === 'voor_1950' && (profile.condition === 'zwaar' || profile.condition === 'verouderd')) {
      score += 1;
      risks.push('Oude zware woning, projectreserve verhoogd');
    }

    var unresolvedWarnings = (reconciliation.warnings || []).filter(function (w) {
      return /unresolved|overlap/i.test(w.code || '');
    });
    score += Math.min(2, unresolvedWarnings.length);

    var hasExterior = ledger.entries.some(function (e) {
      return hasOk(e) && (e.packageType === 'dak' || e.packageType === 'gevel' || e.packageType === 'ramen');
    });
    var hasDeepEnergy = ledger.entries.some(function (e) {
      return hasOk(e) && (e.packageType === 'isolatie' || e.packageType === 'ventilatie' || e.packageType === 'verwarming');
    });
    if (hasExterior && hasDeepEnergy) {
      score += 1;
      risks.push('Deep energy / envelope interaction');
    }

    var packageConfidence = summarizePackageConfidence(ledger);

    var className;
    /* Incomplete packages raise risk — do NOT zero reserve while priced OK works remain */
    if (nmi > 0 && nmi >= Math.max(1, Math.ceil(ok * 0.35))) {
      className = ok > 0 ? 'HIGH' : 'INSUFFICIENT_INFORMATION';
      if (ok > 0) risks.push('Hoge NMI-ratio, reserve verhoogd (HIGH), niet op €0 gezet.');
    } else if (score >= 7) className = 'HIGH';
    else if (score >= 3) className = 'MEDIUM';
    else className = 'LOW';

    return {
      className: className,
      score: score,
      risks: risks,
      packageConfidence: packageConfidence,
      nmiCount: nmi,
      okCount: ok
    };
  }

  function hasOk(e) {
    return e && e.status === 'OK' && e.estimate && !(e.adjusted && e.adjusted.suppressed);
  }

  function summarizePackageConfidence(ledger) {
    var counts = { HIGH: 0, MEDIUM: 0, LOW: 0, NEEDS_MORE_INFORMATION: 0 };
    ledger.entries.forEach(function (e) {
      if (e.status === 'SKIPPED') return;
      var c = e.confidence || e.status;
      if (counts[c] == null) counts[c] = 0;
      counts[c]++;
    });
    return counts;
  }

  function buildUncertainty(ledger, calc2State, reconciliation, worksExpected) {
    var cls = classifyProject(ledger, calc2State, reconciliation);
    var band = RESERVE_BANDS[cls.className] || RESERVE_BANDS.MEDIUM;
    var base = Math.max(0, worksExpected || 0);

    var contingencyLow = round50(base * band.low);
    var contingencyExpected = round50(base * band.expected);
    var contingencyHigh = round50(base * band.high);

    var unresolvedUnknowns = [];
    ledger.entries.forEach(function (e) {
      (e.unknowns || []).forEach(function (u) {
        unresolvedUnknowns.push(e.key + ':' + u);
      });
    });
    (reconciliation.warnings || []).forEach(function (w) {
      if (/unresolved/i.test(w.code || '')) unresolvedUnknowns.push(w.code);
    });

    return {
      packageConfidence: cls.packageConfidence,
      projectConfidence: cls.className,
      projectRiskScore: cls.score,
      riskDrivers: cls.risks,
      unresolvedUnknowns: unresolvedUnknowns,
      contingencyLow: contingencyLow,
      contingencyExpected: contingencyExpected,
      contingencyHigh: contingencyHigh,
      recommendedReserve: contingencyExpected,
      reserveBands: band,
      reserveKind: 'MODEL_ASSUMPTION',
      reserveReason: 'Project interaction / incomplete-info reserve. Calc1 package contingency advisories are NOT summed. Package low/high trade bands remain in works range.',
      calc1ContingencyPolicy: 'IGNORED_FOR_STACKING. Calc1 contingency is advisory and excluded from Calc1 price; Calc2 does not add those advisories into works or reserve.',
      documentation: {
        calc1PriceIncludesContingency: false,
        calc1PriceIncludesVat: false,
        projectReserveIsSeparate: true
      }
    };
  }

  return {
    RESERVE_BANDS: RESERVE_BANDS,
    classifyProject: classifyProject,
    buildUncertainty: buildUncertainty
  };
});
