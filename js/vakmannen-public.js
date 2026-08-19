/* ============================================================
   ELYAN public Vakmannen surface — Partner Lab shell (760d6fd)
   Data: /api/public/v1/* (Sprint 1–3). Live API only; no seed data / no quote wizard.
   ============================================================ */
(function () {
  'use strict';

  var EV = window.ElyanVakmannen;
  var UI = window.ElyanMarketplaceUi;
  if (!EV) {
    console.error('[ELYAN] Shared vakmannen modules missing');
    return;
  }

  var esc = EV.escapeHtml;
  var FEATURED_CATEGORIES = [
    'dakwerken', 'badkamer', 'keuken', 'ramen-deuren', 'isolatie', 'verwarming'
  ];

  var state = {
    mode: 'landing',
    category: 'dakwerken',
    subtype: 'alle',
    location: { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    locationQuery: 'Antwerpen',
    provinceBrowse: null,
    regioSlug: null,
    customerTiming: 'alle',
    sort: 'aanbevolen',
    featured: [],
    results: [],
    resultsTotal: 0,
    resultsStatus: 'idle',
    resultsMessage: '',
    profile: null,
    profileStatus: 'idle',
    profileMessage: '',
    galleryImages: [],
    galleryIndex: 0,
    aanvraagNote: false
  };

  var lbScrollY = 0;
  var lbTouch = { active: false, x: 0, y: 0, moved: false };
  var lbBound = false;
  var lbIgnoreClose = false;
  var bootDone = false;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeUrl(raw) {
    if (UI && UI.safeHttpsUrl) return UI.safeHttpsUrl(raw);
    var v = String(raw || '').trim();
    return /^https:\/\//i.test(v) ? v : '';
  }

  function fetchJson(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    if (ctrl) {
      timer = setTimeout(function () { try { ctrl.abort(); } catch (e) { /* ignore */ } }, 12000);
    }
    return fetch(url, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function cat(id) {
    var c = EV.getCategory(id);
    if (c) return c;
    if (UI && UI.labelFor) {
      return { id: id || '', label: UI.labelFor(id), plural: UI.labelFor(id), subtypes: [] };
    }
    return { id: id || '', label: 'Vakgebied', plural: 'Vakmannen', subtypes: [] };
  }

  function categoryList() {
    return EV.CATEGORY_LIST || [];
  }

  function provinces() {
    return EV.PROVINCES || [];
  }

  function provinceSlugFor(name) {
    if (UI && UI.PROVINCE_TO_SLUG && UI.PROVINCE_TO_SLUG[name]) return UI.PROVINCE_TO_SLUG[name];
    var map = {
      Antwerpen: 'antwerpen',
      'Oost-Vlaanderen': 'oost-vlaanderen',
      'West-Vlaanderen': 'west-vlaanderen',
      Limburg: 'limburg',
      'Vlaams-Brabant': 'vlaams-brabant',
      'Brussels Hoofdstedelijk Gewest': 'brussel',
      Brussel: 'brussel'
    };
    return map[name] || null;
  }

  function provinceLabelFromSlug(slug) {
    if (UI && UI.provinceBySlug) {
      var p = UI.provinceBySlug(slug);
      return p ? p.label : null;
    }
    return null;
  }

  function lockLightboxScroll() {
    lbScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = '-' + lbScrollY + 'px';
    document.body.classList.add('lock-scroll', 'vk-lb-open');
  }
  function unlockLightboxScroll() {
    var y = lbScrollY || 0;
    document.body.classList.remove('lock-scroll', 'vk-lb-open');
    document.body.style.top = '';
    window.scrollTo(0, y);
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  }

  function paintLightbox() {
    var imgs = state.galleryImages || [];
    var img = $('#labLightboxImg');
    var counter = $('#vkLbCounter');
    var prev = $('#vkLbPrev');
    var next = $('#vkLbNext');
    if (!imgs.length) return;
    if (img) {
      img.src = imgs[state.galleryIndex];
      img.alt = 'Projectfoto ' + (state.galleryIndex + 1) + ' van ' + imgs.length;
    }
    if (counter) {
      counter.hidden = false;
      counter.textContent = (state.galleryIndex + 1) + ' / ' + imgs.length;
    }
    if (prev) prev.hidden = imgs.length < 2;
    if (next) next.hidden = imgs.length < 2;
  }

  function openLightbox(images, index) {
    var box = $('#labLightbox');
    if (!box || !images || !images.length) return;
    state.galleryImages = images.slice();
    state.galleryIndex = Math.max(0, Math.min(index || 0, images.length - 1));
    paintLightbox();
    box.hidden = false;
    box.setAttribute('aria-hidden', 'false');
    lockLightboxScroll();
  }

  function closeLightbox() {
    var box = $('#labLightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    box.setAttribute('aria-hidden', 'true');
    unlockLightboxScroll();
  }

  function stepLightbox(delta) {
    var imgs = state.galleryImages || [];
    if (imgs.length < 2) return;
    state.galleryIndex = (state.galleryIndex + delta + imgs.length) % imgs.length;
    paintLightbox();
  }

  function bindLightboxOnce() {
    if (lbBound) return;
    lbBound = true;
    var box = $('#labLightbox');
    if (!box) return;
    var stage = $('#vkLbStage') || box;
    var prev = $('#vkLbPrev');
    var next = $('#vkLbNext');
    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); stepLightbox(-1); });
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); stepLightbox(1); });
    $all('[data-close-lightbox]', box).forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (lbIgnoreClose) return;
        closeLightbox();
      });
    });
    function onSwipeStart(e) {
      if (box.hidden || !e.touches || !e.touches.length) return;
      if (e.target.closest && (e.target.closest('.vk-lb-nav') || e.target.closest('[data-close-lightbox]'))) return;
      lbTouch.active = true;
      lbTouch.moved = false;
      lbTouch.x = e.touches[0].clientX;
      lbTouch.y = e.touches[0].clientY;
    }
    function onSwipeMove(e) {
      if (!lbTouch.active || !e.touches || !e.touches.length) return;
      var dx = e.touches[0].clientX - lbTouch.x;
      var dy = e.touches[0].clientY - lbTouch.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        lbTouch.moved = true;
        if (e.cancelable) e.preventDefault();
      }
    }
    function onSwipeEnd(e) {
      if (!lbTouch.active) return;
      var touch = (e.changedTouches && e.changedTouches[0]) || null;
      var dx = touch ? touch.clientX - lbTouch.x : 0;
      var dy = touch ? touch.clientY - lbTouch.y : 0;
      var didSwipe = lbTouch.moved && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy);
      lbTouch.active = false;
      if (!didSwipe) return;
      lbIgnoreClose = true;
      setTimeout(function () { lbIgnoreClose = false; }, 400);
      stepLightbox(dx < 0 ? 1 : -1);
    }
    stage.addEventListener('touchstart', onSwipeStart, { passive: true });
    stage.addEventListener('touchmove', onSwipeMove, { passive: false });
    stage.addEventListener('touchend', onSwipeEnd, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  function parseRoute() {
    var path = location.pathname.replace(/\/$/, '') || '';
    var params = new URLSearchParams(location.search);
    if (params.get('slug')) {
      return { page: 'profile', slug: decodeURIComponent(params.get('slug')) };
    }
    if (UI && UI.parseCategoryRoute) {
      var cr = UI.parseCategoryRoute(path);
      if (cr.ok) {
        return {
          page: 'results',
          categoryId: cr.categoryId,
          regioSlug: cr.regioSlug || null,
          regioInvalid: !!cr.regioInvalid
        };
      }
    }
    var catMatch = path.match(/^\/vakmannen\/([^/]+)(?:\/([^/]+))?$/);
    if (catMatch) {
      var id = decodeURIComponent(catMatch[1]);
      var known = categoryList().some(function (c) { return c.id === id; });
      if (known) {
        return { page: 'results', categoryId: id, regioSlug: catMatch[2] ? decodeURIComponent(catMatch[2]) : null };
      }
      return { page: 'profile', slug: id };
    }
    if (path === '/vakmannen' || path === '/vakmannen.html') {
      return { page: 'list', slug: null };
    }
    return { page: 'list', slug: null };
  }

  function syncUrl(replace) {
    var route = parseRoute();
    if (route.page === 'profile') return;
    var path;
    if (state.mode === 'results') {
      path = UI && UI.buildSearchPath
        ? UI.buildSearchPath(state.category, state.location, state.regioSlug || provinceSlugFor(state.provinceBrowse || (state.location && state.location.province)))
        : '/vakmannen/' + encodeURIComponent(state.category);
    } else {
      path = '/vakmannen';
    }
    if (path === location.pathname + (location.search || '')) return;
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
  }

  function applySearchParamsFromUrl() {
    var params = new URLSearchParams(location.search);
    var postcode = (params.get('postcode') || '').trim();
    var gemeente = (params.get('gemeente') || '').trim();
    if (!postcode && !gemeente) return;
    var items = EV.suggestLocations ? EV.suggestLocations(postcode || gemeente, 12) : [];
    for (var i = 0; i < items.length; i++) {
      var l = items[i];
      if (postcode && String(l.postcode) === postcode) {
        if (!gemeente || l.name.toLowerCase() === gemeente.toLowerCase()) {
          state.location = l;
          state.locationQuery = l.name;
          return;
        }
      }
    }
    if (gemeente) {
      state.locationQuery = gemeente;
      state.location = {
        name: gemeente,
        postcode: postcode || '',
        province: provinceLabelFromSlug(state.regioSlug) || state.location.province
      };
    }
  }

  /* —— Google: live snapshot only (no demo) —— */
  function starsLive(g, opts) {
    opts = opts || {};
    if (!(g && g.show && g.status === 'live' && g.rating != null && g.count != null)) {
      return '';
    }
    return '<div class="lab-stars lab-stars-live" data-review-state="live">' +
      '<svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg> ' +
      esc(String(g.rating).replace('.', ',')) +
      ' <span>• ' + esc(String(g.count)) + ' Google-beoordelingen</span></div>';
  }

  function googleSection(g) {
    if (!(g && g.show && g.status === 'live' && g.rating != null && g.count != null)) return '';
    return (
      '<section class="lab-section"><h2>Google-beoordelingen</h2><div class="lab-google">' +
        '<div class="lab-google-head"><div><div class="lab-google-score">' + esc(String(g.rating).replace('.', ',')) + ' / 5</div>' +
        '<div class="lab-hint">' + esc(String(g.count)) + ' beoordelingen</div></div>' +
        (safeUrl(g.url) ? '<a class="btn btn-ghost btn-sm" href="' + esc(safeUrl(g.url)) + '" target="_blank" rel="noopener noreferrer">Bekijk op Google</a>' : '') +
        '</div>' +
        (g.reviews || []).map(function (r) {
          return '<div class="lab-review"><strong>' + esc(r.author || '') + '</strong>' + esc(r.text || '') + '</div>';
        }).join('') +
        (g.attribution ? '<p class="lab-attr">' + esc(g.attribution) + '</p>' : '') +
      '</div></section>'
    );
  }

  function rowHtml(card) {
    if (!card || !card.slug) return '';
    var href = '/vakmannen/' + encodeURIComponent(card.slug);
    var img = safeUrl(card.coverUrl);
    var media = img
      ? '<img src="' + esc(img) + '" alt="" loading="lazy">'
      : '<span class="lab-row-placeholder" aria-hidden="true">ELYAN</span>';
    var meta = '';
    if (card.serviceAreaText) meta += '<strong>' + esc(card.serviceAreaText) + '</strong>';
    if (card.availabilityLabel) {
      meta += (meta ? '<span class="lab-row-sep"> · </span>' : '') + esc(card.availabilityLabel);
    }
    return (
      '<a class="lab-row" href="' + href + '">' +
        '<div class="lab-row-media">' + media + '</div>' +
        '<div class="lab-row-main">' +
          '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
          '<h3>' + esc(card.displayName || 'Vakbedrijf') + '</h3>' +
          (card.specialtyLine ? '<p class="tagline">' + esc(card.specialtyLine) + '</p>' : '') +
          starsLive(card.google, { compact: true }) +
        '</div>' +
        '<div class="lab-row-meta"><div>' + meta + '</div></div>' +
        '<div class="lab-row-footer">' +
          '<div class="lab-row-price">' +
            '<div class="val">' + esc(card.priceLine || 'Prijs op aanvraag') + '</div>' +
            '<div class="ctx">Prijsindicatie</div>' +
          '</div>' +
          '<span class="btn btn-primary btn-sm">Bekijk vakman</span>' +
        '</div>' +
      '</a>'
    );
  }

  function filtersHtml() {
    var subtypes = cat(state.category).subtypes || [];
    return (
      '<h2>Filters</h2>' +
      '<label>Vakgebied<select id="filterCategory">' +
        categoryList().map(function (c) {
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
        (EV.CUSTOMER_TIMING || []).map(function (t) {
          return '<option value="' + t.id + '"' + (t.id === state.customerTiming ? ' selected' : '') + '>' + esc(t.label) + '</option>';
        }).join('') +
      '</select></label>'
    );
  }

  function diversifyFeatured(pool) {
    var featured = [];
    var seenCat = {};
    var seenSlug = {};
    (pool || []).forEach(function (card) {
      if (!card || !card.slug || seenSlug[card.slug] || featured.length >= 6) return;
      var c = card.primaryCategoryId || '';
      if (c && !seenCat[c]) {
        seenCat[c] = true;
        seenSlug[card.slug] = true;
        featured.push(card);
      }
    });
    (pool || []).forEach(function (card) {
      if (!card || !card.slug || seenSlug[card.slug] || featured.length >= 6) return;
      seenSlug[card.slug] = true;
      featured.push(card);
    });
    return featured.slice(0, 6);
  }

  function renderLanding() {
    var featured = state.featured || [];
    var featuredBlock = featured.length
      ? '<div class="lab-feature-rail">' + featured.map(rowHtml).join('') + '</div>'
      : '<p class="lab-hint">Nog geen gepubliceerde vakbedrijven om uit te lichten. Kies een categorie om te starten.</p>';
    return (
      '<section class="lab-disc-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker">Vakmannen</p>' +
        '<h1>Vind de juiste vakman<br>voor je renovatie.</h1>' +
        '<p class="lead">Ontdek gecontroleerde vakbedrijven, begrijp prijs en timing, en vraag een offerte aan wanneer het past.</p>' +
        '<form class="lab-search" id="vkSearch" autocomplete="off">' +
          '<label>Wat wil je laten uitvoeren?<select name="category">' +
            categoryList().map(function (c) {
              return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + esc(c.label) + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="lab-loc">Waar?' +
            '<input name="location" id="locInput" value="' + esc(state.locationQuery) + '" placeholder="Gemeente of postcode" aria-autocomplete="list" autocomplete="off">' +
            '<div class="lab-suggest" id="locSuggest" hidden></div>' +
          '</label>' +
          '<button type="submit" class="btn btn-primary">Vind vakmannen</button>' +
        '</form>' +
      '</div></section>' +
      '<section class="lab-featured"><div class="lab-wrap">' +
        '<div class="lab-featured-head">' +
          '<div><h2>Uitgelichte vakbedrijven</h2><p class="lab-hint">Ontdek gecontroleerde vakbedrijven op ELYAN.</p></div>' +
          '<button type="button" class="lab-link" id="seeAll">Alle resultaten <svg class="icon"><use href="#i-arrow"></use></svg></button>' +
        '</div>' +
        featuredBlock +
      '</div></section>' +
      '<section class="lab-disc-band vk-discover"><div class="lab-wrap">' +
        '<h2>Ontdek per vakgebied</h2>' +
        '<p class="lab-hint">Bekijk gecontroleerde vakbedrijven per specialisatie.</p>' +
        '<div class="lab-cat-mosaic">' +
          categoryList().map(function (c) {
            return '<button type="button" class="lab-cat' + (state.category === c.id ? ' is-active' : '') + '" data-browse-cat="' + c.id + '">' +
              '<strong>' + esc(c.label) + '</strong></button>';
          }).join('') +
        '</div>' +
      '</div></section>' +
      '<section class="vk-regions"><div class="lab-wrap">' +
        '<h2>Bekijk per provincie</h2>' +
        '<p class="lab-hint">Browse vakmannen in jouw regio. Voor een gerichte zoekactie gebruik je gemeente of postcode hierboven.</p>' +
        '<div class="lab-prov">' +
          provinces().map(function (p) {
            return '<button type="button" data-browse-prov="' + esc(p) + '">' + esc(p) + '</button>';
          }).join('') +
        '</div>' +
      '</div></section>'
    );
  }

  function renderResults() {
    var list = state.results || [];
    var empty = '';
    var status = state.resultsStatus;
    if (status === 'loading') {
      empty = '<div class="vk-empty"><p class="lab-hint">Vakbedrijven laden…</p></div>';
    } else if (status === 'error') {
      empty = '<div class="vk-empty">' +
        '<h2>Kon resultaten niet laden</h2>' +
        '<p>' + esc(state.resultsMessage || 'Probeer het opnieuw.') + '</p>' +
        '<button type="button" class="btn btn-primary" id="retryResults">Opnieuw proberen</button></div>';
    } else if (!list.length) {
      empty = '<div class="vk-empty">' +
        '<p class="vk-pill-note">' + esc(cat(state.category).label) + '</p>' +
        '<h2>Nog geen vakbedrijven in deze selectie</h2>' +
        '<p>We selecteren gecontroleerde partners per vakgebied. Voor ' + esc(cat(state.category).label.toLowerCase()) +
        (state.provinceBrowse ? ' in ' + esc(state.provinceBrowse) : '') +
        ' hebben we momenteel nog geen gepubliceerd profiel dat aan je filters voldoet.</p>' +
        '<button type="button" class="btn btn-ghost" id="backLanding">Andere categorie bekijken</button></div>';
    }
    var locLabel = state.location && state.location.name ? state.location.name : 'jouw regio';
    var locHint = '';
    if (state.location && state.location.postcode) {
      locHint = esc(state.location.postcode) + (state.location.province ? ' · ' + esc(state.location.province) : '');
    } else if (state.provinceBrowse) {
      locHint = esc(state.provinceBrowse);
    }
    return (
      '<div class="lab-wrap lab-results">' +
        '<button type="button" class="lab-link" id="backLanding">← Terug naar ontdekken</button>' +
        '<div class="lab-results-head">' +
          '<h1>' + esc(cat(state.category).plural || cat(state.category).label) + ' rond ' + esc(locLabel) + '</h1>' +
          (locHint ? '<p class="lab-hint">' + locHint + '</p>' : '') +
        '</div>' +
        '<div class="lab-mobile-filters"><button type="button" class="btn btn-ghost btn-sm" id="toggleFilters">Filters</button></div>' +
        '<div class="lab-results-layout">' +
          '<aside class="lab-filters lab-filters-desktop">' + filtersHtml() + '</aside>' +
          '<div>' +
            '<div class="lab-toolbar">' +
              '<p><strong>' + (status === 'ready' ? list.length : '—') + '</strong> passende vakmannen</p>' +
              '<select id="filterSort">' +
                '<option value="aanbevolen"' + (state.sort === 'aanbevolen' ? ' selected' : '') + '>Aanbevolen</option>' +
                '<option value="beschikbaar"' + (state.sort === 'beschikbaar' ? ' selected' : '') + '>Eerst beschikbaar</option>' +
                '<option value="google"' + (state.sort === 'google' ? ' selected' : '') + '>Google-beoordeling</option>' +
              '</select>' +
            '</div>' +
            empty +
            (list.length ? '<div class="lab-list">' + list.map(rowHtml).join('') + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function gallerySources(p) {
    var out = [];
    var seen = {};
    function push(url) {
      var safe = safeUrl(url);
      if (!safe || seen[safe]) return;
      seen[safe] = true;
      out.push(safe);
    }
    push(p.coverUrl);
    (p.assets || []).forEach(function (a) { push(a && a.url); });
    return out.slice(0, 5);
  }

  function galleryHtml(p) {
    var imgs = gallerySources(p);
    if (!imgs.length) return '';
    var desktop = '<div class="lab-gallery vk-gallery-desktop">' +
      imgs.slice(0, 3).map(function (src, i) {
        return '<button type="button" data-gallery-open="' + i + '"><img src="' + esc(src) + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy"></button>';
      }).join('') +
      '</div>';
    var mobile = '<div class="vk-gallery-mobile" data-gallery-root>' +
      '<div class="vk-gallery-scroller" id="vkGalleryScroll">' +
        imgs.map(function (src, i) {
          return '<button type="button" data-gallery-open="' + i + '"><img src="' + esc(src) + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy"></button>';
        }).join('') +
      '</div>' +
      '<div class="vk-gallery-bar">' +
        '<span class="vk-gallery-count" id="vkGalleryCount">1 / ' + imgs.length + '</span>' +
        '<button type="button" class="lab-link" id="vkGalleryAll">Bekijk alle foto’s</button>' +
      '</div></div>';
    return desktop + mobile;
  }

  function introText(p) {
    var story = p.story || {};
    if (story.whyChoose) return story.whyChoose;
    if (story.care) return story.care;
    if (p.specialtyLine) return (p.displayName || 'Dit vakbedrijf') + ' is gespecialiseerd in ' + p.specialtyLine + '.';
    return (p.displayName || 'Dit vakbedrijf') + ' is een nagekeken vakbedrijf op ELYAN.';
  }

  function priceDisplay(p) {
    if (p.pricing && p.pricing.length && p.pricing[0].displayString) return p.pricing[0].displayString;
    return 'Prijs op aanvraag';
  }

  function renderProfile(p) {
    if (state.profileStatus === 'loading') {
      return '<div class="lab-wrap" style="padding:48px 20px;"><p class="lab-hint">Profiel laden…</p></div>';
    }
    if (state.profileStatus === 'error' || !p) {
      return '<div class="lab-wrap" style="padding:48px 20px;"><div class="vk-empty"><h2>Vakman niet gevonden</h2><p>' +
        esc(state.profileMessage || 'Dit profiel bestaat niet of is nog niet gepubliceerd.') +
        '</p><a class="btn btn-primary" href="/vakmannen">Naar vakmannen</a></div></div>';
    }

    document.title = (p.displayName || 'Vakman') + ' | ELYAN';
    var cover = safeUrl(p.coverUrl);
    var place = (p.location && (p.location.gemeente || p.location.provincieLabel)) || '';
    var area = (p.serviceArea && p.serviceArea.publicText) || '—';
    var start = (p.availability && p.availability.startMonthLabel) || 'Op aanvraag';
    var visit = (p.availability && p.availability.visitLabel) || 'Op afspraak';
    var capacity = (p.availability && p.availability.capacityLabel) || '';
    var story = p.story || {};
    var strengths = [story.strength, story.prefer].filter(Boolean);
    var priceRows = (p.pricing || []).map(function (row) {
      return '<div class="lab-price-row"><span>' + esc(row.serviceLabel || row.serviceId || 'Dienst') +
        '</span><strong>' + esc(row.displayString || 'Op aanvraag') + '</strong></div>';
    }).join('');
    if (p.projectMinimum) {
      priceRows += '<div class="lab-price-row"><span>Minimum project</span><strong>' + esc(p.projectMinimum) + '</strong></div>';
    }
    var optionalFacts = '';
    if (story.yearsActive) {
      optionalFacts += '<div class="lab-fact"><span>Jaren actief</span><strong>' + esc(String(story.yearsActive)) + '</strong></div>';
    }
    if (story.teamSize) {
      optionalFacts += '<div class="lab-fact"><span>Team</span><strong>' + esc(String(story.teamSize)) + '</strong></div>';
    }
    var media = cover
      ? '<img src="' + esc(cover) + '" alt="">'
      : '<span class="lab-row-placeholder" aria-hidden="true">ELYAN</span>';

    return (
      '<div class="lab-wrap lab-profile">' +
        '<a class="lab-link vk-back" href="/vakmannen">← Terug naar vakmannen</a>' +
        '<header class="lab-identity">' +
          '<div class="lab-identity-visual">' + media + '</div>' +
          '<div class="lab-identity-copy">' +
            '<div class="lab-identity-trust">' +
              '<p class="lab-kicker">ELYAN vakman</p>' +
              '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
            '</div>' +
            '<h1>' + esc(p.displayName || 'Vakbedrijf') + '</h1>' +
            (place ? '<p class="lab-identity-place">' + esc(place) + '</p>' : '') +
            starsLive(p.google) +
          '</div>' +
          '<div class="lab-identity-actions">' +
            '<button type="button" class="btn btn-primary" id="startQuote">Offerte aanvragen</button>' +
          '</div>' +
        '</header>' +
        '<div class="lab-glance">' +
          '<div><span>Werkgebied</span><strong>' + esc(area) + '</strong></div>' +
          '<div><span>Eerste mogelijke start</span><strong>' + esc(start) + '</strong></div>' +
          '<div class="is-price"><span>Prijsindicatie</span><strong>' + esc(priceDisplay(p)) + '</strong></div>' +
          '<div><span>Plaatsbezoek</span><strong>' + esc(visit) + '</strong></div>' +
        '</div>' +
        galleryHtml(p) +
        '<div class="lab-profile-grid"><div>' +
          '<section class="lab-section"><h2>Over ' + esc(p.displayName || 'dit vakbedrijf') + '</h2><p>' + esc(introText(p)) + '</p></section>' +
          (strengths.length
            ? '<section class="lab-section"><h2>Waar ze sterk in zijn</h2><div class="lab-strengths">' +
              strengths.map(function (s) { return '<span class="lab-strength">' + esc(s) + '</span>'; }).join('') +
              '</div></section>'
            : '') +
          '<section class="lab-section"><h2>Prijzen</h2><div class="lab-price-table">' +
            (priceRows || '<div class="lab-price-row"><span>Richtprijs</span><strong>Prijs op aanvraag</strong></div>') +
          '</div><p class="lab-hint" style="margin-top:10px;">Prijzen zijn indicaties van het vakbedrijf. De uiteindelijke prijs hangt af van het concrete project en de offerte.</p></section>' +
          '<section class="lab-section"><h2>Beschikbaarheid</h2><div class="lab-facts">' +
            '<div class="lab-fact"><span>Eerste mogelijkheid</span><strong>' + esc(start) + '</strong></div>' +
            (capacity ? '<div class="lab-fact"><span>Capaciteit</span><strong>' + esc(capacity) + '</strong></div>' : '') +
            '<div class="lab-fact"><span>Plaatsbezoek</span><strong>' + esc(visit) + '</strong></div>' +
          '</div></section>' +
          googleSection(p.google) +
          (optionalFacts ? '<section class="lab-section"><h2>Extra</h2><div class="lab-facts">' + optionalFacts + '</div></section>' : '') +
        '</div>' +
        '<aside class="lab-side-sticky" id="vk-next-step">' +
          '<h3>Volgende stap</h3>' +
          '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag — zonder rechtstreeks contact met het vakbedrijf.</p>' +
          '<button type="button" class="btn btn-primary btn-block" id="startQuoteSide">Offerte aanvragen</button>' +
          '<p class="lab-hint" id="vk-aanvraag-note" ' + (state.aanvraagNote ? '' : 'hidden') +
          '>Je aanvraag loopt via ELYAN. De volledige aanvraagflow volgt; er wordt geen telefoon of e-mail van het vakbedrijf gedeeld.</p>' +
        '</aside></div></div>'
    );
  }

  function bindLoc() {
    var input = $('#locInput');
    var box = $('#locSuggest');
    if (!input || !box) return;
    function update() {
      var items = EV.suggestLocations ? EV.suggestLocations(input.value, 8) : [];
      if (UI && UI.filterVlaanderenBrussel) items = UI.filterVlaanderenBrussel(items);
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

  function goResults(opts) {
    opts = opts || {};
    state.mode = 'results';
    if (opts.category) state.category = opts.category;
    if (opts.provinceBrowse != null) state.provinceBrowse = opts.provinceBrowse;
    if (opts.regioSlug != null) state.regioSlug = opts.regioSlug;
    if (opts.pushUrl !== false) syncUrl(!!opts.replaceUrl);
    render();
    loadResults();
  }

  function goLanding(opts) {
    opts = opts || {};
    state.mode = 'landing';
    state.provinceBrowse = null;
    state.regioSlug = null;
    if (opts.pushUrl !== false) syncUrl(!!opts.replaceUrl);
    render();
    loadFeatured();
  }

  function bindCommon() {
    var search = $('#vkSearch');
    if (search) {
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        state.category = search.category.value;
        state.subtype = 'alle';
        var match = EV.suggestLocations ? EV.suggestLocations(($('#locInput') || {}).value || '', 1)[0] : null;
        if (match) state.location = match;
        state.locationQuery = state.location.name;
        state.provinceBrowse = null;
        state.regioSlug = provinceSlugFor(state.location.province);
        goResults({ replaceUrl: false });
      });
    }
    bindLoc();
    $all('[data-browse-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goResults({
          category: btn.getAttribute('data-browse-cat'),
          provinceBrowse: null,
          regioSlug: null
        });
      });
    });
    $all('[data-browse-prov]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var prov = btn.getAttribute('data-browse-prov');
        goResults({ provinceBrowse: prov, regioSlug: provinceSlugFor(prov) });
      });
    });
    var seeAll = $('#seeAll');
    if (seeAll) seeAll.addEventListener('click', function () { goResults({}); });
    var back = $('#backLanding');
    if (back) back.addEventListener('click', function () { goLanding({}); });
    var retry = $('#retryResults');
    if (retry) retry.addEventListener('click', function () { loadResults(); });

    ['filterCategory', 'filterSubtype', 'filterTiming', 'filterSort'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterCategory') { state.category = el.value; state.subtype = 'alle'; }
        if (id === 'filterSubtype') state.subtype = el.value;
        if (id === 'filterTiming') state.customerTiming = el.value;
        if (id === 'filterSort') state.sort = el.value;
        syncUrl(true);
        loadResults();
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
            syncUrl(true);
            loadResults();
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

    var routeNow = parseRoute();
    var profileGallery = [];
    if (routeNow.page === 'profile' && state.profile) {
      profileGallery = gallerySources(state.profile);
    }
    state.galleryImages = profileGallery.slice();
    $all('[data-gallery-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLightbox(profileGallery, Number(btn.getAttribute('data-gallery-open')) || 0);
      });
    });
    var allBtn = $('#vkGalleryAll');
    if (allBtn) {
      allBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox(profileGallery, 0);
      });
    }
    var scroller = $('#vkGalleryScroll');
    var countEl = $('#vkGalleryCount');
    if (scroller && countEl && profileGallery.length) {
      scroller.addEventListener('scroll', function () {
        var w = scroller.querySelector('button');
        if (!w) return;
        var idx = Math.round(scroller.scrollLeft / Math.max(1, w.offsetWidth + 10));
        idx = Math.max(0, Math.min(idx, profileGallery.length - 1));
        countEl.textContent = (idx + 1) + ' / ' + profileGallery.length;
      }, { passive: true });
    }

    function showAanvraagStub() {
      state.aanvraagNote = true;
      var note = $('#vk-aanvraag-note');
      var aside = $('#vk-next-step');
      if (note) note.hidden = false;
      if (aside && aside.scrollIntoView) {
        aside.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    var sq = $('#startQuote');
    var sqs = $('#startQuoteSide');
    if (sq) sq.addEventListener('click', showAanvraagStub);
    if (sqs) sqs.addEventListener('click', showAanvraagStub);
  }

  function apiSort() {
    if (state.sort === 'beschikbaar') return 'availability';
    if (state.sort === 'google') return 'relevance';
    return 'relevance';
  }

  function loadFeatured() {
    var requests = FEATURED_CATEGORIES.map(function (catId) {
      var url = '/api/public/v1/search?category=' + encodeURIComponent(catId) +
        '&page=1&pageSize=2&sort=relevance&includeUnpriced=true';
      return fetchJson(url).then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.results)) return [];
        return data.results;
      }).catch(function () { return []; });
    });
    Promise.all(requests).then(function (batches) {
      var pool = [];
      batches.forEach(function (b) { pool = pool.concat(b || []); });
      state.featured = diversifyFeatured(pool);
      if (state.mode === 'landing' && parseRoute().page === 'list') render();
    });
  }

  function loadResults() {
    state.resultsStatus = 'loading';
    state.resultsMessage = '';
    render();
    var params = new URLSearchParams();
    params.set('category', state.category);
    params.set('page', '1');
    params.set('pageSize', '24');
    params.set('sort', apiSort());
    params.set('includeUnpriced', 'true');
    if (state.subtype && state.subtype !== 'alle') params.set('dienst', state.subtype);
    if (state.location && state.location.postcode) params.set('postcode', state.location.postcode);
    if (state.location && state.location.name) params.set('gemeente', state.location.name);
    var regio = state.regioSlug || provinceSlugFor(state.provinceBrowse);
    if (regio) params.set('provincie', regio);
    fetchJson('/api/public/v1/search?' + params.toString())
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.results)) throw new Error('bad_payload');
        state.results = data.results;
        state.resultsTotal = data.total != null ? data.total : data.results.length;
        state.resultsStatus = 'ready';
        render();
      })
      .catch(function () {
        state.results = [];
        state.resultsStatus = 'error';
        state.resultsMessage = 'Resultaten konden niet geladen worden.';
        render();
      });
  }

  function loadProfile(slug) {
    state.profileStatus = 'loading';
    state.profile = null;
    state.aanvraagNote = false;
    render();
    fetchJson('/api/public/v1/professionals/' + encodeURIComponent(slug))
      .then(function (data) {
        if (!data || !data.ok || !data.professional) throw new Error('not_found');
        state.profile = data.professional;
        state.profileStatus = 'ready';
        render();
      })
      .catch(function () {
        state.profile = null;
        state.profileStatus = 'error';
        state.profileMessage = 'Dit profiel bestaat niet of is nog niet gepubliceerd.';
        render();
      });
  }

  function render() {
    var host = $('#vk-app');
    if (!host) return;
    var route = parseRoute();
    if (route.page === 'profile') {
      host.innerHTML = renderProfile(state.profile);
    } else if (state.mode === 'results' || route.page === 'results') {
      host.innerHTML = renderResults();
    } else {
      host.innerHTML = renderLanding();
    }
    bindLightboxOnce();
    bindCommon();
  }

  function bootFromRoute() {
    var route = parseRoute();
    applySearchParamsFromUrl();
    if (route.page === 'profile') {
      state.mode = 'landing';
      loadProfile(route.slug);
      return;
    }
    if (route.page === 'results') {
      state.category = route.categoryId || state.category;
      state.regioSlug = route.regioSlug || null;
      if (route.regioSlug) {
        var label = provinceLabelFromSlug(route.regioSlug);
        if (label) state.provinceBrowse = label;
      }
      state.mode = 'results';
      render();
      loadResults();
      return;
    }
    state.mode = 'landing';
    render();
    loadFeatured();
  }

  window.addEventListener('popstate', function () {
    bootFromRoute();
  });

  bindLightboxOnce();
  bootFromRoute();
  bootDone = true;
})();
