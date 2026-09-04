/* ELYAN Control: Home / Overzicht (operations attention) */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var BUCKET_LABELS = {
    new_needing_first_contact: 'Nieuw: eerste contact',
    sla_approaching: 'SLA nadert',
    sla_overdue: 'SLA overschreden',
    follow_up_overdue: 'Opvolging achterstallig',
    unassigned_active: 'Actief zonder eigenaar'
  };

  var BUCKET_ORDER = [
    'sla_overdue',
    'follow_up_overdue',
    'sla_approaching',
    'new_needing_first_contact',
    'unassigned_active'
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function uiText(s) {
    return String(s == null ? '' : s).replace(/\u2014/g, ' · ');
  }

  function showGate(msg, kind) {
    var el = EP.$('#ctrlGate');
    EP.setStatus(el, msg, kind || 'info');
    EP.showEl(EP.$('#ctrlHome'), false);
  }

  function requestHref(id) {
    return '/professionals/aanvragen/' + encodeURIComponent(id);
  }

  function renderAttentionSummary(opsPayload, queuePayload) {
    var host = EP.$('#ctrlAttentionSummary');
    if (!host) return;

    var opsTotals = (opsPayload && opsPayload.totals) || {};
    var queueCounts = (queuePayload && queuePayload.counts) || {};

    var partnerReview = queueCounts.review_required || 0;
    var partnerReady = queueCounts.ready_for_review || 0;
    var newRequests = opsTotals.new_needing_first_contact || 0;
    var slaOverdue = opsTotals.sla_overdue || 0;
    var followUpOverdue = opsTotals.follow_up_overdue || 0;

    var items = [];
    if (partnerReview > 0) {
      items.push({
        href: '/professionals/control?filter=autopilot_review',
        text: partnerReview === 1
          ? '1 partner wacht op controle'
          : partnerReview + ' partners wachten op controle'
      });
    }
    if (partnerReady > 0) {
      items.push({
        href: '/professionals/control?filter=autopilot_ready',
        text: partnerReady === 1
          ? '1 profiel klaar voor publicatie'
          : partnerReady + ' profielen klaar voor publicatie'
      });
    }
    if (newRequests > 0) {
      items.push({
        href: '/professionals/aanvragen?status=new',
        text: newRequests === 1 ? '1 nieuwe aanvraag' : newRequests + ' nieuwe aanvragen'
      });
    }
    if (slaOverdue > 0) {
      items.push({
        href: '/professionals/aanvragen?attention=1',
        text: slaOverdue === 1
          ? '1 aanvraag: SLA overschreden'
          : slaOverdue + ' aanvragen: SLA overschreden'
      });
    }
    if (followUpOverdue > 0) {
      items.push({
        href: '/professionals/aanvragen?followUp=overdue',
        text: followUpOverdue === 1
          ? '1 aanvraag: opvolging achterstallig'
          : followUpOverdue + ' aanvragen: opvolging achterstallig'
      });
    }

    if (!items.length) {
      host.innerHTML =
        '<div class="ctrl-attention-clear">' +
        '<p><strong>Alles bijgewerkt.</strong></p>' +
        '<p class="lab-hint">Er zijn momenteel geen openstaande acties.</p>' +
        '</div>';
      return;
    }

    host.innerHTML =
      '<ul class="ctrl-attention-links">' +
      items.map(function (item) {
        return '<li><a href="' + esc(item.href) + '">' + esc(item.text) + ' →</a></li>';
      }).join('') +
      '</ul>';
  }

  function renderBuckets(payload) {
    var host = EP.$('#ctrlOpsBuckets');
    if (!host) return;
    var totals = (payload && payload.totals) || {};
    var buckets = (payload && payload.buckets) || {};
    var html = '';

    BUCKET_ORDER.forEach(function (key) {
      var items = buckets[key] || [];
      var total = totals[key] != null ? totals[key] : items.length;
      html +=
        '<div class="ctrl-ops-bucket">' +
        '<div class="ctrl-ops-bucket-head">' +
        '<h3 class="ctrl-ops-bucket-title">' +
        esc(BUCKET_LABELS[key] || key) +
        '</h3>' +
        '<span class="ctrl-badge' +
        (total > 0 ? ' ctrl-badge-attention' : ' is-muted') +
        '">' +
        esc(String(total)) +
        '</span>' +
        '</div>';

      if (!items.length) {
        html += '<p class="lab-hint">Geen items.</p>';
      } else {
        html += '<ul class="ctrl-ops-list">';
        items.forEach(function (row) {
          html +=
            '<li>' +
            '<a href="' +
            esc(requestHref(row.id)) +
            '">' +
            '<span class="ctrl-ops-name">' +
            esc(row.customerName || '-') +
            '</span>' +
            '<span class="ctrl-ops-meta">' +
            esc(row.partnerSlug || '-') +
            ' · ' +
            esc(uiText(row.statusLabel || row.status)) +
            ' · ' +
            esc(row.ageLabel || '-') +
            '</span>' +
            '</a>' +
            '</li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });

    if (totals.capped) {
      html +=
        '<p class="lab-hint">Scan begrensd tot recente actieve aanvragen. Totalen kunnen onvolledig zijn.</p>';
    }

    host.innerHTML = html;
  }

  async function load() {
    showGate('Laden…', 'info');
    var opsRes = await EP.controlFetch('ops-attention');
    var queueRes = await EP.controlFetch('autopilot-queue', { query: { filter: 'all' } });
    if (!opsRes.ok) {
      showGate(
        opsRes.status === 403
          ? 'Geen toegang (alleen ELYAN-staff).'
          : 'Kon overzicht niet laden.',
        'error'
      );
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlHome'), true);
    renderAttentionSummary(opsRes.body, queueRes.ok ? queueRes.body : null);
    renderBuckets(opsRes.body);
  }

  async function init() {
    var session = await EP.requireStaffOrRedirect();
    if (!session) return;
    if (session.notStaff) {
      showGate('Geen toegang: alleen ELYAN-staff.', 'error');
      return;
    }
    var userEl = EP.$('#ctrlUser');
    if (userEl && session.user) {
      userEl.hidden = false;
      userEl.textContent = session.user.email || session.user.id || '';
    }
    var logout = EP.$('#ctrlLogout');
    if (logout) logout.addEventListener('click', function () {
      EP.logout();
    });
    await load();
  }

  init();
})();
