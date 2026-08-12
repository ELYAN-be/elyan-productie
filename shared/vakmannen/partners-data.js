/* ============================================================
   ELYAN Vakmannen — partner seed data (fictional demo partners)
   Production: replace with API/DB. Only published, approved partners.
   ============================================================ */
(function (global) {
  'use strict';

  var IMAGES = {
    hero: '/assets/photos/hero.jpg',
    editorial: '/assets/photos/editorial.jpg',
    why: '/assets/photos/why.jpg',
    about: '/assets/photos/about.jpg'
  };

  function svc(subtype, label, model, display, context, from, to, unit) {
    return { subtype: subtype, label: label, model: model, display: display, context: context, from: from, to: to, unit: unit };
  }

  var PARTNERS = [
    {
      id: 'atelier-dak',
      slug: 'atelier-dak-antwerpen',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'isolatie', 'bedekking', 'dakvenster'],
      name: 'Atelier Dak Antwerpen',
      specialtyLine: 'Hellende daken met zorgvuldige afwerking',
      city: 'Antwerpen',
      province: 'Antwerpen',
      radius: 'Antwerpen + 25 km',
      capacity: 'limited',
      startMonth: 'Oktober 2026',
      visitSpeed: '2w',
      years: 12,
      teamSize: '6–10',
      publicFields: { years: true, teamSize: false },
      image: IMAGES.hero,
      objectPos: '50% 30%',
      gallery: [IMAGES.hero, IMAGES.why, IMAGES.editorial],
      strength: 'Hellende daken met nette afwerking',
      prefer: 'Gezinswoningen en kwaliteitsrenovaties',
      avoid: 'Spoedwerken zonder opmeting',
      materials: 'Keramische pannen, isolatiepakketten',
      values: 'Duidelijke planning en nette werf',
      differ: 'Aandacht voor details en oplevering',
      about: 'Atelier Dak Antwerpen werkt al twaalf jaar aan hellende dakrenovaties waarbij materiaalkeuze, details en planning evenveel aandacht krijgen als de technische uitvoering. Het team neemt vooral kwaliteitsrenovaties voor gezinswoningen aan en laat bewust haastprojecten links liggen.',
      minProject: 'Vanaf € 8.500 voor volledige renovaties',
      google: {
        enabled: true,
        consent: true,
        consentAt: '2026-08-01T10:00:00Z',
        placeId: 'demo_place_atelier_dak',
        live: false,
        rating: 4.7,
        count: 83,
        url: 'https://maps.google.com/?q=Atelier+Dak+Antwerpen',
        reviews: [
          { author: 'Annelies V.', text: 'Nette werf, duidelijke planning en nette afwerking van het hellend dak.' },
          { author: 'Pieter D.', text: 'Goede uitleg over isolatieopties. Prijs bleef dicht bij de indicatie.' }
        ]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2_range', '€ 160 – € 230 / m²', 'Richtprijs dakrenovatie', 160, 230, 'm²'),
        svc('isolatie', 'Dakisolatie', 'm2_range', '€ 45 – € 75 / m²', 'Richtprijs isolatie', 45, 75, 'm²'),
        svc('herstelling', 'Kleine dakherstelling', 'from', 'Vanaf € 350', 'Kleine interventie', 350, null, null),
        svc('dakvenster', 'Dakvenster plaatsen', 'from', 'Vanaf € 1.200', 'Per venster, excl. afwerking', 1200, null, null)
      ]
    },
    {
      id: 'vermeulen',
      slug: 'vermeulen-dakwerken',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['hellend', 'isolatie', 'goten', 'herstelling'],
      name: 'Vermeulen Dakwerken',
      specialtyLine: 'Hellende daken en isolatie voor gezinswoningen',
      city: 'Mechelen',
      province: 'Antwerpen',
      radius: 'Mechelen + 35 km',
      capacity: 'limited',
      startMonth: 'November 2026',
      visitSpeed: '2w',
      years: 18,
      teamSize: '4–6',
      publicFields: { years: true, teamSize: false },
      image: IMAGES.editorial,
      objectPos: '45% 40%',
      gallery: [IMAGES.editorial, IMAGES.hero, IMAGES.about],
      strength: 'Hellende daken en dakisolatie',
      prefer: 'Isolatie en dakvernieuwing samen',
      avoid: 'Puurluxe designprojecten',
      materials: 'Pannen, minerale wol',
      values: 'Eerlijke planning',
      differ: 'Familiebedrijf met korte lijnen',
      about: 'Vermeulen Dakwerken is een familiebedrijf met focus op hellende daken en dakisolatie. Ze werken graag met een helder plan en nemen projecten aan waar comfortverbetering centraal staat.',
      minProject: 'Vanaf € 6.000',
      google: {
        enabled: true, consent: true, consentAt: '2026-07-15T10:00:00Z',
        placeId: 'demo_vermeulen', live: false, rating: 4.5, count: 61,
        url: 'https://maps.google.com/?q=Vermeulen+Dakwerken',
        reviews: [{ author: 'Sofie M.', text: 'Duidelijke communicatie over isolatie en planning.' }]
      },
      services: [
        svc('hellend', 'Hellend dak vernieuwen', 'm2_range', '€ 150 – € 205 / m²', 'Richtprijs hellend dak', 150, 205, 'm²'),
        svc('isolatie', 'Dakisolatie', 'm2_range', '€ 40 – € 70 / m²', 'Richtprijs isolatie', 40, 70, 'm²'),
        svc('herstelling', 'Herstelling / lekkage', 'from', 'Vanaf € 280', 'Kleine interventie', 280, null, null),
        svc('goten', 'Goten vernieuwen', 'lm_range', '€ 55 – € 85 / lm', 'Per lopende meter', 55, 85, 'lm')
      ]
    },
    {
      id: 'noorddak',
      slug: 'noorddak',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['plat', 'bedekking', 'herstelling', 'goten'],
      name: 'Noorddak',
      specialtyLine: 'EPDM en platte dakrenovaties',
      city: 'Brasschaat',
      province: 'Antwerpen',
      radius: 'Brasschaat + 30 km',
      capacity: 'available',
      startMonth: 'September 2026',
      visitSpeed: '1w',
      years: 9,
      teamSize: '3–5',
      publicFields: { years: false, teamSize: false },
      image: IMAGES.about,
      objectPos: '50% 45%',
      gallery: [IMAGES.about, IMAGES.hero, IMAGES.editorial],
      strength: 'Platte daken en EPDM',
      prefer: 'Platte daken',
      avoid: 'Complexe hellende monumenten',
      materials: 'EPDM, bitumen',
      values: 'Praktisch en helder',
      differ: 'Snelle opmeting',
      about: 'Noorddak specialiseert zich in platte daken en EPDM. Praktische aanpak, korte lijnen, duidelijke opmeting vóór prijsafspraak.',
      minProject: 'Vanaf € 5.500',
      google: {
        enabled: true, consent: true, consentAt: '2026-06-01T10:00:00Z',
        placeId: 'demo_noorddak', live: false, rating: 4.6, count: 44,
        url: 'https://maps.google.com/?q=Noorddak',
        reviews: [{ author: 'Tom R.', text: 'EPDM netjes geplaatst, snelle planning.' }]
      },
      services: [
        svc('plat', 'Plat dak renovatie', 'm2_range', '€ 135 – € 190 / m²', 'Richtprijs plat dak', 135, 190, 'm²'),
        svc('bedekking', 'EPDM dakbedekking', 'm2_range', '€ 120 – € 175 / m²', 'Richtprijs bedekking', 120, 175, 'm²'),
        svc('herstelling', 'Lekkage / herstelling', 'from', 'Vanaf € 250', 'Inspectie + herstelling', 250, null, null)
      ]
    },
    {
      id: 'dak-vorm',
      slug: 'dak-en-vorm',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'constructie', 'dakvenster', 'schoorsteen'],
      name: 'Dak & Vorm',
      specialtyLine: 'Architecturale dakdetails en maatwerk',
      city: 'Antwerpen',
      province: 'Antwerpen',
      radius: 'Antwerpen + 20 km',
      capacity: 'full',
      startMonth: 'December 2026',
      visitSpeed: 'afspraak',
      years: 14,
      teamSize: '8–12',
      publicFields: { years: true, teamSize: false },
      image: IMAGES.why,
      objectPos: '55% 35%',
      gallery: [IMAGES.why, IMAGES.about, IMAGES.hero],
      strength: 'Maatwerkdetails en dakkapellen',
      prefer: 'Design-gerichte renovaties',
      avoid: 'Pure spoedherstellingen',
      materials: 'Leien, zinkdetails, houtconstructie',
      values: 'Afwerking en vorm',
      differ: 'Architecturale details',
      about: 'Dak & Vorm werkt aan renovaties waar vormgeving en technische uitvoering samenkomen. Sterk in details, dakkapellen en zorgvuldig timmerwerk.',
      minProject: 'Vanaf € 10.000',
      google: {
        enabled: true, consent: true, consentAt: '2026-05-01T10:00:00Z',
        placeId: 'demo_dakvorm', live: false, rating: 4.8, count: 37,
        url: 'https://maps.google.com/?q=Dak+Vorm',
        reviews: [{ author: 'Elena K.', text: 'Prachtige details, wel langere wachttijd.' }]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2_range', '€ 175 – € 250 / m²', 'Richtprijs renovatie', 175, 250, 'm²'),
        svc('dakvenster', 'Dakvenster / dakkapel', 'on_request', 'Prijs op aanvraag', 'Na opmeting', null, null, null),
        svc('constructie', 'Dakconstructie', 'after_visit', 'Prijs na plaatsbezoek', 'Na plaatsbezoek', null, null, null)
      ]
    },
    {
      id: 'vandenbroeck',
      slug: 'van-den-broeck-dakprojecten',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['volledig', 'hellend', 'herstelling', 'goten', 'schoorsteen'],
      name: 'Van den Broeck Dakprojecten',
      specialtyLine: 'Renovatieprojecten voor rijwoningen',
      city: 'Schoten',
      province: 'Antwerpen',
      radius: 'Schoten + 40 km',
      capacity: 'available',
      startMonth: 'Oktober 2026',
      visitSpeed: '2w',
      years: 22,
      teamSize: '10–15',
      publicFields: { years: true, teamSize: true },
      image: IMAGES.hero,
      objectPos: '60% 45%',
      gallery: [IMAGES.hero, IMAGES.editorial, IMAGES.why],
      strength: 'Rijwoningen en begeleiding',
      prefer: 'Gezinswoningen',
      avoid: 'Industrieel vastgoed',
      materials: 'Pannen, goten, standaardisolatie',
      values: 'Voorspelbaar proces',
      differ: 'Ervaring met rijwoningen',
      about: 'Van den Broeck begeleidt gezinnen door een overzichtelijk renovatieproces, van opmeting tot oplevering. Ervaren in rijwoningen en halfopen bebouwing.',
      minProject: 'Vanaf € 7.000',
      google: {
        enabled: true, consent: true, consentAt: '2026-04-01T10:00:00Z',
        placeId: 'demo_vdb', live: false, rating: 4.4, count: 102,
        url: 'https://maps.google.com/?q=VandenBroeck',
        reviews: [{ author: 'Karel B.', text: 'Betrouwbaar traject voor onze rijwoning.' }]
      },
      services: [
        svc('volledig', 'Volledige dakrenovatie', 'm2_range', '€ 155 – € 215 / m²', 'Richtprijs renovatie', 155, 215, 'm²'),
        svc('herstelling', 'Herstelling', 'from', 'Vanaf € 300', 'Kleine interventie', 300, null, null),
        svc('goten', 'Goten', 'lm_range', '€ 50 – € 80 / lm', 'Per lopende meter', 50, 80, 'lm')
      ]
    },
    {
      id: 'rooftop',
      slug: 'rooftop-construct',
      status: 'published',
      category: 'dakwerken',
      subtypes: ['volledig', 'plat', 'bedekking', 'isolatie'],
      name: 'Rooftop Construct',
      specialtyLine: 'Efficiënte vernieuwing met heldere afspraken',
      city: 'Wilrijk',
      province: 'Antwerpen',
      radius: 'Wilrijk + 30 km',
      capacity: 'limited',
      startMonth: 'September 2026',
      visitSpeed: '1w',
      years: 7,
      teamSize: '5–8',
      publicFields: { years: false, teamSize: false },
      image: IMAGES.editorial,
      objectPos: '35% 55%',
      gallery: [IMAGES.editorial, IMAGES.about, IMAGES.hero],
      strength: 'Efficiënte standaard vernieuwingen',
      prefer: 'Standaard vernieuwingen',
      avoid: 'Zwaar architecturaal maatwerk',
      materials: 'Standaardpakketten',
      values: 'Duidelijkheid vooraf',
      differ: 'Heldere scope en planning',
      about: 'Rooftop Construct richt zich op goed georganiseerde dakvernieuwingen met duidelijke prijsafspraken vooraf. Ideaal voor standaard vernieuwingen zonder zwaar maatwerk.',
      minProject: 'Vanaf € 4.800',
      google: {
        enabled: true, consent: true, consentAt: '2026-03-01T10:00:00Z',
        placeId: 'demo_rooftop', live: false, rating: 4.3, count: 29,
        url: 'https://maps.google.com/?q=Rooftop+Construct',
        reviews: [{ author: 'Lynn S.', text: 'Snel en duidelijk over de prijs.' }]
      },
      services: [
        svc('volledig', 'Dakvernieuwing', 'from', 'Vanaf € 4.800', 'Standaard project', 4800, null, null),
        svc('plat', 'Plat dak', 'm2_range', '€ 125 – € 180 / m²', 'Richtprijs plat dak', 125, 180, 'm²'),
        svc('isolatie', 'Isolatie', 'm2_range', '€ 38 – € 65 / m²', 'Richtprijs isolatie', 38, 65, 'm²')
      ]
    }
  ];

  function published() {
    return PARTNERS.filter(function (p) { return p.status === 'published'; });
  }

  function bySlug(slug) {
    for (var i = 0; i < PARTNERS.length; i++) if (PARTNERS[i].slug === slug) return PARTNERS[i];
    return null;
  }

  function byId(id) {
    for (var i = 0; i < PARTNERS.length; i++) if (PARTNERS[i].id === id) return PARTNERS[i];
    return null;
  }

  global.ElyanVakmannen = global.ElyanVakmannen || {};
  global.ElyanVakmannen.IMAGES = IMAGES;
  global.ElyanVakmannen.PARTNERS = PARTNERS;
  global.ElyanVakmannen.publishedPartners = published;
  global.ElyanVakmannen.partnerBySlug = bySlug;
  global.ElyanVakmannen.partnerById = byId;
})(typeof window !== 'undefined' ? window : global);
