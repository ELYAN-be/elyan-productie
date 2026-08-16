/**
 * Phase B Sprint 3–6 — P1–P6 draft helpers (V2 frozen).
 * Browser (script tag) + Node (require) for offline tests.
 * P3/P4 content from Category Intelligence (PartnerOnboardingEngine).
 * P5 story.* domain; P6 photo metadata lives in partner_profile_assets.
 *
 * P3→P4 orphan rule: when a P3 service is removed, prune matching
 * offer.service_prices entries (do not keep orphan price data).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanOnboardingDraft = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RECHTSVORMEN = [
    { id: 'eenmanszaak', label: 'Eenmanszaak' },
    { id: 'bv', label: 'BV' },
    { id: 'vof', label: 'VOF' },
    { id: 'nv', label: 'NV' },
    { id: 'cv', label: 'CV' },
    { id: 'maatschap', label: 'Maatschap' },
    { id: 'andere', label: 'Andere' }
  ];

  var GEWESTEN = [
    { id: 'vlaanderen', label: 'Vlaanderen' },
    { id: 'brussel', label: 'Brussel' },
    { id: 'wallonie', label: 'Wallonië' }
  ];

  var LANGUAGES = [
    { id: 'nl-BE', label: 'Nederlands (België)' },
    { id: 'fr-BE', label: 'Français (Belgique)' },
    { id: 'en', label: 'English' }
  ];

  var AREA_MODES = [
    { id: 'radius', label: 'Radius rond vestiging' },
    { id: 'provincies', label: 'Specifieke provincies' },
    { id: 'gewest', label: 'Gewest(en)' },
    { id: 'heel_belgie', label: 'Heel België' }
  ];

  var PROVINCES = [
    { id: 'antwerpen', label: 'Antwerpen', gewest: 'vlaanderen' },
    { id: 'limburg', label: 'Limburg', gewest: 'vlaanderen' },
    { id: 'oost_vlaanderen', label: 'Oost-Vlaanderen', gewest: 'vlaanderen' },
    { id: 'west_vlaanderen', label: 'West-Vlaanderen', gewest: 'vlaanderen' },
    { id: 'vlaams_brabant', label: 'Vlaams-Brabant', gewest: 'vlaanderen' },
    { id: 'brussel', label: 'Brussel', gewest: 'brussel' },
    { id: 'henegouwen', label: 'Henegouwen', gewest: 'wallonie' },
    { id: 'luik', label: 'Luik', gewest: 'wallonie' },
    { id: 'luxemburg', label: 'Luxemburg', gewest: 'wallonie' },
    { id: 'namen', label: 'Namen', gewest: 'wallonie' },
    { id: 'waals_brabant', label: 'Waals-Brabant', gewest: 'wallonie' }
  ];

  var COMPANY_KEYS = [
    'legal_name',
    'display_name',
    'rechtsvorm',
    'kbo',
    'btw_plichtig',
    'btw_nummer',
    'adres',
    'postcode',
    'gemeente',
    'gewest',
    'website',
    'email',
    'phone',
    'contact_name',
    'contact_role',
    'language'
  ];

  var SERVICE_AREA_KEYS = [
    'mode',
    'radius_km',
    'provinces',
    'regions',
    'public_text',
    'exclusions'
  ];

  var CRAFT_KEYS = [
    'primary_category_id',
    'service_ids',
    'conditionals',
    'extras'
  ];

  var OFFER_KEYS = [
    'service_prices',
    'vat_basis',
    'project_minimum',
    'client_types',
    'response_time',
    'urgency_jobs',
    'capacity',
    'start_month',
    'visit_speed',
    'visit_extra'
  ];

  /** V2 P5 — Verhaal (exact fields; snake_case draft keys). */
  var STORY_KEYS = [
    'years_active',
    'team_size',
    'strength',
    'prefer',
    'avoid',
    'care',
    'why_choose',
    'materials',
    'must_know',
    'guarantee_line',
    'show_years_public',
    'show_team_public'
  ];

  var YEARS_ACTIVE = [
    { id: '0-2', label: '0–2 jaar' },
    { id: '3-5', label: '3–5 jaar' },
    { id: '6-10', label: '6–10 jaar' },
    { id: '11-20', label: '11–20 jaar' },
    { id: '20+', label: '20+ jaar' }
  ];

  var TEAM_SIZES = [
    { id: '1', label: '1' },
    { id: '2-3', label: '2–3' },
    { id: '4-6', label: '4–6' },
    { id: '7-10', label: '7–10' },
    { id: '10+', label: '10+' }
  ];

  /** Portfolio draft domain is reserved; photo metadata is not stored here. */
  var PORTFOLIO_KEYS = [];

  /** V2 P7 confirmations (draft.confirmations). */
  var CONFIRMATION_KEYS = ['data_correct', 'editorial_ok'];

  /** Core P5 fields locked while onboarding_status=submitted (V2 Review Hub). */
  var STORY_CORE_KEYS = ['years_active', 'strength', 'prefer'];

  /** Optional P5 fields editable during submitted polish. */
  var STORY_OPTIONAL_KEYS = [
    'team_size',
    'avoid',
    'care',
    'why_choose',
    'materials',
    'must_know',
    'guarantee_line',
    'show_years_public',
    'show_team_public'
  ];

  var PORTFOLIO_MAX_ASSETS = 12;
  var PORTFOLIO_MAX_BYTES = 8 * 1024 * 1024;
  var PORTFOLIO_TITLE_MAX = 60;

  /** V2 D.5 — three-tier UI on 0–100 weighted score (not a submit gate). */
  var STRENGTH_WEIGHTS = {
    identity: 25,
    craft: 25,
    offer: 20,
    story: 15,
    portfolio: 15
  };

  var SERVICE_PRICE_KEYS = [
    'pricing_model',
    'min_price',
    'max_price',
    'internal_note'
  ];

  var CLIENT_TYPES = [
    { id: 'particulier', label: 'Particulier' },
    { id: 'b2b', label: 'B2B' },
    { id: 'syndic_vme', label: 'Syndic / VME' }
  ];

  var RESPONSE_TIMES = [
    { id: 'zelfde_dag', label: 'Zelfde dag' },
    { id: '24u', label: 'Binnen 24 uur' },
    { id: '48u', label: 'Binnen 48 uur' },
    { id: '3_werkdagen', label: 'Binnen 3 werkdagen' }
  ];

  var VAT_BASIS_OPTIONS = [
    { id: 'exclusief', label: 'Exclusief btw' },
    { id: 'inclusief', label: 'Inclusief btw' }
  ];

  var URGENCY_OPTIONS = [
    { id: 'ja', label: 'Ja' },
    { id: 'beperkt', label: 'Beperkt' },
    { id: 'nee', label: 'Nee' }
  ];

  var NL_MONTHS = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ];

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function getIntelligence() {
    if (typeof globalThis !== 'undefined' && globalThis.ElyanVakmannen && globalThis.ElyanVakmannen.Intelligence) {
      return globalThis.ElyanVakmannen.Intelligence;
    }
    if (typeof window !== 'undefined' && window.ElyanVakmannen && window.ElyanVakmannen.Intelligence) {
      return window.ElyanVakmannen.Intelligence;
    }
    if (typeof require === 'function') {
      try {
        return require('../../shared/vakmannen/intelligence');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function getOnboardingEngine() {
    var intel = getIntelligence();
    return intel && intel.PartnerOnboardingEngine ? intel.PartnerOnboardingEngine : null;
  }

  function listCategories() {
    var oe = getOnboardingEngine();
    return oe ? oe.listCategories() : [];
  }

  function getCategory(id) {
    var oe = getOnboardingEngine();
    return oe ? oe.getCategory(id) : null;
  }

  function getServices(categoryId) {
    var oe = getOnboardingEngine();
    return oe ? oe.getServices(categoryId) : [];
  }

  function getConditionalsForSelected(categoryId, serviceIds) {
    var oe = getOnboardingEngine();
    return oe ? oe.getConditionalsForSelected(categoryId, serviceIds || []) : [];
  }

  function getOnboardExtras(categoryId) {
    var oe = getOnboardingEngine();
    return oe ? oe.getOnboardExtras(categoryId) : [];
  }

  function getVisitOptions() {
    var oe = getOnboardingEngine();
    var intel = getIntelligence();
    if (oe && oe.visitOptions) return oe.visitOptions.slice();
    return intel && intel.VISIT_OPTIONS ? intel.VISIT_OPTIONS.slice() : [];
  }

  function getCapacityOptions() {
    var oe = getOnboardingEngine();
    var intel = getIntelligence();
    if (oe && oe.capacityOptions) return oe.capacityOptions.slice();
    return intel && intel.CAPACITY_OPTIONS ? intel.CAPACITY_OPTIONS.slice() : [];
  }

  function getVisitExtraOptions() {
    var oe = getOnboardingEngine();
    var intel = getIntelligence();
    if (oe && oe.visitExtraOptions) return oe.visitExtraOptions.slice();
    return intel && intel.VISIT_EXTRA_OPTIONS ? intel.VISIT_EXTRA_OPTIONS.slice() : [];
  }

  function pricingModelsForService(categoryId, serviceId) {
    var oe = getOnboardingEngine();
    if (oe && oe.pricingModelsForService) {
      return oe.pricingModelsForService(categoryId, serviceId);
    }
    var intel = getIntelligence();
    if (intel && intel.PriceEngine) {
      var models = intel.PriceEngine.modelsForService(categoryId, serviceId);
      if (models.indexOf('on_request') < 0) models = models.concat(['on_request']);
      return models;
    }
    return ['on_request'];
  }

  function unitHintForService(categoryId, serviceId) {
    var oe = getOnboardingEngine();
    if (oe && oe.unitHintForService) return oe.unitHintForService(categoryId, serviceId);
    var svcs = getServices(categoryId);
    for (var i = 0; i < svcs.length; i++) {
      if (svcs[i].id === serviceId) return svcs[i].unitHint || null;
    }
    return null;
  }

  function priceModelLabel(model) {
    var intel = getIntelligence();
    if (intel && intel.PriceEngine && intel.PriceEngine.labelFor) {
      return intel.PriceEngine.labelFor(model);
    }
    return model;
  }

  /** V2: spoed only for dakwerken or service `herstelling` — no other category hardcodes. */
  function showUrgencyJobs(craft) {
    craft = pickCraft(craft);
    var oe = getOnboardingEngine();
    if (oe && oe.showUrgencyJobs) {
      return oe.showUrgencyJobs(craft.primary_category_id, craft.service_ids);
    }
    if (craft.primary_category_id === 'dakwerken') return true;
    return (craft.service_ids || []).indexOf('herstelling') >= 0;
  }

  function hasCiProjectMinimum(categoryId) {
    var oe = getOnboardingEngine();
    if (oe && oe.hasCiProjectMinimum) return oe.hasCiProjectMinimum(categoryId);
    var extras = getOnboardExtras(categoryId);
    return extras.some(function (q) { return q.key === 'minProject'; });
  }

  /** Horizon: current month … +12 (YYYY-MM). */
  function listStartMonths(now) {
    now = now || new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var out = [];
    for (var i = 0; i <= 12; i++) {
      var mm = m + i;
      var yy = y + Math.floor(mm / 12);
      var mo = mm % 12;
      var id = yy + '-' + (mo + 1 < 10 ? '0' : '') + (mo + 1);
      out.push({ id: id, label: NL_MONTHS[mo] + ' ' + yy });
    }
    return out;
  }

  function emptyServicePrice() {
    return {
      pricing_model: '',
      min_price: null,
      max_price: null,
      internal_note: ''
    };
  }

  function emptyOffer() {
    return {
      service_prices: {},
      vat_basis: 'exclusief',
      project_minimum: null,
      client_types: [],
      response_time: '',
      urgency_jobs: null,
      capacity: '',
      start_month: '',
      visit_speed: '',
      visit_extra: []
    };
  }

  function pickOffer(src) {
    var out = emptyOffer();
    if (!isPlainObject(src)) return out;
    if (isPlainObject(src.service_prices)) {
      Object.keys(src.service_prices).forEach(function (sid) {
        var sp = src.service_prices[sid];
        if (!isPlainObject(sp)) return;
        out.service_prices[sid] = {
          pricing_model: trimStr(sp.pricing_model),
          min_price: sp.min_price == null || sp.min_price === '' ? null : Number(sp.min_price),
          max_price: sp.max_price == null || sp.max_price === '' ? null : Number(sp.max_price),
          internal_note: trimStr(sp.internal_note).slice(0, 200)
        };
      });
    }
    if (src.vat_basis != null) out.vat_basis = trimStr(src.vat_basis) || 'exclusief';
    if (Object.prototype.hasOwnProperty.call(src, 'project_minimum')) {
      out.project_minimum = src.project_minimum == null || src.project_minimum === ''
        ? null
        : Number(src.project_minimum);
    }
    if (Array.isArray(src.client_types)) out.client_types = src.client_types.slice();
    if (src.response_time != null) out.response_time = trimStr(src.response_time);
    if (Object.prototype.hasOwnProperty.call(src, 'urgency_jobs')) {
      out.urgency_jobs = src.urgency_jobs == null || src.urgency_jobs === ''
        ? null
        : trimStr(src.urgency_jobs);
    }
    if (src.capacity != null) out.capacity = trimStr(src.capacity);
    if (src.start_month != null) out.start_month = trimStr(src.start_month);
    if (src.visit_speed != null) out.visit_speed = trimStr(src.visit_speed);
    if (Array.isArray(src.visit_extra)) out.visit_extra = src.visit_extra.slice();
    return out;
  }

  /**
   * Orphan rule: drop service_prices for services no longer selected in P3.
   */
  function pruneOfferToServices(offer, serviceIds) {
    var out = pickOffer(offer);
    var allow = {};
    (serviceIds || []).forEach(function (id) { allow[id] = true; });
    var next = {};
    Object.keys(out.service_prices).forEach(function (sid) {
      if (allow[sid]) next[sid] = out.service_prices[sid];
    });
    out.service_prices = next;
    return out;
  }

  function parseNonNegNumber(raw, fieldLabel) {
    if (raw === '' || raw == null) return { ok: true, value: null, empty: true };
    var n = Number(raw);
    if (!Number.isFinite(n)) {
      return { ok: false, code: 'invalid_field', message: fieldLabel + ': vul een getal in.' };
    }
    if (n < 0) {
      return { ok: false, code: 'invalid_field', message: fieldLabel + ': bedrag mag niet negatief zijn.' };
    }
    return { ok: true, value: n };
  }

  function modelNeedsMax(model) {
    return model === 'price_range';
  }

  function modelNeedsMin(model) {
    return !!model && model !== 'on_request';
  }

  /**
   * Soft-sanitize offer for autosave. Partials OK.
   * When craftHint provided, prune orphans + enforce CI models for set prices.
   */
  function sanitizeOffer(rawOffer, craftHint) {
    if (rawOffer == null) return { ok: true, offer: null };
    if (!isPlainObject(rawOffer)) {
      return { ok: false, code: 'invalid_draft', message: 'offer must be an object' };
    }
    var unknown = Object.keys(rawOffer).filter(function (k) {
      return OFFER_KEYS.indexOf(k) < 0;
    });
    if (unknown.length) {
      return { ok: false, code: 'invalid_draft', message: 'Unknown offer fields: ' + unknown.join(', ') };
    }

    var craft = pickCraft(craftHint);
    var offer = emptyOffer();
    var has = function (k) {
      return Object.prototype.hasOwnProperty.call(rawOffer, k);
    };

    if (has('vat_basis')) {
      var vb = trimStr(rawOffer.vat_basis);
      if (vb && enumId(VAT_BASIS_OPTIONS, vb) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige btw-weergavebasis.' };
      }
      offer.vat_basis = vb || 'exclusief';
    }

    if (has('project_minimum')) {
      var pm = parseNonNegNumber(rawOffer.project_minimum, 'Projectminimum');
      if (!pm.ok) return pm;
      offer.project_minimum = pm.value;
    }

    if (has('client_types')) {
      if (!Array.isArray(rawOffer.client_types)) {
        return { ok: false, code: 'invalid_draft', message: 'client_types must be an array' };
      }
      var ctAllowed = CLIENT_TYPES.map(function (c) { return c.id; });
      offer.client_types = [];
      for (var ci = 0; ci < rawOffer.client_types.length; ci++) {
        var ct = trimStr(rawOffer.client_types[ci]);
        if (!ct) continue;
        if (ctAllowed.indexOf(ct) < 0) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldig klanttype.' };
        }
        if (offer.client_types.indexOf(ct) < 0) offer.client_types.push(ct);
      }
    }

    if (has('response_time')) {
      var rt = trimStr(rawOffer.response_time);
      if (rt && enumId(RESPONSE_TIMES, rt) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige reactietijd.' };
      }
      offer.response_time = rt;
    }

    if (has('urgency_jobs')) {
      if (rawOffer.urgency_jobs == null || rawOffer.urgency_jobs === '') {
        offer.urgency_jobs = null;
      } else {
        var uj = trimStr(rawOffer.urgency_jobs);
        if (enumId(URGENCY_OPTIONS, uj) == null) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige spoedoptie.' };
        }
        offer.urgency_jobs = uj;
      }
    }

    if (has('capacity')) {
      var cap = trimStr(rawOffer.capacity);
      var caps = getCapacityOptions();
      if (cap && enumId(caps, cap) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige capaciteit.' };
      }
      offer.capacity = cap;
    }

    if (has('start_month')) {
      var sm = trimStr(rawOffer.start_month);
      if (sm) {
        var allowedMonths = listStartMonths();
        if (enumId(allowedMonths, sm) == null) {
          return { ok: false, code: 'invalid_field', message: 'Kies een startmaand binnen 12 maanden.' };
        }
      }
      offer.start_month = sm;
    }

    if (has('visit_speed')) {
      var vs = trimStr(rawOffer.visit_speed);
      var visits = getVisitOptions();
      if (vs && enumId(visits, vs) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige plaatsbezoek-snelheid.' };
      }
      offer.visit_speed = vs;
    }

    if (has('visit_extra')) {
      if (!Array.isArray(rawOffer.visit_extra)) {
        return { ok: false, code: 'invalid_draft', message: 'visit_extra must be an array' };
      }
      var veAllowed = getVisitExtraOptions().map(function (v) { return v.id; });
      offer.visit_extra = [];
      for (var vi = 0; vi < rawOffer.visit_extra.length; vi++) {
        var ve = trimStr(rawOffer.visit_extra[vi]);
        if (!ve) continue;
        if (veAllowed.indexOf(ve) < 0) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige afspraakoptie.' };
        }
        if (offer.visit_extra.indexOf(ve) < 0) offer.visit_extra.push(ve);
      }
    }

    if (has('service_prices')) {
      if (rawOffer.service_prices != null && !isPlainObject(rawOffer.service_prices)) {
        return { ok: false, code: 'invalid_draft', message: 'service_prices must be an object' };
      }
      offer.service_prices = {};
      var rawPrices = rawOffer.service_prices || {};
      var catId = craft.primary_category_id;
      var selected = craft.service_ids || [];
      var pruneToSelected = selected.length > 0 || (craftHint && Array.isArray(craftHint.service_ids));

      var sids = Object.keys(rawPrices);
      for (var si = 0; si < sids.length; si++) {
        var sid = trimStr(sids[si]);
        if (!sid) continue;
        if (pruneToSelected && selected.indexOf(sid) < 0) continue; // orphan prune
        if (catId) {
          var known = getServices(catId).some(function (s) { return s.id === sid; });
          if (!known) {
            return { ok: false, code: 'invalid_field', message: 'Prijs voor onbekende dienst.' };
          }
        }
        var rawSp = rawPrices[sids[si]];
        if (!isPlainObject(rawSp)) {
          return { ok: false, code: 'invalid_draft', message: 'service price must be an object' };
        }
        var unkSp = Object.keys(rawSp).filter(function (k) {
          return SERVICE_PRICE_KEYS.indexOf(k) < 0;
        });
        if (unkSp.length) {
          return { ok: false, code: 'invalid_draft', message: 'Unknown price fields: ' + unkSp.join(', ') };
        }
        var sp = emptyServicePrice();
        if (Object.prototype.hasOwnProperty.call(rawSp, 'pricing_model')) {
          var model = trimStr(rawSp.pricing_model);
          if (model && catId) {
            var allowedModels = pricingModelsForService(catId, sid);
            if (allowedModels.indexOf(model) < 0) {
              return {
                ok: false,
                code: 'invalid_field',
                message: 'Dit prijsmodel past niet bij deze dienst.'
              };
            }
          } else if (model) {
            var intel = getIntelligence();
            var allModels = intel && intel.PRICING_MODELS ? intel.PRICING_MODELS : [];
            if (allModels.length && allModels.indexOf(model) < 0 && model !== 'on_request') {
              return { ok: false, code: 'invalid_field', message: 'Ongeldig prijsmodel.' };
            }
          }
          sp.pricing_model = model;
        }
        if (Object.prototype.hasOwnProperty.call(rawSp, 'min_price')) {
          var minP = parseNonNegNumber(rawSp.min_price, 'Minimumprijs');
          if (!minP.ok) return minP;
          sp.min_price = minP.value;
        }
        if (Object.prototype.hasOwnProperty.call(rawSp, 'max_price')) {
          var maxP = parseNonNegNumber(rawSp.max_price, 'Maximumprijs');
          if (!maxP.ok) return maxP;
          sp.max_price = maxP.value;
        }
        if (sp.min_price != null && sp.max_price != null && sp.max_price < sp.min_price) {
          return {
            ok: false,
            code: 'invalid_field',
            message: 'Maximumprijs moet minstens het minimum zijn.'
          };
        }
        if (Object.prototype.hasOwnProperty.call(rawSp, 'internal_note')) {
          sp.internal_note = trimStr(rawSp.internal_note).slice(0, 200);
        }
        if (sp.pricing_model === 'on_request') {
          sp.min_price = null;
          sp.max_price = null;
        }
        offer.service_prices[sid] = sp;
      }
    }

    var out = {};
    OFFER_KEYS.forEach(function (k) {
      if (has(k)) out[k] = offer[k];
    });
    return { ok: true, offer: out };
  }

  function mergeOffer(base, patch) {
    var out = pickOffer(base);
    if (!isPlainObject(patch)) return out;
    if (Object.prototype.hasOwnProperty.call(patch, 'service_prices') && isPlainObject(patch.service_prices)) {
      Object.keys(patch.service_prices).forEach(function (sid) {
        var sp = patch.service_prices[sid];
        if (!isPlainObject(sp)) return;
        var cur = out.service_prices[sid] || emptyServicePrice();
        if (Object.prototype.hasOwnProperty.call(sp, 'pricing_model')) cur.pricing_model = trimStr(sp.pricing_model);
        if (Object.prototype.hasOwnProperty.call(sp, 'min_price')) {
          cur.min_price = sp.min_price == null || sp.min_price === '' ? null : Number(sp.min_price);
        }
        if (Object.prototype.hasOwnProperty.call(sp, 'max_price')) {
          cur.max_price = sp.max_price == null || sp.max_price === '' ? null : Number(sp.max_price);
        }
        if (Object.prototype.hasOwnProperty.call(sp, 'internal_note')) {
          cur.internal_note = trimStr(sp.internal_note).slice(0, 200);
        }
        out.service_prices[sid] = cur;
      });
    }
    ['vat_basis', 'response_time', 'capacity', 'start_month', 'visit_speed'].forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
    });
    if (Object.prototype.hasOwnProperty.call(patch, 'project_minimum')) {
      out.project_minimum = patch.project_minimum;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'urgency_jobs')) {
      out.urgency_jobs = patch.urgency_jobs;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'client_types')) {
      out.client_types = Array.isArray(patch.client_types) ? patch.client_types.slice() : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'visit_extra')) {
      out.visit_extra = Array.isArray(patch.visit_extra) ? patch.visit_extra.slice() : [];
    }
    return out;
  }

  /**
   * Client completeness before leaving P4 (V2 submit-gate subset for this step).
   */
  function validateP4Complete(draft) {
    var errors = {};
    var craft = pickCraft(draft && draft.craft);
    var offer = pickOffer(draft && draft.offer);
    var catId = craft.primary_category_id;
    var serviceIds = craft.service_ids || [];

    if (!catId || !serviceIds.length) {
      errors.service_ids = 'Selecteer eerst diensten bij Ambacht.';
      return { ok: false, errors: errors, offer: offer, craft: craft };
    }

    serviceIds.forEach(function (sid) {
      var sp = offer.service_prices[sid] || emptyServicePrice();
      var prefix = 'price_' + sid + '_';
      if (!sp.pricing_model) {
        errors[prefix + 'model'] = 'Kies een prijsmodel.';
        return;
      }
      var allowed = pricingModelsForService(catId, sid);
      if (allowed.indexOf(sp.pricing_model) < 0) {
        errors[prefix + 'model'] = 'Dit prijsmodel past niet bij deze dienst.';
        return;
      }
      if (sp.pricing_model === 'on_request') return;
      if (modelNeedsMin(sp.pricing_model)) {
        if (sp.min_price == null || !Number.isFinite(sp.min_price) || sp.min_price < 0) {
          errors[prefix + 'min'] = 'Vul een richtprijs in (vanaf).';
        }
      }
      if (modelNeedsMax(sp.pricing_model)) {
        if (sp.max_price == null || !Number.isFinite(sp.max_price) || sp.max_price < 0) {
          errors[prefix + 'max'] = 'Vul een maximumprijs in.';
        } else if (sp.min_price != null && sp.max_price < sp.min_price) {
          errors[prefix + 'max'] = 'Maximum moet minstens het minimum zijn.';
        }
      } else if (sp.max_price != null && sp.min_price != null && sp.max_price < sp.min_price) {
        errors[prefix + 'max'] = 'Maximum moet minstens het minimum zijn.';
      }
    });

    if (!offer.vat_basis || enumId(VAT_BASIS_OPTIONS, offer.vat_basis) == null) {
      errors.vat_basis = 'Kies de btw-weergavebasis.';
    }

    if (!hasCiProjectMinimum(catId) && offer.project_minimum != null) {
      if (!Number.isFinite(offer.project_minimum) || offer.project_minimum < 0) {
        errors.project_minimum = 'Projectminimum mag niet negatief zijn.';
      }
    }

    if (!offer.client_types || !offer.client_types.length) {
      errors.client_types = 'Selecteer minstens één klanttype.';
    }

    if (!offer.response_time || enumId(RESPONSE_TIMES, offer.response_time) == null) {
      errors.response_time = 'Kies een typische reactietijd.';
    }

    if (showUrgencyJobs(craft) && offer.urgency_jobs != null) {
      if (enumId(URGENCY_OPTIONS, offer.urgency_jobs) == null) {
        errors.urgency_jobs = 'Ongeldige spoedoptie.';
      }
    }

    if (!offer.capacity || enumId(getCapacityOptions(), offer.capacity) == null) {
      errors.capacity = 'Kies jullie capaciteit.';
    }

    if (!offer.start_month || enumId(listStartMonths(), offer.start_month) == null) {
      errors.start_month = 'Kies de eerste startmaand.';
    }

    if (!offer.visit_speed || enumId(getVisitOptions(), offer.visit_speed) == null) {
      errors.visit_speed = 'Kies de plaatsbezoek-snelheid.';
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      offer: offer,
      craft: craft
    };
  }

  function isInfoQuestion(q) {
    return !!(q && q.type === 'info');
  }

  /** V2/V1: single/multi/select without empty:true are required when visible. */
  function isRequiredQuestion(q) {
    if (!q || isInfoQuestion(q) || q.empty) return false;
    return q.type === 'single' || q.type === 'multi' || q.type === 'select';
  }

  function optionValues(q) {
    return (q.options || []).map(function (opt) {
      return typeof opt === 'string' ? opt : opt.id;
    });
  }

  function emptyCraft() {
    return {
      primary_category_id: '',
      service_ids: [],
      conditionals: {},
      extras: {}
    };
  }

  function pickCraft(src) {
    var out = emptyCraft();
    if (!isPlainObject(src)) return out;
    if (src.primary_category_id != null) out.primary_category_id = trimStr(src.primary_category_id);
    if (Array.isArray(src.service_ids)) out.service_ids = src.service_ids.slice();
    if (isPlainObject(src.conditionals)) {
      Object.keys(src.conditionals).forEach(function (k) {
        out.conditionals[k] = src.conditionals[k];
      });
    }
    if (isPlainObject(src.extras)) {
      Object.keys(src.extras).forEach(function (k) {
        out.extras[k] = src.extras[k];
      });
    }
    return out;
  }

  function hasCategoryDependentP3Data(craft) {
    craft = pickCraft(craft);
    if (craft.service_ids && craft.service_ids.length) return true;
    if (craft.conditionals && Object.keys(craft.conditionals).length) return true;
    if (craft.extras && Object.keys(craft.extras).length) return true;
    return false;
  }

  function resetCraftForCategoryChange(newCategoryId) {
    return {
      primary_category_id: trimStr(newCategoryId) || '',
      service_ids: [],
      conditionals: {},
      extras: {}
    };
  }

  function sanitizeAnswerValue(q, raw) {
    if (q.type === 'multi') {
      if (raw == null || raw === '') return [];
      if (!Array.isArray(raw)) return { ok: false, code: 'invalid_draft', message: q.key + ' must be an array' };
      var allowed = optionValues(q);
      var cleaned = [];
      for (var i = 0; i < raw.length; i++) {
        var v = trimStr(raw[i]);
        if (!v) continue;
        if (allowed.length && allowed.indexOf(v) < 0) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige optie voor ' + q.label };
        }
        if (cleaned.indexOf(v) < 0) cleaned.push(v);
      }
      return { ok: true, value: cleaned };
    }
    if (q.type === 'single' || q.type === 'select') {
      var s = trimStr(raw);
      if (!s) return { ok: true, value: '' };
      var opts = optionValues(q);
      if (opts.length && opts.indexOf(s) < 0) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige optie voor ' + q.label };
      }
      return { ok: true, value: s };
    }
    if (q.type === 'number') {
      if (raw === '' || raw == null) return { ok: true, value: null };
      var n = Number(raw);
      if (!Number.isFinite(n)) {
        return { ok: false, code: 'invalid_field', message: q.label + ': vul een getal in.' };
      }
      return { ok: true, value: n };
    }
    if (q.type === 'text') {
      return { ok: true, value: trimStr(raw).slice(0, 200) };
    }
    return { ok: true, value: raw };
  }

  function answerSatisfiesRequired(q, value) {
    if (!isRequiredQuestion(q)) return true;
    if (q.type === 'multi') return Array.isArray(value) && value.length > 0;
    if (q.type === 'single' || q.type === 'select') return !!trimStr(value);
    return true;
  }

  /**
   * Normalize + soft-validate craft for autosave against Category Intelligence.
   * Partials allowed; unknown categories/services/keys rejected.
   */
  function sanitizeCraft(rawCraft) {
    if (rawCraft == null) return { ok: true, craft: null };
    if (!isPlainObject(rawCraft)) {
      return { ok: false, code: 'invalid_draft', message: 'craft must be an object' };
    }
    var unknown = Object.keys(rawCraft).filter(function (k) {
      return CRAFT_KEYS.indexOf(k) < 0;
    });
    if (unknown.length) {
      return { ok: false, code: 'invalid_draft', message: 'Unknown craft fields: ' + unknown.join(', ') };
    }

    var oe = getOnboardingEngine();
    if (!oe) {
      return { ok: false, code: 'invalid_draft', message: 'Category Intelligence unavailable' };
    }

    var craft = emptyCraft();
    var hasCat = Object.prototype.hasOwnProperty.call(rawCraft, 'primary_category_id');
    var hasSvc = Object.prototype.hasOwnProperty.call(rawCraft, 'service_ids');
    var hasCond = Object.prototype.hasOwnProperty.call(rawCraft, 'conditionals');
    var hasEx = Object.prototype.hasOwnProperty.call(rawCraft, 'extras');

    if (hasCat) {
      var catId = trimStr(rawCraft.primary_category_id);
      if (catId) {
        if (!oe.getCategory(catId)) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige hoofdcategorie.' };
        }
        craft.primary_category_id = catId;
      } else {
        craft.primary_category_id = '';
      }
    }

    var effectiveCat = hasCat ? craft.primary_category_id : trimStr(rawCraft.primary_category_id);
    var serviceIds = Array.isArray(rawCraft.service_ids) ? rawCraft.service_ids : [];

    if (hasSvc) {
      if (!Array.isArray(rawCraft.service_ids)) {
        return { ok: false, code: 'invalid_draft', message: 'service_ids must be an array' };
      }
      if (!effectiveCat && rawCraft.service_ids.length) {
        return { ok: false, code: 'invalid_field', message: 'Kies eerst een hoofdcategorie.' };
      }
      var allowedSvc = {};
      if (effectiveCat) {
        getServices(effectiveCat).forEach(function (s) {
          allowedSvc[s.id] = true;
        });
      }
      craft.service_ids = [];
      for (var si = 0; si < rawCraft.service_ids.length; si++) {
        var sid = trimStr(rawCraft.service_ids[si]);
        if (!sid) continue;
        if (!allowedSvc[sid]) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige dienst voor deze categorie.' };
        }
        if (craft.service_ids.indexOf(sid) < 0) craft.service_ids.push(sid);
      }
      serviceIds = craft.service_ids;
    }

    if (hasCond) {
      if (rawCraft.conditionals != null && !isPlainObject(rawCraft.conditionals)) {
        return { ok: false, code: 'invalid_draft', message: 'conditionals must be an object' };
      }
      var condMap = {};
      getConditionalsForSelected(effectiveCat, serviceIds).forEach(function (q) {
        condMap[q.key] = q;
      });
      craft.conditionals = {};
      var rawCond = rawCraft.conditionals || {};
      var unkCond = Object.keys(rawCond).filter(function (k) {
        return !condMap[k];
      });
      if (unkCond.length) {
        return {
          ok: false,
          code: 'invalid_draft',
          message: 'Unknown or irrelevant conditionals: ' + unkCond.join(', ')
        };
      }
      var ck = Object.keys(rawCond);
      for (var ci = 0; ci < ck.length; ci++) {
        var cKey = ck[ci];
        var cSan = sanitizeAnswerValue(condMap[cKey], rawCond[cKey]);
        if (!cSan.ok) return cSan;
        craft.conditionals[cKey] = cSan.value;
      }
    }

    if (hasEx) {
      if (rawCraft.extras != null && !isPlainObject(rawCraft.extras)) {
        return { ok: false, code: 'invalid_draft', message: 'extras must be an object' };
      }
      var extraMap = {};
      getOnboardExtras(effectiveCat).forEach(function (q) {
        if (!isInfoQuestion(q)) extraMap[q.key] = q;
      });
      craft.extras = {};
      var rawEx = rawCraft.extras || {};
      var unkEx = Object.keys(rawEx).filter(function (k) {
        return !extraMap[k];
      });
      if (unkEx.length) {
        return { ok: false, code: 'invalid_draft', message: 'Unknown craft extras: ' + unkEx.join(', ') };
      }
      var ek = Object.keys(rawEx);
      for (var ei = 0; ei < ek.length; ei++) {
        var eKey = ek[ei];
        var eSan = sanitizeAnswerValue(extraMap[eKey], rawEx[eKey]);
        if (!eSan.ok) return eSan;
        craft.extras[eKey] = eSan.value;
      }
    }

    var out = {};
    if (hasCat) out.primary_category_id = craft.primary_category_id;
    if (hasSvc) out.service_ids = craft.service_ids;
    if (hasCond) out.conditionals = craft.conditionals;
    if (hasEx) out.extras = craft.extras;
    return { ok: true, craft: out };
  }

  function trimStr(v) {
    return v == null ? '' : String(v).trim();
  }

  function digitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
  }

  /** Normalize enterprise number to BE + 10 digits, or '' if empty. */
  function normalizeKbo(raw) {
    var d = digitsOnly(raw);
    if (!d) return '';
    if (d.length === 9) d = '0' + d;
    if (d.length === 10) return 'BE' + d;
    return null;
  }

  function formatKboDisplay(normalized) {
    var n = normalizeKbo(normalized);
    if (!n || n.length !== 12) return trimStr(normalized);
    var d = n.slice(2);
    return 'BE ' + d.slice(0, 4) + '.' + d.slice(4, 7) + '.' + d.slice(7);
  }

  /** Belgian VAT / enterprise checksum when 10 digits present. */
  function kboChecksumOk(normalized) {
    var n = normalizeKbo(normalized);
    if (!n || n.length !== 12) return false;
    var d = n.slice(2);
    var base = parseInt(d.slice(0, 8), 10);
    var check = parseInt(d.slice(8), 10);
    if (!Number.isFinite(base) || !Number.isFinite(check)) return false;
    return 97 - (base % 97) === check;
  }

  function validateKbo(raw) {
    var t = trimStr(raw);
    if (!t) return { ok: true, value: '', empty: true };
    var n = normalizeKbo(t);
    if (!n) return { ok: false, code: 'invalid_kbo', message: 'Ondernemingsnummer: 10 cijfers (BE 0XXX.XXX.XXX).' };
    if (!kboChecksumOk(n)) {
      return { ok: false, code: 'invalid_kbo', message: 'Ongeldig ondernemingsnummer (controlecijfer).' };
    }
    return { ok: true, value: n, display: formatKboDisplay(n) };
  }

  function validateBtwNumber(raw, opts) {
    opts = opts || {};
    var t = trimStr(raw);
    if (!t) {
      if (opts.required) {
        return { ok: false, code: 'invalid_btw', message: 'BTW-nummer is verplicht als je BTW-plichtig bent.' };
      }
      return { ok: true, value: '', empty: true };
    }
    return validateKbo(t);
  }

  function validatePostcode(raw) {
    var t = trimStr(raw);
    if (!t) return { ok: true, value: '', empty: true };
    if (!/^[1-9][0-9]{3}$/.test(t)) {
      return { ok: false, code: 'invalid_postcode', message: 'Postcode: 4 cijfers (1000–9999).' };
    }
    return { ok: true, value: t };
  }

  function normalizePhone(raw) {
    var t = trimStr(raw).replace(/[\s./-]/g, '');
    if (!t) return '';
    if (t.indexOf('0032') === 0) t = '+32' + t.slice(4);
    if (t.charAt(0) === '0' && t.length >= 9) {
      return '+32' + t.slice(1);
    }
    if (t.indexOf('+32') === 0) return t;
    if (t.indexOf('32') === 0 && t.length >= 10) return '+' + t;
    return t;
  }

  function formatPhoneDisplay(normalized) {
    var n = normalizePhone(normalized);
    if (!n) return '';
    if (n.indexOf('+32') === 0) {
      var rest = n.slice(3);
      if (rest.length === 9) {
        return '+32 ' + rest.slice(0, 3) + ' ' + rest.slice(3, 5) + ' ' + rest.slice(5, 7) + ' ' + rest.slice(7);
      }
      if (rest.length === 8) {
        return '+32 ' + rest.slice(0, 2) + ' ' + rest.slice(2, 4) + ' ' + rest.slice(4, 6) + ' ' + rest.slice(6);
      }
    }
    return n;
  }

  function validatePhone(raw) {
    var t = trimStr(raw);
    if (!t) return { ok: true, value: '', empty: true };
    var n = normalizePhone(t);
    var digits = digitsOnly(n.indexOf('+') === 0 ? n.slice(1) : n);
    // BE national: 32 + 8 or 9 subscriber digits
    if (digits.indexOf('32') === 0) {
      var sub = digits.slice(2);
      if (sub.length === 8 || sub.length === 9) {
        return { ok: true, value: '+32' + sub, display: formatPhoneDisplay('+32' + sub) };
      }
    }
    return { ok: false, code: 'invalid_phone', message: 'Telefoon: Belgisch nummer (+32 of 0…).' };
  }

  function validateEmail(raw) {
    var t = trimStr(raw).toLowerCase();
    if (!t) return { ok: true, value: '', empty: true };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      return { ok: false, code: 'invalid_email', message: 'Ongeldig e-mailadres.' };
    }
    return { ok: true, value: t };
  }

  function validateWebsite(raw) {
    var t = trimStr(raw);
    if (!t) return { ok: true, value: '', empty: true };
    if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
    try {
      var u = new URL(t);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad');
      return { ok: true, value: u.toString().replace(/\/$/, '') === u.origin ? u.origin + '/' : u.toString() };
    } catch (e) {
      return { ok: false, code: 'invalid_website', message: 'Website: geldige URL (https://…).' };
    }
  }

  function enumId(list, raw) {
    var t = trimStr(raw);
    if (!t) return '';
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === t) return t;
    }
    return null;
  }

  function emptyCompany() {
    return {
      legal_name: '',
      display_name: '',
      rechtsvorm: '',
      kbo: '',
      btw_plichtig: null,
      btw_nummer: '',
      adres: '',
      postcode: '',
      gemeente: '',
      gewest: '',
      website: '',
      email: '',
      phone: '',
      contact_name: '',
      contact_role: '',
      language: 'nl-BE'
    };
  }

  function emptyServiceArea() {
    return {
      mode: '',
      radius_km: null,
      provinces: [],
      regions: [],
      public_text: '',
      exclusions: ''
    };
  }

  function pickCompany(src) {
    var out = emptyCompany();
    if (!isPlainObject(src)) return out;
    COMPANY_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
    });
    if (out.btw_plichtig === true || out.btw_plichtig === false) {
      /* keep */
    } else if (out.btw_plichtig === 'true' || out.btw_plichtig === 'ja') {
      out.btw_plichtig = true;
    } else if (out.btw_plichtig === 'false' || out.btw_plichtig === 'nee') {
      out.btw_plichtig = false;
    } else if (out.btw_plichtig == null || out.btw_plichtig === '') {
      out.btw_plichtig = null;
    } else {
      out.btw_plichtig = !!out.btw_plichtig;
    }
    return out;
  }

  function pickServiceArea(src) {
    var out = emptyServiceArea();
    if (!isPlainObject(src)) return out;
    SERVICE_AREA_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
    });
    if (!Array.isArray(out.provinces)) out.provinces = [];
    if (!Array.isArray(out.regions)) out.regions = [];
    if (out.radius_km === '' || out.radius_km == null) out.radius_km = null;
    else {
      var n = Number(out.radius_km);
      out.radius_km = Number.isFinite(n) ? n : null;
    }
    return out;
  }

  /**
   * Normalize + soft-validate company/service_area for autosave.
   * Empty fields allowed; malformed formats rejected.
   */
function sanitizeP2Patch(draft) {
    if (draft == null) return { ok: true, draft: null };
    if (!isPlainObject(draft)) return { ok: false, code: 'invalid_draft' };

    var out = {};
    Object.keys(draft).forEach(function (k) {
      out[k] = draft[k];
    });

    if (Object.prototype.hasOwnProperty.call(draft, 'company')) {
      if (draft.company != null && !isPlainObject(draft.company)) {
        return { ok: false, code: 'invalid_draft', message: 'company must be an object' };
      }
      var rawCompany = draft.company || {};
      var unknown = Object.keys(rawCompany).filter(function (k) {
        return COMPANY_KEYS.indexOf(k) < 0;
      });
      if (unknown.length) {
        return { ok: false, code: 'invalid_draft', message: 'Unknown company fields: ' + unknown.join(', ') };
      }

      var company = {};
      COMPANY_KEYS.forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(rawCompany, k)) return;
        company[k] = rawCompany[k];
      });

      if (Object.prototype.hasOwnProperty.call(company, 'btw_plichtig')) {
        if (company.btw_plichtig === true || company.btw_plichtig === false) {
          /* keep */
        } else if (company.btw_plichtig === 'true' || company.btw_plichtig === 'ja') {
          company.btw_plichtig = true;
        } else if (company.btw_plichtig === 'false' || company.btw_plichtig === 'nee') {
          company.btw_plichtig = false;
        } else if (company.btw_plichtig == null || company.btw_plichtig === '') {
          company.btw_plichtig = null;
        } else {
          company.btw_plichtig = !!company.btw_plichtig;
        }
      }

      if (company.legal_name != null) {
        company.legal_name = trimStr(company.legal_name);
        if (company.legal_name && (company.legal_name.length < 2 || company.legal_name.length > 120)) {
          return { ok: false, code: 'invalid_field', message: 'Officiële naam: 2–120 tekens.' };
        }
      }
      if (company.display_name != null) {
        company.display_name = trimStr(company.display_name);
        if (company.display_name && (company.display_name.length < 2 || company.display_name.length > 80)) {
          return { ok: false, code: 'invalid_field', message: 'Handelsnaam: 2–80 tekens.' };
        }
      }
      if (company.rechtsvorm != null && company.rechtsvorm !== '') {
        if (enumId(RECHTSVORMEN, company.rechtsvorm) == null) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige rechtsvorm.' };
        }
      }
      if (Object.prototype.hasOwnProperty.call(company, 'kbo')) {
        var kbo = validateKbo(company.kbo);
        if (!kbo.ok) return kbo;
        company.kbo = kbo.value;
      }
      if (Object.prototype.hasOwnProperty.call(company, 'btw_nummer')) {
        var btw = validateBtwNumber(company.btw_nummer, { required: false });
        if (!btw.ok) return btw;
        company.btw_nummer = btw.value;
      }
      if (company.btw_plichtig === false) {
        company.btw_nummer = '';
      }
      if (Object.prototype.hasOwnProperty.call(company, 'postcode')) {
        var pc = validatePostcode(company.postcode);
        if (!pc.ok) return pc;
        company.postcode = pc.value;
      }
      if (company.gewest != null && company.gewest !== '') {
        if (enumId(GEWESTEN, company.gewest) == null) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldig gewest.' };
        }
      }
      if (Object.prototype.hasOwnProperty.call(company, 'website')) {
        var web = validateWebsite(company.website);
        if (!web.ok) return web;
        company.website = web.empty ? '' : web.value;
      }
      if (Object.prototype.hasOwnProperty.call(company, 'email')) {
        var em = validateEmail(company.email);
        if (!em.ok) return em;
        company.email = em.value;
      }
      if (Object.prototype.hasOwnProperty.call(company, 'phone')) {
        var ph = validatePhone(company.phone);
        if (!ph.ok) return ph;
        company.phone = ph.value;
      }
      if (company.language != null && company.language !== '') {
        if (enumId(LANGUAGES, company.language) == null) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige taal.' };
        }
      }
      if (company.adres != null) {
        company.adres = trimStr(company.adres);
        if (company.adres.length > 160) {
          return { ok: false, code: 'invalid_field', message: 'Adres te lang.' };
        }
      }
      if (company.gemeente != null) {
        company.gemeente = trimStr(company.gemeente);
        if (company.gemeente.length > 80) {
          return { ok: false, code: 'invalid_field', message: 'Gemeente te lang.' };
        }
      }
      if (company.contact_name != null) {
        company.contact_name = trimStr(company.contact_name);
        if (company.contact_name.length > 80) {
          return { ok: false, code: 'invalid_field', message: 'Contactpersoon te lang.' };
        }
      }
      if (company.contact_role != null) {
        company.contact_role = trimStr(company.contact_role);
        if (company.contact_role.length > 80) {
          return { ok: false, code: 'invalid_field', message: 'Functie te lang.' };
        }
      }

      out.company = company;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'service_area')) {
      if (draft.service_area != null && !isPlainObject(draft.service_area)) {
        return { ok: false, code: 'invalid_draft', message: 'service_area must be an object' };
      }
      var rawArea = draft.service_area || {};
      var unkA = Object.keys(rawArea).filter(function (k) {
        return SERVICE_AREA_KEYS.indexOf(k) < 0;
      });
      if (unkA.length) {
        return { ok: false, code: 'invalid_draft', message: 'Unknown service_area fields: ' + unkA.join(', ') };
      }

      var area = {};
      SERVICE_AREA_KEYS.forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(rawArea, k)) return;
        area[k] = rawArea[k];
      });

      if (area.mode != null && area.mode !== '') {
        if (enumId(AREA_MODES, area.mode) == null) {
          return { ok: false, code: 'invalid_field', message: 'Ongeldige werkgebiedmodus.' };
        }
      }
      if (Object.prototype.hasOwnProperty.call(area, 'radius_km')) {
        if (area.radius_km === '' || area.radius_km == null) {
          area.radius_km = null;
        } else {
          var rn = Number(area.radius_km);
          if (!Number.isFinite(rn)) {
            return { ok: false, code: 'invalid_field', message: 'Radius: 5–150 km.' };
          }
          area.radius_km = rn;
          if (area.mode === 'radius' && (rn < 5 || rn > 150)) {
            return { ok: false, code: 'invalid_field', message: 'Radius: 5–150 km.' };
          }
        }
      }
      var provIds = PROVINCES.map(function (p) { return p.id; });
      if (Object.prototype.hasOwnProperty.call(area, 'provinces')) {
        if (!Array.isArray(area.provinces)) {
          return { ok: false, code: 'invalid_draft', message: 'provinces must be an array' };
        }
        area.provinces = area.provinces.filter(function (id) {
          return provIds.indexOf(id) >= 0;
        });
      }
      var gewestIds = GEWESTEN.map(function (g) { return g.id; });
      if (Object.prototype.hasOwnProperty.call(area, 'regions')) {
        if (!Array.isArray(area.regions)) {
          return { ok: false, code: 'invalid_draft', message: 'regions must be an array' };
        }
        area.regions = area.regions.filter(function (id) {
          return gewestIds.indexOf(id) >= 0;
        });
      }
      if (Object.prototype.hasOwnProperty.call(area, 'public_text')) {
        area.public_text = trimStr(area.public_text).slice(0, 80);
      }
      if (Object.prototype.hasOwnProperty.call(area, 'exclusions')) {
        area.exclusions = trimStr(area.exclusions).slice(0, 120);
      }

      out.service_area = area;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'craft')) {
      var craftSan = sanitizeCraft(draft.craft);
      if (!craftSan.ok) return craftSan;
      out.craft = craftSan.craft;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'offer')) {
      var offerSan = sanitizeOffer(draft.offer, draft.craft || out.craft || null);
      if (!offerSan.ok) return offerSan;
      out.offer = offerSan.offer;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'story')) {
      var storySan = sanitizeStory(draft.story);
      if (!storySan.ok) return storySan;
      out.story = storySan.story;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'portfolio')) {
      var portSan = sanitizePortfolio(draft.portfolio);
      if (!portSan.ok) return portSan;
      out.portfolio = portSan.portfolio;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'confirmations')) {
      var confSan = sanitizeConfirmations(draft.confirmations);
      if (!confSan.ok) return confSan;
      out.confirmations = confSan.confirmations;
    }

    if (Object.prototype.hasOwnProperty.call(draft, 'cover_asset_id')) {
      return {
        ok: false,
        code: 'invalid_draft',
        message: 'cover_asset_id is managed via portfolio assets, not draft'
      };
    }

    return { ok: true, draft: out };
  }

  function emptyConfirmations() {
    return { data_correct: false, editorial_ok: false };
  }

  function pickConfirmations(src) {
    var out = emptyConfirmations();
    if (!isPlainObject(src)) return out;
    if (src.data_correct === true) out.data_correct = true;
    if (src.editorial_ok === true) out.editorial_ok = true;
    return out;
  }

  function sanitizeConfirmations(raw) {
    if (raw == null) return { ok: true, confirmations: null };
    if (!isPlainObject(raw)) {
      return { ok: false, code: 'invalid_draft', message: 'confirmations must be an object' };
    }
    var unknown = Object.keys(raw).filter(function (k) {
      return CONFIRMATION_KEYS.indexOf(k) < 0;
    });
    if (unknown.length) {
      return {
        ok: false,
        code: 'invalid_draft',
        message: 'Unknown confirmation fields: ' + unknown.join(', ')
      };
    }
    var conf = {};
    if (Object.prototype.hasOwnProperty.call(raw, 'data_correct')) {
      if (raw.data_correct !== true && raw.data_correct !== false) {
        return { ok: false, code: 'invalid_field', message: 'Bevestiging juistheid ongeldig.' };
      }
      conf.data_correct = raw.data_correct === true;
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'editorial_ok')) {
      if (raw.editorial_ok !== true && raw.editorial_ok !== false) {
        return { ok: false, code: 'invalid_field', message: 'Redactioneel akkoord ongeldig.' };
      }
      conf.editorial_ok = raw.editorial_ok === true;
    }
    return { ok: true, confirmations: conf };
  }

  function emptyStory() {
    return {
      years_active: '',
      team_size: '',
      strength: '',
      prefer: '',
      avoid: '',
      care: '',
      why_choose: '',
      materials: '',
      must_know: '',
      guarantee_line: '',
      show_years_public: true,
      show_team_public: false
    };
  }

  function pickStory(src) {
    var out = emptyStory();
    if (!isPlainObject(src)) return out;
    STORY_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
    });
    if (out.show_years_public === true || out.show_years_public === false) {
      /* keep */
    } else if (out.show_years_public === 'true' || out.show_years_public === 'ja') {
      out.show_years_public = true;
    } else if (out.show_years_public === 'false' || out.show_years_public === 'nee') {
      out.show_years_public = false;
    } else if (out.show_years_public == null || out.show_years_public === '') {
      out.show_years_public = true;
    } else {
      out.show_years_public = !!out.show_years_public;
    }
    if (out.show_team_public === true || out.show_team_public === false) {
      /* keep */
    } else if (out.show_team_public === 'true' || out.show_team_public === 'ja') {
      out.show_team_public = true;
    } else if (out.show_team_public === 'false' || out.show_team_public === 'nee') {
      out.show_team_public = false;
    } else if (out.show_team_public == null || out.show_team_public === '') {
      out.show_team_public = false;
    } else {
      out.show_team_public = !!out.show_team_public;
    }
    return out;
  }

  function clampText(raw, max) {
    return trimStr(raw).slice(0, max);
  }

  function sanitizeStory(rawStory) {
    if (rawStory == null) return { ok: true, story: null };
    if (!isPlainObject(rawStory)) {
      return { ok: false, code: 'invalid_draft', message: 'story must be an object' };
    }
    var unknown = Object.keys(rawStory).filter(function (k) {
      return STORY_KEYS.indexOf(k) < 0;
    });
    if (unknown.length) {
      return { ok: false, code: 'invalid_draft', message: 'Unknown story fields: ' + unknown.join(', ') };
    }

    var story = {};
    var has = function (k) {
      return Object.prototype.hasOwnProperty.call(rawStory, k);
    };

    if (has('years_active')) {
      var ya = trimStr(rawStory.years_active);
      if (ya && enumId(YEARS_ACTIVE, ya) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige keuze voor jaren actief.' };
      }
      story.years_active = ya;
    }
    if (has('team_size')) {
      var ts = trimStr(rawStory.team_size);
      if (ts && enumId(TEAM_SIZES, ts) == null) {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige teamgrootte.' };
      }
      story.team_size = ts;
    }
    if (has('strength')) {
      story.strength = clampText(rawStory.strength, 160);
      if (story.strength && story.strength.length < 10) {
        return { ok: false, code: 'invalid_field', message: 'Sterk in: minstens 10 tekens.' };
      }
    }
    if (has('prefer')) {
      story.prefer = clampText(rawStory.prefer, 160);
      if (story.prefer && story.prefer.length < 10) {
        return { ok: false, code: 'invalid_field', message: 'Liever wel: minstens 10 tekens.' };
      }
    }
    if (has('avoid')) story.avoid = clampText(rawStory.avoid, 160);
    if (has('care')) story.care = clampText(rawStory.care, 160);
    if (has('why_choose')) story.why_choose = clampText(rawStory.why_choose, 160);
    if (has('materials')) story.materials = clampText(rawStory.materials, 160);
    if (has('must_know')) story.must_know = clampText(rawStory.must_know, 200);
    if (has('guarantee_line')) story.guarantee_line = clampText(rawStory.guarantee_line, 120);

    if (has('show_years_public')) {
      if (rawStory.show_years_public === true || rawStory.show_years_public === false) {
        story.show_years_public = rawStory.show_years_public;
      } else if (rawStory.show_years_public === 'true' || rawStory.show_years_public === 'ja') {
        story.show_years_public = true;
      } else if (rawStory.show_years_public === 'false' || rawStory.show_years_public === 'nee') {
        story.show_years_public = false;
      } else if (rawStory.show_years_public == null || rawStory.show_years_public === '') {
        story.show_years_public = true;
      } else {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige toggle voor jaren publiek.' };
      }
    }
    if (has('show_team_public')) {
      if (rawStory.show_team_public === true || rawStory.show_team_public === false) {
        story.show_team_public = rawStory.show_team_public;
      } else if (rawStory.show_team_public === 'true' || rawStory.show_team_public === 'ja') {
        story.show_team_public = true;
      } else if (rawStory.show_team_public === 'false' || rawStory.show_team_public === 'nee') {
        story.show_team_public = false;
      } else if (rawStory.show_team_public == null || rawStory.show_team_public === '') {
        story.show_team_public = false;
      } else {
        return { ok: false, code: 'invalid_field', message: 'Ongeldige toggle voor teamgrootte publiek.' };
      }
    }

    return { ok: true, story: story };
  }

  function sanitizePortfolio(raw) {
    if (raw == null) return { ok: true, portfolio: null };
    if (!isPlainObject(raw)) {
      return { ok: false, code: 'invalid_draft', message: 'portfolio must be an object' };
    }
    var unknown = Object.keys(raw).filter(function (k) {
      return PORTFOLIO_KEYS.indexOf(k) < 0;
    });
    if (unknown.length) {
      return {
        ok: false,
        code: 'invalid_draft',
        message: 'Unknown portfolio fields: ' + unknown.join(', ')
      };
    }
    return { ok: true, portfolio: {} };
  }

  /**
   * Client completeness before leaving P5 (V2: jaren + sterk in + liever wel).
   * Toggles always present with defaults when complete.
   */
  function validateP5Complete(draft) {
    var errors = {};
    var story = pickStory(draft && draft.story);

    if (!story.years_active || enumId(YEARS_ACTIVE, story.years_active) == null) {
      errors.years_active = 'Kies hoe lang jullie actief zijn.';
    }
    if (!trimStr(story.strength) || trimStr(story.strength).length < 10) {
      errors.strength = 'Vertel kort waar jullie sterk in zijn (min. 10 tekens).';
    } else if (trimStr(story.strength).length > 160) {
      errors.strength = 'Sterk in: max. 160 tekens.';
    }
    if (!trimStr(story.prefer) || trimStr(story.prefer).length < 10) {
      errors.prefer = 'Vertel welke projecten jullie liever wel doen (min. 10 tekens).';
    } else if (trimStr(story.prefer).length > 160) {
      errors.prefer = 'Liever wel: max. 160 tekens.';
    }
    if (story.team_size && enumId(TEAM_SIZES, story.team_size) == null) {
      errors.team_size = 'Ongeldige teamgrootte.';
    }
    if (trimStr(story.avoid).length > 160) errors.avoid = 'Max. 160 tekens.';
    if (trimStr(story.care).length > 160) errors.care = 'Max. 160 tekens.';
    if (trimStr(story.why_choose).length > 160) errors.why_choose = 'Max. 160 tekens.';
    if (trimStr(story.materials).length > 160) errors.materials = 'Max. 160 tekens.';
    if (trimStr(story.must_know).length > 200) errors.must_know = 'Max. 200 tekens.';
    if (trimStr(story.guarantee_line).length > 120) {
      errors.guarantee_line = 'Garantiezin: max. 120 tekens.';
    }
    if (story.show_years_public !== true && story.show_years_public !== false) {
      errors.show_years_public = 'Kies of jaren publiek getoond worden.';
    }
    if (story.show_team_public !== true && story.show_team_public !== false) {
      errors.show_team_public = 'Kies of teamgrootte publiek getoond wordt.';
    }

    return { ok: Object.keys(errors).length === 0, errors: errors, story: story };
  }

  /** Soft portfolio gate: 0 photos never block; only a soft nudge. */
  function validateP6Soft(assets) {
    var count = Array.isArray(assets) ? assets.length : 0;
    return {
      ok: true,
      photoCount: count,
      softNudge: count === 0,
      message:
        count === 0
          ? 'Foto’s helpen klanten jullie werk te zien — je mag ook verder zonder.'
          : ''
    };
  }

  /**
   * Merge craft patches without deep-merging conditionals/extras
   * (empty {} after category reset must clear prior answers).
   */
  function mergeCraft(base, patch) {
    var out = pickCraft(base);
    if (!isPlainObject(patch)) return out;
    if (Object.prototype.hasOwnProperty.call(patch, 'primary_category_id')) {
      out.primary_category_id = trimStr(patch.primary_category_id);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'service_ids')) {
      out.service_ids = Array.isArray(patch.service_ids) ? patch.service_ids.slice() : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'conditionals')) {
      out.conditionals = isPlainObject(patch.conditionals) ? Object.assign({}, patch.conditionals) : {};
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'extras')) {
      out.extras = isPlainObject(patch.extras) ? Object.assign({}, patch.extras) : {};
    }
    return out;
  }

  /**
   * Client completeness check before leaving P3 (not submit-gate).
   */
  function validateP3Complete(draft) {
    var errors = {};
    var craft = pickCraft(draft && draft.craft);
    var catId = craft.primary_category_id;
    if (!catId || !getCategory(catId)) {
      errors.primary_category_id = 'Kies een hoofdcategorie.';
      return { ok: false, errors: errors, craft: craft };
    }
    if (!craft.service_ids || !craft.service_ids.length) {
      errors.service_ids = 'Selecteer minstens één dienst.';
    }

    getConditionalsForSelected(catId, craft.service_ids).forEach(function (q) {
      if (!isRequiredQuestion(q)) return;
      var val = craft.conditionals[q.key];
      if (!answerSatisfiesRequired(q, val)) {
        errors['cond_' + q.key] = 'Beantwoord: ' + q.label;
      }
    });

    getOnboardExtras(catId).forEach(function (q) {
      if (isInfoQuestion(q)) return;
      if (!isRequiredQuestion(q)) return;
      var val = craft.extras[q.key];
      if (!answerSatisfiesRequired(q, val)) {
        errors['extra_' + q.key] = 'Beantwoord: ' + q.label;
      }
    });

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      craft: craft
    };
  }
  function validateP2Complete(draft) {
    var errors = {};
    var company = pickCompany(draft && draft.company);
    var area = pickServiceArea(draft && draft.service_area);

    function req(key, cond, msg) {
      if (!cond) errors[key] = msg;
    }

    req('legal_name', trimStr(company.legal_name).length >= 2, 'Vul de officiële bedrijfsnaam in.');
    req('display_name', trimStr(company.display_name).length >= 2, 'Vul de handelsnaam in.');
    req('rechtsvorm', !!enumId(RECHTSVORMEN, company.rechtsvorm), 'Kies een rechtsvorm.');
    var kbo = validateKbo(company.kbo);
    if (!kbo.ok || kbo.empty) errors.kbo = kbo.message || 'Vul een geldig ondernemingsnummer in.';
    if (company.btw_plichtig !== true && company.btw_plichtig !== false) {
      errors.btw_plichtig = 'Geef aan of jullie BTW-plichtig zijn.';
    } else if (company.btw_plichtig === true) {
      var btw = validateBtwNumber(company.btw_nummer, { required: true });
      if (!btw.ok) errors.btw_nummer = btw.message;
    }
    req('adres', trimStr(company.adres).length >= 2, 'Vul het adres in.');
    var pc = validatePostcode(company.postcode);
    if (!pc.ok || pc.empty) errors.postcode = pc.message || 'Vul de postcode in.';
    req('gemeente', trimStr(company.gemeente).length >= 2, 'Vul de gemeente in.');
    req('gewest', !!enumId(GEWESTEN, company.gewest), 'Kies een gewest.');
    if (company.website) {
      var web = validateWebsite(company.website);
      if (!web.ok) errors.website = web.message;
    }
    var em = validateEmail(company.email);
    if (!em.ok || em.empty) errors.email = em.message || 'Vul een zakelijk e-mailadres in.';
    var ph = validatePhone(company.phone);
    if (!ph.ok || ph.empty) errors.phone = ph.message || 'Vul een telefoonnummer in.';
    req('contact_name', trimStr(company.contact_name).length >= 2, 'Vul de contactpersoon in.');
    req('language', !!enumId(LANGUAGES, company.language), 'Kies een taal.');

    req('mode', !!enumId(AREA_MODES, area.mode), 'Kies een werkgebiedmodus.');
    if (area.mode === 'radius') {
      if (area.radius_km == null || area.radius_km < 5 || area.radius_km > 150) {
        errors.radius_km = 'Radius: 5–150 km.';
      }
    }
    if (area.mode === 'provincies' && (!area.provinces || !area.provinces.length)) {
      errors.provinces = 'Selecteer minstens één provincie.';
    }
    if (area.mode === 'gewest' && (!area.regions || !area.regions.length)) {
      errors.regions = 'Selecteer minstens één gewest.';
    }
    req('public_text', trimStr(area.public_text).length >= 2, 'Vul de publieke werkgebiedtekst in.');

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      company: company,
      service_area: area
    };
  }

  function suggestPublicText(company, area) {
    company = pickCompany(company);
    area = pickServiceArea(area);
    var place = trimStr(company.gemeente) || 'jullie regio';
    if (area.mode === 'heel_belgie') return 'Heel België';
    if (area.mode === 'gewest' && area.regions && area.regions.length) {
      var labels = area.regions.map(function (id) {
        var g = GEWESTEN.filter(function (x) { return x.id === id; })[0];
        return g ? g.label : id;
      });
      return labels.join(', ');
    }
    if (area.mode === 'provincies' && area.provinces && area.provinces.length) {
      var pl = area.provinces.map(function (id) {
        var p = PROVINCES.filter(function (x) { return x.id === id; })[0];
        return p ? p.label : id;
      });
      if (pl.length <= 2) return pl.join(' en ');
      return pl.slice(0, 2).join(', ') + ' e.a.';
    }
    if (area.mode === 'radius' && area.radius_km) {
      return place + ' + ' + area.radius_km + ' km';
    }
    return place;
  }

  function previewModel(opts) {
    opts = opts || {};
    var company = pickCompany(opts.company);
    var area = pickServiceArea(opts.service_area);
    var craft = pickCraft(opts.craft);
    var name = trimStr(company.display_name) || trimStr(opts.fallbackName) || 'Jullie vakbedrijf';
    var areaText = trimStr(area.public_text) || suggestPublicText(company, area) || 'Werkgebied volgt';
    var cat = craft.primary_category_id ? getCategory(craft.primary_category_id) : null;
    var specialtyHint = cat
      ? cat.label + (craft.service_ids.length ? ' · ' + craft.service_ids.length + ' diensten' : '')
      : 'Ambacht volgt in de volgende stappen';
    return {
      displayName: name,
      areaText: areaText,
      locationLine: [trimStr(company.postcode), trimStr(company.gemeente)].filter(Boolean).join(' ') || 'Vestiging volgt',
      specialtyHint: specialtyHint
    };
  }

  /** Map field/error key → wizard step for P7 deep-links. */
  function stepIdForField(fieldKey) {
    var k = String(fieldKey || '');
    if (k === 'data_correct' || k === 'editorial_ok' || k.indexOf('confirm') === 0) {
      return 'controle';
    }
    if (
      k.indexOf('price_') === 0 ||
      k === 'vat_basis' ||
      k === 'project_minimum' ||
      k === 'client_types' ||
      k === 'response_time' ||
      k === 'urgency_jobs' ||
      k === 'capacity' ||
      k === 'start_month' ||
      k === 'visit_speed' ||
      k === 'visit_extra'
    ) {
      return 'aanbod';
    }
    if (
      k === 'primary_category_id' ||
      k === 'service_ids' ||
      k.indexOf('cond_') === 0 ||
      k.indexOf('extra_') === 0
    ) {
      return 'ambacht';
    }
    if (
      k === 'years_active' ||
      k === 'team_size' ||
      k === 'strength' ||
      k === 'prefer' ||
      k === 'avoid' ||
      k === 'care' ||
      k === 'why_choose' ||
      k === 'materials' ||
      k === 'must_know' ||
      k === 'guarantee_line' ||
      k === 'show_years_public' ||
      k === 'show_team_public'
    ) {
      return 'verhaal';
    }
    return 'bedrijf_bereik';
  }

  function deepLinkFor(stepId, fieldKey) {
    var path = '/professionals/onboarding/' + stepId;
    if (fieldKey) path += '?field=' + encodeURIComponent(fieldKey);
    return path;
  }

  function pushMissing(list, stepId, fieldKey, message) {
    list.push({
      stepId: stepId,
      fieldKey: fieldKey,
      message: message,
      href: deepLinkFor(stepId, fieldKey)
    });
  }

  function appendErrors(list, errors, defaultStep) {
    Object.keys(errors || {}).forEach(function (fieldKey) {
      var stepId = stepIdForField(fieldKey) || defaultStep;
      pushMissing(list, stepId, fieldKey, errors[fieldKey]);
    });
  }

  /**
   * V2 D.9 submit gates — server + client shared.
   * Portfolio photos / website / optional story / Google are NOT required.
   */
  function evaluateSubmitGates(draft) {
    var missing = [];
    var d = isPlainObject(draft) ? draft : {};

    var p2 = validateP2Complete(d);
    if (!p2.ok) appendErrors(missing, p2.errors, 'bedrijf_bereik');

    var p3 = validateP3Complete(d);
    if (!p3.ok) appendErrors(missing, p3.errors, 'ambacht');

    var p4 = validateP4Complete(d);
    if (!p4.ok) appendErrors(missing, p4.errors, 'aanbod');

    var p5 = validateP5Complete(d);
    if (!p5.ok) appendErrors(missing, p5.errors, 'verhaal');

    var conf = pickConfirmations(d.confirmations);
    if (!conf.data_correct) {
      pushMissing(
        missing,
        'controle',
        'data_correct',
        'Bevestig dat de gegevens correct zijn.'
      );
    }
    if (!conf.editorial_ok) {
      pushMissing(
        missing,
        'controle',
        'editorial_ok',
        'Bevestig dat ELYAN redactioneel mag aanpassen met behoud van feiten.'
      );
    }

    return {
      ok: missing.length === 0,
      missing: missing,
      confirmations: conf,
      sections: {
        bedrijf_bereik: p2.ok,
        ambacht: p3.ok,
        aanbod: p4.ok,
        verhaal: p5.ok,
        confirmations: !!(conf.data_correct && conf.editorial_ok)
      }
    };
  }

  function labelForEnum(list, id) {
    var hit = (list || []).filter(function (x) { return x.id === id; })[0];
    return hit ? hit.label : id || '';
  }

  function buildControleSections(draft, assets) {
    var d = isPlainObject(draft) ? draft : {};
    var company = pickCompany(d.company);
    var area = pickServiceArea(d.service_area);
    var craft = pickCraft(d.craft);
    var offer = pickOffer(d.offer);
    var story = pickStory(d.story);
    var gates = evaluateSubmitGates(d);
    var photoCount = Array.isArray(assets) ? assets.length : 0;

    function missingForStep(stepId) {
      return gates.missing.filter(function (m) { return m.stepId === stepId; });
    }

    var cat = craft.primary_category_id ? getCategory(craft.primary_category_id) : null;
    var serviceLabels = (craft.service_ids || []).map(function (sid) {
      var svcs = craft.primary_category_id ? getServices(craft.primary_category_id) : [];
      var s = svcs.filter(function (x) { return x.id === sid; })[0];
      return s ? s.label : sid;
    });

    var priceBits = (craft.service_ids || []).map(function (sid) {
      var sp = offer.service_prices[sid] || emptyServicePrice();
      var label = serviceLabels[(craft.service_ids || []).indexOf(sid)] || sid;
      if (!sp.pricing_model) return label + ': prijs volgt';
      if (sp.pricing_model === 'on_request') return label + ': op aanvraag';
      var range = sp.min_price != null ? 'vanaf €' + sp.min_price : '';
      if (sp.max_price != null) range += (range ? '–' : '') + '€' + sp.max_price;
      return label + (range ? ' · ' + range : '');
    });

    return [
      {
        id: 'bedrijf_bereik',
        stepId: 'bedrijf_bereik',
        title: 'Bedrijf & bereik',
        ok: gates.sections.bedrijf_bereik,
        lines: [
          (trimStr(company.display_name) || trimStr(company.legal_name) || 'Bedrijfsnaam volgt') +
            (company.rechtsvorm ? ' · ' + labelForEnum(RECHTSVORMEN, company.rechtsvorm) : ''),
          company.kbo ? formatKboDisplay(company.kbo) : 'KBO volgt',
          [trimStr(company.adres), trimStr(company.postcode), trimStr(company.gemeente)]
            .filter(Boolean)
            .join(', ') || 'Adres volgt',
          trimStr(area.public_text) || 'Werkgebied volgt',
          trimStr(company.email) || 'Contact volgt'
        ].filter(Boolean),
        missing: missingForStep('bedrijf_bereik')
      },
      {
        id: 'ambacht',
        stepId: 'ambacht',
        title: 'Ambacht + diensten',
        ok: gates.sections.ambacht,
        lines: [
          cat ? cat.label : 'Categorie volgt',
          serviceLabels.length ? serviceLabels.join(', ') : 'Diensten volgen'
        ],
        missing: missingForStep('ambacht')
      },
      {
        id: 'aanbod',
        stepId: 'aanbod',
        title: 'Aanbod / prijzen / beschikbaarheid',
        ok: gates.sections.aanbod,
        lines: [
          priceBits.length ? priceBits.slice(0, 3).join(' · ') : 'Prijzen volgen',
          offer.client_types && offer.client_types.length
            ? 'Klanttypes: ' + offer.client_types.join(', ')
            : '',
          offer.response_time ? 'Reactie: ' + labelForEnum(RESPONSE_TIMES, offer.response_time) : '',
          offer.capacity ? 'Capaciteit: ' + labelForEnum(getCapacityOptions(), offer.capacity) : '',
          offer.start_month ? 'Start: ' + labelForEnum(listStartMonths(), offer.start_month) : ''
        ].filter(Boolean),
        missing: missingForStep('aanbod')
      },
      {
        id: 'verhaal',
        stepId: 'verhaal',
        title: 'Verhaal',
        ok: gates.sections.verhaal,
        lines: [
          story.years_active ? 'Actief: ' + labelForEnum(YEARS_ACTIVE, story.years_active) : 'Jaren volgen',
          trimStr(story.strength) || 'Sterk in volgt',
          trimStr(story.prefer) || 'Liever wel volgt'
        ],
        missing: missingForStep('verhaal')
      },
      {
        id: 'portfolio',
        stepId: 'portfolio',
        title: 'Portfolio',
        ok: true,
        lines: [
          photoCount === 0
            ? 'Nog geen foto’s (niet verplicht om in te dienen)'
            : photoCount + (photoCount === 1 ? ' foto' : ' foto’s')
        ],
        missing: []
      }
    ];
  }

  function ratioOk(errors, totalKeys) {
    var miss = Object.keys(errors || {}).length;
    if (totalKeys <= 0) return 0;
    return Math.max(0, Math.min(1, (totalKeys - miss) / totalKeys));
  }

  /**
   * V2 D.5 Profielsterkte — derived only; never a submit/authZ gate.
   * Weights: identity 25 · craft 25 · offer 20 · story 15 · portfolio 15.
   * Tiers on 0–100: Basis &lt;50 · Sterk 50–79 · Uitstekend ≥80.
   */
  function evaluateProfileStrength(draft, assets) {
    var d = isPlainObject(draft) ? draft : {};
    var p2 = validateP2Complete(d);
    var p3 = validateP3Complete(d);
    var p4 = validateP4Complete(d);
    var p5 = validateP5Complete(d);
    var photoCount = Array.isArray(assets) ? assets.length : 0;
    var hasCover = Array.isArray(assets) && assets.some(function (a) {
      return a && (a.isCover || a.is_cover);
    });

    var identityScore = p2.ok ? 1 : ratioOk(p2.errors, 14);
    var craftScore = p3.ok ? 1 : ratioOk(p3.errors, 4);
    var offerScore = p4.ok ? 1 : ratioOk(p4.errors, 8);
    var storyScore = p5.ok ? 1 : ratioOk(p5.errors, 5);

    var story = pickStory(d.story);
    var optionalFilled = 0;
    var optionalTotal = 6;
    ['avoid', 'care', 'why_choose', 'materials', 'must_know', 'guarantee_line'].forEach(function (k) {
      if (trimStr(story[k]).length >= 8) optionalFilled += 1;
    });
    if (p5.ok) {
      storyScore = Math.min(1, 0.75 + (0.25 * optionalFilled) / optionalTotal);
    }

    var portfolioScore = 0;
    if (photoCount >= 1) portfolioScore = 0.45;
    if (photoCount >= 3) portfolioScore = 0.75;
    if (photoCount >= 5) portfolioScore = 0.9;
    if (photoCount >= 1 && hasCover) portfolioScore = Math.min(1, portfolioScore + 0.1);
    if (photoCount >= 8) portfolioScore = 1;

    var score = Math.round(
      identityScore * STRENGTH_WEIGHTS.identity +
        craftScore * STRENGTH_WEIGHTS.craft +
        offerScore * STRENGTH_WEIGHTS.offer +
        storyScore * STRENGTH_WEIGHTS.story +
        portfolioScore * STRENGTH_WEIGHTS.portfolio
    );

    var level = 'Basis';
    if (score >= 80) level = 'Uitstekend';
    else if (score >= 50) level = 'Sterk';

    var tip = 'Vul de verplichte gegevens verder aan.';
    if (!p2.ok) tip = 'Vervolledig Bedrijf & bereik — zo herkennen klanten jullie meteen.';
    else if (!p3.ok) tip = 'Kies categorie en diensten onder Ambacht.';
    else if (!p4.ok) tip = 'Vul richtprijzen of “op aanvraag” in bij Aanbod.';
    else if (!p5.ok) tip = 'Schrijf kort waar jullie sterk in zijn onder Verhaal.';
    else if (photoCount === 0) tip = 'Voeg een coverfoto toe — dat maakt jullie profiel tastbaar.';
    else if (!hasCover) tip = 'Kies een coverfoto voor jullie marketplace-voorbeeld.';
    else if (optionalFilled < 2) tip = 'Vul optionele verhaalvelden aan, zoals materialen of garantiezin.';
    else if (photoCount < 3) tip = 'Voeg nog een paar projectfoto’s toe voor een sterker portfolio.';
    else tip = 'Jullie basis staat: blijf foto’s en korte teksten aanscherpen.';

    var tips = [];
    if (photoCount === 0) tips.push('Voeg minstens één projectfoto toe als cover.');
    if (p5.ok && !trimStr(story.why_choose)) tips.push('Vul “Waarom klanten kiezen” in (optioneel, wel sterk).');
    if (p5.ok && !trimStr(story.guarantee_line)) tips.push('Voeg een korte garantiezin toe.');
    if (p2.ok && !trimStr(pickCompany(d.company).website)) {
      tips.push('Website is optioneel — handig als klanten meer willen zien.');
    }
    if (!tips.length) tips.push(tip);

    return {
      score: score,
      level: level,
      tip: tip,
      tips: tips.slice(0, 3),
      parts: {
        identity: Math.round(identityScore * STRENGTH_WEIGHTS.identity),
        craft: Math.round(craftScore * STRENGTH_WEIGHTS.craft),
        offer: Math.round(offerScore * STRENGTH_WEIGHTS.offer),
        story: Math.round(storyScore * STRENGTH_WEIGHTS.story),
        portfolio: Math.round(portfolioScore * STRENGTH_WEIGHTS.portfolio)
      }
    };
  }

  function isStoryCoreKey(k) {
    return STORY_CORE_KEYS.indexOf(k) >= 0;
  }

  function isStoryOptionalKey(k) {
    return STORY_OPTIONAL_KEYS.indexOf(k) >= 0;
  }

  return {
    RECHTSVORMEN: RECHTSVORMEN,
    GEWESTEN: GEWESTEN,
    LANGUAGES: LANGUAGES,
    AREA_MODES: AREA_MODES,
    PROVINCES: PROVINCES,
    COMPANY_KEYS: COMPANY_KEYS,
    SERVICE_AREA_KEYS: SERVICE_AREA_KEYS,
    CRAFT_KEYS: CRAFT_KEYS,
    OFFER_KEYS: OFFER_KEYS,
    STORY_KEYS: STORY_KEYS,
    STORY_CORE_KEYS: STORY_CORE_KEYS,
    STORY_OPTIONAL_KEYS: STORY_OPTIONAL_KEYS,
    CONFIRMATION_KEYS: CONFIRMATION_KEYS,
    PORTFOLIO_KEYS: PORTFOLIO_KEYS,
    YEARS_ACTIVE: YEARS_ACTIVE,
    TEAM_SIZES: TEAM_SIZES,
    PORTFOLIO_MAX_ASSETS: PORTFOLIO_MAX_ASSETS,
    PORTFOLIO_MAX_BYTES: PORTFOLIO_MAX_BYTES,
    PORTFOLIO_TITLE_MAX: PORTFOLIO_TITLE_MAX,
    CLIENT_TYPES: CLIENT_TYPES,
    RESPONSE_TIMES: RESPONSE_TIMES,
    VAT_BASIS_OPTIONS: VAT_BASIS_OPTIONS,
    URGENCY_OPTIONS: URGENCY_OPTIONS,
    STRENGTH_WEIGHTS: STRENGTH_WEIGHTS,
    emptyCompany: emptyCompany,
    emptyServiceArea: emptyServiceArea,
    emptyCraft: emptyCraft,
    emptyOffer: emptyOffer,
    emptyServicePrice: emptyServicePrice,
    emptyStory: emptyStory,
    emptyConfirmations: emptyConfirmations,
    pickCompany: pickCompany,
    pickServiceArea: pickServiceArea,
    pickCraft: pickCraft,
    pickOffer: pickOffer,
    pickStory: pickStory,
    pickConfirmations: pickConfirmations,
    normalizeKbo: normalizeKbo,
    formatKboDisplay: formatKboDisplay,
    validateKbo: validateKbo,
    validateBtwNumber: validateBtwNumber,
    validatePostcode: validatePostcode,
    normalizePhone: normalizePhone,
    formatPhoneDisplay: formatPhoneDisplay,
    validatePhone: validatePhone,
    validateEmail: validateEmail,
    validateWebsite: validateWebsite,
    sanitizeP2Patch: sanitizeP2Patch,
    sanitizeCraft: sanitizeCraft,
    sanitizeOffer: sanitizeOffer,
    sanitizeStory: sanitizeStory,
    sanitizePortfolio: sanitizePortfolio,
    sanitizeConfirmations: sanitizeConfirmations,
    mergeCraft: mergeCraft,
    mergeOffer: mergeOffer,
    pruneOfferToServices: pruneOfferToServices,
    validateP2Complete: validateP2Complete,
    validateP3Complete: validateP3Complete,
    validateP4Complete: validateP4Complete,
    validateP5Complete: validateP5Complete,
    validateP6Soft: validateP6Soft,
    evaluateSubmitGates: evaluateSubmitGates,
    evaluateProfileStrength: evaluateProfileStrength,
    buildControleSections: buildControleSections,
    stepIdForField: stepIdForField,
    deepLinkFor: deepLinkFor,
    isStoryCoreKey: isStoryCoreKey,
    isStoryOptionalKey: isStoryOptionalKey,
    hasCategoryDependentP3Data: hasCategoryDependentP3Data,
    resetCraftForCategoryChange: resetCraftForCategoryChange,
    listCategories: listCategories,
    getCategory: getCategory,
    getServices: getServices,
    getConditionalsForSelected: getConditionalsForSelected,
    getOnboardExtras: getOnboardExtras,
    getVisitOptions: getVisitOptions,
    getCapacityOptions: getCapacityOptions,
    getVisitExtraOptions: getVisitExtraOptions,
    pricingModelsForService: pricingModelsForService,
    unitHintForService: unitHintForService,
    priceModelLabel: priceModelLabel,
    showUrgencyJobs: showUrgencyJobs,
    hasCiProjectMinimum: hasCiProjectMinimum,
    listStartMonths: listStartMonths,
    modelNeedsMin: modelNeedsMin,
    modelNeedsMax: modelNeedsMax,
    isInfoQuestion: isInfoQuestion,
    isRequiredQuestion: isRequiredQuestion,
    suggestPublicText: suggestPublicText,
    previewModel: previewModel
  };
});
