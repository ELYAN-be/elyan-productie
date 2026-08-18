/**
 * Marketplace Phase 1 Sprint 2 — /vakmannen/{categoryId} (V3 D2).
 * Location handoff encodes Sprint 3 search URL contract; no result cards.
 */
(function () {
  'use strict';

  var UI = window.ElyanMarketplaceUi;
  var EV = window.ElyanVakmannen;

  if (!UI) return;

  var esc = UI.escapeHtml;
  var app = document.getElementById('mp-cat-app');
  var crumb = document.getElementById('mp-breadcrumb');

  var state = {
    categoryId: null,
    regioSlug: null,
    label: '',
    location: null,
    locationQuery: '',
    suggestions: [],
    activeIndex: -1,
    listOpen: false,
    status: '',
    statusKind: ''
  };

  function engine() {
    var intel = EV && EV.Intelligence;
    if (intel && intel.PartnerOnboardingEngine) return intel.PartnerOnboardingEngine;
    if (intel && intel.getCategory) return intel;
    if (EV && EV.getCategory) return EV;
    return null;
  }

  function go404() {
    window.location.replace('/404');
  }

  function setMeta(categoryId, label) {
    var title = label + ' | Vakmannen | ELYAN';
    var desc =
      'Vind een nagekeken ' +
      label.toLowerCase() +
      '-vakbedrijf via ELYAN. Bekijk diensten en geef je locatie in Vlaanderen of Brussel.';
    var canonical = UI.SITE_ORIGIN + '/vakmannen/' + encodeURIComponent(categoryId);
    document.title = title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', desc);
    var can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute('href', canonical);
    var ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', title);
    var ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', desc);
    var ogu = document.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', canonical);
  }

  function vlLocations() {
    var all = (EV && EV.LOCATIONS) || [];
    return UI.filterVlaanderenBrussel(all);
  }

  function suggest(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var pool = vlLocations();
    var starts = [];
    var posts = [];
    for (var i = 0; i < pool.length; i++) {
      var l = pool[i];
      var name = l.name.toLowerCase();
      if (String(l.postcode).indexOf(q) === 0) posts.push(l);
      else if (name.indexOf(q) === 0) starts.push(l);
    }
    return starts.concat(posts).slice(0, 8);
  }

  function readQueryLocation() {
    var params = new URLSearchParams(window.location.search);
    var postcode = (params.get('postcode') || '').trim();
    var gemeente = (params.get('gemeente') || '').trim();
    if (!postcode && !gemeente) return null;
    var pool = vlLocations();
    for (var i = 0; i < pool.length; i++) {
      var l = pool[i];
      if (postcode && l.postcode === postcode) {
        if (!gemeente || l.name.toLowerCase() === gemeente.toLowerCase()) return l;
      }
    }
    if (gemeente) {
      for (var j = 0; j < pool.length; j++) {
        if (pool[j].name.toLowerCase() === gemeente.toLowerCase()) return pool[j];
      }
    }
    if (postcode && /^[1-9][0-9]{3}$/.test(postcode) && gemeente) {
      return { name: gemeente, postcode: postcode, province: '' };
    }
    return null;
  }

  function applyLocationToUrl(loc, push) {
    var path = UI.buildSearchPath(state.categoryId, loc, state.regioSlug);
    if (push) history.pushState({ mpLoc: true }, '', path);
    else history.replaceState({ mpLoc: true }, '', path);
  }

  function renderBreadcrumb() {
    if (!crumb || !state.categoryId) return;
    crumb.innerHTML =
      '<a href="/">Home</a><span aria-hidden="true">/</span>' +
      '<a href="/vakmannen">Vakmannen</a><span aria-hidden="true">/</span>' +
      '<span aria-current="page">' +
      esc(state.label) +
      '</span>';
  }

  function servicesHtml() {
    var eng = engine();
    var cat = eng && eng.getCategory ? eng.getCategory(state.categoryId) : null;
    var services = (cat && cat.services) || [];
    if (!services.length) {
      return '<p class="mp-loc-hint">Diensten voor deze categorie zijn tijdelijk niet beschikbaar.</p>';
    }
    var html = '<div class="mp-services" role="list">';
    services.forEach(function (s) {
      html += '<span class="mp-service-chip" role="listitem">' + esc(s.label) + '</span>';
    });
    html += '</div>';
    return html;
  }

  function provinceLinksHtml() {
    var html = '<div class="mp-provinces" role="list">';
    UI.PUBLIC_PROVINCES.forEach(function (p) {
      var href = '/vakmannen/' + encodeURIComponent(state.categoryId) + '/' + encodeURIComponent(p.slug);
      var current = state.regioSlug === p.slug ? ' aria-current="page"' : '';
      html +=
        '<a class="mp-province-link" role="listitem" href="' +
        href +
        '"' +
        current +
        '>' +
        esc(p.label) +
        '</a>';
    });
    html += '</div>';
    return html;
  }

  function listboxHtml() {
    if (!state.listOpen) return '<ul id="mp-loc-listbox" class="mp-loc-listbox" role="listbox" hidden></ul>';
    if (!state.suggestions.length) {
      return (
        '<ul id="mp-loc-listbox" class="mp-loc-listbox" role="listbox" aria-label="Suggesties">' +
        '<li class="mp-loc-option" role="presentation" style="cursor:default;color:var(--ink-faint)">Geen resultaten in Vlaanderen of Brussel</li>' +
        '</ul>'
      );
    }
    var html = '<ul id="mp-loc-listbox" class="mp-loc-listbox" role="listbox" aria-label="Gemeenten en postcodes">';
    state.suggestions.forEach(function (l, i) {
      var selected = i === state.activeIndex ? 'true' : 'false';
      var id = 'mp-loc-opt-' + i;
      html +=
        '<li id="' +
        id +
        '" class="mp-loc-option" role="option" aria-selected="' +
        selected +
        '" data-index="' +
        i +
        '">' +
        '<strong>' +
        esc(l.name) +
        '</strong><em>' +
        esc(l.postcode) +
        ' · ' +
        esc(l.province) +
        '</em></li>';
    });
    html += '</ul>';
    return html;
  }

  function statusClass() {
    if (state.statusKind === 'error') return 'is-error';
    if (state.statusKind === 'ok') return 'is-ok';
    if (state.statusKind === 'loading') return 'is-loading';
    return '';
  }

  function render() {
    if (!app) return;
    var confirmed = state.location
      ? esc(state.location.name) + ' (' + esc(state.location.postcode) + ')'
      : '';
    var activeDesc =
      state.listOpen && state.activeIndex >= 0 ? ' aria-activedescendant="mp-loc-opt-' + state.activeIndex + '"' : '';

    app.innerHTML =
      '<section class="mp-cat-hero container" aria-labelledby="mp-cat-h1">' +
      '<h1 id="mp-cat-h1">' +
      esc(state.label) +
      '</h1>' +
      '<p class="lead">' +
      esc(UI.introFor(state.categoryId)) +
      '</p>' +
      '</section>' +
      '<section class="mp-section" aria-labelledby="mp-services-title">' +
      '<div class="container">' +
      '<div class="mp-section-head"><h2 id="mp-services-title">Relevante diensten</h2>' +
      '<p>Wat vaak bij deze categorie hoort.</p></div>' +
      servicesHtml() +
      '</div></section>' +
      '<section class="mp-section mp-section--band" aria-labelledby="mp-loc-title">' +
      '<div class="container">' +
      '<div class="mp-section-head"><h2 id="mp-loc-title">Jouw locatie</h2>' +
      '<p>Postcode of gemeente in Vlaanderen of Brussel.</p></div>' +
      '<div class="mp-loc">' +
      '<label class="mp-loc-label" for="mp-loc-input">Postcode of gemeente</label>' +
      '<p class="mp-loc-hint" id="mp-loc-hint">Typ om te zoeken. Kies een suggestie om je locatie te bevestigen.</p>' +
      '<div class="mp-loc-combo">' +
      '<div class="mp-loc-row">' +
      '<input id="mp-loc-input" class="mp-loc-input" type="text" autocomplete="off" spellcheck="false" ' +
      'role="combobox" aria-autocomplete="list" aria-expanded="' +
      (state.listOpen ? 'true' : 'false') +
      '" aria-controls="mp-loc-listbox" aria-describedby="mp-loc-hint"' +
      activeDesc +
      ' value="' +
      esc(state.locationQuery) +
      '" placeholder="bv. 9000 of Gent">' +
      '<button type="button" class="btn btn-primary" id="mp-loc-submit">Bevestig locatie</button>' +
      '</div>' +
      listboxHtml() +
      '</div>' +
      '<p class="mp-loc-status ' +
      statusClass() +
      '" id="mp-loc-status" role="status">' +
      (state.status
        ? esc(state.status)
        : confirmed
          ? 'Locatie: ' + confirmed
          : '') +
      '</p>' +
      '</div></div></section>' +
      '<section class="mp-section" aria-labelledby="mp-prov-title">' +
      '<div class="container">' +
      '<div class="mp-section-head"><h2 id="mp-prov-title">Provincies</h2>' +
      '<p>Kies een provincie in Vlaanderen of Brussel.</p></div>' +
      provinceLinksHtml() +
      '</div></section>' +
      '<section class="mp-section mp-section--band" aria-labelledby="mp-seo-title">' +
      '<div class="container"><div class="mp-seo">' +
      '<h2 id="mp-seo-title">' +
      esc(state.label) +
      ' via ELYAN</h2>' +
      '<p>' +
      esc(UI.seoFor(state.categoryId)) +
      '</p>' +
      '</div></div></section>';

    bindLocation();
  }

  function setStatus(msg, kind) {
    state.status = msg || '';
    state.statusKind = kind || '';
    var el = document.getElementById('mp-loc-status');
    if (el) {
      el.textContent = state.status;
      el.className = 'mp-loc-status ' + statusClass();
    }
  }

  function selectSuggestion(loc) {
    if (!loc || !UI.isVlaanderenOrBrusselLocation(loc)) {
      setStatus('Kies een gemeente of postcode in Vlaanderen of Brussel.', 'error');
      return;
    }
    state.location = loc;
    state.locationQuery = loc.name + ' (' + loc.postcode + ')';
    state.listOpen = false;
    state.suggestions = [];
    state.activeIndex = -1;
    state.status = 'Locatie: ' + loc.name + ' (' + loc.postcode + ')';
    state.statusKind = 'ok';
    applyLocationToUrl(loc, true);
    render();
  }

  function confirmFromInput() {
    var q = String(state.locationQuery || '').trim();
    if (!q) {
      setStatus('Vul een postcode of gemeente in.', 'error');
      return;
    }
    var hits = suggest(q);
    if (hits.length === 1) {
      selectSuggestion(hits[0]);
      return;
    }
    // Exact postcode match
    var pc = q.replace(/\s+/g, '');
    if (/^[1-9][0-9]{3}$/.test(pc)) {
      var byPc = hits.filter(function (h) {
        return h.postcode === pc;
      });
      if (byPc.length === 1) {
        selectSuggestion(byPc[0]);
        return;
      }
      var pool = vlLocations().filter(function (l) {
        return l.postcode === pc;
      });
      if (pool.length === 1) {
        selectSuggestion(pool[0]);
        return;
      }
    }
    var exactName = vlLocations().filter(function (l) {
      return l.name.toLowerCase() === q.toLowerCase();
    });
    if (exactName.length === 1) {
      selectSuggestion(exactName[0]);
      return;
    }
    if (hits.length > 1) {
      state.suggestions = hits;
      state.listOpen = true;
      state.activeIndex = 0;
      setStatus('Kies een suggestie uit de lijst.', 'error');
      render();
      var input = document.getElementById('mp-loc-input');
      if (input) input.focus();
      return;
    }
    setStatus('Locatie niet gevonden in Vlaanderen of Brussel.', 'error');
  }

  function bindLocation() {
    var input = document.getElementById('mp-loc-input');
    var submit = document.getElementById('mp-loc-submit');
    var list = document.getElementById('mp-loc-listbox');
    if (!input) return;

    input.addEventListener('input', function () {
      state.locationQuery = input.value;
      state.location = null;
      state.status = '';
      state.statusKind = 'loading';
      var q = input.value.trim();
      if (q.length < 2) {
        state.suggestions = [];
        state.listOpen = false;
        state.activeIndex = -1;
        setStatus('', '');
        refreshListbox();
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      state.suggestions = suggest(q);
      state.listOpen = true;
      state.activeIndex = state.suggestions.length ? 0 : -1;
      setStatus(state.suggestions.length ? '' : 'Geen resultaten in Vlaanderen of Brussel.', state.suggestions.length ? '' : 'error');
      refreshListbox();
      input.setAttribute('aria-expanded', 'true');
    });

    input.addEventListener('keydown', function (e) {
      if (!state.listOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        state.suggestions = suggest(input.value);
        state.listOpen = !!state.suggestions.length;
        state.activeIndex = 0;
        refreshListbox();
      }
      if (e.key === 'ArrowDown' && state.suggestions.length) {
        e.preventDefault();
        state.activeIndex = (state.activeIndex + 1) % state.suggestions.length;
        refreshListbox();
      } else if (e.key === 'ArrowUp' && state.suggestions.length) {
        e.preventDefault();
        state.activeIndex = (state.activeIndex - 1 + state.suggestions.length) % state.suggestions.length;
        refreshListbox();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.listOpen && state.activeIndex >= 0 && state.suggestions[state.activeIndex]) {
          selectSuggestion(state.suggestions[state.activeIndex]);
        } else {
          confirmFromInput();
        }
      } else if (e.key === 'Escape') {
        state.listOpen = false;
        state.activeIndex = -1;
        refreshListbox();
        input.setAttribute('aria-expanded', 'false');
      }
    });

    if (list) {
      list.addEventListener('mousedown', function (e) {
        var opt = e.target.closest('[data-index]');
        if (!opt) return;
        e.preventDefault();
        var idx = parseInt(opt.getAttribute('data-index'), 10);
        if (state.suggestions[idx]) selectSuggestion(state.suggestions[idx]);
      });
    }

    if (submit) {
      submit.addEventListener('click', function () {
        confirmFromInput();
      });
    }
  }

  document.addEventListener('click', function (e) {
    if (!state.listOpen) return;
    var combo = e.target.closest && e.target.closest('.mp-loc-combo');
    if (!combo) {
      state.listOpen = false;
      refreshListbox();
      var inputEl = document.getElementById('mp-loc-input');
      if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
    }
  });

  function refreshListbox() {
    var combo = document.querySelector('.mp-loc-combo');
    var input = document.getElementById('mp-loc-input');
    if (!combo) return;
    var existing = document.getElementById('mp-loc-listbox');
    var wrap = document.createElement('div');
    wrap.innerHTML = listboxHtml();
    var next = wrap.firstChild;
    if (existing) existing.replaceWith(next);
    else combo.appendChild(next);
    if (input) {
      input.setAttribute('aria-expanded', state.listOpen ? 'true' : 'false');
      if (state.listOpen && state.activeIndex >= 0) {
        input.setAttribute('aria-activedescendant', 'mp-loc-opt-' + state.activeIndex);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }
    var list = document.getElementById('mp-loc-listbox');
    if (list) {
      list.addEventListener('mousedown', function (e) {
        var opt = e.target.closest('[data-index]');
        if (!opt) return;
        e.preventDefault();
        var idx = parseInt(opt.getAttribute('data-index'), 10);
        if (state.suggestions[idx]) selectSuggestion(state.suggestions[idx]);
      });
    }
  }

  function init() {
    var route = UI.parseCategoryRoute(window.location.pathname);
    if (!route.ok || !route.categoryId) {
      go404();
      return;
    }

    var eng = engine();
    var cat = eng && eng.getCategory ? eng.getCategory(route.categoryId) : null;
    var label = (cat && cat.label) || UI.labelFor(route.categoryId);
    if (!UI.isCategoryId(route.categoryId)) {
      go404();
      return;
    }

    // Defense in depth: if rewrite somehow served unknown, still 404
    state.categoryId = route.categoryId;
    state.regioSlug = route.regioSlug || null;
    state.label = label;

    var fromQuery = readQueryLocation();
    if (fromQuery) {
      state.location = fromQuery;
      state.locationQuery = fromQuery.name + (fromQuery.postcode ? ' (' + fromQuery.postcode + ')' : '');
      state.status = 'Locatie: ' + fromQuery.name + (fromQuery.postcode ? ' (' + fromQuery.postcode + ')' : '');
      state.statusKind = 'ok';
    }

    setMeta(state.categoryId, state.label);
    renderBreadcrumb();
    render();

    window.addEventListener('popstate', function () {
      var r = UI.parseCategoryRoute(window.location.pathname);
      if (!r.ok) return;
      state.regioSlug = r.regioSlug || null;
      var loc = readQueryLocation();
      state.location = loc;
      state.locationQuery = loc ? loc.name + (loc.postcode ? ' (' + loc.postcode + ')' : '') : '';
      state.status = loc ? 'Locatie: ' + loc.name + (loc.postcode ? ' (' + loc.postcode + ')' : '') : '';
      state.statusKind = loc ? 'ok' : '';
      renderBreadcrumb();
      render();
    });
  }

  init();
})();
