/* ELYAN Control: Reporting V1 */
(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  if (!EP) return;

  var state = {
    period: '30',
    createdFrom: '',
    createdTo: '',
    categoryId: '',
    partnerSlug: ''
  };

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
    EP.showEl(EP.$('#ctrlReportView'), false);
  }

  function setReportStatus(msg, kind) {
    EP.setStatus(EP.$('#ctrlReportStatus'), msg, kind);
  }

  function metricRow(label, value, hint) {
    return (
      '<div class="ctrl-report-row">' +
      '<div class="ctrl-report-row-main">' +
      '<span class="ctrl-report-label">' +
      esc(label) +
      '</span>' +
      (hint ? '<span class="ctrl-report-hint">' + esc(hint) + '</span>' : '') +
      '</div>' +
      '<span class="ctrl-report-value">' +
      esc(value) +
      '</span>' +
      '</div>'
    );
  }

  var DEF_LABELS = {
    received: 'Ontvangen',
    contacted: 'Contact opgenomen',
    qualified: 'Gekwalificeerd',
    successful_introduction: 'Succesvolle introductie',
    open: 'Open (actief)',
    new_count: 'Nieuw',
    attention: 'Aandacht nodig',
    overdue_follow_ups: 'Opvolging achterstallig',
    unassigned_active: 'Actief zonder eigenaar',
    avg_time_to_first_contact_ms: 'Gem. tijd tot first contact',
    pct_first_contact_within_sla: '% first contact binnen SLA',
    loss_share: 'Verliesredenen',
    by_category: 'Per categorie',
    by_professional: 'Per vakbedrijf',
    by_region: 'Per regio',
    marketplace_analytics: 'Marketplace-analytics'
  };

  function periodLabel(key) {
    if (key === '7') return '7 dagen';
    if (key === '30') return '30 dagen';
    if (key === '90') return '90 dagen';
    if (key === 'custom') return 'Aangepast';
    return key || '-';
  }

  function rateLabel(r) {
    if (!r || r.value == null) return 'Niet beschikbaar';
    return r.label + ' (' + r.numerator + '/' + r.denominator + ')';
  }

  function syncCustomVisibility() {
    var custom = state.period === 'custom';
    EP.showEl(EP.$('#ctrlCustomFromWrap'), custom);
    EP.showEl(EP.$('#ctrlCustomToWrap'), custom);
  }

  function readFilters() {
    var periodEl = EP.$('#ctrlPeriod');
    state.period = periodEl ? periodEl.value : '30';
    state.createdFrom = EP.$('#ctrlCreatedFrom') ? EP.$('#ctrlCreatedFrom').value : '';
    state.createdTo = EP.$('#ctrlCreatedTo') ? EP.$('#ctrlCreatedTo').value : '';
    state.categoryId = EP.$('#ctrlFilterCategory')
      ? EP.$('#ctrlFilterCategory').value.trim()
      : '';
    state.partnerSlug = EP.$('#ctrlFilterPartner')
      ? EP.$('#ctrlFilterPartner').value.trim()
      : '';
    syncCustomVisibility();
  }

  function render(report) {
    var meta = EP.$('#ctrlReportMeta');
    if (meta) {
      meta.textContent =
        'Periode: ' +
        periodLabel(report.period && report.period.key) +
        (report.capped ? ' · scan begrensd' : '');
    }

    var funnelHost = EP.$('#ctrlFunnel');
    if (report.funnel && report.funnel.empty) {
      funnelHost.innerHTML =
        '<p class="lab-hint">Geen aanvragen in deze periode of filters. Geen percentages.</p>';
    } else {
      funnelHost.innerHTML = (report.funnel.stages || [])
        .map(function (s) {
          return metricRow(
            s.label,
            s.count + (s.rate && s.rate.value != null ? ' · ' + rateLabel(s.rate) : ''),
            s.note || null
          );
        })
        .join('');
    }

    var ops = report.operations || {};
    EP.$('#ctrlOpsMetrics').innerHTML = [
      metricRow('Open (actief)', String(ops.open != null ? ops.open : 'Niet beschikbaar')),
      metricRow('Nieuw', String(ops.new != null ? ops.new : 'Niet beschikbaar')),
      metricRow('Aandacht', String(ops.attention != null ? ops.attention : 'Niet beschikbaar')),
      metricRow(
        'Opvolging achterstallig',
        String(ops.overdueFollowUps != null ? ops.overdueFollowUps : 'Niet beschikbaar')
      ),
      metricRow(
        'Actief zonder eigenaar',
        String(ops.unassignedActive != null ? ops.unassignedActive : 'Niet beschikbaar')
      ),
      metricRow(
        'Gem. tijd tot first contact',
        ops.avgTimeToFirstContactLabel || 'Niet beschikbaar'
      ),
      metricRow(
        '% first contact binnen SLA',
        rateLabel(ops.pctFirstContactWithinSla)
      )
    ].join('');

    var loss = report.loss || {};
    if (!loss.closedLostTotal) {
      EP.$('#ctrlLoss').innerHTML =
        '<p class="lab-hint">Geen afgesloten aanvragen in deze selectie.</p>';
    } else {
      EP.$('#ctrlLoss').innerHTML =
        metricRow('Totaal verloren', String(loss.closedLostTotal)) +
        (loss.items || [])
          .map(function (it) {
            return metricRow(it.label, it.count + ' · ' + rateLabel(it.share));
          })
          .join('') +
        '<p class="lab-hint">' +
        esc(loss.otherDetailNote || '') +
        '</p>';
    }

    var supply = report.supply || {};
    var supplyHtml = '';
    if (supply.byRegion && supply.byRegion.available === false) {
      supplyHtml += metricRow('Per regio', 'Niet beschikbaar', supply.byRegion.reason);
    }
    if (report.marketplaceAnalytics && report.marketplaceAnalytics.available === false) {
      supplyHtml += metricRow(
        'Marketplace analytics (CTR / zero-result / conversie)',
        'Niet beschikbaar',
        report.marketplaceAnalytics.reason
      );
    }
    var cats = supply.byCategory || [];
    if (!cats.length) {
      supplyHtml += '<p class="lab-hint">Geen categoriedata in selectie.</p>';
    } else {
      supplyHtml += '<p class="ctrl-report-subhead">Per categorie</p>';
      cats.slice(0, 20).forEach(function (c) {
        supplyHtml += metricRow(c.categoryId, String(c.count));
      });
    }
    EP.$('#ctrlSupply').innerHTML = supplyHtml;

    var pros = (report.professionalIntelligence && report.professionalIntelligence.items) || [];
    if (!pros.length) {
      EP.$('#ctrlPros').innerHTML = '<p class="lab-hint">Geen professional-data in selectie.</p>';
    } else {
      EP.$('#ctrlPros').innerHTML = pros
        .slice(0, 25)
        .map(function (p) {
          return metricRow(
            p.partnerSlug || p.partnerId || '-',
            'ontvangen ' +
              p.received +
              ' · gekwalificeerd ' +
              p.qualified +
              ' · intro ' +
              p.successfulIntroduction +
              ' · verloren ' +
              p.closedLost
          );
        })
        .join('');
    }

    var defs = report.definitions || {};
    EP.$('#ctrlDefs').innerHTML = Object.keys(defs)
      .map(function (k) {
        return (
          '<div class="ctrl-report-def"><strong>' +
          esc(DEF_LABELS[k] || k) +
          '</strong><p>' +
          esc(defs[k]) +
          '</p></div>'
        );
      })
      .join('');
  }

  async function load() {
    readFilters();
    if (state.period === 'custom' && (!state.createdFrom || !state.createdTo)) {
      setReportStatus('Kies een van- en tot-datum voor aangepaste periode.', 'error');
      return;
    }
    setReportStatus('Laden…', 'info');
    var query = {
      period: state.period
    };
    if (state.period === 'custom') {
      query.createdFrom = state.createdFrom;
      query.createdTo = state.createdTo;
    }
    if (state.categoryId) query.categoryId = state.categoryId;
    if (state.partnerSlug) query.partnerSlug = state.partnerSlug;

    var res = await EP.controlFetch('reporting', { query: query });
    if (!res.ok) {
      setReportStatus(
        res.status === 403 ? 'Geen toegang.' : 'Rapportage kon niet geladen worden.',
        'error'
      );
      return;
    }
    EP.setStatus(EP.$('#ctrlReportStatus'), '', null);
    EP.showEl(EP.$('#ctrlReportStatus'), false);
    render(res.body.report || res.body);
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
      userEl.textContent = session.user.email || '';
    }
    var logout = EP.$('#ctrlLogout');
    if (logout) logout.addEventListener('click', function () {
      EP.logout();
    });

    EP.showEl(EP.$('#ctrlGate'), false);
    EP.showEl(EP.$('#ctrlReportView'), true);

    var periodEl = EP.$('#ctrlPeriod');
    if (periodEl) {
      periodEl.addEventListener('change', function () {
        readFilters();
      });
    }
    var apply = EP.$('#ctrlApplyFilters');
    if (apply) apply.addEventListener('click', load);

    await load();
  }

  init();
})();
