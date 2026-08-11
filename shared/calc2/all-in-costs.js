/* ============================================================
   ELYAN Calc2 — All-in project cost layer (Phase 4.6)
   Soft costs + procurement + VAT presentation on audited works.
   No invented euros without documented sourceType.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./project-ledger') : null,
      typeof require !== 'undefined' ? require('./scope-model') : null,
      typeof require !== 'undefined' ? require('./cost-resolution') : null
    );
  } else {
    root.ElyanCalc2AllInCosts = factory(
      root.ElyanCalc2ProjectLedger,
      root.ElyanCalc2Scope,
      root.ElyanCalc2CostResolution
    );
  }
})(typeof self !== 'undefined' ? self : this, function (Ledger, Scope, CostRes) {
  'use strict';

  function round50(n) {
    return Ledger && Ledger.round50 ? Ledger.round50(n) : Math.round(Number(n) / 50) * 50;
  }

  var RESOLUTION = (CostRes && CostRes.RESOLUTION) || {
    RESOLVED_MARKET: 'RESOLVED_MARKET',
    RESOLVED_USER: 'RESOLVED_USER',
    CONFIRMED_NOT_APPLICABLE: 'CONFIRMED_NOT_APPLICABLE',
    UNRESOLVED_LOW: 'UNRESOLVED_LOW',
    UNRESOLVED_MATERIAL: 'UNRESOLVED_MATERIAL',
    INSUFFICIENT_INFORMATION: 'INSUFFICIENT_INFORMATION',
    NOT_APPLICABLE: 'NOT_APPLICABLE'
  };

  var PROCUREMENT = {
    separate: {
      value: 'separate',
      label: 'Losse vakmannen',
      desc: 'Ik regel en coördineer de verschillende aannemers zelf.'
    },
    general_contractor: {
      value: 'general_contractor',
      label: 'Algemene aannemer',
      desc: 'Eén hoofdaannemer coördineert meerdere vakmannen.'
    },
    design_build: {
      value: 'design_build',
      label: 'Design & build / totaalpartner',
      desc: 'Ontwerp, coördinatie en uitvoering worden als één project georganiseerd.'
    },
    weet_niet: {
      value: 'weet_niet',
      label: 'Weet ik nog niet',
      desc: 'Organisatie nog niet beslist — coördinatiekosten blijven open.'
    }
  };

  var FL_PROVINCES = {
    antwerpen: 1, 'oost-vlaanderen': 1, 'west-vlaanderen': 1,
    'vlaams-brabant': 1, limburg: 1
  };

  var RESEARCH = {
    architect: {
      sourceType: 'MARKET_BENCHMARK',
      confidence: 'medium',
      urls: [
        'https://renovatiekampioen.be/architect/',
        'https://www.architect-in-de-buurt.be/ereloon-architect/'
      ],
      note: 'BE free market fees; renovation often ~10–15% of works excl. VAT; fees at 21% VAT.',
      pctLow: 0.09,
      pctExpected: 0.11,
      pctHigh: 0.14
    },
    gc: {
      sourceType: 'MODEL_ASSUMPTION',
      confidence: 'low',
      strategy: 'USER_ENTERED',
      urls: [
        'https://www.heylenvastgoed.be/kennis-van-wonen/renovatiekosten-2026-overzicht-per-verbouwing-vlaanderen',
        'https://www.interieurkabinet.be/blog/renovatiewerkzaamheden/',
        'https://www.bouwdata.net/wp-content/uploads/Whitepaper-Eenduidig-framework-voor-nacalculatie-en-5D-BIM_2de-editie.pdf'
      ],
      note: 'Phase 4.7: GC markup NOT auto-applied. Consumer guides cite ~15–25% but variation too large + often hidden in unit prices. Require user € or % (Eigen inschatting).'
    },
    designBuild: {
      sourceType: 'MODEL_ASSUMPTION',
      confidence: 'low',
      strategy: 'USER_ENTERED',
      urls: [
        'https://renovatiekampioen.be/totaalrenovatie/aannemer/',
        'https://www.heylenvastgoed.be/kennis-van-wonen/renovatiekosten-2026-overzicht-per-verbouwing-vlaanderen'
      ],
      note: 'Design&build overhead not auto-applied — user € or % required.'
    },
    safety: {
      sourceType: 'MARKET_BENCHMARK',
      confidence: 'medium',
      urls: [
        'https://www.belgium.be/nl/huisvesting/bouwen_en_verbouwen/normen_en_veiligheid/op_de_bouwwerf',
        'https://www.bouwunie.be/nl/advies/veiligheid-en-welzijn/wie-moet-de-veiligheidscoordinator-aanstellen',
        'https://www.vencko.be/veiligheidsco%C3%B6rdinatie'
      ],
      note: 'OFFICIAL: ≥2 contractors triggers coordination. Forfait market examples ~€550–1000 excl. VAT (21%).'
    },
    epb: {
      sourceType: 'MARKET_BENCHMARK',
      confidence: 'medium',
      urls: [
        'https://www.egeon.be/pricelist',
        'https://www.oximo.be/nl/nieuws/wat-kost-een-epb-verslaggever'
      ],
      note: 'Flanders EPB price lists only. Brussels/Wallonia: requirement flag + user input (no invented €).'
    },
    asbestos: {
      sourceType: 'MARKET_BENCHMARK',
      confidence: 'medium',
      urls: [
        'https://www.egeon.be/pricelist',
        'https://keurmeesters.be/asbestattest-prijs-2026/'
      ],
      note: 'Inventaris/attest market ~€450–700 band.'
    }
  };

  function line(opts) {
    var materiality = opts.materiality;
    if (!materiality && CostRes) {
      materiality = CostRes.classifyMateriality({
        worksExpected: opts.worksExpected,
        expected: opts.expected,
        high: opts.high,
        possibleImpact: opts.possibleImpact,
        legalObligation: opts.legalObligation,
        structural: opts.structural,
        unresolved: opts.resolution === RESOLUTION.UNRESOLVED_MATERIAL,
        forceCritical: opts.forceCritical,
        forceMedium: opts.forceMedium
      });
    }
    var resolution = opts.resolution || RESOLUTION.NOT_APPLICABLE;
    var investorBlocking = opts.investorBlocking;
    if (investorBlocking == null) {
      investorBlocking = (resolution === RESOLUTION.UNRESOLVED_MATERIAL || resolution === RESOLUTION.INSUFFICIENT_INFORMATION)
        && CostRes && CostRes.isBlockingMateriality(materiality);
    }
    return {
      id: opts.id,
      label: opts.label,
      category: opts.category || 'soft',
      applicability: opts.applicability,
      included: !!opts.included,
      low: opts.low == null ? 0 : round50(opts.low),
      expected: opts.expected == null ? 0 : round50(opts.expected),
      high: opts.high == null ? 0 : round50(opts.high),
      sourceType: opts.sourceType || 'MODEL_ASSUMPTION',
      confidence: opts.confidence || 'low',
      userOverrideAllowed: opts.userOverrideAllowed !== false,
      userOverridden: !!opts.userOverridden,
      vatTreatment: opts.vatTreatment || 'likely_21',
      explanation: opts.explanation || '',
      researchUrls: opts.researchUrls || [],
      status: opts.status || (opts.included ? 'INCLUDED' : 'NOT_APPLICABLE'),
      resolution: resolution,
      materiality: materiality || 'LOW',
      investorBlocking: !!investorBlocking,
      permitApplicability: opts.permitApplicability || null
    };
  }

  function applyUserRes(baseLine, userRes, worksExpected) {
    if (!userRes) return baseLine;
    if (userRes.mode === 'na') {
      return Object.assign({}, baseLine, {
        included: false,
        low: 0,
        expected: 0,
        high: 0,
        userOverridden: true,
        sourceType: 'USER_ASSUMPTION',
        status: 'EXCLUDED_BY_USER',
        resolution: RESOLUTION.CONFIRMED_NOT_APPLICABLE,
        investorBlocking: false,
        explanation: (baseLine.explanation || '') + ' Bevestigd niet van toepassing (eigen inschatting).'
      });
    }
    if (userRes.mode === 'unknown') {
      return Object.assign({}, baseLine, {
        included: false,
        low: 0,
        expected: 0,
        high: 0,
        userOverridden: true,
        sourceType: 'USER_ASSUMPTION',
        status: 'UNRESOLVED',
        resolution: RESOLUTION.UNRESOLVED_MATERIAL,
        investorBlocking: true,
        explanation: (baseLine.explanation || '') + ' Gebruiker: nog onbekend.'
      });
    }
    if (userRes.mode === 'amount' || userRes.mode === 'percent') {
      var amt = round50(userRes.amount || 0);
      return Object.assign({}, baseLine, {
        included: true,
        low: amt,
        expected: amt,
        high: amt,
        userOverridden: true,
        sourceType: 'USER_ASSUMPTION',
        status: 'USER_OVERRIDE',
        resolution: RESOLUTION.RESOLVED_USER,
        investorBlocking: false,
        confidence: 'medium',
        explanation: (baseLine.explanation || '') + ' Eigen inschatting' +
          (userRes.mode === 'percent' ? ' (' + userRes.percent + '% van works)' : '') +
          ': €' + amt + '.'
      });
    }
    return baseLine;
  }

  function activeTradeCount(ledger) {
    var types = {};
    (ledger.entries || []).forEach(function (e) {
      if (e.status === 'OK' && e.estimate && !(e.adjusted && e.adjusted.suppressed)) {
        types[e.packageType] = true;
      } else if (e.status === 'NEEDS_MORE_INFORMATION') {
        types[e.packageType] = true;
      }
    });
    return Object.keys(types).length;
  }

  function intensity(scope, id) {
    return (scope && scope[id]) || null;
  }

  function isActive(scope, id) {
    var v = intensity(scope, id);
    /* Scope uses 'niet_nodig' — do not treat it as an active trade */
    return !!(v && v !== 'niet' && v !== 'niet_nodig' && v !== 'weet_niet');
  }

  function regionOf(profile) {
    var p = (profile && profile.province) || '';
    if (FL_PROVINCES[p]) return 'flanders';
    if (p === 'brussels' || p === 'brussel' || p === 'brussels-hoofdstedelijk') return 'brussels';
    if (p === 'waals-brabant' || p === 'henegouwen' || p === 'luik' || p === 'luxemburg' || p === 'namen') {
      return 'wallonia';
    }
    return 'unknown';
  }

  function architectApplicable(state, trades) {
    var scope = state.scope || {};
    var profile = state.propertyProfile || {};
    if (state.structuralRisk === 'ja') return { yes: true, reason: 'Gebruiker geeft structurele ingreep aan.' };
    if (profile.condition === 'zwaar') return { yes: true, reason: 'Zware staat — ontwerp/vergunning vaak nodig.' };
    if (intensity(scope, 'dak') === 'volledig') return { yes: true, reason: 'Volledige dakrenovatie kan vergunning/architect triggeren.' };
    if (intensity(scope, 'gevel') === 'grondig' || intensity(scope, 'gevel') === 'volledig') {
      return { yes: true, reason: 'Ingrijpende gevelwerken — vaak architect/vergunning.' };
    }
    if (trades >= 8 && profile.condition === 'verouderd') {
      return { yes: true, reason: 'Bijna volledige renovatie van oudere woning — architect vaak aangewezen.' };
    }
    return { yes: false, reason: 'Geen duidelijke architect-trigger in scope/profiel.' };
  }

  function structuralApplicable(state) {
    var scope = state.scope || {};
    var profile = state.propertyProfile || {};
    if (state.structuralRisk === 'ja') return { yes: true, reason: 'Structureel risico bevestigd door gebruiker.' };
    if (state.structuralRisk === 'nee') return { yes: false, reason: 'Gebruiker geeft geen structurele ingreep aan.' };
    if (profile.condition === 'zwaar' && (intensity(scope, 'dak') === 'volledig' || intensity(scope, 'gevel') === 'volledig')) {
      return { yes: true, reason: 'Zware staat + zware schilwerken — stabiliteit waarschijnlijk te toetsen.' };
    }
    if (profile.yearBuilt === 'voor_1950' && intensity(scope, 'dak') === 'volledig') {
      return { yes: true, reason: 'Pre-1950 + volledige dakwerken — structurele check vaak aangewezen.' };
    }
    return { yes: false, reason: 'Geen betrouwbare structurele trigger zonder gebruikersinput.' };
  }

  function epbApplicable(state, trades) {
    var scope = state.scope || {};
    var energy = 0;
    ['dak', 'ramen', 'isolatie', 'gevel', 'verwarming', 'ventilatie'].forEach(function (id) {
      if (isActive(scope, id)) energy++;
    });
    var region = regionOf(state.propertyProfile);
    if (energy < 2) return { yes: false, reason: 'Beperkte energie-scope.', region: region };
    if (region === 'wallonia' || region === 'brussels') {
      return {
        yes: false,
        unresolved: true,
        reason: 'EPB/energieverslaggeving is gewestelijk — buiten Vlaanderen nog niet automatisch geprijsd.',
        region: region
      };
    }
    if (region === 'unknown') {
      return {
        yes: false,
        unresolved: true,
        reason: 'Regio onbekend — EPB-plicht niet automatisch bepaald.',
        region: region
      };
    }
    var ierLike = energy >= 4 || (isActive(scope, 'verwarming') && isActive(scope, 'ventilatie') &&
      (isActive(scope, 'isolatie') || isActive(scope, 'gevel') || isActive(scope, 'dak')));
    return {
      yes: true,
      ierLike: ierLike,
      reason: ierLike
        ? 'Vlaamse diepe energie-ingrepen — EPB-verslaggever vaak relevant bij vergunning/IER-achtige scope.'
        : 'Vlaamse energie-ingrepen — EPB mogelijk relevant bij vergunningsplichtige werken.',
      region: region
    };
  }

  function asbestosApplicable(state, ledger) {
    var profile = state.propertyProfile || {};
    var year = profile.yearBuilt;
    var old = year === 'voor_1950' || year === '1950_1970' || year === '1971_1990';
    var dak = Ledger && Ledger.findEntry ? Ledger.findEntry(ledger, 'dak') : null;
    var details = (state.packageDetails && state.packageDetails.dak) || {};
    /* Only trust asbestos from user answer — never from silent adapter default mogelijk */
    var roofAsb = details.roofAsbestos === 'ja' || details.roofAsbestos === 'mogelijk';
    if (dak && dak.status === 'NEEDS_MORE_INFORMATION') {
      return {
        yes: false,
        unresolved: true,
        reason: 'Dakstatus onbekend — asbestrisico open tot dakdetails bekend zijn.'
      };
    }
    if (roofAsb) {
      return { yes: true, reason: 'Asbest-indicatie bij dak/scope.' };
    }
    if (old && (intensity(state.scope, 'dak') || intensity(state.scope, 'gevel') || profile.condition === 'zwaar')) {
      return { yes: true, reason: 'Oudere woning + schil/afbraakrisico — asbestonderzoek vaak aangewezen.' };
    }
    if (year === 'weet_niet' && profile.condition === 'zwaar') {
      return { yes: false, unresolved: true, reason: 'Bouwjaar onbekend + zware staat — asbestrisico onopgelost.' };
    }
    return { yes: false, reason: 'Geen sterke asbest-trigger.' };
  }

  function permitApplicable(state) {
    var scope = state.scope || {};
    if (intensity(scope, 'dak') === 'volledig' || intensity(scope, 'gevel') === 'grondig' ||
      intensity(scope, 'gevel') === 'volledig' || state.structuralRisk === 'ja') {
      return {
        yes: true,
        reason: 'Schil-/structurele werken kunnen gemeentelijke melding of vergunning vereisen — tarieven lokaal.'
      };
    }
    return { yes: false, reason: 'Geen duidelijke vergunningstrigger in huidige scope.' };
  }

  function safetyApplicable(state, trades) {
    var proc = state.procurementModel;
    if (trades < 2) {
      return { yes: false, reason: 'Minder dan 2 trades — wettelijke drempel waarschijnlijk niet bereikt.' };
    }
    if (proc === 'separate') {
      return {
        yes: true,
        reason: 'OFFICIAL_REGULATION: ≥2 aannemers (losse vakmannen) → veiligheidscoördinatie doorgaans verplicht.'
      };
    }
    if (proc === 'general_contractor' || proc === 'design_build') {
      return {
        yes: true,
        reason: 'Hoofdaannemer/design-build werkt vaak met onderaannemers; coördinatie vaak alsnog relevant — indicatief.',
        confidence: 'low'
      };
    }
    if (proc === 'weet_niet') {
      return {
        yes: false,
        unresolved: true,
        reason: 'Procurement onbekend + meerdere trades — veiligheidscoördinatie mogelijk verplicht, kost open.'
      };
    }
    return {
      yes: false,
      unresolved: true,
      reason: 'Geen procurementModel gekozen — veiligheidscoördinatie niet automatisch opgenomen.'
    };
  }

  function safetyBand(works) {
    if (works < 100000) return { low: 450, expected: 550, high: 750 };
    if (works < 200000) return { low: 600, expected: 750, high: 1000 };
    return { low: 800, expected: 1100, high: 1600 };
  }

  function overrideOf(state, id) {
    var o = state.softCostOverrides || {};
    if (!Object.prototype.hasOwnProperty.call(o, id)) return null;
    var v = o[id];
    if (v === null || v === '' || typeof v === 'undefined') return null;
    if (v === 'exclude') return { exclude: true };
    var n = Number(v);
    if (!isFinite(n) || n < 0) return null;
    return { amount: n };
  }

  function applyOverride(baseLine, ov) {
    if (!ov) return baseLine;
    if (ov.exclude) {
      return Object.assign({}, baseLine, {
        included: false,
        low: 0,
        expected: 0,
        high: 0,
        userOverridden: true,
        status: 'EXCLUDED_BY_USER',
        explanation: (baseLine.explanation || '') + ' Uitgesloten via eigen inschatting.'
      });
    }
    var amt = round50(ov.amount);
    return Object.assign({}, baseLine, {
      included: true,
      low: amt,
      expected: amt,
      high: amt,
      userOverridden: true,
      status: 'USER_OVERRIDE',
      explanation: (baseLine.explanation || '') + ' Eigen inschatting (€' + amt + ').'
    });
  }

  function sumLines(lines) {
    var out = { low: 0, expected: 0, high: 0 };
    lines.forEach(function (l) {
      if (!l.included) return;
      out.low += l.low || 0;
      out.expected += l.expected || 0;
      out.high += l.high || 0;
    });
    return {
      low: round50(out.low),
      expected: round50(out.expected),
      high: round50(out.high)
    };
  }

  function buildVatSummary(worksLine, soft, procurement, reserveExpected) {
    var lines = [].concat(soft, procurement).filter(function (l) { return l.included; });
    var likely21 = lines.filter(function (l) { return l.vatTreatment === 'likely_21'; });
    var pot6 = worksLine ? [worksLine] : [];
    return {
      presentation: 'excl_vat',
      note: 'Projectbedragen zijn excl. btw. Het uiteindelijke btw-tarief kan per post verschillen (vaak 6% op aannemerswerken bij woning >10j privé; 21% op erelonen/studies).',
      worksVat: 'potentially_6_if_eligible',
      softCostsVat: 'likely_21',
      procurementVat: 'mixed_depends',
      reserveVat: 'unknown',
      indicativeScenario: null,
      classifications: {
        potentially_6: pot6.map(function (l) { return l.id; }),
        likely_21: likely21.map(function (l) { return l.id; }),
        mixed_depends: procurement.filter(function (l) { return l.included; }).map(function (l) { return l.id; }),
        unknown: ['reserve']
      },
      disclaimer: 'Geen enkele project-btw% toegepast — geen valse zekerheid.'
    };
  }

  function buildAllInCosts(ledger, reconciliation, calc2State, worksBands, reserveBands) {
    calc2State = calc2State || {};
    var worksExpected = (worksBands && worksBands.expected) || 0;
    var worksLow = (worksBands && worksBands.low) || 0;
    var worksHigh = (worksBands && worksBands.high) || 0;
    var reserveExpected = (reserveBands && reserveBands.expected) || 0;
    var reserveLow = (reserveBands && reserveBands.low) || 0;
    var reserveHigh = (reserveBands && reserveBands.high) || 0;

    var trades = activeTradeCount(ledger);
    var soft = [];
    var procurement = [];
    var unresolved = [];
    var warnings = [];

    /* ---- Architect ---- */
    var arch = architectApplicable(calc2State, trades);
    var archLine = line({
      id: 'architect_fees',
      label: 'Architectenereloon',
      category: 'soft',
      applicability: arch.reason,
      included: false,
      worksExpected: worksExpected,
      sourceType: RESEARCH.architect.sourceType,
      confidence: RESEARCH.architect.confidence,
      vatTreatment: 'likely_21',
      researchUrls: RESEARCH.architect.urls,
      explanation: RESEARCH.architect.note,
      status: 'NOT_APPLICABLE',
      resolution: RESOLUTION.NOT_APPLICABLE
    });
    if (arch.yes && worksExpected > 0) {
      archLine = line({
        id: 'architect_fees',
        label: 'Architectenereloon (marktindicatief)',
        category: 'soft',
        applicability: arch.reason,
        included: true,
        worksExpected: worksExpected,
        low: worksExpected * RESEARCH.architect.pctLow,
        expected: worksExpected * RESEARCH.architect.pctExpected,
        high: worksExpected * RESEARCH.architect.pctHigh,
        sourceType: RESEARCH.architect.sourceType,
        confidence: RESEARCH.architect.confidence,
        vatTreatment: 'likely_21',
        researchUrls: RESEARCH.architect.urls,
        explanation: RESEARCH.architect.note + ' ' + arch.reason,
        status: 'INCLUDED_INDICATIVE',
        resolution: RESOLUTION.RESOLVED_MARKET,
        forceMedium: true
      });
    }
    archLine = applyUserRes(archLine, CostRes && CostRes.normalizeUserResolution(calc2State, 'architect_fees', worksExpected), worksExpected);
    if (arch.yes && archLine.resolution === RESOLUTION.UNRESOLVED_MATERIAL) {
      unresolved.push({
        id: 'architect_fees', label: archLine.label, reason: arch.reason,
        materiality: 'HIGH', investorBlocking: true, userOverrideAllowed: true
      });
    }
    soft.push(archLine);

    /* ---- Structural engineer ---- */
    var str = structuralApplicable(calc2State);
    var strUser = CostRes && CostRes.normalizeUserResolution(calc2State, 'structural_engineer', worksExpected);
    var strLine = line({
      id: 'structural_engineer',
      label: 'Stabiliteitsingenieur',
      category: 'soft',
      applicability: str.reason,
      included: false,
      worksExpected: worksExpected,
      possibleImpact: 5000,
      sourceType: 'MODEL_ASSUMPTION',
      confidence: 'low',
      vatTreatment: 'likely_21',
      explanation: 'Geen betrouwbare nationale €-band. Vul bedrag in of bevestig NVT.',
      status: str.yes ? 'UNRESOLVED' : 'NOT_APPLICABLE',
      resolution: str.yes ? RESOLUTION.UNRESOLVED_MATERIAL : RESOLUTION.NOT_APPLICABLE,
      structural: true,
      forceCritical: str.yes,
      investorBlocking: str.yes
    });
    if (str.yes && !strUser) {
      unresolved.push({
        id: 'structural_engineer', label: 'Stabiliteitsingenieur', reason: str.reason,
        materiality: 'CRITICAL', investorBlocking: true, userOverrideAllowed: true
      });
    }
    strLine = applyUserRes(strLine, strUser, worksExpected);
    soft.push(strLine);

    /* ---- EPB regional ---- */
    var epb = epbApplicable(calc2State, trades);
    var epbLine = line({
      id: 'epb_reporter',
      label: 'EPB / energieverslaggeving',
      category: 'soft',
      applicability: epb.reason,
      included: false,
      worksExpected: worksExpected,
      sourceType: RESEARCH.epb.sourceType,
      confidence: RESEARCH.epb.confidence,
      vatTreatment: 'likely_21',
      researchUrls: RESEARCH.epb.urls,
      explanation: RESEARCH.epb.note,
      status: 'NOT_APPLICABLE',
      resolution: RESOLUTION.NOT_APPLICABLE,
      forceMedium: true
    });
    if (epb.unresolved) {
      epbLine = Object.assign({}, epbLine, {
        status: 'UNRESOLVED',
        resolution: RESOLUTION.UNRESOLVED_MATERIAL,
        investorBlocking: true
      });
      unresolved.push({
        id: 'epb_reporter', label: 'EPB / energieverslaggeving', reason: epb.reason,
        materiality: 'MEDIUM', investorBlocking: true, userOverrideAllowed: true
      });
    } else if (epb.yes) {
      var epbBand = epb.ierLike
        ? { low: 700, expected: 900, high: 1200 }
        : { low: 500, expected: 650, high: 900 };
      epbLine = line({
        id: 'epb_reporter',
        label: 'EPB-verslaggever (Vlaanderen)',
        category: 'soft',
        applicability: epb.reason,
        included: true,
        worksExpected: worksExpected,
        low: epbBand.low,
        expected: epbBand.expected,
        high: epbBand.high,
        sourceType: RESEARCH.epb.sourceType,
        confidence: RESEARCH.epb.confidence,
        vatTreatment: 'likely_21',
        researchUrls: RESEARCH.epb.urls,
        explanation: RESEARCH.epb.note,
        status: 'INCLUDED_INDICATIVE',
        resolution: RESOLUTION.RESOLVED_MARKET,
        forceMedium: true
      });
    }
    epbLine = applyUserRes(epbLine, CostRes && CostRes.normalizeUserResolution(calc2State, 'epb_reporter', worksExpected), worksExpected);
    soft.push(epbLine);

    /* ---- Safety ---- */
    var saf = safetyApplicable(calc2State, trades);
    var safLine = line({
      id: 'safety_coordinator',
      label: 'Veiligheidscoördinatie',
      category: 'soft',
      applicability: saf.reason,
      included: false,
      worksExpected: worksExpected,
      sourceType: RESEARCH.safety.sourceType,
      confidence: saf.confidence || RESEARCH.safety.confidence,
      vatTreatment: 'likely_21',
      researchUrls: RESEARCH.safety.urls,
      explanation: RESEARCH.safety.note,
      status: 'NOT_APPLICABLE',
      resolution: RESOLUTION.NOT_APPLICABLE,
      legalObligation: true
    });
    if (saf.unresolved) {
      safLine = Object.assign({}, safLine, {
        status: 'UNRESOLVED',
        resolution: RESOLUTION.UNRESOLVED_MATERIAL,
        investorBlocking: true,
        materiality: 'HIGH'
      });
      unresolved.push({
        id: 'safety_coordinator', label: 'Veiligheidscoördinatie', reason: saf.reason,
        materiality: 'HIGH', investorBlocking: true, userOverrideAllowed: true
      });
    } else if (saf.yes) {
      var sb = safetyBand(worksExpected);
      safLine = line({
        id: 'safety_coordinator',
        label: 'Veiligheidscoördinatie (indicatief forfait)',
        category: 'soft',
        applicability: saf.reason,
        included: true,
        worksExpected: worksExpected,
        low: sb.low,
        expected: sb.expected,
        high: sb.high,
        sourceType: RESEARCH.safety.sourceType,
        confidence: saf.confidence || RESEARCH.safety.confidence,
        vatTreatment: 'likely_21',
        researchUrls: RESEARCH.safety.urls,
        explanation: RESEARCH.safety.note,
        status: 'INCLUDED_INDICATIVE',
        resolution: RESOLUTION.RESOLVED_MARKET,
        legalObligation: true,
        forceMedium: true
      });
    }
    safLine = applyUserRes(safLine, CostRes && CostRes.normalizeUserResolution(calc2State, 'safety_coordinator', worksExpected), worksExpected);
    soft.push(safLine);

    /* ---- Permits ---- */
    var perm = permitApplicable(calc2State);
    var permLevel = !perm.yes ? 'likely_not_required'
      : (calc2State.structuralRisk === 'ja' || intensity(calc2State.scope, 'dak') === 'volledig')
        ? 'likely_required' : 'potentially_required';
    var permUser = CostRes && CostRes.normalizeUserResolution(calc2State, 'permits', worksExpected);
    var permLine = line({
      id: 'permits',
      label: 'Vergunningen / gemeentelijke retributies',
      category: 'soft',
      applicability: perm.reason,
      included: false,
      worksExpected: worksExpected,
      possibleImpact: 2500,
      sourceType: 'OFFICIAL_REGULATION',
      confidence: 'low',
      vatTreatment: 'mixed_depends',
      explanation: 'Geen nationale euroband. Bevestig NVT, onbekend, of vul € in.',
      status: perm.yes ? 'UNRESOLVED' : 'NOT_APPLICABLE',
      resolution: perm.yes ? RESOLUTION.UNRESOLVED_MATERIAL : RESOLUTION.NOT_APPLICABLE,
      permitApplicability: permLevel,
      forceMedium: perm.yes,
      investorBlocking: perm.yes
    });
    if (perm.yes && !permUser) {
      unresolved.push({
        id: 'permits', label: 'Vergunningen', reason: perm.reason + ' (' + permLevel + ')',
        materiality: 'MEDIUM', investorBlocking: true, userOverrideAllowed: true
      });
    }
    permLine = applyUserRes(permLine, permUser, worksExpected);
    soft.push(permLine);

    /* ---- Asbestos ---- */
    var asb = asbestosApplicable(calc2State, ledger);
    var asbLine = line({
      id: 'asbestos_study',
      label: 'Asbestonderzoek / inventaris',
      category: 'soft',
      applicability: asb.reason,
      included: false,
      worksExpected: worksExpected,
      sourceType: RESEARCH.asbestos.sourceType,
      confidence: RESEARCH.asbestos.confidence,
      vatTreatment: 'likely_21',
      researchUrls: RESEARCH.asbestos.urls,
      explanation: RESEARCH.asbestos.note,
      status: 'NOT_APPLICABLE',
      resolution: RESOLUTION.NOT_APPLICABLE
    });
    if (asb.unresolved) {
      asbLine = Object.assign({}, asbLine, {
        status: 'UNRESOLVED',
        resolution: RESOLUTION.UNRESOLVED_MATERIAL,
        investorBlocking: true,
        materiality: 'MEDIUM'
      });
      unresolved.push({
        id: 'asbestos_study', label: 'Asbestonderzoek', reason: asb.reason,
        materiality: 'MEDIUM', investorBlocking: true, userOverrideAllowed: true
      });
    } else if (asb.yes) {
      asbLine = line({
        id: 'asbestos_study',
        label: 'Asbestonderzoek / inventaris (indicatief)',
        category: 'soft',
        applicability: asb.reason,
        included: true,
        worksExpected: worksExpected,
        low: 450,
        expected: 550,
        high: 750,
        sourceType: RESEARCH.asbestos.sourceType,
        confidence: RESEARCH.asbestos.confidence,
        vatTreatment: 'likely_21',
        researchUrls: RESEARCH.asbestos.urls,
        explanation: RESEARCH.asbestos.note,
        status: 'INCLUDED_INDICATIVE',
        resolution: RESOLUTION.RESOLVED_MARKET
      });
    }
    asbLine = applyUserRes(asbLine, CostRes && CostRes.normalizeUserResolution(calc2State, 'asbestos_study', worksExpected), worksExpected);
    soft.push(asbLine);

    /* ---- Site temporary ---- */
    var profile = calc2State.propertyProfile || {};
    var heavySite = trades >= 5 || profile.condition === 'zwaar' || calc2State.structuralRisk === 'ja';
    var lightSite = trades <= 3 && profile.condition !== 'zwaar';
    var siteUser = CostRes && CostRes.normalizeUserResolution(calc2State, 'site_temporary', worksExpected);
    var siteLine = line({
      id: 'site_temporary',
      label: 'Project-werfinrichting (tijdelijke nuts/sanitair/cleanup)',
      category: 'soft',
      applicability: lightSite
        ? 'Lichte scope — Calc1 protect/scaffold meestal voldoende → NVT.'
        : 'Multi-trade/zware renovatie — project-level sitekosten mogelijk boven Calc1 protect.',
      included: false,
      worksExpected: worksExpected,
      possibleImpact: heavySite ? 3500 : 1000,
      sourceType: 'MODEL_ASSUMPTION',
      confidence: 'low',
      vatTreatment: 'potentially_6_if_eligible',
      explanation: 'Geen auto-€ (dubbeltelrisico met Calc1). Bevestig NVT of vul € in.',
      status: lightSite ? 'NOT_APPLICABLE' : 'UNRESOLVED',
      resolution: lightSite ? RESOLUTION.NOT_APPLICABLE : RESOLUTION.UNRESOLVED_MATERIAL,
      forceMedium: heavySite,
      investorBlocking: heavySite
    });
    if (!lightSite && !siteUser) {
      unresolved.push({
        id: 'site_temporary',
        label: siteLine.label,
        reason: siteLine.applicability,
        materiality: heavySite ? 'MEDIUM' : 'LOW',
        investorBlocking: heavySite,
        userOverrideAllowed: true
      });
    }
    if (lightSite && !siteUser) {
      siteLine = Object.assign({}, siteLine, {
        resolution: RESOLUTION.CONFIRMED_NOT_APPLICABLE,
        investorBlocking: false
      });
    }
    siteLine = applyUserRes(siteLine, siteUser, worksExpected);
    soft.push(siteLine);

    /* ---- Procurement: USER-ENTERED for GC / D&B (no auto %) ---- */
    var proc = calc2State.procurementModel;
    var procId = proc === 'design_build' ? 'design_build_overhead' : 'gc_coordination';
    var procUser = CostRes && CostRes.normalizeUserResolution(calc2State, procId, worksExpected);
    if (!procUser && proc === 'design_build') {
      procUser = CostRes && CostRes.normalizeUserResolution(calc2State, 'gc_coordination', worksExpected);
      if (procUser) procId = 'gc_coordination';
    }

    if (!proc) {
      unresolved.push({
        id: 'procurement_model',
        label: 'Organisatiemodel renovatie',
        reason: 'Nog niet gekozen.',
        materiality: 'HIGH',
        investorBlocking: true,
        userOverrideAllowed: false
      });
    } else if (proc === 'separate') {
      procurement.push(line({
        id: 'gc_coordination',
        label: 'Coördinatie hoofdaannemer',
        category: 'procurement',
        applicability: 'Losse vakmannen — geen GC-markup.',
        included: false,
        worksExpected: worksExpected,
        sourceType: 'MODEL_ASSUMPTION',
        confidence: 'high',
        vatTreatment: 'mixed_depends',
        explanation: 'Eigen coördinatie. Geen markup.',
        status: 'NOT_APPLICABLE',
        resolution: RESOLUTION.CONFIRMED_NOT_APPLICABLE,
        investorBlocking: false
      }));
    } else if (proc === 'general_contractor' || proc === 'design_build') {
      var procLabel = proc === 'design_build'
        ? 'Design & build overhead (eigen inschatting)'
        : 'Coördinatie / hoofdaannemer (eigen inschatting)';
      var procLine = line({
        id: procId,
        label: procLabel,
        category: 'procurement',
        applicability: RESEARCH.gc.note,
        included: false,
        worksExpected: worksExpected,
        possibleImpact: worksExpected * 0.2,
        sourceType: 'MODEL_ASSUMPTION',
        confidence: 'low',
        vatTreatment: 'mixed_depends',
        researchUrls: RESEARCH.gc.urls,
        explanation: 'Phase 4.7: geen automatische % — te zwakke BE-evidence. Vul € of % van works in.',
        status: 'UNRESOLVED',
        resolution: RESOLUTION.UNRESOLVED_MATERIAL,
        forceCritical: false,
        investorBlocking: true
      });
      if (!procUser) {
        unresolved.push({
          id: procId,
          label: procLabel,
          reason: 'GC/design-build kost vereist eigen inschatting (€ of %).',
          materiality: 'HIGH',
          investorBlocking: true,
          userOverrideAllowed: true
        });
      }
      procLine = applyUserRes(procLine, procUser, worksExpected);
      procurement.push(procLine);
    } else if (proc === 'weet_niet') {
      unresolved.push({
        id: 'gc_coordination',
        label: 'Coördinatie / aannemersmarge',
        reason: 'Procurement onbekend.',
        materiality: 'HIGH',
        investorBlocking: true,
        userOverrideAllowed: true
      });
      procurement.push(line({
        id: 'gc_coordination',
        label: 'Coördinatie / aannemersmarge',
        category: 'procurement',
        applicability: 'Onbekend organisatiemodel',
        included: false,
        worksExpected: worksExpected,
        possibleImpact: worksExpected * 0.2,
        sourceType: RESEARCH.gc.sourceType,
        confidence: 'low',
        vatTreatment: 'mixed_depends',
        explanation: RESEARCH.gc.note,
        status: 'UNRESOLVED',
        resolution: RESOLUTION.INSUFFICIENT_INFORMATION,
        investorBlocking: true
      }));
    }

    var softTot = sumLines(soft);
    var procTot = sumLines(procurement);

    var worksObj = {
      id: 'renovation_works',
      label: 'Renovatiewerken (gereconcilieerd)',
      low: round50(worksLow),
      expected: round50(worksExpected),
      high: round50(worksHigh),
      vatTreatment: 'potentially_6_if_eligible',
      explanation: 'Audited Calc2 works after overlap reconciliation. Excl. VAT.'
    };

    var reserveObj = {
      id: 'recommended_reserve',
      label: 'Projectreserve voor onvoorziene posten',
      low: round50(reserveLow),
      expected: round50(reserveExpected),
      high: round50(reserveHigh),
      sourceType: 'MODEL_ASSUMPTION',
      vatTreatment: 'unknown',
      explanation: 'Project interaction reserve — not stacked with Calc1 package contingency advisories.'
    };

    var nmi = (ledger.nmiKeys || []).length;
    var ok = ledger.raw ? ledger.raw.packageCount : 0;

    // No authoritative soft/procurement budget when there are zero priced works
    if (ok === 0) {
      soft.forEach(function (l) {
        if (!l.included) return;
        l.included = false;
        l.status = 'DEFERRED_NO_WORKS';
        unresolved.push({
          id: l.id,
          label: l.label,
          reason: 'Geen geprijsde werken — soft cost niet in all-in opgenomen.',
          impact: 'Eerst scope/details vervolledigen.',
          userOverrideAllowed: true
        });
        l.low = 0;
        l.expected = 0;
        l.high = 0;
      });
      procurement.forEach(function (l) {
        if (!l.included) return;
        l.included = false;
        l.status = 'DEFERRED_NO_WORKS';
        l.low = 0;
        l.expected = 0;
        l.high = 0;
      });
      softTot = { low: 0, expected: 0, high: 0 };
      procTot = { low: 0, expected: 0, high: 0 };
    }

    var budgetLow = round50(worksObj.low + softTot.low + procTot.low + reserveObj.low);
    var budgetExpected = round50(worksObj.expected + softTot.expected + procTot.expected + reserveObj.expected);
    var budgetHigh = round50(worksObj.high + softTot.high + procTot.high + reserveObj.high);
    if (ok === 0) {
      budgetLow = 0;
      budgetExpected = 0;
      budgetHigh = 0;
    }
    if (budgetLow > budgetExpected) budgetLow = round50(budgetExpected * 0.92);
    if (budgetHigh < budgetExpected) budgetHigh = round50(budgetExpected * 1.12);

    /* Drop unresolved flags cleared by user resolution on the live line */
    unresolved = unresolved.filter(function (u) {
      var match = soft.concat(procurement).filter(function (l) { return l.id === u.id; })[0];
      if (!match) return true;
      if (match.resolution === RESOLUTION.RESOLVED_USER ||
          match.resolution === RESOLUTION.CONFIRMED_NOT_APPLICABLE ||
          match.investorBlocking === false && match.userOverridden) {
        return false;
      }
      return true;
    });

    var allInStatus = 'ALL_IN_COMPLETE';
    if (ok === 0 && nmi === 0) allInStatus = 'INSUFFICIENT_INFORMATION';
    else if (nmi > 0) allInStatus = 'PARTIAL_ESTIMATE';
    else if (unresolved.length > 0 || !proc || proc === 'weet_niet') allInStatus = 'ALL_IN_INDICATIVE';
    else {
      var weak = soft.concat(procurement).some(function (l) {
        return l.included && (l.confidence === 'low' || l.status === 'INCLUDED_INDICATIVE');
      });
      if (weak) allInStatus = 'ALL_IN_INDICATIVE';
    }

    return {
      works: worksObj,
      softCosts: soft,
      procurementCosts: procurement,
      unresolvedCosts: unresolved,
      reserve: reserveObj,
      softTotals: softTot,
      procurementTotals: procTot,
      vatSummary: buildVatSummary(worksObj, soft, procurement, reserveExpected),
      recommendedBudget: {
        low: budgetLow,
        expected: budgetExpected,
        high: budgetHigh,
        basis: 'excl_vat_before_mixed_vat'
      },
      procurementModel: proc || null,
      tradeCount: trades,
      allInStatus: allInStatus,
      warnings: warnings,
      research: RESEARCH,
      version: 'calc2-phase4.6-all-in'
    };
  }

  return {
    PROCUREMENT: PROCUREMENT,
    RESEARCH: RESEARCH,
    buildAllInCosts: buildAllInCosts,
    architectApplicable: architectApplicable,
    safetyApplicable: safetyApplicable,
    epbApplicable: epbApplicable
  };
});
