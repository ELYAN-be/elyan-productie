/* ============================================================
   ELYAN Calc2. Investor readiness gate (Phase 4.7)
   Does NOT compute ROI / profit / max purchase.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./cost-resolution') : null
    );
  } else {
    root.ElyanCalc2InvestorReadiness = factory(root.ElyanCalc2CostResolution);
  }
})(typeof self !== 'undefined' ? self : this, function (CostRes) {
  'use strict';

  function assessHeavyGuard(calc2State, ledger) {
    var profile = (calc2State && calc2State.propertyProfile) || {};
    var scope = (calc2State && calc2State.scope) || {};
    var reasons = [];
    var score = 0;
    if (profile.yearBuilt === 'voor_1950') { score += 2; reasons.push('Pre-1950 woning'); }
    if (profile.condition === 'zwaar') { score += 2; reasons.push('Zware staat'); }
    if (calc2State.structuralRisk === 'weet_niet' || calc2State.structuralRisk === 'ja') {
      score += 2;
      reasons.push('Structureel risico onbekend of bevestigd');
    }
    var fullSchil = 0;
    ['dak', 'gevel', 'ramen', 'isolatie'].forEach(function (id) {
      if (scope[id] === 'volledig' || scope[id] === 'grondig') fullSchil++;
    });
    if (fullSchil >= 3) { score += 1; reasons.push('Uitgebreide schilwerken'); }
    var ok = 0;
    (ledger.entries || []).forEach(function (e) {
      if (e.status === 'OK') ok++;
    });
    if (ok >= 8) { score += 1; reasons.push('Near-complete scope'); }
    return {
      heavy: score >= 4,
      score: score,
      reasons: reasons,
      inspectionRecommended: score >= 4
    };
  }

  function vatStatusOf(project) {
    var vs = project.vatSummary || {};
    if (vs.presentation === 'excl_vat' && vs.classifications) {
      return {
        vatStatus: 'MIXED',
        note: 'Works potentially 6%; soft fees likely 21%. Finance module must resolve VAT before authoritative profit.',
        financeMustResolveVat: true
      };
    }
    return {
      vatStatus: 'PARTIALLY_KNOWN',
      note: vs.note || 'VAT mixed / not single-rate.',
      financeMustResolveVat: true
    };
  }

  function evaluate(project, calc2State) {
    calc2State = calc2State || {};
    var blocking = [];
    var warnings = [];
    var reasons = [];

    if (!project) {
      return {
        allowed: false,
        status: 'BLOCKED',
        reasons: ['Geen projectresultaat'],
        blockingItems: [{ id: 'project', label: 'Project', reason: 'Missing project' }],
        warnings: [],
        renovationInput: null,
        vat: { vatStatus: 'UNRESOLVED', financeMustResolveVat: true },
        heavyGuard: null,
        version: 'calc2-phase4.7-investor-readiness'
      };
    }

    var allIn = project.allInCosts;
    var ledger = { entries: project.rawPackages || [], nmiKeys: [] };
    (project.rawPackages || []).forEach(function (e) {
      if (e.status === 'NEEDS_MORE_INFORMATION') ledger.nmiKeys.push(e.key);
    });

    if (project.status === 'PARTIAL_ESTIMATE' || project.allInStatus === 'PARTIAL_ESTIMATE') {
      blocking.push({
        id: 'partial_estimate',
        label: 'Gedeeltelijke schatting',
        reason: 'Nog onvoldoende informatie bij onderdelen, renovatiekost is niet volledig.',
        materiality: 'CRITICAL'
      });
    }
    if (project.status === 'EMPTY' || project.allInStatus === 'INSUFFICIENT_INFORMATION') {
      blocking.push({
        id: 'insufficient',
        label: 'Onvoldoende informatie',
        reason: 'Geen bruikbaar renovatiebudget.',
        materiality: 'CRITICAL'
      });
    }
    if ((ledger.nmiKeys || []).length > 0) {
      blocking.push({
        id: 'nmi_packages',
        label: 'Onbekende werkpakketten',
        reason: 'Nog onvoldoende info bij: ' + ledger.nmiKeys.join(', '),
        materiality: 'CRITICAL'
      });
    }
    if (!project.budget || project.budget.worksExpected <= 0) {
      if (project.status !== 'EMPTY') {
        blocking.push({
          id: 'zero_works',
          label: 'Geen werken-budget',
          reason: 'Het werkbudget is nog niet bruikbaar (€0).',
          materiality: 'CRITICAL'
        });
      }
    }

    if (project.confidence === 'LOW' || project.confidence === 'PARTIAL') {
      warnings.push('Lage projectconfidence, investeringsanalyse voorzichtig interpreteren.');
    }

    var heavy = assessHeavyGuard(calc2State, ledger);
    if (heavy.heavy && (calc2State.structuralRisk === 'weet_niet' || !calc2State.structuralRisk)) {
      blocking.push({
        id: 'heavy_structural_unknown',
        label: 'Zware renovatie, structureel onbekend',
        reason: 'Technische inspectie aanbevolen vóór financiële analyse. ' + heavy.reasons.join('; '),
        materiality: 'CRITICAL'
      });
    } else if (heavy.inspectionRecommended) {
      warnings.push('Technische inspectie aanbevolen vóór financiële analyse (' + heavy.reasons.join('; ') + ').');
    }

    // Soft/procurement resolution lines
    var lines = [];
    if (allIn) {
      lines = [].concat(allIn.softCosts || [], allIn.procurementCosts || []);
    }
    lines.forEach(function (l) {
      var res = l.resolution || l.status;
      var mat = l.materiality || 'MEDIUM';
      var investorBlocking = !!l.investorBlocking;
      if (!investorBlocking && CostRes && CostRes.isBlockingMateriality(mat)) {
        if (res === 'UNRESOLVED_MATERIAL' || res === 'INSUFFICIENT_INFORMATION' || res === 'UNRESOLVED') {
          investorBlocking = true;
        }
      }
      if (investorBlocking) {
        blocking.push({
          id: l.id,
          label: l.label,
          reason: l.applicability || l.explanation || ('Onopgelost: ' + res),
          materiality: mat,
          resolution: res
        });
      } else if (res === 'UNRESOLVED_LOW' || res === 'UNRESOLVED_MATERIAL') {
        warnings.push(l.label + ' nog open (' + mat + ')');
      }
    });

    // Unresolved costs list from all-in
    (allIn && allIn.unresolvedCosts || []).forEach(function (u) {
      if (u.investorBlocking === false) return;
      var mat = u.materiality || 'HIGH';
      if (mat === 'LOW') {
        warnings.push(u.label + ': ' + u.reason);
        return;
      }
      var already = blocking.some(function (b) { return b.id === u.id; });
      if (!already) {
        blocking.push({
          id: u.id,
          label: u.label,
          reason: u.reason,
          materiality: mat,
          resolution: 'UNRESOLVED_MATERIAL'
        });
      }
    });

    // Deduplicate blocking by id
    var seen = {};
    blocking = blocking.filter(function (b) {
      if (seen[b.id]) return false;
      seen[b.id] = true;
      return true;
    });

    var vat = vatStatusOf(project);
    var allowed = blocking.length === 0 && project.budget && project.budget.worksExpected > 0;

    if (!allowed) {
      reasons = blocking.map(function (b) { return b.label + ': ' + b.reason; });
    }

    return {
      allowed: allowed,
      status: allowed ? 'READY' : 'BLOCKED',
      reasons: reasons,
      blockingItems: blocking,
      warnings: warnings,
      heavyGuard: heavy,
      vat: vat,
      renovationInput: allowed ? {
        low: project.budget.low,
        expected: project.budget.recommendedExpected,
        high: project.budget.high,
        worksExpected: project.budget.worksExpected,
        softCostsExpected: project.budget.softCostsExpected,
        procurementCostsExpected: project.budget.procurementCostsExpected,
        reserveExpected: project.budget.reserveExpected,
        confidence: project.confidence,
        allInStatus: project.allInStatus,
        vatStatus: vat.vatStatus,
        financeMustResolveVat: vat.financeMustResolveVat
      } : null,
      version: 'calc2-phase4.7-investor-readiness'
    };
  }

  return {
    evaluate: evaluate,
    assessHeavyGuard: assessHeavyGuard
  };
});
