/* ============================================================
   ELYAN Calc2. Scope collision + shared-cost reconciliation
   Conservative: only deduct identifiable Calc1 components.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./project-ledger') : null
    );
  } else {
    root.ElyanCalc2Reconciliation = factory(root.ElyanCalc2ProjectLedger);
  }
})(typeof self !== 'undefined' ? self : this, function (Ledger) {
  'use strict';

  function round50(n) {
    return Ledger && Ledger.round50 ? Ledger.round50(n) : Math.round(Number(n) / 50) * 50;
  }

  function adj(opts) {
    return {
      type: opts.type,
      packages: opts.packages || [],
      costClass: opts.costClass,
      lowAdjustment: round50(opts.lowAdjustment || 0),
      expectedAdjustment: round50(opts.expectedAdjustment || 0),
      highAdjustment: round50(opts.highAdjustment || 0),
      method: opts.method,
      confidence: opts.confidence || 'medium',
      reason: opts.reason,
      sourceComponents: opts.sourceComponents || []
    };
  }

  function subtypeOf(entry) {
    return entry && entry.inputMapping && entry.inputMapping.resolvedAnswers
      && entry.inputMapping.resolvedAnswers.subtype;
  }

  function answersOf(entry) {
    return (entry && entry.inputMapping && entry.inputMapping.resolvedAnswers) || {};
  }

  function hasOk(entry) {
    return entry && entry.status === 'OK' && entry.estimate;
  }

  function sumComp(entry, ids) {
    var comps = (entry.components || []).filter(function (c) {
      return ids.indexOf(c.id) !== -1;
    });
    var out = { low: 0, expected: 0, high: 0, ids: [] };
    comps.forEach(function (c) {
      out.low += c.low || 0;
      out.expected += c.expected || 0;
      out.high += c.high || 0;
      out.ids.push(c.id);
    });
    return out;
  }

  function scaffoldComps(entry) {
    return (entry.components || []).filter(function (c) {
      return c.id === 'scaffold' || c.id === 'scaffold2' || c.id === 'scaffold3';
    });
  }

  function protectComps(entry) {
    return (entry.components || []).filter(function (c) {
      return c.id === 'protect';
    });
  }

  /* ---- Scope collisions ---- */

  function resolveScopeCollisions(ledger, warnings) {
    var adjustments = [];
    var suppressions = [];
    var dak = Ledger.findEntry(ledger, 'dak');
    var isolatieEntries = Ledger.findEntriesByType
      ? Ledger.findEntriesByType(ledger, 'isolatie')
      : [Ledger.findEntry(ledger, 'isolatie')].filter(Boolean);
    var gevel = Ledger.findEntry(ledger, 'gevel');
    var elek = Ledger.findEntry(ledger, 'elektriciteit');
    var keuken = Ledger.findEntry(ledger, 'keuken');

    isolatieEntries.forEach(function (isolatie) {
      if (!hasOk(isolatie)) return;

      // A. Dak insulation vs Isolatie dak_binnen / zoldervloer
      if (hasOk(dak)) {
        var dakAns = answersOf(dak);
        /* Ownership = explicit insulation, isolatie-workType, or volledig only when insulation is not explicitly "nee" */
        var dakHasIso = dakAns.insulation === 'ja'
          || dakAns.workType === 'isolatie'
          || (dakAns.workType === 'volledig' && dakAns.insulation !== 'nee');
        var isoSub = subtypeOf(isolatie);
        if (dakHasIso && (isoSub === 'dak_binnen' || isoSub === 'zoldervloer')) {
          var isoTot = isolatie.estimate;
          adjustments.push(adj({
            type: 'scope_suppression',
            packages: ['dak', isolatie.key],
            costClass: 'roof_insulation',
            lowAdjustment: -(isoTot.low || 0),
            expectedAdjustment: -(isoTot.expected || 0),
            highAdjustment: -(isoTot.high || 0),
            method: 'SUPPRESS_PACKAGE',
            confidence: 'high',
            reason: 'Dak bevat reeds dakisolatie; Isolatie-instantie ' + isolatie.key + ' (dak) onderdrukt. Ownership: dak.',
            sourceComponents: ['isolatie:*']
          }));
          suppressions.push({
            packageKey: isolatie.key,
            reason: 'Roof insulation owned by dak package',
            fullySuppressed: true
          });
          isolatie._fullySuppressed = true;
        }
      }

      // B. Gevel ETICS vs Isolatie buitenmuur
      if (hasOk(gevel) && !isolatie._fullySuppressed) {
        var gevelAns = answersOf(gevel);
        var isoSub2 = subtypeOf(isolatie);
        if (gevelAns.intervention === 'isolatie_afwerking' && isoSub2 === 'buitenmuur') {
          var isoTot2 = isolatie.estimate;
          adjustments.push(adj({
            type: 'scope_suppression',
            packages: ['gevel', isolatie.key],
            costClass: 'facade_insulation',
            lowAdjustment: -(isoTot2.low || 0),
            expectedAdjustment: -(isoTot2.expected || 0),
            highAdjustment: -(isoTot2.high || 0),
            method: 'SUPPRESS_PACKAGE',
            confidence: 'high',
            reason: 'Gevel ETICS dekt buitenmuurisolatie; Isolatie-instantie ' + isolatie.key + ' onderdrukt. Ownership: gevel.',
            sourceComponents: ['isolatie:*']
          }));
          suppressions.push({
            packageKey: isolatie.key,
            reason: 'Facade insulation owned by gevel package',
            fullySuppressed: true
          });
          isolatie._fullySuppressed = true;
        } else if (gevelAns.intervention === 'isolatie_afwerking' && isoSub2 === 'binnenmuur') {
          warnings.push({
            code: 'possible_wall_iso_overlap',
            packages: ['gevel', isolatie.key],
            note: 'Gevel ETICS + binnenmuurisolatie: meestal complementair, geen automatische aftrek.'
          });
        }
      }
    });

    // C. Full electrical vs kitchen electrical connection component
    if (hasOk(elek) && hasOk(keuken)) {
      var elekScope = answersOf(elek).scope;
      if (elekScope === 'volledig' || elekScope === 'renovatie_volledig') {
        var elecConn = sumComp(keuken, ['conn-elec-move', 'conn-elec']);
        if (elecConn.expected > 0) {
          adjustments.push(adj({
            type: 'scope_overlap',
            packages: ['elektriciteit', 'keuken'],
            costClass: 'kitchen_electrical',
            lowAdjustment: -elecConn.low,
            expectedAdjustment: -elecConn.expected,
            highAdjustment: -elecConn.high,
            method: 'COMPONENT_DEDUCT',
            confidence: 'high',
            reason: 'Volledige elektra-renovatie actief: keukencomponenten conn-elec / conn-elec-move zijn identificeerbaar en worden afgetrokken (niet de volledige keuken).',
            sourceComponents: elecConn.ids
          }));
        } else {
          warnings.push({
            code: 'elec_kitchen_unresolved',
            packages: ['elektriciteit', 'keuken'],
            note: 'Mogelijke elektra-overlap keuken, maar geen identificeerbare conn-elec-component, geen aftrek.'
          });
        }
      }
    }

    // C2. Full electrical vs bathroom electrical line item
    ledger.entries.forEach(function (entry) {
      if (!hasOk(elek) || entry.packageType !== 'badkamer' || !hasOk(entry)) return;
      var elekScope2 = answersOf(elek).scope;
      if (elekScope2 !== 'volledig' && elekScope2 !== 'renovatie_volledig') return;
      var bathElec = sumComp(entry, ['electrical']);
      if (bathElec.expected > 0) {
        adjustments.push(adj({
          type: 'scope_overlap',
          packages: ['elektriciteit', entry.key],
          costClass: 'bathroom_electrical',
          lowAdjustment: -bathElec.low,
          expectedAdjustment: -bathElec.expected,
          highAdjustment: -bathElec.high,
          method: 'COMPONENT_DEDUCT',
          confidence: 'high',
          reason: 'Volledige elektra-renovatie: badkamercomponent electrical aftrekbaar op instantie ' + entry.key + '.',
          sourceComponents: bathElec.ids
        }));
      }
    });

    // D. Plumbing — warning only
    var bathAny = ledger.entries.some(function (e) { return e.packageType === 'badkamer' && hasOk(e); });
    if (bathAny && hasOk(keuken)) {
      warnings.push({
        code: 'plumbing_overlap_unresolved',
        packages: ['badkamer', 'keuken'],
        note: 'Mogelijke gedeelde sanitair/leidingwerken: geen betrouwbare component-aftrek, kost behouden.'
      });
    }

    return { adjustments: adjustments, suppressions: suppressions };
  }

  /* ---- Shared costs ---- */

  function resolveSharedCosts(ledger, warnings) {
    var adjustments = [];

    // Scaffolding: MAX policy across exterior packages with scaffold components
    var exteriorKeys = [];
    var scaffoldPool = [];
    ledger.entries.forEach(function (entry) {
      if (!hasOk(entry) || entry._fullySuppressed) return;
      var sc = scaffoldComps(entry);
      if (!sc.length) return;
      var tot = { low: 0, expected: 0, high: 0 };
      sc.forEach(function (c) {
        tot.low += c.low || 0;
        tot.expected += c.expected || 0;
        tot.high += c.high || 0;
      });
      exteriorKeys.push(entry.key);
      scaffoldPool.push({ key: entry.key, tot: tot, comps: sc.map(function (c) { return c.id; }) });
    });

    if (scaffoldPool.length >= 2) {
      var maxExp = 0;
      var maxLow = 0;
      var maxHigh = 0;
      var sumExp = 0;
      var sumLow = 0;
      var sumHigh = 0;
      scaffoldPool.forEach(function (s) {
        sumExp += s.tot.expected;
        sumLow += s.tot.low;
        sumHigh += s.tot.high;
        if (s.tot.expected > maxExp) {
          maxExp = s.tot.expected;
          maxLow = s.tot.low;
          maxHigh = s.tot.high;
        }
      });
      var deductExp = sumExp - maxExp;
      var deductLow = sumLow - maxLow;
      var deductHigh = sumHigh - maxHigh;
      if (deductExp > 0) {
        adjustments.push(adj({
          type: 'shared_cost',
          packages: exteriorKeys.slice(),
          costClass: 'scaffolding',
          lowAdjustment: -deductLow,
          expectedAdjustment: -deductExp,
          highAdjustment: -deductHigh,
          method: 'MAX_CAMPAIGN',
          confidence: 'medium',
          reason: 'Meerdere steigercomponenten in dak/gevel/schilder: behoud grootste campagne (MAX), trek som−MAX af. Geen cheap-only; geen simpele som. Sequentiële herhuur niet gemodelleerd → medium confidence.',
          sourceComponents: scaffoldPool.reduce(function (a, s) { return a.concat(s.comps); }, [])
        }));
      }
    }

    // Site protection: MAX across packages with protect (bathroom / paint)
    var protectPool = [];
    ledger.entries.forEach(function (entry) {
      if (!hasOk(entry) || entry._fullySuppressed) return;
      var pc = protectComps(entry);
      if (!pc.length) return;
      var tot = { low: 0, expected: 0, high: 0 };
      pc.forEach(function (c) {
        tot.low += c.low || 0;
        tot.expected += c.expected || 0;
        tot.high += c.high || 0;
      });
      protectPool.push({ key: entry.key, tot: tot });
    });
    if (protectPool.length >= 2) {
      var pMax = 0;
      var pMaxL = 0;
      var pMaxH = 0;
      var pSum = 0;
      var pSumL = 0;
      var pSumH = 0;
      var pKeys = [];
      protectPool.forEach(function (s) {
        pKeys.push(s.key);
        pSum += s.tot.expected;
        pSumL += s.tot.low;
        pSumH += s.tot.high;
        if (s.tot.expected > pMax) {
          pMax = s.tot.expected;
          pMaxL = s.tot.low;
          pMaxH = s.tot.high;
        }
      });
      if (pSum - pMax > 0) {
        adjustments.push(adj({
          type: 'shared_cost',
          packages: pKeys,
          costClass: 'site_protection',
          lowAdjustment: -(pSumL - pMaxL),
          expectedAdjustment: -(pSum - pMax),
          highAdjustment: -(pSumH - pMaxH),
          method: 'MAX_PROTECT',
          confidence: 'low',
          reason: 'Meerdere protect/werfinrichting-componenten: behoud grootste, trek duplicaten af. Trade-specifieke afbraak blijft onaangeroerd.',
          sourceComponents: ['protect']
        }));
      }
    }

    // Demolition labour: KEEP (no deduction) — document
    var demoCount = 0;
    ledger.entries.forEach(function (entry) {
      if (!hasOk(entry)) return;
      if ((entry.components || []).some(function (c) { return c.id === 'demo' || c.id === 'strip'; })) demoCount++;
    });
    if (demoCount >= 2) {
      warnings.push({
        code: 'demolition_kept',
        packages: [],
        note: 'Afbraak/strip-arbeid per trade behouden (KEEP). Enkel gedeelde logistiek kan overlappen, geen veilige waste-only component → UNRESOLVED voor container-logistiek.'
      });
      warnings.push({
        code: 'waste_logistics_unresolved',
        packages: [],
        note: 'Afvoer/container-logistiek mogelijk deels deelbaar, maar Calc1 koppelt waste vaak aan demo/strip, geen aftrek zonder inventie.'
      });
    }

    // Mobilisation / site setup / multi-trade waste: no invented euros — mark unresolved for honesty
    if (ledger.raw.packageCount >= 4) {
      warnings.push({
        code: 'mobilisation_unresolved',
        packages: [],
        unresolvedSiteCost: true,
        note: 'Project-niveau mobilisatie, containerlogistiek en werfinrichting: geen generieke BE-forfait toegevoegd (zonder inventie). Los op via eigen inschatting of aannemersofferte, dit budget is daardoor geen complete werfinrichting.'
      });
    }

    return { adjustments: adjustments };
  }

  function applyAdjustments(ledger, adjustments, suppressions) {
    var low = ledger.raw.low;
    var expected = ledger.raw.expected;
    var high = ledger.raw.high;
    var suppressedKeys = {};
    (suppressions || []).forEach(function (s) {
      if (s.fullySuppressed) suppressedKeys[s.packageKey] = true;
    });

    adjustments.forEach(function (a) {
      low += a.lowAdjustment;
      expected += a.expectedAdjustment;
      high += a.highAdjustment;
    });

    // Ensure bands
    low = Math.max(0, round50(low));
    expected = Math.max(0, round50(expected));
    high = Math.max(expected, round50(high));
    if (low > expected) low = round50(expected * 0.9);

    // Per-entry adjusted estimates for UI
    ledger.entries.forEach(function (entry) {
      if (!entry.estimate) {
        entry.adjusted = null;
        return;
      }
      if (suppressedKeys[entry.key] || entry._fullySuppressed) {
        entry.adjusted = { low: 0, expected: 0, high: 0, suppressed: true };
        return;
      }
      var al = entry.estimate.low;
      var ae = entry.estimate.expected;
      var ah = entry.estimate.high;
      adjustments.forEach(function (a) {
        if (a.method === 'COMPONENT_DEDUCT' && a.packages.indexOf(entry.key) !== -1) {
          // Attribute full component deduct to the non-elek package
          if (entry.packageType !== 'elektriciteit') {
            al += a.lowAdjustment;
            ae += a.expectedAdjustment;
            ah += a.highAdjustment;
          }
        }
      });
      entry.adjusted = {
        low: Math.max(0, round50(al)),
        expected: Math.max(0, round50(ae)),
        high: Math.max(0, round50(ah)),
        suppressed: false
      };
    });

    return {
      reconciledLow: low,
      reconciledExpected: expected,
      reconciledHigh: Math.max(high, expected)
    };
  }

  function reconcile(ledger) {
    var warnings = [];
    var scope = resolveScopeCollisions(ledger, warnings);
    var shared = resolveSharedCosts(ledger, warnings);
    var adjustments = scope.adjustments.concat(shared.adjustments);

    // Safety: never deduct more than raw
    var totalDeduct = 0;
    adjustments.forEach(function (a) {
      if (a.expectedAdjustment < 0) totalDeduct += -a.expectedAdjustment;
    });
    var pct = ledger.raw.expected > 0 ? totalDeduct / ledger.raw.expected : 0;
    if (pct > 0.25) {
      warnings.push({
        code: 'aggressive_reconciliation',
        packages: [],
        note: 'Reconciliatie trekt ' + Math.round(pct * 100) + '% van raw af, controleer of model te agressief is.'
      });
    }

    var bands = applyAdjustments(ledger, adjustments, scope.suppressions);
    return {
      adjustments: adjustments,
      scopeSuppressions: scope.suppressions,
      warnings: warnings,
      reconciledLow: bands.reconciledLow,
      reconciledExpected: bands.reconciledExpected,
      reconciledHigh: bands.reconciledHigh,
      deductionPctOfRaw: Math.round(pct * 1000) / 10
    };
  }

  return {
    reconcile: reconcile,
    resolveScopeCollisions: resolveScopeCollisions,
    resolveSharedCosts: resolveSharedCosts
  };
});
