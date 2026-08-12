/* ============================================================
   ELYAN Vakmannen — core helpers + Google reviews connector stub
   ============================================================ */
(function (global) {
  'use strict';

  var EV = global.ElyanVakmannen = global.ElyanVakmannen || {};

  EV.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  EV.formatPrice = function (service) {
    if (!service) return { display: 'Prijs op aanvraag', context: 'Na beoordeling project', model: 'on_request' };
    if (service.display) {
      return { display: service.display, context: service.context || service.label || '', model: service.model };
    }
    var model = service.model;
    if (model === 'on_request' || model === 'after_visit') {
      return { display: model === 'after_visit' ? 'Prijs na plaatsbezoek' : 'Prijs op aanvraag', context: service.label || '', model: model };
    }
    if (model === 'from' || service.from != null && service.to == null) {
      return { display: 'Vanaf € ' + Number(service.from).toLocaleString('nl-BE'), context: service.unit || service.label || 'Vanafprijs', model: 'from' };
    }
    if (service.from != null && service.to != null) {
      var unit = service.unit ? ' / ' + service.unit.replace(/^€\s*\/\s*/, '') : '';
      return {
        display: '€ ' + Number(service.from).toLocaleString('nl-BE') + ' – € ' + Number(service.to).toLocaleString('nl-BE') + (service.unit ? ' / ' + service.unit : ''),
        context: service.context || ('Richtprijs' + (service.unit ? ' per ' + service.unit : '')),
        model: model
      };
    }
    return { display: 'Prijs op aanvraag', context: service.label || '', model: 'on_request' };
  };

  EV.serviceForSubtype = function (partner, subtypeId) {
    if (!partner || !partner.services || !partner.services.length) return null;
    if (subtypeId && subtypeId !== 'alle') {
      for (var i = 0; i < partner.services.length; i++) {
        if (partner.services[i].subtype === subtypeId) return partner.services[i];
      }
    }
    return partner.services[0];
  };

  EV.visitPublicLabel = function (visitSpeedId) {
    var opts = EV.VISIT_SPEED_OPTIONS || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].id === visitSpeedId) return opts[i].public;
    return null;
  };

  EV.capacityPublicLabel = function (capacityId) {
    var opts = EV.CAPACITY_OPTIONS || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].id === capacityId) return opts[i].public;
    return null;
  };

  EV.monthOptions = function (fromYear, fromMonth, count) {
    var names = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
    var out = [];
    var y = fromYear;
    var m = fromMonth - 1;
    for (var i = 0; i < (count || 18); i++) {
      out.push({ id: names[m] + ' ' + y, label: names[m] + ' ' + y, year: y, month: m + 1 });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  };

  EV.MONTH_ORDER = {
    'Augustus 2026': 0, 'September 2026': 1, 'Oktober 2026': 2,
    'November 2026': 3, 'December 2026': 4, 'Januari 2027': 5,
    'Februari 2027': 6, 'Maart 2027': 7, 'April 2027': 8
  };

  EV.matchesCustomerTiming = function (startMonth, timing) {
    if (!timing || timing === 'alle' || timing === 'flex') return true;
    var m = EV.MONTH_ORDER[startMonth];
    if (m == null) return true;
    if (timing === 'asap' || timing === '1m') return m <= 1;
    if (timing === '3m') return m <= 3;
    if (timing === '6m') return m <= 6;
    return true;
  };

  EV.timingMatch = function (partnerStartMonth, customerTiming, customerMonth) {
    if (!customerTiming || customerTiming === 'alle') {
      return { mode: 'partner_only', wish: null, partner: partnerStartMonth, ok: null, label: null };
    }
    var wish = customerMonth || (function () {
      var t = EV.CUSTOMER_TIMING || [];
      for (var i = 0; i < t.length; i++) if (t[i].id === customerTiming) return t[i].label;
      return customerTiming;
    })();
    var ok = EV.matchesCustomerTiming(partnerStartMonth, customerTiming);
    return {
      mode: 'match',
      wish: wish,
      partner: partnerStartMonth,
      ok: ok,
      label: ok ? 'Timing lijkt te passen.' : 'De timing ligt mogelijk dicht bij je voorkeur. Bespreek dit met het bedrijf.'
    };
  };

  /* Google Places connector — production interface, demo implementation */
  EV.GoogleReviews = {
    /**
     * TODO(production): Call Places API (New) Place Details with placeId.
     * Never scrape or hardcode reviews as ELYAN-owned testimonials.
     * Respect attribution, caching, and ToS.
     */
    fetchPlaceSummary: function (placeId) {
      return Promise.resolve({
        configured: false,
        placeId: placeId || null,
        rating: null,
        count: null,
        reviews: [],
        attributionRequired: true,
        message: 'Google Places API nog niet geconfigureerd.'
      });
    },
    /** Demo helper: use partner.google when consent + enabled */
    resolveForPartner: function (partner) {
      if (!partner || !partner.google || !partner.google.enabled || !partner.google.consent) {
        return { show: false, reason: 'no_consent_or_data' };
      }
      if (partner.google.live === false) {
        return {
          show: true,
          demo: true,
          rating: partner.google.rating,
          count: partner.google.count,
          reviews: partner.google.reviews || [],
          url: partner.google.url,
          placeId: partner.google.placeId,
          attribution: 'Beoordelingen via Google. ELYAN verzamelt geen eigen platformreviews.'
        };
      }
      return { show: false, reason: 'awaiting_api' };
    }
  };

  EV.generateIntro = function (partner) {
    if (!partner) return '';
    if (partner.about) return partner.about;
    var bits = [];
    if (partner.years) bits.push(partner.name + ' is al ' + partner.years + ' jaar actief.');
    if (partner.strength) bits.push('Het team is bijzonder sterk in ' + partner.strength.toLowerCase() + '.');
    if (partner.prefer) bits.push('Ze werken het liefst aan ' + partner.prefer.toLowerCase() + '.');
    if (partner.values) bits.push('Belangrijk tijdens een project: ' + partner.values.toLowerCase() + '.');
    return bits.join(' ') || (partner.name + ' is een ELYAN-gecontroleerd vakbedrijf.');
  };

  EV.publicVisibility = function (partner, field) {
    var vis = (partner && partner.publicFields) || {};
    return !!vis[field];
  };
})(typeof window !== 'undefined' ? window : global);
