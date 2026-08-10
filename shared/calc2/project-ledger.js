/* ============================================================
   ELYAN Calc2 — Project ledger from package results
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2ProjectLedger = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  function buildLedger(packageBundle) {
    var packages = (packageBundle && packageBundle.packages) || {};
    var entries = [];
    var raw = { low: 0, expected: 0, high: 0, count: 0 };
    var nmiKeys = [];
    var provisional = { low: 0, expected: 0, high: 0, count: 0 };

    Object.keys(packages).forEach(function (key) {
      var r = packages[key];
      if (!r) return;
      var est = r.estimate;
      var entry = {
        key: key,
        packageType: r.packageType,
        instanceId: r.instanceId || null,
        instanceLabel: r.instanceLabel || null,
        status: r.status,
        confidence: r.confidence,
        estimate: est ? {
          low: est.low,
          expected: est.expected,
          high: est.high,
          material: est.material,
          labour: est.labour,
          other: est.other,
          labourHours: est.labourHours
        } : null,
        provisionalEstimate: r.provisionalEstimate || null,
        components: (r.components || []).slice(),
        assumptions: (r.assumptions || []).slice(),
        unknowns: (r.unknowns || []).slice(),
        overlapFlags: (r.overlapFlags || []).slice(),
        calc1Meta: r.calc1Meta || null,
        inputMapping: r.inputMapping || null,
        adjusted: null
      };
      entries.push(entry);

      if (r.status === 'OK' && est) {
        raw.low += est.low || 0;
        raw.expected += est.expected || 0;
        raw.high += est.high || 0;
        raw.count++;
      } else if (r.status === 'NEEDS_MORE_INFORMATION') {
        nmiKeys.push(key);
        if (r.provisionalEstimate) {
          provisional.low += r.provisionalEstimate.low || 0;
          provisional.expected += r.provisionalEstimate.expected || 0;
          provisional.high += r.provisionalEstimate.high || 0;
          provisional.count++;
        }
      }
    });

    entries.sort(function (a, b) {
      return String(a.key).localeCompare(String(b.key));
    });

    return {
      entries: entries,
      raw: {
        low: round50(raw.low),
        expected: round50(raw.expected),
        high: round50(raw.high),
        packageCount: raw.count
      },
      nmiKeys: nmiKeys,
      provisionalRisk: provisional.count ? {
        label: 'PROVISIONAL RISK RANGE — NOT AUTHORITATIVE',
        low: round50(provisional.low),
        expected: round50(provisional.expected),
        high: round50(provisional.high),
        packageCount: provisional.count
      } : null,
      projectOverlapFlags: (packageBundle && packageBundle.projectOverlapFlags) || []
    };
  }

  function findEntry(ledger, key) {
    for (var i = 0; i < ledger.entries.length; i++) {
      if (ledger.entries[i].key === key) return ledger.entries[i];
    }
    return null;
  }

  function findEntriesByType(ledger, packageType) {
    return (ledger.entries || []).filter(function (e) {
      return e.packageType === packageType;
    });
  }

  function componentsById(entry, idPrefixOrExact) {
    return (entry.components || []).filter(function (c) {
      return c.id === idPrefixOrExact || String(c.id).indexOf(idPrefixOrExact) === 0;
    });
  }

  function sumComponents(comps) {
    var out = { low: 0, expected: 0, high: 0 };
    (comps || []).forEach(function (c) {
      out.low += c.low || 0;
      out.expected += c.expected || 0;
      out.high += c.high || 0;
    });
    return out;
  }

  return {
    buildLedger: buildLedger,
    findEntry: findEntry,
    findEntriesByType: findEntriesByType,
    componentsById: componentsById,
    sumComponents: sumComponents,
    round50: round50
  };
});
