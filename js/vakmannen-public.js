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
    quote: null,
    galleryImages: [],
    galleryIndex: 0
  };

  var lbScrollY = 0;
  var lbTouch = { active: false, x: 0, y: 0, moved: false };
  var lbBound = false;
  var lbIgnoreClose = false;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function lockLightboxScroll() {
    lbScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = '-' + lbScrollY + 'px';
    document.body.classList.add('lock-scroll', 'vk-lb-open');
  }
  function unlockLightboxScroll() {
    var y = lbScrollY || 0;
    document.body.classList.remove('lock-scroll', 'vk-lb-open');
    document.body.style.top = '';
    /* Safari/iOS often resets scroll when leaving position:fixed — restore after layout */
    window.scrollTo(0, y);
    requestAnimationFrame(function () {
      window.scrollTo(0, y);
    });
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
    if (prev) {
      prev.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        stepLightbox(-1);
      });
    }
    if (next) {
      next.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        stepLightbox(1);
      });
    }

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
    var path = location.pathname.replace(/\/$/, '');
    var params = new URLSearchParams(location.search);
    if (params.get('slug')) return { page: 'profile', slug: decodeURIComponent(params.get('slug')) };
    var m = path.match(/\/vakmannen\/([^/]+)$/);
    if (m && m[1] && m[1] !== 'vakmannen-detail') {
      return { page: 'profile', slug: decodeURIComponent(m[1]) };
    }
    if (path === '/vakmannen' || path.indexOf('/vakmannen') === 0) return { page: 'list', slug: null };
    return { page: 'list', slug: null };
  }

  function cat(id) {
    var c = EV.getCategory(id);
    if (c) return c;
    return { id: id || '', label: 'Vakgebied', plural: 'Vakmannen', subtypes: [] };
  }
  function capacityLabel(p) {
    return EV.capacityPublicLabel(p.capacity) || 'Beschikbaarheid op aanvraag';
  }
  function visitLabel(p) {
    return EV.visitPublicLabel(p.visitSpeed) || 'op afspraak';
  }
  function stars(g, opts) {
    opts = opts || {};
    if (!g || !g.show) return '';
    if (g.status === 'live' && g.rating != null && g.count != null) {
      return '<div class="lab-stars lab-stars-live" data-review-state="live">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg> ' +
        esc(String(g.rating).replace('.', ',')) +
        ' <span>· ' + esc(String(g.count)) + ' Google-beoordelingen</span></div>';
    }
    /* Pending / unavailable — never show fabricated ratings as live Google data */
    var pendingLabel = opts.compact
      ? 'Google-beoordelingen binnenkort'
      : 'Google-beoordelingen binnenkort beschikbaar';
    return '<div class="lab-stars lab-stars-pending" data-review-state="pending">' +
      '<span>' + pendingLabel + '</span></div>';
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
        var ga = (a.google && a.google.live === true && a.google.rating) || 0;
        var gb = (b.google && b.google.live === true && b.google.rating) || 0;
        return gb - ga;
      }
      return 0;
    });
  }

  function rowHtml(p) {
    var price = EV.formatPrice(EV.serviceForSubtype(p, state.subtype));
    var g = EV.GoogleReviews.resolveForPartner(p);
    var startShort = String(p.startMonth || '').replace(/^Vanaf\s+/i, '');
    var href = '/vakmannen/' + encodeURIComponent(p.slug);
    return (
      '<a class="lab-row" href="' + href + '">' +
        '<div class="lab-row-media"><img src="' + p.image + '" alt="" style="object-position:' + (p.objectPos || '50% 50%') + '" loading="lazy"></div>' +
        '<div class="lab-row-main">' +
          '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="tagline">' + esc(p.specialtyLine) + '</p>' +
          stars(g, { compact: true }) +
        '</div>' +
        '<div class="lab-row-meta">' +
          '<div><strong>' + esc(p.radius) + '</strong><span class="lab-row-sep"> · </span>Start ' + esc(startShort) + '</div>' +
        '</div>' +
        '<div class="lab-row-price">' +
          '<div class="val">' + esc(price.display) + '</div>' +
          '<div class="ctx">' + esc(price.context || 'Prijsindicatie') + '</div>' +
        '</div>' +
        '<span class="btn btn-primary btn-sm">Bekijk vakman</span>' +
      '</a>'
    );
  }

  function gallerySources(p) {
    var base = [p.image, '/assets/photos/why.jpg', '/assets/photos/editorial.jpg', '/assets/photos/about.jpg', '/assets/photos/hero.jpg'];
    var imgs = (p.gallery && p.gallery.length) ? p.gallery.slice() : base.slice();
    /* Keep partner order, then fill up to 5 for swipe affordance */
    var seen = {};
    var out = [];
    imgs.concat(base).forEach(function (src) {
      if (!src || seen[src]) return;
      seen[src] = true;
      out.push(src);
    });
    return out.slice(0, 5);
  }

  function galleryHtml(p) {
    var imgs = gallerySources(p);
    if (!imgs.length) return '';
    var desktop = '<div class="lab-gallery vk-gallery-desktop">' +
      imgs.slice(0, 3).map(function (src, i) {
        return '<button type="button" data-gallery-open="' + i + '"><img src="' + src + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy" style="object-position:' + (p.objectPos || '50% 40%') + '"></button>';
      }).join('') +
      '</div>';
    var mobile = '<div class="vk-gallery-mobile" data-gallery-root>' +
      '<div class="vk-gallery-scroller" id="vkGalleryScroll">' +
        imgs.map(function (src, i) {
          return '<button type="button" data-gallery-open="' + i + '"><img src="' + src + '" alt="Projectfoto ' + (i + 1) + '" loading="lazy" style="object-position:' + (p.objectPos || '50% 40%') + '"></button>';
        }).join('') +
      '</div>' +
      '<div class="vk-gallery-bar">' +
        '<span class="vk-gallery-count" id="vkGalleryCount">1 / ' + imgs.length + '</span>' +
        '<button type="button" class="lab-link" id="vkGalleryAll">Bekijk alle foto’s</button>' +
      '</div></div>';
    return desktop + mobile;
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
    var all = EV.publishedPartners();
    /* Diverse featured set: prefer one per category when available */
    var featured = [];
    var seenCat = {};
    all.forEach(function (p) {
      if (featured.length >= 6) return;
      if (!seenCat[p.category]) {
        seenCat[p.category] = true;
        featured.push(p);
      }
    });
    if (featured.length < 4) {
      all.forEach(function (p) {
        if (featured.length >= 4) return;
        if (featured.indexOf(p) < 0) featured.push(p);
      });
    }
    return (
      /* 1–2 Hero + gericht zoeken */
      '<section class="lab-disc-hero"><div class="lab-wrap">' +
        '<p class="lab-kicker">Vakmannen</p>' +
        '<h1>Vind de juiste vakman<br>voor je renovatie.</h1>' +
        '<p class="lead">Ontdek gecontroleerde vakbedrijven, begrijp prijs en timing, en vraag een offerte aan wanneer het past.</p>' +
        '<form class="lab-search" id="vkSearch" autocomplete="off">' +
          '<label>Wat wil je laten uitvoeren?<select name="category">' +
            EV.CATEGORY_LIST.map(function (c) {
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

      /* 3 Uitgelichte vakbedrijven — browse without searching */
      '<section class="lab-featured"><div class="lab-wrap">' +
        '<div class="lab-featured-head">' +
          '<div><h2>Uitgelichte vakbedrijven</h2><p class="lab-hint">Ontdek gecontroleerde vakbedrijven op ELYAN.</p></div>' +
          '<button type="button" class="lab-link" id="seeAll">Alle resultaten <svg class="icon"><use href="#i-arrow"></use></svg></button>' +
        '</div>' +
        '<div class="lab-feature-rail">' + featured.map(rowHtml).join('') + '</div>' +
      '</div></section>' +

      /* 4 Ontdek per vakgebied */
      '<section class="lab-disc-band vk-discover"><div class="lab-wrap">' +
        '<h2>Ontdek per vakgebied</h2>' +
        '<p class="lab-hint">Bekijk gecontroleerde vakbedrijven per specialisatie.</p>' +
        '<div class="lab-cat-mosaic">' +
          EV.CATEGORY_LIST.map(function (c) {
            return '<button type="button" class="lab-cat' + (state.category === c.id ? ' is-active' : '') + '" data-browse-cat="' + c.id + '">' +
              '<strong>' + esc(c.label) + '</strong></button>';
          }).join('') +
        '</div>' +
      '</div></section>' +

      /* 5 Provincies — secondary discovery */
      '<section class="vk-regions"><div class="lab-wrap">' +
        '<h2>Bekijk per provincie</h2>' +
        '<p class="lab-hint">Browse vakmannen in jouw regio. Voor een gerichte zoekactie gebruik je gemeente of postcode hierboven.</p>' +
        '<div class="lab-prov">' +
          EV.PROVINCES.map(function (p) {
            return '<button type="button" data-browse-prov="' + esc(p) + '">' + esc(p) + '</button>';
          }).join('') +
        '</div>' +
      '</div></section>'
    );
  }

  function renderResults() {
    var list = filtered();
    var empty = '';
    if (!list.length) {
      empty = '<div class="vk-empty">' +
        '<p class="vk-pill-note">' + esc(cat(state.category).label) + '</p>' +
        '<h2>Nog geen vakbedrijven in deze selectie</h2>' +
        '<p>We selecteren gecontroleerde partners per vakgebied. Voor ' + esc(cat(state.category).label.toLowerCase()) +
        (state.provinceBrowse ? ' in ' + esc(state.provinceBrowse) : '') +
        ' hebben we momenteel nog geen gepubliceerd profiel dat aan je filters voldoet.</p>' +
        '<button type="button" class="btn btn-ghost" id="backLanding">Andere categorie bekijken</button></div>';
    }
    return (
      '<div class="lab-wrap lab-results">' +
        '<button type="button" class="lab-link" id="backLanding">← Terug naar ontdekken</button>' +
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
    if (g.show && g.status === 'live') {
      googleBlock =
        '<section class="lab-section"><h2>Google-beoordelingen</h2><div class="lab-google">' +
          '<div class="lab-google-head"><div><div class="lab-google-score">' + esc(String(g.rating).replace('.', ',')) + ' / 5</div>' +
          '<div class="lab-hint">' + esc(String(g.count)) + ' beoordelingen</div></div>' +
          (g.url ? '<a class="btn btn-ghost btn-sm" href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer">Bekijk op Google</a>' : '') +
          '</div>' +
          (g.reviews || []).map(function (r) {
            return '<div class="lab-review"><strong>' + esc(r.author) + '</strong>' + esc(r.text) + '</div>';
          }).join('') +
          '<p class="lab-attr">' + esc(g.attribution) + '</p>' +
        '</div></section>';
    } else if (g.show && g.status === 'pending') {
      googleBlock =
        '<section class="lab-section"><h2>Google-beoordelingen</h2><div class="lab-google">' +
          '<p class="lab-hint" style="margin:0 0 8px;">' + esc(g.message || 'Google-beoordelingen worden getoond zodra de live Google-koppeling actief is.') + '</p>' +
          '<p class="lab-attr">' + esc(g.attribution) + '</p>' +
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
      '<div class="lab-wrap lab-profile">' +
        '<a class="lab-link vk-back" href="/vakmannen">← Terug naar vakmannen</a>' +
        '<header class="lab-identity">' +
          '<div class="lab-identity-visual"><img src="' + p.image + '" alt="" style="object-position:' + (p.objectPos || '') + '"></div>' +
          '<div class="lab-identity-copy">' +
            '<p class="lab-kicker">ELYAN vakman</p>' +
            '<div class="lab-row-badges"><span class="lab-chip is-ok">Gecontroleerd door ELYAN</span></div>' +
            '<h1>' + esc(p.name) + '</h1>' +
            (p.city ? '<p class="lab-identity-place">' + esc(p.city) + '</p>' : '') +
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
        galleryHtml(p) +
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

  function renderDetailQuestions(questions, answers) {
    answers = answers || {};
    return (questions || []).map(function (qq) {
      if (qq.type === 'info') {
        return '<p class="lab-hint" style="margin:10px 0;">' + esc(qq.label) + '</p>';
      }
      if (qq.type === 'multi') {
        var selected = answers[qq.key] || [];
        if (!Array.isArray(selected)) selected = [];
        return '<p class="lab-hint" style="margin:14px 0 8px;">' + esc(qq.label) + '</p><div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (selected.indexOf(oid) >= 0 ? ' is-selected' : '') + '" data-q-answer-multi="' + esc(qq.key) + '" data-val="' + esc(oid) + '">' + esc(olab) + '</button>';
          }).join('') + '</div>';
      }
      if (qq.type === 'single' || qq.type === 'select') {
        var cur = answers[qq.key] || '';
        return '<p class="lab-hint" style="margin:14px 0 8px;">' + esc(qq.label) + '</p><div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (cur === oid ? ' is-selected' : '') + '" data-q-answer-single="' + esc(qq.key) + '" data-val="' + esc(oid) + '">' + esc(olab) + '</button>';
          }).join('') + '</div>';
      }
      return '<label class="lab-field">' + esc(qq.label) +
        '<input data-q-answer-field="' + esc(qq.key) + '" type="text" value="' + esc(answers[qq.key] == null ? '' : answers[qq.key]) + '"' +
        (qq.placeholder ? ' placeholder="' + esc(qq.placeholder) + '"' : '') + '></label>' +
        (qq.allowUnknown
          ? '<button type="button" class="lab-choice' + (answers[qq.key + 'Unknown'] ? ' is-selected' : '') + '" data-q-answer-single="' + esc(qq.key + 'Unknown') + '" data-val="1">Ik weet het niet</button>'
          : '');
    }).join('');
  }

  function renderQuote(p) {
    var q = state.quote;
    if (!q || !p) return '';
    var catMeta = cat(p.category);
    var RE = EV.Intelligence && EV.Intelligence.CustomerRequestEngine;
    var detailQs = RE ? RE.getDetailQuestions(p.category) : (catMeta.customerQuestions || []);
    var stepDefs = RE ? RE.getSteps(p.category) : [
      { id: 'service', label: 'Type werk' },
      { id: 'details', label: 'Projectdetails' },
      { id: 'timing', label: 'Timing' },
      { id: 'contact', label: 'Contact' },
      { id: 'review', label: 'Overzicht' }
    ];
    /* Public quote uses compact flow without separate photos/budget steps */
    stepDefs = stepDefs.filter(function (s) {
      return s.id === 'service' || s.id === 'details' || s.id === 'timing' || s.id === 'contact' || s.id === 'review';
    });

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

    var progress = stepDefs.map(function (_, i) {
      return '<span class="' + (i < q.step ? 'is-done' : (i === q.step ? 'is-current' : '')) + '"></span>';
    }).join('');
    var stepId = (stepDefs[q.step] && stepDefs[q.step].id) || 'service';
    var subtypes = catMeta.subtypes || [];
    var body = '';

    if (stepId === 'service') {
      body = '<h1>Wat wil je laten uitvoeren?</h1><p class="step-lead">Kies wat het best past bij ' + esc(catMeta.label) + '.</p><div class="lab-choice-grid is-2">' +
        subtypes.map(function (s) {
          return '<button type="button" class="lab-choice' + (q.workType === s.id ? ' is-selected' : '') + '" data-q-set="workType" data-val="' + s.id + '">' + esc(s.label) + '</button>';
        }).join('') + '</div>';
    } else if (stepId === 'details') {
      body = '<h1>Projectdetails</h1><p class="step-lead">Alleen relevante vragen voor ' + esc(catMeta.label.toLowerCase()) + '. Weet je iets niet? Kies “Ik weet het niet”.</p>' +
        renderDetailQuestions(detailQs, q.answers || {});
    } else if (stepId === 'timing') {
      body = '<h1>Wanneer wil je starten?</h1><div class="lab-choice-grid is-2">' +
        EV.CUSTOMER_TIMING.filter(function (t) { return t.id !== 'alle'; }).map(function (t) {
          return '<button type="button" class="lab-choice' + (q.timing === t.id ? ' is-selected' : '') + '" data-q-set="timing" data-val="' + t.id + '">' + esc(t.label) + '</button>';
        }).join('') + '</div>';
    } else if (stepId === 'contact') {
      body = '<h1>Jouw gegevens</h1><p class="step-lead">Voor opvolging. Contactgegevens worden gericht gedeeld.</p>' +
        '<label class="lab-field">Naam<input data-q-field="name" value="' + esc(q.name || '') + '" required></label>' +
        '<label class="lab-field">E-mail<input data-q-field="email" type="email" value="' + esc(q.email || '') + '" required></label>' +
        '<label class="lab-field">Telefoon<input data-q-field="phone" value="' + esc(q.phone || '') + '"></label>' +
        '<label class="lab-field">Projectlocatie<input data-q-field="address" value="' + esc(q.address || state.location.name) + '"></label>';
    } else {
      var subLabel = subtypes.filter(function (s) { return s.id === q.workType; })[0];
      var answerRows = Object.keys(q.answers || {}).map(function (k) {
        var v = q.answers[k];
        if (Array.isArray(v)) v = v.join(', ');
        if (v === true) v = 'Ik weet het niet';
        return '<div class="lab-summary-row"><span>' + esc(k) + '</span><strong>' + esc(String(v || '—')) + '</strong></div>';
      }).join('');
      body = '<h1>Jouw aanvraag</h1><div class="lab-summary">' +
        '<div class="lab-summary-row"><span>Categorie</span><strong>' + esc(catMeta.label) + '</strong></div>' +
        '<div class="lab-summary-row"><span>Werk</span><strong>' + esc(subLabel ? subLabel.label : q.workType) + '</strong></div>' +
        answerRows +
        '<div class="lab-summary-row"><span>Locatie</span><strong>' + esc(q.address || '') + '</strong></div>' +
        '<div class="lab-summary-row"><span>Timing</span><strong>' + esc(q.timing || '') + '</strong></div>' +
        '<div class="lab-summary-row"><span>Naar</span><strong>' + esc(p.name) + '</strong></div>' +
      '</div><p class="lab-hint">Je kunt later tot 3 zelfgekozen vakmannen kiezen. Nu: één partner.</p>';
    }

    state._quoteStepCount = stepDefs.length;
    return (
      '<div class="lab-quote"><div class="lab-quote-shell">' +
        '<button type="button" class="lab-link" id="cancelQuote" style="margin-bottom:12px;">← Terug naar profiel</button>' +
        '<div class="lab-quote-progress">' + progress + '</div>' +
        '<p class="lab-kicker">Offerteaanvraag · ' + esc(p.name) + ' · ' + esc(catMeta.label) + '</p>' +
        '<div class="lab-quote-card">' + body +
          '<div class="lab-quote-actions">' +
            (q.step > 0 ? '<button type="button" class="btn btn-ghost" id="quoteBack">Terug</button>' : '') +
            '<button type="button" class="btn btn-primary" id="quoteNext">' + (q.step >= stepDefs.length - 1 ? 'Aanvraag versturen' : 'Verder') + '</button>' +
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
        openLightbox([btn.getAttribute('data-lightbox')], 0);
      });
    });

    /* Profile gallery → lightbox (controller is bound once; only open hooks here) */
    var routeNow = parseRoute();
    var profileGallery = [];
    if (routeNow.page === 'profile') {
      var partnerNow = EV.partnerBySlug(routeNow.slug);
      if (partnerNow) profileGallery = gallerySources(partnerNow);
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

    function startQuote() {
      var route = parseRoute();
      var p = EV.partnerBySlug(route.slug);
      if (!p) return;
      state.quote = {
        step: 0, sent: false, partnerId: p.id, category: p.category,
        workType: (p.subtypes && p.subtypes[0]) || '',
        answers: {},
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
    $all('[data-q-answer-single]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.quote.answers) state.quote.answers = {};
        var key = btn.getAttribute('data-q-answer-single');
        var val = btn.getAttribute('data-val');
        state.quote.answers[key] = val === '1' ? true : val;
        render();
      });
    });
    $all('[data-q-answer-multi]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.quote.answers) state.quote.answers = {};
        var key = btn.getAttribute('data-q-answer-multi');
        if (!Array.isArray(state.quote.answers[key])) state.quote.answers[key] = [];
        var val = btn.getAttribute('data-val');
        var ix = state.quote.answers[key].indexOf(val);
        if (ix >= 0) state.quote.answers[key].splice(ix, 1);
        else state.quote.answers[key].push(val);
        render();
      });
    });
    var qNext = $('#quoteNext');
    if (qNext) qNext.addEventListener('click', function () {
      $all('[data-q-field]').forEach(function (input) {
        state.quote[input.getAttribute('data-q-field')] = input.value;
      });
      if (!state.quote.answers) state.quote.answers = {};
      $all('[data-q-answer-field]').forEach(function (input) {
        state.quote.answers[input.getAttribute('data-q-answer-field')] = input.value;
      });
      var last = (state._quoteStepCount || 5) - 1;
      if (state.quote.step >= last) {
        state.quote.sent = true;
        state.projectContext = { timing: state.quote.timing, month: null };
        try {
          var store = JSON.parse(localStorage.getItem('elyan_requests') || '[]');
          store.unshift({
            id: 'req_' + Date.now(),
            partnerId: state.quote.partnerId,
            category: state.quote.category,
            status: EV.REQUEST_STATUS.NEW,
            createdAt: new Date().toISOString(),
            workType: state.quote.workType,
            answers: state.quote.answers,
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
    bindLightboxOnce();
    bindCommon();
    window.scrollTo(0, 0);
  }

  bindLightboxOnce();
  render();
})();
