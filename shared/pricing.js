/* ============================================================
   ELYAN — Componentprijsengine België 2026
   Single source of truth voor client + server.
   Werkpakketten → materiaal / manuren / overige → low/base/high
   ============================================================ */
(function (root, factory) {
  var market;
  if (typeof module === 'object' && module.exports) {
    market = require('./market-data-2026');
    module.exports = factory(market);
  } else {
    root.ElyanPricing = factory(root.ElyanMarketData);
  }
})(typeof self !== 'undefined' ? self : this, function (MARKET) {
  'use strict';

  if (!MARKET) {
    throw new Error('ELYAN: market-data-2026 ontbreekt');
  }

  var CATEGORIES = {
    badkamer: {
      label: 'Badkamer',
      resultNoun: 'badkamerrenovatie',
      icon: 'i-bath',
      split: { materiaal: 0.40, arbeid: 0.48, overige: 0.12 },
      premieNote: 'Voor een klassieke badkamerrenovatie bestaat doorgaans geen specifieke energiepremie, tenzij aanpassingen voor senioren of personen met een beperking. Check altijd het officiële loket van jouw regio.'
    },
    keuken: {
      label: 'Keuken',
      resultNoun: 'keukenrenovatie',
      icon: 'i-utensils',
      split: { materiaal: 0.55, arbeid: 0.35, overige: 0.10 },
      premieNote: 'Voor een keukenrenovatie op zich bestaat doorgaans geen specifieke renovatiepremie. Energiepremies raken hoogstens toestellen of isolatie elders in de woning.'
    },
    dak: {
      label: 'Dak',
      resultNoun: 'dakrenovatie',
      icon: 'i-roof',
      split: { materiaal: 0.45, arbeid: 0.45, overige: 0.10 },
      premieNote: 'Dakisolatie kan relevant zijn voor Mijn VerbouwPremie (Vlaanderen), Primes Habitation of Renolution — afhankelijk van regio, inkomen en eigendomstype. Sinds 1 maart 2026 gelden strengere MVP-regels voor hogere inkomens.'
    },
    vloeren: {
      label: 'Vloeren',
      resultNoun: 'vloerrenovatie',
      icon: 'i-layers',
      split: { materiaal: 0.45, arbeid: 0.45, overige: 0.10 },
      premieNote: 'Bij vloerisolatie kan een energiepremie relevant zijn. Een afwerkingsvloer op zich geeft meestal geen premie.'
    },
    schilderwerken: {
      label: 'Schilderwerken',
      resultNoun: 'schilderwerken',
      icon: 'i-roller',
      split: { materiaal: 0.20, arbeid: 0.70, overige: 0.10 },
      premieNote: 'Voor schilderwerken op zich zijn er doorgaans geen premies beschikbaar.'
    },
    ramen: {
      label: 'Ramen & deuren',
      resultNoun: 'ramenrenovatie',
      icon: 'i-window',
      split: { materiaal: 0.55, arbeid: 0.35, overige: 0.10 },
      premieNote: 'Hoogisolerende beglazing of schrijnwerk kan relevant zijn voor energiepremies (MVP / regionale loketten), afhankelijk van U-waarde, inkomen en eigendomstype.'
    },
    isolatie: {
      label: 'Isolatie',
      resultNoun: 'isolatiewerken',
      icon: 'i-insulation',
      split: { materiaal: 0.45, arbeid: 0.45, overige: 0.10 },
      premieNote: 'Muur-, dak-, zolder- of vloerisolatie kan in aanmerking komen voor Mijn VerbouwPremie of regionale premies — check technische eisen (Rd) en inkomenscategorie sinds 1 maart 2026.'
    },
    verwarming: {
      label: 'Verwarming & warmtepomp',
      resultNoun: 'verwarmingsrenovatie',
      icon: 'i-heat',
      split: { materiaal: 0.55, arbeid: 0.35, overige: 0.10 },
      premieNote: 'Warmtepompen en bepaalde verwarmingsrenovaties kunnen premie-gevoelig zijn. Isolatiegraad van de woning bepaalt of een warmtepomp zinvol is — laat dit technisch bevestigen.'
    },
    elektriciteit: {
      label: 'Elektriciteit',
      resultNoun: 'elektriciteitsrenovatie',
      icon: 'i-bolt',
      split: { materiaal: 0.35, arbeid: 0.55, overige: 0.10 },
      premieNote: 'Voor een klassieke elektra-renovatie bestaat doorgaans geen specifieke energiepremie, tenzij gekoppeld aan laadpaal, PV of andere energie-ingrepen.'
    },
    gevel: {
      label: 'Gevel',
      resultNoun: 'gevelrenovatie',
      icon: 'i-facade',
      split: { materiaal: 0.40, arbeid: 0.45, overige: 0.15 },
      premieNote: 'Gevelisolatie (ETICS) kan premie-relevant zijn; louter reinigen of voegen meestal niet. Check het officiële loket van jouw regio.'
    },
    zonnepanelen: {
      label: 'Zonnepanelen',
      resultNoun: 'zonnepaneleninstallatie',
      icon: 'i-solar',
      split: { materiaal: 0.60, arbeid: 0.30, overige: 0.10 },
      premieNote: 'Premies en nettarieven voor PV wijzigen regelmatig per regio. ELYAN geeft geen gegarandeerde besparing of terugverdientijd — vraag actuele steun na bij het officiële loket.'
    },
    ventilatie: {
      label: 'Ventilatie',
      resultNoun: 'ventilatiewerken',
      icon: 'i-vent',
      split: { materiaal: 0.45, arbeid: 0.45, overige: 0.10 },
      premieNote: 'Ventilatiesystemen kunnen in sommige regio’s gekoppeld zijn aan renovatie- of energiepremies, vooral bij nieuw Systeem D. Check voorwaarden per gewest.'
    }
  };

  var PROVINCES = {
    antwerpen: { label: 'Antwerpen', mult: 1.05, region: 'vlaanderen' },
    brussel: { label: 'Brussel', mult: 1.12, region: 'brussel' },
    henegouwen: { label: 'Henegouwen', mult: 0.95, region: 'wallonie' },
    limburg: { label: 'Limburg', mult: 0.97, region: 'vlaanderen' },
    luik: { label: 'Luik', mult: 0.96, region: 'wallonie' },
    luxemburg: { label: 'Luxemburg', mult: 0.93, region: 'wallonie' },
    namen: { label: 'Namen', mult: 0.95, region: 'wallonie' },
    'oost-vlaanderen': { label: 'Oost-Vlaanderen', mult: 1.02, region: 'vlaanderen' },
    'vlaams-brabant': { label: 'Vlaams-Brabant', mult: 1.06, region: 'vlaanderen' },
    'waals-brabant': { label: 'Waals-Brabant', mult: 1.06, region: 'wallonie' },
    'west-vlaanderen': { label: 'West-Vlaanderen', mult: 1.00, region: 'vlaanderen' }
  };

  var REGION_LINKS = {
    vlaanderen: { label: 'Mijn VerbouwPremie (Vlaanderen)', url: 'https://www.mijnverbouwpremie.be' },
    wallonie: { label: 'Primes Habitation (Wallonie)', url: 'https://energie.wallonie.be' },
    brussel: { label: 'Renolution (Brussel)', url: 'https://leefmilieu.brussels/professionelen/subsidies/renolution-premies' }
  };

  var BTW_TIP = 'Indicatief btw-scenario: bij een privéwoning die minstens 10 jaar in gebruik is, kan onder wettelijke voorwaarden 6% btw gelden i.p.v. 21%. Het definitieve tarief moet door de aannemer worden bevestigd.';

  var PRAKTISCHE_TIPS = [
    'Vergelijk offertes op scope, niet alleen op totaalprijs: afbraak, afvoer, steiger, btw en garanties.',
    'Voorzie een buffer gekoppeld aan de onzekerheid van jouw project (typisch 10–15%).',
    'Controleer het ondernemingsnummer en erkenning van je aannemer.',
    'Leg timing, meerwerken en betalingsschema schriftelijk vast.'
  ];

  var VOLGENDE_STAPPEN = [
    'Controleer oppervlakte en scope van jouw project aan de hand van dit rapport.',
    'Verzamel foto\'s of plannen en vraag minstens 3 vergelijkbare offertes.',
    'Gebruik de ELYAN-kostentabel als referentie bij het vergelijken.',
    'Laat btw-tarief en eventuele premievoorwaarden expliciet bevestigen.',
    'Leg scope, planning en buffer schriftelijk vast vóór start.'
  ];

  var LEVEL_LABEL = { basis: 'Basis', standaard: 'Standaard', premium: 'Premium' };
  var LEVEL_MAT = { basis: 0.88, standaard: 1.0, premium: 1.28 };
  var LEVEL_LABOUR = { basis: 0.95, standaard: 1.0, premium: 1.08 };

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  function round10(n) {
    return Math.round(Number(n) / 10) * 10;
  }

  function fmtEUR(n) {
    return '€ ' + Math.round(n).toLocaleString('nl-BE');
  }

  function fmtEURDecimal(n, digits) {
    var d = digits == null ? 2 : digits;
    return '€ ' + Number(n).toLocaleString('nl-BE', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  /** Display-only size/unit helpers — does not alter pricing amounts. */
  function sizeDisplay(type, answers, result) {
    answers = answers || {};
    result = result || {};
    var size = result.size != null ? result.size : answers.size;
    if (type === 'zonnepanelen') {
      var kwp = Math.max(0.5, Number(size) || Number(answers.kwp) || 1);
      var kwpText = (Math.round(kwp * 10) / 10) + ' kWp';
      if (answers.sizeMode === 'panels') {
        var panelWp = (MARKET.solar && MARKET.solar.panelWp && MARKET.solar.panelWp.value) || 400;
        var panels = Math.max(1, Number(answers.panelCount) || Math.round((kwp * 1000) / panelWp));
        return {
          kind: 'kWp',
          fieldLabel: 'Vermogen',
          text: panels + ' panelen · ' + kwpText,
          short: kwpText
        };
      }
      return {
        kind: 'kWp',
        fieldLabel: 'Vermogen',
        text: kwpText,
        short: kwpText
      };
    }
    return {
      kind: 'm2',
      fieldLabel: 'Oppervlakte',
      text: (size != null ? size : '—') + ' m²',
      short: (size != null ? size : '—') + ' m²'
    };
  }

  function unitRateDisplay(type, result) {
    result = result || {};
    if (type === 'zonnepanelen') {
      var kwp = Math.max(0.5, Number(result.size) || 1);
      var perWp = Math.round(((Number(result.price) || 0) / (kwp * 1000)) * 100) / 100;
      return {
        kind: 'Wp',
        value: perWp,
        label: '€ / Wp',
        suffix: '/Wp',
        formatted: fmtEURDecimal(perWp, 2)
      };
    }
    var perM2 = Number(result.perM2) || 0;
    return {
      kind: 'm2',
      value: perM2,
      label: '€ / m²',
      suffix: '/m²',
      formatted: fmtEUR(perM2)
    };
  }

  function isValidEmail(v) {
    return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  }

  function pick(map, key, fallback) {
    return map[key] !== undefined ? map[key] : fallback;
  }

  function band(obj) {
    if (!obj) return { low: 0, base: 0, high: 0 };
    if (typeof obj === 'number') return { low: obj, base: obj, high: obj };
    return {
      low: Number(obj.low) || 0,
      base: Number(obj.base) || 0,
      high: Number(obj.high) || 0
    };
  }

  function scaleBand(b, factor) {
    return { low: b.low * factor, base: b.base * factor, high: b.high * factor };
  }

  function addBands(a, b) {
    return { low: a.low + b.low, base: a.base + b.base, high: a.high + b.high };
  }

  function weeksFromDays(days) {
    var calDays = Math.max(1, days * 1.35);
    var weeksLow = Math.max(1, Math.round((calDays / 7) * 0.9));
    var weeksHigh = Math.max(weeksLow + 1, Math.round((calDays / 7) * 1.35));
    return { weeksLow: weeksLow, weeksHigh: weeksHigh };
  }

  function rateFor(trade, complexity) {
    var r = MARKET.labour[trade] || MARKET.labour.general;
    var c = complexity || 1;
    return {
      low: r.low * Math.min(1, c),
      base: r.base * c,
      high: r.high * Math.max(1, c)
    };
  }

  /* ---------- work package builder ---------- */

  function createPackage(id, label, opts) {
    opts = opts || {};
    var mat = band(opts.material);
    var hours = band(opts.labourHours);
    var other = band(opts.other);
    var rate = opts.labourRate || MARKET.labour.general.base;
    var rateBand = typeof rate === 'object' ? band(rate) : { low: rate * 0.92, base: rate, high: rate * 1.08 };

    var labourAmt = {
      low: hours.low * rateBand.low,
      base: hours.base * rateBand.base,
      high: hours.high * rateBand.high
    };

    return {
      id: id,
      label: label,
      materialLow: round10(mat.low),
      materialBase: round10(mat.base),
      materialHigh: round10(mat.high),
      labourHoursLow: Math.round(hours.low * 10) / 10,
      labourHoursBase: Math.round(hours.base * 10) / 10,
      labourHoursHigh: Math.round(hours.high * 10) / 10,
      labourRate: Math.round(rateBand.base),
      labourLow: round10(labourAmt.low),
      labourBase: round10(labourAmt.base),
      labourHigh: round10(labourAmt.high),
      otherLow: round10(other.low),
      otherBase: round10(other.base),
      otherHigh: round10(other.high),
      totalLow: round10(mat.low + labourAmt.low + other.low),
      totalBase: round10(mat.base + labourAmt.base + other.base),
      totalHigh: round10(mat.high + labourAmt.high + other.high),
      reason: opts.reason || ''
    };
  }

  function sumPackages(packages, keyLow, keyBase, keyHigh) {
    var out = { low: 0, base: 0, high: 0 };
    packages.forEach(function (p) {
      out.low += p[keyLow] || 0;
      out.base += p[keyBase] || 0;
      out.high += p[keyHigh] || 0;
    });
    return out;
  }

  function applyRegion(packages, mult) {
    return packages.map(function (p) {
      var m = mult;
      return createPackage(p.id, p.label, {
        material: { low: p.materialLow * m, base: p.materialBase * m, high: p.materialHigh * m },
        labourHours: { low: p.labourHoursLow, base: p.labourHoursBase, high: p.labourHoursHigh },
        labourRate: { low: p.labourRate * 0.92 * m, base: p.labourRate * m, high: p.labourRate * 1.08 * m },
        other: { low: p.otherLow * m, base: p.otherBase * m, high: p.otherHigh * m },
        reason: p.reason
      });
    });
  }

  function vatScenario(housingAge) {
    var indicativeRate = (housingAge === 'middel' || housingAge === 'oud')
      ? MARKET.vat.reducedRenovation
      : MARKET.vat.standard;
    return {
      rate: indicativeRate,
      label: indicativeRate === 0.06 ? '6% (indicatief renovatie)' : '21% (standaard)',
      disclaimer: 'Indicatief btw-scenario op basis van woningouderdom. Definitief btw-tarief moet door de aannemer worden bevestigd op basis van de wettelijke voorwaarden.'
    };
  }

  function contingencyFor(answers, packages) {
    var unknown = 0;
    Object.keys(answers || {}).forEach(function (k) {
      if (answers[k] === 'onbekend' || answers[k] === 'mogelijk') unknown++;
    });
    var cfg = MARKET.contingency.normal;
    if (unknown >= 2 || answers.asbestos === 'ja' || answers.substrate === 'slecht' || answers.surface === 'slecht') {
      cfg = MARKET.contingency.highUncertainty;
    } else if (unknown === 0 && answers.access !== 'moeilijk' && answers.plumbingMove !== 'ja' && answers.connections !== 'ja') {
      cfg = MARKET.contingency.lowUncertainty;
    }
    return cfg;
  }

  function premieInfo(type, answers, provKey) {
    var prov = PROVINCES[provKey];
    var region = prov ? prov.region : 'vlaanderen';
    var link = REGION_LINKS[region];
    var items = [];

    if (region === 'vlaanderen') {
      if (type === 'dak' && (answers.insulation === 'ja' || answers.workType === 'isolatie' || answers.workType === 'volledig')) {
        items.push({
          scheme: 'Mijn VerbouwPremie — dakisolatie',
          relevance: 'mogelijk',
          reason: 'Dakisolatie kan premie-gevoelig zijn, maar sinds 1 maart 2026 komen eigenaar-bewoners uit inkomenscategorie 1 en 2 hiervoor niet meer in aanmerking. Categorie 3 en 4 behouden mogelijkheden.',
          conditions: [
            'Eigendomstype en inkomenscategorie bepalen de toegang',
            'Technische eisen (o.a. Rd-waarde) moeten gehaald worden',
            'Aanvraag op basis van factuur, binnen de geldende termijnen'
          ],
          missing: ['Inkomen / categorie', 'Eigendomstype (eigenaar-bewoner of investeerder)', 'Exacte isolatiespecificatie'],
          officialUrl: link.url,
          checkedAt: MARKET.meta.asOf,
          regulationDate: '2026-03-01'
        });
      } else if (type === 'vloeren' && answers.ufh === 'nieuw') {
        items.push({
          scheme: 'Mijn VerbouwPremie — vloerisolatie / energie',
          relevance: 'mogelijk',
          reason: 'Alleen relevant als er effectief vloerisolatie of een premiewaardige energie-ingreep gebeurt — niet voor enkel een afwerkingsvloer.',
          conditions: ['Inkomenscategorie 3 of 4 (of specifieke uitzonderingen)', 'Technische eisen'],
          missing: ['Of isolatie deel uitmaakt van de werken', 'Inkomen'],
          officialUrl: link.url,
          checkedAt: MARKET.meta.asOf,
          regulationDate: '2026-03-01'
        });
      } else {
        items.push({
          scheme: link.label,
          relevance: 'beperkt',
          reason: CATEGORIES[type].premieNote,
          conditions: ['Controleer of jouw werken onder een premiecategorie vallen'],
          missing: ['Inkomen', 'Eigendomstype'],
          officialUrl: link.url,
          checkedAt: MARKET.meta.asOf,
          regulationDate: '2026-03-01'
        });
      }
    } else {
      items.push({
        scheme: link.label,
        relevance: 'mogelijk',
        reason: 'Regionale premies verschillen. Raadpleeg het officiële loket voor actuele voorwaarden.',
        conditions: ['Regiospecifieke voorwaarden'],
        missing: ['Persoonlijke premievoorwaarden'],
        officialUrl: link.url,
        checkedAt: MARKET.meta.asOf,
        regulationDate: null
      });
    }

    return items;
  }

  function enrichBm(src, sizeOrFactor, opts) {
    opts = opts || {};
    var factor = opts.factor != null ? opts.factor : (sizeOrFactor || 1);
    var low = (src && src.low != null ? src.low : 0) * factor;
    var high = (src && src.high != null ? src.high : 0) * factor;
    return {
      low: round50(low),
      high: round50(high),
      unit: opts.unit || (src && src.unit) || 'EUR',
      vatStatus: (src && src.vatStatus) || opts.vatStatus || 'excl',
      kind: (src && src.kind) || opts.kind || 'marketBenchmark',
      scope: (src && src.scope) || opts.scope || '',
      scopeMatch: opts.scopeMatch || 'direct',
      reason: (src && src.reason) || opts.reason || '',
      sources: (src && src.sources) || opts.sources || [],
      softSources: (src && src.softSources) || [],
      compareMode: opts.compareMode || 'total',
      excludePackageIds: opts.excludePackageIds || null,
      label: opts.label || ''
    };
  }

  function marketBenchmark(type, answers, size) {
    if (type === 'dak') {
      var roof = MARKET.roof.benchmarks;
      var exclExtras = ['scaffold', 'gutters', 'asbestos', 'asbestos-survey'];
      if (answers.workType === 'herstelling') {
        return enrichBm(
          { low: 50, high: 120, unit: 'EUR/m2', vatStatus: 'excl', kind: 'modelAssumption',
            scope: 'Lokale herstelling (geen publicatie-identieke band)', reason: 'Afgeleid van cover-only lower range' },
          size * 0.45,
          { scopeMatch: 'not-direct', compareMode: 'exScaffoldEtc', excludePackageIds: exclExtras, label: 'Herstelling (model)' }
        );
      }
      if (answers.workType === 'isolatie') {
        var isoSrc = answers.roofType === 'plat' ? roof.flatCoverInsulation : roof.pitchedCoverInsulation;
        return enrichBm(isoSrc, size, {
          scopeMatch: 'direct',
          compareMode: 'exScaffoldEtc',
          excludePackageIds: exclExtras,
          label: 'Bedekking+isolatie / isolatiewerken'
        });
      }
      if (answers.workType === 'vernieuwen') {
        var coverSrc = answers.roofType === 'plat' ? roof.flatCoverOnly : roof.pitchedCoverOnly;
        return enrichBm(coverSrc, size, {
          scopeMatch: answers.insulation === 'ja' ? 'not-direct' : 'direct',
          compareMode: 'exScaffoldEtc',
          excludePackageIds: exclExtras,
          label: 'Enkel bedekking',
          reason: answers.insulation === 'ja'
            ? 'ELYAN heeft ook isolatie; cover-only benchmark is niet-direct voor het totaal'
            : coverSrc.reason
        });
      }
      // volledig
      if (answers.roofType === 'plat') {
        return enrichBm(roof.flatCoverInsulation, size, {
          scopeMatch: 'direct',
          compareMode: 'exScaffoldEtc',
          excludePackageIds: exclExtras,
          label: 'Plat bedekking+isolatie'
        });
      }
      return enrichBm(roof.pitchedFullComparable, size, {
        scopeMatch: 'direct',
        compareMode: 'exScaffoldEtc',
        excludePackageIds: exclExtras,
        label: 'Hellend volledig (zonder steiger/goten/asbest)'
      });
    }

    if (type === 'badkamer') {
      var b = MARKET.bathroom.benchmarks;
      var bandSrc = answers.scope === 'opfrissing' ? b.light
        : answers.scope === 'gedeeltelijk' ? b.partial
        : answers.level === 'premium' ? b.premium : b.fullStandard;
      var sf = Math.max(0.75, Math.min(1.4, size / 8));
      var label = answers.scope === 'opfrissing' ? 'Light/basic'
        : answers.scope === 'gedeeltelijk' ? 'Gedeeltelijk'
        : answers.level === 'premium' ? 'Premium' : 'Volledig standaard';
      return enrichBm(bandSrc, sf, {
        unit: 'EUR/project',
        scopeMatch: 'direct',
        label: label
      });
    }

    if (type === 'keuken') {
      var k = MARKET.kitchen.benchmarks;
      var kSrc;
      var kLabel;
      if (answers.scope === 'fronten') {
        return enrichBm(
          { low: 3500, high: 9000, vatStatus: 'unclear→soft', kind: 'modelAssumption',
            scope: 'Facelift/fronten — geen harde BE €/project-publicatie', reason: 'Soft derived from Alkeba lower band' },
          1,
          { scopeMatch: 'not-direct', label: 'Fronten (soft)', unit: 'EUR/project' }
        );
      }
      if (answers.cabinets === 'hoog' || answers.level === 'premium') {
        kSrc = k.premium; kLabel = 'Premium (soft BE)';
      } else if (answers.cabinets === 'budget' || answers.level === 'basis') {
        kSrc = k.budget; kLabel = 'Budget (BE)';
      } else {
        kSrc = k.mid; kLabel = 'Midden (BE excl. Tipsentricks)';
      }
      var kMatch = 'direct';
      if (kSrc.vatStatus && String(kSrc.vatStatus).indexOf('unclear') !== -1) kMatch = 'soft';
      if (answers.scope === 'herindelen' || answers.connections === 'ja') kMatch = 'not-direct';
      return enrichBm(kSrc, 1, {
        unit: 'EUR/project',
        scopeMatch: kMatch,
        label: kLabel
      });
    }

    if (type === 'vloeren') {
      var key = answers.floorMaterial === 'parket' ? 'parket'
        : answers.floorMaterial === 'tegel' ? 'tegel'
        : answers.floorMaterial === 'gietvloer' ? 'gietvloer'
        : answers.floorMaterial === 'vinyl' ? 'vinyl' : 'laminaat';
      var f = MARKET.floors.benchmarksBaseInstall[key] || MARKET.floors.benchmarksBaseInstall.laminaat;
      var prep = MARKET.floors.prep;
      var fLow = f.low * size;
      var fHigh = f.high * size;
      var scopeParts = ['basisplaatsing ' + key];
      var match = 'direct';
      if (answers.removal === 'ja') {
        fLow += prep.removal.low * size;
        fHigh += prep.removal.high * size;
        scopeParts.push('uitbraak');
        match = 'direct'; // prep added to both sides
      }
      if (answers.leveling === 'volledig' || answers.substrate === 'slecht') {
        fLow += prep.levelingFull.low * size;
        fHigh += prep.levelingFull.high * size;
        scopeParts.push('volledige egalisatie');
      } else if (answers.leveling === 'beperkt' || answers.substrate === 'matig') {
        fLow += prep.levelingLimited.low * size;
        fHigh += prep.levelingLimited.high * size;
        scopeParts.push('beperkte egalisatie');
      }
      if (answers.ufh === 'nieuw') {
        fLow += 55 * size;
        fHigh += 95 * size;
        scopeParts.push('UFH (model)');
        match = 'not-direct';
      }
      if (answers.skirting === 'ja') {
        fLow += 3.5 * size;
        fHigh += 7 * size;
        scopeParts.push('plinten');
      }
      return enrichBm(
        {
          low: fLow, high: fHigh, unit: 'EUR/project', vatStatus: 'excl',
          kind: f.kind, sources: f.sources, softSources: f.softSources,
          scope: scopeParts.join(' + '),
          reason: f.reason + ' — prep-adders apart van base-install waar van toepassing'
        },
        1,
        { scopeMatch: match, label: 'Vloer ' + key + (match === 'not-direct' ? ' (UFH niet-direct)' : '') }
      );
    }

    if (type === 'schilderwerken') {
      var p = answers.paintScope === 'buiten' || answers.paintScope === 'beide'
        ? MARKET.painting.benchmarks.exteriorAllIn
        : MARKET.painting.benchmarks.interiorAllIn;
      var paintMatch = 'direct';
      if (answers.woodwork === 'beperkt' || answers.woodwork === 'uitgebreid') paintMatch = 'not-direct';
      if (answers.floors === '2' || answers.floors === '3plus') paintMatch = 'not-direct';
      return enrichBm(p, size, {
        scopeMatch: paintMatch,
        label: answers.paintScope === 'buiten' ? 'Buiten all-in excl.' : 'Binnen all-in excl.',
        reason: paintMatch === 'not-direct'
          ? 'Benchmark is all-in muren/plafonds; schrijnwerk/steiger in ELYAN maakt totaal niet-direct vergelijkbaar'
          : p.reason
      });
    }

    if (type === 'ramen') {
      var wFrame = answers.frame || 'pvc';
      var wBm = wFrame === 'aluminium' ? MARKET.windows.benchmarks.aluminiumAllIn
        : wFrame === 'hout' ? MARKET.windows.benchmarks.woodAllIn
        : MARKET.windows.benchmarks.pvcAllIn;
      var wMatch = 'direct';
      if (answers.sliding === 'ja' || answers.sliding === 'groot' || answers.doors === '1' || answers.doors === '2plus') {
        wMatch = 'not-direct';
      }
      return enrichBm(wBm, size, {
        scopeMatch: wMatch,
        label: 'Ramen ' + wFrame + ' all-in',
        excludePackageIds: ['doors', 'removal'],
        compareMode: wMatch === 'not-direct' ? 'exScaffoldEtc' : 'total'
      });
    }

    if (type === 'isolatie') {
      var isoKey = answers.subtype || 'spouw';
      var isoBm = MARKET.insulation.benchmarks[isoKey] || MARKET.insulation.benchmarks.spouw;
      return enrichBm(isoBm, size, {
        scopeMatch: (answers.finish && answers.finish !== 'nee') ? 'not-direct' : 'direct',
        label: 'Isolatie ' + isoKey
      });
    }

    if (type === 'verwarming') {
      var ht = answers.projectType || 'ketel_vervangen';
      var hBm = ht === 'lucht_water' ? MARKET.heating.benchmarks.lucht_water
        : ht === 'hybride' ? MARKET.heating.benchmarks.hybride
        : ht === 'vloerverwarming' ? null
        : ht === 'radiatoren' ? MARKET.heating.benchmarks.radiatoren
        : MARKET.heating.benchmarks.ketel;
      if (ht === 'vloerverwarming') {
        return enrichBm(MARKET.heating.benchmarks.vloerverwarming, size, {
          scopeMatch: 'direct',
          label: 'Vloerverwarming €/m²'
        });
      }
      var hMatch = (answers.insulationLevel === 'slecht' && ht === 'lucht_water') ? 'not-direct' : 'direct';
      return enrichBm(hBm, 1, {
        unit: 'EUR/project',
        scopeMatch: hMatch,
        label: 'Verwarming ' + ht
      });
    }

    if (type === 'elektriciteit') {
      var eScope = answers.scope || 'partieel';
      var eBm = (eScope === 'volledig' || eScope === 'renovatie_volledig')
        ? MARKET.electrical.benchmarks.full
        : MARKET.electrical.benchmarks.partial;
      return enrichBm(eBm, size, {
        scopeMatch: answers.board === 'nieuw' ? 'not-direct' : 'direct',
        label: eScope === 'partieel' ? 'Partieel €/m²' : 'Volledig €/m²'
      });
    }

    if (type === 'gevel') {
      var gInt = answers.intervention || 'crepi';
      var gBm = MARKET.facade.benchmarks[gInt] || MARKET.facade.benchmarks.crepi;
      return enrichBm(gBm, size, {
        scopeMatch: (answers.scaffold === 'middel' || answers.scaffold === 'hoog') ? 'not-direct' : 'direct',
        label: 'Gevel ' + gInt,
        excludePackageIds: ['scaffold'],
        compareMode: 'exScaffoldEtc'
      });
    }

    if (type === 'zonnepanelen') {
      // calcZonnepanelen normalizes answers.size to kWp before finalize
      var wp = size * 1000;
      return enrichBm(MARKET.solar.benchmarks.perWp, wp, {
        unit: 'EUR/project',
        scopeMatch: answers.battery === 'ja' ? 'not-direct' : 'direct',
        label: 'PV €/Wp (zonder batterij)',
        excludePackageIds: ['battery'],
        compareMode: answers.battery === 'ja' ? 'exScaffoldEtc' : 'total'
      });
    }

    if (type === 'ventilatie') {
      var vSys = answers.system || 'systeem_c';
      var vBm = MARKET.ventilation.benchmarks[vSys] || MARKET.ventilation.benchmarks.systeem_c;
      var vScale = Math.max(0.75, Math.min(1.4, size / ((MARKET.ventilation.refSizeM2 && MARKET.ventilation.refSizeM2.value) || 120)));
      return enrichBm(vBm, vScale, {
        unit: 'EUR/project',
        scopeMatch: answers.routing === 'complex' ? 'not-direct' : 'direct',
        label: 'Ventilatie ' + vSys
      });
    }

    return enrichBm({ low: 0, high: 0 }, 1, { scopeMatch: 'not-direct', kind: 'modelAssumption' });
  }

  function comparableSubtotal(packages, excludeIds) {
    if (!excludeIds || !excludeIds.length) {
      return sumPackages(packages, 'totalLow', 'totalBase', 'totalHigh');
    }
    var skip = {};
    excludeIds.forEach(function (id) { skip[id] = true; });
    var out = { low: 0, base: 0, high: 0 };
    packages.forEach(function (p) {
      if (skip[p.id]) return;
      out.low += p.totalLow || 0;
      out.base += p.totalBase || 0;
      out.high += p.totalHigh || 0;
    });
    return out;
  }

  function labourPlan(packages, crewSize) {
    var hours = sumPackages(packages, 'labourHoursLow', 'labourHoursBase', 'labourHoursHigh');
    var phRaw = MARKET.labour.productiveHoursPerDay;
    var ph = typeof phRaw === 'object' && phRaw && phRaw.value != null ? Number(phRaw.value) : Number(phRaw) || 6.5;
    var crew = Math.max(1, crewSize || 2);
    var workDays = hours.base > 0 ? Math.max(1, Math.ceil(hours.base / (crew * ph))) : 0;
    var workDaysLow = hours.low > 0 ? Math.max(1, Math.ceil(hours.low / (crew * ph))) : 0;
    var workDaysHigh = hours.high > 0 ? Math.max(workDays, Math.ceil(hours.high / (crew * ph))) : workDays;

    var byPkg = packages
      .filter(function (p) { return p.labourHoursBase > 0; })
      .map(function (p) {
        return { id: p.id, label: p.label, hours: p.labourHoursBase };
      })
      .sort(function (a, b) { return b.hours - a.hours; });

    var labourAmt = sumPackages(packages, 'labourLow', 'labourBase', 'labourHigh');
    var effectiveRate = hours.base > 0 ? Math.round(labourAmt.base / hours.base) : 0;

    return {
      labourHours: Math.round(hours.base),
      labourHoursLow: Math.round(hours.low),
      labourHoursHigh: Math.round(hours.high),
      crewSize: crew,
      workDays: workDays,
      workDaysLow: workDaysLow,
      workDaysHigh: workDaysHigh,
      productiveHoursPerDay: ph,
      effectiveHourlyRate: effectiveRate,
      topLabourPackages: byPkg.slice(0, 6)
    };
  }

  function finalize(catKey, provKey, answers, packages, crewSize, driverDefs) {
    var cat = CATEGORIES[catKey];
    var prov = PROVINCES[provKey];
    var mult = prov ? prov.mult : 1;
    var size = Math.max(1, Number(answers.size) || 1);
    var level = answers.level || 'standaard';

    var scaled = applyRegion(packages, mult);

    var mat = sumPackages(scaled, 'materialLow', 'materialBase', 'materialHigh');
    var lab = sumPackages(scaled, 'labourLow', 'labourBase', 'labourHigh');
    var oth = sumPackages(scaled, 'otherLow', 'otherBase', 'otherHigh');

    var totalLow = round50(Math.max(400, mat.low + lab.low + oth.low));
    var totalBase = round50(Math.max(500, mat.base + lab.base + oth.base));
    var totalHigh = round50(Math.max(totalBase + 300, mat.high + lab.high + oth.high));
    if (totalLow > totalBase) totalLow = round50(totalBase * 0.88);
    if (totalHigh < totalBase) totalHigh = round50(totalBase * 1.15);

    var plan = labourPlan(scaled, crewSize);
    var weeks = weeksFromDays(plan.workDays);
    var vat = vatScenario(answers.housingAge);
    var subtotalExVat = totalBase;
    var vatAmount = round50(subtotalExVat * vat.rate);
    var totalInclVat = subtotalExVat + vatAmount;

    var sumParts = Math.max(1, mat.base + lab.base + oth.base);
    var split = {
      materiaal: Math.round((mat.base / sumParts) * 100) / 100,
      arbeid: Math.round((lab.base / sumParts) * 100) / 100,
      overige: Math.round((oth.base / sumParts) * 100) / 100
    };
    // normalize rounding
    var splitSum = split.materiaal + split.arbeid + split.overige;
    if (Math.abs(splitSum - 1) > 0.01) {
      split.overige = Math.round((1 - split.materiaal - split.arbeid) * 100) / 100;
    }

    var lineItems = scaled
      .filter(function (p) { return p.totalBase > 0; })
      .map(function (p) {
        return {
          id: p.id,
          label: p.label,
          amount: round50(p.totalBase),
          material: round50(p.materialBase),
          labour: round50(p.labourBase),
          other: round50(p.otherBase),
          labourHours: p.labourHoursBase,
          bucket: p.labourBase >= p.materialBase && p.labourBase >= p.otherBase ? 'arbeid'
            : p.materialBase >= p.otherBase ? 'materiaal' : 'overige',
          reason: p.reason
        };
      });

    var contCfg = contingencyFor(answers, scaled);
    var contingency = round50(totalBase * ((contCfg.low + contCfg.high) / 2));
    var contingencyPct = { low: contCfg.low, high: contCfg.high };

    var bm = marketBenchmark(catKey, answers, size);
    var compareBase = totalBase;
    var comparableNote = '';
    if (bm.compareMode === 'exScaffoldEtc' && bm.excludePackageIds) {
      var comp = comparableSubtotal(scaled, bm.excludePackageIds);
      compareBase = round50(Math.max(400, comp.base));
      comparableNote = 'Positie t.o.v. benchmark op scope-identiek subtotaal (excl. steiger/goten/asbest): ' + fmtEUR(compareBase);
    }
    var position = 'marktconform';
    if (bm.scopeMatch === 'not-direct') {
      position = 'niet-direct-vergelijkbaar';
    } else if (compareBase < bm.low * 0.9) {
      position = 'lager';
    } else if (compareBase > bm.high * 1.1) {
      position = 'hoger';
    }

    var unknownCount = 0;
    Object.keys(answers).forEach(function (k) {
      if (answers[k] === 'onbekend' || answers[k] === 'mogelijk') unknownCount++;
    });
    var confidence = unknownCount >= 2 ? 'indicatief' : unknownCount === 1 ? 'gemiddeld' : 'hoog';
    if (bm.kind === 'modelAssumption' || bm.scopeMatch === 'soft' || bm.scopeMatch === 'not-direct') {
      if (confidence === 'hoog') confidence = 'gemiddeld';
    }
    if (String(bm.vatStatus || '').indexOf('unclear') !== -1 && confidence === 'hoog') {
      confidence = 'gemiddeld';
    }
    // Keuken: all-in BM verbeterd, maar componentprijzen (kasten €/m², uren) blijven modelAssumption
    if (catKey === 'keuken' && confidence === 'hoog') {
      confidence = 'gemiddeld';
    }

    var drivers = (driverDefs || []).slice(0, 5);

    // legacy-compatible line items (amount + bucket)
    var legacyItems = lineItems.map(function (it) {
      return { label: it.label, amount: it.amount, bucket: it.bucket };
    });

    return {
      price: totalBase,
      low: totalLow,
      high: totalHigh,
      weeksLow: weeks.weeksLow,
      weeksHigh: weeks.weeksHigh,
      split: split,
      amounts: {
        materiaal: round50(mat.base),
        arbeid: round50(lab.base),
        overige: round50(oth.base)
      },
      amountsLow: {
        materiaal: round50(mat.low),
        arbeid: round50(lab.low),
        overige: round50(oth.low)
      },
      amountsHigh: {
        materiaal: round50(mat.high),
        arbeid: round50(lab.high),
        overige: round50(oth.high)
      },
      lineItems: legacyItems,
      workPackages: scaled,
      costBreakdown: lineItems,
      drivers: drivers,
      contingency: contingency,
      contingencyPct: contingencyPct,
      peerLow: bm.low,
      peerHigh: bm.high,
      marketBenchmark: bm,
      marketPosition: position,
      comparableSubtotal: compareBase,
      comparableNote: comparableNote,
      scopeMatch: bm.scopeMatch,
      confidence: confidence,
      perM2: Math.round(totalBase / size),
      sizeDisplay: sizeDisplay(catKey, answers, { size: size }),
      unitRate: unitRateDisplay(catKey, { price: totalBase, size: size, perM2: Math.round(totalBase / size) }),
      levelLabel: LEVEL_LABEL[level] || level,
      size: size,
      labourPlan: plan,
      labourHours: plan.labourHours,
      crewSize: plan.crewSize,
      workDays: plan.workDays,
      effectiveHourlyRate: plan.effectiveHourlyRate,
      subtotalExVat: subtotalExVat,
      vatRate: vat.rate,
      vatLabel: vat.label,
      vatAmount: vatAmount,
      vatDisclaimer: vat.disclaimer,
      totalInclVat: totalInclVat,
      premies: premieInfo(catKey, answers, provKey),
      marketDataVersion: MARKET.meta.version,
      asOf: MARKET.meta.asOf
    };
  }

  function matFactor(level) {
    return pick(LEVEL_MAT, level, 1);
  }

  function labFactor(level) {
    return pick(LEVEL_LABOUR, level, 1);
  }

  /* ---------- DAK ---------- */

  function calcDak(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 90);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var R = MARKET.roof;
    var rate = rateFor('roofer');
    var packages = [];
    var workType = a.workType || 'vernieuwen';
    var hoursPerM2 = R.labourHoursPerM2[
      workType === 'herstelling' ? 'repair'
        : workType === 'isolatie' ? 'insulation'
        : workType === 'volledig' ? 'full' : 'renew'
    ];
    var crew = R.crewSize[
      workType === 'herstelling' ? 'repair'
        : workType === 'isolatie' ? 'insulation'
        : workType === 'volledig' ? 'full' : 'renew'
    ];

    if (workType !== 'herstelling') {
      packages.push(createPackage('strip', 'Demontage bestaande dakbedekking & afvoer', {
        material: { low: 0, base: 0, high: 0 },
        labourHours: { low: 0, base: 0, high: 0 },
        labourRate: rate,
        other: scaleBand(R.stripAndDispose, size),
        reason: 'Vyverman demontage+afvoer all-in als overige — geen aparte uren (voorkomt dubbeltelling)'
      }));
    } else {
      packages.push(createPackage('repair-local', 'Lokale herstelling dak', {
        material: scaleBand({ low: 15, base: 25, high: 40 }, size * 0.15 * mf),
        labourHours: scaleBand(hoursPerM2, size * lf),
        labourRate: rate,
        other: { low: 150, base: 250, high: 400 },
        reason: 'Plaatselijke herstelling'
      }));
    }

    var needCover = workType === 'vernieuwen' || workType === 'volledig' || workType === 'isolatie';
    var needInsulation = workType === 'isolatie' || workType === 'volledig' || a.insulation === 'ja';

    if (needCover && workType !== 'herstelling') {
      packages.push(createPackage('underlay', 'Onderdak', {
        material: scaleBand(R.underlay, size * mf),
        labourHours: scaleBand({ low: 0.05, base: 0.07, high: 0.1 }, size * lf),
        labourRate: rate,
        reason: 'Dampopen onderdakfolie / plaat'
      }));
      packages.push(createPackage('battens', 'Tengels & panlatten', {
        material: scaleBand(R.battens, size * mf),
        labourHours: scaleBand({ low: 0.06, base: 0.08, high: 0.12 }, size * lf),
        labourRate: rate,
        reason: 'Lattenwerk voor ventilatie en bevestiging'
      }));
    }

    if (needInsulation) {
      packages.push(createPackage('insulation', 'Dakisolatie (materiaal)', {
        material: scaleBand(R.insulation, size * mf),
        labourHours: { low: 0, base: 0, high: 0 },
        labourRate: rate,
        reason: 'Isolatiemateriaal (modelAssumption-band); plaatsing via aparte uren'
      }));
      packages.push(createPackage('insulation-labour', 'Plaatsing dakisolatie', {
        material: { low: 0, base: 0, high: 0 },
        labourHours: scaleBand({ low: 0.12, base: 0.18, high: 0.26 }, size * lf),
        labourRate: rate,
        reason: 'Plaatsingsuren isolatie'
      }));
    }

    if (workType === 'vernieuwen' || workType === 'volledig') {
      var coverMat = R.tilesConcrete;
      if (a.material === 'leien') coverMat = R.slate;
      else if (a.material === 'epdm' || a.roofType === 'plat') coverMat = R.epdm;
      else if (a.level === 'premium' && a.material === 'pannen') coverMat = R.tilesCeramic;

      var waste = (R.materialWasteFactor && R.materialWasteFactor.value) || 1.08;
      packages.push(createPackage('covering', 'Dakbedekking (materiaal)', {
        material: scaleBand(coverMat, size * mf * waste),
        labourHours: { low: 0, base: 0, high: 0 },
        labourRate: rate,
        reason: 'Materiaal-only unitprijs × m² × snijverlies — geen % van all-in faseprijs'
      }));
      packages.push(createPackage('fasteners', 'Bevestiging & hulpstukken', {
        material: scaleBand(R.fastenersAccessories || { low: 8, base: 11, high: 16 }, size * mf),
        labourHours: { low: 0, base: 0, high: 0 },
        reason: 'Nok/gevelpannen/bevestiging per m²'
      }));
      var coverHours = R.coverPlacementHoursPerM2 || { low: 0.7, base: 0.85, high: 1.05 };
      packages.push(createPackage('covering-labour', 'Plaatsing dakbedekking', {
        material: { low: 0, base: 0, high: 0 },
        labourHours: scaleBand(coverHours, size * lf),
        labourRate: rate,
        reason: 'Plaatsingsuren afgeleid van BE plaatsings€/m² ÷ uurtarief (niet van all-in split)'
      }));
    }

    if (workType === 'isolatie' && !needCover) {
      packages.push(createPackage('insulation-labour-extra', 'Afwerking isolatiewerken', {
        material: scaleBand({ low: 8, base: 12, high: 18 }, size * mf),
        labourHours: scaleBand(hoursPerM2, size * 0.5 * lf),
        labourRate: rate
      }));
    }

    var accessMult = a.access === 'moeilijk' ? 1.55 : a.access === 'vlot' ? 0.75 : 1;
    packages.push(createPackage('scaffold', 'Steiger, toegang & valbeveiliging', {
      other: scaleBand(R.scaffolding, accessMult * Math.max(0.7, Math.min(1.4, size / 100))),
      labourHours: scaleBand({ low: 4, base: 6, high: 10 }, accessMult * lf),
      labourRate: rate,
      reason: a.access === 'moeilijk' ? 'Moeilijke toegang verhoogt steiger/veiligheid' : 'Standaard werfinrichting'
    }));

    if (a.gutters === 'ja' || a.gutters === 'onbekend') {
      var gutterLm = (R.guttersTypicalLm && R.guttersTypicalLm.value) || 20;
      var gutterFactor = (a.gutters === 'onbekend' ? 0.7 : 1) * gutterLm;
      packages.push(createPackage('gutters', 'Goten & regenafvoer', {
        material: { low: 0, base: 0, high: 0 },
        labourHours: { low: 0, base: 0, high: 0 },
        labourRate: rate,
        other: scaleBand(R.guttersPerLm, gutterFactor),
        reason: 'All-in €/lm incl. plaatsing (BE) × typische lm — geen mat/arb-split van all-in'
      }));
    }

    if (a.asbestos === 'mogelijk') {
      packages.push(createPackage('asbestos-survey', 'Buffer asbestonderzoek', {
        other: R.asbestosSurvey,
        reason: 'Voorzorg bij vermoeden van asbest'
      }));
    } else if (a.asbestos === 'ja') {
      packages.push(createPackage('asbestos', 'Asbestverwijdering (indicatief)', {
        other: scaleBand(R.asbestosPerM2, size),
        labourHours: { low: 0, base: 0, high: 0 },
        reason: 'Gespecialiseerde verwijdering — aparte aannemer'
      }));
    }

    packages.push(createPackage('details', 'Aansluitdetails, dakranden & oplevering', {
      material: scaleBand(R.detailsFinish, 0.4 * mf),
      labourHours: { low: 6, base: 10, high: 16 },
      labourRate: rate,
      other: scaleBand(R.detailsFinish, 0.3)
    }));

    var drivers = buildDrivers('dak', a, provKey, packages, crew);
    return finalize('dak', provKey, a, packages, crew, drivers);
  }

  /* ---------- BADKAMER ---------- */

  function calcBadkamer(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 6);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var B = MARKET.bathroom;
    var rateGen = rateFor('general');
    var ratePlumb = rateFor('plumber');
    var rateElec = rateFor('electrician');
    var rateTile = rateFor('tiler');
    var packages = [];
    var scope = a.scope || 'gedeeltelijk';
    var wallM2 = size * (a.tiling === 'volledig' ? 2.6 : a.tiling === 'gedeeltelijk' ? 1.4 : 0.4);

    packages.push(createPackage('protect', 'Bescherming & werfinrichting', {
      other: B.protection,
      labourHours: { low: 2, base: 3, high: 4 },
      labourRate: rateGen
    }));

    var demoKey = a.demolition || (scope === 'volledig' ? 'volledig' : scope === 'opfrissing' ? 'geen' : 'beperkt');
    if (demoKey !== 'geen' && scope !== 'opfrissing') {
      packages.push(createPackage('demo', 'Afbraak sanitair/tegels & afvoer', {
        labourHours: scaleBand({ low: 8, base: 12, high: 18 }, (demoKey === 'volledig' ? 1.3 : 0.8) * lf),
        labourRate: rateGen,
        other: addBands(band(B.demolition[demoKey] || B.demolition.beperkt), band(B.waste))
      }));
    }

    if (scope !== 'opfrissing') {
      var plumb = a.plumbingMove === 'ja' ? B.plumbingMove
        : a.plumbingMove === 'beperkt' ? B.plumbingLimited : B.plumbingSame;
      var plumbHours = a.plumbingMove === 'ja'
        ? { low: 20, base: 28, high: 40 }
        : a.plumbingMove === 'beperkt'
          ? { low: 10, base: 14, high: 20 }
          : { low: 6, base: 10, high: 14 };
      packages.push(createPackage('plumbing', 'Water- & afvoerleidingen', {
        material: scaleBand(plumb, 0.35 * mf),
        labourHours: scaleBand(plumbHours, lf),
        labourRate: ratePlumb,
        other: scaleBand(plumb, 0.1)
      }));

      packages.push(createPackage('electrical', 'Elektriciteit badkamer', {
        material: scaleBand(B.electrical, 0.4 * mf),
        labourHours: { low: 4, base: 7, high: 12 },
        labourRate: rateElec,
        other: scaleBand(B.electrical, 0.1)
      }));
    }

    if (a.tiling !== 'schilder') {
      packages.push(createPackage('waterproof', 'Waterdichting natte zones', {
        material: scaleBand(B.waterproofingPerM2, Math.max(size, wallM2 * 0.5) * mf),
        labourHours: scaleBand({ low: 0.2, base: 0.28, high: 0.4 }, size * lf),
        labourRate: rateTile
      }));
    }

    if (a.tiling === 'volledig' || a.tiling === 'gedeeltelijk') {
      packages.push(createPackage('floor-tiles', 'Vloerbetegeling', {
        material: addBands(
          scaleBand(B.floorTileMat, size * mf),
          scaleBand(B.adhesiveGrout, size)
        ),
        labourHours: scaleBand({ low: 0.55, base: 0.7, high: 0.95 }, size * lf),
        labourRate: rateTile
      }));
      if (a.tiling === 'volledig' || a.tiling === 'gedeeltelijk') {
        packages.push(createPackage('wall-tiles', 'Wandbetegeling', {
          material: addBands(
            scaleBand(B.wallTileMat, wallM2 * mf),
            scaleBand(B.adhesiveGrout, wallM2 * 0.7)
          ),
          labourHours: scaleBand({ low: 0.6, base: 0.8, high: 1.1 }, wallM2 * lf),
          labourRate: rateTile
        }));
      }
    } else {
      packages.push(createPackage('paint-finish', 'Vochtbestendige wandafwerking', {
        material: scaleBand({ low: 8, base: 14, high: 22 }, (size * 2.2) * mf),
        labourHours: scaleBand({ low: 0.15, base: 0.2, high: 0.28 }, size * 2.2 * lf),
        labourRate: rateFor('painter')
      }));
    }

    if (a.sanitary !== 'behouden') {
      if (a.sanitary === 'douche' || a.sanitary === 'beide') {
        packages.push(createPackage('shower', 'Douche (materiaal)', {
          material: scaleBand(B.shower, mf),
          labourHours: { low: 0, base: 0, high: 0 }
        }));
      }
      if (a.sanitary === 'bad' || a.sanitary === 'beide') {
        packages.push(createPackage('bath', 'Bad (materiaal)', {
          material: scaleBand(B.bath, mf)
        }));
      }
      packages.push(createPackage('toilet', 'Toilet', {
        material: scaleBand(B.toilet, mf)
      }));
      packages.push(createPackage('vanity', 'Wastafelmeubel', {
        material: scaleBand(B.vanity, mf)
      }));
      packages.push(createPackage('taps', 'Kranen', {
        material: scaleBand(B.taps, mf)
      }));
      packages.push(createPackage('sanitary-fit', 'Sanitaire montage', {
        labourHours: scaleBand(B.sanitaryLabourHours, (a.sanitary === 'beide' ? 1.35 : 1) * lf),
        labourRate: ratePlumb
      }));
    } else {
      packages.push(createPackage('sanitary-keep', 'Behoud & heraansluiting sanitair', {
        labourHours: { low: 3, base: 5, high: 8 },
        labourRate: ratePlumb,
        material: { low: 80, base: 150, high: 250 }
      }));
    }

    if (a.ventilation === 'verbeteren' || a.ventilation === 'onbekend') {
      packages.push(createPackage('vent', 'Ventilatie verbeteren', {
        material: scaleBand(B.ventilation, (a.ventilation === 'onbekend' ? 0.7 : 1) * mf * 0.6),
        labourHours: { low: 3, base: 5, high: 8 },
        labourRate: rateElec,
        other: scaleBand(B.ventilation, 0.2)
      }));
    }

    if (a.ufh === 'ja') {
      packages.push(createPackage('ufh', 'Vloerverwarming badkamer', {
        material: addBands(scaleBand(B.ufhPerM2, size * mf), band(B.ufhSetup)),
        labourHours: scaleBand({ low: 0.35, base: 0.45, high: 0.6 }, size * lf),
        labourRate: rateGen
      }));
    }

    packages.push(createPackage('finish', 'Kitwerk, afwerking & oplevering', {
      material: scaleBand(B.finishing, 0.35 * mf),
      labourHours: { low: 4, base: 6, high: 10 },
      labourRate: rateGen,
      other: scaleBand(B.finishing, 0.4)
    }));

    var drivers = buildDrivers('badkamer', a, provKey, packages, B.crewSize);
    return finalize('badkamer', provKey, a, packages, B.crewSize, drivers);
  }

  /* ---------- KEUKEN ---------- */

  function calcKeuken(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 12);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var K = MARKET.kitchen;
    var rateFit = rateFor('kitchenFitter');
    var ratePlumb = rateFor('plumber');
    var rateElec = rateFor('electrician');
    var packages = [];
    var scope = a.scope || 'vervangen';
    var cabKey = a.cabinets || 'midden';

    if (scope !== 'fronten') {
      packages.push(createPackage('demo', 'Demontage oude keuken & afvoer', {
        labourHours: { low: 4, base: 6, high: 10 },
        labourRate: rateFit,
        other: K.demolish
      }));
    }

    if (scope === 'fronten') {
      packages.push(createPackage('fronts', 'Nieuwe fronten / facelift', {
        material: scaleBand(K.frontenOnlyPerM2, size * mf),
        labourHours: scaleBand(K.fitHours.fronten, lf),
        labourRate: rateFit
      }));
    } else {
      // Single cabinets package — no separate "basispakket" (avoid double count)
      packages.push(createPackage('cabinets', 'Keukenkasten & korpus', {
        material: scaleBand(K.cabinetsPerM2[cabKey] || K.cabinetsPerM2.midden, size * mf),
        labourHours: { low: 0, base: 0, high: 0 },
        reason: 'Kastenmateriaal (geen apart basispakket)'
      }));
      packages.push(createPackage('install', 'Keukenmontage', {
        labourHours: scaleBand(K.fitHours[scope] || K.fitHours.vervangen, lf),
        labourRate: rateFit,
        reason: 'Plaatsing kasten'
      }));
    }

    packages.push(createPackage('worktop', 'Werkblad', {
      material: scaleBand(K.worktop[a.worktop] || K.worktop.composiet, mf),
      labourHours: { low: 3, base: 5, high: 8 },
      labourRate: rateFit
    }));

    packages.push(createPackage('sink', 'Spoelbak & kraan', {
      material: scaleBand(K.sinkTap, mf),
      labourHours: { low: 2, base: 3, high: 5 },
      labourRate: ratePlumb
    }));

    if (a.appliances && a.appliances !== 'nee') {
      packages.push(createPackage('appliances', 'Inbouwapparatuur', {
        material: scaleBand(K.appliances[a.appliances], mf),
        labourHours: { low: 3, base: 5, high: 8 },
        labourRate: rateFit,
        reason: 'Toestellen + aansluiting'
      }));
    }

    if (scope === 'vervangen' || scope === 'herindelen') {
      if (a.connections === 'beperkt') {
        packages.push(createPackage('conn', 'Aanpassen water & elektriciteit', {
          material: scaleBand(K.connectionsLimited, 0.35),
          labourHours: { low: 6, base: 10, high: 14 },
          labourRate: ratePlumb,
          other: scaleBand(K.connectionsLimited, 0.15)
        }));
        packages.push(createPackage('conn-elec', 'Elektrische aanpassingen', {
          labourHours: { low: 3, base: 5, high: 8 },
          labourRate: rateElec
        }));
      } else if (a.connections === 'ja') {
        packages.push(createPackage('conn-move', 'Verplaatsen waterleidingen', {
          material: scaleBand(K.connectionsMove, 0.4),
          labourHours: { low: 12, base: 18, high: 26 },
          labourRate: ratePlumb
        }));
        packages.push(createPackage('conn-elec-move', 'Verplaatsen elektriciteit / groepen', {
          material: scaleBand(K.connectionsMove, 0.2),
          labourHours: { low: 8, base: 12, high: 18 },
          labourRate: rateElec
        }));
      } else {
        packages.push(createPackage('conn-basic', 'Standaard heraansluiting', {
          labourHours: { low: 3, base: 5, high: 8 },
          labourRate: ratePlumb,
          material: { low: 80, base: 150, high: 250 }
        }));
      }
    }

    if (a.splashback === 'ja') {
      packages.push(createPackage('splash', 'Spatwand', {
        material: scaleBand(K.splashback, mf),
        labourHours: { low: 3, base: 5, high: 8 },
        labourRate: rateFor('tiler')
      }));
    }

    if (a.flooring === 'ja') {
      packages.push(createPackage('floor', 'Keukenvloer vernieuwen', {
        material: scaleBand(K.flooringPerM2, size * mf * 0.55),
        labourHours: scaleBand({ low: 0.25, base: 0.35, high: 0.5 }, size * lf),
        labourRate: rateFor('floorLayer'),
        other: scaleBand(K.flooringPerM2, size * 0.15)
      }));
    }

    packages.push(createPackage('finish', 'Afwerking & oplevering', {
      material: scaleBand(K.finishing, 0.4 * mf),
      labourHours: { low: 3, base: 5, high: 8 },
      labourRate: rateFit,
      other: scaleBand(K.finishing, 0.4)
    }));

    var drivers = buildDrivers('keuken', a, provKey, packages, K.crewSize);
    return finalize('keuken', provKey, a, packages, K.crewSize, drivers);
  }

  /* ---------- VLOEREN ---------- */

  function calcVloeren(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 30);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var F = MARKET.floors;
    var matKey = a.floorMaterial || 'laminaat';
    if (matKey === 'laminaat' && false) matKey = 'laminaat';
    var rate = matKey === 'tegel' ? rateFor('tiler') : rateFor('floorLayer');
    var packages = [];
    var qty = size * F.cutWasteFactor;

    if (a.removal === 'ja') {
      packages.push(createPackage('removal', 'Uitbreken bestaande vloer & afvoer', {
        labourHours: scaleBand({ low: 0.12, base: 0.18, high: 0.26 }, size * lf),
        labourRate: rate,
        other: addBands(scaleBand(F.removal, size), band(F.wasteBase))
      }));
    } else if (a.removal === 'onbekend') {
      packages.push(createPackage('removal-buffer', 'Buffer uitbraak', {
        other: scaleBand(F.removal, size * 0.5)
      }));
    }

    if (a.leveling === 'beperkt' || a.substrate === 'matig') {
      packages.push(createPackage('level-limited', 'Beperkte egalisatie', {
        material: scaleBand(F.levelingLimited, size * 0.55 * mf),
        labourHours: scaleBand({ low: 0.1, base: 0.14, high: 0.2 }, size * lf),
        labourRate: rate
      }));
    }
    if (a.leveling === 'volledig' || a.substrate === 'slecht') {
      packages.push(createPackage('level-full', 'Volledige egalisatie / chape-voorbereiding', {
        material: scaleBand(F.levelingFull, size * 0.55 * mf),
        labourHours: scaleBand({ low: 0.18, base: 0.25, high: 0.35 }, size * lf),
        labourRate: rate
      }));
    } else if (a.leveling === 'onbekend') {
      packages.push(createPackage('level-buffer', 'Buffer ondergrond', {
        other: scaleBand(F.levelingLimited, size * 0.6)
      }));
    }

    packages.push(createPackage('underlay', 'Ondervloer / vochtscherm', {
      material: scaleBand(F.underlay, qty * mf),
      labourHours: scaleBand({ low: 0.03, base: 0.04, high: 0.06 }, size * lf),
      labourRate: rate
    }));

    packages.push(createPackage('floor-mat', 'Vloermateriaal (' + matKey + ')', {
      material: scaleBand(F.material[matKey] || F.material.laminaat, qty * mf),
      reason: 'Inclusief snijverlies ~8%'
    }));

    if (matKey === 'tegel') {
      packages.push(createPackage('adhesive', 'Lijm & voegmiddel', {
        material: scaleBand(F.adhesiveGrout, size)
      }));
    }

    var labPer = F.labourPerM2[matKey] || F.labourPerM2.laminaat;
    // Convert €/m² labour to hours via rate
    var hoursBand = {
      low: (labPer.low * size) / rate.high,
      base: (labPer.base * size) / rate.base,
      high: (labPer.high * size) / rate.low
    };
    packages.push(createPackage('install', 'Plaatsing vloer', {
      labourHours: scaleBand(hoursBand, lf),
      labourRate: rate,
      reason: 'Plaatsingsuren op basis van €/m²-marktarbeid'
    }));

    if (a.rooms === '2-3') {
      packages.push(createPackage('rooms', 'Meerwerk meerdere ruimtes', {
        labourHours: { low: 2, base: 4, high: 6 },
        labourRate: rate,
        other: { low: 80, base: 150, high: 250 }
      }));
    } else if (a.rooms === 'meer') {
      packages.push(createPackage('rooms-many', 'Meerwerk 4+ ruimtes', {
        labourHours: { low: 5, base: 8, high: 12 },
        labourRate: rate,
        other: { low: 180, base: 320, high: 480 }
      }));
    }

    if (a.ufh === 'nieuw') {
      packages.push(createPackage('ufh', 'Nieuwe vloerverwarming (indicatief)', {
        material: scaleBand(F.ufhNew, size * mf),
        labourHours: scaleBand({ low: 0.25, base: 0.35, high: 0.5 }, size * lf),
        labourRate: rateFor('plumber')
      }));
    } else if (a.ufh === 'bestaand') {
      packages.push(createPackage('ufh-adj', 'Aanpassing rond bestaande vloerverwarming', {
        labourHours: scaleBand({ low: 0.05, base: 0.08, high: 0.12 }, size * lf),
        labourRate: rate
      }));
    }

    if (a.wetRooms === 'ja') {
      packages.push(createPackage('wet', 'Extra voor natte zones', {
        material: scaleBand(F.wetRoomExtra, 0.5 * mf),
        other: scaleBand(F.wetRoomExtra, 0.5),
        labourHours: { low: 2, base: 4, high: 6 },
        labourRate: rate
      }));
    }

    if (a.skirting === 'ja') {
      packages.push(createPackage('skirting', 'Plinten leveren & plaatsen', {
        material: scaleBand(F.skirtingPerM2, size * mf),
        labourHours: scaleBand({ low: 0.06, base: 0.09, high: 0.14 }, size * lf),
        labourRate: rate
      }));
    }

    var drivers = buildDrivers('vloeren', a, provKey, packages, F.crewSize);
    return finalize('vloeren', provKey, a, packages, F.crewSize, drivers);
  }

  /* ---------- SCHILDERWERKEN ---------- */

  function calcSchilderwerken(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 60);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var P = MARKET.painting;
    var rate = rateFor('painter');
    var packages = [];
    var surface = a.surface || 'matig';
    var hoursM2 = P.labourHoursPerM2[surface] || P.labourHoursPerM2.matig;
    var ext = 1;
    if (a.paintScope === 'buiten') ext = P.exteriorFactor.base;
    if (a.paintScope === 'beide') ext = 1 + (P.exteriorFactor.base - 1) * 0.5;

    packages.push(createPackage('protect', 'Afplakken, beschermen & opruimen', {
      material: scaleBand(P.protectionPerM2, size * 0.4),
      labourHours: scaleBand({ low: 0.03, base: 0.04, high: 0.06 }, size * lf),
      labourRate: rate,
      other: scaleBand(P.protectionPerM2, size * 0.6)
    }));

    packages.push(createPackage('paint-mat', 'Verf & primers', {
      material: scaleBand(P.paintMaterial, size * mf * (a.darkColors === 'ja' ? 1.25 : 1)),
      reason: 'Materiaal gescheiden van schilderuren'
    }));

    packages.push(createPackage('paint-labour', 'Schilderuren (2 lagen)', {
      labourHours: scaleBand(hoursM2, size * lf * ext),
      labourRate: rate,
      reason: 'Productieve schilderuren inclusief standaard voorbereiding voor staat "' + surface + '"'
    }));

    // Urenmodel bevat al voorbereiding voor oppervlaktestaat — hier alleen prep-materiaal (geen dubbele uren)
    if (surface === 'matig' || surface === 'slecht') {
      packages.push(createPackage('prep', 'Herstelmateriaal (plamuur/primer)', {
        material: scaleBand(P.prepMaterial, size * mf * (surface === 'slecht' ? 1.6 : 1)),
        labourHours: { low: 0, base: 0, high: 0 },
        reason: 'Prep-uren zitten in schilderuren-band voor staat "' + surface + '"'
      }));
    }

    if (a.wallpaper === 'gedeeltelijk') {
      packages.push(createPackage('wallpaper-part', 'Behang gedeeltelijk verwijderen', {
        labourHours: scaleBand({ low: 0.08, base: 0.12, high: 0.18 }, size * 0.4 * lf),
        labourRate: rate,
        other: scaleBand(P.wallpaperPartial, size * 0.4)
      }));
    } else if (a.wallpaper === 'ja') {
      packages.push(createPackage('wallpaper', 'Behang verwijderen', {
        labourHours: scaleBand({ low: 0.12, base: 0.18, high: 0.26 }, size * lf),
        labourRate: rate,
        other: scaleBand(P.wallpaperFull, size * 0.3)
      }));
    }

    if (a.colors === '2-3') {
      packages.push(createPackage('colors', 'Meerwerk 2–3 kleuren', {
        labourHours: { low: 2, base: 4, high: 6 },
        labourRate: rate,
        material: { low: 40, base: 80, high: 140 }
      }));
    } else if (a.colors === 'meer') {
      packages.push(createPackage('colors-many', 'Meerwerk complexe kleurverdeling', {
        labourHours: { low: 5, base: 8, high: 12 },
        labourRate: rate,
        material: { low: 80, base: 150, high: 250 }
      }));
    }

    if (a.darkColors === 'ja') {
      packages.push(createPackage('dark', 'Extra lagen donkere kleuren', {
        material: scaleBand(P.darkColorExtraMat, size * mf),
        labourHours: scaleBand(P.darkColorExtraHours, size * lf),
        labourRate: rate
      }));
    }

    if (a.woodwork === 'beperkt') {
      packages.push(createPackage('wood-lim', 'Binnenschrijnwerk (beperkt)', {
        material: { low: 40, base: 80, high: 140 },
        labourHours: scaleBand(P.woodworkLimitedHours, lf),
        labourRate: rate
      }));
    } else if (a.woodwork === 'uitgebreid') {
      packages.push(createPackage('wood', 'Binnenschrijnwerk (uitgebreid)', {
        material: { low: 100, base: 180, high: 300 },
        labourHours: scaleBand(P.woodworkExtendedHours, lf),
        labourRate: rate
      }));
    }

    if (a.floors === '2') {
      packages.push(createPackage('scaffold2', 'Hoogte / steiger 2 bouwlagen', {
        other: P.scaffold2,
        labourHours: { low: 2, base: 4, high: 6 },
        labourRate: rate
      }));
    } else if (a.floors === '3plus') {
      packages.push(createPackage('scaffold3', 'Hoogte / steiger 3+ bouwlagen', {
        other: P.scaffold3,
        labourHours: { low: 4, base: 6, high: 10 },
        labourRate: rate
      }));
    }

    var drivers = buildDrivers('schilderwerken', a, provKey, packages, P.crewSize);
    return finalize('schilderwerken', provKey, a, packages, P.crewSize, drivers);
  }

  /* ---------- RAMEN ---------- */

  function calcRamen(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 15);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var W = MARKET.windows;
    var rate = rateFor('joiner');
    var packages = [];
    var frame = a.frame || 'pvc';
    var matM2 = W.materialPerM2[frame] || W.materialPerM2.pvc;
    var glaze = W.glazingFactor[a.glazing] || W.glazingFactor.hr;
    var slide = W.slidingFactor[a.sliding] || 1;
    var slideShare = a.sliding === 'groot' ? 0.40 : a.sliding === 'ja' ? 0.22 : 0;
    var slideMult = 1 + (slide - 1) * slideShare;
    var accessF = a.access === 'moeilijk' ? W.accessHardFactor.base : 1;

    if (a.removal === 'ja') {
      packages.push(createPackage('removal', 'Uithalen bestaand schrijnwerk & afvoer', {
        other: scaleBand(W.removalPerM2, size),
        labourHours: scaleBand({ low: 0.15, base: 0.25, high: 0.38 }, size * lf),
        labourRate: rate,
        reason: 'Demontage + afvoer als overige/uren'
      }));
    }

    packages.push(createPackage('frames', 'Ramen — kader & beglazing (materiaal)', {
      material: scaleBand(matM2, size * mf * glaze.base * slideMult * accessF),
      reason: 'Frame+glas unitprijs × m² × beglazing/schuiftoeslag'
    }));

    packages.push(createPackage('install', 'Plaatsing ramen', {
      labourHours: scaleBand(W.labourHoursPerM2, size * lf * slideMult * accessF),
      labourRate: rate,
      reason: 'Schrijnwerkersuren incl. afstellen'
    }));

    packages.push(createPackage('reveals', 'Dagkanten & afwerking', {
      other: scaleBand(W.revealFinish, size * 0.75),
      labourHours: scaleBand({ low: 0.10, base: 0.16, high: 0.24 }, size * lf),
      labourRate: rate,
      reason: 'Binnen/buiten afwerking aansluitingen'
    }));

    var doorCount = a.doors === '2plus' ? 2 : a.doors === '1' ? 1 : 0;
    if (doorCount > 0) {
      packages.push(createPackage('doors', 'Buitendeuren', {
        material: scaleBand(W.door, doorCount * mf * 0.65),
        labourHours: scaleBand({ low: 4, base: 6, high: 9 }, doorCount * lf),
        labourRate: rate,
        other: scaleBand({ low: 80, base: 140, high: 220 }, doorCount),
        reason: 'Buitendeur mat+plaatsing lump × aantal'
      }));
    }

    var drivers = buildDrivers('ramen', a, provKey, packages, W.crewSize);
    return finalize('ramen', provKey, a, packages, W.crewSize, drivers);
  }

  /* ---------- ISOLATIE ---------- */

  function calcIsolatie(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 60);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var I = MARKET.insulation;
    var rate = rateFor('insulator');
    var packages = [];
    var subtype = a.subtype || 'spouw';
    var matM2 = I.materialPerM2[subtype] || I.materialPerM2.spouw;
    var hoursM2 = I.labourHoursPerM2[subtype] || I.labourHoursPerM2.spouw;
    var perf = a.performance === 'hoog' ? I.performanceHighMat.base : 1;
    var accessF = a.access === 'moeilijk' ? I.accessHard.base : 1;

    packages.push(createPackage('iso-mat', 'Isolatiemateriaal', {
      material: scaleBand(matM2, size * mf * perf),
      reason: 'Subtype ' + subtype + ' — isolatie-only (geen dakherbouw)'
    }));

    packages.push(createPackage('iso-labour', 'Plaatsing isolatie', {
      labourHours: scaleBand(hoursM2, size * lf * accessF),
      labourRate: rate,
      reason: 'Isolatieuren voor ' + subtype
    }));

    if (a.prep === 'uitgebreid') {
      packages.push(createPackage('prep', 'Uitgebreide voorbereiding', {
        other: scaleBand(I.prepExtended, size),
        labourHours: scaleBand({ low: 0.08, base: 0.12, high: 0.18 }, size * lf),
        labourRate: rate
      }));
    } else if (a.prep === 'beperkt') {
      packages.push(createPackage('prep-lim', 'Beperkte voorbereiding', {
        other: scaleBand(I.prepLimited, size)
      }));
    }

    // Buitenmuur (ETICS): afwerking zit al in materialPerM2 — geen finish package (dubbeltelling).
    var finishRelevant = subtype === 'binnenmuur' || subtype === 'dak_binnen';
    if (finishRelevant && a.finish && a.finish !== 'nee') {
      var fin = I.finishPerM2[a.finish] || I.finishPerM2.standaard;
      packages.push(createPackage('finish', 'Afwerking isolatievlak', {
        material: scaleBand(fin, size * mf * 0.55),
        labourHours: scaleBand({ low: 0.15, base: 0.25, high: 0.38 }, size * lf),
        labourRate: rate,
        other: scaleBand(fin, size * 0.25)
      }));
    }

    var drivers = buildDrivers('isolatie', a, provKey, packages, I.crewSize);
    return finalize('isolatie', provKey, a, packages, I.crewSize, drivers);
  }

  /* ---------- VERWARMING ---------- */

  function calcVerwarming(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || Number(a.heatedArea) || 120);
    a.size = size;
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var H = MARKET.heating;
    var rate = rateFor('heatingTech');
    var packages = [];
    var pt = a.projectType || 'ketel_vervangen';
    var insF = a.insulationLevel === 'slecht' ? H.insulationPoorFactor.base
      : a.insulationLevel === 'goed' ? H.insulationGoodFactor.base : 1;
    var distF = a.distribution === 'gemengd' ? H.distributionMixedFactor.base : 1;
    var replF = a.replaceVsNew === 'vervangen' ? H.replaceUplift.base : 1;

    if (pt === 'vloerverwarming') {
      packages.push(createPackage('ufh-mat', 'Vloerverwarming — materiaal', {
        material: scaleBand(H.ufhPerM2.material, size * mf * insF),
        reason: 'UFH €/m² componenten'
      }));
      packages.push(createPackage('ufh-labour', 'Plaatsing vloerverwarming', {
        labourHours: scaleBand(H.ufhPerM2.labourHours, size * lf),
        labourRate: rate
      }));
    } else if (pt === 'radiatoren') {
      packages.push(createPackage('rad-mat', 'Radiatoren — materiaal', {
        material: scaleBand(H.radiatorPerM2.material, size * mf * insF * distF),
        reason: 'Radiatorenpakket geschaald op verwarmde m²'
      }));
      packages.push(createPackage('rad-labour', 'Plaatsing radiatoren', {
        labourHours: scaleBand(H.radiatorPerM2.labourHours, size * lf * distF),
        labourRate: rate
      }));
    } else {
      var unitKey = pt === 'lucht_water' ? 'lucht_water' : pt === 'hybride' ? 'hybride' : 'ketel';
      packages.push(createPackage('unit', 'Verwarmingstoestel (materiaal)', {
        material: scaleBand(H.unitMaterial[unitKey], mf * insF * replF),
        reason: 'Toestel/materiaal ' + unitKey
      }));
      packages.push(createPackage('install', 'Installatie & aansluiting', {
        labourHours: scaleBand(H.unitLabourHours[unitKey], lf * distF * replF),
        labourRate: rate,
        other: scaleBand({ low: 200, base: 350, high: 550 }, distF)
      }));
      if (a.distribution === 'vloer' || a.distribution === 'gemengd') {
        var ufhShare = a.distribution === 'gemengd' ? 0.45 : 0.85;
        packages.push(createPackage('dist-ufh', 'Verdeling vloerverwarming (deel)', {
          material: scaleBand(H.ufhPerM2.material, size * ufhShare * mf),
          labourHours: scaleBand(H.ufhPerM2.labourHours, size * ufhShare * lf),
          labourRate: rate
        }));
      }
    }

    if (a.dhw === 'nieuw') {
      packages.push(createPackage('dhw', 'Sanitair warm water (nieuw)', {
        material: scaleBand(H.dhwNew, mf * 0.7),
        labourHours: scaleBand({ low: 4, base: 6, high: 10 }, lf),
        labourRate: rate,
        other: scaleBand(H.dhwNew, 0.15)
      }));
    }

    packages.push(createPackage('commission', 'Inregeling & oplevering', {
      other: H.commissioning,
      labourHours: { low: 2, base: 3, high: 5 },
      labourRate: rate
    }));

    var drivers = buildDrivers('verwarming', a, provKey, packages, H.crewSize);
    return finalize('verwarming', provKey, a, packages, H.crewSize, drivers);
  }

  /* ---------- ELEKTRICITEIT ---------- */

  function calcElektriciteit(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || Number(a.dwellingSize) || 100);
    a.size = size;
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var E = MARKET.electrical;
    var rate = rateFor('electrician');
    var packages = [];
    var scope = a.scope || 'partieel';
    var matM2 = E.materialPerM2[scope] || E.materialPerM2.partieel;
    var hoursM2 = E.labourHoursPerM2[scope] || E.labourHoursPerM2.partieel;
    var fit = E.fitOutFactor[a.fitOut] || E.fitOutFactor.standaard;
    var flF = E.floorsFactor[a.floors] || 1;

    packages.push(createPackage('cabling-mat', 'Bekabeling & materiaal', {
      material: scaleBand(matM2, size * mf * fit.base * flF),
      reason: 'Scope ' + scope + ' × fit-out'
    }));

    packages.push(createPackage('cabling-labour', 'Elektriciensuren', {
      labourHours: scaleBand(hoursM2, size * lf * fit.base * flF),
      labourRate: rate,
      reason: 'Trekken, aansluiten, afwerken'
    }));

    if (a.board === 'nieuw') {
      packages.push(createPackage('board', 'Nieuw verdeelbord', {
        material: scaleBand(E.board.nieuw, mf * 0.75),
        labourHours: { low: 6, base: 10, high: 16 },
        labourRate: rate,
        other: scaleBand(E.board.nieuw, 0.1)
      }));
    }

    if (a.inspection === 'ja') {
      packages.push(createPackage('inspection', 'Keuring / AREI-controle', {
        other: E.inspection,
        reason: 'Wettelijke controle'
      }));
    }

    var drivers = buildDrivers('elektriciteit', a, provKey, packages, E.crewSize);
    return finalize('elektriciteit', provKey, a, packages, E.crewSize, drivers);
  }

  /* ---------- GEVEL ---------- */

  function calcGevel(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || 80);
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var F = MARKET.facade;
    var rate = rateFor('facadeWorker');
    var packages = [];
    var intervention = a.intervention || 'crepi';
    var matM2 = F.materialPerM2[intervention] || F.materialPerM2.crepi;
    var hoursM2 = F.labourHoursPerM2[intervention] || F.labourHoursPerM2.crepi;
    var cond = F.conditionFactor[a.condition] || F.conditionFactor.matig;
    var elevF = F.elevationsFactor[a.elevations] || 1;
    var scaffoldKey = a.scaffold || a.access || 'laag';

    packages.push(createPackage('facade-mat', 'Gevelmateriaal', {
      material: scaleBand(matM2, size * mf * cond.base * elevF),
      reason: 'Interventie ' + intervention
    }));

    packages.push(createPackage('facade-labour', 'Gevelwerken (uren)', {
      labourHours: scaleBand(hoursM2, size * lf * cond.base * elevF),
      labourRate: rate
    }));

    if (a.finish && a.finish !== 'nee') {
      var finEx = F.finishExtra[a.finish] || F.finishExtra.basis;
      // ETICS mat already includes render — premium/basis only as partial colour/detail adder.
      var finishScale = intervention === 'isolatie_afwerking' ? 0.35 : 1;
      packages.push(createPackage('finish', 'Extra afwerking / kleur', {
        material: scaleBand(finEx, size * mf * finishScale),
        labourHours: scaleBand({ low: 0.05, base: 0.08, high: 0.12 }, size * lf * finishScale),
        labourRate: rate
      }));
    }

    if (scaffoldKey === 'middel' || scaffoldKey === 'hoog') {
      packages.push(createPackage('scaffold', 'Steiger & werfinrichting', {
        other: F.scaffold[scaffoldKey] || F.scaffold.middel,
        labourHours: scaffoldKey === 'hoog'
          ? { low: 6, base: 10, high: 14 }
          : { low: 3, base: 5, high: 8 },
        labourRate: rate,
        reason: 'Steiger verplicht bij middel/hoog'
      }));
    }

    var drivers = buildDrivers('gevel', a, provKey, packages, F.crewSize);
    return finalize('gevel', provKey, a, packages, F.crewSize, drivers);
  }

  /* ---------- ZONNEPANELEN ---------- */

  function calcZonnepanelen(answers, provKey) {
    var a = answers;
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var S = MARKET.solar;
    var rate = rateFor('solarInstaller');
    var packages = [];
    var panelWp = (S.panelWp && S.panelWp.value) || 400;
    var kwp;
    if (a.sizeMode === 'panels') {
      var panels = Math.max(1, Number(a.panelCount) || Number(a.size) || 10);
      kwp = (panels * panelWp) / 1000;
    } else {
      kwp = Math.max(0.5, Number(a.kwp) || Number(a.size) || 4);
    }
    a.size = Math.max(1, Math.round(kwp * 10) / 10);
    var wp = kwp * 1000;
    var roofF = a.roofType === 'plat' ? S.flatRoofFactor.base : 1;
    var accessF = a.access === 'moeilijk' ? S.accessHardFactor.base : 1;

    packages.push(createPackage('pv-mat', 'Panelen, omvormer & bekabeling', {
      material: scaleBand(S.materialPerWp, wp * mf * roofF),
      reason: 'Inverter inbegrepen in pakket; geen besparingsgarantie'
    }));

    packages.push(createPackage('pv-labour', 'Montage zonnepanelen', {
      labourHours: scaleBand(S.labourHoursPerKwp, kwp * lf * accessF * roofF),
      labourRate: rate,
      reason: a.access === 'moeilijk' ? 'Moeilijke daktoegang +15–25%' : 'Standaard montage'
    }));

    var adapt = S.electricalAdapt[a.electricalAdapt] || S.electricalAdapt.nee;
    if (adapt.base > 0) {
      packages.push(createPackage('electrical', 'Elektrische aanpassing', {
        other: adapt,
        labourHours: a.electricalAdapt === 'nieuw'
          ? { low: 6, base: 10, high: 16 }
          : { low: 2, base: 4, high: 7 },
        labourRate: rateFor('electrician')
      }));
    }

    if (a.battery === 'ja') {
      packages.push(createPackage('battery', 'Thuisbatterij (optioneel)', {
        material: scaleBand(S.battery, mf * 0.85),
        labourHours: { low: 6, base: 10, high: 16 },
        labourRate: rate,
        other: scaleBand(S.battery, 0.08),
        reason: 'Add-on batterij — geen payback-claim'
      }));
    }

    packages.push(createPackage('arei', 'AREI-keuring', {
      other: S.arei,
      reason: 'Keuring PV-installatie'
    }));

    var drivers = buildDrivers('zonnepanelen', a, provKey, packages, S.crewSize);
    return finalize('zonnepanelen', provKey, a, packages, S.crewSize, drivers);
  }

  /* ---------- VENTILATIE ---------- */

  function calcVentilatie(answers, provKey) {
    var a = answers;
    var size = Math.max(1, Number(a.size) || Number(a.dwellingSize) || 120);
    a.size = size;
    var mf = matFactor(a.level);
    var lf = labFactor(a.level);
    var V = MARKET.ventilation;
    var rate = rateFor('ventilationTech');
    var packages = [];
    var system = a.system || 'systeem_c';
    var ref = (V.refSizeM2 && V.refSizeM2.value) || 120;
    var sizeDelta = Math.max(0, size - ref);
    var flF = V.floorsFactor[a.floors] || 1;

    packages.push(createPackage('unit', 'Ventilatie-unit & materiaal', {
      material: scaleBand(V.unitMaterial[system] || V.unitMaterial.systeem_c, mf),
      reason: 'Systeem ' + system
    }));

    if (sizeDelta > 0) {
      var scaleMat = V.sizeScalePerM2[system] || V.sizeScalePerM2.systeem_c;
      packages.push(createPackage('size-scale', 'Schaal woninggrootte (kanalen/materiaal)', {
        material: scaleBand(scaleMat, sizeDelta * mf * 0.6),
        other: scaleBand(scaleMat, sizeDelta * 0.25)
      }));
    }

    packages.push(createPackage('install', 'Installatie ventilatie', {
      labourHours: scaleBand(V.unitLabourHours[system] || V.unitLabourHours.systeem_c, lf * flF),
      labourRate: rate
    }));

    var wet = V.wetRoomExtra[a.wetRooms] || V.wetRoomExtra['1'];
    if (wet.base > 0) {
      packages.push(createPackage('wet-rooms', 'Extra natte ruimtes', {
        material: scaleBand(wet, mf * 0.5),
        labourHours: scaleBand({ low: 2, base: 4, high: 7 }, lf),
        labourRate: rate,
        other: scaleBand(wet, 0.3)
      }));
    }

    var routeH = V.routingHours[a.routing] || V.routingHours.eenvoudig;
    if (routeH.base > 0) {
      packages.push(createPackage('routing', 'Kanaalwerk / routing', {
        labourHours: scaleBand(routeH, lf * flF),
        labourRate: rate,
        material: a.routing === 'complex'
          ? { low: 200, base: 400, high: 700 }
          : a.routing === 'renovatie'
            ? { low: 80, base: 160, high: 280 }
            : { low: 0, base: 0, high: 0 },
        reason: 'Complexiteit kanalen in renovatie'
      }));
    }

    packages.push(createPackage('commission', 'Inregeling & oplevering', {
      other: V.commissioning,
      labourHours: { low: 2, base: 3, high: 5 },
      labourRate: rate
    }));

    var drivers = buildDrivers('ventilatie', a, provKey, packages, V.crewSize);
    return finalize('ventilatie', provKey, a, packages, V.crewSize, drivers);
  }

  /* ---------- COST DRIVERS (counterfactuals) ---------- */

  function totalBaseOf(type, answers, provKey) {
    var fn = {
      badkamer: calcBadkamer,
      keuken: calcKeuken,
      dak: calcDak,
      vloeren: calcVloeren,
      schilderwerken: calcSchilderwerken,
      ramen: calcRamen,
      isolatie: calcIsolatie,
      verwarming: calcVerwarming,
      elektriciteit: calcElektriciteit,
      gevel: calcGevel,
      zonnepanelen: calcZonnepanelen,
      ventilatie: calcVentilatie
    }[type];
    // Avoid infinite recursion: compute packages without drivers
    var a = Object.assign({}, answers);
    var result;
    // Use internal path via temporary flag
    a.__skipDrivers = true;
    result = fn(a, provKey);
    return result.price;
  }

  function buildDrivers(type, answers, provKey, packages, crew) {
    if (answers.__skipDrivers) return [];
    var drivers = [];
    var baseAnswers;
    var delta;

    function pushDriver(label, altAnswers, reason, impact) {
      try {
        var current = finalize(type, provKey, answers, packages, crew, []).price;
        // Recalculate alt without drivers
        var alt = Object.assign({}, answers, altAnswers, { __skipDrivers: true });
        var altResult = {
          badkamer: calcBadkamer,
          keuken: calcKeuken,
          dak: calcDak,
          vloeren: calcVloeren,
          schilderwerken: calcSchilderwerken,
          ramen: calcRamen,
          isolatie: calcIsolatie,
          verwarming: calcVerwarming,
          elektriciteit: calcElektriciteit,
          gevel: calcGevel,
          zonnepanelen: calcZonnepanelen,
          ventilatie: calcVentilatie
        }[type](alt, provKey);
        delta = current - altResult.price;
        if (Math.abs(delta) >= 200) {
          drivers.push({
            text: label,
            amount: round50(delta),
            impact: impact || (delta > 0 ? 'hoog' : 'positief'),
            reason: reason || ''
          });
        }
      } catch (e) { /* ignore */ }
    }

    if (type === 'dak') {
      if (answers.access === 'moeilijk') {
        pushDriver('Moeilijke bereikbaarheid', { access: 'normaal' }, 'Extra steiger- en veiligheidskosten.', 'hoog');
      }
      if (answers.workType === 'volledig') {
        pushDriver('Volledige renovatie (vs. enkel bedekking)', { workType: 'vernieuwen', insulation: 'nee' }, 'Isolatie, zwaardere opbouw en meer manuren.', 'hoog');
      } else if (answers.insulation === 'ja' || answers.workType === 'isolatie') {
        pushDriver('Dakisolatie inbegrepen', { insulation: 'nee', workType: answers.workType === 'isolatie' ? 'herstelling' : answers.workType }, 'Isolatie voegt materiaal en plaatsingsuren toe.', 'hoog');
      }
      if (answers.asbestos === 'ja') {
        pushDriver('Asbestverwijdering', { asbestos: 'nee' }, 'Gespecialiseerde verwijdering is een aparte kostenpost.', 'hoog');
      }
      if (answers.gutters === 'ja') {
        pushDriver('Goten & regenafvoer vernieuwen', { gutters: 'nee' }, 'Goten en afvoer als aparte werkpost.', 'middel');
      }
      if (answers.material === 'leien') {
        pushDriver('Leien i.p.v. standaardpannen', { material: 'pannen' }, 'Leien zijn duurder in materiaal.', 'middel');
      }
    }

    if (type === 'badkamer') {
      if (answers.plumbingMove === 'ja') {
        pushDriver('Leidingen verplaatsen (nieuwe layout)', { plumbingMove: 'nee' }, 'Nieuwe water- en afvoertracés vragen meer loodgietersuren.', 'hoog');
      } else if (answers.plumbingMove === 'beperkt') {
        pushDriver('Beperkte leidingaanpassingen', { plumbingMove: 'nee' }, 'Kleine verplaatsingen verhogen loodgieterswerk.', 'middel');
      }
      if (answers.tiling === 'volledig') {
        pushDriver('Volledige wand- en vloerbetegeling', { tiling: 'gedeeltelijk' }, 'Meer tegelmateriaal en tegelzeturen.', 'hoog');
      }
      if (answers.sanitary === 'beide') {
        pushDriver('Douche én bad', { sanitary: 'douche' }, 'Dubbel sanitair verhoogt materiaal en montage.', 'hoog');
      }
      if (answers.ufh === 'ja') {
        pushDriver('Vloerverwarming', { ufh: 'nee' }, 'Extra materiaal, plaatsing en droogtijd.', 'middel');
      }
      if (answers.scope === 'volledig') {
        pushDriver('Volledige renovatie-omvang', { scope: 'gedeeltelijk' }, 'Volledige afbraak en heropbouw sturen het budget.', 'hoog');
      }
    }

    if (type === 'keuken') {
      if (answers.connections === 'ja') {
        pushDriver('Aansluitingen verplaatsen', { connections: 'nee' }, 'Loodgieter en elektricien moeten meewerken.', 'hoog');
      }
      if (answers.worktop === 'natuursteen') {
        pushDriver('Premium werkblad', { worktop: 'composiet' }, 'Natuursteen is duurder in materiaal en plaatsing.', 'hoog');
      }
      if (answers.appliances === 'uitgebreid') {
        pushDriver('Uitgebreid apparatuurpakket', { appliances: 'basis' }, 'Meer/duurdere toestellen.', 'hoog');
      } else if (answers.appliances === 'basis') {
        pushDriver('Basisapparatuur inbegrepen', { appliances: 'nee' }, 'Toestellen vormen een groot deel van het budget.', 'middel');
      }
      if (answers.cabinets === 'hoog') {
        pushDriver('Hoogwaardige / maatwerk kasten', { cabinets: 'midden' }, 'Premium korpus en fronten.', 'hoog');
      }
      if (answers.scope === 'herindelen') {
        pushDriver('Volledige herindeling', { scope: 'vervangen' }, 'Nieuwe layout vraagt meer montage en techniek.', 'hoog');
      }
    }

    if (type === 'vloeren') {
      if (answers.removal === 'ja') {
        pushDriver('Uitbreken bestaande vloer', { removal: 'nee' }, 'Afbraak, afvoer en voorbereiding.', 'middel');
      }
      if (answers.leveling === 'volledig' || answers.substrate === 'slecht') {
        pushDriver('Volledige egalisatie / slechte ondergrond', { leveling: 'beperkt', substrate: 'matig' }, 'Ondergrondvoorbereiding is cruciaal voor duurzaam resultaat.', 'hoog');
      }
      if (answers.floorMaterial === 'parket' || answers.floorMaterial === 'gietvloer' || answers.floorMaterial === 'tegel') {
        pushDriver('Materiaalkeuze (' + answers.floorMaterial + ')', { floorMaterial: 'laminaat' }, 'Duurder vloertype dan laminaat.', 'hoog');
      }
      if (answers.ufh === 'nieuw') {
        pushDriver('Nieuwe vloerverwarming', { ufh: 'nee' }, 'Installatie + impact op planning.', 'hoog');
      }
    }

    if (type === 'schilderwerken') {
      if (answers.surface === 'slecht') {
        pushDriver('Slechte ondergrond', { surface: 'goed' }, 'Meer herstel- en plamuureenuren.', 'hoog');
      } else if (answers.surface === 'matig') {
        pushDriver('Matige ondergrondvoorbereiding', { surface: 'goed' }, 'Extra voorbereidingstijd.', 'middel');
      }
      if (answers.wallpaper === 'ja') {
        pushDriver('Behang verwijderen', { wallpaper: 'nee' }, 'Arbeidsintensieve voorbereiding.', 'middel');
      }
      if (answers.darkColors === 'ja') {
        pushDriver('Donkere kleuren (extra lagen)', { darkColors: 'nee' }, 'Extra verf en schilderuren.', 'middel');
      }
      if (answers.paintScope === 'buiten' || answers.paintScope === 'beide') {
        pushDriver('Buitenschilderwerk', { paintScope: 'binnen' }, 'Buitenwerk is arbeids- en weergevoeliger.', 'hoog');
      }
      if (answers.woodwork === 'uitgebreid') {
        pushDriver('Uitgebreid schrijnwerk', { woodwork: 'nee' }, 'Precisiewerk op deuren/ramen.', 'middel');
      }
    }

    if (type === 'ramen') {
      if (answers.frame === 'aluminium') {
        pushDriver('Aluminium i.p.v. PVC', { frame: 'pvc' }, 'Aluminium kaders zijn duurder in materiaal.', 'hoog');
      } else if (answers.frame === 'hout') {
        pushDriver('Houten kaders i.p.v. PVC', { frame: 'pvc' }, 'Hout vraagt meer materiaalbudget.', 'hoog');
      }
      if (answers.sliding === 'ja' || answers.sliding === 'groot') {
        pushDriver('Schuifpartij / grote schuif', { sliding: 'nee' }, 'Schuifsystemen vermenigvuldigen materiaal en plaatsing.', 'hoog');
      }
      if (answers.glazing === 'hr+++' || answers.glazing === 'hr++') {
        pushDriver('Hoogisolerende beglazing', { glazing: 'hr' }, 'HR++/HR+++ glas verhoogt de materiaalkost.', 'middel');
      }
      if (answers.doors === '1' || answers.doors === '2plus') {
        pushDriver('Buitendeuren inbegrepen', { doors: '0' }, 'Buitendeuren zijn een aparte lump-post.', 'middel');
      }
      if (answers.removal === 'ja') {
        pushDriver('Uithalen bestaand schrijnwerk', { removal: 'nee' }, 'Demontage en afvoer.', 'middel');
      }
    }

    if (type === 'isolatie') {
      if (answers.subtype === 'buitenmuur') {
        pushDriver('Buitenmuurisolatie + afwerking', { subtype: 'spouw' }, 'ETICS-achtige opbouw is duurder dan spouw.', 'hoog');
      } else if (answers.subtype === 'binnenmuur') {
        pushDriver('Binnenmuurisolatie', { subtype: 'spouw' }, 'Binnenisolatie + afwerking weegt zwaarder.', 'hoog');
      }
      if (answers.performance === 'hoog') {
        pushDriver('Hoge isolatieprestatie', { performance: 'standaard' }, 'Dikker/prestatiever pakket.', 'middel');
      }
      if (answers.prep === 'uitgebreid') {
        pushDriver('Uitgebreide voorbereiding', { prep: 'beperkt' }, 'Extra prep op de werf.', 'middel');
      }
      if (answers.access === 'moeilijk') {
        pushDriver('Moeilijke toegang', { access: 'normaal' }, 'Toegang verhoogt uren.', 'middel');
      }
    }

    if (type === 'verwarming') {
      if (answers.projectType === 'lucht_water') {
        pushDriver('Lucht-water warmtepomp', { projectType: 'ketel_vervangen' }, 'WP is een zwaardere investering dan ketelvervanging.', 'hoog');
      } else if (answers.projectType === 'hybride') {
        pushDriver('Hybride systeem', { projectType: 'ketel_vervangen' }, 'Hybride combineert ketel en warmtepomp.', 'hoog');
      }
      if (answers.insulationLevel === 'slecht') {
        pushDriver('Zwakke woningisolatie (capaciteit)', { insulationLevel: 'matig' }, 'Slechte isolatie vraagt grotere capaciteit.', 'middel');
      }
      if (answers.dhw === 'nieuw') {
        pushDriver('Nieuw sanitair warm water', { dhw: 'behouden' }, 'Extra SWW-unit.', 'middel');
      }
      if (answers.distribution === 'gemengd') {
        pushDriver('Gemengde warmteverdeling', { distribution: 'radiatoren' }, 'Combinatie vloer/radiatoren verhoogt complexiteit.', 'middel');
      }
    }

    if (type === 'elektriciteit') {
      if (answers.scope === 'volledig' || answers.scope === 'renovatie_volledig') {
        pushDriver('Volledige herbekabeling', { scope: 'partieel' }, 'Volledige scope vermenigvuldigt uren en materiaal.', 'hoog');
      }
      if (answers.board === 'nieuw') {
        pushDriver('Nieuw verdeelbord', { board: 'behouden' }, 'Bord is een duidelijke post.', 'middel');
      }
      if (answers.fitOut === 'uitgebreid') {
        pushDriver('Uitgebreide puntbezetting', { fitOut: 'standaard' }, 'Meer stopcontacten en circuits.', 'middel');
      }
      if (answers.floors === '3plus' || answers.floors === '2') {
        pushDriver('Meerdere verdiepingen', { floors: '1' }, 'Extra trekkingen en kokers.', 'middel');
      }
    }

    if (type === 'gevel') {
      if (answers.intervention === 'isolatie_afwerking') {
        pushDriver('Gevelisolatie + afwerking', { intervention: 'crepi' }, 'ETICS weegt zwaarder dan crepi alleen.', 'hoog');
      } else if (answers.intervention === 'bekleding') {
        pushDriver('Gevelbekleding', { intervention: 'crepi' }, 'Bekleding is materiaalintensief.', 'hoog');
      }
      if (answers.scaffold === 'hoog' || answers.access === 'hoog') {
        pushDriver('Hoge steiger', { scaffold: 'laag', access: 'laag' }, 'Steiger is een aparte overige-post.', 'hoog');
      } else if (answers.scaffold === 'middel' || answers.access === 'middel') {
        pushDriver('Steiger (middel)', { scaffold: 'laag', access: 'laag' }, 'Steiger verplicht bij middel/hoog.', 'middel');
      }
      if (answers.condition === 'slecht') {
        pushDriver('Slechte gevelstaat', { condition: 'matig' }, 'Meer hersteluren.', 'middel');
      }
    }

    if (type === 'zonnepanelen') {
      if (answers.battery === 'ja') {
        pushDriver('Thuisbatterij', { battery: 'nee' }, 'Batterij is een optionele add-on zonder payback-claim.', 'hoog');
      }
      if (answers.access === 'moeilijk') {
        pushDriver('Moeilijke daktoegang', { access: 'normaal' }, 'Toeslag 15–25% op montage.', 'middel');
      }
      if (answers.electricalAdapt === 'nieuw') {
        pushDriver('Nieuwe elektrische aanpassing', { electricalAdapt: 'nee' }, 'Bord/aanpassing naast PV.', 'middel');
      } else if (answers.electricalAdapt === 'beperkt') {
        pushDriver('Beperkte elektrische aanpassing', { electricalAdapt: 'nee' }, 'Kleine elektra-aanpassing.', 'middel');
      }
      if (answers.roofType === 'plat') {
        pushDriver('Plat dak (frames/ballast)', { roofType: 'hellend' }, 'Plat dak vraagt extra bevestiging.', 'middel');
      }
    }

    if (type === 'ventilatie') {
      if (answers.system === 'systeem_d') {
        pushDriver('Systeem D (WTW)', { system: 'systeem_c' }, 'D is duurder dan C in materiaal en kanalen.', 'hoog');
      } else if (answers.system === 'decentraal') {
        pushDriver('Decentrale units (vs C)', { system: 'systeem_c' }, 'Scopeverschil t.o.v. centraal C.', 'middel');
      }
      if (answers.routing === 'complex') {
        pushDriver('Complex kanaalwerk', { routing: 'eenvoudig' }, 'Renovatiekanalen verhogen uren sterk.', 'hoog');
      } else if (answers.routing === 'renovatie') {
        pushDriver('Renovatie-routing', { routing: 'eenvoudig' }, 'Extra uren voor bestaande woning.', 'middel');
      }
      if (answers.wetRooms === '3plus') {
        pushDriver('Meerdere natte ruimtes', { wetRooms: '1' }, 'Extra afvoerpunten.', 'middel');
      }
    }

    drivers.sort(function (x, y) { return Math.abs(y.amount) - Math.abs(x.amount); });
    return drivers.slice(0, 5);
  }

  /* ---------- PUBLIC API ---------- */

  function calcEstimate(type, province, answers) {
    if (typeof answers === 'number' || answers === undefined || answers === null) {
      var sizeArg = answers;
      var levelArg = arguments[3] || 'standaard';
      answers = { size: sizeArg, level: levelArg, province: province };
      var defaults = {
        badkamer: { scope: 'gedeeltelijk', sanitary: 'douche', tiling: 'gedeeltelijk', plumbingMove: 'nee', ventilation: 'goed', ufh: 'nee', demolition: 'beperkt', housingAge: 'middel', urgency: 'binnen6' },
        keuken: { scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee', housingAge: 'middel', urgency: 'binnen6' },
        dak: { roofType: 'hellend', workType: 'vernieuwen', material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal', housingAge: 'middel', urgency: 'binnen6' },
        vloeren: { floorMaterial: 'laminaat', rooms: '2-3', removal: 'nee', substrate: 'goed', ufh: 'nee', wetRooms: 'nee', skirting: 'ja', housingAge: 'middel', urgency: 'binnen6' },
        schilderwerken: { paintScope: 'binnen', surface: 'matig', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'beperkt', housingAge: 'middel', urgency: 'binnen6' },
        ramen: { frame: 'pvc', glazing: 'hr++', sliding: 'nee', doors: '0', removal: 'ja', access: 'normaal', housingAge: 'middel', urgency: 'binnen6' },
        isolatie: { subtype: 'spouw', performance: 'standaard', access: 'normaal', prep: 'beperkt', finish: 'nee', housingAge: 'middel', urgency: 'binnen6' },
        verwarming: { projectType: 'ketel_vervangen', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'vervangen', housingAge: 'middel', urgency: 'binnen6' },
        elektriciteit: { scope: 'partieel', floors: '1', board: 'behouden', fitOut: 'standaard', inspection: 'ja', housingAge: 'middel', urgency: 'binnen6' },
        gevel: { intervention: 'crepi', condition: 'matig', elevations: '1', scaffold: 'middel', finish: 'basis', housingAge: 'middel', urgency: 'binnen6' },
        zonnepanelen: { sizeMode: 'kwp', roofType: 'hellend', access: 'normaal', electricalAdapt: 'beperkt', battery: 'nee', housingAge: 'middel', urgency: 'binnen6' },
        ventilatie: { system: 'systeem_c', wetRooms: '2', floors: '1', routing: 'renovatie', housingAge: 'middel', urgency: 'binnen6' }
      };
      var d = defaults[type] || {};
      Object.keys(d).forEach(function (k) { if (answers[k] === undefined) answers[k] = d[k]; });
    }

    answers = answers || {};
    if (!answers.province) answers.province = province;
    if (!CATEGORIES[type] || !PROVINCES[province]) {
      return {
        price: 0, low: 0, high: 0, weeksLow: 1, weeksHigh: 2,
        split: { materiaal: 0.4, arbeid: 0.5, overige: 0.1 },
        lineItems: [], drivers: [], contingency: 0, peerLow: 0, peerHigh: 0,
        confidence: 'indicatief', perM2: 0, levelLabel: 'Standaard', size: 1,
        labourHours: 0, crewSize: 0, workDays: 0, subtotalExVat: 0, vatRate: 0.21,
        vatAmount: 0, totalInclVat: 0, workPackages: [], costBreakdown: []
      };
    }

    var fn = {
      badkamer: calcBadkamer,
      keuken: calcKeuken,
      dak: calcDak,
      vloeren: calcVloeren,
      schilderwerken: calcSchilderwerken,
      ramen: calcRamen,
      isolatie: calcIsolatie,
      verwarming: calcVerwarming,
      elektriciteit: calcElektriciteit,
      gevel: calcGevel,
      zonnepanelen: calcZonnepanelen,
      ventilatie: calcVentilatie
    }[type];

    return fn(answers, province);
  }

  return {
    CATEGORIES: CATEGORIES,
    PROVINCES: PROVINCES,
    REGION_LINKS: REGION_LINKS,
    BTW_TIP: BTW_TIP,
    PRAKTISCHE_TIPS: PRAKTISCHE_TIPS,
    VOLGENDE_STAPPEN: VOLGENDE_STAPPEN,
    LEVEL_LABEL: LEVEL_LABEL,
    MARKET_DATA: MARKET,
    calcEstimate: calcEstimate,
    fmtEUR: fmtEUR,
    fmtEURDecimal: fmtEURDecimal,
    sizeDisplay: sizeDisplay,
    unitRateDisplay: unitRateDisplay,
    isValidEmail: isValidEmail,
    round50: round50
  };
});
