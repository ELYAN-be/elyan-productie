/**
 * Marketplace Phase 1 Sprint 2 — /vakmannen landing (V3 D1).
 */
(function () {
  'use strict';

  var UI = window.ElyanMarketplaceUi;
  if (!UI) return;

  var esc = UI.escapeHtml;
  var catRoot = document.getElementById('mp-categories');
  var problemRoot = document.getElementById('mp-problems');

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
        '<span class="mp-cat-tile__visual" aria-hidden="true"></span>' +
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

  loadCategories();
  loadProblems();
})();
