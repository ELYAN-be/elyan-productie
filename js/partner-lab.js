/* ============================================================
   ELYAN Partner Lab — definitive product experience (demo)
   Models: Category, Partner, PartnerService, PriceModel,
   Availability, ServiceArea, GoogleReviewReference,
   CustomerRequest, RequestRecipient, PartnerResponse
   ============================================================ */
(function () {
  'use strict';

  var IMAGES = {
    hero: '/assets/photos/hero.jpg',
    editorial: '/assets/photos/editorial.jpg',
    why: '/assets/photos/why.jpg',
    about: '/assets/photos/about.jpg'
  };

  var PROVINCES = [
    'Antwerpen', 'Oost-Vlaanderen', 'West-Vlaanderen', 'Limburg',
    'Vlaams-Brabant', 'Waals-Brabant', 'Henegouwen', 'Luik',
    'Luxemburg', 'Namen', 'Brussel'
  ];

  /* Demo Belgian locality index: municipality + postcode + province */
  var LOCATIONS = [
    { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    { name: 'Berchem', postcode: '2600', province: 'Antwerpen' },
    { name: 'Wilrijk', postcode: '2610', province: 'Antwerpen' },
    { name: 'Schoten', postcode: '2900', province: 'Antwerpen' },
    { name: 'Brasschaat', postcode: '2930', province: 'Antwerpen' },
    { name: 'Mechelen', postcode: '2800', province: 'Antwerpen' },
    { name: 'Turnhout', postcode: '2300', province: 'Antwerpen' },
    { name: 'Lier', postcode: '2500', province: 'Antwerpen' },
    { name: 'Gent', postcode: '9000', province: 'Oost-Vlaanderen' },
    { name: 'Sint-Niklaas', postcode: '9100', province: 'Oost-Vlaanderen' },
    { name: 'Aalst', postcode: '9300', province: 'Oost-Vlaanderen' },
    { name: 'Dendermonde', postcode: '9200', province: 'Oost-Vlaanderen' },
    { name: 'Geraardsbergen', postcode: '9500', province: 'Oost-Vlaanderen' },
    { name: 'Lokeren', postcode: '9160', province: 'Oost-Vlaanderen' },
    { name: 'Brugge', postcode: '8000', province: 'West-Vlaanderen' },
    { name: 'Kortrijk', postcode: '8500', province: 'West-Vlaanderen' },
    { name: 'Oostende', postcode: '8400', province: 'West-Vlaanderen' },
    { name: 'Roeselare', postcode: '8800', province: 'West-Vlaanderen' },
    { name: 'Genk', postcode: '3600', province: 'Limburg' },
    { name: 'Hasselt', postcode: '3500', province: 'Limburg' },
    { name: 'Tongeren', postcode: '3700', province: 'Limburg' },
    { name: 'Leuven', postcode: '3000', province: 'Vlaams-Brabant' },
    { name: 'Vilvoorde', postcode: '1800', province: 'Vlaams-Brabant' },
    { name: 'Tienen', postcode: '3300', province: 'Vlaams-Brabant' },
    { name: 'Wavre', postcode: '1300', province: 'Waals-Brabant' },
    { name: 'Charleroi', postcode: '6000', province: 'Henegouwen' },
    { name: 'Mons', postcode: '7000', province: 'Henegouwen' },
    { name: 'Liège', postcode: '4000', province: 'Luik' },
    { name: 'Namur', postcode: '5000', province: 'Namen' },
    { name: 'Arlon', postcode: '6700', province: 'Luxemburg' },
    { name: 'Brussel', postcode: '1000', province: 'Brussel' },
    { name: 'Schaerbeek', postcode: '1030', province: 'Brussel' },
    { name: 'Ixelles', postcode: '1050', province: 'Brussel' },
    { name: 'Anderlecht', postcode: '1070', province: 'Brussel' }
  ];

  var CUSTOMER_TIMING = [
    { id: 'alle', label: 'Alle timing' },
    { id: 'asap', label: 'Zo snel mogelijk' },
    { id: '1m', label: 'Binnen 1 maand' },
    { id: '3m', label: 'Binnen 3 maanden' },
    { id: '6m', label: 'Binnen 6 maanden' },
    { id: 'flex', label: 'Later / flexibel' }
  ];

  /* NOW = Augustus 2026 for demo matching */
  var MONTH_ORDER = {
    'Augustus 2026': 0, 'September 2026': 1, 'Oktober 2026': 2,
    'November 2026': 3, 'December 2026': 4, 'Januari 2027': 5,
    'Februari 2027': 6, 'Maart 2027': 7
  };

  /* Category Intelligence v1 — schema-driven taxonomy */
  var CI = (window.ElyanVakmannen && ElyanVakmannen.Intelligence) || null;
  var OE = CI ? CI.PartnerOnboardingEngine : null;
  var RE = CI ? CI.CustomerRequestEngine : null;
  var PE = CI ? CI.PriceEngine : null;
  var ME = CI ? CI.MatchingEngine : null;

  var CAT_META = {
    dakwerken: { img: IMAGES.hero, pos: '50% 32%', golden: true },
    badkamer: { tone: true },
    keuken: { img: IMAGES.why, pos: '50% 60%' },
    'ramen-deuren': { tone: true },
    isolatie: { tone: true },
    verwarming: { tone: true },
    elektriciteit: { tone: true },
    gevel: { img: IMAGES.about, pos: '50% 40%' },
    vloeren: { img: IMAGES.editorial, pos: '40% 50%' },
    schilderwerken: { tone: true },
    ventilatie: { tone: true },
    zonnepanelen: { tone: true }
  };

  var TAXONOMY = {};
  if (CI && CI.CATEGORIES) {
    Object.keys(CI.CATEGORIES).forEach(function (id) {
      var c = CI.CATEGORIES[id];
      var meta = CAT_META[id] || { tone: true };
      TAXONOMY[id] = {
        label: c.label,
        plural: c.plural,
        img: meta.img,
        pos: meta.pos,
        tone: meta.tone,
        golden: !!meta.golden,
        subtypes: c.services.map(function (s) {
          return { id: s.id, label: s.label, sharedId: s.sharedId || null };
        })
      };
    });
  }

  var CATEGORIES = Object.keys(TAXONOMY).map(function (id) {
    var t = TAXONOMY[id];
    return { id: id, label: t.label, img: t.img, pos: t.pos, tone: t.tone };
  });

  function svc(subtype, label, model, display, context, from, to) {
    return { subtype: subtype, label: label, model: model, display: display, context: context, from: from, to: to };
  }

  var COMPANIES = [
    {
      id: 'atelier-dak',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'isolatie', 'bedekking', 'dakvenster'],
      name: 'Atelier Dak Antwerpen',
      specialtyLine: 'Hellende daken met zorgvuldige afwerking',
      city: 'Antwerpen',
      province: 'Antwerpen',
      radius: 'Antwerpen + 25 km',
      priceLevel: '€€€',
      capacity: 'Beperkt beschikbaar',
      startMonth: 'Oktober 2026',
      visit: 'Doorgaans binnen 7–14 dagen',
      years: 12,
      teamSize: '6–10',
      image: IMAGES.hero,
      objectPos: '50% 30%',
      gallery: [IMAGES.hero, IMAGES.why, IMAGES.editorial],
      about: 'Atelier Dak Antwerpen werkt al twaalf jaar aan hellende dakrenovaties waarbij materiaalkeuze, details en planning evenveel aandacht krijgen als de technische uitvoering. Het team neemt vooral kwaliteitsrenovaties voor gezinswoningen aan en laat bewust haastprojecten links liggen.',
      strengths: ['Hellende daken', 'Isolatiepakketten', 'Nette oplevering'],
      method: ['Kennismaking over scope en timing', 'Opmeting ter plaatse', 'Uitvoering met vaste contactpersoon'],
      prefer: 'Gezinswoningen en kwaliteitsrenovaties',
      avoid: 'Spoedwerken zonder opmeting',
      materials: 'Keramische pannen, isolatiepakketten',
      values: 'Duidelijke planning en nette werf',
      minProject: 'Vanaf € 8.500 voor volledige renovaties',
      google: {
        rating: 4.7,
        count: 83,
        placeId: 'demo_place_atelier_dak',
        url: 'https://maps.google.com/?q=Atelier+Dak+Antwerpen+demo',
        reviews: [
          { author: 'Annelies V.', text: 'Nette werf, duidelijke planning en nette afwerking van het hellend dak.' },
          { author: 'Pieter D.', text: 'Goede uitleg over isolatieopties. Prijs bleef dicht bij de indicatie.' }
        ]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2-range', '€ 160 – € 230 / m²', 'Indicatie dakrenovatie', 160, 230),
        svc('isolatie', 'Dakisolatie', 'm2-range', '€ 45 – € 75 / m²', 'Indicatie isolatie', 45, 75),
        svc('herstelling', 'Kleine dakherstelling', 'vanaf', 'Vanaf € 350', 'Kleine interventie', 350, null),
        svc('dakvenster', 'Dakvenster plaatsen', 'vanaf', 'Vanaf € 1.200', 'Per venster, excl. afwerking', 1200, null)
      ]
    },
    {
      id: 'vermeulen',
      category: 'dakwerken',
      subtypes: ['hellend', 'isolatie', 'goten', 'herstelling'],
      name: 'Vermeulen Dakwerken',
      specialtyLine: 'Hellende daken en isolatie voor gezinswoningen',
      city: 'Mechelen',
      province: 'Antwerpen',
      radius: 'Mechelen + 35 km',
      priceLevel: '€€',
      capacity: 'Beperkt beschikbaar',
      startMonth: 'November 2026',
      visit: 'Doorgaans binnen 10–15 dagen',
      years: 18,
      teamSize: '4–6',
      image: IMAGES.editorial,
      objectPos: '45% 40%',
      gallery: [IMAGES.editorial, IMAGES.hero, IMAGES.about],
      about: 'Vermeulen Dakwerken is een familiebedrijf met focus op hellende daken en dakisolatie. Ze werken graag met een helder plan en nemen projecten aan waar comfortverbetering centraal staat.',
      strengths: ['Hellende daken', 'Dakisolatie', 'Goten'],
      method: ['Intake', 'Opmeting', 'Uitvoering'],
      prefer: 'Isolatie + dakvernieuwing samen',
      avoid: 'Puurluxe designprojecten',
      materials: 'Pannen, minerale wol',
      values: 'Eerlijke planning',
      minProject: 'Vanaf € 6.000',
      google: {
        rating: 4.5, count: 61, placeId: 'demo_vermeulen',
        url: 'https://maps.google.com/?q=Vermeulen+Dakwerken+demo',
        reviews: [{ author: 'Sofie M.', text: 'Duidelijke communicatie over isolatie en planning.' }]
      },
      services: [
        svc('hellend', 'Hellend dak vernieuwen', 'm2-range', '€ 150 – € 205 / m²', 'Indicatie hellend dak', 150, 205),
        svc('isolatie', 'Dakisolatie', 'm2-range', '€ 40 – € 70 / m²', 'Indicatie isolatie', 40, 70),
        svc('herstelling', 'Herstelling / lekkage', 'vanaf', 'Vanaf € 280', 'Kleine interventie', 280, null),
        svc('goten', 'Goten vernieuwen', 'lm-range', '€ 55 – € 85 / lm', 'Per lopende meter', 55, 85)
      ]
    },
    {
      id: 'noorddak',
      category: 'dakwerken',
      subtypes: ['plat', 'bedekking', 'herstelling', 'goten'],
      name: 'Noorddak',
      specialtyLine: 'EPDM en platte dakrenovaties',
      city: 'Brasschaat',
      province: 'Antwerpen',
      radius: 'Brasschaat + 30 km',
      priceLevel: '€€',
      capacity: 'Nieuwe projecten mogelijk',
      startMonth: 'September 2026',
      visit: 'Doorgaans binnen een week',
      years: 9,
      teamSize: '3–5',
      image: IMAGES.about,
      objectPos: '50% 45%',
      gallery: [IMAGES.about, IMAGES.hero, IMAGES.editorial],
      about: 'Noorddak specialiseert zich in platte daken en EPDM. Praktische aanpak, korte lijnen, duidelijke opmeting vóór prijsafspraak.',
      strengths: ['Platte daken', 'EPDM', 'Snelle opmeting'],
      method: ['Opmeting', 'Voorstel', 'Uitvoering'],
      prefer: 'Platte daken en EPDM',
      avoid: 'Complexe hellende monumenten',
      materials: 'EPDM, bitumen',
      values: 'Praktisch en helder',
      minProject: 'Vanaf € 5.500',
      google: {
        rating: 4.6, count: 44, placeId: 'demo_noorddak',
        url: 'https://maps.google.com/?q=Noorddak+demo',
        reviews: [{ author: 'Tom R.', text: 'EPDM netjes geplaatst, snelle planning.' }]
      },
      services: [
        svc('plat', 'Plat dak renovatie', 'm2-range', '€ 135 – € 190 / m²', 'Indicatie plat dak', 135, 190),
        svc('bedekking', 'EPDM dakbedekking', 'm2-range', '€ 120 – € 175 / m²', 'Indicatie bedekking', 120, 175),
        svc('herstelling', 'Lekkage / herstelling', 'vanaf', 'Vanaf € 250', 'Inspectie + herstelling', 250, null)
      ]
    },
    {
      id: 'dak-vorm',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'constructie', 'dakvenster', 'schoorsteen'],
      name: 'Dak & Vorm',
      specialtyLine: 'Architecturale dakdetails en maatwerk',
      city: 'Antwerpen',
      province: 'Antwerpen',
      radius: 'Antwerpen + 20 km',
      priceLevel: '€€€',
      capacity: 'Momenteel volzet',
      startMonth: 'December 2026',
      visit: 'Op afspraak',
      years: 14,
      teamSize: '8–12',
      image: IMAGES.why,
      objectPos: '55% 35%',
      gallery: [IMAGES.why, IMAGES.about, IMAGES.hero],
      about: 'Dak & Vorm werkt aan renovaties waar vormgeving en technische uitvoering samenkomen. Sterk in details, dakkapellen en zorgvuldig timmerwerk.',
      strengths: ['Maatwerkdetails', 'Dakkapellen', 'Constructie'],
      method: ['Ontwerpoverleg', 'Opmeting', 'Uitvoering'],
      prefer: 'Design-gerichte renovaties',
      avoid: 'Pure spoedherstellingen',
      materials: 'Leien, zinkdetails, houtconstructie',
      values: 'Afwerking en vorm',
      minProject: 'Vanaf € 10.000',
      google: {
        rating: 4.8, count: 37, placeId: 'demo_dakvorm',
        url: 'https://maps.google.com/?q=Dak+Vorm+demo',
        reviews: [{ author: 'Elena K.', text: 'Prachtige details, wel langere wachttijd.' }]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2-range', '€ 175 – € 250 / m²', 'Indicatie renovatie', 175, 250),
        svc('dakvenster', 'Dakvenster / dakkapel', 'op-aanvraag', 'Prijs op aanvraag', 'Na opmeting', null, null),
        svc('constructie', 'Dakconstructie', 'op-aanvraag', 'Afhankelijk van project', 'Na plaatsbezoek', null, null)
      ]
    },
    {
      id: 'vandenbroeck',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'herstelling', 'goten', 'schoorsteen'],
      name: 'Van den Broeck Dakprojecten',
      specialtyLine: 'Renovatieprojecten voor rijwoningen',
      city: 'Schoten',
      province: 'Antwerpen',
      radius: 'Schoten + 40 km',
      priceLevel: '€€',
      capacity: 'Nieuwe projecten mogelijk',
      startMonth: 'Oktober 2026',
      visit: 'Doorgaans binnen 7–12 dagen',
      years: 22,
      teamSize: '10–15',
      image: IMAGES.hero,
      objectPos: '60% 45%',
      gallery: [IMAGES.hero, IMAGES.editorial, IMAGES.why],
      about: 'Van den Broeck begeleidt gezinnen door een overzichtelijk renovatieproces, van opmeting tot oplevering. Ervaren in rijwoningen en halfopen bebouwing.',
      strengths: ['Rijwoningen', 'Volledige renovatie', 'Begeleiding'],
      method: ['Kennismaking', 'Opmeting', 'Planning & uitvoering'],
      prefer: 'Gezinswoningen',
      avoid: 'Industrieel vastgoed',
      materials: 'Pannen, goten, standaardisolatie',
      values: 'Voorspelbaar proces',
      minProject: 'Vanaf € 7.000',
      google: {
        rating: 4.4, count: 102, placeId: 'demo_vdb',
        url: 'https://maps.google.com/?q=VandenBroeck+demo',
        reviews: [{ author: 'Karel B.', text: 'Betrouwbaar traject voor onze rijwoning.' }]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2-range', '€ 155 – € 215 / m²', 'Indicatie renovatie', 155, 215),
        svc('herstelling', 'Herstelling', 'vanaf', 'Vanaf € 300', 'Kleine interventie', 300, null),
        svc('goten', 'Goten', 'lm-range', '€ 50 – € 80 / lm', 'Per lopende meter', 50, 80)
      ]
    },
    {
      id: 'rooftop',
      category: 'dakwerken',
      subtypes: ['volledig', 'plat', 'bedekking', 'isolatie'],
      name: 'Rooftop Construct',
      specialtyLine: 'Efficiënte vernieuwing met heldere afspraken',
      city: 'Wilrijk',
      province: 'Antwerpen',
      radius: 'Wilrijk + 30 km',
      priceLevel: '€',
      capacity: 'Beperkt beschikbaar',
      startMonth: 'September 2026',
      visit: 'Doorgaans binnen 5–10 dagen',
      years: 7,
      teamSize: '5–8',
      image: IMAGES.editorial,
      objectPos: '35% 55%',
      gallery: [IMAGES.editorial, IMAGES.about, IMAGES.hero],
      about: 'Rooftop Construct richt zich op goed georganiseerde dakvernieuwingen met duidelijke prijsafspraken vooraf. Ideaal voor standaard vernieuwingen zonder zwaar maatwerk.',
      strengths: ['Efficiënte planning', 'Platte én hellende daken', 'Heldere scope'],
      method: ['Snelle intake', 'Opmeting', 'Uitvoering'],
      prefer: 'Standaard vernieuwingen',
      avoid: 'Zwaar architecturaal maatwerk',
      materials: 'Standaardpakketten',
      values: 'Duidelijkheid vooraf',
      minProject: 'Vanaf € 4.800',
      google: {
        rating: 4.3, count: 29, placeId: 'demo_rooftop',
        url: 'https://maps.google.com/?q=Rooftop+Construct+demo',
        reviews: [{ author: 'Lynn S.', text: 'Snel en duidelijk over de prijs.' }]
      },
      services: [
        svc('volledig', 'Dakvernieuwing', 'vanaf', 'Vanaf € 4.800', 'Standaard project', 4800, null),
        svc('plat', 'Plat dak', 'm2-range', '€ 125 – € 180 / m²', 'Indicatie plat dak', 125, 180),
        svc('isolatie', 'Isolatie', 'm2-range', '€ 38 – € 65 / m²', 'Indicatie isolatie', 38, 65)
      ]
    }
  ];

  /* Merge Category Intelligence QA seeds (fictional, non-dak) */
  if (window.ElyanVakmannen && ElyanVakmannen.QA_SEED_PARTNERS) {
    COMPANIES = COMPANIES.concat(ElyanVakmannen.QA_SEED_PARTNERS);
  }

  var ONBOARD_STEPS = (OE && OE.steps)
    ? OE.steps.map(function (s) { return s.label; })
    : ['Bedrijf', 'Werkgebied', 'Hoofdcategorie', 'Diensten', 'Projectvoorkeuren', 'Prijzen', 'Beschikbaarheid', 'Bedrijfseigenheid', 'Projectfoto’s', 'Google Reviews', 'Controle'];

  function quoteStepsFor(categoryId) {
    if (RE) return RE.getSteps(categoryId).map(function (s) { return s.label; });
    return ['Type werk', 'Projectdetails', 'Timing', 'Foto’s', 'Budget', 'Contact', 'Overzicht'];
  }

  var START_MONTH_OPTIONS = [
    'September 2026', 'Oktober 2026', 'November 2026', 'December 2026',
    'Januari 2027', 'Februari 2027', 'Maart 2027', 'April 2027'
  ];

  var AREA_MODES = [
    { id: 'radius', label: 'Radius rond vestiging' },
    { id: 'municipalities', label: 'Specifieke gemeenten' },
    { id: 'provinces', label: 'Specifieke provincies' },
    { id: 'flanders', label: 'Heel Vlaanderen' }
  ];

  var VISIT_OPTS = (OE && OE.visitOptions) ? OE.visitOptions : [
    { id: '2w', label: 'Binnen 2 weken', public: 'meestal binnen 7 tot 14 dagen' }
  ];
  var CAPACITY_OPTS = (OE && OE.capacityOptions) ? OE.capacityOptions : [
    { id: 'available', label: 'Nieuwe projecten mogelijk' },
    { id: 'limited', label: 'Beperkt beschikbaar' },
    { id: 'full', label: 'Momenteel volzet' }
  ];
  var DECLINE_OPTS = (RE && RE.declineReasons) ? RE.declineReasons : [
    { id: 'planning', label: 'Planning' },
    { id: 'outside_area', label: 'Buiten werkgebied' },
    { id: 'project_type', label: 'Type project' },
    { id: 'project_size', label: 'Projectomvang' },
    { id: 'budget', label: 'Budget' },
    { id: 'capacity', label: 'Capaciteit' },
    { id: 'other', label: 'Andere reden' }
  ];
  var IDENTITY_QS = (OE && OE.identityQuestions) ? OE.identityQuestions : [];

  var state = {
    view: 'discover',
    showResults: false,
    category: 'dakwerken',
    subtype: 'alle',
    locationQuery: '',
    location: { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    provinceBrowse: null,
    locSuggestOpen: false,
    locSuggestIndex: -1,
    customerTiming: 'alle',
    priceLevel: 'alle',
    sort: 'aanbevolen',
    filtersOpen: false,
    activeCompanyId: 'atelier-dak',
    quote: {
      step: 0,
      category: 'dakwerken',
      partnerIds: ['atelier-dak'],
      service: 'volledig',
      workType: 'volledig',
      answers: {},
      roofType: '',
      area: '',
      areaUnknown: false,
      covering: '',
      coveringUnknown: false,
      insulation: '',
      condition: '',
      wants: [],
      timing: '3m',
      timingMonth: '',
      photos: 0,
      hasBudget: 'nee',
      budgetFrom: '',
      budgetTo: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      sent: false,
      customerInterestNote: null
    },
    partnerMode: 'onboarding',
    partnerPanel: 'overzicht',
    onboardStep: 0,
    onboard: {
      companyName: '',
      tradeName: '',
      vat: '',
      btw: '',
      contact: '',
      contactRole: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      areaMode: 'radius',
      area: '',
      areaExclude: '',
      primaryCategory: '',
      subtypes: [],
      conditionalAnswers: {},
      projectTypes: [],
      coordination: '',
      businessType: '',
      design: [],
      materials: [],
      glazing: [],
      systems: [],
      floors: [],
      finishes: [],
      scope: [],
      roofTypes: [],
      showroom: '',
      yearsActive: '',
      strength: '',
      prefer: '',
      avoid: '',
      care: '',
      whyChoose: '',
      materialsText: '',
      mustKnow: '',
      prices: {},
      priceModel: 'price_range',
      priceFrom: '',
      priceTo: '',
      isolFrom: '',
      isolTo: '',
      repairFrom: '',
      material: '',
      vatBasis: 'Exclusief',
      minProject: '',
      capacity: 'Beperkt beschikbaar',
      capacityId: 'limited',
      startMonth: '',
      visitSpeed: '2w',
      visitExtra: [],
      hasGoogle: '',
      googleQuery: '',
      googleConsent: false,
      googlePlaceId: ''
    },
    partnerStatus: 'Ingediend',
    customerNotices: [],
    photos: [
      { id: 1, title: 'Hellend dak Berchem', partner: 'Ingediend', elyan: 'Ter controle', img: IMAGES.hero },
      { id: 2, title: 'Detail nokafwerking', partner: 'Concept', elyan: '-', img: IMAGES.editorial },
      { id: 3, title: 'Isolatiezolder', partner: 'Ingediend', elyan: 'Goedgekeurd', img: IMAGES.why }
    ],
    requests: [
      {
        id: 'a1',
        category: 'dakwerken',
        title: 'Volledige dakrenovatie',
        location: 'Antwerpen',
        size: '±120 m²',
        roof: 'Hellend dak',
        customerWish: 'November 2026',
        timingFit: 'Past bij jouw beschikbaarheid',
        budget: '€ 18.000 – € 24.000',
        wishes: 'Nieuwe dakbedekking + isolatie',
        photos: 3,
        status: 'new',
        customerVisible: false
      },
      {
        id: 'a2',
        category: 'dakwerken',
        title: 'Plat dak',
        location: 'Berchem',
        size: '65 m²',
        roof: 'Plat dak',
        customerWish: 'Zo snel mogelijk',
        timingFit: 'Past bij jouw beschikbaarheid',
        budget: 'niet opgegeven',
        wishes: 'EPDM vervangen',
        photos: 1,
        status: 'new',
        customerVisible: false
      },
      {
        id: 'a3',
        category: 'dakwerken',
        title: 'Dakisolatie',
        location: 'Schoten',
        size: 'zoldervloer',
        roof: 'Hellend',
        customerWish: 'Flexibel',
        timingFit: 'Past',
        budget: '€ 4.500 – € 7.000',
        wishes: 'Comfort verbeteren',
        photos: 0,
        status: 'interested',
        interestedAt: '2026-08-10T10:00:00.000Z',
        customerVisible: true,
        customerMessage: 'Deze vakman heeft interesse.'
      }
    ],
    priceChange: {
      current: '€ 160 – € 230 / m²',
      proposed: '€ 175 – € 245 / m²'
    },
    adminNote: ''
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function tax(id) { return TAXONOMY[id] || TAXONOMY.dakwerken; }
  function catLabel(id) { return tax(id).label; }
  function pluralLabel(id) { return tax(id).plural; }
  function companyById(id) {
    for (var i = 0; i < COMPANIES.length; i++) if (COMPANIES[i].id === id) return COMPANIES[i];
    return COMPANIES[0];
  }
  function subtypeLabel(catId, subId) {
    var list = tax(catId).subtypes;
    for (var i = 0; i < list.length; i++) if (list[i].id === subId) return list[i].label;
    return 'Alle types';
  }
  function serviceForContext(company, subtype) {
    if (!company.services || !company.services.length) return null;
    if (subtype && subtype !== 'alle') {
      for (var i = 0; i < company.services.length; i++) {
        if (company.services[i].subtype === subtype) return company.services[i];
      }
    }
    return company.services[0];
  }
  function starsHtml(rating, count) {
    return '<div class="lab-stars"><svg class="icon"><use href="#i-star"></use></svg> ' +
      escapeHtml(String(rating).replace('.', ',')) +
      ' <span>' + escapeHtml(String(count)) + ' Google-beoordelingen</span></div>';
  }
  function matchesTiming(company, timing) {
    if (!timing || timing === 'alle' || timing === 'flex') return true;
    var m = MONTH_ORDER[company.startMonth];
    if (m == null) return true;
    if (timing === 'asap' || timing === '1m') return m <= 1;
    if (timing === '3m') return m <= 3;
    if (timing === '6m') return m <= 6;
    return true;
  }
  function timingMatchInfo(company) {
    var wish = customerTimingWishLabel();
    var partner = company.startMonth;
    var ok = true;
    if (state.customerTiming === 'asap' || state.customerTiming === '1m') {
      ok = (MONTH_ORDER[company.startMonth] || 99) <= 1;
    } else if (state.customerTiming === '3m') {
      ok = (MONTH_ORDER[company.startMonth] || 99) <= 3;
    } else if (state.customerTiming === '6m') {
      ok = (MONTH_ORDER[company.startMonth] || 99) <= 6;
    }
    return {
      wish: wish,
      partner: partner,
      ok: ok,
      label: ok ? 'Timing lijkt passend' : 'Timing sluit mogelijk niet volledig aan'
    };
  }
  function customerTimingWishLabel() {
    if (state.customerTiming === 'alle') return 'Nog niet opgegeven';
    if (state.customerTiming === 'asap') return 'Zo snel mogelijk';
    if (state.customerTiming === '1m') return 'Binnen 1 maand';
    if (state.customerTiming === '3m') return 'Binnen 3 maanden';
    if (state.customerTiming === '6m') return 'Binnen 6 maanden';
    if (state.customerTiming === 'flex') return 'Later / flexibel';
    return 'Nog niet opgegeven';
  }
  function suggestLocations(q) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 1) return [];
    var starts = [];
    var posts = [];
    LOCATIONS.forEach(function (l) {
      var name = l.name.toLowerCase();
      if (l.postcode.indexOf(q) === 0) posts.push(l);
      else if (name.indexOf(q) === 0) starts.push(l);
    });
    return starts.concat(posts).slice(0, 7);
  }
  function field(label, key, value, type, placeholder) {
    return '<label class="lab-field">' + escapeHtml(label) +
      '<input data-onboard-field="' + key + '" type="' + (type || 'text') + '" value="' + escapeHtml(value == null ? '' : value) + '"' +
      (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : '') + '></label>';
  }
  function selectField(label, key, value, options) {
    return '<label class="lab-field">' + escapeHtml(label) +
      '<select data-onboard-field="' + key + '">' +
      options.map(function (opt) {
        var id = typeof opt === 'string' ? opt : opt.id;
        var lab = typeof opt === 'string' ? opt : opt.label;
        return '<option value="' + escapeHtml(id) + '"' + (value === id ? ' selected' : '') + '>' + escapeHtml(lab) + '</option>';
      }).join('') +
      '</select></label>';
  }
  function choiceMulti(arr, id, label, attr) {
    attr = attr || 'data-toggle-subtype';
    return '<button type="button" class="lab-choice' + ((arr || []).indexOf(id) >= 0 ? ' is-selected' : '') + '" ' + attr + '="' + escapeHtml(id) + '">' + escapeHtml(label) + '</button>';
  }
  function renderQuestionBlock(questions, answers, mode) {
    answers = answers || {};
    mode = mode || 'onboard';
    var singleAttr = mode === 'quote' ? 'data-quote-answer-single' : 'data-answer-single';
    var multiAttr = mode === 'quote' ? 'data-quote-answer-multi' : 'data-answer-multi';
    var fieldAttr = mode === 'quote' ? 'data-quote-answer-field' : 'data-onboard-field';
    return (questions || []).map(function (qq) {
      if (qq.type === 'info') {
        return '<p class="lab-hint" style="margin:10px 0;">' + escapeHtml(qq.label) + '</p>';
      }
      if (qq.type === 'multi') {
        var selected = answers[qq.key] || [];
        if (!Array.isArray(selected)) selected = [];
        return '<p class="lab-hint" style="margin:14px 0 8px;">' + escapeHtml(qq.label) + '</p><div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (selected.indexOf(oid) >= 0 ? ' is-selected' : '') + '" ' + multiAttr + '="' + escapeHtml(qq.key) + '" data-val="' + escapeHtml(oid) + '">' + escapeHtml(olab) + '</button>';
          }).join('') + '</div>';
      }
      if (qq.type === 'single' || qq.type === 'select') {
        var cur = answers[qq.key] || '';
        return '<p class="lab-hint" style="margin:14px 0 8px;">' + escapeHtml(qq.label) + '</p><div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (cur === oid ? ' is-selected' : '') + '" ' + singleAttr + '="' + escapeHtml(qq.key) + '" data-val="' + escapeHtml(oid) + '">' + escapeHtml(olab) + '</button>';
          }).join('') + '</div>';
      }
      if (qq.type === 'number' || qq.type === 'text') {
        return '<label class="lab-field">' + escapeHtml(qq.label) +
          '<input ' + fieldAttr + '="' + escapeHtml(qq.key) + '" type="' + (qq.type === 'number' ? 'number' : 'text') + '" value="' + escapeHtml(answers[qq.key] == null ? '' : answers[qq.key]) + '"' +
          (qq.placeholder ? ' placeholder="' + escapeHtml(qq.placeholder) + '"' : '') + '></label>' +
          (qq.allowUnknown ? '<button type="button" class="lab-choice' + (answers[qq.key + 'Unknown'] ? ' is-selected' : '') + '" ' + singleAttr + '="' + escapeHtml(qq.key + 'Unknown') + '" data-val="1">Ik weet het niet</button>' : '');
      }
      return '';
    }).join('');
  }
  function fact(label, value) {
    return '<div class="lab-fact"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }
  function toggleArray(arr, value) {
    var i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1); else arr.push(value);
  }

  function setView(name) {
    state.view = name;
    $all('.lab-view').forEach(function (el) {
      var on = el.getAttribute('data-view') === name;
      el.classList.toggle('is-active', on);
      el.hidden = !on;
    });
    $all('.lab-tab').forEach(function (btn) {
      var v = btn.getAttribute('data-lab-view');
      btn.classList.toggle('is-active', v === name || (name === 'quote' && v === 'profile'));
    });
    render();
    window.scrollTo(0, 0);
  }
  function openProfile(id) {
    state.activeCompanyId = id;
    setView('profile');
  }
  function openQuote(partnerId) {
    var partner = companyById(partnerId || state.activeCompanyId);
    state.quote.sent = false;
    state.quote.step = 0;
    state.quote.partnerIds = [partner.id];
    state.quote.category = partner.category || state.category;
    state.quote.service = (partner.subtypes && partner.subtypes[0]) || '';
    state.quote.workType = state.quote.service;
    state.quote.answers = {};
    state.quote.wants = [];
    state.activeCompanyId = partner.id;
    setView('quote');
  }
  function openLightbox(src) {
    var box = $('#labLightbox');
    var img = $('#labLightboxImg');
    if (!box || !img) return;
    img.src = src;
    box.hidden = false;
    document.body.classList.add('lock-scroll');
  }
  function closeLightbox() {
    var box = $('#labLightbox');
    if (!box) return;
    box.hidden = true;
    document.body.classList.remove('lock-scroll');
  }
  function openFiltersDrawer() {
    var d = $('#filtersDrawer');
    var body = $('#filtersDrawerBody');
    if (!d || !body) return;
    body.innerHTML = renderFiltersMarkup(true);
    d.hidden = false;
    document.body.classList.add('lock-scroll');
    bindFilterControls(body);
  }
  function closeFiltersDrawer() {
    var d = $('#filtersDrawer');
    if (!d) return;
    d.hidden = true;
    document.body.classList.remove('lock-scroll');
  }

  function filteredCompanies() {
    var list = COMPANIES.filter(function (c) {
      if (c.category !== state.category) return false;
      if (state.subtype !== 'alle' && c.subtypes.indexOf(state.subtype) < 0) return false;
      if (!matchesTiming(c, state.customerTiming)) return false;
      if (state.priceLevel !== 'alle' && c.priceLevel !== state.priceLevel) return false;
      if (state.provinceBrowse && c.province !== state.provinceBrowse) return false;
      return true;
    });
    if (state.sort === 'prijs') {
      var order = { '€': 1, '€€': 2, '€€€': 3 };
      list.sort(function (a, b) { return (order[a.priceLevel] || 9) - (order[b.priceLevel] || 9); });
    } else if (state.sort === 'beschikbaar') {
      list.sort(function (a, b) {
        return (MONTH_ORDER[a.startMonth] || 99) - (MONTH_ORDER[b.startMonth] || 99);
      });
    } else if (state.sort === 'google') {
      list.sort(function (a, b) { return (b.google.rating || 0) - (a.google.rating || 0); });
    }
    return list;
  }

  function renderFiltersMarkup(mobile) {
    var subtypes = tax(state.category).subtypes;
    return (
      (mobile ? '' : '<h2>Filters</h2>') +
      '<label>Vakgebied<select id="filterCategory">' +
        CATEGORIES.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + escapeHtml(c.label) + '</option>';
        }).join('') +
      '</select></label>' +
      '<label>Type werk<select id="filterSubtype">' +
        '<option value="alle"' + (state.subtype === 'alle' ? ' selected' : '') + '>Alle types</option>' +
        subtypes.map(function (t) {
          return '<option value="' + t.id + '"' + (state.subtype === t.id ? ' selected' : '') + '>' + escapeHtml(t.label) + '</option>';
        }).join('') +
      '</select></label>' +
      '<label>Regio<select disabled><option>' + escapeHtml(state.location.name) + ' (' + escapeHtml(state.location.province) + ')</option></select></label>' +
      '<label>Wanneer wil je starten?<select id="filterTiming">' +
        CUSTOMER_TIMING.map(function (t) {
          return '<option value="' + t.id + '"' + (state.customerTiming === t.id ? ' selected' : '') + '>' + escapeHtml(t.label) + '</option>';
        }).join('') +
      '</select></label>' +
      '<label>Prijsniveau<select id="filterPrice">' +
        '<option value="alle"' + (state.priceLevel === 'alle' ? ' selected' : '') + '>Alle</option>' +
        '<option value="€"' + (state.priceLevel === '€' ? ' selected' : '') + '>€</option>' +
        '<option value="€€"' + (state.priceLevel === '€€' ? ' selected' : '') + '>€€</option>' +
        '<option value="€€€"' + (state.priceLevel === '€€€' ? ' selected' : '') + '>€€€</option>' +
      '</select></label>'
    );
  }

  function renderCompanyRow(c, compact) {
    var price = serviceForContext(c, state.subtype);
    return (
      '<article class="lab-row">' +
        '<div class="lab-row-media"><img src="' + c.image + '" alt="" style="object-position:' + c.objectPos + '" loading="lazy"></div>' +
        '<div>' +
          '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
          '<h3>' + escapeHtml(c.name) + '</h3>' +
          '<p class="tagline">' + escapeHtml(c.specialtyLine) + '</p>' +
          starsHtml(c.google.rating, c.google.count) +
        '</div>' +
        '<div class="lab-row-meta">' +
          '<div><strong>' + escapeHtml(c.radius) + '</strong></div>' +
          '<div>Vanaf ' + escapeHtml(c.startMonth.replace(' 2026', '').replace(' 2027', ' ’27').toLowerCase()) + '</div>' +
        '</div>' +
        '<div class="lab-row-price">' +
          '<div class="val">' + escapeHtml(price ? price.display : 'Prijs op aanvraag') + '</div>' +
          '<div class="ctx">' + escapeHtml(price ? price.context : '') + '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-open-profile="' + c.id + '">Bekijk vakman</button>' +
      '</article>'
    );
  }

  /* ========== DISCOVER ========== */
  function renderDiscoverLanding() {
    var featured = COMPANIES.slice(0, 4);
    return (
      '<section class="lab-disc-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker">Vakmannen</p>' +
        '<h1>Vind de juiste vakman voor je renovatie.</h1>' +
        '<p class="lead">Ontdek gecontroleerde vakbedrijven, begrijp prijs en timing, en vraag een offerte aan wanneer het past.</p>' +
        '<form class="lab-search" id="discoverSearch" autocomplete="off">' +
          '<label>Wat wil je laten uitvoeren?<select name="category">' +
            CATEGORIES.map(function (c) {
              return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + escapeHtml(c.label) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="lab-loc">Gemeente of postcode' +
            '<input name="location" id="locInput" value="' + escapeHtml(state.locationQuery || state.location.name) + '" placeholder="Typ een gemeente…" aria-autocomplete="list" aria-expanded="false">' +
            '<div class="lab-suggest" id="locSuggest" hidden></div>' +
          '</label>' +
          '<button type="submit" class="btn btn-primary">Vind vakmannen</button>' +
        '</form>' +
      '</div></section>' +

      '<section class="lab-disc-band"><div class="lab-wrap">' +
        '<h2>Waarmee kunnen we je helpen?</h2>' +
        '<p class="lab-hint">Kies een categorie om te browsen. Zoeken is optioneel.</p>' +
        '<div class="lab-cat-mosaic">' +
          CATEGORIES.map(function (c) {
            var cls = 'lab-cat' + (c.img ? ' has-img' : '') + (state.category === c.id ? ' is-active' : '');
            var style = c.img ? ' style="--img:url(' + c.img + ')"' : '';
            return '<button type="button" class="' + cls + '"' + style + ' data-browse-cat="' + c.id + '">' +
              (c.img ? '<span style="position:absolute;inset:0;z-index:-1;background:url(' + c.img + ') center/cover;filter:brightness(.52);"></span>' : '') +
              '<strong>' + escapeHtml(c.label) + '</strong>' +
              '<span>Ontdekken</span></button>';
          }).join('') +
        '</div>' +
        '<p class="lab-hint" style="margin-top:18px;margin-bottom:8px;">Of bekijk per provincie</p>' +
        '<div class="lab-prov">' +
          PROVINCES.map(function (p) {
            return '<button type="button" class="' + (state.provinceBrowse === p ? 'is-active' : '') + '" data-browse-prov="' + escapeHtml(p) + '">' + escapeHtml(p) + '</button>';
          }).join('') +
        '</div>' +
      '</div></section>' +

      '<section class="lab-featured"><div class="lab-wrap">' +
        '<div class="lab-featured-head">' +
          '<div><h2>Vakbedrijven om te ontdekken</h2><p class="lab-hint">Fictieve demo-dakbedrijven. Geen zoekopdracht nodig.</p></div>' +
          '<button type="button" class="lab-link" id="seeAllResults">Alle resultaten <svg class="icon"><use href="#i-arrow"></use></svg></button>' +
        '</div>' +
        '<div class="lab-feature-rail">' + featured.map(function (c) { return renderCompanyRow(c, true); }).join('') + '</div>' +
      '</div></section>'
    );
  }

  function renderDiscoverResults() {
    var list = filteredCompanies();
    var empty = '';
    if (!list.length) {
      empty = '<div class="lab-empty">Geen resultaten voor deze filters. Pas timing, type werk of regio aan.</div>';
    }

    return (
      '<div class="lab-wrap lab-results">' +
        '<button type="button" class="lab-link" id="backToLanding" style="margin-bottom:10px;">← Terug naar ontdekken</button>' +
        '<div class="lab-results-head">' +
          '<h1>' + escapeHtml(pluralLabel(state.category)) + ' rond ' + escapeHtml(state.location.name) + '</h1>' +
          '<p class="lab-hint">' + escapeHtml(state.location.postcode) + ' · ' + escapeHtml(state.location.province) +
            (state.subtype !== 'alle' ? ' · ' + escapeHtml(subtypeLabel(state.category, state.subtype)) : '') +
            ' · Fictieve demoresultaten' +
            (state.category !== 'dakwerken' ? ' · QA-seedprofiel' : '') + '</p>' +
        '</div>' +
        '<div class="lab-mobile-filters"><button type="button" class="btn btn-ghost btn-sm" id="toggleFilters">Filters</button></div>' +
        '<div class="lab-results-layout">' +
          '<aside class="lab-filters lab-filters-desktop" id="filtersPanel">' + renderFiltersMarkup(false) + '</aside>' +
          '<div>' +
            '<div class="lab-toolbar">' +
              '<p><strong>' + list.length + '</strong> passende vakmannen</p>' +
              '<select id="filterSort">' +
                '<option value="aanbevolen"' + (state.sort === 'aanbevolen' ? ' selected' : '') + '>Aanbevolen</option>' +
                '<option value="beschikbaar"' + (state.sort === 'beschikbaar' ? ' selected' : '') + '>Eerst beschikbaar</option>' +
                '<option value="prijs"' + (state.sort === 'prijs' ? ' selected' : '') + '>Prijsniveau</option>' +
                '<option value="google"' + (state.sort === 'google' ? ' selected' : '') + '>Google-beoordeling</option>' +
              '</select>' +
            '</div>' +
            empty +
            '<div class="lab-list">' + list.map(function (c) { return renderCompanyRow(c); }).join('') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderDiscover() {
    var host = $('#view-discover');
    if (!host) return;
    host.innerHTML = state.showResults ? renderDiscoverResults() : renderDiscoverLanding();
  }

  /* ========== PROFILE ========== */
  function renderProfile() {
    var host = $('#view-profile');
    if (!host) return;
    var c = companyById(state.activeCompanyId);
    var price = serviceForContext(c, state.subtype);
    var match = timingMatchInfo(c);

    host.innerHTML =
      '<div class="lab-wrap lab-profile">' +
        '<button type="button" class="lab-link" data-lab-view-jump="discover" style="margin-bottom:8px;">← Terug naar resultaten</button>' +

        '<header class="lab-identity">' +
          '<div class="lab-identity-visual"><img src="' + c.image + '" alt="" style="object-position:' + c.objectPos + '"></div>' +
          '<div>' +
            '<p class="lab-kicker">ELYAN vakman</p>' +
            '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span>' +
              (c.demo ? '<span class="lab-chip is-warm">Demo QA</span>' : '') +
            '</div>' +
            '<h1>' + escapeHtml(c.name) + '</h1>' +
            starsHtml(c.google.rating, c.google.count) +
            (state.customerNotices.length
              ? '<p class="lab-toast" style="display:block;margin-top:10px;">' + escapeHtml(state.customerNotices[state.customerNotices.length - 1]) + '</p>'
              : '') +
          '</div>' +
          '<div class="lab-identity-actions">' +
            '<button type="button" class="btn btn-primary" data-open-quote="' + c.id + '">Offerte aanvragen</button>' +
          '</div>' +
        '</header>' +

        '<div class="lab-glance">' +
          '<div><span>Werkgebied</span><strong>' + escapeHtml(c.radius) + '</strong></div>' +
          '<div><span>Eerste mogelijke start</span><strong>' + escapeHtml(c.startMonth) + '</strong></div>' +
          '<div class="is-price"><span>Prijsindicatie</span><strong>' + escapeHtml(price ? price.display : 'Op aanvraag') + '</strong></div>' +
          '<div><span>Plaatsbezoek</span><strong>' + escapeHtml(c.visit.replace('Doorgaans ', '')) + '</strong></div>' +
        '</div>' +

        '<div class="lab-gallery">' +
          c.gallery.slice(0, 3).map(function (src) {
            return '<button type="button" data-lightbox="' + src + '"><img src="' + src + '" alt="Projectfoto" loading="lazy"></button>';
          }).join('') +
        '</div>' +

        '<div class="lab-profile-grid">' +
          '<div>' +
            '<section class="lab-section">' +
              '<h2>Over ' + escapeHtml(c.name) + '</h2>' +
              '<p>' + escapeHtml(c.about) + '</p>' +
            '</section>' +

            '<section class="lab-section">' +
              '<h2>Waar ze sterk in zijn</h2>' +
              '<div class="lab-strengths">' +
                c.strengths.map(function (s) { return '<span class="lab-strength">' + escapeHtml(s) + '</span>'; }).join('') +
              '</div>' +
            '</section>' +

            '<section class="lab-section">' +
              '<h2>Projecttiming</h2>' +
              '<div class="lab-timing-match">' +
                '<div><span>Jouw gewenste start</span><strong>' + escapeHtml(match.wish) + '</strong></div>' +
                '<div><span>Eerste mogelijkheid vakman</span><strong>' + escapeHtml(match.partner) + '</strong></div>' +
                '<div><span class="lab-match-pill' + (match.ok ? '' : ' is-warn') + '">' + (match.ok ? '✓ ' : '') + escapeHtml(match.label) + '</span></div>' +
              '</div>' +
            '</section>' +

            '<section class="lab-section">' +
              '<h2>Prijzen</h2>' +
              '<div class="lab-price-table">' +
                c.services.map(function (s) {
                  return '<div class="lab-price-row"><span>' + escapeHtml(s.label) + '</span><strong>' + escapeHtml(s.display) + '</strong></div>';
                }).join('') +
                '<div class="lab-price-row"><span>Minimum project</span><strong>' + escapeHtml(c.minProject) + '</strong></div>' +
              '</div>' +
              '<p class="lab-hint" style="margin-top:10px;">Prijzen zijn indicaties aangeleverd door het vakbedrijf. De uiteindelijke prijs hangt af van het concrete project en de offerte.</p>' +
            '</section>' +

            '<section class="lab-section">' +
              '<h2>Google-beoordelingen</h2>' +
              '<div class="lab-google">' +
                '<div class="lab-google-head">' +
                  '<div><div class="lab-google-score">' + escapeHtml(String(c.google.rating).replace('.', ',')) + ' / 5</div>' +
                  '<div class="lab-hint">' + escapeHtml(String(c.google.count)) + ' beoordelingen</div></div>' +
                  '<a class="btn btn-ghost btn-sm" href="' + escapeHtml(c.google.url) + '" target="_blank" rel="noopener noreferrer">Bekijk op Google</a>' +
                '</div>' +
                c.google.reviews.map(function (r) {
                  return '<div class="lab-review"><strong>' + escapeHtml(r.author) + '</strong>' + escapeHtml(r.text) + '</div>';
                }).join('') +
                '<p class="lab-attr">Beoordelingen via Google. ELYAN verzamelt geen eigen platformreviews. Demo-attributie.</p>' +
              '</div>' +
            '</section>' +

            ((c.publicFields && (c.publicFields.years || c.publicFields.teamSize))
              ? ('<section class="lab-section"><h2>Extra</h2><div class="lab-facts">' +
                  (c.publicFields.years ? fact('Jaren actief', c.years + ' jaar') : '') +
                  (c.publicFields.teamSize ? fact('Team', c.teamSize + ' personen') : '') +
                '</div></section>')
              : '') +
          '</div>' +

          '<aside class="lab-side-sticky">' +
            '<h3>Volgende stap</h3>' +
            '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag stap voor stap.</p>' +
            '<button type="button" class="btn btn-primary btn-block" data-open-quote="' + c.id + '">Offerte aanvragen</button>' +
          '</aside>' +
        '</div>' +
      '</div>';
  }

  /* ========== QUOTE FLOW (CustomerRequestEngine) ========== */
  function renderQuote() {
    var host = $('#view-quote');
    if (!host) return;
    var q = state.quote;
    var partner = companyById(q.partnerIds[0]);
    var catId = q.category || partner.category || 'dakwerken';
    var steps = quoteStepsFor(catId);
    var progress = steps.map(function (_, i) {
      return '<span class="' + (i < q.step ? 'is-done' : (i === q.step ? 'is-current' : '')) + '"></span>';
    }).join('');
    var services = RE ? RE.getServiceOptions(catId) : tax(catId).subtypes;
    var detailQs = RE ? RE.getDetailQuestions(catId) : [];
    var match = ME ? ME.evaluate(partner, {
      category: catId,
      service: q.service || q.workType,
      timing: q.timing,
      budgetMax: q.hasBudget === 'ja' ? Number(q.budgetTo || 0) : null
    }) : null;

    if (q.sent) {
      host.innerHTML =
        '<div class="lab-quote"><div class="lab-quote-shell"><div class="lab-success">' +
          '<div class="mark"><svg class="icon"><use href="#i-check"></use></svg></div>' +
          '<p class="lab-kicker">Aanvraag verzonden</p>' +
          '<h1>Je aanvraag is doorgestuurd.</h1>' +
          '<p class="lab-hint">' + escapeHtml(partner.name) + ' heeft je projectgegevens ontvangen. Je krijgt bericht zodra er een reactie is.</p>' +
          (match ? '<p class="lab-hint" style="margin-top:8px;">Matching: ' + escapeHtml(match.label) + '</p>' : '') +
          '<p class="lab-hint" style="margin-top:10px;">Demo: er werd niets echt verzonden.</p>' +
          '<div class="lab-quote-actions" style="justify-content:center;">' +
            '<button type="button" class="btn btn-primary" data-open-profile="' + partner.id + '">Terug naar profiel</button>' +
            '<button type="button" class="btn btn-ghost" data-lab-view-jump="discover">Verder ontdekken</button>' +
          '</div>' +
        '</div></div></div>';
      return;
    }

    var body = '';
    var stepId = (RE && RE.getSteps(catId)[q.step]) ? RE.getSteps(catId)[q.step].id : String(q.step);

    if (stepId === 'service' || q.step === 0) {
      body = '<h1>Wat wil je laten uitvoeren?</h1><p class="step-lead">Kies het type werk dat het best past bij ' + escapeHtml(catLabel(catId)) + '.</p><div class="lab-choice-grid is-2">' +
        services.map(function (s) {
          var sid = s.id;
          return '<button type="button" class="lab-choice' + ((q.service || q.workType) === sid ? ' is-selected' : '') + '" data-quote-set="service" data-val="' + sid + '">' + escapeHtml(s.label) + '</button>';
        }).join('') + '</div>';
    } else if (stepId === 'details') {
      body = '<h1>Projectdetails</h1><p class="step-lead">Weet je iets niet zeker? Kies “Ik weet het niet”.</p>' +
        renderQuestionBlock(detailQs, q.answers, 'quote');
    } else if (stepId === 'timing') {
      body = '<h1>Wanneer wil je starten?</h1><p class="step-lead">Zo kunnen we timing afstemmen op de vakman.</p><div class="lab-choice-grid is-2">' +
        [['asap', 'Zo snel mogelijk'], ['1m', 'Binnen 1 maand'], ['3m', 'Binnen 3 maanden'], ['6m', 'Binnen 6 maanden'], ['flex', 'Flexibel']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.timing === o[0] ? ' is-selected' : '') + '" data-quote-set="timing" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        selectField('Gewenste periode (optioneel)', 'timingMonth', q.timingMonth, [''].concat(START_MONTH_OPTIONS)).replace('data-onboard-field', 'data-quote-field');
    } else if (stepId === 'photos') {
      body = '<h1>Projectfoto’s</h1><p class="step-lead">Optioneel. Demo: kies hoeveel foto’s je zou toevoegen.</p><div class="lab-choice-grid is-3">' +
        [0, 1, 2, 3].map(function (n) {
          return '<button type="button" class="lab-choice' + (q.photos === n ? ' is-selected' : '') + '" data-quote-set="photos" data-val="' + n + '">' + (n === 0 ? 'Geen foto’s' : n + ' foto’s') + '</button>';
        }).join('') + '</div>';
    } else if (stepId === 'budget') {
      body = '<h1>Heb je al een budget in gedachten?</h1><p class="step-lead">Optioneel. Geen druk, wel nuttig voor matching.</p><div class="lab-choice-grid is-2">' +
        [['nee', 'Nee'], ['ja', 'Ja']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.hasBudget === o[0] ? ' is-selected' : '') + '" data-quote-set="hasBudget" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        (q.hasBudget === 'ja'
          ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">' +
            '<label class="lab-field">Van (€)<input data-quote-field="budgetFrom" type="number" value="' + escapeHtml(q.budgetFrom) + '"></label>' +
            '<label class="lab-field">Tot (€)<input data-quote-field="budgetTo" type="number" value="' + escapeHtml(q.budgetTo) + '"></label></div>'
          : '');
    } else if (stepId === 'contact') {
      body = '<h1>Jouw gegevens</h1><p class="step-lead">Zodat de vakman je kan bereiken.</p>' +
        '<label class="lab-field">Naam<input data-quote-field="name" value="' + escapeHtml(q.name) + '" placeholder="Voor- en achternaam"></label>' +
        '<label class="lab-field">E-mail<input data-quote-field="email" type="email" value="' + escapeHtml(q.email) + '" placeholder="naam@email.be"></label>' +
        '<label class="lab-field">Telefoon<input data-quote-field="phone" value="' + escapeHtml(q.phone) + '" placeholder="+32 …"></label>' +
        '<label class="lab-field">Projectlocatie<input data-quote-field="address" value="' + escapeHtml(q.address) + '" placeholder="Gemeente"></label>';
    } else {
      var answerSummary = Object.keys(q.answers || {}).map(function (k) {
        var v = q.answers[k];
        if (Array.isArray(v)) v = v.join(', ');
        return '<div class="lab-summary-row"><span>' + escapeHtml(k) + '</span><strong>' + escapeHtml(String(v || '—')) + '</strong></div>';
      }).join('');
      body = '<h1>Jouw aanvraag</h1><p class="step-lead">Controleer kort vóór verzenden.</p>' +
        '<div class="lab-summary">' +
          '<div class="lab-summary-row"><span>Categorie</span><strong>' + escapeHtml(catLabel(catId)) + '</strong></div>' +
          '<div class="lab-summary-row"><span>Werk</span><strong>' + escapeHtml(subtypeLabel(catId, q.service || q.workType)) + '</strong></div>' +
          answerSummary +
          '<div class="lab-summary-row"><span>Locatie</span><strong>' + escapeHtml(q.address || '—') + '</strong></div>' +
          '<div class="lab-summary-row"><span>Start</span><strong>' + escapeHtml(q.timingMonth || customerTimingWishLabel()) + '</strong></div>' +
          '<div class="lab-summary-row"><span>Foto’s</span><strong>' + q.photos + '</strong></div>' +
          '<div class="lab-summary-row"><span>Naar</span><strong>' + escapeHtml(partner.name) + '</strong></div>' +
          (match ? '<div class="lab-summary-row"><span>Matching</span><strong>' + escapeHtml(match.label) + '</strong></div>' : '') +
        '</div>';
    }

    host.innerHTML =
      '<div class="lab-quote"><div class="lab-quote-shell">' +
        '<button type="button" class="lab-link" data-open-profile="' + partner.id + '" style="margin-bottom:12px;">← Terug naar profiel</button>' +
        '<div class="lab-quote-progress">' + progress + '</div>' +
        '<p class="lab-kicker">Offerteaanvraag · ' + escapeHtml(partner.name) + ' · ' + escapeHtml(catLabel(catId)) + '</p>' +
        '<div class="lab-quote-card">' + body +
          '<div class="lab-quote-actions">' +
            (q.step > 0 ? '<button type="button" class="btn btn-ghost" id="quoteBack">Terug</button>' : '') +
            '<button type="button" class="btn btn-primary" id="quoteNext">' +
              (q.step >= steps.length - 1 ? 'Aanvraag versturen' : 'Verder') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  /* ========== PARTNER ONBOARDING (PartnerOnboardingEngine) ========== */
  function renderOnboarding() {
    var step = state.onboardStep;
    var o = state.onboard;
    var cat = o.primaryCategory || '';
    var t = cat ? tax(cat) : null;
    var progress = ONBOARD_STEPS.map(function (_, i) {
      return '<span class="' + (i < step ? 'is-done' : (i === step ? 'is-current' : '')) + '"></span>';
    }).join('');
    var stepId = (OE && OE.steps[step]) ? OE.steps[step].id : String(step);
    var body = '';
    var conditionals = (OE && cat) ? OE.getConditionalsForSelected(cat, o.subtypes || []) : [];
    var extras = (OE && cat) ? OE.getOnboardExtras(cat) : [];

    if (stepId === 'bedrijf') {
      body = '<h1>Bedrijfsgegevens</h1><p class="step-lead">Basisinfo. Geen vrij tekstveld “beschrijf je bedrijf”.</p>' +
        field('Officiële bedrijfsnaam', 'companyName', o.companyName, 'text', 'Bv. BV Dakwerken Voorbeeld') +
        field('Handelsnaam (indien anders)', 'tradeName', o.tradeName, 'text', 'Optioneel') +
        field('Ondernemingsnummer', 'vat', o.vat, 'text', 'BE 0XXX.XXX.XXX') +
        field('Btw-nummer (indien afwijkend)', 'btw', o.btw, 'text', 'Optioneel') +
        field('Website', 'website', o.website, 'url', 'https://') +
        field('Zakelijk e-mailadres', 'email', o.email, 'email', 'info@bedrijf.be') +
        field('Telefoon', 'phone', o.phone, 'tel', '+32 …') +
        field('Contactpersoon', 'contact', o.contact, 'text', 'Voornaam Achternaam') +
        field('Rol / functie contactpersoon', 'contactRole', o.contactRole, 'text', 'Zaakvoerder, projectleider…');
    } else if (stepId === 'werkgebied') {
      body = '<h1>Werkgebied</h1><p class="step-lead">Structuur voor matching. Publiek tonen we een eenvoudige tekst.</p>' +
        field('Vestigingsgemeente / postcode', 'address', o.address, 'text', 'Typ een gemeente…') +
        '<p class="lab-hint" style="margin:12px 0 8px;">Hoe werken jullie het werkgebied?</p><div class="lab-choice-grid is-2">' +
        AREA_MODES.map(function (m) {
          return '<button type="button" class="lab-choice' + (o.areaMode === m.id ? ' is-selected' : '') + '" data-set-extra="areaMode" data-extra-val="' + m.id + '">' + escapeHtml(m.label) + '</button>';
        }).join('') + '</div>' +
        field(o.areaMode === 'radius' ? 'Radius (publieke tekst)' : 'Werkgebied (publieke tekst)', 'area', o.area, 'text',
          o.areaMode === 'flanders' ? 'Heel Vlaanderen' : 'Bv. Antwerpen + 25 km') +
        field('Uitsluitingsgebieden (optioneel)', 'areaExclude', o.areaExclude, 'text', 'Bv. kustgemeenten');
    } else if (stepId === 'categorie') {
      body = '<h1>Hoofdcategorie</h1><p class="step-lead">Eén primaire categorie. Alle vervolgvragen volgen hieruit.</p><div class="lab-choice-grid is-3">' +
        CATEGORIES.map(function (c) {
          return '<button type="button" class="lab-choice' + (cat === c.id ? ' is-selected' : '') + '" data-primary-cat="' + c.id + '">' + escapeHtml(c.label) + '</button>';
        }).join('') + '</div>';
    } else if (stepId === 'diensten') {
      if (!cat) {
        body = '<h1>Diensten</h1><p class="lab-hint">Kies eerst een hoofdcategorie.</p>';
      } else {
        body = '<h1>Welke werken voeren jullie uit?</h1><p class="step-lead">' + escapeHtml(t.label) + ': selecteer wat jullie effectief doen.</p><div class="lab-choice-grid is-2">' +
          t.subtypes.map(function (s) {
            return choiceMulti(o.subtypes, s.id, s.label + (s.sharedId ? ' · shared' : ''), 'data-toggle-subtype');
          }).join('') + '</div>' +
          (conditionals.length ? '<h2 style="font-size:1rem;margin:18px 0 8px;">Verfijning</h2>' + renderQuestionBlock(conditionals, o.conditionalAnswers, 'onboard') : '');
      }
    } else if (stepId === 'voorkeuren') {
      if (!cat) {
        body = '<h1>Projectvoorkeuren</h1><p class="lab-hint">Kies eerst een hoofdcategorie.</p>';
      } else {
        body = '<h1>Projectvoorkeuren</h1><p class="step-lead">Categorie-specifieke vragen. Geen generiek “type werk” voor alles.</p>' +
          renderQuestionBlock(extras, o, 'onboard');
      }
    } else if (stepId === 'prijzen') {
      var priceServices = (OE && cat) ? OE.getServices(cat).filter(function (s) { return (o.subtypes || []).indexOf(s.id) >= 0; }) : [];
      if (!priceServices.length && t) priceServices = t.subtypes.slice(0, 3).map(function (s) { return { id: s.id, label: s.label, pricingModels: ['price_range', 'on_request'] }; });
      body = '<h1>Prijzen</h1><p class="step-lead">Model per dienst. Lege velden = later of op aanvraag.</p>' +
        priceServices.map(function (s) {
          var models = (PE ? PE.modelsForService(cat, s.id) : (s.pricingModels || ['on_request']));
          return '<div class="lab-price-card" style="margin-bottom:10px;">' +
            '<h3 style="margin:0 0 8px;font-size:.95rem;">' + escapeHtml(s.label) + '</h3>' +
            '<p class="lab-hint">Modellen: ' + escapeHtml(models.map(function (m) { return PE ? PE.labelFor(m) : m; }).join(' · ')) + '</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
            field('Min (€)', 'price_' + s.id + '_min', (o.prices && o.prices[s.id] && o.prices[s.id].min) || '', 'number', 'optioneel') +
            field('Max (€)', 'price_' + s.id + '_max', (o.prices && o.prices[s.id] && o.prices[s.id].max) || '', 'number', 'optioneel') +
            '</div></div>';
        }).join('') +
        field('Projectminimum (€)', 'minProject', o.minProject, 'number', 'Optioneel') +
        field('Btw-basis', 'vatBasis', o.vatBasis, 'text', 'Exclusief / Inclusief');
    } else if (stepId === 'beschikbaarheid') {
      body = '<h1>Beschikbaarheid</h1><p class="step-lead">Gestructureerd. Klanten zien geen “volzet”-filter.</p><div class="lab-seg">' +
        CAPACITY_OPTS.map(function (m) {
          return '<button type="button" class="' + (o.capacity === m.label ? 'is-active' : '') + '" data-capacity="' + escapeHtml(m.label) + '">' + escapeHtml(m.label) + '</button>';
        }).join('') + '</div>' +
        selectField('Eerste mogelijke start', 'startMonth', o.startMonth, [{ id: '', label: 'Kies maand…' }].concat(START_MONTH_OPTIONS.map(function (m) { return { id: m, label: m }; }))) +
        '<p class="lab-hint" style="margin:12px 0 8px;">Plaatsbezoek</p><div class="lab-choice-grid is-2">' +
        VISIT_OPTS.map(function (v) {
          return '<button type="button" class="lab-choice' + (o.visitSpeed === v.id ? ' is-selected' : '') + '" data-set-extra="visitSpeed" data-extra-val="' + v.id + '">' + escapeHtml(v.label) + '</button>';
        }).join('') + '</div>' +
        (cat === 'keuken' || cat === 'ramen-deuren' || cat === 'badkamer' || cat === 'dakwerken'
          ? '<p class="lab-hint" style="margin:12px 0 8px;">Extra afspraken indien relevant</p><div class="lab-choice-grid is-2">' +
            ['Technisch bezoek', 'Opmeting', 'Ontwerpgesprek', 'Onderhoudsafspraak'].map(function (x) {
              return choiceMulti(o.visitExtra || [], x, x, 'data-toggle-visit-extra');
            }).join('') + '</div>'
          : '');
    } else if (stepId === 'eigenheid') {
      body = '<h1>Bedrijfseigenheid</h1><p class="step-lead">Velden starten leeg. Alleen placeholders. ELYAN maakt hier later profielcopy van.</p>' +
        IDENTITY_QS.map(function (qq) {
          if (qq.type === 'select') {
            return selectField(qq.label, qq.key, o[qq.key] || '', [{ id: '', label: 'Kies…' }].concat((qq.options || []).map(function (x) { return { id: x, label: x }; })));
          }
          return field(qq.label, qq.key, o[qq.key] || '', 'text', qq.placeholder || '');
        }).join('');
    } else if (stepId === 'fotos') {
      body = '<h1>Projectfoto’s</h1><p class="step-lead">Eigen realisaties. ELYAN controleert beelden vóór publicatie.</p>' +
        '<div class="lab-photo-sm"><img src="' + IMAGES.hero + '" alt=""><div><strong>Voorbeeldslot</strong><br><span class="lab-chip">Nog geen foto’s geüpload</span></div></div>' +
        '<p class="lab-hint">Demo: upload volgt later. Statussen: concept → ingediend → ter controle → goedgekeurd.</p>';
    } else if (stepId === 'google') {
      body = '<h1>Google Reviews</h1><p class="step-lead">Centrale module. Geen eigen ELYAN-sterren.</p>' +
        '<p class="lab-hint">Heeft jullie bedrijf een Google Bedrijfsprofiel?</p><div class="lab-seg">' +
        ['Ja', 'Nee', 'Niet zeker'].map(function (m) {
          return '<button type="button" class="' + (o.hasGoogle === m ? 'is-active' : '') + '" data-set-extra="hasGoogle" data-extra-val="' + m + '">' + m + '</button>';
        }).join('') + '</div>' +
        (o.hasGoogle === 'Ja'
          ? field('Google bedrijfsvermelding (zoek / koppel)', 'googleQuery', o.googleQuery, 'text', 'Bedrijfsnaam op Google') +
            field('Google Place ID (klaarzetten)', 'googlePlaceId', o.googlePlaceId, 'text', 'demo_place_…') +
            '<label class="lab-field" style="flex-direction:row;align-items:center;gap:10px;">' +
            '<input type="checkbox" id="googleConsent"' + (o.googleConsent ? ' checked' : '') + '>' +
            '<span style="font-weight:500;">Ik geef toestemming om Google-beoordelingen bij ons openbare ELYAN-profiel weer te geven.</span></label>'
          : '<p class="lab-hint">Geen probleem. Je profiel kan zonder Google-reviews live.</p>');
    } else {
      var visitPub = '';
      VISIT_OPTS.forEach(function (v) { if (v.id === o.visitSpeed) visitPub = v.public; });
      body = '<h1>Controle vóór indiening</h1><p class="step-lead">Gestructureerde data. ELYAN maakt hier je presentatie van.</p><div class="lab-facts">' +
        fact('Bedrijf', o.companyName || '—') +
        fact('Categorie', cat ? catLabel(cat) : '—') +
        fact('Diensten', (o.subtypes || []).map(function (id) { return subtypeLabel(cat, id); }).join(', ') || 'Nog niet gekozen') +
        fact('Werkgebied', o.area || o.address || '—') +
        fact('Start', (o.capacity || '—') + ' · ' + (o.startMonth || '—')) +
        fact('Plaatsbezoek', visitPub || o.visitSpeed || '—') +
        fact('Google', o.hasGoogle === 'Ja' ? ((o.googleQuery || 'gekoppeld') + (o.googleConsent ? ' · toestemming' : ' · geen toestemming')) : (o.hasGoogle || '—')) +
        '</div>' +
        '<p class="lab-hint" style="margin-top:12px;">Na indienen: Bedankt · ELYAN bereidt je profiel voor.</p>';
    }

    return '<div class="lab-onboard"><div class="lab-onboard-progress">' + progress + '</div>' +
      '<p class="lab-kicker">Stap ' + String(step + 1).padStart(2, '0') + ' · ' + escapeHtml(ONBOARD_STEPS[step] || '') + '</p>' + body +
      '<div class="lab-onboard-actions">' +
      (step > 0 ? '<button type="button" class="btn btn-ghost" id="onboardBack">Terug</button>' : '') +
      '<button type="button" class="btn btn-primary" id="onboardNext">' + (step === ONBOARD_STEPS.length - 1 ? 'Indienen bij ELYAN' : 'Verder') + '</button>' +
      '</div></div>';
  }

  function renderPartnerDashboard() {
    var nav = [
      ['overzicht', 'Overzicht'], ['aanvragen', 'Aanvragen'], ['beschikbaarheid', 'Beschikbaarheid'],
      ['prijzen', 'Prijzen'], ['fotos', 'Projectfoto’s'], ['profiel', 'Mijn profiel']
    ].map(function (n) {
      return '<button type="button" class="' + (state.partnerPanel === n[0] ? 'is-active' : '') + '" data-partner-panel="' + n[0] + '">' + n[1] + '</button>';
    }).join('');

    var panel = '';
    if (state.partnerPanel === 'overzicht') {
      panel =
        '<div class="lab-kpi-row">' +
          '<div class="lab-kpi"><span>Nieuwe aanvragen</span><strong>2</strong></div>' +
          '<div class="lab-kpi"><span>Actie vereist</span><strong>1</strong></div>' +
          '<div class="lab-kpi"><span>Profiel</span><strong>Live</strong></div>' +
          '<div class="lab-kpi"><span>Eerste start</span><strong>' + escapeHtml(state.onboard.startMonth) + '</strong></div>' +
        '</div>' +
        '<h2 style="font-size:1.05rem;margin:0 0 10px;">Wat vraagt vandaag aandacht?</h2>' +
        '<article class="lab-action"><div><h3>Nieuwe aanvraag · Volledige dakrenovatie</h3><p>Antwerpen · ±120 m² · November 2026 · Timing past</p></div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-partner-panel="aanvragen">Bekijk</button></article>' +
        '<article class="lab-action"><div><h3>Projectfoto nog niet ingediend</h3><p>Detail nokafwerking · Concept</p></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-partner-panel="fotos">Afwerken</button></article>';
    } else if (state.partnerPanel === 'aanvragen') {
      panel = '<div class="lab-inbox">' + state.requests.map(function (r) {
        return (
          '<article class="lab-inbox-row">' +
            '<div><strong>' + escapeHtml(r.title) + '</strong><br><span class="lab-hint">' + escapeHtml(r.location) + ' · ' + escapeHtml(r.size) + ' · ' + escapeHtml(r.roof) + '</span></div>' +
            '<span>Gewenste start: ' + escapeHtml(r.customerWish) + '<br><span class="lab-hint">' + escapeHtml(r.timingFit) + '</span></span>' +
            '<span class="lab-chip' + (r.status === 'interested' || r.status === 'interessant' ? ' is-ok' : (r.status === 'nieuw' || r.status === 'new' ? ' is-warm' : ' is-muted')) + '">' + escapeHtml(r.status) + '</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-toggle-req="' + r.id + '">Bekijk</button>' +
            '<div class="lab-request-detail" id="req-' + r.id + '" hidden style="grid-column:1/-1;">' +
              '<p class="lab-hint" style="margin-bottom:8px;">Klant vraagt: ' + escapeHtml(r.wishes) + (r.photos ? ' · ' + r.photos + ' projectfoto’s' : '') + '</p>' +
              (r.status === 'interested' ? '<p class="lab-toast" style="display:block;margin-bottom:10px;">Interesse vastgelegd. Klant ziet: “Deze vakman heeft interesse.”</p>' : '') +
              (r.status === 'declined' ? '<p class="lab-hint" style="margin-bottom:10px;">Afgewezen · ' + escapeHtml(r.declineReason || '') + '</p>' : '') +
              '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
                '<button type="button" class="btn btn-primary btn-sm" data-req-interest="' + r.id + '">Ik heb interesse</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-req-decline="' + r.id + '">Past niet bij ons</button>' +
              '</div>' +
              '<div class="lab-decline-options" id="decline-' + r.id + '" hidden style="margin-top:10px;">' +
                '<p class="lab-hint" style="margin-bottom:8px;">Reden van afwijzing</p>' +
                DECLINE_OPTS.map(function (x) {
                  return '<button type="button" class="lab-chip" data-decline-reason="' + r.id + '" data-reason-id="' + x.id + '">' + escapeHtml(x.label) + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('') + '</div>';
    } else if (state.partnerPanel === 'beschikbaarheid') {
      panel =
        '<div class="lab-avail">' +
          '<div class="lab-avail-now">' + escapeHtml(state.onboard.capacity) + '</div>' +
          field('Eerst mogelijke startmaand', 'startMonth', state.onboard.startMonth) +
          field('Plaatsbezoeken', 'visitSpeed', state.onboard.visitSpeed) +
          '<div class="lab-seg">' +
            ['Nieuwe projecten mogelijk', 'Beperkt beschikbaar', 'Momenteel volzet'].map(function (m) {
              return '<button type="button" class="' + (state.onboard.capacity === m ? 'is-active' : '') + '" data-capacity="' + escapeHtml(m) + '">' + escapeHtml(m) + '</button>';
            }).join('') +
          '</div>' +
          '<button type="button" class="btn btn-primary" id="savePartnerAvail">Opslaan</button>' +
          '<p class="lab-toast" id="partnerAvailToast" hidden>Opgeslagen in deze labsessie.</p>' +
        '</div>';
    } else if (state.partnerPanel === 'prijzen') {
      panel =
        '<div class="lab-price-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><h3>Volledige dakrenovatie</h3><span class="lab-status-dot is-live">Live</span></div>' +
          '<p><strong>€' + escapeHtml(state.onboard.priceFrom) + ' – €' + escapeHtml(state.onboard.priceTo) + ' / m²</strong></p></div>' +
        '<div class="lab-price-card"><div style="display:flex;justify-content:space-between;gap:8px;"><h3>Dakisolatie</h3><span class="lab-status-dot is-live">Live</span></div>' +
          '<p><strong>€' + escapeHtml(state.onboard.isolFrom) + ' – €' + escapeHtml(state.onboard.isolTo) + ' / m²</strong></p></div>' +
        '<div class="lab-price-card"><div style="display:flex;justify-content:space-between;gap:8px;"><h3>Kleine herstelling</h3><span class="lab-status-dot is-pending">Wordt gecontroleerd</span></div>' +
          '<p><strong>Vanaf €' + escapeHtml(state.onboard.repairFrom) + '</strong></p>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="editPriceBtn">Prijs aanpassen</button>' +
          '<div id="priceEditBox" hidden style="margin-top:12px;">' +
            field('Renovatie van', 'priceFrom', state.onboard.priceFrom, 'number') +
            field('Renovatie tot', 'priceTo', state.onboard.priceTo, 'number') +
            '<button type="button" class="btn btn-primary btn-sm" id="submitPriceChange">Wijziging indienen</button>' +
            '<p class="lab-toast" id="priceChangeToast" hidden>Wijziging wordt door ELYAN gecontroleerd.</p>' +
          '</div></div>';
    } else if (state.partnerPanel === 'fotos') {
      panel = state.photos.map(function (ph) {
        return (
          '<div class="lab-photo-sm"><img src="' + ph.img + '" alt=""><div><strong>' + escapeHtml(ph.title) + '</strong>' +
            '<div class="lab-row-badges" style="margin-top:6px;">' +
              '<span class="lab-chip">Partner: ' + escapeHtml(ph.partner) + '</span>' +
              '<span class="lab-chip is-ok">ELYAN: ' + escapeHtml(ph.elyan) + '</span></div>' +
            (ph.partner === 'Concept' ? '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" data-submit-photo="' + ph.id + '">Indienen</button>' : '') +
          '</div></div>'
        );
      }).join('');
    } else {
      var c = companyById('atelier-dak');
      panel =
        '<div class="lab-preview">' +
          '<img src="' + c.image + '" alt="">' +
          '<div>' +
            '<p class="lab-hint" style="margin-bottom:8px;">Publieke preview. Layout bepaalt ELYAN.</p>' +
            '<h3 style="margin:0 0 6px;">' + escapeHtml(state.onboard.companyName) + '</h3>' +
            '<p class="lab-hint">' + escapeHtml(c.specialtyLine) + '</p>' +
            '<p class="lab-hint" style="margin-top:8px;">' + escapeHtml(state.onboard.area) + '</p>' +
            '<div class="lab-row-badges" style="margin-top:10px;">' +
              '<span class="lab-chip is-ok">Live</span>' +
              '<span class="lab-chip is-warm">1 wijziging ter controle</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return (
      '<div class="lab-partner lab-wrap">' +
        '<div class="lab-partner-head">' +
          '<div><p class="lab-kicker">Partneromgeving</p><h1>' + escapeHtml(state.onboard.companyName || 'Atelier Dak Antwerpen') + '</h1></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="resetOnboarding">Onboarding bekijken</button>' +
        '</div>' +
        '<div class="lab-partner-layout">' +
          '<nav class="lab-partner-nav">' + nav + '</nav>' +
          '<div class="lab-partner-main">' + panel + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPartner() {
    var host = $('#view-partner');
    if (!host) return;
    if (state.partnerMode === 'submitted') {
      host.innerHTML = '<div class="lab-wrap"><div class="lab-submitted">' +
        '<p class="lab-kicker" style="font-size:1rem;letter-spacing:.08em;font-weight:700;">BEDANKT</p>' +
        '<h1 style="font-size:clamp(1.45rem,3vw,1.9rem);">ELYAN bereidt je profiel voor.</h1>' +
        '<p class="lab-hint" style="font-size:1.02rem;margin:12px 0;">We structureren je antwoorden tot een consistente presentatie. Daarna kun je een preview bekijken.</p>' +
        '<div class="lab-status-flow">' +
          ['Ingediend', 'Wordt gecontroleerd', 'Profiel wordt voorbereid', 'Klaar voor publicatie', 'Gepubliceerd'].map(function (s) {
            return '<span class="' + (s === state.partnerStatus ? 'is-current' : '') + '">' + s + '</span>';
          }).join('') +
        '</div><button type="button" class="btn btn-primary" id="goPartnerDash">Naar overzicht</button></div></div>';
      return;
    }
    if (state.partnerMode === 'dashboard') {
      host.innerHTML = renderPartnerDashboard();
      return;
    }
    host.innerHTML = '<div class="lab-wrap lab-partner" style="padding-top:24px;">' + renderOnboarding() + '</div>';
  }

  function renderAdmin() {
    var host = $('#view-admin');
    if (!host) return;
    host.innerHTML =
      '<section class="lab-admin-top"><div class="lab-wrap">' +
        '<p class="lab-kicker" style="color:rgba(255,255,255,.6);">ELYAN Admin · Decision queue</p>' +
        '<h1>Wat vereist vandaag een beslissing?</h1>' +
        '<p>Snelle operationele inbox. Later: aparte Admin Partners en Admin Klanten.</p>' +
      '</div></section>' +
      '<div class="lab-wrap">' +
        '<div class="lab-admin-kpis">' +
          '<div class="lab-admin-kpi"><strong>4</strong><span>partners te beoordelen</span></div>' +
          '<div class="lab-admin-kpi"><strong>7</strong><span>wijzigingen</span></div>' +
          '<div class="lab-admin-kpi"><strong>3</strong><span>nieuwe foto’s</span></div>' +
          '<div class="lab-admin-kpi"><strong>12</strong><span>open aanvragen</span></div>' +
        '</div>' +
        '<div class="lab-decision-board">' +
          '<h2>Te beoordelen</h2>' +
          '<article class="lab-decision"><div><h3>Atelier Dak Antwerpen</h3><p>Nieuwe partner · Profielwijziging</p></div>' +
            '<div class="lab-decision-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="review-partner">Bekijken</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-admin="approve-partner">Goedkeuren</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="reject-partner">Afwijzen</button>' +
            '</div></article>' +
          '<article class="lab-decision"><div><h3>Prijswijziging · Atelier Dak</h3><p>' + escapeHtml(state.priceChange.current) + ' → ' + escapeHtml(state.priceChange.proposed) + '</p></div>' +
            '<div class="lab-decision-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="ask-price">Bekijken</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-admin="approve-price">Goedkeuren</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="reject-price">Afwijzen</button>' +
            '</div></article>' +
          '<article class="lab-decision"><div style="display:flex;align-items:center;"><img src="' + IMAGES.hero + '" alt=""><div><h3>Hellend dak Berchem</h3><p>Nieuwe projectfoto</p></div></div>' +
            '<div class="lab-decision-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="photo-view">Bekijken</button>' +
              '<button type="button" class="btn btn-primary btn-sm" data-admin="photo-ok">Goedkeuren</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-admin="photo-reject">Afwijzen</button>' +
            '</div></article>' +
          '<p class="lab-admin-note" id="adminToast"' + (state.adminNote ? '' : ' hidden') + '>' + escapeHtml(state.adminNote || '') + '</p>' +
        '</div>' +
        '<div class="lab-admin-arch">Architectuurvoorbereiding: <strong>Admin Partners</strong> (bedrijf, prijzen, historiek, notities) en <strong>Admin Klanten</strong> (aanvragen, status) blijven gescheiden van deze decision queue.</div>' +
        '<div class="lab-admin-arch" id="ciQaPanel" style="margin-top:14px;">' +
          '<strong>Category Intelligence QA</strong><br>' +
          (CI ? (
            'Versie ' + escapeHtml(CI.version) + ' · ' +
            Object.keys(CI.CATEGORIES).length + ' categorieën · ' +
            Object.keys(CI.SHARED_SERVICES).length + ' shared services<br>' +
            '<span class="lab-hint">' +
            CI.qaChecklist().map(function (row) {
              return row.id + ': ' + row.services + ' svc / ' + row.customerQ + ' klantvragen / shared[' + (row.shared.join(',') || '—') + ']';
            }).join(' · ') +
            '</span>'
          ) : 'Intelligence niet geladen') +
        '</div>' +
      '</div>';
  }

  function readOnboardFields(root) {
    if (!state.onboard.prices) state.onboard.prices = {};
    $all('[data-onboard-field]', root || document).forEach(function (input) {
      var key = input.getAttribute('data-onboard-field');
      var val = input.value;
      var priceMatch = key && key.match(/^price_(.+)_((min)|(max))$/);
      if (priceMatch) {
        var sid = priceMatch[1];
        if (!state.onboard.prices[sid]) state.onboard.prices[sid] = {};
        state.onboard.prices[sid][priceMatch[2]] = val;
        return;
      }
      if (state.onboard.conditionalAnswers && (key === 'hellendCovering' || key === 'platSystems')) {
        state.onboard.conditionalAnswers[key] = val;
        return;
      }
      state.onboard[key] = val;
    });
  }
  function readQuoteFields(root) {
    $all('[data-quote-field]', root || document).forEach(function (input) {
      state.quote[input.getAttribute('data-quote-field')] = input.value;
    });
    if (!state.quote.answers) state.quote.answers = {};
    $all('[data-quote-answer-field]', root || document).forEach(function (input) {
      state.quote.answers[input.getAttribute('data-quote-answer-field')] = input.value;
    });
  }

  function render() {
    if (state.view === 'discover') renderDiscover();
    if (state.view === 'profile') renderProfile();
    if (state.view === 'quote') renderQuote();
    if (state.view === 'partner') renderPartner();
    if (state.view === 'admin') renderAdmin();
    bindDynamic();
  }

  function bindFilterControls(root) {
    root = root || document;
    ['filterCategory', 'filterSubtype', 'filterTiming', 'filterPrice', 'filterSort'].forEach(function (id) {
      var el = root.querySelector ? root.querySelector('#' + id) : $('#' + id);
      if (!el) el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterCategory') { state.category = el.value; state.subtype = 'alle'; }
        if (id === 'filterSubtype') state.subtype = el.value;
        if (id === 'filterTiming') state.customerTiming = el.value;
        if (id === 'filterPrice') state.priceLevel = el.value;
        if (id === 'filterSort') state.sort = el.value;
        closeFiltersDrawer();
        state.showResults = true;
        render();
      });
    });
  }

  function updateLocSuggest() {
    var box = $('#locSuggest');
    var input = $('#locInput');
    if (!box || !input) return;
    var items = suggestLocations(input.value);
    state.locSuggestOpen = items.length > 0 && document.activeElement === input;
    if (!state.locSuggestOpen) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = items.map(function (l, i) {
      return '<button type="button" class="' + (i === state.locSuggestIndex ? 'is-active' : '') + '" data-pick-loc="' + i + '">' +
        '<strong>' + escapeHtml(l.name) + '</strong><em>' + escapeHtml(l.postcode) + ' · ' + escapeHtml(l.province) + '</em></button>';
    }).join('');
    box._items = items;
    $all('[data-pick-loc]', box).forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var item = items[Number(btn.getAttribute('data-pick-loc'))];
        state.location = item;
        state.locationQuery = item.name;
        input.value = item.name;
        box.hidden = true;
      });
    });
  }

  function bindDynamic() {
    var search = $('#discoverSearch');
    if (search) {
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        var nextCat = search.category.value;
        if (nextCat !== state.category) state.subtype = 'alle';
        state.category = nextCat;
        var q = ($('#locInput') || {}).value || state.location.name;
        var match = suggestLocations(q)[0];
        if (match) state.location = match;
        state.locationQuery = state.location.name;
        state.provinceBrowse = null;
        state.showResults = true;
        render();
      });
    }
    var locInput = $('#locInput');
    if (locInput) {
      locInput.addEventListener('input', function () {
        state.locationQuery = locInput.value;
        state.locSuggestIndex = -1;
        updateLocSuggest();
      });
      locInput.addEventListener('focus', updateLocSuggest);
      locInput.addEventListener('blur', function () {
        setTimeout(function () {
          var box = $('#locSuggest');
          if (box) box.hidden = true;
        }, 150);
      });
    }

    $all('[data-browse-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.category = btn.getAttribute('data-browse-cat');
        state.subtype = 'alle';
        state.provinceBrowse = null;
        state.showResults = true;
        render();
      });
    });
    $all('[data-browse-prov]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.provinceBrowse = btn.getAttribute('data-browse-prov');
        state.category = 'dakwerken';
        state.showResults = true;
        render();
      });
    });
    var seeAll = $('#seeAllResults');
    if (seeAll) seeAll.addEventListener('click', function () {
      state.category = 'dakwerken';
      state.showResults = true;
      render();
    });
    var back = $('#backToLanding');
    if (back) back.addEventListener('click', function () { state.showResults = false; state.provinceBrowse = null; render(); });
    var toggleFilters = $('#toggleFilters');
    if (toggleFilters) toggleFilters.addEventListener('click', openFiltersDrawer);

    bindFilterControls(document);

    $all('[data-open-profile]').forEach(function (btn) {
      btn.addEventListener('click', function () { openProfile(btn.getAttribute('data-open-profile')); });
    });
    $all('[data-open-quote]').forEach(function (btn) {
      btn.addEventListener('click', function () { openQuote(btn.getAttribute('data-open-quote')); });
    });
    $all('[data-lab-view-jump]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-lab-view-jump');
        if (v === 'discover') state.showResults = true;
        setView(v);
      });
    });
    $all('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () { openLightbox(btn.getAttribute('data-lightbox')); });
    });

    /* Quote */
    $all('[data-quote-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-quote-set');
        var val = btn.getAttribute('data-val');
        if (key === 'photos') state.quote.photos = Number(val);
        else if (key === 'service') {
          state.quote.service = val;
          state.quote.workType = val;
        } else state.quote[key] = val;
        if (key === 'timing' && val === '3m') state.quote.timingMonth = 'November 2026';
        if (key === 'timing' && val === 'asap') state.quote.timingMonth = 'Zo snel mogelijk';
        render();
      });
    });
    $all('[data-quote-answer-single]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.quote.answers) state.quote.answers = {};
        var key = btn.getAttribute('data-quote-answer-single');
        var val = btn.getAttribute('data-val');
        state.quote.answers[key] = val === '1' ? true : val;
        render();
      });
    });
    $all('[data-quote-answer-multi]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.quote.answers) state.quote.answers = {};
        var key = btn.getAttribute('data-quote-answer-multi');
        if (!Array.isArray(state.quote.answers[key])) state.quote.answers[key] = [];
        toggleArray(state.quote.answers[key], btn.getAttribute('data-val'));
        render();
      });
    });
    $all('[data-quote-want]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleArray(state.quote.wants, btn.getAttribute('data-quote-want'));
        render();
      });
    });
    $all('[data-quote-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-quote-toggle');
        state.quote[key] = !state.quote[key];
        render();
      });
    });
    var quoteNext = $('#quoteNext');
    if (quoteNext) quoteNext.addEventListener('click', function () {
      readQuoteFields();
      var catId = state.quote.category || companyById(state.quote.partnerIds[0]).category || 'dakwerken';
      var steps = quoteStepsFor(catId);
      if (state.quote.step >= steps.length - 1) {
        state.quote.sent = true;
        state.customerTiming = state.quote.timing;
        var match = ME ? ME.evaluate(companyById(state.quote.partnerIds[0]), {
          category: catId,
          service: state.quote.service || state.quote.workType,
          timing: state.quote.timing,
          budgetMax: state.quote.hasBudget === 'ja' ? Number(state.quote.budgetTo || 0) : null
        }) : null;
        state.requests.unshift({
          id: 'a' + Date.now(),
          category: catId,
          title: subtypeLabel(catId, state.quote.service || state.quote.workType),
          location: state.quote.address || state.location.name,
          size: (state.quote.answers && state.quote.answers.area) ? ('±' + state.quote.answers.area + ' m²') : '—',
          roof: (state.quote.answers && (state.quote.answers.roofType || state.quote.answers.type || state.quote.answers.floorType)) || '—',
          customerWish: state.quote.timingMonth || customerTimingWishLabel(),
          timingFit: match ? match.label : 'Relevant voor dit project',
          budget: state.quote.hasBudget === 'ja' ? ('€ ' + state.quote.budgetFrom + ' – € ' + state.quote.budgetTo) : 'niet opgegeven',
          wishes: Object.keys(state.quote.answers || {}).map(function (k) {
            var v = state.quote.answers[k];
            return k + ': ' + (Array.isArray(v) ? v.join(', ') : v);
          }).join(' · ') || '—',
          photos: state.quote.photos,
          status: 'new',
          customerVisible: false
        });
      } else state.quote.step += 1;
      render();
    });
    var quoteBack = $('#quoteBack');
    if (quoteBack) quoteBack.addEventListener('click', function () {
      readQuoteFields();
      state.quote.step = Math.max(0, state.quote.step - 1);
      render();
    });

    /* Onboarding */
    $all('[data-primary-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.onboard.primaryCategory = btn.getAttribute('data-primary-cat');
        state.onboard.subtypes = [];
        state.onboard.conditionalAnswers = {};
        render();
      });
    });
    $all('[data-toggle-subtype]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleArray(state.onboard.subtypes, btn.getAttribute('data-toggle-subtype'));
        render();
      });
    });
    $all('[data-toggle-visit-extra]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.onboard.visitExtra) state.onboard.visitExtra = [];
        toggleArray(state.onboard.visitExtra, btn.getAttribute('data-toggle-visit-extra'));
        render();
      });
    });
    $all('[data-answer-single]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-answer-single');
        var val = btn.getAttribute('data-val');
        var stepId = (OE && OE.steps[state.onboardStep]) ? OE.steps[state.onboardStep].id : '';
        if (stepId === 'diensten') {
          if (!state.onboard.conditionalAnswers) state.onboard.conditionalAnswers = {};
          state.onboard.conditionalAnswers[key] = val;
        } else {
          state.onboard[key] = val;
        }
        render();
      });
    });
    $all('[data-answer-multi]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-answer-multi');
        var val = btn.getAttribute('data-val');
        var stepId = (OE && OE.steps[state.onboardStep]) ? OE.steps[state.onboardStep].id : '';
        var target = state.onboard;
        if (stepId === 'diensten') {
          if (!state.onboard.conditionalAnswers) state.onboard.conditionalAnswers = {};
          target = state.onboard.conditionalAnswers;
        }
        if (!Array.isArray(target[key])) target[key] = [];
        toggleArray(target[key], val);
        render();
      });
    });
    $all('[data-capacity]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.onboard.capacity = btn.getAttribute('data-capacity');
        render();
      });
    });
    $all('[data-set-extra]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.onboard[btn.getAttribute('data-set-extra')] = btn.getAttribute('data-extra-val');
        render();
      });
    });
    var consent = $('#googleConsent');
    if (consent) consent.addEventListener('change', function () {
      state.onboard.googleConsent = consent.checked;
    });
    var next = $('#onboardNext');
    if (next) next.addEventListener('click', function () {
      readOnboardFields();
      if (state.onboardStep >= ONBOARD_STEPS.length - 1) {
        state.partnerMode = 'submitted';
        state.partnerStatus = 'Wordt gecontroleerd';
      } else state.onboardStep += 1;
      render();
    });
    var onboardBack = $('#onboardBack');
    if (onboardBack) onboardBack.addEventListener('click', function () {
      readOnboardFields();
      state.onboardStep = Math.max(0, state.onboardStep - 1);
      render();
    });
    var goDash = $('#goPartnerDash');
    if (goDash) goDash.addEventListener('click', function () {
      state.partnerMode = 'dashboard';
      state.partnerPanel = 'overzicht';
      render();
    });
    var reset = $('#resetOnboarding');
    if (reset) reset.addEventListener('click', function () {
      state.partnerMode = 'onboarding';
      state.onboardStep = 0;
      render();
    });
    $all('[data-partner-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.partnerPanel = btn.getAttribute('data-partner-panel');
        render();
      });
    });
    $all('[data-toggle-req]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = $('#req-' + btn.getAttribute('data-toggle-req'));
        if (el) el.hidden = !el.hidden;
      });
    });
    $all('[data-req-interest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-req-interest');
        state.requests.forEach(function (r) {
          if (r.id === id) {
            r.status = 'interested';
            r.interestedAt = new Date().toISOString();
            r.customerVisible = true;
            r.customerMessage = 'Deze vakman heeft interesse.';
            state.customerNotices.push('Deze vakman heeft interesse.');
          }
        });
        render();
      });
    });
    $all('[data-req-decline]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = $('#decline-' + btn.getAttribute('data-req-decline'));
        if (box) box.hidden = false;
      });
    });
    $all('[data-decline-reason]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-decline-reason');
        var reasonId = btn.getAttribute('data-reason-id');
        state.requests.forEach(function (r) {
          if (r.id === id) {
            r.status = 'declined';
            r.declineReasonId = reasonId;
            r.declineReason = btn.textContent;
            r.declinedAt = new Date().toISOString();
            r.customerVisible = true;
            r.customerMessage = 'Deze vakman past momenteel niet bij dit project.';
          }
        });
        render();
      });
    });
    var editPrice = $('#editPriceBtn');
    if (editPrice) editPrice.addEventListener('click', function () {
      var box = $('#priceEditBox');
      if (box) box.hidden = !box.hidden;
    });
    var submitPrice = $('#submitPriceChange');
    if (submitPrice) submitPrice.addEventListener('click', function () {
      readOnboardFields();
      state.priceChange.proposed = '€ ' + state.onboard.priceFrom + ' – € ' + state.onboard.priceTo + ' / m²';
      var t = $('#priceChangeToast');
      if (t) t.hidden = false;
    });
    var saveAvail = $('#savePartnerAvail');
    if (saveAvail) saveAvail.addEventListener('click', function () {
      readOnboardFields();
      var t = $('#partnerAvailToast');
      if (t) t.hidden = false;
    });
    $all('[data-submit-photo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = Number(btn.getAttribute('data-submit-photo'));
        state.photos.forEach(function (ph) {
          if (ph.id === id) { ph.partner = 'Ingediend'; ph.elyan = 'Ter controle'; }
        });
        render();
      });
    });
    $all('[data-admin]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-admin');
        if (a === 'approve-price') { state.priceChange.current = state.priceChange.proposed; state.adminNote = 'Prijswijziging goedgekeurd.'; }
        else if (a === 'reject-price') state.adminNote = 'Prijswijziging afgewezen.';
        else if (a === 'ask-price') state.adminNote = 'Prijswijziging bekeken.';
        else if (a === 'photo-ok') { state.photos[0].elyan = 'Goedgekeurd'; state.adminNote = 'Foto goedgekeurd.'; }
        else if (a === 'photo-reject') state.adminNote = 'Foto afgewezen.';
        else if (a === 'photo-view') { openLightbox(IMAGES.hero); return; }
        else if (a === 'approve-partner') { state.adminNote = 'Partner goedgekeurd (demo).'; state.partnerStatus = 'Gepubliceerd'; }
        else if (a === 'reject-partner') state.adminNote = 'Partner afgewezen (demo).';
        else if (a === 'review-partner') state.adminNote = 'Partner geopend voor beoordeling (demo).';
        render();
      });
    });
  }

  function bindGlobal() {
    $all('.lab-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-lab-view');
        if (v === 'discover') state.showResults = false;
        setView(v);
      });
    });
    $all('[data-close-lightbox]').forEach(function (el) { el.addEventListener('click', closeLightbox); });
    $all('[data-close-drawer]').forEach(function (el) { el.addEventListener('click', closeFiltersDrawer); });
  }

  bindGlobal();
  render();
})();
