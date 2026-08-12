/* ============================================================
   ELYAN Calc2 Investor. Regional acquisition costs (Phase 5.5 audit)
   Investor / flip defaults: NOT owner-occupier reduced rates.
   Notary ereloon: KB 16/12/1950 barema (updated). OFFICIAL_REGULATION.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2AcquisitionCosts = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round50(n) {
    return Math.round(Number(n) / 50) * 50;
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  var REGION_RATES = {
    vlaanderen: {
      registrationRate: 0.12,
      label: 'Vlaanderen verkooprecht (algemeen / niet-enige eigen woning)',
      source: 'https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/algemeen-tarief-in-het-verkooprecht',
      note: 'Algemeen tarief 12% sinds 2022 (compromis). 2% enkel enige eigen gezinswoning (natuurlijk persoon, strikte voorwaarden; aangescherpt 2026). Flip/investor/vennootschap → 12%.'
    },
    brussel: {
      registrationRate: 0.125,
      label: 'Brussel registratierecht (ordinair)',
      source: 'https://fin.belgium.be/nl/particulieren/woning/kopen-verkopen/registratierecht',
      note: '12,5%. Abattement tot €200.000 (max. €25.000) is voor eigen+enige hoofdverblijfplaats onder voorwaarden, niet auto voor investor flip.'
    },
    wallonie: {
      registrationRate: 0.125,
      label: 'Wallonië rechten d\'enregistrement (ordinair)',
      source: 'https://fin.belgium.be/nl/particulieren/woning/kopen-verkopen/registratierecht',
      note: 'Ordinair 12,5%. Verlaagd 3% enkel habitation propre et unique sinds 01/01/2025 (Wallonie FAQ). Flip/investor → 12,5%.'
    }
  };

  /**
   * Official progressive notary professional fee (ereloon) excl. VAT.
   * Schaal for property sale deeds — KB 16 December 1950 (as commonly published for 2025–2026).
   * Fixed portion / Jbis sole-home reduction NOT auto-applied (investor default).
   */
  var NOTARY_ERELOON_BANDS = [
    { upto: 7500, rate: 0.0456 },
    { upto: 17500, rate: 0.0285 },
    { upto: 30000, rate: 0.0228 },
    { upto: 45495, rate: 0.0171 },
    { upto: 64095, rate: 0.0114 },
    { upto: 250095, rate: 0.0057 },
    { upto: Infinity, rate: 0.00057 }
  ];

  var ADMIN_BAND = {
    low: 650,
    expected: 950,
    high: 1250,
    note: 'Dossier-/opzoekingskosten variëren per kantoor; geen vast wettelijk bedrag. Band €650–1250.'
  };

  function regionFromProvince(province) {
    var map = {
      antwerpen: 'vlaanderen', 'oost-vlaanderen': 'vlaanderen', 'west-vlaanderen': 'vlaanderen',
      'vlaams-brabant': 'vlaanderen', limburg: 'vlaanderen',
      brussel: 'brussel', brussels: 'brussel',
      'waals-brabant': 'wallonie', henegouwen: 'wallonie', luik: 'wallonie',
      namen: 'wallonie', luxemburg: 'wallonie'
    };
    return map[province] || 'vlaanderen';
  }

  function estimateNotaryEreloon(purchase) {
    var p = Math.max(0, Number(purchase) || 0);
    var fee = 0;
    var rest = p;
    var prev = 0;
    for (var i = 0; i < NOTARY_ERELOON_BANDS.length; i++) {
      var cap = NOTARY_ERELOON_BANDS[i].upto;
      var slice = Math.min(rest, cap - prev);
      if (slice <= 0) break;
      fee += slice * NOTARY_ERELOON_BANDS[i].rate;
      rest -= slice;
      prev = cap;
      if (rest <= 0) break;
    }
    return Math.max(100, fee);
  }

  function buildAcquisitionCosts(opts) {
    opts = opts || {};
    var purchase = Math.max(0, Number(opts.purchasePrice) || 0);
    var region = opts.region || regionFromProvince(opts.province);
    var rates = REGION_RATES[region] || REGION_RATES.vlaanderen;
    var overrides = opts.overrides || {};
    var buyerType = opts.buyerType || 'natural';

    /* Companies / flip never get reduced owner-occupier rates */
    var allowReduced = opts.ownerOccupierOnlyHome === true && buyerType !== 'company';

    var regRate = rates.registrationRate;
    if (allowReduced) {
      if (region === 'vlaanderen') regRate = 0.02;
      else if (region === 'wallonie') regRate = 0.03;
      /* Brussels: abattement not auto — would understate duties if wrongly applied */
    }

    var registration = overrides.registrationDuties != null
      ? Number(overrides.registrationDuties)
      : purchase * regRate;

    var ereloon = overrides.notaryEreloon != null
      ? Number(overrides.notaryEreloon)
      : estimateNotaryEreloon(purchase);
    var admin = overrides.administrativeCosts != null
      ? Number(overrides.administrativeCosts)
      : ADMIN_BAND.expected;
    var notaryVat = (ereloon + admin) * 0.21;
    var notaryTotal = ereloon + admin + notaryVat;

    var mortgageRegistration = 0;
    var mortgageNotary = 0;
    var mortgageCosts = 0;
    if (opts.financed && opts.loanAmount > 0) {
      var loan = Number(opts.loanAmount) || 0;
      if (overrides.mortgageCosts != null) {
        mortgageCosts = Number(overrides.mortgageCosts);
      } else {
        /* Hypotheekrechten typically ~1% of secured amount — separate from purchase registration */
        mortgageRegistration = loan * 0.01;
        /* Separate mortgage deed notary fee — approximate half-scale + fixed; MODEL until quote */
        mortgageNotary = estimateNotaryEreloon(loan) * 0.45 + 350;
        mortgageNotary = mortgageNotary * 1.21; /* incl. VAT on notary portion */
        mortgageCosts = mortgageRegistration + mortgageNotary;
      }
    }

    var other = Number(overrides.otherAcquisitionCosts) || 0;
    var total = registration + notaryTotal + mortgageCosts + other;

    var notaryLow = ereloon + ADMIN_BAND.low + (ereloon + ADMIN_BAND.low) * 0.21;
    var notaryHigh = ereloon + ADMIN_BAND.high + (ereloon + ADMIN_BAND.high) * 0.21;

    return {
      purchasePrice: round50(purchase),
      region: region,
      registrationDuties: {
        id: 'registration_duties',
        label: rates.label,
        low: round50(registration),
        expected: round50(registration),
        high: round50(registration),
        rate: regRate,
        sourceType: 'OFFICIAL_REGULATION',
        confidence: 'high',
        jurisdiction: region,
        source: rates.source,
        explanation: rates.note,
        userOverride: overrides.registrationDuties != null
      },
      notaryCosts: {
        id: 'notary_costs',
        label: 'Notariskosten aankoopakte (ereloon + admin + 21% btw)',
        low: round50(notaryLow),
        expected: round50(notaryTotal),
        high: round50(notaryHigh),
        ereloonExVat: round1(ereloon),
        adminExVat: round50(admin),
        vat: round50(notaryVat),
        sourceType: overrides.notaryEreloon != null ? 'USER_ASSUMPTION' : 'OFFICIAL_REGULATION',
        confidence: 'medium',
        explanation:
          'Ereloon volgens wettelijk degressief barema (KB 16/12/1950 e.v.; schijven tot 0,057%). ' +
          'Admin ' + ADMIN_BAND.note + ' Geen vervanging voor notarisofferte. Jbis-korting enige woning niet auto.',
        source: 'https://etaamb.openjustice.be/nl/koninklijk-besluit-van-22-november-2022_n2022042846.html',
        userOverride: overrides.notaryEreloon != null || overrides.administrativeCosts != null
      },
      administrativeCosts: {
        id: 'admin_bundled',
        label: 'Administratieve kosten (in notary bundle)',
        low: ADMIN_BAND.low,
        expected: round50(admin),
        high: ADMIN_BAND.high,
        sourceType: 'MARKET_BENCHMARK',
        confidence: 'medium',
        explanation: ADMIN_BAND.note
      },
      mortgageCosts: {
        id: 'mortgage_costs',
        label: 'Hypotheekkosten (registratie ~1% + hypotheekakte)',
        low: round50(mortgageCosts * 0.85),
        expected: round50(mortgageCosts),
        high: round50(mortgageCosts * 1.2),
        mortgageRegistrationDuties: round50(mortgageRegistration),
        mortgageDeedInclVat: round50(mortgageNotary),
        sourceType: mortgageCosts
          ? (overrides.mortgageCosts != null ? 'USER_ASSUMPTION' : 'MODEL_ASSUMPTION')
          : 'NOT_APPLICABLE',
        confidence: mortgageCosts ? 'low' : 'high',
        explanation: mortgageCosts
          ? 'Gescheiden: hypotheekrechten ≈ 1% op leenbedrag + indicatieve hypotheekakte (ereloon+btw). Override aangeraden.'
          : 'Geen financiering gemodelleerd.'
      },
      otherAcquisitionCosts: {
        id: 'other_acquisition',
        label: 'Andere aankoopkosten',
        expected: round50(other),
        sourceType: other ? 'USER_ASSUMPTION' : 'NOT_APPLICABLE'
      },
      totalAcquisitionCosts: {
        low: round50(registration + notaryLow + mortgageCosts * 0.85 + other),
        expected: round50(total),
        high: round50(registration + notaryHigh + mortgageCosts * 1.2 + other)
      },
      variableWithPurchase: true,
      formulaNote: 'registration = rate × purchase; ereloon = KB barema(purchase); mortgage ≈ 1%×loan + deed(loan)'
    };
  }

  return {
    REGION_RATES: REGION_RATES,
    NOTARY_ERELOON_BANDS: NOTARY_ERELOON_BANDS,
    ADMIN_BAND: ADMIN_BAND,
    regionFromProvince: regionFromProvince,
    estimateNotaryEreloon: estimateNotaryEreloon,
    buildAcquisitionCosts: buildAcquisitionCosts
  };
});
