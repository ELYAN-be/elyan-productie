/* ELYAN Control — Home / Overzicht (operations attention) */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var BUCKET_LABELS = {
    new_needing_first_contact: 'Nieuw — eerste contact',
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

  function showGate(msg, kind) {
    var el = EP.$('#ctrlGate');
    EP.setStatus(el, msg, kind || 'info');
    EP.showEl(EP.$('#ctrlHome'), false);
  }

  function requestHref(id) {
    return '/professionals/aanvragen/' + encodeURIComponent(id);
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
        html += '<p class="lab-hint">Geen items in scan.</p>';
      } else {
        html += '<ul class="ctrl-ops-list">';
        items.forEach(function (row) {
          html +=
            '<li>' +
            '<a href="' +
            esc(requestHref(row.id)) +
            '">' +
            '<span class="ctrl-ops-name">' +
            esc(row.customerName || '—') +
            '</span>' +
            '<span class="ctrl-ops-meta">' +
            esc(row.partnerSlug || '') +
            ' · ' +
            esc(row.statusLabel || row.status) +
            ' · ' +
            esc(row.ageLabel || '') +
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
        '<p class="lab-hint">Scan begrensd tot recente actieve aanvragen — totalen kunnen onvolledig zijn.</p>';
    }

    host.innerHTML = html;
  }

  async function load() {
    showGate('Laden…', 'info');
    var res = await EP.controlFetch('ops-attention');
    if (!res.ok) {
      showGate(
        res.status === 403
          ? 'Geen toegang (alleen ELYAN-staff).'
          : 'Kon aandachtlijst niet laden.',
        'error'
      );
      return;
    }
    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlHome'), true);
    renderBuckets(res.body);
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
