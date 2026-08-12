/* ============================================================
   ELYAN Partner Lab V2: local demo experience
   ============================================================ */
(function () {
  'use strict';

  var IMAGES = {
    hero: '/assets/photos/hero.jpg',
    editorial: '/assets/photos/editorial.jpg',
    why: '/assets/photos/why.jpg',
    about: '/assets/photos/about.jpg'
  };

  var CATEGORIES = [
    { id: 'dakwerken', label: 'Dakwerken', img: IMAGES.hero, pos: '50% 35%' },
    { id: 'badkamer', label: 'Badkamer', tone: 'sage' },
    { id: 'keuken', label: 'Keuken', img: IMAGES.why, pos: '50% 60%' },
    { id: 'ramen-deuren', label: 'Ramen & deuren', tone: 'deep' },
    { id: 'isolatie', label: 'Isolatie', tone: 'olive' },
    { id: 'verwarming', label: 'Verwarming', tone: 'sage' },
    { id: 'elektriciteit', label: 'Elektriciteit', tone: 'deep' },
    { id: 'gevel', label: 'Gevel', img: IMAGES.about, pos: '50% 40%' },
    { id: 'vloeren', label: 'Vloeren', img: IMAGES.editorial, pos: '40% 50%' },
    { id: 'schilderwerken', label: 'Schilderwerken', tone: 'sage' },
    { id: 'ventilatie', label: 'Ventilatie', tone: 'deep' },
    { id: 'zonnepanelen', label: 'Zonnepanelen', tone: 'olive' }
  ];

  var COMPANIES = [
    {
      id: 'atelier-dak',
      name: 'Atelier Dak Antwerpen',
      tagline: 'Premium dakrenovaties met rustige, duurzame afwerking.',
      focus: 'Premium renovaties',
      city: 'Antwerpen',
      radius: 'Antwerpen + 25 km',
      priceLevel: '€€€',
      availability: 'Beperkt beschikbaar',
      start: 'Oktober 2026',
      founding: true,
      specialties: ['Dakrenovatie', 'Hellende daken', 'Dakisolatie'],
      image: IMAGES.hero,
      objectPos: '50% 30%',
      gallery: [IMAGES.hero, IMAGES.why, IMAGES.editorial, IMAGES.about],
      about: 'Atelier Dak Antwerpen richt zich op zorgvuldig uitgevoerde dakrenovaties waarbij materiaalkeuze, details en planning even belangrijk zijn als de prijs.',
      minProject: '€ 8.500',
      projectTypes: 'Hellende daken, renovatie met isolatie',
      elyanRange: '€ 145 – € 210 / m²',
      partnerRange: '€ 160 – € 230 / m²',
      priceDetails: [
        { label: 'Vanaf-prijs', value: 'vanaf € 8.500' },
        { label: 'Minimum projectbedrag', value: '€ 8.500' },
        { label: 'Meerwerk', value: '€ 65 / uur' },
        { label: 'Verplaatsing', value: 'Meestal inbegrepen binnen werkgebied' },
        { label: 'Materiaal', value: 'Inbegrepen in €/m²' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Meestal binnen 7 tot 14 dagen',
      included: ['Opmeting', 'Materiaal', 'Plaatsing', 'Afwerking', 'Opruiming'],
      excluded: 'Structurele herstellingen, asbestsanering en werken buiten de scope.'
    },
    {
      id: 'vermeulen',
      name: 'Vermeulen Dakwerken',
      tagline: 'Sterk in hellende daken en dakisolatie voor gezinswoningen.',
      focus: 'Hellende daken & isolatie',
      city: 'Mechelen',
      radius: 'Mechelen + 35 km',
      priceLevel: '€€',
      availability: 'Beperkt beschikbaar',
      start: 'November 2026',
      founding: true,
      specialties: ['Hellende daken', 'Dakisolatie'],
      image: IMAGES.editorial,
      objectPos: '45% 40%',
      gallery: [IMAGES.editorial, IMAGES.hero, IMAGES.about, IMAGES.why],
      about: 'Vermeulen Dakwerken werkt vooral voor woningeigenaars die een duidelijk plan willen voor hellende daken en isolatie.',
      minProject: '€ 6.000',
      projectTypes: 'Hellende daken, isolatiepakketten',
      elyanRange: '€ 140 – € 200 / m²',
      partnerRange: '€ 150 – € 205 / m²',
      priceDetails: [
        { label: 'Prijs per m²', value: '€ 150 – € 205' },
        { label: 'Minimum projectbedrag', value: '€ 6.000' },
        { label: 'Materiaal', value: 'Inbegrepen' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Binnen 10 tot 15 dagen',
      included: ['Opmeting', 'Materiaal', 'Plaatsing', 'Opruiming'],
      excluded: 'Gevelwerken en binnenaanpassingen.'
    },
    {
      id: 'noorddak',
      name: 'Noorddak',
      tagline: 'Gespecialiseerd in EPDM en platte dakrenovaties.',
      focus: 'EPDM & platte daken',
      city: 'Brasschaat',
      radius: 'Brasschaat + 30 km',
      priceLevel: '€€',
      availability: 'Nieuwe projecten mogelijk',
      start: 'September 2026',
      founding: false,
      specialties: ['Platte daken', 'EPDM'],
      image: IMAGES.about,
      objectPos: '50% 45%',
      gallery: [IMAGES.about, IMAGES.hero, IMAGES.editorial, IMAGES.why],
      about: 'Noorddak focust op platte daken en EPDM-oplossingen met een praktische, heldere aanpak.',
      minProject: '€ 5.500',
      projectTypes: 'Platte daken, EPDM',
      elyanRange: '€ 120 – € 185 / m²',
      partnerRange: '€ 135 – € 190 / m²',
      priceDetails: [
        { label: 'Vanaf-prijs', value: 'vanaf € 5.500' },
        { label: 'Materiaal', value: 'Inbegrepen' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Meestal binnen een week',
      included: ['Opmeting', 'Materiaal', 'Plaatsing'],
      excluded: 'Binnenafwerking en dakkapellen.'
    },
    {
      id: 'dak-vorm',
      name: 'Dak & Vorm',
      tagline: 'Architecturale dakdetails voor renovaties met uitstraling.',
      focus: 'Architecturale details',
      city: 'Antwerpen',
      radius: 'Antwerpen + 20 km',
      priceLevel: '€€€',
      availability: 'Volzet tot september',
      start: 'December 2026',
      founding: false,
      specialties: ['Dakrenovatie', 'Dakkapellen'],
      image: IMAGES.why,
      objectPos: '55% 35%',
      gallery: [IMAGES.why, IMAGES.about, IMAGES.hero, IMAGES.editorial],
      about: 'Dak & Vorm werkt graag aan renovaties waar vormgeving en technische uitvoering samenkomen.',
      minProject: '€ 10.000',
      projectTypes: 'Design-gerichte dakrenovaties',
      elyanRange: '€ 150 – € 220 / m²',
      partnerRange: '€ 175 – € 250 / m²',
      priceDetails: [
        { label: 'Prijsrange', value: '€ 175 – € 250 / m²' },
        { label: 'Minimum projectbedrag', value: '€ 10.000' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Op afspraak',
      included: ['Opmeting', 'Materiaal', 'Plaatsing', 'Afwerking'],
      excluded: 'Interieurwerken.'
    },
    {
      id: 'vandenbroeck',
      name: 'Van den Broeck Dakprojecten',
      tagline: 'Betrouwbare renovatieprojecten voor rijwoningen en halfopen bebouwing.',
      focus: 'Gezinswoningen',
      city: 'Schoten',
      radius: 'Schoten + 40 km',
      priceLevel: '€€',
      availability: 'Nieuwe projecten mogelijk',
      start: 'Oktober 2026',
      founding: true,
      specialties: ['Dakrenovatie', 'Hellende daken'],
      image: IMAGES.hero,
      objectPos: '60% 45%',
      gallery: [IMAGES.hero, IMAGES.editorial, IMAGES.why, IMAGES.about],
      about: 'Van den Broeck Dakprojecten begeleidt gezinnen door een overzichtelijk renovatieproces, van opmeting tot oplevering.',
      minProject: '€ 7.000',
      projectTypes: 'Rijwoningen, halfopen bebouwing',
      elyanRange: '€ 140 – € 205 / m²',
      partnerRange: '€ 155 – € 215 / m²',
      priceDetails: [
        { label: 'Prijs per m²', value: '€ 155 – € 215' },
        { label: 'Verplaatsing', value: '€ 40 buiten kernzone' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Binnen 7 tot 12 dagen',
      included: ['Opmeting', 'Materiaal', 'Plaatsing', 'Opruiming'],
      excluded: 'Asbestsanering.'
    },
    {
      id: 'rooftop',
      name: 'Rooftop Construct',
      tagline: 'Efficiënte dakvernieuwing met duidelijke prijsafspraken vooraf.',
      focus: 'Efficiënte vernieuwing',
      city: 'Wilrijk',
      radius: 'Wilrijk + 30 km',
      priceLevel: '€',
      availability: 'Beperkt beschikbaar',
      start: 'September 2026',
      founding: false,
      specialties: ['Dakrenovatie', 'Platte daken'],
      image: IMAGES.editorial,
      objectPos: '35% 55%',
      gallery: [IMAGES.editorial, IMAGES.about, IMAGES.hero, IMAGES.why],
      about: 'Rooftop Construct is een demo-bedrijf met focus op snelle, goed georganiseerde dakvernieuwingen.',
      minProject: '€ 4.800',
      projectTypes: 'Standaard vernieuwingen',
      elyanRange: '€ 130 – € 190 / m²',
      partnerRange: '€ 140 – € 185 / m²',
      priceDetails: [
        { label: 'Vanaf-prijs', value: 'vanaf € 4.800' },
        { label: 'Materiaal', value: 'Deels inbegrepen' },
        { label: 'Btw-basis', value: 'Exclusief btw' }
      ],
      visit: 'Binnen 5 tot 10 dagen',
      included: ['Opmeting', 'Plaatsing', 'Opruiming'],
      excluded: 'Premium materialen en maatwerkdetails.'
    }
  ];

  var state = {
    view: 'discover',
    category: 'dakwerken',
    location: 'Antwerpen',
    availability: 'alle',
    priceLevel: 'alle',
    sort: 'aanbevolen',
    activeCompanyId: 'atelier-dak',
    partnerMode: 'onboarding',
    partnerPanel: 'overzicht',
    onboardStep: 0,
    onboard: {
      companyName: 'Atelier Dak Antwerpen',
      vat: 'BE 0999.000.111 (demo)',
      website: 'https://demo.elyan.be/atelier-dak',
      phone: '+32 3 111 22 33',
      email: 'atelier.demo@elyan.demo',
      categories: ['Dakwerken', 'Isolatie'],
      area: 'Antwerpen + 25 km',
      minProject: '€ 8.500',
      priceModel: 'Prijsrange per m²',
      priceFrom: '160',
      priceTo: '230',
      material: 'Ja',
      vatBasis: 'Exclusief',
      capacity: 'Beperkt beschikbaar',
      startMonth: 'Oktober 2026',
      visitSpeed: '7 tot 14 dagen',
      years: '12 jaar',
      strength: 'Hellende daken met nette afwerking',
      prefer: 'Gezinswoningen en kwaliteitsrenovaties',
      materials: 'Keramische pannen, isolatiepakketten',
      values: 'Duidelijke planning en nette werf'
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
        title: 'Dakrenovatie',
        location: 'Antwerpen',
        size: '110 m²',
        timing: 'Najaar 2026',
        budget: '€ 18.000 – € 24.000',
        wishes: 'Hellend dak vernieuwen + isolatie verbeteren',
        status: 'nieuw'
      },
      {
        id: 'a2',
        title: 'Plat dak',
        location: 'Berchem',
        size: '65 m²',
        timing: 'Oktober 2026',
        budget: 'niet opgegeven',
        wishes: 'EPDM vervangen, snelle planning',
        status: 'nieuw'
      },
      {
        id: 'a3',
        title: 'Dakisolatie',
        location: 'Schoten',
        size: 'zoldervloer',
        timing: 'Flexibel',
        budget: '€ 4.500 – € 7.000',
        wishes: 'Comfort verbeteren zonder volledig dak te vernieuwen',
        status: 'interessant'
      }
    ],
    priceChange: {
      label: 'Dakrenovatie',
      current: '€ 160 – € 230 / m²',
      proposed: '€ 175 – € 245 / m²',
      status: 'wacht'
    },
    adminNote: ''
  };

  var ONBOARD_STEPS = [
    'Bedrijf', 'Vakgebied', 'Werkgebied', 'Projecten', 'Prijzen',
    'Beschikbaarheid', 'Projectfoto’s', 'Bedrijf leren kennen', 'Controle'
  ];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function companyById(id) {
    for (var i = 0; i < COMPANIES.length; i++) if (COMPANIES[i].id === id) return COMPANIES[i];
    return COMPANIES[0];
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setView(name) {
    state.view = name;
    $all('.lab-view').forEach(function (el) {
      var on = el.getAttribute('data-view') === name;
      el.classList.toggle('is-active', on);
      el.hidden = !on;
    });
    $all('.lab-tab').forEach(function (btn) {
      var on = btn.getAttribute('data-lab-view') === name;
      btn.classList.toggle('is-active', on);
    });
    render();
    window.scrollTo(0, 0);
  }

  function openProfile(id) {
    state.activeCompanyId = id;
    setView('profile');
  }

  function openContact() {
    var modal = $('#contactModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('lock-scroll');
  }
  function closeContact() {
    var modal = $('#contactModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('lock-scroll');
  }

  function filteredCompanies() {
    var list = COMPANIES.slice();
    if (state.availability !== 'alle') {
      list = list.filter(function (c) {
        if (state.availability === 'beschikbaar') return /mogelijk|Beschikbaar/i.test(c.availability) && !/Beperkt|Volzet/i.test(c.availability);
        if (state.availability === 'beperkt') return /Beperkt/i.test(c.availability);
        if (state.availability === 'volzet') return /Volzet/i.test(c.availability);
        return true;
      });
    }
    if (state.priceLevel !== 'alle') {
      list = list.filter(function (c) { return c.priceLevel === state.priceLevel; });
    }
    if (state.sort === 'prijs') {
      var order = { '€': 1, '€€': 2, '€€€': 3 };
      list.sort(function (a, b) { return (order[a.priceLevel] || 9) - (order[b.priceLevel] || 9); });
    } else if (state.sort === 'beschikbaar') {
      list.sort(function (a, b) { return a.start.localeCompare(b.start); });
    }
    return list;
  }

  function renderDiscover() {
    var host = $('#view-discover');
    if (!host) return;
    var cats = CATEGORIES.map(function (c) {
      var cls = 'lab-cat' + (c.id === state.category ? ' is-active' : '');
      if (c.tone === 'sage') cls += ' is-tone';
      if (c.tone === 'deep') cls += ' is-tone is-tone-alt';
      if (c.tone === 'olive') cls += ' is-tone is-tone-olive';
      var media = c.img
        ? '<img src="' + c.img + '" alt="" style="object-position:' + (c.pos || '50% 50%') + '" loading="lazy">'
        : '';
      return '<button type="button" class="' + cls + '" data-cat="' + c.id + '">' + media +
        '<strong>' + escapeHtml(c.label) + '</strong><span>Demo-categorie</span></button>';
    }).join('');

    var companies = filteredCompanies().map(function (c) {
      return (
        '<article class="lab-company-card">' +
          '<div class="lab-company-media">' +
            '<img src="' + c.image + '" alt="" style="object-position:' + c.objectPos + '" loading="lazy">' +
            '<span class="lab-demo-chip">Fictief demo-bedrijf</span>' +
          '</div>' +
          '<div class="lab-company-body">' +
            '<div class="lab-company-meta">' +
              (c.founding ? '<span class="lab-pill is-founding">Founding Partner</span>' : '') +
              '<span class="lab-pill">' + escapeHtml(c.focus) + '</span>' +
            '</div>' +
            '<h3>' + escapeHtml(c.name) + '</h3>' +
            '<p class="lab-company-tagline">' + escapeHtml(c.tagline) + '</p>' +
            '<div class="lab-company-facts">' +
              '<div><span>Werkgebied</span><strong>' + escapeHtml(c.radius) + '</strong></div>' +
              '<div><span>Prijsniveau</span><strong>' + escapeHtml(c.priceLevel) + '</strong></div>' +
              '<div><span>Start</span><strong>' + escapeHtml(c.start) + '</strong></div>' +
              '<div><span>Capaciteit</span><strong>' + escapeHtml(c.availability) + '</strong></div>' +
            '</div>' +
            '<div class="lab-company-actions">' +
              '<button type="button" class="btn btn-primary btn-sm" data-open-profile="' + c.id + '">Bekijk profiel</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-open-contact>Contact aanvragen</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    host.innerHTML =
      '<section class="lab-discover-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker">Vakmannen</p>' +
        '<h1>Vind de juiste vakman voor jouw renovatie.</h1>' +
        '<p class="lead">Kies wat je wilt renoveren en ontdek relevante vakbedrijven in jouw regio.</p>' +
        '<form class="lab-search" id="discoverSearch">' +
          '<label>Categorie<select name="category">' +
            CATEGORIES.map(function (c) {
              return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + escapeHtml(c.label) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label>Locatie / postcode<input name="location" value="' + escapeHtml(state.location) + '"></label>' +
          '<button type="submit" class="btn btn-primary">Bekijk vakbedrijven</button>' +
        '</form>' +
      '</div></section>' +
      '<section class="lab-wrap lab-cats">' +
        '<h2>Renovatiecategorieën</h2>' +
        '<div class="lab-cat-grid">' + cats + '</div>' +
      '</section>' +
      '<section class="lab-wrap lab-results">' +
        '<div class="lab-results-head">' +
          '<div>' +
            '<p class="lab-demo-chip">Demoresultaat</p>' +
            '<h2>Dakwerken rond Antwerpen</h2>' +
            '<p class="lab-hint">6 fictieve vakbedrijven. Geen echte ondernemingen.</p>' +
          '</div>' +
          '<div class="lab-filters">' +
            '<select id="filterAvail">' +
              '<option value="alle"' + (state.availability === 'alle' ? ' selected' : '') + '>Beschikbaarheid</option>' +
              '<option value="beschikbaar"' + (state.availability === 'beschikbaar' ? ' selected' : '') + '>Nieuwe projecten mogelijk</option>' +
              '<option value="beperkt"' + (state.availability === 'beperkt' ? ' selected' : '') + '>Beperkt beschikbaar</option>' +
              '<option value="volzet"' + (state.availability === 'volzet' ? ' selected' : '') + '>Volzet</option>' +
            '</select>' +
            '<select id="filterPrice">' +
              '<option value="alle"' + (state.priceLevel === 'alle' ? ' selected' : '') + '>Prijsniveau</option>' +
              '<option value="€"' + (state.priceLevel === '€' ? ' selected' : '') + '>€</option>' +
              '<option value="€€"' + (state.priceLevel === '€€' ? ' selected' : '') + '>€€</option>' +
              '<option value="€€€"' + (state.priceLevel === '€€€' ? ' selected' : '') + '>€€€</option>' +
            '</select>' +
            '<select id="filterSort">' +
              '<option value="aanbevolen"' + (state.sort === 'aanbevolen' ? ' selected' : '') + '>Aanbevolen</option>' +
              '<option value="beschikbaar"' + (state.sort === 'beschikbaar' ? ' selected' : '') + '>Eerst beschikbaar</option>' +
              '<option value="prijs"' + (state.sort === 'prijs' ? ' selected' : '') + '>Prijsniveau</option>' +
            '</select>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="toggleMoreFilters">Meer filters</button>' +
            '<div class="lab-more-filters" id="moreFilters">' +
              '<select disabled><option>Afstand (demo)</option></select>' +
              '<select disabled><option>Specialisatie (demo)</option></select>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="lab-company-grid">' + companies + '</div>' +
      '</section>';
  }

  function renderProfile() {
    var host = $('#view-profile');
    if (!host) return;
    var c = companyById(state.activeCompanyId);
    var gallery = c.gallery.map(function (src, i) {
      return '<figure><img src="' + src + '" alt="Demo projectfoto ' + (i + 1) + '" loading="lazy"></figure>';
    }).join('');
    var details = c.priceDetails.map(function (d) {
      return '<li><span>' + escapeHtml(d.label) + '</span><strong>' + escapeHtml(d.value) + '</strong></li>';
    }).join('');
    var included = c.included.map(function (x) {
      return '<li><svg class="icon"><use href="#i-check"></use></svg>' + escapeHtml(x) + '</li>';
    }).join('');

    host.innerHTML =
      '<section class="lab-profile-hero">' +
        '<div class="lab-profile-hero-media"><img src="' + c.image + '" alt="" style="object-position:' + c.objectPos + '"></div>' +
        '<div class="lab-profile-hero-content"><div class="lab-wrap">' +
          '<span class="lab-demo-chip">Fictief demo-bedrijf</span>' +
          (c.founding ? '<p class="lab-kicker" style="color:#fff;margin-top:12px;">Founding Partner</p>' : '') +
          '<h1>' + escapeHtml(c.name) + '</h1>' +
          '<div class="lab-profile-hero-meta">' +
            '<span class="lab-pill">' + escapeHtml(c.city) + '</span>' +
            '<span class="lab-pill">' + escapeHtml(c.radius) + '</span>' +
            '<span class="lab-pill">' + escapeHtml(c.priceLevel) + '</span>' +
            '<span class="lab-pill">' + escapeHtml(c.availability) + '</span>' +
            c.specialties.slice(0, 3).map(function (s) { return '<span class="lab-pill">' + escapeHtml(s) + '</span>'; }).join('') +
          '</div>' +
          '<div class="lab-profile-hero-actions">' +
            '<button type="button" class="btn btn-primary" data-open-contact>Contact aanvragen <svg class="icon"><use href="#i-arrow"></use></svg></button>' +
            '<a class="btn btn-ghost" href="#profile-prices">Bekijk prijzen</a>' +
          '</div>' +
        '</div></div>' +
      '</section>' +
      '<div class="lab-wrap lab-profile-body"><div class="lab-profile-layout">' +
        '<div>' +
          '<section class="lab-section"><h2>Projectfoto’s</h2><div class="lab-gallery">' + gallery + '</div></section>' +
          '<section class="lab-section"><h2>Over het bedrijf</h2>' +
            '<p>' + escapeHtml(c.about) + '</p>' +
            '<div class="lab-facts">' +
              '<div class="lab-fact"><span>Actief in</span><strong>' + escapeHtml(c.city) + '</strong></div>' +
              '<div class="lab-fact"><span>Specialisaties</span><strong>' + escapeHtml(c.specialties.join(', ')) + '</strong></div>' +
              '<div class="lab-fact"><span>Werkgebied</span><strong>' + escapeHtml(c.radius) + '</strong></div>' +
              '<div class="lab-fact"><span>Type projecten</span><strong>' + escapeHtml(c.projectTypes) + '</strong></div>' +
              '<div class="lab-fact"><span>Minimum projectgrootte</span><strong>' + escapeHtml(c.minProject) + '</strong></div>' +
            '</div>' +
          '</section>' +
          '<section class="lab-section" id="profile-prices"><h2>Wat kun je ongeveer verwachten?</h2>' +
            '<div class="lab-price-compare">' +
              '<article class="lab-price-tile is-elyan"><div class="src">ELYAN marktindicatie</div><p class="val">' + escapeHtml(c.elyanRange) + '</p><p>Onafhankelijke richting op basis van typische marktbanden.</p></article>' +
              '<article class="lab-price-tile is-partner"><div class="src">Prijsindicatie van dit vakbedrijf</div><p class="val">' + escapeHtml(c.partnerRange) + '</p><p>Prijsinformatie aangeleverd door het vakbedrijf.</p></article>' +
            '</div>' +
            '<p class="lab-hint" style="margin-top:14px;"><strong>Definitieve prijs volgt na beoordeling van het project.</strong></p>' +
            '<button type="button" class="lab-linkish" id="togglePriceDetails">Bekijk prijsdetails</button>' +
            '<div class="lab-price-details" id="priceDetails" hidden><ul>' + details + '</ul></div>' +
          '</section>' +
          '<section class="lab-section"><h2>Beschikbaarheid</h2>' +
            '<div class="lab-avail-row">' +
              '<div class="lab-avail-item"><span>Eerst mogelijke projectstart</span><strong>' + escapeHtml(c.start) + '</strong></div>' +
              '<div class="lab-avail-item"><span>Capaciteit</span><strong>' + escapeHtml(c.availability) + '</strong></div>' +
              '<div class="lab-avail-item"><span>Plaatsbezoek</span><strong>' + escapeHtml(c.visit) + '</strong></div>' +
            '</div>' +
            '<p class="lab-hint" style="margin-top:14px;">Later volgt een aparte kalender voor plaatsbezoeken. Geen hotelkalender voor volledige renovaties.</p>' +
          '</section>' +
          '<section class="lab-section"><h2>Wat is inbegrepen</h2>' +
            '<div class="lab-include-grid">' +
              '<ul class="lab-include-list">' + included + '</ul>' +
              '<div class="lab-exclude"><strong>Mogelijk niet inbegrepen</strong><br>' + escapeHtml(c.excluded) + '</div>' +
            '</div>' +
          '</section>' +
          '<div class="lab-sticky-cta">' +
            '<p>Klaar voor een gesprek over jouw project?</p>' +
            '<button type="button" class="btn btn-primary" data-open-contact>Contact aanvragen</button>' +
          '</div>' +
        '</div>' +
        '<aside class="lab-section" style="position:sticky;top:84px;">' +
          '<h2>In het kort</h2>' +
          '<p>' + escapeHtml(c.tagline) + '</p>' +
          '<div class="lab-facts" style="grid-template-columns:1fr;">' +
            '<div class="lab-fact"><span>Prijsniveau</span><strong>' + escapeHtml(c.priceLevel) + '</strong></div>' +
            '<div class="lab-fact"><span>Start</span><strong>' + escapeHtml(c.start) + '</strong></div>' +
            '<div class="lab-fact"><span>Werkgebied</span><strong>' + escapeHtml(c.radius) + '</strong></div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" style="margin-top:16px;" data-open-contact>Contact aanvragen</button>' +
          '<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px;" data-lab-view-jump="discover">Terug naar overzicht</button>' +
        '</aside>' +
      '</div></div>';
  }

  function renderOnboarding() {
    var step = state.onboardStep;
    var o = state.onboard;
    var progress = ONBOARD_STEPS.map(function (_, i) {
      var cls = i < step ? 'is-done' : (i === step ? 'is-current' : '');
      return '<span class="' + cls + '"></span>';
    }).join('');

    var body = '';
    if (step === 0) {
      body =
        '<h1>Vertel kort wie jullie zijn.</h1>' +
        '<p class="step-lead">Basisgegevens. ELYAN maakt hier later een professioneel profiel van.</p>' +
        field('Bedrijfsnaam', 'companyName', o.companyName) +
        field('Ondernemingsnummer', 'vat', o.vat) +
        field('Website', 'website', o.website) +
        field('Telefoon', 'phone', o.phone) +
        field('E-mail', 'email', o.email);
    } else if (step === 1) {
      body =
        '<h1>Welke werken voeren jullie uit?</h1>' +
        '<p class="step-lead">Kies de categorieën die het best passen.</p>' +
        '<div class="lab-choice-grid" id="catChoices">' +
          ['Dakwerken', 'Isolatie', 'Gevel', 'Ramen & deuren', 'Zonnepanelen', 'Ventilatie'].map(function (c) {
            return '<button type="button" class="lab-choice' + (o.categories.indexOf(c) >= 0 ? ' is-selected' : '') + '" data-toggle-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
          }).join('') +
        '</div>';
    } else if (step === 2) {
      body =
        '<h1>Waar zijn jullie actief?</h1>' +
        '<p class="step-lead">Geef je kernwerkgebied op.</p>' +
        field('Werkgebied', 'area', o.area);
    } else if (step === 3) {
      body =
        '<h1>Welke opdrachten passen het best?</h1>' +
        '<p class="step-lead">Zo begrijpt ELYAN welke aanvragen relevant zijn.</p>' +
        field('Minimum projectgrootte', 'minProject', o.minProject) +
        field('Typische projecten', 'prefer', o.prefer);
    } else if (step === 4) {
      body =
        '<h1>Hoe rekenen jullie meestal?</h1>' +
        '<p class="step-lead">Kies eerst een prijsmodel. Daarna tonen we alleen relevante velden.</p>' +
        '<div class="lab-choice-grid" id="priceModelChoices">' +
          ['Prijs per m²', 'Vanaf-prijs', 'Prijsrange per m²', 'Uurprijs', 'Prijs op aanvraag'].map(function (m) {
            return '<button type="button" class="lab-choice' + (o.priceModel === m ? ' is-selected' : '') + '" data-price-model="' + escapeHtml(m) + '">' + escapeHtml(m) + '</button>';
          }).join('') +
        '</div>' +
        (o.priceModel.indexOf('range') >= 0 || o.priceModel.indexOf('m²') >= 0
          ? field('Van', 'priceFrom', o.priceFrom) + field('Tot', 'priceTo', o.priceTo)
          : field('Vanaf / basis', 'priceFrom', o.priceFrom)) +
        field('Materiaal inbegrepen?', 'material', o.material) +
        field('Btw', 'vatBasis', o.vatBasis);
    } else if (step === 5) {
      body =
        '<h1>Wanneer kun je nieuwe projecten starten?</h1>' +
        '<p class="step-lead">Houd het eenvoudig. Exacte agenda volgt later.</p>' +
        '<div class="lab-choice-grid">' +
          ['Beschikbaar', 'Beperkt beschikbaar', 'Momenteel volzet'].map(function (m) {
            return '<button type="button" class="lab-choice' + (o.capacity === m ? ' is-selected' : '') + '" data-capacity="' + escapeHtml(m) + '">' + escapeHtml(m) + '</button>';
          }).join('') +
        '</div>' +
        field('Eerst mogelijke startmaand', 'startMonth', o.startMonth) +
        field('Plaatsbezoek meestal binnen', 'visitSpeed', o.visitSpeed);
    } else if (step === 6) {
      body =
        '<h1>Upload je beste realisaties.</h1>' +
        '<p class="step-lead">Gebruik eigen projecten, goed belicht, zonder watermerken. ELYAN controleert beelden vóór publicatie.</p>' +
        '<div class="lab-panel-card" style="background:var(--sand);">' +
          '<p class="lab-hint">Demo: 2 voorbeeldfoto’s klaargezet. In productie upload je hier bestanden.</p>' +
          '<div class="lab-photo-flow">' +
            '<div class="lab-photo-item"><img src="' + IMAGES.hero + '" alt=""><div><strong>Hellend dak Berchem</strong><div class="lab-badge-row"><span class="lab-pill">Concept</span></div></div></div>' +
            '<div class="lab-photo-item"><img src="' + IMAGES.editorial + '" alt=""><div><strong>Werfdetail</strong><div class="lab-badge-row"><span class="lab-pill">Concept</span></div></div></div>' +
          '</div>' +
        '</div>';
    } else if (step === 7) {
      body =
        '<h1>Help ELYAN jullie beter te leren kennen.</h1>' +
        '<p class="step-lead">Geen lange bedrijfsbrochure schrijven. Beantwoord kort een paar vragen.</p>' +
        field('Hoe lang zijn jullie actief?', 'years', o.years) +
        field('Waar zijn jullie vooral sterk in?', 'strength', o.strength) +
        field('Welke projecten doen jullie het liefst?', 'prefer', o.prefer) +
        field('Materialen of systemen waarmee jullie vaak werken', 'materials', o.materials) +
        field('Wat vinden jullie belangrijk in samenwerking met klanten?', 'values', o.values);
    } else {
      body =
        '<h1>Dit hebben we van je ontvangen.</h1>' +
        '<p class="step-lead">Controleer kort. Daarna dient ELYAN dit in voor beoordeling.</p>' +
        '<div class="lab-facts">' +
          fact('Bedrijf', o.companyName) +
          fact('Vakgebied', o.categories.join(', ')) +
          fact('Werkgebied', o.area) +
          fact('Prijsmodel', o.priceModel + ' · €' + o.priceFrom + (o.priceTo ? ' – €' + o.priceTo : '')) +
          fact('Beschikbaarheid', o.capacity + ' · ' + o.startMonth) +
        '</div>';
    }

    return (
      '<div class="lab-onboard" id="onboardRoot">' +
        '<div class="lab-onboard-progress">' + progress + '</div>' +
        '<p class="lab-kicker">Stap 0' + (step + 1) + ' · ' + escapeHtml(ONBOARD_STEPS[step]) + '</p>' +
        body +
        '<div class="lab-onboard-actions">' +
          (step > 0 ? '<button type="button" class="btn btn-ghost" id="onboardBack">Terug</button>' : '') +
          '<button type="button" class="btn btn-primary" id="onboardNext">' +
            (step === ONBOARD_STEPS.length - 1 ? 'Indienen bij ELYAN' : 'Verder') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function field(label, key, value) {
    return '<label class="lab-field">' + escapeHtml(label) +
      '<input data-onboard-field="' + key + '" type="text" value="' + escapeHtml(value) + '"></label>';
  }
  function fact(label, value) {
    return '<div class="lab-fact"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function renderPartnerDashboard() {
    var nav = ['overzicht', 'aanvragen', 'beschikbaarheid', 'prijzen', 'projectfoto’s', 'mijn profiel'].map(function (p) {
      var id = p.replace('’', '').replace(' ', '-');
      var key = p === 'projectfoto’s' ? 'fotos' : (p === 'mijn profiel' ? 'profiel' : p);
      return '<button type="button" class="' + (state.partnerPanel === key ? 'is-active' : '') + '" data-partner-panel="' + key + '">' +
        (p.charAt(0).toUpperCase() + p.slice(1)) + '</button>';
    }).join('');

    var panel = '';
    if (state.partnerPanel === 'overzicht') {
      panel =
        '<div class="lab-dash-stats">' +
          '<div class="lab-dash-stat"><span>Nieuwe aanvragen</span><strong>2</strong></div>' +
          '<div class="lab-dash-stat"><span>Beschikbaarheid</span><strong>Beperkt</strong></div>' +
          '<div class="lab-dash-stat"><span>Profielstatus</span><strong>' + escapeHtml(state.partnerStatus) + '</strong></div>' +
          '<div class="lab-dash-stat"><span>Actie nodig</span><strong>1 foto</strong></div>' +
        '</div>' +
        '<div class="lab-panel-card"><h2>Wat vraagt aandacht?</h2>' +
          '<p class="lab-hint">Dien je conceptfoto in bij ELYAN en beantwoord de aanvraag uit Berchem.</p></div>';
    } else if (state.partnerPanel === 'aanvragen') {
      panel = state.requests.map(function (r) {
        return (
          '<article class="lab-request-card" data-req-id="' + r.id + '">' +
            '<h3>' + escapeHtml(r.title) + ' · ' + escapeHtml(r.location) + '</h3>' +
            '<div class="lab-request-meta">' +
              '<div>Oppervlakte: ' + escapeHtml(r.size) + '</div>' +
              '<div>Timing: ' + escapeHtml(r.timing) + '</div>' +
              '<div>Budget: ' + escapeHtml(r.budget) + '</div>' +
              '<div>Status: <strong>' + escapeHtml(r.status) + '</strong></div>' +
            '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-toggle-req="' + r.id + '">Bekijk aanvraag</button>' +
            '<div class="lab-request-detail" id="req-' + r.id + '" hidden>' +
              '<p style="margin:12px 0;">' + escapeHtml(r.wishes) + '</p>' +
              '<div class="lab-company-actions">' +
                '<button type="button" class="btn btn-primary btn-sm" data-req-interest="' + r.id + '">Ik heb interesse</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-req-decline="' + r.id + '">Past niet bij ons</button>' +
              '</div>' +
              '<div class="lab-decline-options" id="decline-' + r.id + '" hidden>' +
                ['Planning', 'Buiten werkgebied', 'Type project', 'Budget / omvang', 'Andere reden'].map(function (x) {
                  return '<button type="button" class="lab-pill" data-decline-reason="' + r.id + '">' + x + '</button>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('');
    } else if (state.partnerPanel === 'beschikbaarheid') {
      panel =
        '<div class="lab-panel-card"><h2>Beschikbaarheid</h2>' +
          field('Capaciteit', 'capacity', state.onboard.capacity) +
          field('Eerst mogelijke startmaand', 'startMonth', state.onboard.startMonth) +
          field('Plaatsbezoeken', 'visitSpeed', state.onboard.visitSpeed) +
          '<button type="button" class="btn btn-primary" id="savePartnerAvail">Opslaan</button>' +
          '<p class="lab-toast" id="partnerAvailToast" hidden>Opgeslagen in deze labsessie.</p></div>';
    } else if (state.partnerPanel === 'prijzen') {
      panel =
        '<div class="lab-price-manage">' +
          '<article class="lab-price-manage-card">' +
            '<h3>Dakrenovatie</h3>' +
            '<p class="lab-price-manage-meta">Prijsmodel: Prijs per m²<br>Van: €' + escapeHtml(state.onboard.priceFrom) +
              ' · Tot: €' + escapeHtml(state.onboard.priceTo || '-') +
              '<br>Materiaal: ' + escapeHtml(state.onboard.material) +
              '<br>Btw: ' + escapeHtml(state.onboard.vatBasis) + '</p>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="editPriceBtn">Prijs aanpassen</button>' +
            '<div id="priceEditBox" hidden style="margin-top:12px;">' +
              field('Van', 'priceFrom', state.onboard.priceFrom) +
              field('Tot', 'priceTo', state.onboard.priceTo) +
              '<button type="button" class="btn btn-primary btn-sm" id="submitPriceChange">Wijziging indienen</button>' +
              '<p class="lab-toast" id="priceChangeToast" hidden>Wijziging wordt door ELYAN gecontroleerd.</p>' +
            '</div>' +
          '</article>' +
        '</div>';
    } else if (state.partnerPanel === 'fotos') {
      panel =
        '<div class="lab-panel-card"><h2>Projectfoto’s</h2>' +
          '<p class="lab-hint">Jij dient in. ELYAN keurt goed. Jij kiest nooit zelf “goedgekeurd”.</p>' +
          '<div class="lab-photo-flow">' +
            state.photos.map(function (ph) {
              return (
                '<div class="lab-photo-item">' +
                  (ph.img ? '<img src="' + ph.img + '" alt="">' : '<div class="lab-photo-fallback">Neutrale ELYAN-categorie</div>') +
                  '<div><strong>' + escapeHtml(ph.title) + '</strong>' +
                  '<div class="lab-badge-row">' +
                    '<span class="lab-pill">Partner: ' + escapeHtml(ph.partner) + '</span>' +
                    '<span class="lab-pill is-founding">ELYAN: ' + escapeHtml(ph.elyan) + '</span>' +
                  '</div>' +
                  (ph.partner === 'Concept'
                    ? '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" data-submit-photo="' + ph.id + '">Indienen bij ELYAN</button>'
                    : '') +
                  '</div></div>'
              );
            }).join('') +
          '</div></div>';
    } else {
      var c = companyById('atelier-dak');
      panel =
        '<div class="lab-panel-card"><h2>Mijn profiel</h2>' +
          '<p class="lab-hint">Visuele preview. Tekstpresentatie beheert ELYAN.</p>' +
          '<div class="lab-preview-frame">' +
            '<img src="' + c.image + '" alt="">' +
            '<div class="lab-preview-body">' +
              '<h3 style="margin:0 0 6px;">' + escapeHtml(state.onboard.companyName) + '</h3>' +
              '<p class="lab-hint">' + escapeHtml(c.about) + '</p>' +
              '<button type="button" class="btn btn-ghost btn-sm">Wijziging aanvragen</button>' +
            '</div>' +
          '</div></div>';
    }

    return (
      '<div class="lab-partner-shell lab-wrap">' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div><p class="lab-kicker">Partneromgeving</p><h1 style="font-size:1.8rem;margin:0;">' + escapeHtml(state.onboard.companyName) + '</h1></div>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="resetOnboarding">Onboarding opnieuw tonen</button>' +
        '</div>' +
        '<nav class="lab-partner-nav">' + nav + '</nav>' +
        panel +
      '</div>'
    );
  }

  function renderPartner() {
    var host = $('#view-partner');
    if (!host) return;
    if (state.partnerMode === 'submitted') {
      host.innerHTML =
        '<div class="lab-wrap"><div class="lab-submitted">' +
          '<p class="lab-kicker">Bedankt</p>' +
          '<h1>ELYAN bereidt je profiel voor.</h1>' +
          '<p class="lab-hint">We bekijken je gegevens en bouwen een consistente presentatie.</p>' +
          '<div class="lab-status-flow">' +
            ['Ingediend', 'Wordt bekeken', 'Profiel in voorbereiding', 'Klaar voor controle', 'Gepubliceerd'].map(function (s) {
              return '<span class="' + (s === state.partnerStatus ? 'is-current' : '') + '">' + s + '</span>';
            }).join('') +
          '</div>' +
          '<button type="button" class="btn btn-primary" id="goPartnerDash">Naar dashboard</button>' +
        '</div></div>';
      return;
    }
    if (state.partnerMode === 'dashboard') {
      host.innerHTML = renderPartnerDashboard();
      return;
    }
    host.innerHTML = '<div class="lab-wrap lab-partner-shell">' + renderOnboarding() + '</div>';
  }

  function renderAdmin() {
    var host = $('#view-admin');
    if (!host) return;
    var c = companyById('atelier-dak');
    host.innerHTML =
      '<section class="lab-admin-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker" style="color:rgba(255,255,255,.7);">ELYAN Admin</p>' +
        '<h1>Cockpit van het partnernetwerk</h1>' +
        '<p>Beoordeel partners, wijzigingen en foto’s. Demo zonder productiedatabase.</p>' +
      '</div></section>' +
      '<div class="lab-wrap">' +
        '<div class="lab-admin-kpis">' +
          '<div class="lab-admin-kpi"><strong>4</strong><span>partners te beoordelen</span></div>' +
          '<div class="lab-admin-kpi"><strong>7</strong><span>wijzigingen wachten</span></div>' +
          '<div class="lab-admin-kpi"><strong>3</strong><span>nieuwe foto’s</span></div>' +
          '<div class="lab-admin-kpi"><strong>12</strong><span>open klantaanvragen</span></div>' +
        '</div>' +
        '<div class="lab-queues">' +
          '<div class="lab-queue"><h3>Nieuwe partneraanvragen</h3>' +
            '<button type="button">Atelier Dak Antwerpen · Te controleren</button>' +
            '<button type="button">Noorddak · In onboarding</button></div>' +
          '<div class="lab-queue"><h3>Prijswijzigingen</h3>' +
            '<button type="button">Atelier Dak · Dakrenovatie €175–€245</button></div>' +
          '<div class="lab-queue"><h3>Foto’s ter controle</h3>' +
            '<button type="button">Hellend dak Berchem · Ter controle</button></div>' +
          '<div class="lab-queue"><h3>Aanvragen / matching</h3>' +
            '<button type="button">12 open · demo-overzicht</button></div>' +
        '</div>' +
        '<div class="lab-admin-detail">' +
          '<div class="lab-admin-col">' +
            '<h2>Aangeleverde informatie</h2>' +
            '<div class="lab-facts" style="grid-template-columns:1fr;">' +
              fact('Bedrijf', state.onboard.companyName) +
              fact('Werkgebied', state.onboard.area) +
              fact('Prijs', '€' + state.onboard.priceFrom + ' – €' + state.onboard.priceTo + ' / m²') +
              fact('Beschikbaarheid', state.onboard.capacity + ' · ' + state.onboard.startMonth) +
              fact('Status', 'Te controleren') +
            '</div>' +
            '<div class="lab-compare" style="margin-top:14px;">' +
              '<h3>Prijswijziging dakrenovatie</h3>' +
              '<div class="lab-compare-grid">' +
                '<div class="lab-compare-box"><span>Huidig</span>' + escapeHtml(state.priceChange.current) + '</div>' +
                '<div class="lab-compare-box"><span>Nieuw aangeleverd</span>' + escapeHtml(state.priceChange.proposed) + '</div>' +
              '</div>' +
              '<div class="lab-admin-actions">' +
                '<button type="button" class="btn btn-primary btn-sm" data-admin="approve-price">Goedkeuren</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-admin="ask-price">Aanpassing vragen</button>' +
              '</div>' +
            '</div>' +
            '<div class="lab-compare">' +
              '<h3>Foto-controle</h3>' +
              '<img src="' + IMAGES.hero + '" alt="" style="width:100%;border-radius:12px;aspect-ratio:16/10;object-fit:cover;margin-bottom:10px;">' +
              '<div class="lab-admin-actions">' +
                '<button type="button" class="btn btn-primary btn-sm" data-admin="photo-ok">Goedkeuren</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-admin="photo-no">Niet geschikt</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-admin="photo-ask">Aanpassing vragen</button>' +
              '</div>' +
            '</div>' +
            '<p class="lab-toast" id="adminToast"' + (state.adminNote ? '' : ' hidden') + '>' + escapeHtml(state.adminNote || '') + '</p>' +
          '</div>' +
          '<div class="lab-admin-col">' +
            '<h2>Publieke preview</h2>' +
            '<div class="lab-preview-frame">' +
              '<img src="' + c.image + '" alt="">' +
              '<div class="lab-preview-body">' +
                '<span class="lab-pill is-founding">Founding Partner</span>' +
                '<h3 style="margin:10px 0 6px;">' + escapeHtml(c.name) + '</h3>' +
                '<p class="lab-hint">' + escapeHtml(c.tagline) + '</p>' +
                '<div class="lab-company-facts">' +
                  '<div><span>Werkgebied</span><strong>' + escapeHtml(c.radius) + '</strong></div>' +
                  '<div><span>Prijs</span><strong>' + escapeHtml(c.partnerRange) + '</strong></div>' +
                '</div>' +
                '<button type="button" class="btn btn-primary btn-sm" data-open-profile="atelier-dak">Open klantprofiel</button>' +
              '</div>' +
            '</div>' +
            '<div class="lab-status-flow" style="justify-content:flex-start;margin-top:16px;">' +
              ['Nieuw', 'In onboarding', 'Te controleren', 'Profiel voorbereiden', 'Klaar voor publicatie', 'Gepubliceerd', 'Gepauzeerd'].map(function (s, i) {
                return '<span class="' + (i === 2 ? 'is-current' : '') + '">' + s + '</span>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function readOnboardFields(root) {
    $all('[data-onboard-field]', root || document).forEach(function (input) {
      state.onboard[input.getAttribute('data-onboard-field')] = input.value;
    });
  }

  function render() {
    if (state.view === 'discover') renderDiscover();
    if (state.view === 'profile') renderProfile();
    if (state.view === 'partner') renderPartner();
    if (state.view === 'admin') renderAdmin();
    bindDynamic();
  }

  function bindDynamic() {
    var search = $('#discoverSearch');
    if (search) {
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        state.category = search.category.value;
        state.location = search.location.value || 'Antwerpen';
        render();
      });
    }
    $all('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.category = btn.getAttribute('data-cat');
        render();
      });
    });
    ['filterAvail', 'filterPrice', 'filterSort'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterAvail') state.availability = el.value;
        if (id === 'filterPrice') state.priceLevel = el.value;
        if (id === 'filterSort') state.sort = el.value;
        render();
      });
    });
    var more = $('#toggleMoreFilters');
    if (more) {
      more.addEventListener('click', function () {
        var box = $('#moreFilters');
        if (box) box.classList.toggle('is-open');
      });
    }
    $all('[data-open-profile]').forEach(function (btn) {
      btn.addEventListener('click', function () { openProfile(btn.getAttribute('data-open-profile')); });
    });
    $all('[data-open-contact]').forEach(function (btn) {
      btn.addEventListener('click', openContact);
    });
    $all('[data-lab-view-jump]').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.getAttribute('data-lab-view-jump')); });
    });
    var toggleDetails = $('#togglePriceDetails');
    if (toggleDetails) {
      toggleDetails.addEventListener('click', function () {
        var box = $('#priceDetails');
        if (!box) return;
        box.hidden = !box.hidden;
        toggleDetails.textContent = box.hidden ? 'Bekijk prijsdetails' : 'Verberg prijsdetails';
      });
    }

    // onboarding
    $all('[data-toggle-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-toggle-cat');
        var idx = state.onboard.categories.indexOf(cat);
        if (idx >= 0) state.onboard.categories.splice(idx, 1);
        else state.onboard.categories.push(cat);
        render();
      });
    });
    $all('[data-price-model]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.onboard.priceModel = btn.getAttribute('data-price-model');
        render();
      });
    });
    $all('[data-capacity]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.onboard.capacity = btn.getAttribute('data-capacity');
        render();
      });
    });
    var next = $('#onboardNext');
    if (next) {
      next.addEventListener('click', function () {
        readOnboardFields();
        if (state.onboardStep >= ONBOARD_STEPS.length - 1) {
          state.partnerMode = 'submitted';
          state.partnerStatus = 'Wordt bekeken';
        } else {
          state.onboardStep += 1;
        }
        render();
      });
    }
    var back = $('#onboardBack');
    if (back) {
      back.addEventListener('click', function () {
        readOnboardFields();
        state.onboardStep = Math.max(0, state.onboardStep - 1);
        render();
      });
    }
    var goDash = $('#goPartnerDash');
    if (goDash) {
      goDash.addEventListener('click', function () {
        state.partnerMode = 'dashboard';
        state.partnerPanel = 'overzicht';
        render();
      });
    }
    var reset = $('#resetOnboarding');
    if (reset) {
      reset.addEventListener('click', function () {
        state.partnerMode = 'onboarding';
        state.onboardStep = 0;
        render();
      });
    }
    $all('[data-partner-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.partnerPanel = btn.getAttribute('data-partner-panel');
        render();
      });
    });
    $all('[data-toggle-req]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-toggle-req');
        var el = $('#req-' + id);
        if (el) el.hidden = !el.hidden;
      });
    });
    $all('[data-req-interest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-req-interest');
        state.requests.forEach(function (r) { if (r.id === id) r.status = 'interessant'; });
        render();
      });
    });
    $all('[data-req-decline]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-req-decline');
        var box = $('#decline-' + id);
        if (box) box.hidden = false;
      });
    });
    $all('[data-decline-reason]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-decline-reason');
        state.requests.forEach(function (r) { if (r.id === id) r.status = 'niet passend'; });
        render();
      });
    });
    var editPrice = $('#editPriceBtn');
    if (editPrice) {
      editPrice.addEventListener('click', function () {
        var box = $('#priceEditBox');
        if (box) box.hidden = !box.hidden;
      });
    }
    var submitPrice = $('#submitPriceChange');
    if (submitPrice) {
      submitPrice.addEventListener('click', function () {
        readOnboardFields();
        state.priceChange.proposed = '€ ' + state.onboard.priceFrom + ' – € ' + state.onboard.priceTo + ' / m²';
        state.priceChange.status = 'wacht';
        var t = $('#priceChangeToast');
        if (t) t.hidden = false;
      });
    }
    var saveAvail = $('#savePartnerAvail');
    if (saveAvail) {
      saveAvail.addEventListener('click', function () {
        readOnboardFields();
        var t = $('#partnerAvailToast');
        if (t) t.hidden = false;
      });
    }
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
        if (a === 'approve-price') {
          state.priceChange.current = state.priceChange.proposed;
          state.adminNote = 'Prijswijziging goedgekeurd in demo.';
        } else if (a === 'ask-price') {
          state.adminNote = 'Aanpassing gevraagd voor prijsvoorstel.';
        } else if (a === 'photo-ok') {
          state.photos[0].elyan = 'Goedgekeurd';
          state.adminNote = 'Foto goedgekeurd.';
        } else if (a === 'photo-no') {
          state.photos[0].elyan = 'Niet geschikt';
          state.adminNote = 'Foto gemarkeerd als niet geschikt.';
        } else if (a === 'photo-ask') {
          state.photos[0].elyan = 'Aanpassing nodig';
          state.adminNote = 'Aanpassing gevraagd voor foto.';
        }
        render();
      });
    });
  }

  function bindGlobal() {
    $all('.lab-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setView(btn.getAttribute('data-lab-view'));
      });
    });
    $all('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', closeContact);
    });
    var form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var toast = $('#contactToast');
        if (toast) toast.hidden = false;
      });
    }
  }

  bindGlobal();
  render();
})();
