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

  var TAXONOMY = {
    dakwerken: {
      label: 'Dakwerken',
      plural: 'Dakwerkers',
      img: IMAGES.hero,
      pos: '50% 32%',
      golden: true,
      subtypes: [
        { id: 'volledig', label: 'Volledige dakrenovatie' },
        { id: 'hellend', label: 'Hellend dak' },
        { id: 'plat', label: 'Plat dak' },
        { id: 'bedekking', label: 'Dakbedekking' },
        { id: 'isolatie', label: 'Dakisolatie' },
        { id: 'herstelling', label: 'Dakherstelling / lekkage' },
        { id: 'constructie', label: 'Dakconstructie / timmerwerk' },
        { id: 'goten', label: 'Goten / afvoer' },
        { id: 'dakvenster', label: 'Dakvensters' },
        { id: 'schoorsteen', label: 'Schoorsteenwerken' }
      ]
    },
    badkamer: {
      label: 'Badkamer', plural: 'Badkamerspecialisten', tone: true,
      subtypes: [
        { id: 'volledig', label: 'Volledige badkamerrenovatie' },
        { id: 'douche', label: 'Douche' },
        { id: 'bad', label: 'Bad' },
        { id: 'sanitair', label: 'Sanitair' },
        { id: 'tegelwerken', label: 'Tegelwerken' },
        { id: 'meubel', label: 'Badkamermeubel' },
        { id: 'leidingen', label: 'Leidingwerken' }
      ]
    },
    keuken: {
      label: 'Keuken', plural: 'Keukenspecialisten', img: IMAGES.why, pos: '50% 60%',
      subtypes: [
        { id: 'volledig', label: 'Volledige keukenrenovatie' },
        { id: 'plaatsing', label: 'Keukenplaatsing' },
        { id: 'werkblad', label: 'Werkblad' },
        { id: 'toestellen', label: 'Toestellen' },
        { id: 'tegelwerk', label: 'Spatwand / tegelwerk' }
      ]
    },
    'ramen-deuren': {
      label: 'Ramen & deuren', plural: 'Ramen- & deurenspecialisten', tone: true,
      subtypes: [
        { id: 'ramen', label: 'Ramen vervangen' },
        { id: 'deuren', label: 'Buitendeuren' },
        { id: 'schuif', label: 'Schuiframen' },
        { id: 'voordeur', label: 'Voordeur' },
        { id: 'binnendeuren', label: 'Binnendeuren' }
      ]
    },
    isolatie: {
      label: 'Isolatie', plural: 'Isolatiespecialisten', tone: true,
      subtypes: [
        { id: 'dak', label: 'Dakisolatie' },
        { id: 'zolder', label: 'Zoldervloerisolatie' },
        { id: 'muur', label: 'Muurisolatie' },
        { id: 'vloer', label: 'Vloerisolatie' },
        { id: 'spouw', label: 'Spouwmuurisolatie' }
      ]
    },
    verwarming: {
      label: 'Verwarming', plural: 'Verwarmingsspecialisten', tone: true,
      subtypes: [
        { id: 'warmtepomp', label: 'Warmtepomp' },
        { id: 'cv', label: 'CV-ketel' },
        { id: 'vloerverwarming', label: 'Vloerverwarming' },
        { id: 'radiatoren', label: 'Radiatoren' }
      ]
    },
    elektriciteit: {
      label: 'Elektriciteit', plural: 'Elektriciens', tone: true,
      subtypes: [
        { id: 'volledig', label: 'Volledige herbekabeling' },
        { id: 'bord', label: 'Elektrisch bord' },
        { id: 'stopcontacten', label: 'Stopcontacten & schakelaars' },
        { id: 'laden', label: 'Laadpunt wagen' }
      ]
    },
    gevel: {
      label: 'Gevel', plural: 'Gevelspecialisten', img: IMAGES.about, pos: '50% 40%',
      subtypes: [
        { id: 'gevelrenovatie', label: 'Gevelrenovatie' },
        { id: 'crepi', label: 'Crepi / sierpleister' },
        { id: 'steenstrips', label: 'Steenstrips' },
        { id: 'isolatie', label: 'Gevelisolatie' }
      ]
    },
    vloeren: {
      label: 'Vloeren', plural: 'Vloerspecialisten', img: IMAGES.editorial, pos: '40% 50%',
      subtypes: [
        { id: 'tegel', label: 'Tegelvloer' },
        { id: 'parket', label: 'Parket' },
        { id: 'laminaat', label: 'Laminaat / vinyl' },
        { id: 'chape', label: 'Chape' }
      ]
    },
    schilderwerken: {
      label: 'Schilderwerken', plural: 'Schilders', tone: true,
      subtypes: [
        { id: 'binnen', label: 'Binnenschilderwerk' },
        { id: 'buiten', label: 'Buitenschilderwerk' },
        { id: 'lakwerk', label: 'Lakwerk' },
        { id: 'behang', label: 'Behang' }
      ]
    },
    ventilatie: {
      label: 'Ventilatie', plural: 'Ventilatiespecialisten', tone: true,
      subtypes: [
        { id: 'd', label: 'Systeem D' },
        { id: 'c', label: 'Systeem C' },
        { id: 'renovatie', label: 'Renovatieventilatie' }
      ]
    },
    zonnepanelen: {
      label: 'Zonnepanelen', plural: 'Zonnepanelenpartners', tone: true,
      subtypes: [
        { id: 'installatie', label: 'Nieuwe installatie' },
        { id: 'thuisbatterij', label: 'Thuisbatterij' },
        { id: 'omvormer', label: 'Omvormer' }
      ]
    }
  };

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

  var ONBOARD_STEPS = [
    'Bedrijf', 'Categorie', 'Specialisaties', 'Werkgebied',
    'Prijzen', 'Beschikbaarheid', 'Google', 'Eigenheid', 'Foto’s', 'Controle'
  ];

  var QUOTE_STEPS_DAK = [
    'Type werk', 'Over je dak', 'Uitvoering', 'Timing', 'Foto’s', 'Budget', 'Contact', 'Overzicht'
  ];

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
      partnerIds: ['atelier-dak'],
      workType: 'volledig',
      roofType: 'hellend',
      area: '120',
      areaUnknown: false,
      covering: 'pannen',
      coveringUnknown: false,
      insulation: 'weet-niet',
      condition: 'verouderd',
      wants: ['bedekking', 'isolatie'],
      timing: '3m',
      timingMonth: 'November 2026',
      photos: 0,
      hasBudget: 'nee',
      budgetFrom: '',
      budgetTo: '',
      name: 'Demo Klant',
      email: 'demo.klant@example.be',
      phone: '+32 470 00 00 00',
      address: 'Antwerpen',
      sent: false
    },
    partnerMode: 'onboarding',
    partnerPanel: 'overzicht',
    onboardStep: 0,
    onboard: {
      companyName: 'Atelier Dak Antwerpen',
      vat: 'BE 0999.000.111 (demo)',
      contact: 'Jan Peeters',
      website: 'https://demo.elyan.be/atelier-dak',
      phone: '+32 3 111 22 33',
      email: 'atelier.demo@elyan.demo',
      address: 'Antwerpen',
      primaryCategory: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'isolatie'],
      area: 'Antwerpen + 25 km',
      years: '12',
      teamSize: '6–10',
      priceModel: 'm2-range',
      priceFrom: '160',
      priceTo: '230',
      isolFrom: '45',
      isolTo: '75',
      repairFrom: '350',
      material: 'Meestal inbegrepen',
      vatBasis: 'Exclusief',
      minProject: '8500',
      capacity: 'Beperkt beschikbaar',
      startMonth: 'Oktober 2026',
      visitSpeed: '7 tot 14 dagen',
      hasGoogle: 'Ja',
      googleQuery: 'Atelier Dak Antwerpen',
      googleConsent: true,
      strength: 'Hellende daken met nette afwerking',
      prefer: 'Gezinswoningen en kwaliteitsrenovaties',
      avoid: 'Spoedwerken zonder opmeting',
      materials: 'Keramische pannen, isolatiepakketten',
      values: 'Duidelijke planning en nette werf',
      differ: 'Aandacht voor details en oplevering',
      guarantees: 'Uitvoeringsgarantie volgens offerte',
      certificates: 'Geen aparte demo-certificaten'
    },
    partnerStatus: 'Wordt bekeken',
    photos: [
      { id: 1, title: 'Hellend dak Berchem', partner: 'Ingediend', elyan: 'Ter controle', img: IMAGES.hero },
      { id: 2, title: 'Detail nokafwerking', partner: 'Concept', elyan: '-', img: IMAGES.editorial },
      { id: 3, title: 'Isolatiezolder', partner: 'Ingediend', elyan: 'Goedgekeurd', img: IMAGES.why }
    ],
    requests: [
      {
        id: 'a1',
        title: 'Volledige dakrenovatie',
        location: 'Antwerpen',
        size: '±120 m²',
        roof: 'Hellend dak',
        customerWish: 'November 2026',
        timingFit: 'Past bij jouw beschikbaarheid',
        budget: '€ 18.000 – € 24.000',
        wishes: 'Nieuwe dakbedekking + isolatie',
        photos: 3,
        status: 'nieuw'
      },
      {
        id: 'a2',
        title: 'Plat dak',
        location: 'Berchem',
        size: '65 m²',
        roof: 'Plat dak',
        customerWish: 'Zo snel mogelijk',
        timingFit: 'Past bij jouw beschikbaarheid',
        budget: 'niet opgegeven',
        wishes: 'EPDM vervangen',
        photos: 1,
        status: 'nieuw'
      },
      {
        id: 'a3',
        title: 'Dakisolatie',
        location: 'Schoten',
        size: 'zoldervloer',
        roof: 'Hellend',
        customerWish: 'Flexibel',
        timingFit: 'Past',
        budget: '€ 4.500 – € 7.000',
        wishes: 'Comfort verbeteren',
        photos: 0,
        status: 'interessant'
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
  function field(label, key, value, type) {
    return '<label class="lab-field">' + escapeHtml(label) +
      '<input data-onboard-field="' + key + '" type="' + (type || 'text') + '" value="' + escapeHtml(value == null ? '' : value) + '"></label>';
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
    state.quote.sent = false;
    state.quote.step = 0;
    state.quote.partnerIds = [partnerId || state.activeCompanyId];
    state.activeCompanyId = state.quote.partnerIds[0];
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
    if (state.category !== 'dakwerken') {
      empty = '<div class="lab-empty">Demo toont momenteel dakbedrijven als golden standard. Filters voor <strong>' + escapeHtml(catLabel(state.category)) + '</strong> werken al categorie-afhankelijk. Kies Dakwerken om resultaten te vergelijken.</div>';
    } else if (!list.length) {
      empty = '<div class="lab-empty">Geen resultaten voor deze filters. Pas timing of type werk aan.</div>';
    }

    return (
      '<div class="lab-wrap lab-results">' +
        '<button type="button" class="lab-link" id="backToLanding" style="margin-bottom:10px;">← Terug naar ontdekken</button>' +
        '<div class="lab-results-head">' +
          '<h1>' + escapeHtml(pluralLabel(state.category)) + ' rond ' + escapeHtml(state.location.name) + '</h1>' +
          '<p class="lab-hint">' + escapeHtml(state.location.postcode) + ' · ' + escapeHtml(state.location.province) +
            (state.subtype !== 'alle' ? ' · ' + escapeHtml(subtypeLabel(state.category, state.subtype)) : '') +
            ' · Fictieve demoresultaten</p>' +
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
            '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
            '<h1>' + escapeHtml(c.name) + '</h1>' +
            starsHtml(c.google.rating, c.google.count) +
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

  /* ========== QUOTE FLOW ========== */
  function renderQuote() {
    var host = $('#view-quote');
    if (!host) return;
    var q = state.quote;
    var partner = companyById(q.partnerIds[0]);
    var steps = QUOTE_STEPS_DAK;
    var progress = steps.map(function (_, i) {
      return '<span class="' + (i < q.step ? 'is-done' : (i === q.step ? 'is-current' : '')) + '"></span>';
    }).join('');

    if (q.sent) {
      host.innerHTML =
        '<div class="lab-quote"><div class="lab-quote-shell"><div class="lab-success">' +
          '<div class="mark"><svg class="icon"><use href="#i-check"></use></svg></div>' +
          '<p class="lab-kicker">Aanvraag verzonden</p>' +
          '<h1>Je aanvraag is doorgestuurd.</h1>' +
          '<p class="lab-hint">' + escapeHtml(partner.name) + ' heeft je projectgegevens ontvangen. Je krijgt bericht zodra er een reactie is.</p>' +
          '<p class="lab-hint" style="margin-top:10px;">Demo: er werd niets echt verzonden. Later: opvolging via beveiligde link.</p>' +
          '<div class="lab-quote-actions" style="justify-content:center;">' +
            '<button type="button" class="btn btn-primary" data-open-profile="' + partner.id + '">Terug naar profiel</button>' +
            '<button type="button" class="btn btn-ghost" data-lab-view-jump="discover">Verder ontdekken</button>' +
          '</div>' +
        '</div></div></div>';
      return;
    }

    var body = '';
    if (q.step === 0) {
      body = '<h1>Wat wil je laten uitvoeren?</h1><p class="step-lead">Kies het type dakwerk dat het best past.</p><div class="lab-choice-grid is-2">' +
        tax('dakwerken').subtypes.map(function (s) {
          return '<button type="button" class="lab-choice' + (q.workType === s.id ? ' is-selected' : '') + '" data-quote-set="workType" data-val="' + s.id + '">' + escapeHtml(s.label) + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 1) {
      body = '<h1>Vertel ons iets over je dak.</h1><p class="step-lead">Weet je iets niet zeker? Dat is geen probleem.</p>' +
        '<p class="lab-hint" style="margin-bottom:8px;">Type dak</p><div class="lab-choice-grid is-3">' +
        [['hellend', 'Hellend'], ['plat', 'Plat'], ['weet-niet', 'Ik weet het niet']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.roofType === o[0] ? ' is-selected' : '') + '" data-quote-set="roofType" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<label class="lab-field">Geschatte oppervlakte (m²)<input data-quote-field="area" type="text" value="' + escapeHtml(q.area) + '" ' + (q.areaUnknown ? 'disabled' : '') + '></label>' +
        '<button type="button" class="lab-choice' + (q.areaUnknown ? ' is-selected' : '') + '" data-quote-toggle="areaUnknown">Ik weet het niet</button>' +
        '<p class="lab-hint" style="margin:14px 0 8px;">Huidige bedekking</p><div class="lab-choice-grid is-2">' +
        [['pannen', 'Pannen'], ['leien', 'Leien'], ['epdm', 'EPDM / plat'], ['weet-niet', 'Ik weet het niet']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.covering === o[0] ? ' is-selected' : '') + '" data-quote-set="covering" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<p class="lab-hint" style="margin:14px 0 8px;">Isolatie aanwezig?</p><div class="lab-choice-grid is-3">' +
        [['ja', 'Ja'], ['nee', 'Nee'], ['weet-niet', 'Ik weet het niet']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.insulation === o[0] ? ' is-selected' : '') + '" data-quote-set="insulation" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 2) {
      body = '<h1>Wat wil je precies laten uitvoeren?</h1><p class="step-lead">Meerdere opties mogelijk.</p><div class="lab-choice-grid is-2">' +
        [['bedekking', 'Nieuwe dakbedekking'], ['isolatie', 'Isolatie verbeteren'], ['constructie', 'Constructie / timmerwerk'], ['goten', 'Goten / afvoer'], ['dakvenster', 'Dakvenster'], ['herstelling', 'Herstelling / lekkage']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.wants.indexOf(o[0]) >= 0 ? ' is-selected' : '') + '" data-quote-want="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 3) {
      body = '<h1>Wanneer wil je starten?</h1><p class="step-lead">Zo kunnen we timing afstemmen op de vakman.</p><div class="lab-choice-grid is-2">' +
        [['asap', 'Zo snel mogelijk'], ['1m', 'Binnen 1 maand'], ['3m', 'Binnen 3 maanden'], ['6m', 'Binnen 6 maanden'], ['flex', 'Flexibel']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.timing === o[0] ? ' is-selected' : '') + '" data-quote-set="timing" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        field('Gewenste periode (optioneel)', 'timingMonth', q.timingMonth).replace('data-onboard-field', 'data-quote-field');
    } else if (q.step === 4) {
      body = '<h1>Projectfoto’s</h1><p class="step-lead">Optioneel, maar helpt de vakman. Demo: kies hoeveel foto’s je zou toevoegen.</p><div class="lab-choice-grid is-3">' +
        [0, 1, 2, 3].map(function (n) {
          return '<button type="button" class="lab-choice' + (q.photos === n ? ' is-selected' : '') + '" data-quote-set="photos" data-val="' + n + '">' + (n === 0 ? 'Geen foto’s' : n + ' foto’s') + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 5) {
      body = '<h1>Heb je al een budget in gedachten?</h1><p class="step-lead">Optioneel. Geen druk, wel nuttig voor matching.</p><div class="lab-choice-grid is-2">' +
        [['nee', 'Nee'], ['ja', 'Ja']].map(function (o) {
          return '<button type="button" class="lab-choice' + (q.hasBudget === o[0] ? ' is-selected' : '') + '" data-quote-set="hasBudget" data-val="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        (q.hasBudget === 'ja'
          ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">' +
            '<label class="lab-field">Van (€)<input data-quote-field="budgetFrom" type="number" value="' + escapeHtml(q.budgetFrom) + '"></label>' +
            '<label class="lab-field">Tot (€)<input data-quote-field="budgetTo" type="number" value="' + escapeHtml(q.budgetTo) + '"></label></div>'
          : '');
    } else if (q.step === 6) {
      body = '<h1>Jouw gegevens</h1><p class="step-lead">Zodat de vakman je kan bereiken.</p>' +
        '<label class="lab-field">Naam<input data-quote-field="name" value="' + escapeHtml(q.name) + '"></label>' +
        '<label class="lab-field">E-mail<input data-quote-field="email" type="email" value="' + escapeHtml(q.email) + '"></label>' +
        '<label class="lab-field">Telefoon<input data-quote-field="phone" value="' + escapeHtml(q.phone) + '"></label>' +
        '<label class="lab-field">Projectlocatie<input data-quote-field="address" value="' + escapeHtml(q.address) + '"></label>';
    } else {
      body = '<h1>Jouw aanvraag</h1><p class="step-lead">Controleer kort vóór verzenden.</p>' +
        '<div class="lab-summary">' +
          '<div class="lab-summary-row"><span>Werk</span><strong>' + escapeHtml(subtypeLabel('dakwerken', q.workType)) + '</strong></div>' +
          '<div class="lab-summary-row"><span>Dak</span><strong>' + escapeHtml(q.roofType) + (q.areaUnknown ? '' : ' · ±' + escapeHtml(q.area) + ' m²') + '</strong></div>' +
          '<div class="lab-summary-row"><span>Locatie</span><strong>' + escapeHtml(q.address) + '</strong></div>' +
          '<div class="lab-summary-row"><span>Start</span><strong>' + escapeHtml(q.timingMonth || customerTimingWishLabel()) + '</strong></div>' +
          '<div class="lab-summary-row"><span>Foto’s</span><strong>' + q.photos + '</strong></div>' +
          '<div class="lab-summary-row"><span>Naar</span><strong>' + escapeHtml(partner.name) + '</strong></div>' +
        '</div>' +
        '<p class="lab-hint">Architectuur ondersteunt later tot 3 zelfgekozen vakmannen. Demo: één partner.</p>';
    }

    host.innerHTML =
      '<div class="lab-quote"><div class="lab-quote-shell">' +
        '<button type="button" class="lab-link" data-open-profile="' + partner.id + '" style="margin-bottom:12px;">← Terug naar profiel</button>' +
        '<div class="lab-quote-progress">' + progress + '</div>' +
        '<p class="lab-kicker">Offerteaanvraag · ' + escapeHtml(partner.name) + '</p>' +
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

  /* ========== PARTNER ========== */
  function renderOnboarding() {
    var step = state.onboardStep;
    var o = state.onboard;
    var cat = o.primaryCategory || 'dakwerken';
    var t = tax(cat);
    var progress = ONBOARD_STEPS.map(function (_, i) {
      return '<span class="' + (i < step ? 'is-done' : (i === step ? 'is-current' : '')) + '"></span>';
    }).join('');
    var body = '';

    if (step === 0) {
      body = '<h1>Bedrijfsgegevens</h1><p class="step-lead">Basisinfo. ELYAN bouwt hier later je presentatie mee.</p>' +
        field('Bedrijfsnaam', 'companyName', o.companyName) +
        field('Ondernemingsnummer', 'vat', o.vat) +
        field('Contactpersoon', 'contact', o.contact) +
        field('E-mail', 'email', o.email) +
        field('Telefoon', 'phone', o.phone) +
        field('Website', 'website', o.website) +
        field('Vestigingsadres', 'address', o.address);
    } else if (step === 1) {
      body = '<h1>Hoofdcategorie</h1><p class="step-lead">Eén primaire categorie. Vragen volgen hieruit.</p><div class="lab-choice-grid is-3">' +
        CATEGORIES.map(function (c) {
          return '<button type="button" class="lab-choice' + (cat === c.id ? ' is-selected' : '') + '" data-primary-cat="' + c.id + '">' + escapeHtml(c.label) + '</button>';
        }).join('') + '</div>' +
        (!t.golden ? '<p class="lab-hint">Dakwerken is de volledig uitgewerkte golden standard. Andere categorieën hebben architectuur, zonder ongevalideerde detaillering.</p>' : '');
    } else if (step === 2) {
      body = '<h1>Welke werken voeren jullie uit?</h1><p class="step-lead">' + escapeHtml(t.label) + ': selecteer wat jullie effectief doen.</p><div class="lab-choice-grid is-2">' +
        t.subtypes.map(function (s) {
          return '<button type="button" class="lab-choice' + (o.subtypes.indexOf(s.id) >= 0 ? ' is-selected' : '') + '" data-toggle-subtype="' + s.id + '">' + escapeHtml(s.label) + '</button>';
        }).join('') + '</div>';
    } else if (step === 3) {
      body = '<h1>Werkgebied</h1><p class="step-lead">Kernregio zodat klanten relevante partners zien.</p>' +
        field('Werkgebied', 'area', o.area) +
        field('Jaren actief', 'years', o.years) +
        field('Teamgrootte', 'teamSize', o.teamSize);
    } else if (step === 4) {
      if (cat === 'dakwerken') {
        body = '<h1>Prijzen · Dakwerken</h1><p class="step-lead">Alleen relevante diensten. Geen geforceerd universeel model.</p>' +
          '<p class="lab-hint">Volledige dakrenovatie (€/m²)</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          field('Van', 'priceFrom', o.priceFrom, 'number') + field('Tot', 'priceTo', o.priceTo, 'number') + '</div>' +
          '<p class="lab-hint">Dakisolatie (€/m²)</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          field('Van', 'isolFrom', o.isolFrom, 'number') + field('Tot', 'isolTo', o.isolTo, 'number') + '</div>' +
          field('Kleine herstelling vanaf (€)', 'repairFrom', o.repairFrom, 'number') +
          field('Projectminimum (€)', 'minProject', o.minProject, 'number') +
          field('Materiaal / scope-nota', 'material', o.material) +
          field('Btw-basis', 'vatBasis', o.vatBasis);
      } else {
        body = '<h1>Prijzen</h1><p class="lab-hint">Voor deze categorie volgt een gevalideerd prijsmodel later. Demo-placeholder.</p>' +
          field('Richtprijs van (€)', 'priceFrom', o.priceFrom, 'number') +
          field('Richtprijs tot (€)', 'priceTo', o.priceTo, 'number');
      }
    } else if (step === 5) {
      body = '<h1>Beschikbaarheid</h1><p class="step-lead">Wanneer kunnen jullie starten? Klanten zien eerste mogelijkheid, geen “volzet”-filter.</p><div class="lab-seg">' +
        ['Nieuwe projecten mogelijk', 'Beperkt beschikbaar', 'Momenteel volzet'].map(function (m) {
          return '<button type="button" class="' + (o.capacity === m ? 'is-active' : '') + '" data-capacity="' + escapeHtml(m) + '">' + escapeHtml(m) + '</button>';
        }).join('') + '</div>' +
        field('Eerst mogelijke startmaand', 'startMonth', o.startMonth) +
        field('Plaatsbezoek meestal binnen', 'visitSpeed', o.visitSpeed);
    } else if (step === 6) {
      body = '<h1>Jullie Google-bedrijfsprofiel</h1><p class="step-lead">Reviews op ELYAN komen uitsluitend via Google.</p>' +
        '<p class="lab-hint">Heeft jullie bedrijf een Google-bedrijfsprofiel?</p><div class="lab-seg">' +
        ['Ja', 'Nee'].map(function (m) {
          return '<button type="button" class="' + (o.hasGoogle === m ? 'is-active' : '') + '" data-set-extra="hasGoogle" data-extra-val="' + m + '">' + m + '</button>';
        }).join('') + '</div>' +
        (o.hasGoogle === 'Ja'
          ? field('Zoek / selecteer bedrijf (demo)', 'googleQuery', o.googleQuery) +
            '<label class="lab-field" style="flex-direction:row;align-items:center;gap:10px;">' +
            '<input type="checkbox" id="googleConsent"' + (o.googleConsent ? ' checked' : '') + '>' +
            '<span style="font-weight:500;">Ik geef toestemming om Google-beoordelingen bij ons openbare ELYAN-profiel weer te geven.</span></label>'
          : '<p class="lab-hint">Geen probleem. Je profiel kan zonder Google-reviews live.</p>');
    } else if (step === 7) {
      body = '<h1>Wat maakt jullie uniek?</h1><p class="step-lead">Korte antwoorden. Geen marketingessay. ELYAN vertaalt dit naar je profiel.</p>' +
        field('Waar zijn jullie bijzonder sterk in?', 'strength', o.strength) +
        field('Welke projecten doen jullie het liefst?', 'prefer', o.prefer) +
        field('Welke projecten nemen jullie bewust niet aan?', 'avoid', o.avoid) +
        field('Materialen / systemen', 'materials', o.materials) +
        field('Wat vinden jullie belangrijk tijdens een project?', 'values', o.values) +
        field('Wat onderscheidt jullie?', 'differ', o.differ) +
        field('Garanties (indien relevant)', 'guarantees', o.guarantees) +
        field('Certificaten / erkenningen', 'certificates', o.certificates);
    } else if (step === 8) {
      body = '<h1>Projectfoto’s</h1><p class="step-lead">Eigen realisaties. ELYAN controleert beelden vóór publicatie.</p>' +
        '<div class="lab-photo-sm"><img src="' + IMAGES.hero + '" alt=""><div><strong>Hellend dak Berchem</strong><br><span class="lab-chip">Concept</span></div></div>' +
        '<div class="lab-photo-sm"><img src="' + IMAGES.editorial + '" alt=""><div><strong>Werfdetail</strong><br><span class="lab-chip">Concept</span></div></div>';
    } else {
      body = '<h1>Controle vóór indiening</h1><p class="step-lead">Gestructureerde data. ELYAN maakt hier je presentatie van.</p><div class="lab-facts">' +
        fact('Bedrijf', o.companyName) +
        fact('Categorie', catLabel(cat)) +
        fact('Specialisaties', (o.subtypes || []).map(function (id) { return subtypeLabel(cat, id); }).join(', ') || 'Nog niet gekozen') +
        fact('Werkgebied', o.area) +
        fact('Start', o.capacity + ' · ' + o.startMonth) +
        fact('Google', o.hasGoogle === 'Ja' ? (o.googleQuery + (o.googleConsent ? ' · toestemming' : ' · geen toestemming')) : 'Geen') +
        '</div>';
    }

    return '<div class="lab-onboard"><div class="lab-onboard-progress">' + progress + '</div>' +
      '<p class="lab-kicker">Stap ' + String(step + 1).padStart(2, '0') + ' · ' + escapeHtml(ONBOARD_STEPS[step]) + '</p>' + body +
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
              '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
                '<button type="button" class="btn btn-primary btn-sm" data-req-interest="' + r.id + '">Ik heb interesse</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-req-decline="' + r.id + '">Past niet bij ons</button>' +
              '</div>' +
              '<div class="lab-decline-options" id="decline-' + r.id + '" hidden>' +
                ['Planning', 'Buiten werkgebied', 'Type project', 'Projectomvang', 'Budget', 'Andere reden'].map(function (x) {
                  return '<button type="button" class="lab-chip" data-decline-reason="' + r.id + '">' + x + '</button>';
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
          '<div><p class="lab-kicker">Partneromgeving</p><h1>' + escapeHtml(state.onboard.companyName) + '</h1></div>' +
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
        '<p class="lab-kicker" style="font-size:.85rem;">Bedankt</p>' +
        '<h1>Gegevens ontvangen</h1>' +
        '<p class="lab-hint" style="font-size:1.05rem;margin:10px 0;">ELYAN bereidt je profiel voor.</p>' +
        '<p class="lab-hint">We structureren je antwoorden tot een consistente presentatie. Daarna kun je een preview bekijken en eventuele aanpassingen doorgeven.</p>' +
        '<div class="lab-status-flow">' +
          ['Ingediend', 'Wordt bekeken', 'Profiel in voorbereiding', 'Klaar voor controle', 'Gepubliceerd'].map(function (s) {
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
      '</div>';
  }

  function readOnboardFields(root) {
    $all('[data-onboard-field]', root || document).forEach(function (input) {
      state.onboard[input.getAttribute('data-onboard-field')] = input.value;
    });
  }
  function readQuoteFields(root) {
    $all('[data-quote-field]', root || document).forEach(function (input) {
      state.quote[input.getAttribute('data-quote-field')] = input.value;
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
        else state.quote[key] = val;
        if (key === 'timing' && val === '3m') state.quote.timingMonth = 'November 2026';
        if (key === 'timing' && val === 'asap') state.quote.timingMonth = 'Zo snel mogelijk';
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
      if (state.quote.step >= QUOTE_STEPS_DAK.length - 1) {
        state.quote.sent = true;
        state.customerTiming = state.quote.timing;
        state.requests.unshift({
          id: 'a' + Date.now(),
          title: subtypeLabel('dakwerken', state.quote.workType),
          location: state.quote.address,
          size: state.quote.areaUnknown ? 'onbekend' : '±' + state.quote.area + ' m²',
          roof: state.quote.roofType,
          customerWish: state.quote.timingMonth,
          timingFit: 'Past bij jouw beschikbaarheid',
          budget: state.quote.hasBudget === 'ja' ? ('€ ' + state.quote.budgetFrom + ' – € ' + state.quote.budgetTo) : 'niet opgegeven',
          wishes: state.quote.wants.join(', '),
          photos: state.quote.photos,
          status: 'nieuw'
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
        render();
      });
    });
    $all('[data-toggle-subtype]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleArray(state.onboard.subtypes, btn.getAttribute('data-toggle-subtype'));
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
        state.partnerStatus = 'Wordt bekeken';
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
            r.partnerNote = r.partnerNote || '';
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
        state.requests.forEach(function (r) {
          if (r.id === id) {
            r.status = 'declined';
            r.declineReason = btn.textContent;
            r.declinedAt = new Date().toISOString();
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
