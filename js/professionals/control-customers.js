/* ELYAN Control — Customer View (staff-only, email aggregation) */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var state = { customerKey: null };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return 'Niet beschikbaar';
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

  function parseCustomerFromPath() {
    var m = location.pathname.match(/\/professionals\/klanten\/([^/]+)/i);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]).toLowerCase();
    } catch (e) {
      return m[1].toLowerCase();
    }
  }

  function setListUrl() {
    if (location.pathname !== '/professionals/klanten') {
      history.replaceState({}, '', '/professionals/klanten');
    }
  }

  function setDetailUrl(key) {
    var next = '/professionals/klanten/' + encodeURIComponent(key);
    if (location.pathname !== next) {
      history.pushState({ customerKey: key }, '', next);
    }
  }

  function showGate(msg, kind) {
    var el = EP.$('#ctrlGate');
    EP.setStatus(el, msg, kind || 'info');
    EP.showEl(EP.$('#ctrlListView'), false);
    EP.showEl(EP.$('#ctrlDetailView'), false);
  }

  function dlRows(pairs) {
    return pairs
      .map(function (p) {
        return (
          '<div class="ctrl-dl-row"><dt>' +
          esc(p[0]) +
          '</dt><dd>' +
          esc(p[1] == null || p[1] === '' ? 'Niet beschikbaar' : p[1]) +
          '</dd></div>'
        );
      })
      .join('');
  }

  function renderList(body) {
    var host = EP.$('#ctrlList');
    var meta = EP.$('#ctrlListMeta');
    var items = (body && body.items) || [];
    if (meta) {
      meta.textContent =
        items.length +
        ' klant' +
        (items.length === 1 ? '' : 'en') +
        (body.capped ? ' (scan begrensd)' : '');
    }
    if (!items.length) {
      host.innerHTML = '<p class="lab-hint">Geen klanten in de gescande aanvragen.</p>';
      return;
    }
    host.innerHTML = items
      .map(function (c) {
        return (
          '<article class="ctrl-list-item" role="listitem">' +
          '<div class="ctrl-list-item-main">' +
          '<strong>' +
          esc(c.name) +
          '</strong>' +
          '<span class="ctrl-list-meta-line">' +
          esc(c.email) +
          (c.phone ? ' · ' + esc(c.phone) : '') +
          '</span>' +
          '<span class="ctrl-list-meta-line">' +
          esc(c.locationText || 'Locatie: Niet beschikbaar') +
          ' · Eerste: ' +
          esc(fmtDate(c.firstRequestAt)) +
          ' · Laatst: ' +
          esc(fmtDate(c.lastActivityAt)) +
          '</span>' +
          '<span class="ctrl-list-meta-line">' +
          esc(String(c.totalRequests)) +
          ' aanvragen · ' +
          esc(String(c.activeRequests)) +
          ' actief' +
          (c.nameAmbiguous ? ' · Meerdere namen gezien' : '') +
          '</span>' +
          '</div>' +
          '<div class="ctrl-list-item-side">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-customer="' +
          esc(c.customerKey) +
          '">Openen</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    Array.prototype.forEach.call(host.querySelectorAll('[data-customer]'), function (btn) {
      btn.addEventListener('click', function () {
        openCustomer(btn.getAttribute('data-customer'));
      });
    });
  }

  function renderDetail(body) {
    var c = body.customer;
    EP.$('#ctrlDetailName').textContent = c.name || 'Klant';
    EP.$('#ctrlDetailSub').textContent = c.email;

    EP.$('#ctrlIdentityFields').innerHTML = dlRows([
      ['Naam', c.name],
      ['E-mail', c.email],
      ['Telefoon', c.phone],
      ['Locatie', c.locationText],
      ['Identiteitsregel', 'Genormaliseerd e-mailadres'],
      [
        'Naam-ambiguïteit',
        c.nameAmbiguous ? 'Meerdere namen op dit e-mailadres (geen merge)' : 'Nee'
      ]
    ]);

    EP.$('#ctrlSummaryFields').innerHTML = dlRows([
      ['Eerste aanvraag', fmtDate(c.firstRequestAt)],
      ['Laatste activiteit', fmtDate(c.lastActivityAt)],
      ['Totaal aanvragen', String(c.totalRequests)],
      ['Actief', String(c.activeRequests)]
    ]);

    var activeHost = EP.$('#ctrlActiveRequests');
    var active = body.activeRequests || [];
    if (!active.length) {
      activeHost.innerHTML = '<p class="lab-hint">Geen actieve aanvragen.</p>';
    } else {
      activeHost.innerHTML = active
        .map(function (r) {
          return (
            '<article class="ctrl-list-item" role="listitem">' +
            '<div class="ctrl-list-item-main">' +
            '<strong>' +
            esc(r.statusLabel || r.status) +
            '</strong>' +
            '<span class="ctrl-list-meta-line">' +
            esc(r.partnerSlug || '') +
            (r.categoryId ? ' · ' + esc(r.categoryId) : '') +
            ' · ' +
            esc(fmtDate(r.createdAt)) +
            '</span>' +
            '</div>' +
            '<a class="btn btn-ghost btn-sm" href="/professionals/aanvragen/' +
            esc(r.id) +
            '">Aanvraag</a>' +
            '</article>'
          );
        })
        .join('');
    }

    var histHost = EP.$('#ctrlHistory');
    var hist = body.history || [];
    if (!hist.length) {
      histHost.innerHTML = '<p class="lab-hint">Geen historiek.</p>';
    } else {
      histHost.innerHTML = hist
        .map(function (h) {
          return (
            '<div class="ctrl-ri">' +
            '<div class="ctrl-ri-head">' +
            '<strong>' +
            esc(fmtDate(h.at)) +
            '</strong>' +
            '<span>' +
            esc(h.statusLabel || h.status) +
            '</span>' +
            '</div>' +
            '<p>' +
            esc(h.partnerSlug || '') +
            (h.outcome ? ' · ' + esc(h.outcome) : '') +
            ' · <a href="/professionals/aanvragen/' +
            esc(h.requestId) +
            '">Openen</a></p>' +
            '</div>'
          );
        })
        .join('');
    }
  }

  async function loadList() {
    showGate('Laden…', 'info');
    var res = await EP.controlFetch('customers-list');
    if (!res.ok) {
      showGate(
        res.status === 403 ? 'Geen toegang (alleen ELYAN-staff).' : 'Kon klantenlijst niet laden.',
        'error'
      );
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), true);
    EP.showEl(EP.$('#ctrlDetailView'), false);
    renderList(res.body);
  }

  async function openCustomer(key) {
    if (!key) return;
    state.customerKey = key;
    setDetailUrl(key);
    showGate('Laden…', 'info');
    var res = await EP.controlFetch('customers-get', {
      query: { customerKey: key }
    });
    if (!res.ok) {
      showGate(
        res.status === 404 ? 'Klant niet gevonden.' : 'Kon klantdetail niet laden.',
        'error'
      );
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), false);
    EP.showEl(EP.$('#ctrlDetailView'), true);
    renderDetail(res.body);
  }

  async function init() {
    var session = await EP.requireStaffOrRedirect();
    if (!session) return;
    if (session.notStaff) {
      showGate('Geen toegang — alleen ELYAN-staff.', 'error');
      return;
    }
    var userEl = EP.$('#ctrlUser');
    if (userEl && session.user) {
      userEl.hidden = false;
      userEl.textContent = session.user.email || '';
    }
    var logout = EP.$('#ctrlLogout');
    if (logout) logout.addEventListener('click', function () {
      EP.logout();
    });

    var back = EP.$('#ctrlBackList');
    if (back) {
      back.addEventListener('click', function () {
        state.customerKey = null;
        setListUrl();
        loadList();
      });
    }

    window.addEventListener('popstate', function () {
      var key = parseCustomerFromPath();
      if (key) openCustomer(key);
      else loadList();
    });

    var key = parseCustomerFromPath();
    if (key) await openCustomer(key);
    else await loadList();
  }

  init();
})();
