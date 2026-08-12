/* ============================================================
   ELYAN public Vakmannen surface (/vakmannen + /vakmannen/:slug)
   Design baseline = Partner Lab visual language.
   ============================================================ */
(function () {
  'use strict';

  var EV = window.ElyanVakmannen;
  if (!EV) {
    console.error('[ELYAN] Shared vakmannen modules missing');
    return;
  }

  var esc = EV.escapeHtml;
  var state = {
    mode: 'landing',
    category: 'dakwerken',
    subtype: 'alle',
    location: { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    locationQuery: 'Antwerpen',
    provinceBrowse: null,
    customerTiming: 'alle',
    projectContext: null,
    sort: 'aanbevolen',
    quote: null
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function parseRoute() {
    var path = location.pathname.replace(/\/$/, '');
    var params = new URLSearchParams(location.search);
    if (params.get('slug')) return { page: 'profile', slug: decodeURIComponent(params.get('slug')) };
    var m = path.match(/\/vakmannen\/([^/]+)$/);
    if (m && m[1] && m[1] !== 'vakmannen-detail') {
      return { page: 'profile', slug: decodeURIComponent(m[1]) };
    }
    if (path.indexOf('/vakmannen') === 0) return { page: 'list', slug: null };
    return { page: 'list', slug: null };
  }

  function cat(id) { return EV.getCategory(id); }
  function capacityLabel(p) {
    return EV.capacityPublicLabel(p.capacity) || 'Beschikbaarheid op aanvraag';
  }
  function visitLabel(p) {
    return EV.visitPublicLabel(p.visitSpeed) || 'op afspraak';
  }
  function stars(g) {
    if (!g || !g.show) return '';
    return '<div class="lab-stars"><svg class="icon"><use href="#i-star"></use></svg> ' +
      esc(String(g.rating).replace('.', ',')) +
      ' <span>' + esc(String(g.count)) + ' Google-beoordelingen</span></div>';
  }

  function filtered() {
    return EV.publishedPartners().filter(function (p) {
      if (p.category !== state.category) return false;
      if (state.subtype !== 'alle' && p.subtypes.indexOf(state.subtype) < 0) return false;
      if (!EV.matchesCustomerTiming(p.startMonth, state.customerTiming)) return false;
      if (state.provinceBrowse && p.province !== state.provinceBrowse) return false;
      return true;
    }).sort(function (a, b) {
      if (state.sort === 'beschikbaar') {
        return (EV.MONTH_ORDER[a.startMonth] || 99) - (EV.MONTH_ORDER[b.startMonth] || 99);
      }
      if (state.sort === 'google') {
        var ga = (a.google && a.google.rating) || 0;
        var gb = (b.google && b.google.rating) || 0;
        return gb - ga;
      }
      return 0;
    });
  }

  function rowHtml(p) {
    var price = EV.formatPrice(EV.serviceForSubtype(p, state.subtype));
    var g = EV.GoogleReviews.resolveForPartner(p);
    return (
      '<article class="lab-row">' +
        '<div class="lab-row-media"><img src="' + p.image + '" alt="" style="object-position:' + (p.objectPos || '50% 50%') + '" loading="lazy"></div>' +
        '<div>' +
          '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="tagline">' + esc(p.specialtyLine) + '</p>' +
          stars(g) +
        '</div>' +
        '<div class="lab-row-meta">' +
          '<div><strong>' + esc(p.radius) + '</strong></div>' +
          '<div>Vanaf ' + esc(p.startMonth) + '</div>' +
          '<div>' + esc(capacityLabel(p)) + '</div>' +
        '</div>' +
        '<div class="lab-row-price">' +
          '<div class="val">' + esc(price.display) + '</div>' +
          '<div class="ctx">' + esc(price.context) + '</div>' +
        '</div>' +
        '<a class="btn btn-primary btn-sm" href="/vakmannen/' + encodeURIComponent(p.slug) + '">Bekijk vakman</a>' +
      '</article>'
    );
  }

  function filtersHtml() {
    var subtypes = cat(state.category).subtypes;
    return (
      '<h2>Filters</h2>' +
      '<label>Vakgebied<select id="filterCategory">' +
        EV.CATEGORY_LIST.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('') +
      '</select></label>' +
      '<label>Type werk<select id="filterSubtype">' +
        '<option value="alle"' + (state.subtype === 'alle' ? ' selected' : '') + '>Alle types</option>' +
        subtypes.map(function (t) {
          return '<option value="' + t.id + '"' + (state.subtype === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>';
        }).join('') +
      '</select></label>' +
      '<label>Wanneer wil je starten?<select id="filterTiming">' +
        EV.CUSTOMER_TIMING.map(function (t) {
          return '<option value="' + t.id + '"' + (state.customerTiming === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>';
        }).join('') +
      '</select></label>'
    );
  }

  function renderLanding() {
    var featured = EV.publishedPartners().filter(function (p) { return p.category === 'dakwerken'; }).slice(0, 4);
    return (
      '<section class="lab-disc-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker">Vakmannen</p>' +
        '<h1>Vind de juiste vakman voor je renovatie.</h1>' +
        '<p class="lead">Ontdek gecontroleerde vakbedrijven, begrijp prijs en timing, en vraag een offerte aan wanneer het past.</p>' +
        '<form class="lab-search" id="vkSearch" autocomplete="off">' +
          '<label>Wat wil je laten uitvoeren?<select name="category">' +
            EV.CATEGORY_LIST.map(function (c) {
              return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + esc(c.label) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="lab-loc">Gemeente of postcode' +
            '<input name="location" id="locInput" value="' + esc(state.locationQuery) + '" placeholder="Typ een gemeente…" aria-autocomplete="list">' +
            '<div class="lab-suggest" id="locSuggest" hidden></div>' +
          '</label>' +
          '<button type="submit" class="btn btn-primary">Vind vakmannen</button>' +
        '</form>' +
      '</div></section>' +
      '<section class="lab-disc-band"><div class="lab-wrap">' +
        '<h2>Waarmee kunnen we je helpen?</h2>' +
        '<p class="lab-hint">Kies een categorie om te browsen. Zoeken is optioneel.</p>' +
        '<div class="lab-cat-mosaic">' +
          EV.CATEGORY_LIST.map(function (c) {
            return '<button type="button" class="lab-cat' + (state.category === c.id ? ' is-active' : '') + '" data-browse-cat="' + c.id + '">' +
              '<strong>' + esc(c.label) + '</strong><span>Ontdekken</span></button>';
          }).join('') +
        '</div>' +
        '<p class="lab-hint" style="margin-top:18px;margin-bottom:8px;">Of bekijk per provincie</p>' +
        '<div class="lab-prov">' +
          EV.PROVINCES.map(function (p) {
            return '<button type="button" data-browse-prov="' + esc(p) + '">' + esc(p) + '</button>';
          }).join('') +
        '</div>' +
      '</div></section>' +
      '<section class="lab-featured"><div class="lab-wrap">' +
        '<div class="lab-featured-head">' +
          '<div><h2>Vakbedrijven om te ontdekken</h2><p class="lab-hint">Gecontroleerde partners. Geen zoekopdracht nodig.</p></div>' +
          '<button type="button" class="lab-link" id="seeAll">Alle resultaten <svg class="icon"><use href="#i-arrow"></use></svg></button>' +
        '</div>' +
        '<div class="lab-feature-rail">' + featured.map(rowHtml).join('') + '</div>' +
      '</div></section>'
    );
  }

  function renderResults() {
    var list = filtered();
    var empty = '';
    if (!list.length) {
      empty = '<div class="vk-empty"><h2>Nog geen vakbedrijven hier</h2>' +
        '<p>Op dit moment hebben we in deze categorie of regio nog geen geselecteerde vakbedrijven.</p>' +
        '<button type="button" class="btn btn-ghost" id="backLanding">Andere categorie bekijken</button></div>';
    }
    return (
      '<div class="lab-wrap lab-results" style="padding-top:28px;padding-bottom:48px;">' +
        '<button type="button" class="lab-link" id="backLanding" style="margin-bottom:10px;">← Terug naar ontdekken</button>' +
        '<div class="lab-results-head">' +
          '<h1>' + esc(cat(state.category).plural) + ' rond ' + esc(state.location.name) + '</h1>' +
          '<p class="lab-hint">' + esc(state.location.postcode) + ' · ' + esc(state.location.province) + '</p>' +
        '</div>' +
        '<div class="lab-mobile-filters"><button type="button" class="btn btn-ghost btn-sm" id="toggleFilters">Filters</button></div>' +
        '<div class="lab-results-layout">' +
          '<aside class="lab-filters lab-filters-desktop">' + filtersHtml() + '</aside>' +
          '<div>' +
            '<div class="lab-toolbar">' +
              '<p><strong>' + list.length + '</strong> passende vakmannen</p>' +
              '<select id="filterSort">' +
                '<option value="aanbevolen">Aanbevolen</option>' +
                '<option value="beschikbaar"' + (state.sort === 'beschikbaar' ? ' selected' : '') + '>Eerst beschikbaar</option>' +
                '<option value="google"' + (state.sort === 'google' ? ' selected' : '') + '>Google-beoordeling</option>' +
              '</select>' +
            '</div>' +
            empty +
            '<div class="lab-list">' + list.map(rowHtml).join('') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderProfile(p) {
    if (!p || p.status !== 'published') {
      return '<div class="lab-wrap" style="padding:48px 20px;"><div class="vk-empty"><h2>Vakman niet gevonden</h2><p>Dit profiel bestaat niet of is nog niet gepubliceerd.</p><a class="btn btn-primary" href="/vakmannen">Naar vakmannen</a></div></div>';
    }
    document.title = p.name + ' | ELYAN';
    var price = EV.formatPrice(EV.serviceForSubtype(p, state.subtype));
    var g = EV.GoogleReviews.resolveForPartner(p);
    var match = EV.timingMatch(p.startMonth, state.projectContext ? state.projectContext.timing : null, state.projectContext && state.projectContext.month);
    var intro = EV.generateIntro(p);

    var optionalFacts = '';
    if (EV.publicVisibility(p, 'years') && p.years) {
      optionalFacts += '<div class="lab-fact"><span>Jaren actief</span><strong>' + esc(String(p.years)) + ' jaar</strong></div>';
    }
    if (EV.publicVisibility(p, 'teamSize') && p.teamSize) {
      optionalFacts += '<div class="lab-fact"><span>Team</span><strong>' + esc(p.teamSize) + ' personen</strong></div>';
    }

    var googleBlock = '';
    if (g.show) {
      googleBlock =
        '<section class="lab-section"><h2>Google-beoordelingen</h2><div class="lab-google">' +
          '<div class="lab-google-head"><div><div class="lab-google-score">' + esc(String(g.rating).replace('.', ',')) + ' / 5</div>' +
          '<div class="lab-hint">' + esc(String(g.count)) + ' beoordelingen</div></div>' +
          '<a class="btn btn-ghost btn-sm" href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer">Bekijk op Google</a></div>' +
          (g.reviews || []).map(function (r) {
            return '<div class="lab-review"><strong>' + esc(r.author) + '</strong>' + esc(r.text) + '</div>';
          }).join('') +
          '<p class="lab-attr">' + esc(g.attribution) + (g.demo ? ' Demo-data tot Places API live is.' : '') + '</p>' +
        '</div></section>';
    }

    var timingBlock = '';
    if (match.mode === 'match') {
      timingBlock =
        '<section class="lab-section"><h2>Projecttiming</h2><div class="lab-timing-match">' +
          '<div><span>Jouw gewenste start</span><strong>' + esc(match.wish) + '</strong></div>' +
          '<div><span>Deze vakman</span><strong>Beschikbaar vanaf ' + esc(match.partner) + '</strong></div>' +
          '<div><span class="lab-match-pill' + (match.ok ? '' : ' is-warn') + '">' + esc(match.label) + '</span></div>' +
        '</div></section>';
    }

    return (
      '<div class="lab-wrap lab-profile" style="padding-top:24px;padding-bottom:56px;">' +
        '<a class="lab-link" href="/vakmannen" style="margin-bottom:8px;display:inline-flex;">← Terug naar vakmannen</a>' +
        '<header class="lab-identity">' +
          '<div class="lab-identity-visual"><img src="' + p.image + '" alt="" style="object-position:' + (p.objectPos || '') + '"></div>' +
          '<div>' +
            '<p class="lab-kicker">ELYAN vakman</p>' +
            '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
            '<h1>' + esc(p.name) + '</h1>' +
            stars(g) +
          '</div>' +
          '<div class="lab-identity-actions">' +
            '<button type="button" class="btn btn-primary" id="startQuote">Offerte aanvragen</button>' +
          '</div>' +
        '</header>' +
        '<div class="lab-glance">' +
          '<div><span>Werkgebied</span><strong>' + esc(p.radius) + '</strong></div>' +
          '<div><span>Eerste mogelijke start</span><strong>' + esc(p.startMonth) + '</strong></div>' +
          '<div class="is-price"><span>Prijsindicatie</span><strong>' + esc(price.display) + '</strong></div>' +
          '<div><span>Plaatsbezoek</span><strong>' + esc(visitLabel(p)) + '</strong></div>' +
        '</div>' +
        '<div class="lab-gallery">' +
          (p.gallery || []).slice(0, 3).map(function (src) {
            return '<button type="button" data-lightbox="' + src + '"><img src="' + src + '" alt="Projectfoto" loading="lazy"></button>';
          }).join('') +
        '</div>' +
        '<div class="lab-profile-grid"><div>' +
          '<section class="lab-section"><h2>Over ' + esc(p.name) + '</h2><p>' + esc(intro) + '</p></section>' +
          '<section class="lab-section"><h2>Waar ze sterk in zijn</h2><div class="lab-strengths">' +
            [p.strength, p.prefer].filter(Boolean).map(function (s) {
              return '<span class="lab-strength">' + esc(s) + '</span>';
            }).join('') +
          '</div></section>' +
          timingBlock +
          '<section class="lab-section"><h2>Prijzen</h2><div class="lab-price-table">' +
            (p.services || []).map(function (s) {
              var fp = EV.formatPrice(s);
              return '<div class="lab-price-row"><span>' + esc(s.label) + '</span><strong>' + esc(fp.display) + '</strong></div>';
            }).join('') +
            (p.minProject ? '<div class="lab-price-row"><span>Minimum project</span><strong>' + esc(p.minProject) + '</strong></div>' : '') +
          '</div><p class="lab-hint" style="margin-top:10px;">Prijzen zijn indicaties van het vakbedrijf. De uiteindelijke prijs hangt af van het concrete project en de offerte.</p></section>' +
          '<section class="lab-section"><h2>Beschikbaarheid</h2>' +
            '<div class="lab-facts">' +
              '<div class="lab-fact"><span>Eerste mogelijkheid</span><strong>' + esc(p.startMonth) + '</strong></div>' +
              (capacityLabel(p) ? '<div class="lab-fact"><span>Capaciteit</span><strong>' + esc(capacityLabel(p)) + '</strong></div>' : '') +
              '<div class="lab-fact"><span>Plaatsbezoek</span><strong>' + esc(visitLabel(p)) + '</strong></div>' +
            '</div></section>' +
          googleBlock +
          (optionalFacts ? '<section class="lab-section"><h2>Extra</h2><div class="lab-facts">' + optionalFacts + '</div></section>' : '') +
        '</div>' +
        '<aside class="lab-side-sticky"><h3>Volgende stap</h3>' +
          '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag stap voor stap.</p>' +
          '<button type="button" class="btn btn-primary btn-block" id="startQuoteSide">Offerte aanvragen</button>' +
        '</aside></div></div>'
    );
  }

  function renderQuote(p) {
    var q = state.quote;
    if (!q) return '';
    if (q.sent) {
      return '<div class="lab-quote"><div class="lab-quote-shell"><div class="lab-success">' +
        '<div class="mark"><svg class="icon"><use href="#i-check"></use></svg></div>' +
        '<p class="lab-kicker">Aanvraag verzonden</p>' +
        '<h1>Je aanvraag is doorgestuurd.</h1>' +
        '<p class="lab-hint">' + esc(p.name) + ' heeft je projectgegevens ontvangen. Je krijgt bericht zodra er een reactie is.</p>' +
        '<p class="lab-hint" style="margin-top:8px;">Persoonsgegevens worden privacygericht gedeeld. Demo: geen echte verzending.</p>' +
        '<div class="lab-quote-actions" style="justify-content:center;">' +
          '<a class="btn btn-primary" href="/vakmannen/' + encodeURIComponent(p.slug) + '">Terug naar profiel</a>' +
        '</div></div></div></div>';
    }
    var steps = ['Type werk', 'Over je project', 'Timing', 'Contact', 'Overzicht'];
    var progress = steps.map(function (_, i) {
      return '<span class="' + (i < q.step ? 'is-done' : (i === q.step ? 'is-current' : '')) + '"></span>';
    }).join('');
    var body = '';
    var subtypes = cat(p.category).subtypes;
    if (q.step === 0) {
      body = '<h1>Wat wil je laten uitvoeren?</h1><p class="step-lead">Kies wat het best past.</p><div class="lab-choice-grid is-2">' +
        subtypes.map(function (s) {
          return '<button type="button" class="lab-choice' + (q.workType === s.id ? ' is-selected' : '') + '" data-q-set="workType" data-val="' + s.id + '">' + esc(s.label) + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 1) {
      body = '<h1>Vertel kort over je project</h1><p class="step-lead">Weet je iets niet? Kies “Ik weet het niet”.</p>' +
        '<label class="lab-field">Korte omschrijving<textarea data-q-field="notes" rows="3" placeholder="Bijvoorbeeld: hellend dak vernieuwen, ca. 100 m²">' + esc(q.notes || '') + '</textarea></label>' +
        '<label class="lab-field">Geschatte omvang<input data-q-field="size" value="' + esc(q.size || '') + '" placeholder="bv. 100 m² of Ik weet het niet"></label>';
    } else if (q.step === 2) {
      body = '<h1>Wanneer wil je starten?</h1><div class="lab-choice-grid is-2">' +
        EV.CUSTOMER_TIMING.filter(function (t) { return t.id !== 'alle'; }).map(function (t) {
          return '<button type="button" class="lab-choice' + (q.timing === t.id ? ' is-selected' : '') + '" data-q-set="timing" data-val="' + t.id + '">' + esc(t.label) + '</button>';
        }).join('') + '</div>';
    } else if (q.step === 3) {
      body = '<h1>Jouw gegevens</h1><p class="step-lead">Voor opvolging. Contactgegevens worden gericht gedeeld.</p>' +
        '<label class="lab-field">Naam<input data-q-field="name" value="' + esc(q.name || '') + '" required></label>' +
        '<label class="lab-field">E-mail<input data-q-field="email" type="email" value="' + esc(q.email || '') + '" required></label>' +
        '<label class="lab-field">Telefoon<input data-q-field="phone" value="' + esc(q.phone || '') + '"></label>' +
        '<label class="lab-field">Projectlocatie<input data-q-field="address" value="' + esc(q.address || state.location.name) + '"></label>';
    } else {
      var subLabel = subtypes.filter(function (s) { return s.id === q.workType; })[0];
      body = '<h1>Jouw aanvraag</h1><div class="lab-summary">' +
        '<div class="lab-summary-row"><span>Werk</span><strong>' + esc(subLabel ? subLabel.label : q.workType) + '</strong></div>' +
        '<div class="lab-summary-row"><span>Locatie</span><strong>' + esc(q.address || '') + '</strong></div>' +
        '<div class="lab-summary-row"><span>Timing</span><strong>' + esc(q.timing || '') + '</strong></div>' +
        '<div class="lab-summary-row"><span>Naar</span><strong>' + esc(p.name) + '</strong></div>' +
      '</div><p class="lab-hint">Je kunt later tot 3 zelfgekozen vakmannen kiezen. Nu: één partner.</p>';
    }
    return (
      '<div class="lab-quote"><div class="lab-quote-shell">' +
        '<button type="button" class="lab-link" id="cancelQuote" style="margin-bottom:12px;">← Terug naar profiel</button>' +
        '<div class="lab-quote-progress">' + progress + '</div>' +
        '<p class="lab-kicker">Offerteaanvraag · ' + esc(p.name) + '</p>' +
        '<div class="lab-quote-card">' + body +
          '<div class="lab-quote-actions">' +
            (q.step > 0 ? '<button type="button" class="btn btn-ghost" id="quoteBack">Terug</button>' : '') +
            '<button type="button" class="btn btn-primary" id="quoteNext">' + (q.step >= steps.length - 1 ? 'Aanvraag versturen' : 'Verder') + '</button>' +
          '</div></div></div></div>'
    );
  }

  function bindLoc() {
    var input = $('#locInput');
    var box = $('#locSuggest');
    if (!input || !box) return;
    function update() {
      var items = EV.suggestLocations(input.value, 8);
      if (!items.length || document.activeElement !== input) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = items.map(function (l, i) {
        return '<button type="button" data-pick="' + i + '"><strong>' + esc(l.name) + '</strong><em>' + esc(l.postcode) + ' · ' + esc(l.province) + '</em></button>';
      }).join('');
      $all('[data-pick]', box).forEach(function (btn) {
        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
          var item = items[Number(btn.getAttribute('data-pick'))];
          state.location = item;
          state.locationQuery = item.name;
          input.value = item.name;
          box.hidden = true;
        });
      });
    }
    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', function () { setTimeout(function () { box.hidden = true; }, 150); });
  }

  function bindCommon() {
    var search = $('#vkSearch');
    if (search) {
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        state.category = search.category.value;
        state.subtype = 'alle';
        var match = EV.suggestLocations(($('#locInput') || {}).value || '', 1)[0];
        if (match) state.location = match;
        state.locationQuery = state.location.name;
        state.provinceBrowse = null;
        state.mode = 'results';
        render();
      });
    }
    bindLoc();
    $all('[data-browse-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.category = btn.getAttribute('data-browse-cat');
        state.subtype = 'alle';
        state.provinceBrowse = null;
        state.mode = 'results';
        render();
      });
    });
    $all('[data-browse-prov]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.provinceBrowse = btn.getAttribute('data-browse-prov');
        state.mode = 'results';
        render();
      });
    });
    var seeAll = $('#seeAll');
    if (seeAll) seeAll.addEventListener('click', function () { state.mode = 'results'; render(); });
    var back = $('#backLanding');
    if (back) back.addEventListener('click', function () { state.mode = 'landing'; state.provinceBrowse = null; render(); });
    ['filterCategory', 'filterSubtype', 'filterTiming', 'filterSort'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterCategory') { state.category = el.value; state.subtype = 'alle'; }
        if (id === 'filterSubtype') state.subtype = el.value;
        if (id === 'filterTiming') state.customerTiming = el.value;
        if (id === 'filterSort') state.sort = el.value;
        render();
      });
    });
    var toggle = $('#toggleFilters');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var d = $('#filtersDrawer');
        var body = $('#filtersDrawerBody');
        if (!d || !body) return;
        body.innerHTML = filtersHtml();
        d.hidden = false;
        document.body.classList.add('lock-scroll');
        ['filterCategory', 'filterSubtype', 'filterTiming'].forEach(function (id) {
          var el = body.querySelector('#' + id);
          if (!el) return;
          el.addEventListener('change', function () {
            if (id === 'filterCategory') { state.category = el.value; state.subtype = 'alle'; }
            if (id === 'filterSubtype') state.subtype = el.value;
            if (id === 'filterTiming') state.customerTiming = el.value;
            d.hidden = true;
            document.body.classList.remove('lock-scroll');
            render();
          });
        });
      });
    }
    $all('[data-close-drawer]').forEach(function (el) {
      el.addEventListener('click', function () {
        var d = $('#filtersDrawer');
        if (d) d.hidden = true;
        document.body.classList.remove('lock-scroll');
      });
    });
    $all('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = $('#labLightbox');
        var img = $('#labLightboxImg');
        if (!box || !img) return;
        img.src = btn.getAttribute('data-lightbox');
        box.hidden = false;
        document.body.classList.add('lock-scroll');
      });
    });
    $all('[data-close-lightbox]').forEach(function (el) {
      el.addEventListener('click', function () {
        var box = $('#labLightbox');
        if (box) box.hidden = true;
        document.body.classList.remove('lock-scroll');
      });
    });

    function startQuote() {
      var route = parseRoute();
      var p = EV.partnerBySlug(route.slug);
      if (!p) return;
      state.quote = {
        step: 0, sent: false, partnerId: p.id,
        workType: (p.subtypes && p.subtypes[0]) || 'volledig',
        notes: '', size: '', timing: '3m',
        name: '', email: '', phone: '', address: state.location.name
      };
      render();
    }
    var sq = $('#startQuote');
    var sqs = $('#startQuoteSide');
    if (sq) sq.addEventListener('click', startQuote);
    if (sqs) sqs.addEventListener('click', startQuote);

    var cancel = $('#cancelQuote');
    if (cancel) cancel.addEventListener('click', function () { state.quote = null; render(); });
    $all('[data-q-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.quote[btn.getAttribute('data-q-set')] = btn.getAttribute('data-val');
        render();
      });
    });
    var qNext = $('#quoteNext');
    if (qNext) qNext.addEventListener('click', function () {
      $all('[data-q-field]').forEach(function (input) {
        state.quote[input.getAttribute('data-q-field')] = input.value;
      });
      if (state.quote.step >= 4) {
        state.quote.sent = true;
        state.projectContext = { timing: state.quote.timing, month: null };
        try {
          var store = JSON.parse(localStorage.getItem('elyan_requests') || '[]');
          store.unshift({
            id: 'req_' + Date.now(),
            partnerId: state.quote.partnerId,
            status: EV.REQUEST_STATUS.NEW,
            createdAt: new Date().toISOString(),
            workType: state.quote.workType,
            notes: state.quote.notes,
            timing: state.quote.timing,
            contact: { name: state.quote.name, email: state.quote.email, phone: state.quote.phone, address: state.quote.address },
            recipients: [state.quote.partnerId]
          });
          localStorage.setItem('elyan_requests', JSON.stringify(store.slice(0, 50)));
        } catch (err) { /* ignore */ }
      } else state.quote.step += 1;
      render();
    });
    var qBack = $('#quoteBack');
    if (qBack) qBack.addEventListener('click', function () {
      state.quote.step = Math.max(0, state.quote.step - 1);
      render();
    });
  }

  function render() {
    var host = $('#vk-app');
    if (!host) return;
    var route = parseRoute();
    if (route.page === 'profile') {
      var p = EV.partnerBySlug(route.slug);
      host.innerHTML = state.quote ? renderQuote(p) : renderProfile(p);
    } else {
      host.innerHTML = state.mode === 'results' ? renderResults() : renderLanding();
    }
    bindCommon();
    window.scrollTo(0, 0);
  }

  render();
})();
