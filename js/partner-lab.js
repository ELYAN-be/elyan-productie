/* ============================================================
   ELYAN Partner Lab: client-side demo state only
   ============================================================ */
(function () {
  'use strict';

  var state = {
    status: 'Te beoordelen',
    publicVisible: false,
    prices: [
      {
        specialty: 'Dakrenovatie',
        type: 'range_m2',
        min: '160',
        max: '230',
        materialIncluded: 'ja',
        vat: 'excl. btw',
        note: 'Hellende daken, standaard pannen'
      },
      {
        specialty: 'Platte daken',
        type: 'from',
        min: '8500',
        max: '',
        materialIncluded: 'ja',
        vat: 'excl. btw',
        note: 'Vanaf-prijs kleinere platte daken'
      },
      {
        specialty: 'Dakisolatie',
        type: 'm2',
        min: '45',
        max: '75',
        materialIncluded: 'ja',
        vat: 'excl. btw',
        note: 'Afhankelijk van Rd-waarde'
      },
      {
        specialty: 'Meerwerk',
        type: 'hourly',
        min: '62',
        max: '',
        materialIncluded: 'nee',
        vat: 'excl. btw',
        note: 'Uurprijs + eventuele verplaatsing'
      }
    ],
    photos: [
      { id: 1, title: 'Hellend dak Berchem (demo)', status: 'goedgekeurd' },
      { id: 2, title: 'Plat dak Wilrijk (demo)', status: 'ter beoordeling' },
      { id: 3, title: 'Dakisolatie detail (demo)', status: 'concept' }
    ],
    requests: [
      {
        id: 'r1',
        title: 'Dakrenovatie · Antwerpen · 110 m²',
        date: '11 aug 2026',
        type: 'Dakrenovatie',
        location: 'Antwerpen',
        budget: '€ 18.000 – € 24.000 (indicatief)',
        timing: 'Najaar 2026',
        status: 'nieuw'
      },
      {
        id: 'r2',
        title: 'Plat dak · Berchem · 65 m²',
        date: '10 aug 2026',
        type: 'Plat dak',
        location: 'Berchem',
        budget: 'niet opgegeven',
        timing: 'Oktober 2026',
        status: 'interessant'
      },
      {
        id: 'r3',
        title: 'Dakisolatie · Schoten · zoldervloer',
        date: '8 aug 2026',
        type: 'Dakisolatie',
        location: 'Schoten',
        budget: '€ 4.500 – € 7.000 (indicatief)',
        timing: 'Flexibel',
        status: 'niet_passend'
      }
    ]
  };

  var priceTypeLabels = {
    m2: '€/m²',
    range_m2: 'Prijsrange €/m²',
    from: 'Vanaf-prijs',
    minimum: 'Minimum projectbedrag',
    hourly: 'Uurprijs'
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function setView(name) {
    $all('.lab-view').forEach(function (el) {
      var active = el.getAttribute('data-view') === name;
      el.classList.toggle('is-active', active);
      el.hidden = !active;
    });
    $all('.lab-tab').forEach(function (btn) {
      var active = btn.getAttribute('data-lab-view') === name;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    window.scrollTo(0, 0);
  }

  function setPartnerPanel(name) {
    $all('[data-partner-panel-view]').forEach(function (el) {
      var active = el.getAttribute('data-partner-panel-view') === name;
      el.classList.toggle('is-active', active);
      el.hidden = !active;
    });
    $all('.lab-dash-link').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-partner-panel') === name);
    });
  }

  function formatPrice(p) {
    if (p.type === 'range_m2') return '€ ' + p.min + ' – € ' + p.max + ' / m²';
    if (p.type === 'm2') return '€ ' + p.min + (p.max ? ' – € ' + p.max : '') + ' / m²';
    if (p.type === 'from') return 'vanaf € ' + Number(p.min).toLocaleString('nl-BE');
    if (p.type === 'minimum') return 'min. € ' + Number(p.min).toLocaleString('nl-BE');
    if (p.type === 'hourly') return '€ ' + p.min + ' / uur';
    return p.min;
  }

  function renderPriceEditor() {
    var host = $('#priceEditor');
    if (!host) return;
    host.innerHTML = state.prices.map(function (p, idx) {
      return (
        '<article class="lab-price-edit-card" data-price-idx="' + idx + '">' +
          '<h3>' + p.specialty + '</h3>' +
          '<div class="lab-price-edit-grid">' +
            '<label>Type prijs<select data-field="type">' +
              Object.keys(priceTypeLabels).map(function (k) {
                return '<option value="' + k + '"' + (p.type === k ? ' selected' : '') + '>' + priceTypeLabels[k] + '</option>';
              }).join('') +
            '</select></label>' +
            '<label>Minimum / basis<input data-field="min" type="text" value="' + p.min + '"></label>' +
            '<label>Maximum<input data-field="max" type="text" value="' + (p.max || '') + '" placeholder="optioneel"></label>' +
            '<label>Materiaal inbegrepen<select data-field="materialIncluded">' +
              '<option value="ja"' + (p.materialIncluded === 'ja' ? ' selected' : '') + '>Ja</option>' +
              '<option value="nee"' + (p.materialIncluded === 'nee' ? ' selected' : '') + '>Nee</option>' +
              '<option value="deels"' + (p.materialIncluded === 'deels' ? ' selected' : '') + '>Deels</option>' +
            '</select></label>' +
            '<label>Btw-basis<select data-field="vat">' +
              '<option' + (p.vat === 'excl. btw' ? ' selected' : '') + '>excl. btw</option>' +
              '<option' + (p.vat === 'incl. 6% btw' ? ' selected' : '') + '>incl. 6% btw</option>' +
              '<option' + (p.vat === 'incl. 21% btw' ? ' selected' : '') + '>incl. 21% btw</option>' +
            '</select></label>' +
            '<label class="lab-span-2">Opmerking<input data-field="note" type="text" value="' + (p.note || '') + '"></label>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function readPriceEditor() {
    $all('.lab-price-edit-card').forEach(function (card) {
      var idx = Number(card.getAttribute('data-price-idx'));
      if (!state.prices[idx]) return;
      $all('[data-field]', card).forEach(function (input) {
        state.prices[idx][input.getAttribute('data-field')] = input.value;
      });
    });
  }

  function renderPhotos() {
    var host = $('#photoManager');
    if (!host) return;
    host.innerHTML = state.photos.map(function (ph) {
      return (
        '<div class="lab-photo-row" data-photo-id="' + ph.id + '">' +
          '<div class="lab-photo-thumb" aria-hidden="true"></div>' +
          '<div><strong>' + ph.title + '</strong><span>Status: ' + ph.status + '</span></div>' +
          '<select data-photo-status>' +
            '<option value="concept"' + (ph.status === 'concept' ? ' selected' : '') + '>concept</option>' +
            '<option value="ter beoordeling"' + (ph.status === 'ter beoordeling' ? ' selected' : '') + '>ter beoordeling</option>' +
            '<option value="goedgekeurd"' + (ph.status === 'goedgekeurd' ? ' selected' : '') + '>goedgekeurd</option>' +
          '</select>' +
        '</div>'
      );
    }).join('');
  }

  function requestStatusLabel(s) {
    if (s === 'interessant') return 'Interessant';
    if (s === 'niet_passend') return 'Niet passend';
    if (s === 'bekeken') return 'Bekeken';
    return 'Nieuw';
  }

  function renderRequests(hostId, withActions) {
    var host = $('#' + hostId);
    if (!host) return;
    host.innerHTML = state.requests.map(function (r) {
      var actions = '';
      if (withActions) {
        actions =
          '<div class="lab-request-actions">' +
            '<button type="button" class="lab-chip' + (r.status === 'bekeken' ? ' is-active' : '') + '" data-req="' + r.id + '" data-set="bekeken">Bekijken</button>' +
            '<button type="button" class="lab-chip' + (r.status === 'interessant' ? ' is-active' : '') + '" data-req="' + r.id + '" data-set="interessant">Interessant</button>' +
            '<button type="button" class="lab-chip' + (r.status === 'niet_passend' ? ' is-active' : '') + '" data-req="' + r.id + '" data-set="niet_passend">Niet passend</button>' +
          '</div>';
      }
      return (
        '<article class="lab-request">' +
          '<h3>' + r.title + '</h3>' +
          '<div class="lab-request-meta">' +
            '<div>Datum: ' + r.date + '</div>' +
            '<div>Type: ' + r.type + '</div>' +
            '<div>Locatie: ' + r.location + '</div>' +
            '<div>Indicatief budget: ' + r.budget + '</div>' +
            '<div>Gewenste timing: ' + r.timing + '</div>' +
            '<div>Status: <strong>' + requestStatusLabel(r.status) + '</strong></div>' +
          '</div>' +
          actions +
        '</article>'
      );
    }).join('');
  }

  function renderOverviewRequests() {
    var host = $('#overviewRequests');
    if (!host) return;
    host.innerHTML = state.requests.slice(0, 3).map(function (r) {
      return '<li>' + r.title + ' · ' + requestStatusLabel(r.status) + '</li>';
    }).join('');
  }

  function renderAdmin() {
    var prices = $('#adminPrices');
    if (prices) {
      prices.innerHTML = state.prices.map(function (p) {
        return '<li><strong>' + p.specialty + '</strong>: ' + formatPrice(p) + ' · ' + p.vat + '</li>';
      }).join('');
    }
    var photos = $('#adminPhotos');
    if (photos) {
      photos.innerHTML = state.photos.map(function (ph) {
        return '<li>' + ph.title + ' · ' + ph.status + '</li>';
      }).join('');
    }
    renderRequests('adminRequests', false);
    updateStatusUI();
  }

  function updateStatusUI() {
    $all('[data-bind="status"]').forEach(function (el) {
      el.textContent = state.status;
    });
    var partnerPill = $('#partnerProfileStatus');
    if (partnerPill) partnerPill.textContent = 'Profiel: ' + state.status;
    var adminPill = $('#adminStatusPill');
    if (adminPill) adminPill.textContent = state.status;
    var submitted = $('#adminSubmittedStatus');
    if (submitted) submitted.textContent = state.status;
    var pub = $('#adminPublicStatus');
    if (pub) pub.textContent = state.publicVisible ? 'Ja (demo)' : 'Nee';

    $all('.lab-status-steps span').forEach(function (el) {
      var step = el.getAttribute('data-step');
      el.classList.remove('is-current', 'is-done');
      var order = ['Concept', 'Te beoordelen', 'Goedgekeurd', 'Gepubliceerd'];
      var cur = order.indexOf(state.status);
      var idx = order.indexOf(step);
      if (idx === cur) el.classList.add('is-current');
      else if (idx < cur) el.classList.add('is-done');
    });
  }

  function flash(id, text) {
    var el = $('#' + id);
    if (!el) return;
    if (text) el.textContent = text;
    el.hidden = false;
    window.setTimeout(function () { el.hidden = true; }, 3200);
  }

  function bind() {
    $all('.lab-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setView(btn.getAttribute('data-lab-view'));
      });
    });

    $all('.lab-dash-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPartnerPanel(btn.getAttribute('data-partner-panel'));
      });
    });

    var contact = $('#labContactForm');
    if (contact) {
      contact.addEventListener('submit', function (e) {
        e.preventDefault();
        flash('labContactNote');
      });
    }

    var profile = $('#partnerProfileForm');
    if (profile) {
      profile.addEventListener('submit', function (e) {
        e.preventDefault();
        flash('profileSaved');
      });
    }

    var savePrices = $('#savePricesBtn');
    if (savePrices) {
      savePrices.addEventListener('click', function () {
        readPriceEditor();
        renderAdmin();
        flash('pricesSaved');
      });
    }

    var saveAvail = $('#saveAvailBtn');
    if (saveAvail) {
      saveAvail.addEventListener('click', function () {
        var start = $('#availStart');
        var cap = $('#availCapacity');
        var adminAvail = $('#adminAvailability');
        if (adminAvail && start && cap) {
          adminAvail.textContent = start.value + ' · ' + cap.value;
        }
        flash('availSaved');
      });
    }

    var photoHost = $('#photoManager');
    if (photoHost) {
      photoHost.addEventListener('change', function (e) {
        var t = e.target;
        if (!t || !t.matches('[data-photo-status]')) return;
        var row = t.closest('[data-photo-id]');
        var id = Number(row.getAttribute('data-photo-id'));
        state.photos.forEach(function (ph) {
          if (ph.id === id) ph.status = t.value;
        });
        renderPhotos();
        renderAdmin();
      });
    }

    var reqHost = $('#requestList');
    if (reqHost) {
      reqHost.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-req][data-set]');
        if (!btn) return;
        var id = btn.getAttribute('data-req');
        var set = btn.getAttribute('data-set');
        state.requests.forEach(function (r) {
          if (r.id === id) r.status = set;
        });
        renderRequests('requestList', true);
        renderOverviewRequests();
        renderAdmin();
      });
    }

    $all('[data-admin-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-admin-action');
        if (action === 'approve') {
          state.status = 'Goedgekeurd';
          state.publicVisible = false;
          flash('adminActionNote', 'Demo: profiel goedgekeurd. Nog niet publiek zichtbaar.');
        } else if (action === 'request-changes') {
          state.status = 'Concept';
          state.publicVisible = false;
          flash('adminActionNote', 'Demo: aanpassing gevraagd. Status terug naar Concept.');
        } else if (action === 'publish') {
          state.status = 'Gepubliceerd';
          state.publicVisible = true;
          flash('adminActionNote', 'Demo: profiel gepubliceerd in Partner Lab (niet op de live site).');
        } else if (action === 'pause') {
          state.status = 'Te beoordelen';
          state.publicVisible = false;
          flash('adminActionNote', 'Demo: profiel gepauzeerd. Niet publiek zichtbaar.');
        }
        updateStatusUI();
      });
    });
  }

  function init() {
    renderPriceEditor();
    renderPhotos();
    renderRequests('requestList', true);
    renderOverviewRequests();
    renderAdmin();
    bind();
    setView('klant');
    setPartnerPanel('overzicht');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
