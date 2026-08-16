/**
 * Phase B Sprint 3 — P1/P2 draft helpers (V2 frozen).
 * Browser (script tag) + Node (require) for offline tests.
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

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
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

    return { ok: true, draft: out };
  }  /**
   * Client completeness check before leaving P2 (not submit-gate).
   */
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
    var name = trimStr(company.display_name) || trimStr(opts.fallbackName) || 'Jullie vakbedrijf';
    var areaText = trimStr(area.public_text) || suggestPublicText(company, area) || 'Werkgebied volgt';
    return {
      displayName: name,
      areaText: areaText,
      locationLine: [trimStr(company.postcode), trimStr(company.gemeente)].filter(Boolean).join(' ') || 'Vestiging volgt',
      specialtyHint: 'Ambacht volgt in de volgende stappen'
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
    emptyCompany: emptyCompany,
    emptyServiceArea: emptyServiceArea,
    pickCompany: pickCompany,
    pickServiceArea: pickServiceArea,
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
    validateP2Complete: validateP2Complete,
    suggestPublicText: suggestPublicText,
    previewModel: previewModel
  };
});
