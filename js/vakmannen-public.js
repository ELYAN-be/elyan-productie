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

  var state = {
    mode: 'marketplace',
    category: 'dakwerken',
    hasCategoryFilter: false,
    subtype: 'alle',
    location: { name: 'Antwerpen', postcode: '2000', province: 'Antwerpen' },
    locationQuery: '',
    provinceBrowse: null,
    regioSlug: null,
    customerTiming: 'alle',
    filterAvailability: '',
    sort: 'aanbevolen',
    results: [],
    resultsTotal: 0,
    resultsStatus: 'idle',
    resultsMessage: '',
    platformHasSupply: null,
    platformSupplyStatus: 'idle',
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

  function categoryLabel(id) {
    return cat(id).label || id || '';
  }

  function isTemporarilyFull(target) {
    if (!target) return false;
    if (target.atCapacity === true) return true;
    if (target.capacityId === 'full') return true;
    var avail = target.availability || {};
    if (avail.capacityId === 'full') return true;
    var label = String(target.availabilityLabel || avail.capacityLabel || '').toLowerCase();
    return label.indexOf('volzet') >= 0;
  }

  function hasPublicPricing(target) {
    if (!target) return false;
    if (target.hasPublicPricing === true) return true;
    return (target.pricing || []).some(function (row) {
      return row.priceSource === 'partner' && row.displayString && row.displayString !== 'Prijs op aanvraag';
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
    if (state.hasCategoryFilter && state.category) {
      path = UI && UI.buildSearchPath
        ? UI.buildSearchPath(state.category, state.location, state.regioSlug || provinceSlugFor(state.provinceBrowse || (state.location && state.location.province)))
        : '/vakmannen/' + encodeURIComponent(state.category);
    } else {
      path = '/vakmannen';
    }
    var full = path;
    if (full === location.pathname + (location.search || '')) return;
    if (replace) history.replaceState(null, '', full);
    else history.pushState(null, '', full);
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
    var chips = (card.serviceChips || []).slice(0, 3).map(function (c) {
      return '<span class="lab-chip">' + esc(c) + '</span>';
    }).join('');
    var priceHint = hasPublicPricing(card)
      ? '<div class="ctx vk-price-hint">Eigen prijsindicaties beschikbaar</div>'
      : '<div class="ctx">Prijsindicatie</div>';
    var full = isTemporarilyFull(card);
    return (
      '<a class="lab-row' + (full ? ' is-at-capacity' : '') + '" href="' + href + '">' +
        '<div class="lab-row-media">' + media + '</div>' +
        '<div class="lab-row-main">' +
          '<p class="lab-kicker">' + esc(categoryLabel(card.primaryCategoryId)) + '</p>' +
          '<h3>' + esc(card.displayName || 'Vakbedrijf') + '</h3>' +
          (card.specialtyLine ? '<p class="tagline">' + esc(card.specialtyLine) + '</p>' : '') +
          (chips ? '<div class="lab-row-chips">' + chips + '</div>' : '') +
          starsLive(card.google, { compact: true }) +
        '</div>' +
        '<div class="lab-row-meta"><div>' + meta + '</div></div>' +
        '<div class="lab-row-footer">' +
          '<div class="lab-row-price">' +
            '<div class="val">' + esc(card.priceLine || 'Prijs op aanvraag') + '</div>' +
            priceHint +
          '</div>' +
          '<span class="btn btn-primary btn-sm">Bekijk profiel <span aria-hidden="true">→</span></span>' +
        '</div>' +
      '</a>'
    );
  }

  function filterFieldsHtml() {
    var subtypes = cat(state.category).subtypes || [];
    return (
      '<div class="vk-filter-fields">' +
      '<label>Vakgebied<select id="filterCategory">' +
        categoryList().map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === state.category ? ' selected' : '') + '>' + esc(c.label) + '</option>';
        }).join('') +
      '</select></label>' +
      (subtypes.length
        ? '<label>Specialisatie<select id="filterSubtype">' +
            '<option value="alle"' + (state.subtype === 'alle' ? ' selected' : '') + '>Alle specialisaties</option>' +
            subtypes.map(function (t) {
              return '<option value="' + t.id + '"' + (state.subtype === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>';
            }).join('') +
          '</select></label>'
        : '') +
      '<label>Beschikbaarheid<select id="filterAvailability">' +
        '<option value=""' + (!state.filterAvailability ? ' selected' : '') + '>Alle</option>' +
        '<option value="available"' + (state.filterAvailability === 'available' ? ' selected' : '') + '>Nieuwe projecten mogelijk</option>' +
        '<option value="limited"' + (state.filterAvailability === 'limited' ? ' selected' : '') + '>Beperkt beschikbaar</option>' +
        '<option value="full"' + (state.filterAvailability === 'full' ? ' selected' : '') + '>Tijdelijk volzet</option>' +
      '</select></label>' +
      '</div>'
    );
  }

  function filtersHtml() {
    return '<h2 class="lab-filters-title">Filters</h2>' + filterFieldsHtml();
  }

  function hasDrawerFilters() {
    return true;
  }

  function hasActiveFilters() {
    return !!(
      state.hasCategoryFilter ||
      (state.locationQuery && String(state.locationQuery).trim()) ||
      state.regioSlug ||
      state.provinceBrowse ||
      (state.subtype && state.subtype !== 'alle') ||
      state.filterAvailability
    );
  }

  function clearFilters() {
    state.subtype = 'alle';
    state.filterAvailability = '';
    state.locationQuery = '';
    state.location = { name: '', postcode: '', province: '' };
    state.regioSlug = null;
    state.provinceBrowse = null;
    syncUrl(true);
    if (state.hasCategoryFilter) loadResults();
    else loadBrowseResults();
  }

  function emptyPlatformHtml() {
    return (
      '<div class="vk-empty vk-empty--platform">' +
        '<h2>Vakbedrijven bij ELYAN</h2>' +
        '<p>We bouwen ons netwerk zorgvuldig op.</p>' +
        '<p>Binnenkort vind je hier vakbedrijven die passen bij verschillende renovatieprojecten.</p>' +
      '</div>'
    );
  }

  function emptyFilterHtml() {
    return (
      '<div class="vk-empty vk-empty--filter">' +
        '<h2>Geen vakbedrijven gevonden voor deze zoekopdracht.</h2>' +
        '<p>Pas je locatie of filters aan.</p>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="clearFilters">Filters wissen</button>' +
      '</div>'
    );
  }

  function searchFormHtml() {
    var catOptions = '<option value="">Kies vakgebied</option>' +
      categoryList().map(function (c) {
        var selected = state.hasCategoryFilter && c.id === state.category;
        return '<option value="' + c.id + '"' + (selected ? ' selected' : '') + '>' + esc(c.label) + '</option>';
      }).join('');
    return (
      '<form class="lab-search vk-mp-search" id="vkSearch" autocomplete="off">' +
        '<label>Vakgebied<select name="category">' + catOptions + '</select></label>' +
        '<label class="lab-loc">Locatie of postcode' +
          '<input name="location" id="locInput" value="' + esc(state.locationQuery || '') + '" placeholder="Gemeente of postcode" aria-autocomplete="list" autocomplete="off">' +
          '<div class="lab-suggest" id="locSuggest" hidden></div>' +
        '</label>' +
        '<button type="submit" class="btn btn-primary">Zoeken</button>' +
      '</form>'
    );
  }

  function resultsBodyHtml() {
    var list = state.results || [];
    var status = state.resultsStatus;
    if (status === 'loading') {
      return '<div class="vk-empty"><p class="lab-hint">Vakbedrijven laden…</p></div>';
    }
    if (status === 'error') {
      return (
        '<div class="vk-empty">' +
          '<h2>Kon resultaten niet laden</h2>' +
          '<p>' + esc(state.resultsMessage || 'Probeer het opnieuw.') + '</p>' +
          '<button type="button" class="btn btn-primary" id="retryResults">Opnieuw proberen</button>' +
        '</div>'
      );
    }
    if (!list.length) {
      if (state.platformSupplyStatus === 'ready' && state.platformHasSupply === false) {
        return emptyPlatformHtml();
      }
      if (hasActiveFilters()) return emptyFilterHtml();
      if (state.platformSupplyStatus === 'ready' && !state.platformHasSupply) {
        return emptyPlatformHtml();
      }
      return emptyFilterHtml();
    }
    return '<div class="lab-list">' + list.map(rowHtml).join('') + '</div>';
  }

  function renderMarketplace() {
    var context = '';
    if (state.resultsStatus === 'ready' && state.results.length && state.hasCategoryFilter) {
      var locLabel = state.location && state.location.name ? ' rond ' + state.location.name : '';
      context = '<p class="lab-hint vk-mp-context"><strong>' + state.results.length + '</strong> vakbedrijven voor ' +
        esc(cat(state.category).label.toLowerCase()) + esc(locLabel) + '</p>';
    }
    return (
      '<div class="lab-wrap vk-marketplace lab-results">' +
        '<header class="vk-mp-head" id="vk-search">' +
          '<h1>Vind een vakbedrijf voor je renovatie</h1>' +
          '<p class="lead">Zoek op vakgebied en regio.</p>' +
        '</header>' +
        searchFormHtml() +
        context +
        (hasDrawerFilters()
          ? '<div class="lab-mobile-filters"><button type="button" class="btn btn-ghost btn-sm" id="toggleFilters">Filters</button></div>'
          : '') +
        '<div class="lab-results-layout">' +
          '<aside class="lab-filters lab-filters-desktop">' + filtersHtml() + '</aside>' +
          '<div>' + resultsBodyHtml() + '</div>' +
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
    return (p.displayName || 'Dit vakbedrijf') + ' is actief op ELYAN voor renovatieprojecten in de regio.';
  }

  function priceDisplay(p) {
    if (p.pricing && p.pricing.length && p.pricing[0].displayString) return p.pricing[0].displayString;
    return 'Prijs op aanvraag';
  }

  function partnerPriceSourceLabel(p, row) {
    if (row && row.priceSourceLabel) return row.priceSourceLabel;
    return 'Door het vakbedrijf aangeleverde prijsindicatie · geen offerte';
  }

  function servicesSection(p) {
    var services = (p.services || []).map(function (s) {
      return '<span class="lab-strength">' + esc(s.label || s.id) + '</span>';
    }).join('');
    if (!services) return '';
    return '<section class="lab-section"><h2>Diensten & specialisaties</h2><div class="lab-strengths">' + services + '</div></section>';
  }

  function requestCtaHtml(full) {
    if (full) {
      return (
        '<p class="vk-capacity-note" role="status"><strong>Tijdelijk volzet</strong> — dit vakbedrijf kan momenteel geen nieuwe aanvragen ontvangen.</p>' +
        '<button type="button" class="btn btn-ghost btn-block" disabled aria-disabled="true">Vraag via ELYAN aan</button>'
      );
    }
    return '<button type="button" class="btn btn-primary btn-block" id="startQuoteSide">Vraag via ELYAN aan <span aria-hidden="true">→</span></button>';
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
    var full = isTemporarilyFull(p);
    var story = p.story || {};
    var strengths = [story.strength, story.prefer].filter(Boolean);
    var pricedRows = (p.pricing || []).filter(function (row) {
      return row.priceSource === 'partner' && row.displayString && row.displayString !== 'Prijs op aanvraag';
    });
    var priceRows = pricedRows.map(function (row) {
      return '<div class="lab-price-row"><span>' + esc(row.serviceLabel || row.serviceId || 'Dienst') +
        '</span><strong>' + esc(row.displayString || 'Op aanvraag') + '</strong></div>';
    }).join('');
    if (!priceRows) {
      priceRows = '<div class="lab-price-row"><span>Richtprijs</span><strong>Prijs op aanvraag</strong></div>';
    }
    var priceIntro = pricedRows.length
      ? '<p class="lab-hint vk-price-source">Indicatieve prijs van ' + esc(p.displayName || 'dit vakbedrijf') +
        ' · ' + esc(partnerPriceSourceLabel(p, pricedRows[0])) + '</p>'
      : '<p class="lab-hint">Geen publieke prijsindicatie beschikbaar voor dit profiel.</p>';
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
            '<p class="lab-kicker">' + esc(categoryLabel(p.primaryCategoryId)) + '</p>' +
            '<h1>' + esc(p.displayName || 'Vakbedrijf') + '</h1>' +
            (p.specialtyLine ? '<p class="lab-identity-place">' + esc(p.specialtyLine) + '</p>' : '') +
            (place ? '<p class="lab-identity-place">' + esc(place) + '</p>' : '') +
            (capacity ? '<p class="vk-availability-pill' + (full ? ' is-full' : '') + '" role="status">' + esc(capacity) + '</p>' : '') +
            starsLive(p.google) +
          '</div>' +
          '<div class="lab-identity-actions">' +
            (full
              ? '<p class="vk-capacity-note" role="status"><strong>Tijdelijk volzet</strong></p>' +
                '<button type="button" class="btn btn-ghost" disabled aria-disabled="true">Vraag via ELYAN aan</button>'
              : '<button type="button" class="btn btn-primary" id="startQuote">Vraag via ELYAN aan <span aria-hidden="true">→</span></button>') +
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
          servicesSection(p) +
          '<section class="lab-section"><h2>Werkgebied</h2><p>' + esc(area) + '</p></section>' +
          '<section class="lab-section"><h2>Prijzen</h2>' + priceIntro + '<div class="lab-price-table">' +
            priceRows +
          '</div></section>' +
          '<section class="lab-section"><h2>Beschikbaarheid</h2><div class="lab-facts">' +
            '<div class="lab-fact"><span>Eerste mogelijkheid</span><strong>' + esc(start) + '</strong></div>' +
            (capacity ? '<div class="lab-fact"><span>Beschikbaarheid</span><strong>' + esc(capacity) + '</strong></div>' : '') +
            '<div class="lab-fact"><span>Plaatsbezoek</span><strong>' + esc(visit) + '</strong></div>' +
          '</div></section>' +
          googleSection(p.google) +
          (optionalFacts ? '<section class="lab-section"><h2>Extra</h2><div class="lab-facts">' + optionalFacts + '</div></section>' : '') +
        '</div>' +
        '<aside class="lab-side-sticky" id="vk-next-step">' +
          '<h3>Volgende stap</h3>' +
          '<p>Vertel wat je wilt laten uitvoeren. ELYAN begeleidt je aanvraag — zonder rechtstreeks contact met het vakbedrijf.</p>' +
          requestCtaHtml(full) +
          '<p class="lab-hint" id="vk-aanvraag-note" hidden>Je aanvraag loopt via ELYAN. Er wordt geen telefoon of e-mail van het vakbedrijf gedeeld.</p>' +
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
    state.mode = 'marketplace';
    state.hasCategoryFilter = true;
    if (opts.category) state.category = opts.category;
    if (opts.provinceBrowse != null) state.provinceBrowse = opts.provinceBrowse;
    if (opts.regioSlug != null) state.regioSlug = opts.regioSlug;
    if (opts.pushUrl !== false) syncUrl(!!opts.replaceUrl);
    render();
    loadResults();
  }

  function goBrowse(opts) {
    opts = opts || {};
    state.mode = 'marketplace';
    state.hasCategoryFilter = false;
    state.provinceBrowse = null;
    state.regioSlug = null;
    if (opts.pushUrl !== false) syncUrl(!!opts.replaceUrl);
    render();
    loadBrowseResults();
  }

  function bindCommon() {
    var search = $('#vkSearch');
    if (search) {
      search.addEventListener('submit', function (e) {
        e.preventDefault();
        var catVal = String(search.category.value || '').trim();
        var locRaw = String(($('#locInput') || {}).value || '').trim();
        state.subtype = 'alle';
        if (catVal) {
          state.category = catVal;
          state.hasCategoryFilter = true;
        } else {
          state.hasCategoryFilter = false;
        }
        if (locRaw) {
          var match = EV.suggestLocations ? EV.suggestLocations(locRaw, 1)[0] : null;
          if (match) {
            state.location = match;
            state.locationQuery = match.name;
          } else {
            state.locationQuery = locRaw;
            state.location = {
              name: locRaw,
              postcode: /^\d{4}$/.test(locRaw) ? locRaw : '',
              province: provinceLabelFromSlug(state.regioSlug) || (state.location && state.location.province)
            };
          }
          state.provinceBrowse = null;
          state.regioSlug = provinceSlugFor(state.location.province);
        } else {
          state.locationQuery = '';
        }
        if (state.hasCategoryFilter) goResults({ replaceUrl: false });
        else goBrowse({ replaceUrl: false });
      });
    }
    bindLoc();
    var retry = $('#retryResults');
    if (retry) retry.addEventListener('click', function () {
      if (state.hasCategoryFilter) loadResults();
      else loadBrowseResults();
    });
    var clearBtn = $('#clearFilters');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    ['filterCategory', 'filterSubtype', 'filterAvailability'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'filterCategory') {
          state.category = el.value;
          state.subtype = 'alle';
          state.hasCategoryFilter = !!el.value;
        }
        if (id === 'filterSubtype') state.subtype = el.value;
        if (id === 'filterAvailability') state.filterAvailability = el.value;
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
        body.innerHTML = filterFieldsHtml() +
          '<div class="vk-filter-actions"><button type="button" class="btn btn-primary btn-block" id="applyFilters">Toepassen</button>' +
          '<button type="button" class="btn btn-ghost btn-block" id="resetFilters">Filters wissen</button></div>';
        d.hidden = false;
        document.body.classList.add('lock-scroll');
        var applyBtn = body.querySelector('#applyFilters');
        if (applyBtn) {
          applyBtn.addEventListener('click', function () {
            var catEl = body.querySelector('#filterCategory');
            var subEl = body.querySelector('#filterSubtype');
            var availEl = body.querySelector('#filterAvailability');
            if (catEl) {
              state.category = catEl.value;
              state.subtype = 'alle';
              state.hasCategoryFilter = !!catEl.value;
            }
            if (subEl) state.subtype = subEl.value;
            if (availEl) state.filterAvailability = availEl.value;
            d.hidden = true;
            document.body.classList.remove('lock-scroll');
            syncUrl(true);
            loadResults();
          });
        }
        var resetBtn = body.querySelector('#resetFilters');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            d.hidden = true;
            document.body.classList.remove('lock-scroll');
            clearFilters();
          });
        }
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

    function goAanvraag() {
      var slug = state.profile && state.profile.slug;
      if (!slug || isTemporarilyFull(state.profile)) return;
      var href = UI && UI.buildAanvraagPath
        ? UI.buildAanvraagPath(slug)
        : '/vakmannen/p/' + encodeURIComponent(slug) + '/aanvraag';
      window.location.href = href;
    }
    var sq = $('#startQuote');
    var sqs = $('#startQuoteSide');
    if (sq) sq.addEventListener('click', goAanvraag);
    if (sqs) sqs.addEventListener('click', goAanvraag);
  }

  function apiSort() {
    if (state.sort === 'beschikbaar') return 'availability';
    if (state.sort === 'google') return 'relevance';
    return 'relevance';
  }

  function checkPlatformSupply() {
    state.platformSupplyStatus = 'loading';
    var requests = categoryList().map(function (c) {
      return fetchJson('/api/public/v1/search?category=' + encodeURIComponent(c.id) +
        '&page=1&pageSize=1&sort=relevance&includeUnpriced=true')
        .then(function (data) {
          if (!data || !data.ok) return 0;
          return data.total != null ? data.total : ((data.results || []).length ? 1 : 0);
        })
        .catch(function () { return 0; });
    });
    return Promise.all(requests).then(function (totals) {
      var sum = totals.reduce(function (a, b) { return a + b; }, 0);
      state.platformHasSupply = sum > 0;
      state.platformSupplyStatus = 'ready';
    });
  }

  function loadBrowseResults() {
    state.resultsStatus = 'loading';
    state.resultsMessage = '';
    render();
    var requests = categoryList().map(function (c) {
      return fetchJson('/api/public/v1/search?category=' + encodeURIComponent(c.id) +
        '&page=1&pageSize=4&sort=relevance&includeUnpriced=true')
        .then(function (data) {
          if (!data || !data.ok || !Array.isArray(data.results)) return [];
          return data.results;
        })
        .catch(function () { return []; });
    });
    Promise.all(requests).then(function (batches) {
      var pool = [];
      var seen = {};
      batches.forEach(function (batch) {
        (batch || []).forEach(function (card) {
          if (!card || !card.slug || seen[card.slug]) return;
          seen[card.slug] = true;
          pool.push(card);
        });
      });
      state.results = pool;
      state.resultsTotal = pool.length;
      state.resultsStatus = 'ready';
      if (state.platformSupplyStatus !== 'ready') {
        state.platformHasSupply = pool.length > 0;
        state.platformSupplyStatus = 'ready';
      }
      render();
    }).catch(function () {
      state.results = [];
      state.resultsStatus = 'error';
      state.resultsMessage = 'Resultaten konden niet geladen worden.';
      render();
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
    if (state.filterAvailability) params.set('availability', state.filterAvailability);
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
    } else {
      host.innerHTML = renderMarketplace();
    }
    bindLightboxOnce();
    bindCommon();
  }

  function bootFromRoute() {
    var route = parseRoute();
    applySearchParamsFromUrl();
    if (route.page === 'profile') {
      loadProfile(route.slug);
      return;
    }
    if (route.page === 'results') {
      state.category = route.categoryId || state.category;
      state.hasCategoryFilter = true;
      state.regioSlug = route.regioSlug || null;
      if (route.regioSlug) {
        var label = provinceLabelFromSlug(route.regioSlug);
        if (label) state.provinceBrowse = label;
      }
      state.mode = 'marketplace';
      checkPlatformSupply().then(function () {
        render();
        loadResults();
      });
      return;
    }
    state.mode = 'marketplace';
    state.hasCategoryFilter = false;
    state.locationQuery = state.locationQuery || '';
    checkPlatformSupply().then(function () {
      render();
      loadBrowseResults();
    });
  }

  window.addEventListener('popstate', function () {
    bootFromRoute();
  });

  bindLightboxOnce();
  bootFromRoute();
  if (location.hash === '#vk-search') {
    requestAnimationFrame(function () {
      var anchor = document.getElementById('vk-search');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  bootDone = true;
})();
