/**
 * Phase B Sprint 3–4 — P1/P2 + P3 Ambacht draft helpers (V2 frozen).
 * Browser (script tag) + Node (require) for offline tests.
 * P3 content comes from Category Intelligence (PartnerOnboardingEngine).
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

    return { ok: true, draft: out };
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

  return {
    RECHTSVORMEN: RECHTSVORMEN,
    GEWESTEN: GEWESTEN,
    LANGUAGES: LANGUAGES,
    AREA_MODES: AREA_MODES,
    PROVINCES: PROVINCES,
    COMPANY_KEYS: COMPANY_KEYS,
    SERVICE_AREA_KEYS: SERVICE_AREA_KEYS,
    CRAFT_KEYS: CRAFT_KEYS,
    emptyCompany: emptyCompany,
    emptyServiceArea: emptyServiceArea,
    emptyCraft: emptyCraft,
    pickCompany: pickCompany,
    pickServiceArea: pickServiceArea,
    pickCraft: pickCraft,
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
    mergeCraft: mergeCraft,
    validateP2Complete: validateP2Complete,
    validateP3Complete: validateP3Complete,
    hasCategoryDependentP3Data: hasCategoryDependentP3Data,
    resetCraftForCategoryChange: resetCraftForCategoryChange,
    listCategories: listCategories,
    getCategory: getCategory,
    getServices: getServices,
    getConditionalsForSelected: getConditionalsForSelected,
    getOnboardExtras: getOnboardExtras,
    isInfoQuestion: isInfoQuestion,
    isRequiredQuestion: isRequiredQuestion,
    suggestPublicText: suggestPublicText,
    previewModel: previewModel
  };
});
