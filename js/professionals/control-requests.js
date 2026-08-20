/* ELYAN Control — Customer Requests / Aanvragen */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var state = {
    status: 'all',
    categoryId: '',
    partnerSlug: '',
    requestId: null,
    detail: null,
    busy: false
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('nl-BE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(iso);
    }
  }

  function parseRequestFromPath() {
    var m = location.pathname.match(/\/professionals\/aanvragen\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }

  function setListUrl() {
    if (location.pathname !== '/professionals/aanvragen') {
      history.replaceState({}, '', '/professionals/aanvragen');
    }
  }

  function setDetailUrl(requestId) {
    var next = '/professionals/aanvragen/' + requestId;
    if (location.pathname !== next) {
      history.pushState({ requestId: requestId }, '', next);
    }
  }

  function confirmAction(title, body) {
    return new Promise(function (resolve) {
      var dlg = EP.$('#ctrlConfirm');
      var titleEl = EP.$('#ctrlConfirmTitle');
      var bodyEl = EP.$('#ctrlConfirmBody');
      if (!dlg || typeof dlg.showModal !== 'function') {
        resolve(window.confirm(title + '\n\n' + body));
        return;
      }
      titleEl.textContent = title;
      bodyEl.textContent = body;
      function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'confirm');
      }
      dlg.addEventListener('close', onClose);
      dlg.showModal();
    });
  }

  function setActionStatus(msg, kind) {
    EP.setStatus(EP.$('#ctrlActionStatus'), msg, kind);
  }

  function showGate(msg, kind) {
    var el = EP.$('#ctrlGate');
    EP.setStatus(el, msg, kind || 'info');
    EP.showEl(EP.$('#ctrlListView'), false);
    EP.showEl(EP.$('#ctrlDetailView'), false);
  }

  function renderFilters() {
    var root = EP.$('#ctrlFilters');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-status]'), function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-status') === state.status);
    });
  }

  function renderList(items) {
    var host = EP.$('#ctrlList');
    var meta = EP.$('#ctrlListMeta');
    if (!host) return;
    meta.textContent = items.length === 1 ? '1 aanvraag' : items.length + ' aanvragen';
    if (!items.length) {
      host.innerHTML = '<p class="lab-hint">Geen aanvragen in deze filter.</p>';
      return;
    }
    host.innerHTML = items.map(function (row) {
      return (
        '<article class="ctrl-list-item" role="listitem">' +
          '<div class="ctrl-list-item-main">' +
            '<strong>' + esc(row.customerName) + '</strong>' +
            '<span class="ctrl-list-meta-line">' +
              esc(row.statusLabel || row.status) +
              ' · ' + esc(row.partnerSlug || '—') +
              (row.categoryId ? ' · ' + esc(row.categoryId) : '') +
            '</span>' +
            '<span class="ctrl-list-meta-line">' +
              esc(row.locationText || '') + ' · ' + esc(fmtDate(row.createdAt)) +
            '</span>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-open-request="' +
            esc(row.id) + '">Openen</button>' +
        '</article>'
      );
    }).join('');
  }

  async function loadList() {
    renderFilters();
    setActionStatus('', null);
    var query = { status: state.status };
    if (state.categoryId) query.categoryId = state.categoryId;
    if (state.partnerSlug) query.partnerSlug = state.partnerSlug;
    var res = await EP.controlFetch('requests-list', {
      method: 'GET',
      query: query
    });
    if (!res.ok) {
      showGate((res.body && res.body.message) || 'Lijst laden mislukt.', 'error');
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), true);
    EP.showEl(EP.$('#ctrlDetailView'), false);
    state.requestId = null;
    state.detail = null;
    setListUrl();
    renderList(res.body.items || []);
  }

  function dlRows(pairs) {
    return pairs.map(function (p) {
      return (
        '<div class="ctrl-dl-row">' +
          '<dt>' + esc(p[0]) + '</dt>' +
          '<dd>' + (p[2] ? p[1] : esc(p[1])) + '</dd>' +
        '</div>'
      );
    }).join('');
  }

  function renderDetail(payload) {
    var req = payload.request;
    state.detail = payload;
    EP.$('#ctrlDetailName').textContent = req.customerName || 'Aanvraag';
    EP.$('#ctrlDetailSub').textContent =
      (req.statusLabel || req.status) + ' · ' + fmtDate(req.createdAt);
    EP.$('#ctrlBadges').innerHTML =
      '<span class="ctrl-badge">' + esc(req.statusLabel || req.status) + '</span>';

    EP.$('#ctrlCustomerFields').innerHTML = dlRows([
      ['Naam', req.customerName],
      ['E-mail', req.customerEmail],
      ['Telefoon', req.customerPhone || '—'],
      ['Locatie', req.locationText],
      ['Toestemming', fmtDate(req.consentAt)]
    ]);

    EP.$('#ctrlMessage').textContent = req.message || '';

    EP.$('#ctrlContextFields').innerHTML = dlRows([
      ['Bron', req.source === 'marketplace_interest' ? 'Marketplace-interesse' : req.source],
      ['Partner', req.partnerSlug || '—'],
      ['Categorie', req.categoryId || '—'],
      ['Aangemaakt', fmtDate(req.createdAt)],
      ['Laatste statuswijziging', fmtDate(req.statusChangedAt)]
    ]);

    var events = payload.statusEvents || [];
    var eventsHost = EP.$('#ctrlStatusEvents');
    if (!events.length) {
      eventsHost.innerHTML = '<p class="lab-hint">Nog geen statuswijzigingen.</p>';
    } else {
      eventsHost.innerHTML = events.map(function (ev) {
        return (
          '<div class="ctrl-ri">' +
            '<div class="ctrl-ri-head">' +
              '<strong>' + esc(ev.fromLabel || '—') + ' → ' + esc(ev.toLabel || ev.toStatus) + '</strong>' +
              '<span>' + esc(fmtDate(ev.createdAt)) + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    var next = req.allowedNextStatuses || [];
    EP.$('#ctrlActionHint').textContent = next.length
      ? 'Kies de volgende status. Ongeldige overgangen worden server-side geweigerd.'
      : 'Deze aanvraag is afgesloten.';
    var actions = EP.$('#ctrlActions');
    if (!next.length) {
      actions.innerHTML = '<p class="lab-hint">Geen verdere statusacties.</p>';
    } else {
      actions.innerHTML = next.map(function (s) {
        return (
          '<button type="button" class="btn btn-primary btn-sm" data-set-status="' +
            esc(s.status) + '">' + esc(s.label) + '</button>'
        );
      }).join('');
    }
  }

  async function loadDetail(requestId) {
    setActionStatus('', null);
    var res = await EP.controlFetch('requests-get', {
      method: 'GET',
      query: { requestId: requestId }
    });
    if (!res.ok) {
      showGate((res.body && res.body.message) || 'Aanvraag laden mislukt.', 'error');
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), false);
    EP.showEl(EP.$('#ctrlDetailView'), true);
    state.requestId = requestId;
    setDetailUrl(requestId);
    renderDetail(res.body);
  }

  async function setStatus(toStatus) {
    if (state.busy || !state.requestId) return;
    var label = toStatus;
    var next = (state.detail && state.detail.request && state.detail.request.allowedNextStatuses) || [];
    next.forEach(function (s) {
      if (s.status === toStatus) label = s.label;
    });
    var ok = await confirmAction(
      'Status wijzigen',
      'Zet deze aanvraag op "' + label + '"?'
    );
    if (!ok) return;
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    try {
      var res = await EP.controlFetch('requests-set-status', {
        method: 'POST',
        body: { requestId: state.requestId, status: toStatus }
      });
      if (!res.ok) {
        setActionStatus((res.body && res.body.message) || 'Status wijzigen mislukt.', 'error');
        return;
      }
      setActionStatus('Status bijgewerkt.', 'ok');
      await loadDetail(state.requestId);
    } finally {
      state.busy = false;
    }
  }

  function bind() {
    var filters = EP.$('#ctrlFilters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-status]');
        if (!btn) return;
        state.status = btn.getAttribute('data-status');
        loadList();
      });
    }

    var apply = EP.$('#ctrlApplyFilters');
    if (apply) {
      apply.addEventListener('click', function () {
        var cat = EP.$('#ctrlFilterCategory');
        var partner = EP.$('#ctrlFilterPartner');
        state.categoryId = cat && cat.value ? cat.value.trim() : '';
        state.partnerSlug = partner && partner.value ? partner.value.trim().toLowerCase() : '';
        loadList();
      });
    }

    var list = EP.$('#ctrlList');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-open-request]');
        if (!btn) return;
        loadDetail(btn.getAttribute('data-open-request'));
      });
    }

    var back = EP.$('#ctrlBackList');
    if (back) {
      back.addEventListener('click', function () {
        loadList();
      });
    }

    var actions = EP.$('#ctrlActions');
    if (actions) {
      actions.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-set-status]');
        if (!btn) return;
        setStatus(btn.getAttribute('data-set-status'));
      });
    }

    var logout = EP.$('#ctrlLogout');
    if (logout) {
      logout.addEventListener('click', function () {
        EP.logout();
      });
    }

    window.addEventListener('popstate', function () {
      var id = parseRequestFromPath();
      if (id) loadDetail(id);
      else loadList();
    });
  }

  async function boot() {
    bind();
    var session = await EP.requireStaffOrRedirect();
    if (!session) return;
    if (session.notStaff) {
      showGate('Je hebt geen ELYAN Control-rechten.', 'error');
      return;
    }
    var userEl = EP.$('#ctrlUser');
    if (userEl && session.user && session.user.email) {
      userEl.hidden = false;
      userEl.textContent = session.user.email;
    }
    // Redirect next for this page
    var id = parseRequestFromPath();
    if (id) await loadDetail(id);
    else await loadList();
  }

  boot();
})();
