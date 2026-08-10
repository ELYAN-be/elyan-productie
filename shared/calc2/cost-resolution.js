/* ============================================================
   ELYAN Calc2 — Cost resolution + materiality (Phase 4.7)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2CostResolution = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RESOLUTION = {
    RESOLVED_MARKET: 'RESOLVED_MARKET',
    RESOLVED_USER: 'RESOLVED_USER',
    CONFIRMED_NOT_APPLICABLE: 'CONFIRMED_NOT_APPLICABLE',
    UNRESOLVED_LOW: 'UNRESOLVED_LOW',
    UNRESOLVED_MATERIAL: 'UNRESOLVED_MATERIAL',
    INSUFFICIENT_INFORMATION: 'INSUFFICIENT_INFORMATION',
    NOT_APPLICABLE: 'NOT_APPLICABLE'
  };

  /**
   * Materiality rules (documented):
   * CRITICAL — can invalidate investment decision / structural safety
   * HIGH — >~8% of works or legal multi-contractor obligation / required design fee
   * MEDIUM — typically 1–8% or municipal/admin fees
   * LOW — typically <1% and <€2k fixed studies
   */
  function classifyMateriality(opts) {
    opts = opts || {};
    var works = Math.max(0, Number(opts.worksExpected) || 0);
    var possible = Math.max(
      Number(opts.possibleImpact) || 0,
      Number(opts.high) || 0,
      Number(opts.expected) || 0
    );
    var legal = !!opts.legalObligation;
    var structural = !!opts.structural;
    var pct = works > 0 ? possible / works : (possible > 0 ? 1 : 0);

    if (structural || opts.forceCritical) return 'CRITICAL';
    if (legal && possible === 0 && opts.unresolved) return 'HIGH';
    if (pct >= 0.08 || possible >= 15000) return 'HIGH';
    if (pct >= 0.01 || possible >= 2000 || opts.forceMedium) return 'MEDIUM';
    return 'LOW';
  }

  function getResolution(state, id) {
    var cr = (state && state.costResolutions) || {};
    return cr[id] || null;
  }

  /**
   * User resolution shapes:
   * { mode: 'amount', amount: 2500 }
   * { mode: 'percent', percent: 12 }  // of works
   * { mode: 'na' }
   * { mode: 'unknown' }
   * Legacy softCostOverrides: number | 'exclude'
   */
  function normalizeUserResolution(state, id, worksExpected) {
    var res = getResolution(state, id);
    if (res && res.mode) {
      if (res.mode === 'na') return { mode: 'na' };
      if (res.mode === 'unknown') return { mode: 'unknown' };
      if (res.mode === 'amount' && Number(res.amount) >= 0) {
        return { mode: 'amount', amount: Number(res.amount) };
      }
      if (res.mode === 'percent' && Number(res.percent) >= 0) {
        var amt = Math.round((worksExpected || 0) * (Number(res.percent) / 100));
        return { mode: 'percent', percent: Number(res.percent), amount: amt };
      }
    }
    var o = (state && state.softCostOverrides) || {};
    if (Object.prototype.hasOwnProperty.call(o, id)) {
      var v = o[id];
      if (v === 'exclude' || v === 'na') return { mode: 'na' };
      if (v === 'unknown') return { mode: 'unknown' };
      var n = Number(v);
      if (isFinite(n) && n >= 0) return { mode: 'amount', amount: n };
    }
    return null;
  }

  function isBlockingMateriality(m) {
    return m === 'HIGH' || m === 'CRITICAL';
  }

  return {
    RESOLUTION: RESOLUTION,
    classifyMateriality: classifyMateriality,
    getResolution: getResolution,
    normalizeUserResolution: normalizeUserResolution,
    isBlockingMateriality: isBlockingMateriality
  };
});
