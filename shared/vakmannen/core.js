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
      return { display: service.display, context: service.context || service.label || '', model: service.model || service.pricing_model };
    }
    var model = service.model || service.pricing_model;
    var from = service.from != null ? service.from : service.min_price;
    var to = service.to != null ? service.to : service.max_price;
    if (model === 'on_request' || model === 'after_visit') {
      return { display: model === 'after_visit' ? 'Prijs na plaatsbezoek' : 'Prijs op aanvraag', context: service.label || '', model: model };
    }
    if (model === 'from' || model === 'starting_price' || (from != null && to == null)) {
      return { display: 'Vanaf € ' + Number(from).toLocaleString('nl-BE'), context: service.unit || service.label || 'Vanafprijs', model: model || 'from' };
    }
    if (from != null && to != null) {
      var unitSuffix = '';
      if (model === 'per_m2' || service.unit === 'm2' || service.unit === 'm²') unitSuffix = ' / m²';
      else if (model === 'per_linear_meter' || service.unit === 'lm') unitSuffix = ' / lm';
      else if (model === 'per_hour') unitSuffix = ' / uur';
      else if (model === 'per_wp') unitSuffix = ' / Wp';
      else if (model === 'per_kwh') unitSuffix = ' / kWh';
      else if (service.unit) unitSuffix = ' / ' + String(service.unit).replace(/^€\s*\/\s*/, '');
      return {
        display: '€ ' + Number(from).toLocaleString('nl-BE') + ' – € ' + Number(to).toLocaleString('nl-BE') + unitSuffix,
        context: service.context || 'Richtprijs',
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
    /**
     * Resolve review presentation for a partner.
     * opts.allowDemo — internal surfaces only (Partner Lab). Public must omit this
     * so mock ratings/counts never appear as live Google data.
     */
    resolveForPartner: function (partner, opts) {
      opts = opts || {};
      if (!partner || !partner.google || !partner.google.enabled || !partner.google.consent) {
        return { show: false, status: 'hidden', reason: 'no_consent_or_data' };
      }
      var g = partner.google;
      if (g.live === true && g.rating != null && g.count != null) {
        return {
          show: true,
          status: 'live',
          demo: false,
          rating: g.rating,
          count: g.count,
          reviews: g.reviews || [],
          url: g.url || null,
          placeId: g.placeId || null,
          attribution: 'Beoordelingen via Google. ELYAN verzamelt geen eigen platformreviews.'
        };
      }
      if (opts.allowDemo) {
        return {
          show: true,
          status: 'demo',
          demo: true,
          rating: g.rating,
          count: g.count,
          reviews: g.reviews || [],
          url: g.url || null,
          placeId: g.placeId || null,
          attribution: 'Beoordelingen via Google. ELYAN verzamelt geen eigen platformreviews.'
        };
      }
      /* Production-safe: consent/architecture ready, no fabricated live numbers */
      return {
        show: true,
        status: 'pending',
        demo: false,
        rating: null,
        count: null,
        reviews: [],
        url: g.url || null,
        placeId: g.placeId || null,
        attribution: 'Beoordelingen via Google. ELYAN verzamelt geen eigen platformreviews.',
        message: 'Google-beoordelingen worden getoond zodra de live Google-koppeling actief is.'
      };
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
