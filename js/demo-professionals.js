/**
 * ELYAN — safe development-only demo professionals.
 *
 * VISUAL FIXTURE ONLY. Never production data.
 * Never loaded into Supabase. Never returned by public APIs.
 *
 * Enable ONLY when:
 *   - safe host: localhost / 127.0.0.1 / [::1] OR *.vercel.app
 *   - AND never elyan.be / www.elyan.be
 *   - AND URL has ?demoProfessionals=1
 *
 * Production hosts always get an empty list from this module.
 */
(function (global) {
  'use strict';

  /**
   * Category market bands for demo price context.
   * Derived from existing ELYAN category research notes (shared/vakmannen/categories.js)
   * and prior local homepage review fixtures — presented only as ELYAN marktindicatie.
   * Not partner quotes. Not Calculator 1 packaging changes.
   */
  var DEMO_MARKET_BANDS = {
    dakwerken: { range: '€ 160 – € 230 / m²', label: 'dakwerken' },
    badkamer: { range: '€ 6.500 – € 18.000', label: 'badkamer' },
    keuken: { range: '€ 8.000 – € 22.000', label: 'keuken' },
    'ramen-deuren': { range: '€ 600 – € 1.200 / m²', label: 'ramen & deuren' },
    isolatie: { range: '€ 25 – € 120 / m²', label: 'isolatie' },
    verwarming: { range: '€ 15.000 – € 25.000', label: 'verwarming' },
    elektriciteit: { range: 'Prijs op aanvraag', label: 'elektriciteit', onRequest: true },
    gevel: { range: '€ 80 – € 220 / m²', label: 'gevel' },
    vloeren: { range: '€ 45 – € 140 / m²', label: 'vloeren' },
    schilderwerken: { range: '€ 18 – € 45 / m²', label: 'schilderwerken' }
  };

  var COVERS = {
    dak: '/assets/photos/hero.jpg',
    bath: '/assets/photos/editorial.jpg',
    kitchen: '/assets/photos/why.jpg',
    craft: '/assets/photos/about.jpg'
  };

  function marketPrice(categoryId) {
    var band = DEMO_MARKET_BANDS[categoryId];
    if (!band) {
      return {
        priceLabel: '',
        priceLine: 'Prijsinformatie beschikbaar',
        priceContext: 'Bekijk prijscontext →'
      };
    }
    if (band.onRequest) {
      return {
        priceLabel: 'Prijsindicatie voor ' + band.label,
        priceLine: 'Prijsinformatie beschikbaar',
        priceContext: 'ELYAN marktindicatie · geen offerte'
      };
    }
    return {
      priceLabel: 'Prijsindicatie voor ' + band.label,
      priceLine: band.range,
      priceContext: 'ELYAN marktindicatie · geen offerte'
    };
  }

  function card(def) {
    var price = marketPrice(def.primaryCategoryId);
    var specs = def.specialisations || [];
    var specialtyLine = [def.primaryCategoryLabel]
      .concat(specs.slice(0, 2))
      .filter(Boolean)
      .join(' · ');
    return {
      is_demo: true,
      _localPreview: true,
      slug: def.slug,
      displayName: def.displayName,
      primaryCategoryId: def.primaryCategoryId,
      primaryCategoryLabel: def.primaryCategoryLabel,
      specialtyLine: specialtyLine,
      serviceAreaText: def.location,
      availabilityLabel: def.availability || '',
      /* Layout-only demo ratings — never Google-source */
      demoRating: def.demoRating || null,
      google: null,
      priceLabel: price.priceLabel,
      priceLine: price.priceLine,
      priceContext: price.priceContext,
      coverUrl: def.coverUrl,
      description: def.description || '',
      publishedAt: def.publishedAt,
      badge: 'Gecontroleerd door ELYAN'
    };
  }

  var DEMO_PROFESSIONALS = [
    card({
      slug: 'demo-noord-dakatelier',
      displayName: 'Noord Dakatelier',
      primaryCategoryId: 'dakwerken',
      primaryCategoryLabel: 'Dakwerken',
      specialisations: ['Dakrenovatie', 'Platte daken'],
      location: 'Antwerpen',
      availability: 'Beschikbaar binnen 2 weken',
      demoRating: { rating: '4,9', count: 31 },
      coverUrl: COVERS.dak,
      description:
        'Gespecialiseerd in renovatie van hellende en platte daken, met focus op duidelijke planning en afwerking.',
      publishedAt: '2099-01-10T00:00:00.000Z'
    }),
    card({
      slug: 'demo-atelier-badkamer',
      displayName: 'Atelier Badkamer',
      primaryCategoryId: 'badkamer',
      primaryCategoryLabel: 'Badkamer',
      specialisations: ['Badkamerrenovatie', 'Inloopdouches'],
      location: 'Mechelen',
      availability: 'Beschikbaar vanaf oktober',
      demoRating: { rating: '4,8', count: 18 },
      coverUrl: COVERS.bath,
      description: 'Badkamerrenovaties met heldere keuzes in sanitair, betegeling en waterdichte afwerking.',
      publishedAt: '2099-01-09T00:00:00.000Z'
    }),
    card({
      slug: 'demo-keukenhuis-rivier',
      displayName: 'Keukenhuis Rivier',
      primaryCategoryId: 'keuken',
      primaryCategoryLabel: 'Keuken',
      specialisations: ['Keukenrenovatie', 'Maatwerk'],
      location: 'Gent',
      availability: 'Planning op aanvraag',
      demoRating: { rating: '4,7', count: 42 },
      coverUrl: COVERS.kitchen,
      description: 'Maatwerkkeukens en renovatieprojecten met aandacht voor indeling, materiaalkeuze en montage.',
      publishedAt: '2099-01-08T00:00:00.000Z'
    }),
    card({
      slug: 'demo-raam-en-vorm',
      displayName: 'Raam & Vorm',
      primaryCategoryId: 'ramen-deuren',
      primaryCategoryLabel: 'Ramen & deuren',
      specialisations: ['Ramen', 'Buitendeuren'],
      location: 'Leuven',
      availability: '',
      demoRating: { rating: '4,9', count: 12 },
      coverUrl: COVERS.craft,
      description: 'Vervanging en plaatsing van ramen en buitendeuren met focus op isolatie en afwerking.',
      publishedAt: '2099-01-07T00:00:00.000Z'
    }),
    card({
      slug: 'demo-therma-isolatie',
      displayName: 'Therma Isolatie',
      primaryCategoryId: 'isolatie',
      primaryCategoryLabel: 'Isolatie',
      specialisations: ['Dakisolatie', 'Muurisolatie'],
      location: 'Hasselt',
      availability: 'Beschikbaar binnen 2 weken',
      demoRating: null,
      coverUrl: COVERS.dak,
      description: 'Isolatieprojecten voor dak en muren, gericht op comfortverbetering en duidelijke uitvoeringsstappen.',
      publishedAt: '2099-01-06T00:00:00.000Z'
    }),
    card({
      slug: 'demo-warmte-atelier',
      displayName: 'Warmte Atelier',
      primaryCategoryId: 'verwarming',
      primaryCategoryLabel: 'Verwarming',
      specialisations: ['Warmtepompen', 'Centrale verwarming'],
      location: 'Brugge',
      availability: 'Beschikbaar vanaf oktober',
      demoRating: { rating: '4,8', count: 27 },
      coverUrl: COVERS.craft,
      description: 'Installatie en vernieuwing van verwarmingssystemen, inclusief warmtepomptrajecten.',
      publishedAt: '2099-01-05T00:00:00.000Z'
    }),
    card({
      slug: 'demo-volt-en-woning',
      displayName: 'Volt & Woning',
      primaryCategoryId: 'elektriciteit',
      primaryCategoryLabel: 'Elektriciteit',
      specialisations: ['Elektrische renovatie', 'Laadpalen'],
      location: 'Aalst',
      availability: 'Planning op aanvraag',
      demoRating: { rating: '4,6', count: 15 },
      coverUrl: COVERS.kitchen,
      description: 'Elektrische renovatie en laadinfra voor woningen, met aandacht voor keuring en veiligheid.',
      publishedAt: '2099-01-04T00:00:00.000Z'
    }),
    card({
      slug: 'demo-gevelwerk-studio',
      displayName: 'Gevelwerk Studio',
      primaryCategoryId: 'gevel',
      primaryCategoryLabel: 'Gevel',
      specialisations: ['Gevelrenovatie', 'Voegwerken'],
      location: 'Sint-Niklaas',
      availability: '',
      demoRating: null,
      coverUrl: COVERS.bath,
      description: 'Gevelrenovatie en voegwerken met zorg voor uitstraling, bescherming en nette werfafwerking.',
      publishedAt: '2099-01-03T00:00:00.000Z'
    }),
    card({
      slug: 'demo-vloer-en-materie',
      displayName: 'Vloer & Materie',
      primaryCategoryId: 'vloeren',
      primaryCategoryLabel: 'Vloeren',
      specialisations: ['Tegelvloeren', 'Parket'],
      location: 'Kortrijk',
      availability: 'Beschikbaar binnen 2 weken',
      demoRating: { rating: '4,7', count: 22 },
      coverUrl: COVERS.kitchen,
      description: 'Plaatsing van tegelvloeren en parket met focus op ondergrond, afwerking en duurzame materialen.',
      publishedAt: '2099-01-02T00:00:00.000Z'
    }),
    card({
      slug: 'demo-lijn-schilderwerken',
      displayName: 'Lijn Schilderwerken',
      primaryCategoryId: 'schilderwerken',
      primaryCategoryLabel: 'Schilderwerken',
      specialisations: ['Binnenschilderwerk', 'Buitenschilderwerk'],
      location: 'Brussel',
      availability: 'Planning op aanvraag',
      demoRating: { rating: '4,9', count: 36 },
      coverUrl: COVERS.craft,
      description: 'Binnen- en buitenschilderwerk met nette voorbereiding, duurzame producten en strakke afwerking.',
      publishedAt: '2099-01-01T00:00:00.000Z'
    })
  ];

  function isLocalHost() {
    var host = String((global.location && global.location.hostname) || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  /** Localhost or Vercel Preview only — never production apex/www. */
  function isSafeDemoHost() {
    if (isLocalHost()) return true;
    var host = String((global.location && global.location.hostname) || '').toLowerCase();
    if (!host) return false;
    if (host === 'elyan.be' || host === 'www.elyan.be') return false;
    if (host.slice(-10) === '.vercel.app') return true;
    return false;
  }

  function isDemoModeEnabled() {
    if (!isSafeDemoHost()) return false;
    try {
      var params = new URLSearchParams(global.location.search || '');
      return params.get('demoProfessionals') === '1';
    } catch (err) {
      return false;
    }
  }

  function getDemoCards() {
    if (!isDemoModeEnabled()) return [];
    return DEMO_PROFESSIONALS.slice();
  }

  global.ElyanDemoProfessionals = {
    isDemoModeEnabled: isDemoModeEnabled,
    isLocalHost: isLocalHost,
    isSafeDemoHost: isSafeDemoHost,
    getDemoCards: getDemoCards,
    DEMO_COUNT: DEMO_PROFESSIONALS.length
  };
})(typeof window !== 'undefined' ? window : globalThis);
