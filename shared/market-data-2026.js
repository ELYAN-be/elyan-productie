/* ============================================================
   ELYAN. Belgische marktprijzen 2026 (audit-proof)
   Alle marktprijzen intern EXCLUSIEF BTW.
   Zie docs/pricing-research-2026.md voor bronnen & normalisatie.
   kind: "marketBenchmark" | "modelAssumption" | "officialRegulation"
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanMarketData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MARKET_DATA = {
    meta: {
      market: 'Belgium',
      year: 2026,
      asOf: '2026-08-10',
      version: '2026.3.1-audit7',
      currency: 'EUR',
      vatInternal: 'excl',
      labourNote: 'Gefactureerde aannemerstarieven; overhead/winst in tarief, geen dubbele marge'
    },

    /* ---------- Source registry ---------- */
    sources: {
      vyverman: {
        url: 'https://dakwerkenvyverman.be/blog/wat-kost-een-dakrenovatie/',
        title: 'Dakwerken Vyverman, dakrenovatie 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium / Oost-Vlaanderen',
        vatStatus: 'excl',
        reliability: 'high'
      },
      vakmanDak: {
        url: 'https://vakmanprijzen.be/dakwerker',
        title: 'Vakmanprijzen.be, dakwerker 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      housingService: {
        url: 'https://www.housing-service.be/nl/dakrenovatie-belgie-2026/',
        title: 'Housing-service, dakrenovatie België 2026',
        publishedOrUpdated: '2026-07-17',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'mixed',
        reliability: 'medium',
        note: '€/m² bullets unclear; 100 m² total stated incl. VAT, soft corroboration only'
      },
      vakmanVloer: {
        url: 'https://vakmanprijzen.be/vloeren',
        title: 'Vakmanprijzen.be, vloeren 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      vloerMan: {
        url: 'https://www.vloerman.be/prijs-vloer-leggen/',
        title: 'Vloerman, prijs vloer leggen 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Flanders',
        vatStatus: 'incl',
        reliability: 'medium'
      },
      badkamerAdvies: {
        url: 'https://www.badkamer-advies.be/prijs',
        title: 'Badkamer-advies.be, prijs 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      renovatieKampioenBath: {
        url: 'https://renovatiekampioen.be/badkamer-renovatie/prijs/',
        title: 'Renovatiekampioen, badkamer prijs 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'Soft corroboration only. VAT not stated on main table'
      },
      bobexTegel: {
        url: 'https://www.bobex.be/nl-be/badkamerrenovatie/betegelen/',
        title: 'Bobex, badkamer betegelen',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      bouwplannenTegel: {
        url: 'https://bouwplannen.be/badkamer-betegelen-prijs/',
        title: 'Bouwplannen.be, badkamer betegelen 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      alkeba: {
        url: 'https://www.alkeba.be/keuken/prijs/',
        title: 'Alkeba, nieuwe keuken prijs BE',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'BE all-in consumer ranges; VAT not explicit, soft benchmark'
      },
      prijzenKeukens: {
        url: 'https://www.prijzenkeukens.be/prijzen-keukens/',
        title: 'Prijzenkeukens.be',
        publishedOrUpdated: 'approx 2024-2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'low'
      },
      vakmanSchilder: {
        url: 'https://vakmanprijzen.be/schilder',
        title: 'Vakmanprijzen.be, schilder & pleisterwerk 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high',
        note: 'Explicit excl. btw on €/m² and hourly tables'
      },
      schilderBuurt: {
        url: 'https://www.schilder-in-de-buurt.be/prijzen/',
        title: 'Schilder-in-de-buurt, prijzen 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Flanders',
        vatStatus: 'incl-ambiguous',
        reliability: 'medium',
        note: 'States incl. VAT; mentions 6% may apply for homes >10y but does NOT state that the published €20–35 already embeds 6%. Soft only. Norm@6%: ~€18.9–33.0; @21%: ~€16.5–28.9.'
      },
      bouwadviseurSchilder: {
        url: 'https://www.bouwadviseur.be/schilderwerken/binnenschilder/',
        title: 'Bouwadviseur, binnenschilder',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      dakpannenDelanghe: {
        url: 'https://www.dakwerken-delanghe.be/dakpannen/prijs/',
        title: 'Dakwerken De Langhe, dakpannen prijs/m² 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high',
        note: 'Separates materiaal excl. btw from plaatsing €/m²'
      },
      dakpannenBkg: {
        url: 'https://www.bkgdakwerken.be/prijzen-dakpannen',
        title: 'BKG Dakwerken, prijzen dakpannen',
        publishedOrUpdated: 'n.d. (consulted 2026)',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      tipsentricksKeuken: {
        url: 'https://www.tipsentricks.be/keuken-renoveren',
        title: 'Tipsentricks.be, keuken renoveren/vervangen',
        publishedOrUpdated: 'n.d. (consulted 2026)',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high',
        note: 'Nieuwe keuken €10–25k excl. btw incl. plaatsing; deelrenovatie €500–3k'
      },
      bobexKeuken: {
        url: 'https://www.bobex.be/nl-be/keuken/keukenrenovatie/',
        title: 'Bobex, keukenrenovatie prijs 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'Middenklasse €8–12k; luxe vanaf €20k. VAT not stated on table'
      },
      dakgootMdw: {
        url: 'https://www.mijn-dakwerker.be/dakgoot-vervangen',
        title: 'Mijn-dakwerker, dakgoot vervangen',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      dakgootDelanghe: {
        url: 'https://www.dakwerken-delanghe.be/dakgoot-vervangen/',
        title: 'Dakwerken De Langhe, dakgoot 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'States incl. plaatsing; VAT not explicit on €/lm, corroboration'
      },
      blueSkySteiger: {
        url: 'https://www.blueskyeurope.be/steiger-huren-prijs/',
        title: 'Blue Sky Europe, steiger huren BE',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      woongidsSteiger: {
        url: 'https://www.de-woongids.be/steiger-huren-plaatsers-en-prijzen/',
        title: 'De Woongids, steiger huren',
        publishedOrUpdated: 'n.d.',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      keurAsbest: {
        url: 'https://keur.be/asbest/verwijderen/kosten/',
        title: 'Keur.be, asbest verwijderen kosten 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Flanders',
        vatStatus: 'excl',
        reliability: 'medium',
        note: 'Claims excl. VAT + disposal for bonded asbestos'
      },
      asbestDeskundigen: {
        url: 'https://www.asbestdeskundigen.be/asbest-verwijderen/dak/',
        title: 'Asbestdeskundigen, asbestdak',
        publishedOrUpdated: 'n.d.',
        consulted: '2026-08-07',
        region: 'Flanders',
        vatStatus: 'incl',
        reliability: 'medium'
      },
      vakmanLoodgieter: {
        url: 'https://vakmanprijzen.be/loodgieter',
        title: 'Vakmanprijzen, loodgieter 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      vakmanOverview: {
        url: 'https://vakmanprijzen.be/',
        title: 'Vakmanprijzen, overview 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      elektricienBuurt: {
        url: 'https://vakmanindebuurt.be/elektricien-prijs/',
        title: 'Vakmanindebuurt, elektricien 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'medium'
      },
      vlaanderenMvp: {
        url: 'https://www.vlaanderen.be/bouwen-wonen-en-energie/bouwen-en-verbouwen/premies-voor-renovatie/mijn-verbouwpremie/wijzigingen-mijn-verbouwpremie-vanaf-2026',
        title: 'Vlaanderen.be. MVP wijzigingen 2026',
        publishedOrUpdated: '2026-02 / in force 2026-03-01',
        consulted: '2026-08-07',
        region: 'Flanders',
        vatStatus: 'n/a',
        reliability: 'official'
      },
      fodBtw: {
        url: 'https://financien.belgium.be/',
        title: 'FOD Financiën, btw renovatie 6%/21%',
        publishedOrUpdated: 'ongoing',
        consulted: '2026-08-07',
        region: 'Belgium',
        vatStatus: 'n/a',
        reliability: 'official'
      },
      vakmanRamen: {
        url: 'https://vakmanprijzen.be/schrijnwerker',
        title: 'Vakmanprijzen, schrijnwerker / ramen 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'medium',
        note: 'Hourly + soft all-in window ranges; consumer pages often incl. → normalize @6%'
      },
      bobexRamen: {
        url: 'https://www.bobex.be/nl-be/ramen-deuren/',
        title: 'Bobex, ramen & deuren prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'incl',
        reliability: 'medium',
        note: 'Consumer incl. ranges €350–650/m² PVC typ.; norm@6% ≈ €330–613 excl.'
      },
      renovatieKampioenRamen: {
        url: 'https://renovatiekampioen.be/ramen-plaatsen/prijs/',
        title: 'Renovatiekampioen, ramen prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      vakmanIsolatie: {
        url: 'https://vakmanprijzen.be/isolatie',
        title: 'Vakmanprijzen, isolatie 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      energiesparenIsolatie: {
        url: 'https://www.energiesparen.be/',
        title: 'Vlaanderen energiesparen, isolatie richtprijzen',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Flanders',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'Soft corroboration for spouw/dak/vloer bands'
      },
      vakmanVerwarming: {
        url: 'https://vakmanprijzen.be/verwarming',
        title: 'Vakmanprijzen, verwarming / warmtepomp 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      bobexWarmtepomp: {
        url: 'https://www.bobex.be/nl-be/verwarming/warmtepomp/',
        title: 'Bobex, warmtepomp prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      vakmanElektra: {
        url: 'https://vakmanprijzen.be/elektricien',
        title: 'Vakmanprijzen, elektricien 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high'
      },
      bobexElektra: {
        url: 'https://www.bobex.be/nl-be/elektriciteit/',
        title: 'Bobex, elektrische installatie renovatie',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      renovatieKampioenElektra: {
        url: 'https://renovatiekampioen.be/elektriciteit/prijs/',
        title: 'Renovatiekampioen, elektriciteit vernieuwen prijs 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-10',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'high',
        note: 'Full rewire €70–120/m² woonoppervlak; keuring €120–250; soft VAT on consumer page'
      },
      zonrElektra: {
        url: 'https://zonr.be/kosten/elektriciteitswerken',
        title: 'Zonr, elektriciteitswerken kosten 2026',
        publishedOrUpdated: '2026-07',
        consulted: '2026-08-10',
        region: 'Flanders',
        vatStatus: 'unclear',
        reliability: 'medium',
        note: 'Full reinstall €5–15k project; soft corroboration for €/m² bands'
      },
      gevelExpertEtics: {
        url: 'https://www.gevelexpert.be/crepi/isolatie/',
        title: 'Gevelexpert, crepi isolatie / ETICS prijs',
        publishedOrUpdated: '2025–2026',
        consulted: '2026-08-10',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high',
        note: 'ETICS crepi €80–140/m² excl. placement; breakdown boards+labour+render'
      },
      kijzerGevel: {
        url: 'https://www.kijzer.be/gevelrenovatie/gevelisolatie/',
        title: 'Kijzer, gevelisolatie Vlaanderen prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-10',
        region: 'Flanders',
        vatStatus: 'excl',
        reliability: 'medium',
        note: 'Indicative €100–150/m² excl. for insulated facade + finish'
      },
      vakmanGevel: {
        url: 'https://vakmanprijzen.be/gevelrenovatie',
        title: 'Vakmanprijzen, gevelrenovatie 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'medium'
      },
      bobexGevel: {
        url: 'https://www.bobex.be/nl-be/gevel/',
        title: 'Bobex, gevelwerken prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      },
      vakmanSolar: {
        url: 'https://vakmanprijzen.be/zonnepanelen',
        title: 'Vakmanprijzen, zonnepanelen 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'high',
        note: '€/Wp bands; consumer incl. often ~€0.90–1.25 → excl. ~€0.85–1.18 @6%'
      },
      zonnepanelenBe: {
        url: 'https://www.energiesparen.be/zonnepanelen',
        title: 'Vlaanderen, zonnepanelen info',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Flanders',
        vatStatus: 'n/a',
        reliability: 'official',
        note: 'No guaranteed savings/payback used in ELYAN pricing'
      },
      vakmanVentilatie: {
        url: 'https://vakmanprijzen.be/ventilatie',
        title: 'Vakmanprijzen, ventilatie 2026',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'excl',
        reliability: 'medium'
      },
      bobexVentilatie: {
        url: 'https://www.bobex.be/nl-be/ventilatie/',
        title: 'Bobex, ventilatiesysteem prijs',
        publishedOrUpdated: '2026',
        consulted: '2026-08-09',
        region: 'Belgium',
        vatStatus: 'unclear',
        reliability: 'medium'
      }
    },

    labour: {
      productiveHoursPerDay: {
        value: 6.5,
        kind: 'modelAssumption',
        reason: 'Not 8 billable hours; setup, breaks, handling. No official BE source, widens uncertainty via hour bands.'
      },
      roofer: {
        low: 45, base: 62, high: 75,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanDak', 'vakmanOverview'],
        reason: 'Vakmanprijzen dakwerker €45–75/u; base mid-low of billed band (not consumer-guide €35–45).'
      },
      plumber: {
        low: 50, base: 59, high: 78,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanLoodgieter'],
        reason: 'Vakmanprijzen loodgieter avg ~€59 excl.; second corroboration via overview €45–85 trades.'
      },
      electrician: {
        low: 45, base: 55, high: 65,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['elektricienBuurt', 'vakmanOverview'],
        reason: 'Vakmanindebuurt €35–65 excl.; mid renovation company rate €55.'
      },
      painter: {
        low: 35, base: 45, high: 60,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanSchilder'],
        softSources: ['schilderBuurt'],
        reason: 'Vakmanprijzen schilder €30–80/u excl., avg ~€45. Soft: Schilder-in-de-buurt €35–55 incl. (VAT-ambiguous).'
      },
      tiler: {
        low: 45, base: 52, high: 65,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['bobexTegel', 'bouwplannenTegel'],
        reason: 'Derived from €25–40/m² labour ÷ ~0.6–0.8 m²/u; VAT unclear on €/m², treated carefully.'
      },
      floorLayer: {
        low: 40, base: 48, high: 58,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanVloer'],
        reason: 'Implied from laminaat labour €7–25/m² excl. and productivity.'
      },
      kitchenFitter: {
        low: 45, base: 52, high: 60,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'modelAssumption',
        sources: ['alkeba', 'vakmanOverview'],
        reason: 'Alkeba montage packages €2k–4.5k / general trade rates, not a hard BE hourly list.'
      },
      general: {
        low: 45, base: 55, high: 70,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanOverview'],
        reason: 'Overview trades €45–85 excl.'
      },
      joiner: {
        low: 48, base: 58, high: 68,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanRamen', 'vakmanOverview'],
        reason: 'Schrijnwerker / window fitter billed band ~€48–68 excl.'
      },
      windowFitter: {
        low: 48, base: 58, high: 68,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanRamen', 'vakmanOverview'],
        reason: 'Alias of joiner, schrijnwerker ramen/deuren.'
      },
      heatingTech: {
        low: 50, base: 60, high: 70,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanVerwarming', 'vakmanOverview'],
        reason: 'HVAC / verwarmingstechnicus ~€50–70 excl.'
      },
      insulator: {
        low: 42, base: 50, high: 58,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanIsolatie', 'vakmanOverview'],
        reason: 'Isolatiespecialist ~€42–58 excl.'
      },
      facadeWorker: {
        low: 45, base: 53, high: 62,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanGevel', 'vakmanOverview'],
        reason: 'Gevelwerker ~€45–62 excl.'
      },
      solarInstaller: {
        low: 48, base: 56, high: 65,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanSolar', 'vakmanOverview'],
        reason: 'Zonnepanelen-installateur ~€48–65 excl.'
      },
      ventilationTech: {
        low: 48, base: 56, high: 65,
        unit: 'EUR/h',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['vakmanVentilatie', 'vakmanOverview'],
        reason: 'Ventilatietechnicus ~€48–65 excl.'
      }
    },

    roof: {
      /* Scope-separated benchmarks — all excl. VAT, NO scaffold/gutters/asbestos/structure */
      benchmarks: {
        pitchedCoverOnly: {
          low: 30, high: 100, unit: 'EUR/m2',
          vatStatus: 'excl',
          kind: 'marketBenchmark',
          scope: 'Hellend: nieuwe dakbedekking (mat+plaatsing). Zonder isolatie, steiger, goten, asbest, constructie.',
          scopeMatchRequires: ['cover'],
          sources: ['vyverman', 'vakmanDak'],
          reason: 'Vyverman pannen €30–75 excl.; Vakmanprijzen hellend bedekking €20–130 excl. Base band 30–100.'
        },
        pitchedCoverInsulation: {
          low: 120, high: 220, unit: 'EUR/m2',
          vatStatus: 'excl',
          kind: 'marketBenchmark',
          scope: 'Hellend: afbraak+onderdak+isolatie+latten+pannen. Zonder aparte steiger/goten/asbest/gebinte.',
          scopeMatchRequires: ['cover', 'insulation', 'strip'],
          sources: ['vyverman'],
          softSources: ['housingService'],
          reason: 'Som Vyverman-fasen excl. btw (~€93–216 afhankelijk pannen/isolatie); stated total often €150–250.'
        },
        pitchedFullComparable: {
          low: 150, high: 250, unit: 'EUR/m2',
          vatStatus: 'excl',
          kind: 'marketBenchmark',
          scope: 'Vyverman “volledige renovatie incl. isolatie”: afbraak, onderdak, sarking, latten, pannen. Steiger/goten/asbest/gebinte NIET als aparte post bewezen inbegrepen.',
          scopeMatchRequires: ['cover', 'insulation', 'strip'],
          notIncluded: ['scaffold', 'gutters', 'asbestos', 'structure'],
          sources: ['vyverman'],
          softSources: ['housingService'],
          reason: 'Primary: Vyverman excl. Soft: Housing-service 100 m² €15–30k INCL → ≈€142–283/m² excl@6%, not used as hard band.'
        },
        flatCoverOnly: {
          low: 40, high: 80, unit: 'EUR/m2',
          vatStatus: 'excl',
          kind: 'marketBenchmark',
          scope: 'Plat: EPDM/bitumen mat+plaatsing, geen volle isolatie/steiger.',
          sources: ['vakmanDak'],
          reason: 'Vakmanprijzen EPDM €30–80 / bitumen €40–60 excl.'
        },
        flatCoverInsulation: {
          low: 90, high: 180, unit: 'EUR/m2',
          vatStatus: 'excl',
          kind: 'marketBenchmark',
          scope: 'Plat bedekking + isolatie (soft).',
          sources: ['vakmanDak'],
          softSources: ['housingService'],
          reason: 'Isolatie €15–120 + bedekking; Housing-service soft 100–200 (VAT mixed).'
        }
      },
      stripAndDispose: {
        low: 8, base: 12, high: 15, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'marketBenchmark', sources: ['vyverman'],
        scope: 'Afbraak+afvoer oude pannen (all-in demontage/afvoer, geboekt als overige, geen aparte strip-uren bovenop)',
        reason: 'Vyverman €8–15/m² excl. Gebruikt als overige-post; labourHours voor strip op 0 om dubbeltelling te vermijden.'
      },
      insulation: {
        low: 28, base: 42, high: 65, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'modelAssumption',
        sources: ['vyverman', 'vakmanDak'],
        scope: 'Isolatiemateriaal (PIR/MW) excl. plaatsingsuren. NIET Vyverman all-in fase',
        reason: 'Vyverman isolatiefase €40–100 is mat+arbeid → niet als mat gebruiken. Materiaalband modelAssumption; uren apart. Soft corroboratie via VP isolatieband.'
      },
      battens: {
        low: 4, base: 6, high: 9, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'modelAssumption', sources: ['vyverman', 'dakpannenDelanghe'],
        scope: 'Tengels/panlatten materiaal', reason: 'Materiaalproxy onder Vyverman €5–10 fase; De Langhe hulpstukken/latten soft. Uren apart.'
      },
      underlay: {
        low: 6, base: 9, high: 13, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'modelAssumption', sources: ['vyverman'],
        scope: 'Onderdakfolie/-plaat materiaal', reason: 'Vyverman €10–16 is fase (mogelijk mat+arb). Materiaalband lager als modelAssumption; uren apart.'
      },
      /* MATERIAL ONLY — not Vyverman all-in faseprijzen */
      tilesConcrete: {
        low: 26, base: 31, high: 36, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'marketBenchmark', sources: ['dakpannenDelanghe', 'dakpannenBkg'],
        scope: 'Betonpannen MATERIAAL only, excl. plaatsing',
        reason: 'De Langhe €26–36 excl.; BKG €26–36 excl. All-in faseprijzen (Vyverman) niet gebruikt voor mat/arb-split.'
      },
      tilesCeramic: {
        low: 35, base: 48, high: 65, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'marketBenchmark', sources: ['dakpannenDelanghe', 'dakpannenBkg'],
        scope: 'Keramische pannen MATERIAAL only',
        reason: 'De Langhe/BKG €35–65 excl. materiaal.'
      },
      slate: {
        low: 60, base: 75, high: 95, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'marketBenchmark', sources: ['dakpannenDelanghe', 'dakpannenBkg'],
        scope: 'Natuurlei/vezelcement MATERIAL only',
        reason: 'De Langhe natuurlei v.a. €60–90+ materiaal; BKG corroboration.'
      },
      epdm: {
        low: 18, base: 28, high: 42, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'modelAssumption', sources: ['vakmanDak'],
        scope: 'EPDM membraan materiaal (plaatsing via uren)',
        reason: 'VP all-in €30–80 bevat plaatsing, materiaalband modelAssumption, niet 55%-split van all-in.'
      },
      fastenersAccessories: {
        low: 8, base: 11, high: 16, unit: 'EUR/m2', vatStatus: 'excl',
        kind: 'marketBenchmark', sources: ['dakpannenDelanghe'],
        softSources: ['dakpannenBkg'],
        scope: 'Hulpstukken/bevestiging omgerekend per m² (nok, gevelpannen, schroeven…)',
        reason: 'De Langhe hulpstukken €8–14 / €10–18 indicatief excl.'
      },
      materialWasteFactor: {
        value: 1.08,
        kind: 'modelAssumption',
        reason: 'Snijverlies/breuk ~5–10% (De Langhe noemt 5–10% extra).'
      },
      /* Covering placement hours derived from De Langhe plaatsing €50–60/m² ÷ ~€62/u — NOT from all-in split */
      coverPlacementHoursPerM2: {
        low: 0.70, base: 0.85, high: 1.05,
        kind: 'modelAssumption',
        sources: ['dakpannenDelanghe'],
        reason: 'De Langhe plaatsen beton €50–60/m² ÷ dakwerker ~€62/u ≈ 0.8–1.0 u/m². Soft.'
      },
      labourHoursPerM2: {
        repair: { low: 0.18, base: 0.26, high: 0.38 },
        insulation: { low: 0.20, base: 0.28, high: 0.40 },
        renew: { low: 0.20, base: 0.28, high: 0.40 },
        full: { low: 0.22, base: 0.30, high: 0.42 },
        kind: 'modelAssumption',
        reason: 'Strip/onderdak/latten/isolatie-uren (covering heeft eigen coverPlacementHoursPerM2). Niet afgeleid uit all-in €/m²-split.'
      },
      scaffolding: {
        low: 700, base: 1200, high: 2800, unit: 'EUR/project',
        vatStatus: 'unclear→treatedAsExcl',
        kind: 'modelAssumption',
        sources: ['blueSkySteiger', 'woongidsSteiger', 'vakmanDak'],
        scope: 'Steiger/toegang/veiligheid apart van €/m² dakbenchmark',
        reason: 'Blue Sky rijwoning €700–1200; complexer hoger; VP: steiger often not in m² price. Wide band.'
      },
      guttersPerLm: {
        low: 30, base: 55, high: 85, unit: 'EUR/lm',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['dakgootMdw', 'dakgootDelanghe'],
        scope: 'Goot incl. plaatsing per lm; regenpijp/steiger apart',
        reason: 'Mijn-dakwerker PVC €30 / zink €60 excl.; De Langhe PVC €30–45 corroboration.'
      },
      guttersTypicalLm: {
        value: 20,
        kind: 'modelAssumption',
        reason: 'Typical house gutter length when user says “goten ja” without lm input.'
      },
      asbestosPerM2: {
        low: 22, base: 32, high: 45, unit: 'EUR/m2',
        vatStatus: 'excl',
        kind: 'marketBenchmark',
        sources: ['keurAsbest', 'asbestDeskundigen'],
        scope: 'Sanering hechtgebonden asbestdak incl. afvoer, excl. nieuw dak',
        reason: 'Keur 25–40 excl.; Asbestdeskundigen €10–45 incl. → ~€9–42 excl@6%. Mid 22–45.'
      },
      asbestosSurvey: {
        low: 800, base: 1200, high: 1800, unit: 'EUR/project',
        vatStatus: 'unclear→treatedAsExcl',
        kind: 'modelAssumption',
        sources: [],
        reason: 'Buffer inventaris/onderzoek, limited public fixed tariffs; wide band.'
      },
      detailsFinish: {
        low: 400, base: 700, high: 1100, unit: 'EUR/project',
        vatStatus: 'unclear→treatedAsExcl',
        kind: 'modelAssumption',
        sources: ['vyverman'],
        reason: 'Nok/aansluitingen mentioned as time drivers; no hard € table, assumption.'
      },
      crewSize: { repair: 1, insulation: 2, renew: 2, full: 2 }
    },

    bathroom: {
      benchmarks: {
        light: {
          low: 3500, high: 7500, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['badkamerAdvies'],
          softSources: ['renovatieKampioenBath'],
          scope: 'Basic: standaard sanitair + standaard afwerking, excl. btw incl. plaatsing (BA).',
          reason: 'Badkamer-advies basic €3.5–7.5k excl.'
        },
        partial: {
          low: 5000, high: 12000, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['badkamerAdvies'],
          softSources: ['renovatieKampioenBath'],
          scope: 'Gedeeltelijke renovatie / tussen basic en volledig.',
          reason: 'Interpolated from BA basic–average; RK soft 5–12k small bath.'
        },
        fullStandard: {
          low: 7500, high: 15000, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['badkamerAdvies'],
          softSources: ['renovatieKampioenBath'],
          scope: 'Volledige standaardrenovatie ~8 m², excl. btw incl. plaatsing.',
          reason: 'BA gemiddeld €7.5–12.5k; RK 7.5–15k (VAT unclear) as soft high.'
        },
        premium: {
          low: 12500, high: 25000, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['badkamerAdvies'],
          scope: 'Luxe/premium volledige renovatie excl. btw.',
          reason: 'BA luxe €12.5–25k excl.'
        }
      },
      demolition: {
        none: { low: 0, base: 0, high: 0 },
        beperkt: { low: 500, base: 750, high: 1100 },
        volledig: { low: 900, base: 1300, high: 2000 },
        unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark',
        sources: ['badkamerAdvies'],
        reason: 'BA afbraak €7–25/m² → ~€500–2000 for 6–8 m² + waste.'
      },
      waste: { low: 200, base: 350, high: 550, kind: 'modelAssumption', reason: 'Container/afvoer buffer' },
      protection: { low: 80, base: 120, high: 200, kind: 'modelAssumption', reason: 'Werfbescherming' },
      plumbingSame: { low: 800, base: 1400, high: 2200, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA leidingen €360–880 is light; full same-layout reconnect higher, mid from practice tables' },
      plumbingLimited: { low: 1400, base: 2000, high: 2800, kind: 'modelAssumption', sources: ['badkamerAdvies'], reason: 'Between same and full move' },
      plumbingMove: { low: 2200, base: 3200, high: 4500, kind: 'modelAssumption', sources: ['badkamerAdvies'], reason: 'Full layout change, soft' },
      electrical: { low: 400, base: 750, high: 1200, kind: 'modelAssumption', reason: 'Natte-zone elektra' },
      waterproofingPerM2: {
        low: 20, base: 30, high: 40, unit: 'EUR/m2',
        vatStatus: 'unclear→treatedAsExcl',
        kind: 'marketBenchmark',
        sources: ['bouwplannenTegel'],
        softSources: ['bobexTegel'],
        reason: 'Bouwplannen waterdichting douchezone €20–40/m².'
      },
      floorTileMat: { low: 25, base: 40, high: 70, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['badkamerAdvies', 'bobexTegel'], reason: 'BA vloer €10–180 mat excl. plaatsing; mid keramiek' },
      wallTileMat: { low: 20, base: 35, high: 65, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['badkamerAdvies', 'bobexTegel'], reason: 'BA wand €10–155 excl. plaatsing' },
      floorTileLabour: { low: 25, base: 32, high: 40, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['bobexTegel'], reason: 'Bobex tegelzetter €25–40/m²' },
      wallTileLabour: { low: 28, base: 35, high: 45, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['bobexTegel', 'bouwplannenTegel'], reason: 'Bobex €25–40; Bouwplannen arbeid €40–80 soft high' },
      adhesiveGrout: { low: 8, base: 12, high: 18, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['bobexTegel'], reason: 'Bobex lijm/voeg €8–20' },
      shower: { low: 900, base: 1800, high: 3500, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA douche €400–3000 excl. plaatsing → mid with install' },
      bath: { low: 1000, base: 2000, high: 4000, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA bad €500–3000+' },
      toilet: { low: 350, base: 550, high: 900, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA toilet €300–1000' },
      vanity: { low: 600, base: 1400, high: 3500, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA wastafel €400–1000 + meubel uplift' },
      taps: { low: 150, base: 280, high: 550, vatStatus: 'excl', kind: 'marketBenchmark', sources: ['badkamerAdvies'], reason: 'BA kraan €125–500' },
      sanitaryLabourHours: { low: 8, base: 12, high: 18, kind: 'modelAssumption', reason: 'Montage-uren sanitair' },
      ventilation: { low: 300, base: 550, high: 900, kind: 'modelAssumption', sources: ['badkamerAdvies'], reason: 'BA ventilatie full system €1–1.5k; improve fan lower' },
      ufhPerM2: { low: 70, base: 95, high: 130, kind: 'modelAssumption', reason: 'Comfort UFH' },
      ufhSetup: { low: 500, base: 650, high: 900, kind: 'modelAssumption', reason: 'Startkosten UFH' },
      finishing: { low: 300, base: 450, high: 700, kind: 'modelAssumption', reason: 'Kit/oplevering' },
      crewSize: 2
    },

    kitchen: {
      benchmarks: {
        budget: {
          low: 7500, high: 15000, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['tipsentricksKeuken', 'alkeba'],
          softSources: ['bobexKeuken', 'prijzenKeukens'],
          scope: 'BE nieuwe keuken budget/onderkant: kasten+plaatsing; toestellen/techniek variabel. Tipsentricks totale nieuwe keuken €10–25k excl.; Alkeba soft lower.',
          reason: 'Lower band soft from Alkeba eenvoudig; Tipsentricks full replace starts ~€10k excl.'
        },
        mid: {
          low: 10000, high: 25000, unit: 'EUR/project', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['tipsentricksKeuken'],
          softSources: ['alkeba', 'bobexKeuken'],
          scope: 'Nieuwe keuken middenklasse excl. btw incl. plaatsing (Tipsentricks). Toestellen vaak deels inbegrepen in all-in; technische aanpassingen niet altijd.',
          reason: 'Primary: Tipsentricks €10–25k excl. Soft: Alkeba €10–25k / Bobex midden €8–12k (VAT unclear).'
        },
        premium: {
          low: 20000, high: 35000, unit: 'EUR/project', vatStatus: 'unclear→soft',
          kind: 'marketBenchmark', sources: ['alkeba', 'bobexKeuken'],
          softSources: ['tipsentricksKeuken'],
          scope: 'Premium/maatwerk BE soft (Bobex luxe vanaf €20k VAT unclear; Alkeba luxe).',
          reason: 'Tipsentricks caps typical replace at €25k excl.; premium soft upper from Alkeba/Bobex.'
        }
      },
      demolish: { low: 400, base: 750, high: 1500, kind: 'marketBenchmark', sources: ['alkeba'], reason: 'Alkeba demontage €500–1500' },
      /* Cabinets as EUR per m² kitchen floor — DERIVED modelAssumption from all-in shares, not a published €/m² list */
      cabinetsPerM2: {
        budget: { low: 250, base: 340, high: 480 },
        midden: { low: 380, base: 500, high: 680 },
        hoog: { low: 600, base: 850, high: 1200 },
        kind: 'modelAssumption',
        sources: ['alkeba', 'tipsentricksKeuken'],
        reason: 'Derived from all-in shares (kasten ~40–50%); wide band, not a published BE €/m² cabinets list.'
      },
      frontenOnlyPerM2: { low: 120, base: 180, high: 280, kind: 'modelAssumption', reason: 'Facelift only' },
      worktop: {
        laminaat: { low: 600, base: 900, high: 1300 },
        composiet: { low: 1500, base: 2200, high: 3200 },
        natuursteen: { low: 2800, base: 3800, high: 5500 },
        kind: 'modelAssumption',
        sources: ['alkeba'],
        reason: 'Alkeba material spreads; not exact BE catalogue.'
      },
      appliances: {
        nee: { low: 0, base: 0, high: 0 },
        basis: { low: 1800, base: 2800, high: 4000 },
        uitgebreid: { low: 4000, base: 5500, high: 8000 },
        kind: 'modelAssumption',
        sources: ['alkeba'],
        reason: 'Alkeba: appliances ~30% of budget, bands as assumption.'
      },
      sinkTap: { low: 250, base: 450, high: 800, kind: 'modelAssumption', reason: 'Spoelbak+kraan' },
      splashback: { low: 400, base: 650, high: 1200, kind: 'modelAssumption', reason: 'Spatwand' },
      flooringPerM2: { low: 40, base: 55, high: 85, kind: 'marketBenchmark', sources: ['vakmanVloer'], reason: 'Aligned to floor mid PVC/laminaat excl.' },
      fitHours: {
        fronten: { low: 10, base: 14, high: 20 },
        vervangen: { low: 18, base: 26, high: 36 },
        herindelen: { low: 28, base: 40, high: 56 },
        kind: 'modelAssumption',
        sources: ['alkeba'],
        reason: 'From Alkeba montage €2–4.5k ÷ ~€52/u.'
      },
      connectionsLimited: { low: 800, base: 1200, high: 1800, kind: 'modelAssumption', sources: ['alkeba'], reason: 'Alkeba aansluitingen €1–2k' },
      connectionsMove: { low: 2000, base: 2800, high: 4000, kind: 'modelAssumption', sources: ['alkeba'], reason: 'Extra leiding/elektra' },
      finishing: { low: 250, base: 400, high: 650, kind: 'modelAssumption', reason: 'Afwerking' },
      crewSize: 2
    },

    floors: {
      /* Base installation ONLY — excl. removal/leveling/UFH */
      benchmarksBaseInstall: {
        laminaat: { low: 13, high: 55, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVloer'], scope: 'Mat+plaatsing, vlakke ondergrond, excl. uitbraak/egalisatie', reason: 'VP €13–55 excl.' },
        vinyl: { low: 31, high: 77, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVloer'], scope: 'PVC/vinyl mat+plaatsing', reason: 'VP €31–77 excl.' },
        tegel: { low: 52, high: 90, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVloer'], softSources: ['bobexTegel'], scope: 'Keramiek mat+plaatsing op chape, recht patroon', reason: 'VP €52–71; soft upper for mid tiles' },
        parket: { low: 40, high: 160, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVloer'], scope: 'Parket mat+plaatsing', reason: 'VP €40–210, capped soft high 160 for mid' },
        gietvloer: { low: 40, high: 120, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVloer'], scope: 'Gietvloer incl. plaatsing', reason: 'VP €40–120 excl.' }
      },
      /* Prep adders — not in base install benchmark */
      prep: {
        removal: { low: 8, base: 12, high: 16, unit: 'EUR/m2', kind: 'modelAssumption', sources: ['vakmanVloer'], reason: 'VP: uitbraak almost always separate' },
        levelingLimited: { low: 10, base: 14, high: 18, unit: 'EUR/m2', kind: 'modelAssumption', reason: 'Egalisatie beperkt' },
        levelingFull: { low: 22, base: 28, high: 35, unit: 'EUR/m2', kind: 'marketBenchmark', sources: ['vakmanVloer'], reason: 'Chape €25–29 excl. as proxy for full prep' }
      },
      material: {
        laminaat: { low: 12, base: 20, high: 32 },
        vinyl: { low: 16, base: 28, high: 42 },
        tegel: { low: 22, base: 32, high: 55 },
        parket: { low: 32, base: 50, high: 85 },
        gietvloer: { low: 40, base: 65, high: 100 }
      },
      labourPerM2: {
        laminaat: { low: 10, base: 14, high: 20 },
        vinyl: { low: 12, base: 16, high: 22 },
        tegel: { low: 18, base: 26, high: 34 },
        parket: { low: 22, base: 28, high: 38 },
        gietvloer: { low: 30, base: 38, high: 50 }
      },
      underlay: { low: 2, base: 4, high: 8 },
      adhesiveGrout: { low: 8, base: 12, high: 18 },
      removal: { low: 8, base: 12, high: 16 },
      levelingLimited: { low: 10, base: 14, high: 18 },
      levelingFull: { low: 22, base: 28, high: 35 },
      skirtingPerM2: { low: 3.5, base: 5, high: 7, kind: 'modelAssumption', reason: 'Plinten often separate' },
      ufhNew: { low: 55, base: 70, high: 95, kind: 'modelAssumption', reason: 'Nieuwe UFH, soft' },
      ufhExistingAdj: { low: 5, base: 8, high: 12, kind: 'modelAssumption', reason: 'Aanpassing bestaand' },
      wetRoomExtra: { low: 300, base: 450, high: 700, kind: 'modelAssumption', reason: 'Natte zones' },
      wasteBase: { low: 150, base: 250, high: 400, kind: 'modelAssumption', reason: 'Afvoer' },
      cutWasteFactor: 1.08,
      crewSize: 2,
      m2PerDay: { laminaat: 35, vinyl: 30, tegel: 12, parket: 18, gietvloer: 15 }
    },

    painting: {
      benchmarks: {
        interiorAllIn: {
          low: 12, high: 33, unit: 'EUR/m2', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['vakmanSchilder'],
          softSources: ['schilderBuurt', 'bouwadviseurSchilder'],
          scope: 'Binnen muren/plafonds, mat+arbeid, 2 lagen, excl. btw. Excl. schrijnwerk/steiger.',
          reason: 'Primary Vakmanprijzen €12–33 excl. Soft: Schilder-in-de-buurt €20–35 INCL is VAT-ambiguous (norm@6%≈19–33; @21%≈17–29), not used as hard excl. baseline.'
        },
        exteriorAllIn: {
          low: 25, high: 45, unit: 'EUR/m2', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['vakmanSchilder'],
          softSources: ['schilderBuurt'],
          scope: 'Gevel mat+arbeid excl. btw, excl. steiger (VP).',
          reason: 'Vakmanprijzen €25–45 excl. Soft incl. source not primary.'
        }
      },
      paintMaterial: {
        low: 2.5, base: 4.0, high: 7.0, unit: 'EUR/m2',
        kind: 'modelAssumption',
        reason: 'Paint/primer material only, separated from labour; not a published BE list.'
      },
      labourHoursPerM2: {
        goed: { low: 0.30, base: 0.40, high: 0.55 },
        matig: { low: 0.40, base: 0.52, high: 0.70 },
        slecht: { low: 0.55, base: 0.72, high: 0.95 },
        kind: 'modelAssumption',
        reason: 'From VP mid ~€20 excl. − €4 mat ÷ €45/u ≈ 0.36 u/m² (goed). Matig/slecht hoger. Synced research↔data.'
      },
      prepMaterial: { low: 0.5, base: 1.0, high: 2.0, kind: 'modelAssumption', reason: 'Plamuur/primer prep' },
      wallpaperPartial: { low: 3, base: 4.5, high: 7, kind: 'modelAssumption', reason: 'Behang deels' },
      wallpaperFull: { low: 5, base: 6.5, high: 10, kind: 'modelAssumption', reason: 'Behang volledig' },
      darkColorExtraMat: { low: 1.5, base: 2.5, high: 4, kind: 'modelAssumption', reason: 'Extra verf' },
      darkColorExtraHours: { low: 0.08, base: 0.12, high: 0.18, kind: 'modelAssumption', reason: 'Extra lagen' },
      woodworkLimitedHours: { low: 6, base: 10, high: 14, kind: 'modelAssumption', reason: 'Beperkt schrijnwerk' },
      woodworkExtendedHours: { low: 16, base: 24, high: 36, kind: 'modelAssumption', reason: 'Uitgebreid schrijnwerk' },
      protectionPerM2: { low: 0.8, base: 1.2, high: 2.0, kind: 'modelAssumption', reason: 'Afplakken' },
      scaffold1: { low: 0, base: 0, high: 0 },
      scaffold2: { low: 450, base: 650, high: 950, kind: 'modelAssumption', sources: ['blueSkySteiger'], reason: 'Hoogte 2 lagen, soft' },
      scaffold3: { low: 1000, base: 1400, high: 2000, kind: 'modelAssumption', sources: ['blueSkySteiger'], reason: '3+ lagen, soft' },
      exteriorFactor: { low: 1.15, base: 1.25, high: 1.35, kind: 'modelAssumption', reason: 'Buiten toeslag vs binnen' },
      crewSize: 2
    },

    windows: {
      benchmarks: {
        pvcAllIn: {
          low: 320, high: 550, unit: 'EUR/m2', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['vakmanRamen', 'bobexRamen'],
          softSources: ['renovatieKampioenRamen'],
          scope: 'PVC raam mat+plaatsing excl. btw; zonder grote schuif/buitendeuren.',
          reason: 'Bobex PVC ~€350–650 incl. → @6% ≈ €330–613; model band €320–550 excl. VP soft.'
        },
        aluminiumAllIn: {
          low: 450, high: 750, unit: 'EUR/m2', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['bobexRamen', 'vakmanRamen'],
          scope: 'Aluminium raam mat+plaatsing excl. btw.',
          reason: 'Consumer alu bands normalized excl.; wider than PVC.'
        },
        woodAllIn: {
          low: 400, high: 700, unit: 'EUR/m2', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['bobexRamen', 'renovatieKampioenRamen'],
          scope: 'Houten raam mat+plaatsing excl. btw.',
          reason: 'Wood mid-band between PVC and alu; soft VAT on consumer pages.'
        }
      },
      materialPerM2: {
        pvc: { low: 180, base: 260, high: 360 },
        aluminium: { low: 260, base: 380, high: 520 },
        hout: { low: 220, base: 320, high: 460 },
        kind: 'modelAssumption',
        sources: ['bobexRamen', 'vakmanRamen'],
        reason: 'Frame+glass material unit, not derived via % of all-in; wide band.'
      },
      labourHoursPerM2: {
        low: 1.4, base: 2.0, high: 2.8,
        kind: 'modelAssumption',
        reason: 'Plaatsingsuren schrijnwerk incl. afstellen; calibrated so PVC all-in lands in €320–550/m² excl. with material band.'
      },
      glazingFactor: {
        hr: { low: 1.0, base: 1.0, high: 1.0 },
        'hr++': { low: 1.05, base: 1.08, high: 1.12 },
        'hr+++': { low: 1.10, base: 1.15, high: 1.22 },
        kind: 'modelAssumption',
        reason: 'HR++/HR+++ glass uplift on material, moderated 2026.3.1 audit.'
      },
      slidingFactor: {
        nee: 1.0,
        ja: 1.45,
        groot: 1.70,
        kind: 'modelAssumption',
        reason: 'Schuifpartij uplift on affected share only (not full-area ×2).'
      },
      door: {
        low: 1400, base: 2000, high: 2800, unit: 'EUR/stuk',
        vatStatus: 'excl', kind: 'marketBenchmark',
        sources: ['bobexRamen', 'vakmanRamen'],
        reason: 'Buitendeur mat+plaatsing excl. lump.'
      },
      removalPerM2: {
        low: 20, base: 30, high: 40, unit: 'EUR/m2',
        kind: 'modelAssumption', sources: ['vakmanRamen'],
        reason: 'Uithalen bestaand schrijnwerk + afvoer as other.'
      },
      revealFinish: {
        low: 18, base: 28, high: 42, unit: 'EUR/m2',
        kind: 'modelAssumption',
        reason: 'Dagkanten / afwerking, moderated to avoid double-count with install hours.'
      },
      accessHardFactor: { low: 1.08, base: 1.12, high: 1.20, kind: 'modelAssumption', reason: 'Moeilijke toegang' },
      crewSize: 2
    },

    insulation: {
      benchmarks: {
        spouw: { low: 15, high: 30, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie'], softSources: ['energiesparenIsolatie'], scope: 'Spouwmuurisolatie all-in excl.', reason: 'VP/energiesparen spouw ~€15–30 excl.' },
        dak_binnen: { low: 25, high: 50, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie'], scope: 'Dakisolatie langs binnen (enkel isolatie, geen dakherbouw)', reason: 'Isolatie-only binnen €25–50 excl.' },
        zoldervloer: { low: 20, high: 40, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie'], scope: 'Zoldervloerisolatie', reason: '€20–40 excl.' },
        vloer: { low: 15, high: 40, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie'], scope: 'Vloerisolatie', reason: '€15–40 excl.' },
        binnenmuur: { low: 40, high: 70, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie'], scope: 'Binnenmuurisolatie + basisafwerking', reason: '€40–70 excl.' },
        buitenmuur: { low: 90, high: 160, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanIsolatie', 'vakmanGevel'], softSources: ['bobexGevel'], scope: 'Buitenmuurisolatie + afwerking (ETICS) excl. steiger', reason: 'Yannova/Gevelexpert ETICS €80–150 excl.; ELYAN band €90–160 excl. steiger' }
      },
      materialPerM2: {
        spouw: { low: 8, base: 12, high: 18 },
        dak_binnen: { low: 14, base: 22, high: 32 },
        zoldervloer: { low: 10, base: 16, high: 24 },
        vloer: { low: 8, base: 14, high: 22 },
        binnenmuur: { low: 18, base: 28, high: 40 },
        buitenmuur: { low: 42, base: 62, high: 88 },
        kind: 'modelAssumption',
        reason: 'Isolatiemateriaal unitprijs, buitenmuur includes ETICS boards+renders in mat (no separate finish package).'
      },
      labourHoursPerM2: {
        spouw: { low: 0.12, base: 0.18, high: 0.28 },
        dak_binnen: { low: 0.22, base: 0.35, high: 0.50 },
        zoldervloer: { low: 0.18, base: 0.28, high: 0.40 },
        vloer: { low: 0.15, base: 0.25, high: 0.38 },
        binnenmuur: { low: 0.35, base: 0.50, high: 0.70 },
        buitenmuur: { low: 0.55, base: 0.80, high: 1.10 },
        kind: 'modelAssumption',
        reason: 'Plaatsingsuren; finish only for binnenmuur/dak_binnen (buitenmuur finish in mat).'
      },
      performanceHighMat: { low: 1.08, base: 1.14, high: 1.22, kind: 'modelAssumption', reason: 'Hogere Rd / dikkere pakketten, moderated audit' },
      prepLimited: { low: 2, base: 4, high: 7, unit: 'EUR/m2', kind: 'modelAssumption', reason: 'Beperkte voorbereiding' },
      prepExtended: { low: 6, base: 10, high: 15, unit: 'EUR/m2', kind: 'modelAssumption', reason: 'Uitgebreide voorbereiding' },
      finishPerM2: {
        beperkt: { low: 8, base: 14, high: 22 },
        standaard: { low: 18, base: 28, high: 40 },
        hoog: { low: 28, base: 40, high: 55 },
        kind: 'modelAssumption',
        reason: 'Afwerking binnenmuur / dak_binnen only'
      },
      accessHard: { low: 1.08, base: 1.12, high: 1.20, kind: 'modelAssumption', reason: 'Moeilijke toegang' },
      crewSize: 2
    },

    heating: {
      benchmarks: {
        ketel: { low: 2800, high: 4500, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVerwarming'], scope: 'Ketel vervangen all-in excl.', reason: 'VP/markt ketel €2.8–4.5k excl.' },
        lucht_water: { low: 7500, high: 14000, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVerwarming'], softSources: ['bobexWarmtepomp'], scope: 'Lucht-water warmtepomp all-in excl. (toestel+plaatsing basis)', reason: '€7.5–14k excl.; Bobex soft' },
        hybride: { low: 5500, high: 10000, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVerwarming'], scope: 'Hybride WP+ketel', reason: '€5.5–10k excl.' },
        vloerverwarming: { low: 55, high: 95, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVerwarming'], scope: 'Vloerverwarming mat+plaatsing', reason: 'UFH €55–95/m² excl.' },
        radiatoren: { low: 1800, high: 4500, unit: 'EUR/project', vatStatus: 'excl', kind: 'modelAssumption', sources: ['vakmanVerwarming'], scope: 'Radiatorenpakket woning (aantal/zone afhankelijk)', reason: 'Package band, scaled by heated area soft' }
      },
      unitMaterial: {
        ketel: { low: 1600, base: 2400, high: 3400 },
        lucht_water: { low: 4500, base: 7000, high: 10000 },
        hybride: { low: 3500, base: 5500, high: 7800 },
        kind: 'modelAssumption',
        reason: 'Toestel/materiaal lump, niet %-split.'
      },
      unitLabourHours: {
        ketel: { low: 14, base: 20, high: 30 },
        lucht_water: { low: 28, base: 40, high: 56 },
        hybride: { low: 24, base: 36, high: 50 },
        kind: 'modelAssumption',
        reason: 'Installatie-uren HVAC'
      },
      ufhPerM2: {
        material: { low: 28, base: 40, high: 55 },
        labourHours: { low: 0.35, base: 0.50, high: 0.70 },
        kind: 'modelAssumption',
        reason: 'UFH componenten + uren'
      },
      radiatorPerM2: {
        material: { low: 18, base: 28, high: 42 },
        labourHours: { low: 0.12, base: 0.18, high: 0.28 },
        kind: 'modelAssumption',
        reason: 'Radiatoren package scaled by heated m²'
      },
      dhwNew: { low: 800, base: 1400, high: 2200, kind: 'modelAssumption', reason: 'Nieuwe SWW-boiler/unit' },
      insulationPoorFactor: { low: 1.05, base: 1.10, high: 1.18, kind: 'modelAssumption', reason: 'Slechte isolatie → grotere WP/ketelcapaciteit' },
      insulationGoodFactor: { low: 0.92, base: 0.95, high: 0.98, kind: 'modelAssumption', reason: 'Goede isolatie → kleinere capaciteit' },
      distributionMixedFactor: { low: 1.08, base: 1.12, high: 1.18, kind: 'modelAssumption', reason: 'Gemengde verdeling' },
      replaceUplift: { low: 1.0, base: 1.05, high: 1.12, kind: 'modelAssumption', reason: 'Vervanging vs nieuwbouw-aansluiting' },
      commissioning: { low: 200, base: 350, high: 550, kind: 'modelAssumption', reason: 'Inregeling / oplevering' },
      crewSize: 2
    },

    electrical: {
      benchmarks: {
        partial: { low: 25, high: 45, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanElektra', 'elektricienBuurt'], softSources: ['zonrElektra'], scope: 'Partiële elektra-aanpassing excl.', reason: '€25–45/m² excl.' },
        full: { low: 70, high: 120, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['renovatieKampioenElektra', 'vakmanElektra'], softSources: ['bobexElektra', 'zonrElektra'], scope: 'Volledige herbekabeling / vernieuwen excl. (incl. typisch bord soft)', reason: 'Renovatiekampioen 2026: €70–120/m² woonoppervlak; Zonr soft €5–15k project' }
      },
      materialPerM2: {
        partieel: { low: 10, base: 16, high: 24 },
        volledig: { low: 22, base: 34, high: 48 },
        renovatie_volledig: { low: 26, base: 38, high: 52 },
        kind: 'modelAssumption',
        reason: 'Kabel/dozen/materiaal per m² woning, calibrated to €70–120/m² full mid'
      },
      labourHoursPerM2: {
        partieel: { low: 0.22, base: 0.35, high: 0.50 },
        volledig: { low: 0.48, base: 0.70, high: 0.95 },
        renovatie_volledig: { low: 0.58, base: 0.82, high: 1.10 },
        kind: 'modelAssumption',
        reason: 'Elektriciensuren; moderated 2026.3.1 so complex stays ~€110–130/m²'
      },
      fitOutFactor: {
        basis: { low: 0.85, base: 0.90, high: 0.95 },
        standaard: { low: 1.0, base: 1.0, high: 1.0 },
        uitgebreid: { low: 1.10, base: 1.18, high: 1.28 },
        kind: 'modelAssumption',
        reason: 'Aantal stopcontacten/punten, moderated audit'
      },
      floorsFactor: {
        '1': 1.0,
        '2': 1.08,
        '3plus': 1.16,
        kind: 'modelAssumption',
        reason: 'Meer verdiepingen → trekkingen/kokers, moderated'
      },
      board: {
        behouden: { low: 0, base: 0, high: 0 },
        nieuw: { low: 800, base: 1300, high: 1800 },
        kind: 'marketBenchmark',
        sources: ['vakmanElektra', 'elektricienBuurt', 'zonrElektra'],
        reason: 'Nieuwe verdeelbord €800–1800 excl. (Zonr €800–2000 soft)'
      },
      inspection: {
        low: 120, base: 200, high: 280, unit: 'EUR',
        vatStatus: 'excl', kind: 'marketBenchmark',
        sources: ['vakmanElektra', 'renovatieKampioenElektra'],
        reason: 'KEURING / AREI-controle €120–280 (Renovatiekampioen €120–250)'
      },
      crewSize: 2
    },

    facade: {
      benchmarks: {
        reinigen: { low: 8, high: 25, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanGevel'], softSources: ['bobexGevel'], scope: 'Gevelreiniging', reason: '€8–25/m²' },
        voegen: { low: 30, high: 55, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanGevel'], scope: 'Voegen / hervoegen', reason: '€30–55/m²' },
        herstel: { low: 35, high: 65, unit: 'EUR/m2', vatStatus: 'excl', kind: 'modelAssumption', sources: ['vakmanGevel'], scope: 'Lokaal metselwerkherstel', reason: 'Tussen reinigen en crepi' },
        crepi: { low: 40, high: 70, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanGevel', 'bobexGevel'], scope: 'Crepi / sierpleister', reason: '€40–70/m²' },
        bekleding: { low: 65, high: 120, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanGevel'], scope: 'Gevelbekleding', reason: '€65–120/m²' },
        isolatie_afwerking: { low: 90, high: 150, unit: 'EUR/m2', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanGevel', 'vakmanIsolatie', 'gevelExpertEtics'], softSources: ['kijzerGevel', 'bobexGevel'], scope: 'ETICS / isolatie+afwerking excl. steiger', reason: 'Gevelexpert €80–140; Kijzer €100–150; ELYAN €90–150 excl. steiger' }
      },
      materialPerM2: {
        reinigen: { low: 2, base: 4, high: 8 },
        voegen: { low: 8, base: 14, high: 22 },
        herstel: { low: 12, base: 20, high: 32 },
        crepi: { low: 15, base: 25, high: 38 },
        bekleding: { low: 30, base: 50, high: 80 },
        isolatie_afwerking: { low: 38, base: 58, high: 85 },
        kind: 'modelAssumption',
        reason: 'Gevelmateriaal unit. ETICS includes boards+render (finishExtra partial only)'
      },
      labourHoursPerM2: {
        reinigen: { low: 0.12, base: 0.20, high: 0.32 },
        voegen: { low: 0.40, base: 0.55, high: 0.75 },
        herstel: { low: 0.45, base: 0.65, high: 0.90 },
        crepi: { low: 0.40, base: 0.55, high: 0.75 },
        bekleding: { low: 0.55, base: 0.80, high: 1.10 },
        isolatie_afwerking: { low: 0.65, base: 0.90, high: 1.20 },
        kind: 'modelAssumption',
        reason: 'Geveluren. ETICS hours moderated 2026.3.1 audit'
      },
      conditionFactor: {
        goed: { low: 0.92, base: 0.95, high: 1.0 },
        matig: { low: 1.0, base: 1.0, high: 1.0 },
        slecht: { low: 1.08, base: 1.14, high: 1.22 },
        kind: 'modelAssumption',
        reason: 'Staat van de gevel, moderated to avoid stack with scaffold/elevations'
      },
      elevationsFactor: {
        '1': 1.0,
        '2': 1.05,
        '3plus': 1.10,
        kind: 'modelAssumption',
        reason: 'Meerdere gevelvlakken, moderated'
      },
      scaffold: {
        laag: { low: 0, base: 0, high: 0 },
        middel: { low: 700, base: 1200, high: 1800 },
        hoog: { low: 1600, base: 2400, high: 3500 },
        kind: 'modelAssumption',
        sources: ['blueSkySteiger', 'woongidsSteiger'],
        reason: 'Steiger MUST as other when middel/hoog'
      },
      finishExtra: {
        nee: { low: 0, base: 0, high: 0 },
        basis: { low: 4, base: 7, high: 10 },
        premium: { low: 8, base: 12, high: 18 },
        kind: 'modelAssumption',
        reason: 'Extra kleur/detail; for ETICS applied at 35% scale in calc'
      },
      crewSize: 3
    },

    solar: {
      benchmarks: {
        perWp: {
          low: 0.85, high: 1.15, unit: 'EUR/Wp', vatStatus: 'excl',
          kind: 'marketBenchmark', sources: ['vakmanSolar'],
          softSources: ['zonnepanelenBe'],
          scope: 'PV all-in excl. (panelen+omvormer+montage basis), zonder batterij/besparingsgarantie',
          reason: '€0.85–1.15/Wp excl. (~€0.90–1.25 incl@6%)'
        }
      },
      materialPerWp: {
        low: 0.48, base: 0.62, high: 0.78,
        kind: 'modelAssumption',
        reason: 'Panelen+omvormer+bekabeling materiaal; inverter included in package'
      },
      labourHoursPerKwp: {
        low: 3.5, base: 5.0, high: 7.0,
        kind: 'modelAssumption',
        reason: 'Montage-uren per kWp'
      },
      panelWp: { value: 400, kind: 'modelAssumption', reason: 'Typisch paneel ~400 Wp' },
      flatRoofFactor: { low: 1.05, base: 1.10, high: 1.15, kind: 'modelAssumption', reason: 'Plat dak ballast/frames' },
      accessHardFactor: { low: 1.15, base: 1.20, high: 1.25, kind: 'modelAssumption', reason: 'Moeilijke daktoegang +15–25%' },
      electricalAdapt: {
        nee: { low: 0, base: 0, high: 0 },
        beperkt: { low: 250, base: 450, high: 700 },
        nieuw: { low: 800, base: 1400, high: 2200 },
        kind: 'modelAssumption',
        reason: 'Elektrische aanpassing / bord'
      },
      battery: {
        low: 4000, base: 5500, high: 7500, unit: 'EUR',
        vatStatus: 'excl', kind: 'marketBenchmark',
        sources: ['vakmanSolar'],
        reason: 'Thuisbatterij add-on €4–7.5k excl., optioneel'
      },
      arei: {
        low: 150, base: 200, high: 250, unit: 'EUR',
        vatStatus: 'excl', kind: 'marketBenchmark',
        sources: ['vakmanSolar', 'vakmanElektra'],
        reason: 'AREI-keuring PV €150–250'
      },
      crewSize: 2
    },

    ventilation: {
      benchmarks: {
        decentraal: { low: 1200, high: 2800, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVentilatie'], softSources: ['bobexVentilatie'], scope: 'Decentrale units', reason: '€1.2–2.8k excl.' },
        systeem_c: { low: 2800, high: 4800, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVentilatie'], scope: 'Systeem C', reason: '€2.8–4.8k excl.' },
        systeem_d: { low: 5500, high: 9500, unit: 'EUR/project', vatStatus: 'excl', kind: 'marketBenchmark', sources: ['vakmanVentilatie'], softSources: ['bobexVentilatie'], scope: 'Systeem D WTW', reason: '€5.5–9.5k excl. scaled by size' }
      },
      unitMaterial: {
        decentraal: { low: 700, base: 1200, high: 1800 },
        systeem_c: { low: 1400, base: 2200, high: 3200 },
        systeem_d: { low: 2800, base: 4200, high: 6000 },
        kind: 'modelAssumption',
        reason: 'Unit/materiaal basis'
      },
      unitLabourHours: {
        decentraal: { low: 8, base: 12, high: 18 },
        systeem_c: { low: 16, base: 24, high: 34 },
        systeem_d: { low: 28, base: 40, high: 56 },
        kind: 'modelAssumption',
        reason: 'Basis installatie-uren'
      },
      sizeScalePerM2: {
        decentraal: { low: 1.5, base: 2.5, high: 4.0 },
        systeem_c: { low: 4, base: 7, high: 11 },
        systeem_d: { low: 8, base: 14, high: 22 },
        kind: 'modelAssumption',
        reason: 'Schaal met woninggrootte boven referentiesize'
      },
      refSizeM2: { value: 120, kind: 'modelAssumption', reason: 'Referentiewoning voor schaling' },
      wetRoomExtra: {
        '1': { low: 0, base: 0, high: 0 },
        '2': { low: 150, base: 250, high: 400 },
        '3plus': { low: 350, base: 550, high: 850 },
        kind: 'modelAssumption',
        reason: 'Extra natte ruimtes / afvoerpunten'
      },
      floorsFactor: {
        '1': 1.0,
        '2': 1.10,
        '3plus': 1.22,
        kind: 'modelAssumption',
        reason: 'Verdiepingen → kanalen'
      },
      routingHours: {
        eenvoudig: { low: 0, base: 2, high: 4 },
        renovatie: { low: 6, base: 12, high: 20 },
        complex: { low: 14, base: 24, high: 36 },
        kind: 'modelAssumption',
        reason: 'Kanaalcomplexiteit voegt uren toe'
      },
      commissioning: { low: 150, base: 250, high: 400, kind: 'modelAssumption', reason: 'Inregeling / oplevering' },
      crewSize: 2
    },

    vat: {
      standard: 0.21,
      reducedRenovation: 0.06,
      kind: 'officialRegulation',
      sources: ['fodBtw']
    },

    contingency: {
      lowUncertainty: { low: 0.05, high: 0.10 },
      normal: { low: 0.10, high: 0.15 },
      highUncertainty: { low: 0.15, high: 0.22 },
      kind: 'modelAssumption',
      reason: 'Buffer advice linked to answer uncertainty, not a market price.'
    },

    region: {
      kind: 'modelAssumption',
      sources: ['vakmanOverview'],
      reason: 'Mild labour-pressure factors; Vakmanprijzen cites up to ~15% urban delta. Not Statbel indices.',
      note: 'Widens confidence when province extreme; not a precision instrument.'
    }
  };

  return MARKET_DATA;
});
