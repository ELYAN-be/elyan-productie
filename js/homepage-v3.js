/**
 * Homepage V4 — search form, mobile nav, optional public professionals strip.
 * Homepage-only. Does not touch Marketplace shell or calculator logic.
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

  function safeHttpsUrl(raw) {
    var value = String(raw || '').trim();
    return /^https:\/\//i.test(value) ? value : '';
  }

  function isCategoryId(id) {
    return CATEGORIES.some(function (c) {
      return c.id === id;
    });
  }

  /**
   * Marketplace URL contract:
   * /vakmannen/{categoryId}?postcode= | ?gemeente=
   * (regio path omitted when only free-text location is known)
   */
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

    // Clean first paint: never show invalid styling before interaction/submit
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
        var firstInvalid = form.querySelector('.hp-field.is-invalid select, .hp-field.is-invalid input');
        if (firstInvalid) firstInvalid.focus();
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
  }

  function cardHtml(card) {
    card = card || {};
    var slug = String(card.slug || '').trim();
    if (!slug) return '';
    var href = '/vakmannen/' + encodeURIComponent(slug);
    var name = escapeHtml(card.displayName || 'Vakbedrijf');
    var specialty = escapeHtml(card.specialtyLine || '');
    var area = escapeHtml(card.serviceAreaText || '');
    var price = escapeHtml(card.priceLine || '');
    var image = safeHttpsUrl(card.coverUrl);
    var media = image
      ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy" decoding="async" width="300" height="200">'
      : '<span aria-hidden="true">ELYAN</span>';
    var meta = [];
    if (specialty) meta.push('<p class="hp-pro-meta">' + specialty + '</p>');
    if (area) meta.push('<p class="hp-pro-meta">' + area + '</p>');
    if (price) meta.push('<p class="hp-pro-meta">' + price + '</p>');
    return (
      '<a class="hp-pro-card" href="' +
      escapeHtml(href) +
      '">' +
      '<div class="hp-pro-media">' +
      media +
      '</div>' +
      '<div>' +
      '<div class="hp-pro-name">' +
      name +
      '</div>' +
      meta.join('') +
      '<span class="hp-pro-badge">Gecontroleerd door ELYAN</span>' +
      '</div>' +
      '</a>'
    );
  }

  function showProState(section, state, html) {
    var loading = $('#hpProLoading', section);
    var error = $('#hpProError', section);
    var grid = $('#hpProGrid', section);
    if (loading) loading.hidden = state !== 'loading';
    if (error) error.hidden = state !== 'error';
    if (grid) {
      grid.hidden = state !== 'ready';
      if (state === 'ready') grid.innerHTML = html || '';
    }
  }

  function hideProSection(section) {
    if (section) section.hidden = true;
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
      if (failedAll) {
        // Soft-fail: do not invent supply or interrupt the homepage with an error strip.
        hideProSection(section);
        return;
      }

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

      // Deterministic: newest publishedAt desc, then slug
      cards.sort(function (a, b) {
        var at = String((a && a.publishedAt) || '');
        var bt = String((b && b.publishedAt) || '');
        if (at !== bt) return bt.localeCompare(at);
        return String((a && a.slug) || '').localeCompare(String((b && b.slug) || ''));
      });

      if (cards.length < 3) {
        hideProSection(section);
        return;
      }

      section.hidden = false;
      var html = cards
        .slice(0, 3)
        .map(cardHtml)
        .filter(Boolean)
        .join('');
      if (!html) {
        hideProSection(section);
        return;
      }
      showProState(section, 'ready', html);
    });

    var retry = $('#hpProRetry', section);
    if (retry) {
      retry.addEventListener('click', function () {
        loadProfessionals();
      });
    }
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

  function init() {
    if (!document.body.classList.contains('hp-v3')) return;
    initMobileNav();
    initSearchForm();
    initReportVisual();
    loadProfessionals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for focused checks
  window.ElyanHomepageV3 = {
    buildMarketplaceSearchUrl: buildMarketplaceSearchUrl,
    CATEGORIES: CATEGORIES
  };
})();
