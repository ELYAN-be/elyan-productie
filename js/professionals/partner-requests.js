(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanProShell;
  var root = EP.$('#profRoot');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function statusLabel(status) {
    if (status === 'interested') return 'Interesse doorgegeven';
    if (status === 'declined') return 'Niet voor mij';
    return 'Nieuw';
  }

  function renderList(items) {
    if (!items.length) {
      return '<div class="prof-card prof-empty">' +
        '<p>Nog geen nieuwe aanvragen.</p>' +
        '<p class="lab-hint">Nieuwe aanvragen die passen bij je bedrijf verschijnen hier.</p>' +
        '</div>';
    }
    return '<div class="prof-request-list">' + items.map(function (item) {
      return '<article class="prof-card prof-request-card" data-request-id="' + esc(item.id) + '">' +
        '<h2 class="prof-request-title">' + esc(item.title) + '</h2>' +
        (item.messageExcerpt ? '<p class="prof-request-excerpt">' + esc(item.messageExcerpt) + '</p>' : '') +
        '<p class="prof-request-meta"><span>' + esc(statusLabel(item.responseStatus)) + '</span></p>' +
        '<button type="button" class="btn btn-primary btn-block prof-request-open" data-open="' + esc(item.id) + '">Bekijk aanvraag →</button>' +
        '</article>';
    }).join('') + '</div>';
  }

  function renderDetail(req) {
    var responded = req.responseStatus === 'interested' || req.responseStatus === 'declined';
    return '<div class="prof-card">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="reqBack">← Terug</button>' +
      '<h2>Past dit project bij je?</h2>' +
      '<p class="prof-request-detail-title">' + esc(req.title) + '</p>' +
      (req.message ? '<p class="prof-request-detail">' + esc(req.message) + '</p>' : '') +
      (responded
        ? '<p class="prof-status is-success">' + esc(statusLabel(req.responseStatus)) + '.</p>'
        : '<div class="prof-actions prof-actions-stack">' +
          '<button type="button" class="btn btn-primary" id="reqInterested" data-id="' + esc(req.id) + '">Interesse</button>' +
          '<button type="button" class="btn" id="reqDecline" data-id="' + esc(req.id) + '">Niet voor mij</button>' +
          '</div>') +
      '<div id="declinePanel" class="prof-decline-panel" hidden>' +
      '<p class="prof-q-label">Mag je aangeven waarom?</p>' +
      '<div class="lab-choice-grid is-2" id="declineReasons">' +
      '<button type="button" class="lab-choice" data-reason="te_ver">Te ver</button>' +
      '<button type="button" class="lab-choice" data-reason="geen_beschikbaarheid">Geen beschikbaarheid</button>' +
      '<button type="button" class="lab-choice" data-reason="niet_mijn_werk">Niet mijn type werk</button>' +
      '<button type="button" class="lab-choice" data-reason="project_grootte">Project te klein/groot</button>' +
      '<button type="button" class="lab-choice" data-reason="andere">Andere</button>' +
      '</div>' +
      '<div class="prof-actions prof-actions-stack">' +
      '<button type="button" class="btn" id="reqDeclineConfirm">Bevestigen</button>' +
      '<button type="button" class="btn btn-ghost" id="reqDeclineSkip">Overslaan</button>' +
      '</div></div>' +
      '<p id="reqStatus" class="prof-status" hidden></p>' +
      '</div>';
  }

  var state = { partnerId: null, items: [], selectedId: null, declineReason: null };

  function bindDetailEvents() {
    var back = EP.$('#reqBack');
    if (back) back.addEventListener('click', function () { renderMain(); });
    var interested = EP.$('#reqInterested');
    if (interested) {
      interested.addEventListener('click', function () {
        respond('interested', null);
      });
    }
    var decline = EP.$('#reqDecline');
    if (decline) {
      decline.addEventListener('click', function () {
        EP.showEl(EP.$('#declinePanel'), true);
      });
    }
    var reasons = EP.$('#declineReasons');
    if (reasons) {
      reasons.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-reason]');
        if (!btn) return;
        state.declineReason = btn.getAttribute('data-reason');
        reasons.querySelectorAll('.lab-choice').forEach(function (el) {
          el.classList.toggle('is-selected', el === btn);
        });
      });
    }
    var confirm = EP.$('#reqDeclineConfirm');
    if (confirm) {
      confirm.addEventListener('click', function () {
        respond('declined', state.declineReason);
      });
    }
    var skip = EP.$('#reqDeclineSkip');
    if (skip) {
      skip.addEventListener('click', function () {
        respond('declined', null);
      });
    }
  }

  async function respond(response, declineReason) {
    var statusEl = EP.$('#reqStatus');
    try {
      var res = await EP.apiFetch('partner-request-respond', {
        method: 'POST',
        query: { partnerId: state.partnerId },
        body: { requestId: state.selectedId, response: response, declineReason: declineReason }
      });
      if (!res.ok || !res.body.ok) throw new Error('Kon reactie niet opslaan.');
      var msg = response === 'interested'
        ? 'Interesse doorgegeven. ELYAN heeft je reactie geregistreerd.'
        : 'Reactie opgeslagen.';
      EP.setStatus(statusEl, msg, 'success');
      await loadRequests();
      setTimeout(function () { openRequest(state.selectedId); }, 400);
    } catch (e) {
      EP.setStatus(statusEl, e.message || 'Er ging iets mis. Probeer opnieuw.', 'error');
    }
  }

  async function openRequest(id) {
    state.selectedId = id;
    var res = await EP.apiFetch('partner-request-get', {
      method: 'GET',
      query: { partnerId: state.partnerId, requestId: id }
    });
    if (!res.ok || !res.body.ok) return;
    var body = Shell.mountShell({
      host: root,
      active: 'aanvragen',
      title: 'Aanvraag',
      subtitle: 'Bekijk de projectcontext en geef je reactie.'
    });
    body.innerHTML = renderDetail(res.body.request);
    bindDetailEvents();
  }

  function renderMain() {
    var body = Shell.mountShell({
      host: root,
      active: 'aanvragen',
      title: 'Aanvragen',
      subtitle: 'Renovatieaanvragen die bij jou passen.'
    });
    body.innerHTML = '<p id="listStatus" class="prof-status is-info">Laden…</p>' + renderList(state.items);
    body.querySelectorAll('.prof-request-open').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openRequest(btn.getAttribute('data-open'));
      });
    });
    EP.showEl(EP.$('#listStatus'), false);
  }

  async function loadRequests() {
    var res = await EP.apiFetch('partner-requests-list', {
      method: 'GET',
      query: { partnerId: state.partnerId }
    });
    if (!res.ok || !res.body.ok) throw new Error('Kon aanvragen niet laden.');
    state.items = res.body.items || [];
    renderMain();
  }

  EP.requireSessionOrRedirect().then(async function (session) {
    if (!session || session.noMembership || session.error) {
      root.innerHTML = '<p class="prof-status is-error">Log in via je uitnodigingslink.</p>';
      return;
    }
    state.partnerId = session.memberships[0].partnerId || session.memberships[0].partner.id;
    try {
      var dest = await EP.resolveProfessionalsHome(state.partnerId, null);
      if (dest !== '/professionals/dashboard') {
        location.replace(dest);
        return;
      }
      await loadRequests();
    } catch (e) {
      Shell.mountShell({ host: root, active: 'aanvragen', title: 'Aanvragen' });
      EP.setStatus(EP.$('#profV1Body'), e.message, 'error');
    }
  });
})();
