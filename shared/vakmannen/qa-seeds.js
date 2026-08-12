/* ============================================================
   ELYAN Partner Lab — Category Intelligence QA seed partners
   Fictional only. One coherent partner per non-dak category.
   ============================================================ */
(function (global) {
  'use strict';
  var EV = global.ElyanVakmannen = global.ElyanVakmannen || {};
  var IMAGES = {
    hero: '/assets/photos/hero.jpg',
    editorial: '/assets/photos/editorial.jpg',
    why: '/assets/photos/why.jpg',
    about: '/assets/photos/about.jpg'
  };

  function svc(subtype, label, model, display, context, from, to) {
    return {
      subtype: subtype, label: label, model: model, display: display,
      context: context, from: from, to: to,
      pricing_model: model, min_price: from, max_price: to
    };
  }

  function partner(cfg) {
    var slug = cfg.slug || cfg.id;
    return {
      id: cfg.id,
      slug: slug,
      status: 'published',
      category: cfg.category,
      subtypes: cfg.subtypes,
      name: cfg.name,
      specialtyLine: cfg.specialtyLine,
      city: cfg.city,
      province: cfg.province || 'Antwerpen',
      radius: cfg.radius,
      priceLevel: cfg.priceLevel || '€€',
      capacity: cfg.capacityId || 'limited',
      startMonth: cfg.startMonth || 'Oktober 2026',
      visitSpeed: cfg.visitSpeed || '2w',
      visit: cfg.visit || 'Doorgaans binnen 7–14 dagen',
      years: cfg.years || 8,
      teamSize: cfg.teamSize || '4–6',
      image: cfg.image || IMAGES.editorial,
      objectPos: cfg.objectPos || '50% 40%',
      gallery: cfg.gallery || [IMAGES.editorial, IMAGES.hero, IMAGES.about, IMAGES.why],
      about: cfg.about,
      strength: (cfg.strengths && cfg.strengths[0]) || cfg.strength || '',
      strengths: cfg.strengths || [],
      method: cfg.method || ['Intake', 'Opmeting', 'Uitvoering'],
      prefer: cfg.prefer || '',
      avoid: cfg.avoid || '',
      materials: cfg.materials || '',
      values: cfg.values || '',
      differ: cfg.differ || '',
      minProject: cfg.minProject || 'Op aanvraag',
      minProjectValue: cfg.minProjectValue || 0,
      google: cfg.google || {
        enabled: true,
        consent: true,
        consentAt: '2026-06-01T10:00:00Z',
        live: false,
        rating: 4.4,
        count: 18,
        placeId: 'demo_' + cfg.id,
        url: 'https://maps.google.com/?q=' + encodeURIComponent(cfg.name + ' demo'),
        reviews: [{ author: 'Demo K.', text: 'Fictieve demo-review. Geen echte Google-data.' }]
      },
      services: cfg.services || [],
      publicFields: cfg.publicFields || { years: true, teamSize: false },
      showroom: cfg.showroom || false,
      demo: true,
      demoNote: 'Fictief QA-profiel · prijzen zijn placeholders'
    };
  }

  EV.QA_SEED_PARTNERS = [
    partner({
      id: 'badkamer-studio-nord',
      category: 'badkamer',
      subtypes: ['volledig', 'douche_ipv_bad', 'tegelwerken', 'sanitair'],
      name: 'Studio Nord Badkamers (demo)',
      specialtyLine: 'Compacte en totaalrenovaties badkamer',
      city: 'Antwerpen',
      radius: 'Antwerpen + 20 km',
      about: 'Fictief QA-profiel voor badkamer. Coördinatie van sanitair, tegelwerk en afwerking in één traject.',
      strengths: ['Totaalrenovatie', 'Douche i.p.v. bad', 'Nette oplevering'],
      minProject: 'Demo vanaf € 6.500',
      services: [
        svc('volledig', 'Volledige badkamerrenovatie', 'price_range', '€ 6.500 – € 18.000', 'Demo projectrange', 6500, 18000),
        svc('tegelwerken', 'Tegelwerken', 'per_m2', '€ 55 – € 95 / m²', 'Demo · tegelwerk', 55, 95),
        svc('douche_ipv_bad', 'Bad → douche', 'starting_price', 'Vanaf € 3.800', 'Demo vanafprijs', 3800, null)
      ]
    }),
    partner({
      id: 'keuken-atelier-lijn',
      category: 'keuken',
      subtypes: ['volledig', 'plaatsing', 'werkblad', 'maatwerk'],
      name: 'Atelier Lijn Keukens (demo)',
      specialtyLine: 'Ontwerp tot plaatsing',
      city: 'Mechelen',
      radius: 'Mechelen + 30 km',
      image: IMAGES.why,
      about: 'Fictief QA-profiel voor keuken. Focus op opmeting, maatwerk en plaatsing.',
      strengths: ['Maatwerk', 'Opmeting', 'Werkbladen'],
      publicFields: { years: true, showroom: true },
      showroom: true,
      minProject: 'Demo vanaf € 8.000',
      services: [
        svc('volledig', 'Volledige keuken', 'price_range', '€ 8.000 – € 28.000', 'Demo projectrange', 8000, 28000),
        svc('werkblad', 'Werkblad', 'per_linear_meter', '€ 280 – € 650 / lm', 'Demo · lopende meter', 280, 650),
        svc('plaatsing', 'Plaatsing', 'starting_price', 'Vanaf € 1.200', 'Demo plaatsingsprijs', 1200, null)
      ]
    }),
    partner({
      id: 'raamhuis-demo',
      category: 'ramen-deuren',
      subtypes: ['ramen', 'buitendeuren', 'schuif', 'screens'],
      name: 'Raamhuis Vlaanderen (demo)',
      specialtyLine: 'PVC en aluminium ramen',
      city: 'Gent',
      province: 'Oost-Vlaanderen',
      radius: 'Gent + 35 km',
      about: 'Fictief QA-profiel voor ramen & deuren. Opmeting, productie en plaatsing.',
      strengths: ['PVC', 'Aluminium', 'Screens'],
      minProject: 'Demo vanaf € 4.500',
      services: [
        svc('ramen', 'Ramen vervangen', 'per_item', 'Vanaf € 650 / raam', 'Demo per raam', 650, null),
        svc('buitendeuren', 'Buitendeur', 'per_item', 'Vanaf € 1.450', 'Demo per deur', 1450, null),
        svc('screens', 'Screens', 'per_item', 'Vanaf € 380', 'Demo per stuk', 380, null)
      ]
    }),
    partner({
      id: 'isolatie-warmeschil',
      category: 'isolatie',
      subtypes: ['dak', 'spouw', 'buitenmuur', 'vloer'],
      name: 'Warmeschil Isolatie (demo)',
      specialtyLine: 'Dak-, spouw- en gevelisolatie',
      city: 'Leuven',
      province: 'Vlaams-Brabant',
      radius: 'Leuven + 40 km',
      about: 'Fictief QA-profiel. Shared services: roof_insulation, external_wall_insulation, floor_insulation.',
      strengths: ['Spouw', 'Dakisolatie', 'Buitenmuur'],
      services: [
        svc('dak', 'Dakisolatie', 'per_m2', '€ 40 – € 70 / m²', 'Demo · shared roof_insulation', 40, 70),
        svc('spouw', 'Spouwmuurisolatie', 'per_m2', '€ 22 – € 35 / m²', 'Demo', 22, 35),
        svc('buitenmuur', 'Buitenmuurisolatie', 'per_m2', '€ 90 – € 150 / m²', 'Demo · shared external_wall_insulation', 90, 150)
      ]
    }),
    partner({
      id: 'warmteplus-demo',
      category: 'verwarming',
      subtypes: ['warmtepomp', 'hybride', 'vloerverwarming', 'onderhoud'],
      name: 'WarmtePlus (demo)',
      specialtyLine: 'Warmtepompen en afgifte',
      city: 'Hasselt',
      province: 'Limburg',
      radius: 'Hasselt + 35 km',
      about: 'Fictief QA-profiel. Shared: underfloor_heating.',
      strengths: ['Warmtepomp', 'Vloerverwarming', 'Onderhoud'],
      services: [
        svc('warmtepomp', 'Warmtepomp installatie', 'starting_price', 'Vanaf € 7.500', 'Demo vanafprijs', 7500, null),
        svc('vloerverwarming', 'Vloerverwarming', 'per_m2', '€ 45 – € 75 / m²', 'Demo · shared underfloor_heating', 45, 75),
        svc('onderhoud', 'Onderhoud', 'starting_price', 'Vanaf € 145', 'Demo onderhoudstarief', 145, null)
      ]
    }),
    partner({
      id: 'stroomlijn-elektro',
      category: 'elektriciteit',
      subtypes: ['volledig', 'kast', 'laadpaal', 'storing'],
      name: 'Stroomlijn Elektro (demo)',
      specialtyLine: 'Renovatie en laadpunten',
      city: 'Antwerpen',
      radius: 'Antwerpen + 25 km',
      about: 'Fictief QA-profiel. Shared: electrical_installation, ev_charging. AREI-keuring via erkend organisme.',
      strengths: ['Renovatie', 'Zekeringskast', 'Laadpaal'],
      services: [
        svc('volledig', 'Volledige installatie', 'price_range', '€ 4.500 – € 14.000', 'Demo projectrange', 4500, 14000),
        svc('laadpaal', 'Laadpaal', 'starting_price', 'Vanaf € 1.100', 'Demo · shared ev_charging', 1100, null),
        svc('storing', 'Storing / interventie', 'per_hour', '€ 65 – € 85 / uur', 'Demo uurprijs', 65, 85)
      ]
    }),
    partner({
      id: 'gevelzicht-demo',
      category: 'gevel',
      subtypes: ['renovatie', 'crepi', 'isolatie', 'voegen'],
      name: 'Gevelzicht (demo)',
      specialtyLine: 'Crepi en gevelisolatie',
      city: 'Brugge',
      province: 'West-Vlaanderen',
      radius: 'Brugge + 30 km',
      image: IMAGES.about,
      about: 'Fictief QA-profiel. Shared: external_wall_insulation.',
      strengths: ['Crepi', 'Isolatie', 'Voegwerken'],
      services: [
        svc('crepi', 'Crepi', 'per_m2', '€ 55 – € 95 / m²', 'Demo', 55, 95),
        svc('isolatie', 'Gevelisolatie', 'per_m2', '€ 90 – € 145 / m²', 'Demo · shared external_wall_insulation', 90, 145),
        svc('voegen', 'Voegwerken', 'per_m2', '€ 28 – € 48 / m²', 'Demo', 28, 48)
      ]
    }),
    partner({
      id: 'vloeratelier-demo',
      category: 'vloeren',
      subtypes: ['tegel', 'parket', 'chape', 'vloerverwarming'],
      name: 'Vloeratelier Zuid (demo)',
      specialtyLine: 'Tegel, parket en vloeropbouw',
      city: 'Wilrijk',
      radius: 'Wilrijk + 25 km',
      about: 'Fictief QA-profiel. Shared: underfloor_heating, floor_insulation.',
      strengths: ['Tegel', 'Parket', 'Chape'],
      services: [
        svc('tegel', 'Tegelvloer', 'per_m2', '€ 45 – € 85 / m²', 'Demo', 45, 85),
        svc('parket', 'Parket', 'per_m2', '€ 55 – € 110 / m²', 'Demo', 55, 110),
        svc('vloerverwarming', 'Vloerverwarming', 'per_m2', '€ 45 – € 70 / m²', 'Demo · shared underfloor_heating', 45, 70)
      ]
    }),
    partner({
      id: 'verf-lijn-demo',
      category: 'schilderwerken',
      subtypes: ['binnenmuren', 'plafonds', 'houtwerk', 'buiten'],
      name: 'Verf & Lijn (demo)',
      specialtyLine: 'Binnenafwerking met grondige voorbereiding',
      city: 'Schoten',
      radius: 'Schoten + 30 km',
      about: 'Fictief QA-profiel. Ondergrondstaat is een kritiek matchingveld.',
      strengths: ['Binnen', 'Voorbereiding', 'Houtwerk'],
      services: [
        svc('binnenmuren', 'Binnenmuren', 'per_m2', '€ 12 – € 28 / m²', 'Demo · afhankelijk van ondergrond', 12, 28),
        svc('houtwerk', 'Houtwerk', 'per_item', 'Vanaf € 180 / element', 'Demo', 180, null),
        svc('woning', 'Volledige woning', 'price_range', '€ 2.800 – € 9.500', 'Demo projectrange', 2800, 9500)
      ]
    }),
    partner({
      id: 'luchtstroom-demo',
      category: 'ventilatie',
      subtypes: ['d', 'c', 'onderhoud', 'reiniging'],
      name: 'Luchtstroom Systems (demo)',
      specialtyLine: 'Systeem D en onderhoud',
      city: 'Turnhout',
      radius: 'Turnhout + 40 km',
      about: 'Fictief QA-profiel. Shared: ventilation.',
      strengths: ['Systeem D', 'Onderhoud', 'Inregeling'],
      services: [
        svc('d', 'Systeem D', 'starting_price', 'Vanaf € 4.800', 'Demo · shared ventilation', 4800, null),
        svc('c', 'Systeem C', 'starting_price', 'Vanaf € 2.200', 'Demo', 2200, null),
        svc('onderhoud', 'Onderhoud', 'starting_price', 'Vanaf € 165', 'Demo', 165, null)
      ]
    }),
    partner({
      id: 'zonnekracht-demo',
      category: 'zonnepanelen',
      subtypes: ['nieuw', 'batterij', 'omvormer', 'laadpaal'],
      name: 'Zonnekracht Antwerpen (demo)',
      specialtyLine: 'PV, batterij en koppelingen',
      city: 'Antwerpen',
      radius: 'Antwerpen + 30 km',
      about: 'Fictief QA-profiel. Geen rendementclaims. Shared: ev_charging, electrical_installation.',
      strengths: ['Nieuwe PV', 'Thuisbatterij', 'Monitoring'],
      services: [
        svc('nieuw', 'Nieuwe PV-installatie', 'starting_price', 'Vanaf € 4.900', 'Demo · geen besparingsclaim', 4900, null),
        svc('batterij', 'Thuisbatterij', 'starting_price', 'Vanaf € 4.200', 'Demo', 4200, null),
        svc('laadpaal', 'Laadpaalkoppeling', 'starting_price', 'Vanaf € 1.050', 'Demo · shared ev_charging', 1050, null)
      ]
    })
  ];

  /* Merge into public PARTNERS so all 12 categories are discoverable */
  EV.QA_SEED_PARTNERS.forEach(function (p) {
    if (!EV.PARTNERS) EV.PARTNERS = [];
    var exists = false;
    for (var i = 0; i < EV.PARTNERS.length; i++) {
      if (EV.PARTNERS[i].id === p.id || EV.PARTNERS[i].slug === p.slug) { exists = true; break; }
    }
    if (!exists) EV.PARTNERS.push(p);
  });
})(typeof window !== 'undefined' ? window : global);
