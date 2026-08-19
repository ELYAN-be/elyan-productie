/**
 * Marketplace Phase 1 — /vakmannen landing (V3 D1 + featured restore).
 */
(function () {
  'use strict';

  var UI = window.ElyanMarketplaceUi;
  if (!UI) return;

  var esc = UI.escapeHtml;
  var catRoot = document.getElementById('mp-categories');
  var problemRoot = document.getElementById('mp-problems');
  var featuredRoot = document.getElementById('mp-featured');

  /** Limited multi-fetch across categories — reuses search API only. */
  var FEATURED_CATEGORIES = [
    'dakwerken',
    'badkamer',
    'keuken',
    'ramen-deuren',
    'isolatie',
    'verwarming'
  ];

  function fetchJson(url) {
    return fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    });
  }

  function renderCategoriesError() {
    if (!catRoot) return;
    catRoot.innerHTML =
      '<div class="mp-state" role="alert">' +
      '<p>Categorieën konden niet geladen worden. Probeer het opnieuw.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" id="mp-cat-retry">Opnieuw proberen</button>' +
      '</div>';
    var btn = document.getElementById('mp-cat-retry');
    if (btn) btn.addEventListener('click', loadCategories);
  }

  function renderCategories(categories) {
    if (!catRoot) return;
    var list = (categories || []).filter(function (c) {
      return UI.isCategoryId(c.id);
    });
    if (list.length !== 12) {
      renderCategoriesError();
      return;
    }
    var html = '<div class="mp-cat-grid" role="list">';
    list.forEach(function (c, i) {
      var tone = 'mp-cat-tile--tone-' + ((i % 4) + 1);
      var helper = UI.helperFor(c.id);
      html +=
        '<a class="mp-cat-tile ' +
        tone +
        '" role="listitem" href="/vakmannen/' +
        encodeURIComponent(c.id) +
        '">' +
        '<span class="mp-cat-tile__visual" aria-hidden="true"><svg viewBox="0 0 48 48"><use href="#i-cat-' +
        esc(c.id) +
        '"></use></svg></span>' +
        '<h3>' +
        esc(c.label) +
        '</h3>' +
        '<p>' +
        esc(helper) +
        '</p>' +
        '</a>';
    });
    html += '</div>';
    catRoot.innerHTML = html;
  }

  function loadCategories() {
    if (!catRoot) return;
    catRoot.innerHTML =
      '<div class="mp-cat-grid" aria-hidden="true">' +
      '<div class="mp-cat-skel"></div><div class="mp-cat-skel"></div>' +
      '<div class="mp-cat-skel"></div><div class="mp-cat-skel"></div>' +
      '<div class="mp-cat-skel"></div><div class="mp-cat-skel"></div>' +
      '</div>';
    fetchJson('/api/public/v1/categories')
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.categories)) throw new Error('bad_payload');
        renderCategories(data.categories);
      })
      .catch(function () {
        renderCategoriesError();
      });
  }

  function renderProblemsError() {
    if (!problemRoot) return;
    problemRoot.innerHTML =
      '<div class="mp-state" role="alert">' +
      '<p>De probleemgids kon niet geladen worden. Probeer het opnieuw.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" id="mp-problem-retry">Opnieuw proberen</button>' +
      '</div>';
    var btn = document.getElementById('mp-problem-retry');
    if (btn) btn.addEventListener('click', loadProblems);
  }

  function renderProblems(problems) {
    if (!problemRoot) return;
    var list = problems || [];
    if (list.length !== 13) {
      renderProblemsError();
      return;
    }
    var html = '<ul class="mp-problem-list">';
    list.forEach(function (p) {
      if (!UI.isCategoryId(p.categoryId)) return;
      html +=
        '<li><a class="mp-problem-link" href="/vakmannen/' +
        encodeURIComponent(p.categoryId) +
        '" data-problem-id="' +
        esc(p.id) +
        '" data-category-id="' +
        esc(p.categoryId) +
        '">' +
        '<strong>' +
        esc(p.label) +
        '</strong><span>' +
        esc(UI.labelFor(p.categoryId)) +
        '</span></a></li>';
    });
    html += '</ul>';
    problemRoot.innerHTML = html;
  }

  function loadProblems() {
    if (!problemRoot) return;
    problemRoot.innerHTML = '<p class="mp-loc-hint">Problemen laden…</p>';
    fetchJson('/api/public/v1/problems')
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.problems)) throw new Error('bad_payload');
        renderProblems(data.problems);
      })
      .catch(function () {
        renderProblemsError();
      });
  }

  function diversifyFeatured(pool) {
    var featured = [];
    var seenCat = {};
    var seenSlug = {};
    (pool || []).forEach(function (card) {
      if (!card || !card.slug || seenSlug[card.slug]) return;
      if (featured.length >= 6) return;
      var cat = card.primaryCategoryId || '';
      if (cat && !seenCat[cat]) {
        seenCat[cat] = true;
        seenSlug[card.slug] = true;
        featured.push(card);
      }
    });
    (pool || []).forEach(function (card) {
      if (!card || !card.slug || seenSlug[card.slug]) return;
      if (featured.length >= 6) return;
      seenSlug[card.slug] = true;
      featured.push(card);
    });
    return featured.slice(0, 6);
  }

  function renderFeatured(cards) {
    if (!featuredRoot) return;
    if (!cards || !cards.length) {
      featuredRoot.innerHTML =
        '<div class="mp-featured-empty"><p>Nog geen gepubliceerde vakbedrijven om uit te lichten. Kies een categorie om te starten.</p></div>';
      return;
    }
    var html = '<div class="mp-featured-rail">';
    cards.forEach(function (card) {
      html += UI.resultRowHtml(card);
    });
    html += '</div>';
    featuredRoot.innerHTML = html;
  }

  function loadFeatured() {
    if (!featuredRoot) return;
    featuredRoot.innerHTML =
      '<div class="mp-list" aria-hidden="true"><div class="mp-row-skel"></div><div class="mp-row-skel"></div></div>';

    var requests = FEATURED_CATEGORIES.map(function (catId) {
      var url =
        '/api/public/v1/search?category=' +
        encodeURIComponent(catId) +
        '&page=1&pageSize=2&sort=relevance&includeUnpriced=true';
      return fetchJson(url)
        .then(function (data) {
          if (!data || !data.ok || !Array.isArray(data.results)) return [];
          return data.results;
        })
        .catch(function () {
          return [];
        });
    });

    Promise.all(requests).then(function (batches) {
      var pool = [];
      batches.forEach(function (batch) {
        pool = pool.concat(batch || []);
      });
      renderFeatured(diversifyFeatured(pool));
    });
  }

  loadFeatured();
  loadCategories();
  loadProblems();
})();
