/**
 * Homepage V6 — search, mobile nav, featured professional rows, subtle motion.
 * Homepage-only. Does not touch Marketplace shell or calculator logic.
 *
 * Demo professionals: only via js/demo-professionals.js when
 * localhost + ?demoProfessionals=1. Never on production hosts.
 */
(function () {
  'use strict';

  var CATEGORIES = [
    { id: 'dakwerken', label: 'Dakwerken', icon: 'i-roof' },
    { id: 'badkamer', label: 'Badkamer', icon: 'i-bath' },
    { id: 'keuken', label: 'Keuken', icon: 'i-utensils' },
    { id: 'ramen-deuren', label: 'Ramen & deuren', icon: 'i-window' },
    { id: 'isolatie', label: 'Isolatie', icon: 'i-insulation' },
    { id: 'verwarming', label: 'Verwarming', icon: 'i-heat' },
    { id: 'elektriciteit', label: 'Elektriciteit', icon: 'i-bolt' },
    { id: 'gevel', label: 'Gevel', icon: 'i-facade' },
    { id: 'vloeren', label: 'Vloeren', icon: 'i-layers' },
    { id: 'schilderwerken', label: 'Schilderwerken', icon: 'i-roller' },
    { id: 'ventilatie', label: 'Ventilatie', icon: 'i-vent' },
    { id: 'zonnepanelen', label: 'Zonnepanelen', icon: 'i-solar' }
  ];

  var FEATURE_CATS = ['dakwerken', 'badkamer', 'keuken', 'ramen-deuren', 'isolatie', 'verwarming'];
  var MAX_FEATURED = 3;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isLocalPreviewHost() {
    var host = String((window.location && window.location.hostname) || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function safeCoverUrl(raw) {
    var value = String(raw || '').trim();
    if (/^https:\/\//i.test(value)) return value;
    if (/^\/assets\/photos\/[a-z0-9._-]+\.(jpg|jpeg|png|webp|avif)$/i.test(value)) return value;
    return '';
  }

  function isCategoryId(id) {
    return CATEGORIES.some(function (c) {
      return c.id === id;
    });
  }

  function buildMarketplaceSearchUrl(categoryId, locationRaw) {
    if (!isCategoryId(categoryId)) return null;
    var path = '/vakmannen/' + encodeURIComponent(categoryId);
    var loc = String(locationRaw || '').trim().replace(/\s+/g, ' ');
    if (!loc) return null;
    var params = [];
    if (/^\d{4}$/.test(loc)) {
      params.push('postcode=' + encodeURIComponent(loc));
    } else {
      params.push('gemeente=' + encodeURIComponent(loc));
    }
    return path + '?' + params.join('&');
  }

  function setFieldInvalid(field, invalid, message) {
    if (!field) return;
    var isInvalid = !!invalid;
    field.classList.toggle('is-invalid', isInvalid);
    var err = $('.hp-field-error', field);
    if (err) {
      if (message) err.textContent = message;
      err.setAttribute('aria-hidden', isInvalid ? 'false' : 'true');
    }
    var control = $('select, input', field);
    if (control) {
      if (isInvalid) {
        control.setAttribute('aria-invalid', 'true');
        if (err && err.id) control.setAttribute('aria-describedby', err.id);
      } else {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
      }
    }
  }

  function clearFieldInvalid(field) {
    setFieldInvalid(field, false);
  }

  function syncMenuLabels(btn, open) {
    var label = $('.hp-menu-label', btn);
    if (label) {
      var closed = label.getAttribute('data-label-closed') || 'Menu';
      var opened = label.getAttribute('data-label-open') || 'Sluiten';
      label.textContent = open ? opened : closed;
    }
    btn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function initMobileNav() {
    var btn = $('#hpMenuBtn');
    var panel = $('#hpMobileNav');
    if (!btn || !panel) return;

    function close() {
      syncMenuLabels(btn, false);
      panel.classList.remove('is-open');
      btn.focus();
    }

    function open() {
      syncMenuLabels(btn, true);
      panel.classList.add('is-open');
      var first = panel.querySelector('a, .btn');
      if (first) first.focus();
    }

    syncMenuLabels(btn, false);

    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) close();
      else open();
    });

    $all('a, .btn', panel).forEach(function (el) {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close();
    });
  }

  function initSearchForm() {
    var form = $('#hpSearchForm');
    if (!form) return;
    var catField = $('#hpFieldCategory');
    var locField = $('#hpFieldLocation');
    var cat = $('#hpCategory');
    var loc = $('#hpLocation');

    clearFieldInvalid(catField);
    clearFieldInvalid(locField);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var categoryId = cat ? String(cat.value || '').trim() : '';
      var locationRaw = loc ? String(loc.value || '').trim() : '';
      var ok = true;

      if (!isCategoryId(categoryId)) {
        setFieldInvalid(catField, true, 'Kies een vakgebied.');
        ok = false;
      } else {
        clearFieldInvalid(catField);
      }

      if (!locationRaw) {
        setFieldInvalid(locField, true, 'Vul een gemeente of postcode in.');
        ok = false;
      } else {
        clearFieldInvalid(locField);
      }

      if (!ok) {
        if (catField && catField.classList.contains('is-invalid')) {
          var trigger = $('#hpCategoryTrigger');
          if (trigger) {
            trigger.focus();
          } else if (cat) {
            cat.focus();
          }
        } else {
          var firstInvalid = form.querySelector('.hp-field.is-invalid input');
          if (firstInvalid) firstInvalid.focus();
        }
        return;
      }

      var url = buildMarketplaceSearchUrl(categoryId, locationRaw);
      if (!url) return;
      window.location.href = url;
    });

    if (cat) {
      cat.addEventListener('change', function () {
        if (isCategoryId(cat.value)) clearFieldInvalid(catField);
      });
    }
    if (loc) {
      loc.addEventListener('input', function () {
        if (String(loc.value || '').trim()) clearFieldInvalid(locField);
      });
    }

    initCategoryDropdown();
  }

  function initCategoryDropdown() {
    var field = $('#hpFieldCategory');
    var select = $('#hpCategory');
    var trigger = $('#hpCategoryTrigger');
    var list = $('#hpCategoryList');
    var triggerText = $('#hpCategoryTriggerText');
    if (!field || !select || !trigger || !list || !triggerText) return;

    var options = Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));
    var activeIndex = -1;

    function syncDesktopMode() {
      select.setAttribute('aria-hidden', 'true');
      select.setAttribute('tabindex', '-1');
      trigger.removeAttribute('aria-hidden');
    }

    function setActiveIndex(index) {
      activeIndex = index;
      options.forEach(function (opt, i) {
        if (i === index) opt.classList.add('is-active');
        else opt.classList.remove('is-active');
      });
      if (index >= 0 && options[index]) {
        options[index].scrollIntoView({ block: 'nearest' });
      }
    }

    function syncFromSelect() {
      var value = String(select.value || '');
      var matched = null;
      options.forEach(function (opt) {
        var selected = opt.getAttribute('data-value') === value && value !== '';
        opt.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (selected) matched = opt;
      });
      triggerText.textContent = matched ? matched.textContent : 'Kies een vakgebied';
      if (matched) setActiveIndex(options.indexOf(matched));
    }

    function openList() {
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      var selectedIdx = options.findIndex(function (opt) {
        return opt.getAttribute('aria-selected') === 'true';
      });
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
      if (activeIndex >= 0 && options[activeIndex]) options[activeIndex].focus();
    }

    function closeList(focusTrigger) {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      options.forEach(function (opt) {
        opt.classList.remove('is-active');
      });
      if (focusTrigger) trigger.focus();
    }

    function chooseOption(opt) {
      if (!opt) return;
      var value = opt.getAttribute('data-value') || '';
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncFromSelect();
      clearFieldInvalid(field);
      closeList(true);
    }

    trigger.addEventListener('click', function () {
      if (list.hidden) openList();
      else closeList(true);
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
    });

    list.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeList(true);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(Math.min(options.length - 1, activeIndex + 1));
        if (options[activeIndex]) options[activeIndex].focus();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(Math.max(0, activeIndex - 1));
        if (options[activeIndex]) options[activeIndex].focus();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeIndex >= 0) chooseOption(options[activeIndex]);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
        if (options[0]) options[0].focus();
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(options.length - 1);
        if (options[activeIndex]) options[activeIndex].focus();
      }
    });

    options.forEach(function (opt, index) {
      opt.addEventListener('click', function () {
        chooseOption(opt);
      });
      opt.addEventListener('mousemove', function () {
        setActiveIndex(index);
      });
    });

    document.addEventListener('click', function (e) {
      if (!list.hidden && !field.contains(e.target)) closeList(false);
    });

    window.addEventListener('resize', syncDesktopMode);
    syncDesktopMode();
    syncFromSelect();
  }

  /**
   * Marketplace row for featured professionals.
   * Never invents price/rating for production API cards.
   * Demo ratings/availability only exist on is_demo fixtures.
   */
  function resolvePriceDisplay(card) {
    var rawLine = String((card && card.priceLine) || '').trim();
    var rawContext = String((card && card.priceContext) || '').trim();
    var rawLabel = String((card && card.priceLabel) || '').trim();
    var isDemo = !!(card && (card.is_demo || card._localPreview));
    if (!rawLabel) {
      var cat =
        String((card && card.primaryCategoryLabel) || '').trim() ||
        String((card && card.specialtyLine) || '')
          .split('·')[0]
          .trim();
      if (cat) rawLabel = 'Prijsindicatie voor ' + cat.toLowerCase();
    }

    if (isDemo && rawLine) {
      return {
        label: rawLabel || '',
        price: rawLine,
        context: rawContext || 'ELYAN marktindicatie · geen offerte'
      };
    }

    if (rawLine && rawLine !== 'Prijs op aanvraag') {
      return {
        label: rawLabel || '',
        price: rawLine,
        context: rawContext || 'ELYAN marktindicatie · geen offerte'
      };
    }

    return {
      label: '',
      price: 'Prijsinformatie beschikbaar',
      context: 'Bekijk prijscontext →'
    };
  }

  /**
   * Google reviews only when API proves live Google data.
   * Never treat demo/synthetic ratings as Google.
   */
  function googleReviewHtml(card) {
    var g = card && card.google;
    if (
      !(
        g &&
        g.show &&
        g.status === 'live' &&
        !g.demo &&
        g.rating != null &&
        g.count != null
      )
    ) {
      return '';
    }
    var rating = String(g.rating).replace('.', ',');
    var count = String(g.count);
    return (
      '<p class="hp-pro-rating" data-review-state="live">' +
      '★ ' +
      escapeHtml(rating) +
      ' · ' +
      escapeHtml(count) +
      ' Google-beoordelingen</p>'
    );
  }

  /** Demo-only layout ratings — never labeled as Google. */
  function demoRatingHtml(card) {
    if (!(card && (card.is_demo || card._localPreview))) return '';
    var dr = card.demoRating;
    if (!(dr && dr.rating != null && dr.count != null)) return '';
    return (
      '<p class="hp-pro-rating" data-review-state="demo">' +
      '★ ' +
      escapeHtml(String(dr.rating).replace('.', ',')) +
      ' · ' +
      escapeHtml(String(dr.count)) +
      ' beoordelingen</p>'
    );
  }

  function cardHtml(card) {
    card = card || {};
    var slug = String(card.slug || '').trim();
    if (!slug) return '';
    var href = '/vakmannen/' + encodeURIComponent(slug);
    var nameRaw = String(card.displayName || 'Vakbedrijf').trim();
    var name = escapeHtml(nameRaw);
    var specialty = escapeHtml(card.specialtyLine || '');
    var area = escapeHtml(card.serviceAreaText || '');
    var avail = escapeHtml(card.availabilityLabel || '');
    var reviewHtml = googleReviewHtml(card) || demoRatingHtml(card);
    var priced = resolvePriceDisplay(card);
    var priceLabel = escapeHtml(priced.label || '');
    var price = escapeHtml(priced.price);
    var priceContext = escapeHtml(priced.context);
    var image = safeCoverUrl(card.coverUrl);
    var alt = escapeHtml('Foto van ' + nameRaw);
    var media = image
      ? '<img src="' + escapeHtml(image) + '" alt="' + alt + '" loading="lazy" decoding="async" width="160" height="140">'
      : '<span aria-hidden="true">ELYAN</span>';
    /* Badge only when publish/verify signal exists (public badge) or demo fixture exercises UI */
    var showBadge = !!(card.badge || card.is_demo || card._localPreview);
    var badgeHtml = showBadge
      ? '<span class="hp-pro-badge">Gecontroleerd door ELYAN</span>'
      : '';

    var metaSecondary = [];
    if (reviewHtml) metaSecondary.push(reviewHtml);
    if (area) metaSecondary.push('<p class="hp-pro-meta hp-pro-loc">' + area + '</p>');
    if (avail) metaSecondary.push('<p class="hp-pro-meta hp-pro-avail">' + avail + '</p>');

    return (
      '<article class="hp-pro-row">' +
      '<a class="hp-pro-row-link" href="' +
      escapeHtml(href) +
      '">' +
      '<div class="hp-pro-thumb">' +
      media +
      '</div>' +
      '<div class="hp-pro-body">' +
      badgeHtml +
      '<h3 class="hp-pro-name">' +
      name +
      '</h3>' +
      (specialty ? '<p class="hp-pro-meta hp-pro-specialty">' + specialty + '</p>' : '') +
      (metaSecondary.length ? '<div class="hp-pro-secondary">' + metaSecondary.join('') + '</div>' : '') +
      '</div>' +
      '<div class="hp-pro-aside">' +
      '<div class="hp-pro-price-block">' +
      (priceLabel ? '<span class="hp-pro-price-label">' + priceLabel + '</span>' : '') +
      '<span class="hp-pro-price">' +
      price +
      '</span>' +
      (priceContext ? '<span class="hp-pro-price-context">' + priceContext + '</span>' : '') +
      '</div>' +
      '<span class="hp-pro-cta">Bekijk profiel <span aria-hidden="true">→</span></span>' +
      '</div>' +
      '</a>' +
      '</article>'
    );
  }

  function setDemoFlag(visible) {
    var flag = $('#hpDemoFlag');
    if (!flag) {
      if (!visible) return;
      flag = document.createElement('p');
      flag.id = 'hpDemoFlag';
      flag.className = 'hp-demo-flag';
      flag.textContent = 'DEMO';
      flag.setAttribute('aria-hidden', 'true');
      document.body.appendChild(flag);
    }
    flag.hidden = !visible;
  }

  function setFeaturedSectionVisible(visible) {
    var block = $('.hp-featured');
    if (block) block.hidden = !visible;
  }

  function setFootVisible(visible) {
    var foot = $('#hpProFoot');
    if (foot) foot.hidden = !visible;
  }

  function setEmptyVisible(visible) {
    var empty = $('#hpProEmpty');
    if (empty) empty.hidden = !visible;
  }

  function showProState(section, state, html, isPreview) {
    var loading = $('#hpProLoading', section);
    var grid = $('#hpProGrid', section);
    if (loading) loading.hidden = state !== 'loading';
    if (grid) {
      grid.hidden = state !== 'ready';
      if (state === 'ready') grid.innerHTML = html || '';
      else grid.innerHTML = '';
    }
    setEmptyVisible(state === 'empty');
    setDemoFlag(!!(isPreview && state === 'ready'));
    setFootVisible(state === 'ready');
    /* Section stays visible for ready / loading / empty — never hide for zero supply */
    setFeaturedSectionVisible(true);
  }

  function getDemoCardsSafe() {
    var api = window.ElyanDemoProfessionals;
    if (!api || typeof api.getDemoCards !== 'function') return [];
    if (typeof api.isDemoModeEnabled === 'function' && !api.isDemoModeEnabled()) return [];
    return api.getDemoCards() || [];
  }

  function renderDemoCards(section) {
    var cards = getDemoCardsSafe().slice(0, MAX_FEATURED);
    var html = cards.map(cardHtml).filter(Boolean).join('');
    if (!html) {
      showProState(section, 'empty');
      return;
    }
    showProState(section, 'ready', html, true);
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    });
  }

  function loadProfessionals() {
    var section = $('#hpProfessionals');
    if (!section) return;

    var demoApi = window.ElyanDemoProfessionals;
    if (demoApi && typeof demoApi.isDemoModeEnabled === 'function' && demoApi.isDemoModeEnabled()) {
      renderDemoCards(section);
      return;
    }

    showProState(section, 'loading');

    var requests = FEATURE_CATS.map(function (cat) {
      return fetchJson(
        '/api/public/v1/search?category=' +
          encodeURIComponent(cat) +
          '&page=1&pageSize=2&sort=newest&includeUnpriced=true'
      )
        .then(function (data) {
          return (data && data.results) || [];
        })
        .catch(function () {
          return null;
        });
    });

    Promise.all(requests).then(function (batches) {
      var failedAll = batches.every(function (b) {
        return b === null;
      });

      var seen = Object.create(null);
      var cards = [];
      batches.forEach(function (batch) {
        if (!batch) return;
        batch.forEach(function (card) {
          var slug = card && card.slug ? String(card.slug) : '';
          if (!slug || seen[slug]) return;
          seen[slug] = true;
          cards.push(card);
        });
      });

      cards.sort(function (a, b) {
        var at = String((a && a.publishedAt) || '');
        var bt = String((b && b.publishedAt) || '');
        if (at !== bt) return bt.localeCompare(at);
        return String((a && a.slug) || '').localeCompare(String((b && b.slug) || ''));
      });

      var selected = cards.slice(0, MAX_FEATURED);
      var html = selected.map(cardHtml).filter(Boolean).join('');
      if (html) {
        showProState(section, 'ready', html, false);
        return;
      }

      if (failedAll && typeof console !== 'undefined' && console.warn) {
        console.warn('[ELYAN] Featured professionals unavailable');
      }
      /* Premium empty state — section remains visible */
      showProState(section, 'empty');
    });
  }

  function initReportVisual() {
    var visual = $('#hpReportVisual');
    if (!visual) return;
    var imgs = $all('[data-hp-report-img]', visual);
    if (!imgs.length) {
      visual.hidden = true;
      return;
    }

    var pending = imgs.length;
    var failed = false;

    function finish() {
      if (failed) visual.hidden = true;
    }

    imgs.forEach(function (img) {
      function onDone(ok) {
        if (!ok) failed = true;
        pending -= 1;
        if (pending <= 0) finish();
      }
      if (img.complete) {
        onDone(img.naturalWidth > 0);
        return;
      }
      img.addEventListener('load', function () {
        onDone(img.naturalWidth > 0);
      });
      img.addEventListener('error', function () {
        onDone(false);
      });
    });
  }

  function initHeroParallax() {
    if (prefersReducedMotion()) return;
    var hero = $('.hp-hero');
    var photoImg = $('.hp-hero-photo img');
    if (!hero || !photoImg) return;
    if (window.matchMedia && !window.matchMedia('(min-width: 768px)').matches) return;

    var ticking = false;
    function update() {
      ticking = false;
      var rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var progress = Math.max(-1, Math.min(1, (window.innerHeight * 0.35 - rect.top) / window.innerHeight));
      var y = Math.round(progress * -8);
      hero.classList.add('is-parallax');
      hero.style.setProperty('--hp-parallax-y', y + 'px');
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  function initHeroReveal() {
    var hero = $('.hp-hero');
    if (!hero) return;
    if (prefersReducedMotion()) {
      hero.classList.add('is-ready');
      return;
    }
    window.requestAnimationFrame(function () {
      hero.classList.add('is-ready');
    });
  }

  function initSectionReveal() {
    var nodes = $all('[data-hp-reveal]');
    if (!nodes.length) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) {
        el.classList.add('is-inview');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    nodes.forEach(function (el) {
      io.observe(el);
    });
  }

  function initCalculatorDeepLink() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    var open = new URLSearchParams(location.search).get('open');
    if (!open) return;
    window.requestAnimationFrame(function () {
      if (open === 'renovatiecalculator') {
        var btn = document.querySelector('[data-action="start-calculator"]');
        if (btn) btn.click();
      } else if (open === 'woningproject') {
        var btn2 = document.querySelector('[data-action="start-calculator-2"]');
        if (btn2) btn2.click();
      }
      history.replaceState(null, '', location.pathname);
    });
  }

  function init() {
    if (!document.body.classList.contains('hp-v3')) return;
    initMobileNav();
    initSearchForm();
    initReportVisual();
    initHeroReveal();
    initSectionReveal();
    initCalculatorDeepLink();
    loadProfessionals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ElyanHomepageV3 = {
    buildMarketplaceSearchUrl: buildMarketplaceSearchUrl,
    CATEGORIES: CATEGORIES,
    isLocalPreviewHost: isLocalPreviewHost,
    MAX_FEATURED: MAX_FEATURED
  };
})();
