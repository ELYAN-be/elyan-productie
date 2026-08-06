/* ============================================================
   ELYAN — Prijsengine (Belgische mid-market richtprijzen 2025-2026)
   Indicatief. Server herberekent altijd; client toont dezelfde logica.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanPricing = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = {
    badkamer: {
      label: 'Badkamer',
      resultNoun: 'badkamerrenovatie',
      icon: 'i-bath',
      split: { materiaal: 0.40, arbeid: 0.48, overige: 0.12 },
      premieNote: 'Voor een badkamerrenovatie bestaat doorgaans geen specifieke premie, tenzij het gaat om een aanpassing voor senioren of personen met een beperking.'
    },
    keuken: {
      label: 'Keuken',
      resultNoun: 'keukenrenovatie',
      icon: 'i-utensils',
      split: { materiaal: 0.55, arbeid: 0.35, overige: 0.10 },
      premieNote: 'Voor een keukenrenovatie op zich bestaat doorgaans geen specifieke premie.'
    },
    dak: {
      label: 'Dak',
      resultNoun: 'dakrenovatie',
      icon: 'i-roof',
      split: { materiaal: 0.55, arbeid: 0.38, overige: 0.07 },
      premieNote: 'Dakisolatie is één van de meest gesubsidieerde renovatiewerken in België — zeker het controleren waard via het loket van jouw regio.'
    },
    vloeren: {
      label: 'Vloeren',
      resultNoun: 'vloerrenovatie',
      icon: 'i-layers',
      split: { materiaal: 0.50, arbeid: 0.40, overige: 0.10 },
      premieNote: 'Bij vloerisolatie kom je in sommige regio’s in aanmerking voor een energiepremie.'
    },
    schilderwerken: {
      label: 'Schilderwerken',
      resultNoun: 'schilderwerken',
      icon: 'i-roller',
      split: { materiaal: 0.25, arbeid: 0.65, overige: 0.10 },
      premieNote: 'Voor schilderwerken op zich zijn er doorgaans geen premies beschikbaar.'
    }
  };

  var PROVINCES = {
    antwerpen: { label: 'Antwerpen', mult: 1.06, region: 'vlaanderen' },
    brussel: { label: 'Brussel', mult: 1.15, region: 'brussel' },
    henegouwen: { label: 'Henegouwen', mult: 0.94, region: 'wallonie' },
    limburg: { label: 'Limburg', mult: 0.97, region: 'vlaanderen' },
    luik: { label: 'Luik', mult: 0.97, region: 'wallonie' },
    luxemburg: { label: 'Luxemburg', mult: 0.92, region: 'wallonie' },
    namen: { label: 'Namen', mult: 0.94, region: 'wallonie' },
    'oost-vlaanderen': { label: 'Oost-Vlaanderen', mult: 1.02, region: 'vlaanderen' },
    'vlaams-brabant': { label: 'Vlaams-Brabant', mult: 1.08, region: 'vlaanderen' },
    'waals-brabant': { label: 'Waals-Brabant', mult: 1.08, region: 'wallonie' },
    'west-vlaanderen': { label: 'West-Vlaanderen', mult: 1.00, region: 'vlaanderen' }
  };

  var REGION_LINKS = {
    vlaanderen: { label: 'Mijn VerbouwPremie (Vlaanderen)', url: 'https://www.mijnverbouwpremie.be' },
    wallonie: { label: 'Primes Habitation (Wallonie)', url: 'https://energie.wallonie.be' },
    brussel: { label: 'Renolution (Brussel)', url: 'https://leefmilieu.brussels/professionelen/subsidies/renolution-premies' }
  };

  var BTW_TIP = 'Is je woning ouder dan 10 jaar? Dan kom je mogelijk in aanmerking voor het verlaagd btw-tarief van 6% in plaats van 21%.';

  var PRAKTISCHE_TIPS = [
    'Vraag steeds minstens 3 offertes op voor je een aannemer kiest.',
    'Voorzie 10 à 15% van je budget als buffer voor onvoorziene kosten.',
    'Controleer het ondernemingsnummer en de erkenning van je aannemer.',
    'Leg afspraken over timing en betaling altijd schriftelijk vast.'
  ];

  var VOLGENDE_STAPPEN = [
    'Vraag minstens 3 offertes op bij erkende aannemers en vergelijk ze met dit rapport.',
    'Check of jouw project in aanmerking komt voor een premie via het officiële loket van jouw regio.',
    'Voorzie een buffer van 10 à 15% van je budget voor onvoorziene kosten.',
    'Leg een gewenste startdatum vast, rekening houdend met de geschatte duurtijd hierboven.',
    'Bewaar dit rapport als referentie tijdens je gesprekken met aannemers.'
  ];

  var LEVEL_MULT = { basis: 0.88, standaard: 1.0, premium: 1.32 };
  var LEVEL_LABEL = { basis: 'Basis', standaard: 'Standaard', premium: 'Premium' };

  function round50(n) {
    return Math.round(n / 50) * 50;
  }

  function fmtEUR(n) {
    return '€' + Math.round(n).toLocaleString('nl-BE');
  }

  function isValidEmail(v) {
    return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  }

  function pick(map, key, fallback) {
    return map[key] !== undefined ? map[key] : fallback;
  }

  function addItem(items, label, amount, bucket) {
    var amt = Math.round(amount);
    if (amt <= 0) return;
    items.push({ label: label, amount: amt, bucket: bucket || 'overige' });
  }

  function weeksFromDays(days) {
    var weeksLow = Math.max(1, Math.round((days / 7) * 0.85));
    var weeksHigh = Math.max(weeksLow + 1, Math.round((days / 7) * 1.25));
    return { weeksLow: weeksLow, weeksHigh: weeksHigh };
  }

  function finalize(catKey, provKey, answers, items, days, drivers, bandPad) {
    var cat = CATEGORIES[catKey];
    var prov = PROVINCES[provKey];
    var level = answers.level || 'standaard';
    var size = Math.max(1, Number(answers.size) || 1);
    var subtotal = 0;
    items.forEach(function (it) { subtotal += it.amount; });

    var withRegion = subtotal * (prov ? prov.mult : 1);
    var mid = round50(Math.max(500, withRegion));
    var padLow = bandPad && bandPad.low !== undefined ? bandPad.low : 0.87;
    var padHigh = bandPad && bandPad.high !== undefined ? bandPad.high : 1.18;
    var low = round50(mid * padLow);
    var high = round50(mid * padHigh);
    if (high <= low) high = low + 500;

    var weeks = weeksFromDays(days);
    var contingency = round50(mid * 0.12);

    var buckets = { materiaal: 0, arbeid: 0, overige: 0 };
    items.forEach(function (it) {
      buckets[it.bucket] = (buckets[it.bucket] || 0) + it.amount;
    });
    var itemSum = buckets.materiaal + buckets.arbeid + buckets.overige || 1;
    var split = {
      materiaal: buckets.materiaal / itemSum,
      arbeid: buckets.arbeid / itemSum,
      overige: buckets.overige / itemSum
    };
    // fallback to category defaults if empty
    if (!itemSum) split = cat.split;

    var scaledItems = items.map(function (it) {
      return {
        label: it.label,
        amount: round50(it.amount * (prov ? prov.mult : 1) * (mid / Math.max(1, withRegion))),
        bucket: it.bucket
      };
    });
    // Fix rounding so items sum near mid
    var scaledSum = 0;
    scaledItems.forEach(function (it) { scaledSum += it.amount; });
    if (scaledItems.length && scaledSum !== mid) {
      scaledItems[scaledItems.length - 1].amount += mid - scaledSum;
    }

    var peerLow = round50(low * 0.95);
    var peerHigh = round50(high * 1.05);

    var unknownCount = 0;
    Object.keys(answers).forEach(function (k) {
      if (answers[k] === 'onbekend' || answers[k] === 'mogelijk') unknownCount++;
    });
    var confidence = unknownCount >= 2 ? 'indicatief' : unknownCount === 1 ? 'gemiddeld' : 'hoog';

    return {
      price: mid,
      low: low,
      high: high,
      weeksLow: weeks.weeksLow,
      weeksHigh: weeks.weeksHigh,
      split: {
        materiaal: Math.round(split.materiaal * 100) / 100,
        arbeid: Math.round(split.arbeid * 100) / 100,
        overige: Math.round(split.overige * 100) / 100
      },
      lineItems: scaledItems,
      drivers: drivers.slice(0, 5),
      contingency: contingency,
      peerLow: peerLow,
      peerHigh: peerHigh,
      confidence: confidence,
      perM2: Math.round(mid / size),
      levelLabel: LEVEL_LABEL[level] || level,
      size: size
    };
  }

  /* ---------- category calculators ---------- */

  function calcBadkamer(answers, provKey) {
    var a = answers;
    var lm = pick(LEVEL_MULT, a.level, 1);
    var size = Math.max(1, Number(a.size) || 6);
    var items = [];
    var drivers = [];
    var days = 8;

    var scopeBase = { opfrissing: 3200, gedeeltelijk: 5500, volledig: 8200 };
    var base = pick(scopeBase, a.scope, 5500) * lm;
    addItem(items, 'Basispakket badkamerrenovatie', base, 'arbeid');
    drivers.push({
      text: 'Omvang van de werken (' + (a.scope || 'gedeeltelijk') + ') bepaalt het startbudget.',
      impact: 'hoog'
    });

    addItem(items, 'Afwerking & montage per m²', size * 220 * lm, 'arbeid');
    days += size * 0.7;

    var sanitary = {
      douche: { m: 1600, a: 900 },
      bad: { m: 1900, a: 1000 },
      beide: { m: 3400, a: 1600 },
      behouden: { m: 200, a: 150 }
    };
    var san = pick(sanitary, a.sanitary, sanitary.douche);
    addItem(items, 'Sanitair & plaatsing', (san.m + san.a) * lm, a.sanitary === 'behouden' ? 'arbeid' : 'materiaal');
    if (a.sanitary === 'beide') drivers.push({ text: 'Douche én bad verhogen het sanitaire budget sterk.', impact: 'hoog' });

    var tiling = { volledig: size * 140, gedeeltelijk: size * 75, schilder: size * 35 };
    addItem(items, 'Betegeling / wandafwerking', pick(tiling, a.tiling, size * 75) * lm, 'materiaal');
    if (a.tiling === 'volledig') {
      drivers.push({ text: 'Volledige betegeling vraagt meer materiaal en werkuren.', impact: 'middel' });
      days += size * 0.35;
    }

    if (a.plumbingMove === 'beperkt') {
      addItem(items, 'Beperkte leidingaanpassingen', 1400 * lm, 'arbeid');
      days += 2;
    } else if (a.plumbingMove === 'ja') {
      addItem(items, 'Leidingen verplaatsen (nieuwe layout)', 3200 * lm, 'arbeid');
      drivers.push({ text: 'Leidingen verplaatsen is een belangrijke meerprijs.', impact: 'hoog' });
      days += 4;
    } else {
      drivers.push({ text: 'Leidingen op dezelfde plaats houden remt de kostprijs.', impact: 'positief' });
    }

    if (a.ventilation === 'verbeteren' || a.ventilation === 'onbekend') {
      addItem(items, 'Ventilatie verbeteren', a.ventilation === 'onbekend' ? 450 : 750, 'overige');
    }

    if (a.ufh === 'ja') {
      addItem(items, 'Vloerverwarming badkamer', size * 95 * lm + 650, 'materiaal');
      drivers.push({ text: 'Vloerverwarming verhoogt comfort én droogtijd.', impact: 'middel' });
      days += 3;
    }

    if (a.scope === 'gedeeltelijk' || a.scope === 'volledig') {
      if (a.demolition === 'volledig') {
        addItem(items, 'Volledige afbraak & afvoer', 1600 + size * 40, 'overige');
        days += 3;
      } else if (a.demolition === 'beperkt') {
        addItem(items, 'Beperkte demontage & afvoer', 700 + size * 20, 'overige');
        days += 1;
      }
    }

    addItem(items, 'Afwerking, kitwerk & oplevering', 450 * lm, 'overige');

    var band = { low: 0.86, high: 1.2 };
    if (a.plumbingMove === 'ja' || a.scope === 'volledig') band = { low: 0.84, high: 1.22 };
    return finalize('badkamer', provKey, a, items, days, drivers, band);
  }

  function calcKeuken(answers, provKey) {
    var a = answers;
    var lm = pick(LEVEL_MULT, a.level, 1);
    var size = Math.max(1, Number(a.size) || 12);
    var items = [];
    var drivers = [];
    var days = 10;

    var scopeBase = { fronten: 4500, vervangen: 9500, herindelen: 14000 };
    addItem(items, 'Basispakket keukenrenovatie', pick(scopeBase, a.scope, 9500) * lm, 'materiaal');
    drivers.push({ text: 'Keukentype en omvang vormen de kern van het budget.', impact: 'hoog' });

    var cabMult = { budget: 0.9, midden: 1.05, hoog: 1.35 };
    var cab = pick(cabMult, a.cabinets, 1.05);
    addItem(items, 'Keukenkasten & montage', size * 380 * cab * lm, 'materiaal');
    days += size * 0.55;

    var apps = { nee: 0, basis: 2800, uitgebreid: 5200 };
    var appAmt = pick(apps, a.appliances, 0) * lm;
    if (appAmt) {
      addItem(items, 'Inbouwapparatuur', appAmt, 'materiaal');
      drivers.push({ text: 'Toestellen wegen zwaar door in het totaalbudget.', impact: 'hoog' });
    }

    var top = { laminaat: 900, composiet: 2200, natuursteen: 3800 };
    addItem(items, 'Werkblad', pick(top, a.worktop, 2200) * lm, 'materiaal');

    if (a.scope === 'vervangen' || a.scope === 'herindelen') {
      if (a.connections === 'beperkt') {
        addItem(items, 'Aanpassen aansluitingen', 1200 * lm, 'arbeid');
        days += 2;
      } else if (a.connections === 'ja') {
        addItem(items, 'Verplaatsen water & elektriciteit', 2800 * lm, 'arbeid');
        drivers.push({ text: 'Aansluitingen verplaatsen verhoogt arbeid en planning.', impact: 'hoog' });
        days += 4;
      }
    }

    if (a.splashback === 'ja') addItem(items, 'Spatwand / betegeling', 650 * lm, 'materiaal');
    if (a.flooring === 'ja') {
      addItem(items, 'Keukenvloer vernieuwen', size * 55 * lm, 'materiaal');
      days += 2;
    }

    addItem(items, 'Plaatsing, afwerking & oplevering', 1800 * lm, 'arbeid');
    if (a.scope === 'herindelen') days += 6;
    if (a.scope === 'vervangen') days += 3;

    return finalize('keuken', provKey, a, items, days, drivers, { low: 0.86, high: 1.2 });
  }

  function calcDak(answers, provKey) {
    var a = answers;
    var lm = pick(LEVEL_MULT, a.level, 1);
    var size = Math.max(1, Number(a.size) || 90);
    var items = [];
    var drivers = [];
    var days = 4;

    var workPerM2 = {
      herstelling: 35,
      isolatie: 75,
      vernieuwen: 95,
      volledig: 130
    };
    var per = pick(workPerM2, a.workType, 95) * lm;
    var minJob = { herstelling: 1800, isolatie: 4500, vernieuwen: 7000, volledig: 11000 };
    var workAmt = Math.max(pick(minJob, a.workType, 7000) * lm, size * per);
    addItem(items, 'Dakwerken (richtprijs)', workAmt, 'materiaal');
    drivers.push({ text: 'Type dakwerk en oppervlakte bepalen het grootste deel van de prijs.', impact: 'hoog' });
    days += size * (a.workType === 'herstelling' ? 0.04 : 0.12);

    var matAdd = { pannen: 8, leien: 18, epdm: 5, onbekend: 6 };
    if (a.material) addItem(items, 'Materiaaltoeslag bedekking', size * pick(matAdd, a.material, 6) * lm, 'materiaal');

    if (a.insulation === 'ja' || a.workType === 'isolatie' || a.workType === 'volledig') {
      if (a.workType !== 'isolatie' && a.workType !== 'volledig') {
        addItem(items, 'Dakisolatie', size * 45 * lm, 'materiaal');
      }
      drivers.push({ text: 'Dakisolatie verbetert comfort en opent vaak premiekansen.', impact: 'positief' });
    }

    if (a.gutters === 'ja' || a.gutters === 'onbekend') {
      addItem(items, 'Goten & regenafvoer', (a.gutters === 'onbekend' ? 900 : 1600) * lm, 'overige');
    }

    var access = { vlot: 1, normaal: 1.08, moeilijk: 1.2 };
    var accessMult = pick(access, a.access, 1.08);
    if (accessMult > 1) {
      addItem(items, 'Toegang, steiger & veiligheid', workAmt * (accessMult - 1), 'arbeid');
      if (a.access === 'moeilijk') drivers.push({ text: 'Moeilijke toegang verhoogt steiger- en veiligheidskosten.', impact: 'middel' });
    }

    if (a.asbestos === 'mogelijk') {
      addItem(items, 'Buffer asbestonderzoek / voorzorg', 1200, 'overige');
      drivers.push({ text: 'Mogelijke asbest vraagt onderzoek vóór de start.', impact: 'hoog' });
    } else if (a.asbestos === 'ja') {
      addItem(items, 'Asbestverwijdering (indicatief)', Math.max(2500, size * 18), 'overige');
      drivers.push({ text: 'Asbestverwijdering is een aparte, gereglementeerde kostenpost.', impact: 'hoog' });
      days += 3;
    }

    addItem(items, 'Afwerking details & oplevering', 800 * lm, 'arbeid');

    var band = { low: 0.85, high: 1.22 };
    if (a.asbestos === 'ja' || a.asbestos === 'mogelijk') band = { low: 0.82, high: 1.28 };
    return finalize('dak', provKey, a, items, days, drivers, band);
  }

  function calcVloeren(answers, provKey) {
    var a = answers;
    var lm = pick(LEVEL_MULT, a.level, 1);
    var size = Math.max(1, Number(a.size) || 30);
    var items = [];
    var drivers = [];
    var days = 2;

    var matPer = { laminaat: 28, parket: 55, tegel: 48, gietvloer: 85 };
    var labPer = { laminaat: 18, parket: 28, tegel: 32, gietvloer: 40 };
    var mKey = a.floorMaterial || 'laminaat';
    addItem(items, 'Vloermateriaal', size * pick(matPer, mKey, 28) * lm, 'materiaal');
    addItem(items, 'Plaatsing', size * pick(labPer, mKey, 18) * lm, 'arbeid');
    drivers.push({ text: 'Materiaalkeuze (' + mKey + ') stuurt zowel prijs als plaatsingstijd.', impact: 'hoog' });
    days += size * 0.08;

    var roomAdd = { '1': 0, '2-3': 180, meer: 420 };
    addItem(items, 'Meerwerk meerdere ruimtes', pick(roomAdd, a.rooms, 0), 'arbeid');

    if (a.removal === 'ja') {
      addItem(items, 'Uitbreken bestaande vloer', size * 12 + 250, 'overige');
      days += size * 0.03;
    } else if (a.removal === 'onbekend') {
      addItem(items, 'Buffer uitbraak', size * 6, 'overige');
    }

    if (a.leveling === 'beperkt' || a.substrate === 'matig') {
      addItem(items, 'Beperkte egalisatie', size * 14 * lm, 'arbeid');
    }
    if (a.leveling === 'volledig' || a.substrate === 'slecht') {
      addItem(items, 'Volledige egalisatie / chape-voorbereiding', size * 28 * lm, 'arbeid');
      drivers.push({ text: 'Een zwakke ondergrond vraagt egalisatie — een aparte kostenpost.', impact: 'middel' });
      days += 2;
    } else if (a.leveling === 'onbekend') {
      addItem(items, 'Buffer ondergrond', size * 10, 'overige');
    }

    if (a.ufh === 'nieuw') {
      addItem(items, 'Nieuwe vloerverwarming (indicatief)', size * 70 * lm, 'materiaal');
      drivers.push({ text: 'Nieuwe vloerverwarming verlengt de planning door droogtijd.', impact: 'middel' });
      days += 5;
    } else if (a.ufh === 'bestaand') {
      addItem(items, 'Aanpassing rond bestaande vloerverwarming', size * 8, 'arbeid');
    }

    if (a.wetRooms === 'ja') {
      addItem(items, 'Extra voor natte zones', 450 * lm, 'overige');
    }
    if (a.skirting === 'ja') {
      addItem(items, 'Plinten leveren & plaatsen', Math.max(180, size * 4.5) * lm, 'materiaal');
    }

    return finalize('vloeren', provKey, a, items, days, drivers, { low: 0.88, high: 1.16 });
  }

  function calcSchilderwerken(answers, provKey) {
    var a = answers;
    var lm = pick(LEVEL_MULT, a.level, 1);
    var size = Math.max(1, Number(a.size) || 60);
    var items = [];
    var drivers = [];
    var days = 2;

    var basePer = { basis: 16, standaard: 24, premium: 36 };
    var per = pick(basePer, a.level, 24);
    if (a.paintScope === 'buiten') per *= 1.15;
    if (a.paintScope === 'beide') per *= 1.2;

    addItem(items, 'Schilderwerken (materiaal + arbeid)', size * per, 'arbeid');
    addItem(items, 'Verf & primers', size * (4.5 * lm), 'materiaal');
    drivers.push({ text: 'Oppervlakte en afwerkingsniveau bepalen het basisbedrag.', impact: 'hoog' });
    days += size * 0.045;

    var surf = { goed: 0, matig: size * 4, slecht: size * 9 };
    var prep = pick(surf, a.surface, 0);
    if (prep) {
      addItem(items, 'Voorbereiding ondergrond', prep * lm, 'arbeid');
      drivers.push({ text: 'De staat van de ondergrond bepaalt veel van de voorbereidingstijd.', impact: 'middel' });
      days += a.surface === 'slecht' ? 3 : 1;
    }

    if (a.wallpaper === 'gedeeltelijk') addItem(items, 'Behang gedeeltelijk verwijderen', size * 3.5, 'arbeid');
    if (a.wallpaper === 'ja') {
      addItem(items, 'Behang verwijderen', size * 6.5, 'arbeid');
      days += 2;
    }

    if (a.colors === '2-3') addItem(items, 'Meerwerk meerdere kleuren', 180, 'arbeid');
    if (a.colors === 'meer') addItem(items, 'Meerwerk complexe kleurverdeling', 420, 'arbeid');

    if (a.darkColors === 'ja') {
      addItem(items, 'Extra lagen voor donkere kleuren', size * 3.2 * lm, 'materiaal');
      drivers.push({ text: 'Donkere kleuren vragen meestal extra lagen.', impact: 'middel' });
      days += 1;
    }

    if (a.woodwork === 'beperkt') addItem(items, 'Binnenschrijnwerk (beperkt)', 450 * lm, 'arbeid');
    if (a.woodwork === 'uitgebreid') {
      addItem(items, 'Binnenschrijnwerk (uitgebreid)', 1200 * lm, 'arbeid');
      days += 2;
    }

    if (a.floors === '2') addItem(items, 'Hoogte / steiger 2 bouwlagen', 650, 'overige');
    if (a.floors === '3plus') {
      addItem(items, 'Hoogte / steiger 3+ bouwlagen', 1400, 'overige');
      drivers.push({ text: 'Hoger buitenwerk vraagt steiger en veiligheidsmaatregelen.', impact: 'middel' });
    }

    addItem(items, 'Afplakken, bescherming & oplevering', Math.max(120, size * 1.2), 'overige');

    return finalize('schilderwerken', provKey, a, items, days, drivers, { low: 0.88, high: 1.15 });
  }

  function calcEstimate(type, province, answers) {
    // Backwards-compatible: calcEstimate(type, province, size, level)
    if (typeof answers === 'number' || answers === undefined || answers === null) {
      var sizeArg = answers;
      var levelArg = arguments[3] || 'standaard';
      answers = { size: sizeArg, level: levelArg, province: province };
      // sensible demo defaults per category
      var defaults = {
        badkamer: { scope: 'gedeeltelijk', sanitary: 'douche', tiling: 'gedeeltelijk', plumbingMove: 'nee', ventilation: 'goed', ufh: 'nee', demolition: 'beperkt', housingAge: 'middel', urgency: 'binnen6' },
        keuken: { scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee', housingAge: 'middel', urgency: 'binnen6' },
        dak: { roofType: 'hellend', workType: 'vernieuwen', material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal', housingAge: 'middel', urgency: 'binnen6' },
        vloeren: { floorMaterial: 'laminaat', rooms: '2-3', removal: 'nee', substrate: 'goed', ufh: 'nee', wetRooms: 'nee', skirting: 'ja', housingAge: 'middel', urgency: 'binnen6' },
        schilderwerken: { paintScope: 'binnen', surface: 'matig', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'beperkt', housingAge: 'middel', urgency: 'binnen6' }
      };
      var d = defaults[type] || {};
      Object.keys(d).forEach(function (k) { if (answers[k] === undefined) answers[k] = d[k]; });
    }

    answers = answers || {};
    if (!answers.province) answers.province = province;
    if (!CATEGORIES[type] || !PROVINCES[province]) {
      return { price: 0, low: 0, high: 0, weeksLow: 1, weeksHigh: 2, split: { materiaal: 0.4, arbeid: 0.5, overige: 0.1 }, lineItems: [], drivers: [], contingency: 0, peerLow: 0, peerHigh: 0, confidence: 'indicatief', perM2: 0, levelLabel: 'Standaard', size: 1 };
    }

    var fn = {
      badkamer: calcBadkamer,
      keuken: calcKeuken,
      dak: calcDak,
      vloeren: calcVloeren,
      schilderwerken: calcSchilderwerken
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
    calcEstimate: calcEstimate,
    fmtEUR: fmtEUR,
    isValidEmail: isValidEmail,
    round50: round50
  };
});
