/* ELYAN Control: Customer Requests / Aanvragen (Core + Automation V1) */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var ACTIVITY_LABELS = {
    created: 'Aangemaakt',
    owner_changed: 'Eigenaar gewijzigd',
    status_changed: 'Status gewijzigd',
    follow_up_changed: 'Opvolging gezet',
    follow_up_cleared: 'Opvolging gewist',
    note_added: 'Notitie toegevoegd',
    closed: 'Afgesloten'
  };

  var REQUEST_STATUS_LABELS = {
    new: 'Nieuw',
    contacted: 'Contact opgenomen',
    qualified: 'Gekwalificeerd',
    closed_won: 'Succesvolle introductie',
    closed_lost: 'Afgesloten · niet gelukt'
  };

  function uiText(s) {
    return String(s == null ? '' : s).replace(/\u2014/g, ' · ');
  }

  function emptyVal() {
    return '-';
  }

  function lifecycleLabel(code) {
    if (!code) return emptyVal();
    return REQUEST_STATUS_LABELS[code] || uiText(code);
  }

  var state = {
    status: 'all',
    categoryId: '',
    partnerSlug: '',
    ownerFilter: '',
    followUpFilter: '',
    attentionOnly: false,
    minAgeHours: '',
    createdFrom: '',
    createdTo: '',
    requestId: null,
    detail: null,
    staffUserId: null,
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
    if (!iso) return emptyVal();
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

  function toLocalInputValue(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function shortId(id) {
    if (!id) return emptyVal();
    var s = String(id);
    return s.length > 8 ? s.slice(0, 8) + '…' : s;
  }

  function metaRows(pairs) {
    return (
      '<dl class="ctrl-meta-grid">' +
      pairs
        .map(function (p) {
          return (
            '<div class="ctrl-dl-row"><dt>' +
            esc(p[0]) +
            '</dt><dd>' +
            esc(p[1] == null || p[1] === '' ? emptyVal() : uiText(p[1])) +
            '</dd></div>'
          );
        })
        .join('') +
      '</dl>'
    );
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

  function attentionBadge(row) {
    if (!row.attention) return '';
    return '<span class="ctrl-badge ctrl-badge-attention">Aandacht</span>';
  }

  function renderList(items) {
    var host = EP.$('#ctrlList');
    var meta = EP.$('#ctrlListMeta');
    if (!host) return;
    meta.textContent = items.length === 1 ? '1 aanvraag' : items.length + ' aanvragen';
    if (!items.length) {
      host.innerHTML = '<p class="lab-hint">Geen nieuwe aanvragen.</p>';
      return;
    }
    host.innerHTML = items
      .map(function (row) {
        var statusLine = uiText(row.statusLabel || lifecycleLabel(row.status) || row.status);
        return (
          '<article class="ctrl-list-item' +
          (row.attention ? ' is-attention' : '') +
          '" role="listitem">' +
          '<div class="ctrl-list-item-main">' +
          '<strong>' +
          esc(row.customerName) +
          '</strong>' +
          '<p class="ctrl-list-status">' +
          esc(statusLine) +
          '</p>' +
          metaRows([
            ['Vakgebied', row.categoryId || emptyVal()],
            ['Locatie', row.locationText || emptyVal()],
            ['Partner', row.partnerSlug || emptyVal()],
            [
              'Partnerreactie',
              row.partnerResponseStatusLabel || 'Nog geen reactie'
            ],
            [
              'Eigenaar',
              row.ownerUserId ? shortId(row.ownerUserId) : 'Niet toegewezen'
            ],
            ['Leeftijd', row.ageLabel || emptyVal()],
            [
              'Opvolging',
              row.nextFollowUpAt ? fmtDate(row.nextFollowUpAt) : 'Geen'
            ],
            ['Aandacht', row.attention ? 'Ja' : 'Nee']
          ]) +
          '</div>' +
          '<div class="ctrl-list-item-side">' +
          attentionBadge(row) +
          '<button type="button" class="btn btn-primary btn-sm" data-open-request="' +
          esc(row.id) +
          '">Openen</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  async function loadList() {
    renderFilters();
    setActionStatus('', null);
    var query = { status: state.status };
    if (state.categoryId) query.categoryId = state.categoryId;
    if (state.partnerSlug) query.partnerSlug = state.partnerSlug;
    if (state.ownerFilter) query.ownerFilter = state.ownerFilter;
    if (state.followUpFilter) query.followUpFilter = state.followUpFilter;
    if (state.attentionOnly) query.attentionOnly = '1';
    if (state.minAgeHours) query.minAgeHours = state.minAgeHours;
    if (state.createdFrom) query.createdFrom = state.createdFrom + 'T00:00:00.000Z';
    if (state.createdTo) query.createdTo = state.createdTo + 'T23:59:59.999Z';
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
    return pairs
      .map(function (p) {
        var val = p[1];
        if (!p[2] && typeof val === 'string') val = uiText(val);
        return (
          '<div class="ctrl-dl-row">' +
          '<dt>' +
          esc(p[0]) +
          '</dt>' +
          '<dd>' +
          (p[2] ? val : esc(val)) +
          '</dd>' +
          '</div>'
        );
      })
      .join('');
  }

  function fillLostReasons(req) {
    var sel = EP.$('#ctrlLostReason');
    if (!sel) return;
    var reasons = req.closedLostReasons || [];
    sel.innerHTML =
      '<option value="">Kies reden…</option>' +
      reasons
        .map(function (r) {
          return '<option value="' + esc(r.reason) + '">' + esc(r.label) + '</option>';
        })
        .join('');
  }

  function activityLine(ev) {
    var label = ACTIVITY_LABELS[ev.action] || ev.action;
    var meta = ev.meta || {};
    var detail = '';
    if (ev.action === 'status_changed') {
      detail =
        lifecycleLabel(meta.from) + ' → ' + lifecycleLabel(meta.to);
    } else if (ev.action === 'owner_changed') {
      detail =
        (meta.from ? shortId(meta.from) : 'geen') +
        ' → ' +
        (meta.to ? shortId(meta.to) : 'geen');
    } else if (ev.action === 'follow_up_changed' || ev.action === 'follow_up_cleared') {
      detail = meta.to ? fmtDate(meta.to) : 'gewist';
    } else if (ev.action === 'closed') {
      detail =
        lifecycleLabel(meta.outcome) +
        (meta.reason ? ' · ' + meta.reason : '');
    } else if (ev.action === 'note_added') {
      detail = meta.noteId ? 'ref ' + shortId(meta.noteId) : '';
    }
    return (
      '<div class="ctrl-ri">' +
      '<div class="ctrl-ri-head">' +
      '<strong>' +
      esc(label) +
      (detail ? ': ' + esc(detail) : '') +
      '</strong>' +
      '<span>' +
      esc(fmtDate(ev.createdAt)) +
      '</span>' +
      '</div>' +
      '</div>'
    );
  }

  function renderDetail(payload) {
    var req = payload.request;
    state.detail = payload;
    EP.$('#ctrlDetailName').textContent = req.customerName || 'Aanvraag';
    EP.$('#ctrlDetailSub').textContent =
      uiText(req.statusLabel || req.status) +
      ' · ' +
      fmtDate(req.createdAt) +
      ' · ' +
      (req.ageLabel || emptyVal());

    var badges =
      '<span class="ctrl-badge">' +
      esc(uiText(req.statusLabel || req.status)) +
      '</span>';
    if (req.attention) badges += '<span class="ctrl-badge ctrl-badge-attention">Aandacht</span>';
    if (req.newSlaOverdue) badges += '<span class="ctrl-badge ctrl-badge-attention">SLA nieuw</span>';
    if (req.followUpOverdue) badges += '<span class="ctrl-badge ctrl-badge-attention">Opvolging</span>';
    EP.$('#ctrlBadges').innerHTML = badges;

    EP.$('#ctrlCustomerFields').innerHTML = dlRows([
      ['Naam', req.customerName],
      ['E-mail', req.customerEmail],
      ['Telefoon', req.customerPhone || emptyVal()],
      ['Locatie', req.locationText],
      ['Toestemming', fmtDate(req.consentAt)]
    ]);

    EP.$('#ctrlMessage').textContent = req.message || '';

    EP.$('#ctrlOpsFields').innerHTML = dlRows([
      ['Eigenaar', req.ownerUserId ? shortId(req.ownerUserId) : 'Niet toegewezen'],
      ['Toegewezen op', fmtDate(req.ownerAssignedAt)],
      ['Volgende opvolging', fmtDate(req.nextFollowUpAt)],
      ['SLA-deadline (nieuw)', fmtDate(req.newSlaDeadlineAt)],
      ['Aandacht', req.attention ? 'Ja' : 'Nee']
    ]);

    var followInput = EP.$('#ctrlFollowUpInput');
    if (followInput) followInput.value = toLocalInputValue(req.nextFollowUpAt);

    var ops = EP.$('#ctrlOpsActions');
    if (ops) {
      var closed = req.status === 'closed_won' || req.status === 'closed_lost';
      if (closed) {
        ops.innerHTML =
          '<p class="lab-hint">Gesloten aanvraag: geen actieve toewijzing of opvolging nodig.</p>';
      } else {
        ops.innerHTML =
          '<button type="button" class="btn btn-ghost btn-sm" data-assign-me>Toewijzen aan mij</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-unassign>Eigenaar wissen</button>';
      }
    }

    EP.$('#ctrlContextFields').innerHTML = dlRows([
      ['Bron', req.source === 'marketplace_interest' ? 'Marketplace-interesse' : req.source],
      ['Gekozen vakbedrijf', req.partnerSlug || emptyVal()],
      ['Categorie', req.categoryId || emptyVal()],
      ['Partnerreactie', uiText(req.partnerResponseStatusLabel) || emptyVal()],
      ['Afwijzingsreden', uiText(req.partnerDeclineReasonLabel) || emptyVal()],
      ['Partner reageerde op', fmtDate(req.partnerRespondedAt)],
      ['Aangemaakt', fmtDate(req.createdAt)],
      ['Laatste statuswijziging', fmtDate(req.statusChangedAt)],
      [
        'Afsluitreden',
        req.closedLostReasonLabel
          ? uiText(req.closedLostReasonLabel) +
            (req.closedLostDetail ? ': ' + req.closedLostDetail : '')
          : emptyVal()
      ],
      ['Afgesloten op', fmtDate(req.closedAt)]
    ]);

    fillLostReasons(req);
    var lostBox = EP.$('#ctrlLostReasonBox');
    if (lostBox) lostBox.hidden = true;

    var notes = payload.notes || [];
    var notesHost = EP.$('#ctrlNotes');
    if (!notes.length) {
      notesHost.innerHTML = '<p class="lab-hint">Nog geen notities.</p>';
    } else {
      notesHost.innerHTML = notes
        .map(function (n) {
          return (
            '<div class="ctrl-ri">' +
            '<div class="ctrl-ri-head">' +
            '<strong>' +
            esc(shortId(n.authorUserId)) +
            '</strong>' +
            '<span>' +
            esc(fmtDate(n.createdAt)) +
            '</span>' +
            '</div>' +
            '<p class="ctrl-note-body">' +
            esc(n.content) +
            '</p>' +
            '</div>'
          );
        })
        .join('');
    }

    var activity = payload.activity || [];
    var actHost = EP.$('#ctrlActivity');
    if (!activity.length) {
      actHost.innerHTML = '<p class="lab-hint">Nog geen activiteit.</p>';
    } else {
      actHost.innerHTML = activity.map(activityLine).join('');
    }

    var events = payload.statusEvents || [];
    var eventsHost = EP.$('#ctrlStatusEvents');
    if (!events.length) {
      eventsHost.innerHTML = '<p class="lab-hint">Nog geen statuswijzigingen.</p>';
    } else {
      eventsHost.innerHTML = events
        .map(function (ev) {
          return (
            '<div class="ctrl-ri">' +
            '<div class="ctrl-ri-head">' +
            '<strong>' +
            esc(uiText(ev.fromLabel) || emptyVal()) +
            ' → ' +
            esc(uiText(ev.toLabel || ev.toStatus)) +
            '</strong>' +
            '<span>' +
            esc(fmtDate(ev.createdAt)) +
            '</span>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    var next = req.allowedNextStatuses || [];
    EP.$('#ctrlActionHint').textContent = next.length
      ? 'Kies de volgende status. Ongeldige overgangen worden server-side geweigerd. Gewonnen = succesvolle intro/match door ELYAN.'
      : 'Deze aanvraag is afgesloten.';
    var actions = EP.$('#ctrlActions');
    if (!next.length) {
      actions.innerHTML = '<p class="lab-hint">Geen verdere statusacties.</p>';
    } else {
      actions.innerHTML = next
        .map(function (s) {
          return (
            '<button type="button" class="btn btn-primary btn-sm" data-set-status="' +
            esc(s.status) +
            '">' +
            esc(s.label) +
            '</button>'
          );
        })
        .join('');
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

    var body = { requestId: state.requestId, status: toStatus };
    if (toStatus === 'closed_lost') {
      var box = EP.$('#ctrlLostReasonBox');
      if (box) box.hidden = false;
      var reason = EP.$('#ctrlLostReason');
      var detail = EP.$('#ctrlLostDetail');
      if (!reason || !reason.value) {
        setActionStatus('Kies eerst een reden voor verloren.', 'error');
        return;
      }
      body.closedLostReason = reason.value;
      if (reason.value === 'other') {
        var d = detail && detail.value ? detail.value.trim() : '';
        if (!d) {
          setActionStatus('Toelichting is verplicht bij “Andere”.', 'error');
          return;
        }
        body.closedLostDetail = d;
      }
    }

    var ok = await confirmAction('Status wijzigen', 'Zet deze aanvraag op "' + label + '"?');
    if (!ok) return;
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    try {
      var res = await EP.controlFetch('requests-set-status', {
        method: 'POST',
        body: body
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

  async function assignOwner(clear) {
    if (state.busy || !state.requestId) return;
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    try {
      var res = await EP.controlFetch('requests-set-owner', {
        method: 'POST',
        body: clear
          ? { requestId: state.requestId, clear: true }
          : { requestId: state.requestId, ownerUserId: state.staffUserId }
      });
      if (!res.ok) {
        setActionStatus((res.body && res.body.message) || 'Eigenaar wijzigen mislukt.', 'error');
        return;
      }
      setActionStatus(clear ? 'Eigenaar gewist.' : 'Toegewezen aan jou.', 'ok');
      await loadDetail(state.requestId);
    } finally {
      state.busy = false;
    }
  }

  async function saveFollowUp(clear) {
    if (state.busy || !state.requestId) return;
    var body = { requestId: state.requestId };
    if (clear) {
      body.clear = true;
    } else {
      var input = EP.$('#ctrlFollowUpInput');
      if (!input || !input.value) {
        setActionStatus('Kies een opvolgdatum.', 'error');
        return;
      }
      body.nextFollowUpAt = new Date(input.value).toISOString();
    }
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    try {
      var res = await EP.controlFetch('requests-set-follow-up', {
        method: 'POST',
        body: body
      });
      if (!res.ok) {
        setActionStatus((res.body && res.body.message) || 'Opvolging opslaan mislukt.', 'error');
        return;
      }
      setActionStatus(clear ? 'Opvolging gewist.' : 'Opvolging bewaard.', 'ok');
      await loadDetail(state.requestId);
    } finally {
      state.busy = false;
    }
  }

  async function addNote() {
    if (state.busy || !state.requestId) return;
    var input = EP.$('#ctrlNoteInput');
    var content = input && input.value ? input.value.trim() : '';
    if (!content) {
      setActionStatus('Schrijf eerst een notitie.', 'error');
      return;
    }
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    try {
      var res = await EP.controlFetch('requests-add-note', {
        method: 'POST',
        body: { requestId: state.requestId, content: content }
      });
      if (!res.ok) {
        setActionStatus((res.body && res.body.message) || 'Notitie toevoegen mislukt.', 'error');
        return;
      }
      if (input) input.value = '';
      setActionStatus('Notitie toegevoegd.', 'ok');
      await loadDetail(state.requestId);
    } finally {
      state.busy = false;
    }
  }

  function readSecondaryFilters() {
    var cat = EP.$('#ctrlFilterCategory');
    var partner = EP.$('#ctrlFilterPartner');
    var owner = EP.$('#ctrlFilterOwner');
    var fu = EP.$('#ctrlFilterFollowUp');
    var age = EP.$('#ctrlFilterMinAge');
    var from = EP.$('#ctrlFilterCreatedFrom');
    var to = EP.$('#ctrlFilterCreatedTo');
    var att = EP.$('#ctrlFilterAttention');
    state.categoryId = cat && cat.value ? cat.value.trim() : '';
    state.partnerSlug = partner && partner.value ? partner.value.trim().toLowerCase() : '';
    state.ownerFilter = owner && owner.value ? owner.value : '';
    state.followUpFilter = fu && fu.value ? fu.value : '';
    state.minAgeHours = age && age.value ? String(age.value).trim() : '';
    state.createdFrom = from && from.value ? from.value : '';
    state.createdTo = to && to.value ? to.value : '';
    state.attentionOnly = !!(att && att.checked);
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
        readSecondaryFilters();
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
        var st = btn.getAttribute('data-set-status');
        if (st === 'closed_lost') {
          var box = EP.$('#ctrlLostReasonBox');
          if (box) box.hidden = false;
        }
        setStatus(st);
      });
    }

    var lostReason = EP.$('#ctrlLostReason');
    if (lostReason) {
      lostReason.addEventListener('change', function () {
        var wrap = EP.$('#ctrlLostDetailWrap');
        if (wrap) wrap.hidden = lostReason.value !== 'other';
      });
    }

    var ops = EP.$('#ctrlOpsActions');
    if (ops) {
      ops.addEventListener('click', function (e) {
        if (e.target.closest('[data-assign-me]')) assignOwner(false);
        if (e.target.closest('[data-unassign]')) assignOwner(true);
      });
    }

    var saveFu = EP.$('#ctrlSaveFollowUp');
    if (saveFu) saveFu.addEventListener('click', function () { saveFollowUp(false); });
    var clearFu = EP.$('#ctrlClearFollowUp');
    if (clearFu) clearFu.addEventListener('click', function () { saveFollowUp(true); });

    var addNoteBtn = EP.$('#ctrlAddNote');
    if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);

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

  function applyQueryBootstrap() {
    try {
      var params = new URLSearchParams(location.search || '');
      var st = params.get('status');
      if (st && ['all', 'new', 'contacted', 'qualified', 'closed_won', 'closed_lost'].indexOf(st) >= 0) {
        state.status = st;
      }
      if (params.get('attention') === '1' || params.get('attentionOnly') === '1') {
        state.attentionOnly = true;
        var att = EP.$('#ctrlFilterAttention');
        if (att) att.checked = true;
      }
      renderFilters();
    } catch (e) { /* ignore */ }
  }

  async function boot() {
    bind();
    var session = await EP.requireStaffOrRedirect();
    if (!session) return;
    if (session.notStaff) {
      showGate('Je hebt geen ELYAN Control-rechten.', 'error');
      return;
    }
    state.staffUserId = session.user && session.user.id ? session.user.id : null;
    var userEl = EP.$('#ctrlUser');
    if (userEl && session.user && session.user.email) {
      userEl.hidden = false;
      userEl.textContent = session.user.email;
    }
    applyQueryBootstrap();
    var id = parseRequestFromPath();
    if (id) await loadDetail(id);
    else await loadList();
  }

  boot();
})();
