/* ============================================================
   ELYAN Calculator 2. Package pricing engine
   Phase 3.5: multi-bathroom instances + accurate quantity inputs
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./answer-adapters'),
      require('./overlap-flags'),
      require('./scope-model'),
      require('../pricing')
    );
  } else {
    root.ElyanCalc2PackageEngine = factory(
      root.ElyanCalc2Adapters,
      root.ElyanCalc2Overlap,
      root.ElyanCalc2Scope,
      root.ElyanPricing
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Adapters, Overlap, Scope, Pricing) {
  'use strict';

  if (!Adapters || !Pricing || !Pricing.calcEstimate) {
    throw new Error('[ELYAN Calc2] package-engine requires adapters + ElyanPricing');
  }

  function cloneJson(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function classifyConfidence(adapted, intensity) {
    if (!adapted || adapted.statusHint === 'SKIPPED') return null;
    if (adapted.statusHint === 'NEEDS_MORE_INFORMATION') return 'NEEDS_MORE_INFORMATION';
    if (intensity === 'weet_niet') return 'NEEDS_MORE_INFORMATION';

    var mapping = adapted.mappingMetadata || [];
    var unknowns = adapted.unknowns || [];
    var direct = 0;
    var assumed = 0;
    var unknownMeta = 0;
    mapping.forEach(function (m) {
      if (m.source === 'direct') direct++;
      else if (m.source === 'assumed') assumed++;
      else if (m.source === 'unknown') unknownMeta++;
    });

    if (unknowns.length >= 3 || unknownMeta >= 2 || (assumed >= 4 && direct < 2)) return 'LOW';
    if (assumed >= 3 || unknowns.length >= 1 || direct < 2) return 'MEDIUM';
    if (direct >= 3 && assumed <= 2 && unknowns.length === 0) return 'HIGH';
    return 'MEDIUM';
  }

  function extractAssumptions(adapted) {
    var list = (adapted.assumptions || []).slice();
    (adapted.mappingMetadata || []).forEach(function (m) {
      if (m.source === 'assumed' && m.explanation) list.push(m.field + ': ' + m.explanation);
    });
    var seen = {};
    return list.filter(function (x) {
      if (seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }

  function extractUnknowns(adapted) {
    var list = (adapted.unknowns || []).slice();
    (adapted.mappingMetadata || []).forEach(function (m) {
      if (m.source === 'unknown') list.push(m.field);
    });
    var seen = {};
    return list.filter(function (x) {
      if (seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }

  function wrapEstimate(calc1) {
    if (!calc1) return null;
    var amounts = calc1.amounts || {};
    return {
      low: calc1.low,
      expected: calc1.price,
      high: calc1.high,
      material: amounts.materiaal,
      labour: amounts.arbeid,
      other: amounts.overige,
      labourHours: calc1.labourHours,
      duration: {
        weeksLow: calc1.weeksLow,
        weeksHigh: calc1.weeksHigh,
        workDays: calc1.workDays
      }
    };
  }

  function extractComponents(calc1) {
    if (!calc1 || !Array.isArray(calc1.workPackages)) return [];
    return calc1.workPackages.map(function (p) {
      return {
        id: p.id,
        label: p.label,
        low: p.totalLow,
        expected: p.totalBase,
        high: p.totalHigh,
        material: p.materialBase,
        labour: p.labourBase,
        other: p.otherBase,
        labourHours: p.labourHoursBase,
        reason: p.reason || ''
      };
    });
  }

  function extractCalc1Meta(calc1) {
    if (!calc1) return null;
    return {
      /* price/low/high are EXCL Calc1 contingency advisory */
      contingencyAdvisory: calc1.contingency,
      contingencyPct: calc1.contingencyPct,
      contingencyIncludedInPrice: false,
      vatRate: calc1.vatRate,
      subtotalExVat: calc1.subtotalExVat,
      vatAmount: calc1.vatAmount,
      totalInclVat: calc1.totalInclVat,
      note: 'Calc1 price/low/high exclude contingency advisory and are excl. VAT (subtotalExVat).'
    };
  }

  function pricePackage(packageType, calc2State, options) {
    options = options || {};
    var baseType = String(packageType).indexOf('badkamer:') === 0
      ? 'badkamer'
      : (String(packageType).indexOf('isolatie:') === 0 ? 'isolatie' : packageType);
    var adapted = Adapters.adaptPackageToCalc1(baseType, calc2State, {
      instance: options.instance || null
    });
    var intensity = calc2State && calc2State.scope && calc2State.scope[baseType];
    var resultKey = options.resultKey || packageType;

    if (adapted.statusHint === 'SKIPPED' || !adapted.answers) {
      return {
        packageType: baseType,
        resultKey: resultKey,
        instanceId: adapted.instanceId || null,
        instanceLabel: adapted.instanceLabel || null,
        status: adapted.statusHint || 'SKIPPED',
        inputMapping: {
          type: adapted.type,
          province: adapted.province,
          mappingMetadata: adapted.mappingMetadata || [],
          resolvedAnswers: null
        },
        estimate: null,
        confidence: null,
        assumptions: extractAssumptions(adapted),
        unknowns: extractUnknowns(adapted),
        overlapFlags: [],
        calc1Snapshot: null
      };
    }

    var answersIn = cloneJson(adapted.answers);
    var answersFrozen = cloneJson(answersIn);
    var calc1 = Pricing.calcEstimate(adapted.type, adapted.province, answersIn);

    var mutatedKeys = [];
    Object.keys(answersFrozen).forEach(function (k) {
      if (JSON.stringify(answersIn[k]) !== JSON.stringify(answersFrozen[k])) mutatedKeys.push(k);
    });

    var confidence = classifyConfidence(adapted, intensity);
    var status = 'OK';
    if (adapted.statusHint === 'NEEDS_MORE_INFORMATION' || confidence === 'NEEDS_MORE_INFORMATION') {
      status = 'NEEDS_MORE_INFORMATION';
    } else if (
      !calc1 ||
      !Number.isFinite(calc1.price) ||
      calc1.price < 0 ||
      calc1.low > calc1.price ||
      calc1.price > calc1.high
    ) {
      status = 'INVALID_RESULT';
    }

    var authoritative = status === 'OK';
    return {
      packageType: baseType,
      resultKey: resultKey,
      instanceId: adapted.instanceId || null,
      instanceLabel: adapted.instanceLabel || null,
      status: status,
      inputMapping: {
        type: adapted.type,
        province: adapted.province,
        mappingMetadata: adapted.mappingMetadata || [],
        resolvedAnswers: cloneJson(adapted.answers)
      },
      estimate: authoritative ? wrapEstimate(calc1) : null,
      provisionalEstimate: (!authoritative && calc1) ? wrapEstimate(calc1) : null,
      components: extractComponents(calc1),
      calc1Meta: extractCalc1Meta(calc1),
      confidence: confidence,
      assumptions: extractAssumptions(adapted),
      unknowns: extractUnknowns(adapted),
      overlapFlags: [],
      calc1Snapshot: options.includeCalc1Snapshot ? cloneJson(calc1) : null,
      _debug: options.debug ? { mutatedAnswerKeys: mutatedKeys } : undefined
    };
  }

  function priceActivePackages(calc2State, options) {
    options = options || {};
    var scope = (calc2State && calc2State.scope) || {};
    var results = {};
    var jobs = Adapters.listPricingJobs ? Adapters.listPricingJobs(calc2State) : [];

    if (!jobs.length && Scope && Scope.activePackages) {
      Scope.activePackages(scope).forEach(function (pkg) {
        jobs.push({ packageType: pkg.id, resultKey: pkg.id, instance: null });
      });
    }

    jobs.forEach(function (job) {
      results[job.resultKey] = pricePackage(job.packageType, calc2State, {
        includeCalc1Snapshot: options.includeCalc1Snapshot,
        debug: options.debug,
        instance: job.instance,
        resultKey: job.resultKey
      });
    });

    if (options.includeInactive && Scope && Scope.WORK_PACKAGES) {
      Scope.WORK_PACKAGES.forEach(function (pkg) {
        var has = Object.keys(results).some(function (k) {
          return results[k].packageType === pkg.id;
        });
        if (!has) results[pkg.id] = pricePackage(pkg.id, calc2State, options);
      });
    }

    var projectFlags = Overlap && Overlap.detectOverlapFlags
      ? Overlap.detectOverlapFlags(results, scope)
      : [];

    Object.keys(results).forEach(function (id) {
      results[id].overlapFlags = Overlap && Overlap.flagsForPackage
        ? Overlap.flagsForPackage(id, projectFlags)
        : [];
    });

    return {
      packages: results,
      projectOverlapFlags: projectFlags,
      rawPackageSum: options.includeRawSum ? computeRawPackageSum(results) : null,
      disclaimer: 'RAW PACKAGE SUM. NOT A PROJECT ESTIMATE',
      version: 'calc2-phase3.5-package-engine'
    };
  }

  function computeRawPackageSum(results) {
    var low = 0;
    var expected = 0;
    var high = 0;
    var counted = 0;
    Object.keys(results || {}).forEach(function (id) {
      var r = results[id];
      if (!r || !r.estimate || r.status !== 'OK') return;
      low += r.estimate.low || 0;
      expected += r.estimate.expected || 0;
      high += r.estimate.high || 0;
      counted++;
    });
    return {
      label: 'RAW PACKAGE SUM. NOT A PROJECT ESTIMATE',
      packageCount: counted,
      low: low,
      expected: expected,
      high: high,
      note: 'Arithmetic sum of status=OK Calc1 package estimates only (incl. separate bathroom instances). Overlaps NOT deducted.'
    };
  }

  return {
    pricePackage: pricePackage,
    priceActivePackages: priceActivePackages,
    computeRawPackageSum: computeRawPackageSum,
    classifyConfidence: classifyConfidence
  };
});
