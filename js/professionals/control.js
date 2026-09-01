/* ELYAN Control — Phase B Sprint 8 */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var state = {
    filter: 'submitted',
    partnerId: null,
    review: null,
    busy: false,
    changeItems: [{ stepId: 'bedrijf_bereik', fieldKey: '', message: '' }]
  };

  var STEP_OPTIONS = [
    { id: 'bedrijf_bereik', label: 'Bedrijf & bereik' },
    { id: 'ambacht', label: 'Ambacht' },
    { id: 'aanbod', label: 'Aanbod' },
    { id: 'verhaal', label: 'Verhaal' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'controle', label: 'Controle' }
  ];

  var STATUS_LABELS = {
    submitted: 'Ingediend',
    changes_requested: 'Wijzigingen gevraagd',
    approved: 'Goedgekeurd',
    under_review: 'In beoordeling',
    ready: 'Klaar voor publicatie',
    published: 'Gepubliceerd',
    paused: 'Gepauzeerd',
    hidden: 'Verborgen',
    draft: 'Concept',
    not_created: 'Nog niet aangemaakt',
    in_progress: 'Bezig'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusLabel(s) {
    return STATUS_LABELS[s] || s || '—';
  }

  function parsePartnerFromPath() {
    var m = location.pathname.match(/\/professionals\/control\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }

  function setListUrl() {
    if (location.pathname !== '/professionals/control') {
      history.replaceState({}, '', '/professionals/control');
    }
  }

  function setReviewUrl(partnerId) {
    var next = '/professionals/control/' + partnerId;
    if (location.pathname !== next) {
      history.pushState({ partnerId: partnerId }, '', next);
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
    EP.showEl(EP.$('#ctrlReviewView'), false);
  }

  function renderFilters() {
    var root = EP.$('#ctrlFilters');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-filter]'), function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === state.filter);
    });
  }

  function renderList(items) {
    var host = EP.$('#ctrlList');
    var meta = EP.$('#ctrlListMeta');
    if (!host) return;
    meta.textContent = (items.length === 1 ? '1 partner' : items.length + ' partners');
    if (!items.length) {
      host.innerHTML = '<p class="lab-hint">Geen partners in deze filter.</p>';
      return;
    }
    host.innerHTML = items.map(function (row) {
      return (
        '<article class="ctrl-list-item" role="listitem">' +
          '<div class="ctrl-list-item-main">' +
            '<strong>' + esc(row.displayName || row.legalName) + '</strong>' +
            '<span class="ctrl-list-meta-line">' + esc(row.legalName || '') + '</span>' +
            '<span class="ctrl-list-meta-line">' +
              esc(statusLabel(row.onboardingStatus)) + ' · ' + esc(statusLabel(row.profileStatus)) +
            '</span>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-open-partner="' + esc(row.partnerId) + '">Openen</button>' +
        '</article>'
      );
    }).join('');
  }

  async function loadList() {
    renderFilters();
    setActionStatus('', null);
    var isAutopilot = state.filter === 'autopilot_review' || state.filter === 'autopilot_ready';
    var action = isAutopilot ? 'autopilot-queue' : 'list';
    var query = isAutopilot
      ? { filter: state.filter === 'autopilot_ready' ? 'ready_for_review' : 'review_required' }
      : { filter: state.filter };
    var res = await EP.controlFetch(action, {
      method: 'GET',
      query: query
    });
    if (!res.ok) {
      showGate((res.body && res.body.message) || 'Lijst laden mislukt.', 'error');
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), true);
    EP.showEl(EP.$('#ctrlReviewView'), false);
    state.partnerId = null;
    state.review = null;
    setListUrl();
    if (isAutopilot) {
      renderAutopilotList(res.body.items || []);
    } else {
      renderList(res.body.items || []);
    }
  }

  function renderAutopilotList(items) {
    var host = EP.$('#ctrlList');
    var meta = EP.$('#ctrlListMeta');
    if (!host) return;
    meta.textContent = (items.length === 1 ? '1 item' : items.length + ' items');
    if (!items.length) {
      host.innerHTML = '<p class="lab-hint">Geen partners in deze filter.</p>';
      return;
    }
    host.innerHTML = items.map(function (row) {
      var openId = row.partnerId || row.id;
      return (
        '<article class="ctrl-list-item" role="listitem">' +
          '<div class="ctrl-list-item-main">' +
            '<strong>' + esc(row.company || '—') + '</strong>' +
            '<span class="ctrl-list-meta-line">' + esc(row.category || '') + ' · ' + esc(row.region || '') + '</span>' +
            '<span class="ctrl-list-meta-line">' + esc(row.status || '') +
              (row.issueReason ? ' — ' + esc(row.issueReason) : '') + '</span>' +
          '</div>' +
          (row.kind === 'partner'
            ? '<button type="button" class="btn btn-primary btn-sm" data-open-partner="' + esc(openId) + '">Bekijk</button>'
            : '<span class="ctrl-badge is-muted">Kandidaat</span>') +
        '</article>'
      );
    }).join('');
  }

  function renderBadges(review) {
    var host = EP.$('#ctrlBadges');
    if (!host) return;
    host.innerHTML =
      '<span class="ctrl-badge">' + esc(statusLabel(review.onboarding.onboardingStatus)) + '</span>' +
      '<span class="ctrl-badge">' + esc(statusLabel(review.profile.profileStatus)) + '</span>' +
      (review.profile.slug
        ? '<span class="ctrl-badge is-muted">/' + esc(review.profile.slug) + '</span>'
        : '');
  }

  function renderSections(sections) {
    var host = EP.$('#ctrlSections');
    if (!host) return;
    host.innerHTML = (sections || []).map(function (sec) {
      return (
        '<section class="ctrl-section">' +
          '<div class="ctrl-section-head">' +
            '<h3 class="ctrl-section-title">' + esc(sec.title) + '</h3>' +
            '<span class="ctrl-pill ' + (sec.ok ? 'is-ok' : 'is-warn') + '">' +
              (sec.ok ? 'Compleet' : 'Aandacht') +
            '</span>' +
          '</div>' +
          '<ul class="ctrl-lines">' +
            (sec.lines || []).map(function (l) {
              return '<li>' + esc(l) + '</li>';
            }).join('') +
          '</ul>' +
        '</section>'
      );
    }).join('');
  }

  function renderPreview(preview) {
    var host = EP.$('#ctrlPreview');
    if (!host || !preview) {
      if (host) host.innerHTML = '';
      return;
    }
    var img = preview.image
      ? '<img class="ctrl-preview-img" data-src="' + esc(preview.image) + '" alt="">'
      : '<div class="ctrl-preview-img is-empty" aria-hidden="true"></div>';
    host.innerHTML =
      '<article class="ctrl-preview-card">' +
        img +
        '<div class="ctrl-preview-body">' +
          '<p class="ctrl-preview-cat">' + esc(preview.categoryLabel || '') + '</p>' +
          '<h4>' + esc(preview.name || '') + '</h4>' +
          '<p>' + esc(preview.specialtyLine || preview.strength || '') + '</p>' +
          '<p class="ctrl-preview-meta">' +
            esc([preview.city, preview.area].filter(Boolean).join(' · ')) +
          '</p>' +
          (preview.services && preview.services.length
            ? '<ul class="ctrl-preview-services">' +
              preview.services.slice(0, 4).map(function (s) {
                var price =
                  s.pricingModel === 'on_request'
                    ? 'op aanvraag'
                    : s.minPrice != null
                      ? 'vanaf €' + s.minPrice
                      : '';
                return '<li>' + esc(s.label) + (price ? ' · ' + esc(price) : '') + '</li>';
              }).join('') +
              '</ul>'
            : '') +
        '</div>' +
      '</article>';

    var imgEl = host.querySelector('img[data-src]');
    if (imgEl && EP.resolveMediaUrl) {
      var raw = imgEl.getAttribute('data-src');
      EP.resolveMediaUrl(raw).then(function (resolved) {
        if (resolved) imgEl.src = resolved;
      });
    }
  }

  function renderReviewItems(items) {
    var host = EP.$('#ctrlReviewItems');
    if (!host) return;
    if (!items || !items.length) {
      host.innerHTML = '<p class="lab-hint">Geen aanpassingspunten.</p>';
      return;
    }
    host.innerHTML = items.map(function (it) {
      return (
        '<div class="ctrl-ri ' + (it.status === 'open' ? 'is-open' : 'is-resolved') + '">' +
          '<div class="ctrl-ri-top">' +
            '<strong>' + (it.status === 'open' ? 'Open' : 'Opgelost') + '</strong>' +
            (it.stepId ? '<span>' + esc(it.stepId.replace(/_/g, ' ')) + '</span>' : '') +
          '</div>' +
          '<p>' + esc(it.message) + '</p>' +
        '</div>'
      );
    }).join('');
  }

  function renderActions(review) {
    var host = EP.$('#ctrlActions');
    var hint = EP.$('#ctrlActionHint');
    var a = review.actions || {};
    var bits = [];
    if (a.canRequestChanges) {
      bits.push('<button type="button" class="btn btn-ghost" data-act="show-changes">Wijzigingen vragen</button>');
    }
    if (a.canApprove) {
      bits.push('<button type="button" class="btn btn-primary" data-act="approve">Goedkeuren</button>');
    }
    if (a.canPublish) {
      bits.push('<button type="button" class="btn btn-primary" data-act="publish">Publiceren</button>');
    }
    if (a.canPause) {
      bits.push('<button type="button" class="btn btn-ghost" data-act="pause">Pauzeren</button>');
    }
    if (a.canHide) {
      bits.push('<button type="button" class="btn btn-ghost" data-act="hide">Verbergen</button>');
    }
    if (a.canRestore) {
      bits.push('<button type="button" class="btn btn-primary" data-act="restore">Herstellen</button>');
    }
    host.innerHTML = bits.length ? bits.join('') : '<p class="lab-hint">Geen acties voor deze status.</p>';

    var o = review.onboarding.onboardingStatus;
    var p = review.profile.profileStatus;
    if (o === 'submitted') {
      hint.textContent = 'Beoordeel het dossier. Vraag wijzigingen of keur goed. Publiceren volgt pas na goedkeuring.';
    } else if (o === 'changes_requested') {
      hint.textContent = 'Wacht op correctie door de partner, of voeg extra feedback toe.';
    } else if (p === 'ready') {
      hint.textContent = 'Goedgekeurd en klaar. Publiceren maakt een vaste slug en marketplace-snapshot.';
    } else if (p === 'published') {
      hint.textContent = 'Live. Je kunt pauzeren of verbergen.';
    } else if (p === 'paused' || p === 'hidden') {
      hint.textContent = 'Niet zichtbaar. Herstel om opnieuw te publiceren.';
    } else {
      hint.textContent = '';
    }
  }

  function renderChangeItems() {
    var host = EP.$('#ctrlChangeItems');
    if (!host) return;
    host.innerHTML = state.changeItems.map(function (item, idx) {
      var opts = STEP_OPTIONS.map(function (s) {
        return '<option value="' + s.id + '"' + (item.stepId === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
      }).join('');
      return (
        '<div class="ctrl-change-item" data-idx="' + idx + '">' +
          '<label class="lab-field">Onderdeel<select data-ci="stepId">' + opts + '</select></label>' +
          '<label class="lab-field">Veld (optioneel)<input data-ci="fieldKey" type="text" maxlength="120" value="' + esc(item.fieldKey || '') + '" placeholder="bijv. kbo"></label>' +
          '<label class="lab-field">Feedback<textarea data-ci="message" rows="3" maxlength="2000" required>' + esc(item.message || '') + '</textarea></label>' +
          (state.changeItems.length > 1
            ? '<button type="button" class="btn btn-ghost btn-sm" data-remove-ci="' + idx + '">Verwijderen</button>'
            : '') +
        '</div>'
      );
    }).join('');
  }

  function syncChangeItemsFromDom() {
    var host = EP.$('#ctrlChangeItems');
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('.ctrl-change-item'), function (el, idx) {
      if (!state.changeItems[idx]) return;
      var step = el.querySelector('[data-ci="stepId"]');
      var field = el.querySelector('[data-ci="fieldKey"]');
      var msg = el.querySelector('[data-ci="message"]');
      state.changeItems[idx] = {
        stepId: step ? step.value : 'bedrijf_bereik',
        fieldKey: field ? field.value.trim() : '',
        message: msg ? msg.value.trim() : ''
      };
    });
  }

  function paintReview(review) {
    state.review = review;
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlListView'), false);
    EP.showEl(EP.$('#ctrlReviewView'), true);
    EP.$('#ctrlReviewName').textContent = review.partner.displayName || review.partner.legalName;
    EP.$('#ctrlReviewSub').textContent = review.partner.legalName || '';
    renderBadges(review);
    renderSections(review.sections);
    renderPreview(review.marketplacePreview);
    renderReviewItems(review.reviewItems);
    renderActions(review);
    EP.showEl(EP.$('#ctrlChangesPanel'), false);
  }

  async function loadReview(partnerId) {
    state.partnerId = partnerId;
    setReviewUrl(partnerId);
    setActionStatus('Laden…', 'info');
    var res = await EP.controlFetch('review', {
      method: 'GET',
      query: { partnerId: partnerId }
    });
    if (!res.ok) {
      setActionStatus((res.body && res.body.message) || 'Kon beoordeling niet laden.', 'error');
      showGate((res.body && res.body.message) || 'Partner niet gevonden.', 'error');
      return;
    }
    paintReview(res.body);
    setActionStatus('', null);
  }

  async function runAction(act) {
    if (state.busy || !state.partnerId) return;
    var titles = {
      approve: ['Profiel goedkeuren?', 'Onboarding wordt goedgekeurd. Publiceren gebeurt apart.'],
      publish: ['Profiel publiceren?', 'Er wordt een vaste slug en marketplace-snapshot aangemaakt.'],
      pause: ['Publicatie pauzeren?', 'Het profiel verdwijnt tijdelijk uit de marketplace.'],
      hide: ['Profiel verbergen?', 'Het profiel wordt verborgen tot je het herstelt.'],
      restore: ['Profiel herstellen?', 'Het profiel wordt opnieuw gepubliceerd.']
    };
    if (titles[act]) {
      var ok = await confirmAction(titles[act][0], titles[act][1]);
      if (!ok) return;
    }
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    var res = await EP.controlFetch(act, {
      method: 'POST',
      body: { partnerId: state.partnerId }
    });
    state.busy = false;
    if (!res.ok) {
      setActionStatus((res.body && res.body.message) || 'Actie mislukt.', 'error');
      return;
    }
    paintReview(res.body);
    setActionStatus('Opgeslagen.', 'ok');
  }

  async function submitChanges() {
    if (state.busy || !state.partnerId) return;
    syncChangeItemsFromDom();
    var items = state.changeItems
      .map(function (it) {
        return {
          stepId: it.stepId,
          fieldKey: it.fieldKey || null,
          message: (it.message || '').trim()
        };
      })
      .filter(function (it) { return it.message.length >= 3; });
    if (!items.length) {
      setActionStatus('Voeg minstens één feedbacktekst toe.', 'error');
      return;
    }
    var ok = await confirmAction(
      'Wijzigingen vragen?',
      'De partner krijgt ' + items.length + ' aanpassingspunt' + (items.length === 1 ? '' : 'en') + ' en moet opnieuw indienen.'
    );
    if (!ok) return;
    state.busy = true;
    setActionStatus('Bezig…', 'info');
    var res = await EP.controlFetch('request-changes', {
      method: 'POST',
      body: { partnerId: state.partnerId, items: items }
    });
    state.busy = false;
    if (!res.ok) {
      setActionStatus((res.body && res.body.message) || 'Kon wijzigingen niet vragen.', 'error');
      return;
    }
    state.changeItems = [{ stepId: 'bedrijf_bereik', fieldKey: '', message: '' }];
    paintReview(res.body);
    setActionStatus('Wijzigingen gevraagd.', 'ok');
  }

  function bind() {
    var filters = EP.$('#ctrlFilters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]');
        if (!btn) return;
        state.filter = btn.getAttribute('data-filter');
        loadList();
      });
    }

    var list = EP.$('#ctrlList');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-open-partner]');
        if (!btn) return;
        loadReview(btn.getAttribute('data-open-partner'));
      });
    }

    var back = EP.$('#ctrlBackList');
    if (back) back.addEventListener('click', function () { loadList(); });

    var actions = EP.$('#ctrlActions');
    if (actions) {
      actions.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'show-changes') {
          EP.showEl(EP.$('#ctrlChangesPanel'), true);
          renderChangeItems();
          return;
        }
        runAction(act);
      });
    }

    var addCi = EP.$('#ctrlAddChangeItem');
    if (addCi) {
      addCi.addEventListener('click', function () {
        syncChangeItemsFromDom();
        state.changeItems.push({ stepId: 'bedrijf_bereik', fieldKey: '', message: '' });
        renderChangeItems();
      });
    }

    var changeHost = EP.$('#ctrlChangeItems');
    if (changeHost) {
      changeHost.addEventListener('click', function (e) {
        var rm = e.target.closest('[data-remove-ci]');
        if (!rm) return;
        syncChangeItemsFromDom();
        var idx = Number(rm.getAttribute('data-remove-ci'));
        state.changeItems.splice(idx, 1);
        if (!state.changeItems.length) {
          state.changeItems.push({ stepId: 'bedrijf_bereik', fieldKey: '', message: '' });
        }
        renderChangeItems();
      });
    }

    var submitChangesBtn = EP.$('#ctrlSubmitChanges');
    if (submitChangesBtn) submitChangesBtn.addEventListener('click', submitChanges);

    var logout = EP.$('#ctrlLogout');
    if (logout) logout.addEventListener('click', function () { EP.logout(); });

    window.addEventListener('popstate', function () {
      var pid = parsePartnerFromPath();
      if (pid) loadReview(pid);
      else loadList();
    });
  }

  async function boot() {
    bind();
    var session = await EP.requireStaffOrRedirect();
    if (!session) return;
    if (session.notStaff) {
      showGate('Je hebt geen toegang tot ELYAN Control.', 'error');
      return;
    }
    var userEl = EP.$('#ctrlUser');
    if (userEl && session.user) {
      userEl.textContent = session.user.email || '';
      userEl.hidden = false;
    }
    var pid = parsePartnerFromPath();
    if (pid) await loadReview(pid);
    else await loadList();
  }

  boot();
})();
