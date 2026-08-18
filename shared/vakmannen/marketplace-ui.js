/**
 * Marketplace Phase 1 Sprint 2 — shared UI constants (Design Freeze V3 D1/D2).
 * Browser + Node. No product decisions beyond freeze.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanMarketplaceUi = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORY_IDS = [
    'dakwerken',
    'badkamer',
    'keuken',
    'ramen-deuren',
    'isolatie',
    'verwarming',
    'elektriciteit',
    'gevel',
    'vloeren',
    'schilderwerken',
    'ventilatie',
    'zonnepanelen'
  ];

  var CATEGORY_LABELS = {
    dakwerken: 'Dakwerken',
    badkamer: 'Badkamer',
    keuken: 'Keuken',
    'ramen-deuren': 'Ramen & deuren',
    isolatie: 'Isolatie',
    verwarming: 'Verwarming',
    elektriciteit: 'Elektriciteit',
    gevel: 'Gevel',
    vloeren: 'Vloeren',
    schilderwerken: 'Schilderwerken',
    ventilatie: 'Ventilatie',
    zonnepanelen: 'Zonnepanelen'
  };

  /** Short helper lines under category tiles / intros — editorial, no claims. */
  var CATEGORY_HELPERS = {
    dakwerken: 'Hellend dak, plat dak en herstellingen',
    badkamer: 'Renovatie, douche en sanitair',
    keuken: 'Plaatsing, maatwerk en vernieuwing',
    'ramen-deuren': 'Vervangen en plaatsen',
    isolatie: 'Dak, muur, vloer en spouw',
    verwarming: 'Ketel, warmtepomp en leidingen',
    elektriciteit: 'Installatie, keuring en uitbreiding',
    gevel: 'Renovatie, isolatie en afwerking',
    vloeren: 'Tegels, parket en gietvloeren',
    schilderwerken: 'Binnen- en buitenschilderwerk',
    ventilatie: 'Systemen voor een gezond binnenklimaat',
    zonnepanelen: 'Installatie voor jouw woning'
  };

  var CATEGORY_INTROS = {
    dakwerken:
      'Zoek een nagekeken dakwerkbedrijf voor herstelling, renovatie of isolatie. Vul je locatie in om verder te gaan via ELYAN.',
    badkamer:
      'Zoek een nagekeken badkamerspecialist voor renovatie of vernieuwing. Vul je locatie in om verder te gaan via ELYAN.',
    keuken:
      'Zoek een nagekeken keukenpartner voor plaatsing of vernieuwing. Vul je locatie in om verder te gaan via ELYAN.',
    'ramen-deuren':
      'Zoek een nagekeken specialist voor ramen en deuren. Vul je locatie in om verder te gaan via ELYAN.',
    isolatie:
      'Zoek een nagekeken isolatiebedrijf voor dak, muur of vloer. Vul je locatie in om verder te gaan via ELYAN.',
    verwarming:
      'Zoek een nagekeken verwarmingspartner voor ketel of warmtepomp. Vul je locatie in om verder te gaan via ELYAN.',
    elektriciteit:
      'Zoek een nagekeken elektricien voor installatie of keuring. Vul je locatie in om verder te gaan via ELYAN.',
    gevel:
      'Zoek een nagekeken gevelspecialist voor renovatie of isolatie. Vul je locatie in om verder te gaan via ELYAN.',
    vloeren:
      'Zoek een nagekeken vloerspecialist voor plaatsing of vernieuwing. Vul je locatie in om verder te gaan via ELYAN.',
    schilderwerken:
      'Zoek een nagekeken schildersbedrijf voor binnen of buiten. Vul je locatie in om verder te gaan via ELYAN.',
    ventilatie:
      'Zoek een nagekeken ventilatiepartner voor plaatsing of vernieuwing. Vul je locatie in om verder te gaan via ELYAN.',
    zonnepanelen:
      'Zoek een nagekeken zonnepanelenpartner voor installatie. Vul je locatie in om verder te gaan via ELYAN.'
  };

  var CATEGORY_SEO = {
    dakwerken:
      'Op ELYAN vind je nagekeken dakwerkbedrijven actief in Vlaanderen en Brussel. Je bekijkt eerst de categorie en geeft daarna je locatie door. Aanvragen lopen via ELYAN — niet rechtstreeks naar het bedrijf.',
    badkamer:
      'Op ELYAN vind je nagekeken badkamerspecialisten in Vlaanderen en Brussel. Kies deze categorie, bekijk relevante diensten en geef je locatie door. Aanvragen lopen via ELYAN.',
    keuken:
      'Op ELYAN vind je nagekeken keukenpartners in Vlaanderen en Brussel. Start vanuit deze categorie, bekijk diensten en vul je locatie in. Aanvragen lopen via ELYAN.',
    'ramen-deuren':
      'Op ELYAN vind je nagekeken specialisten voor ramen en deuren in Vlaanderen en Brussel. Geef na deze categorie je locatie door. Aanvragen lopen via ELYAN.',
    isolatie:
      'Op ELYAN vind je nagekeken isolatiebedrijven in Vlaanderen en Brussel. Bekijk relevante diensten en vul je locatie in. Aanvragen lopen via ELYAN.',
    verwarming:
      'Op ELYAN vind je nagekeken verwarmingspartners in Vlaanderen en Brussel. Start vanuit deze categorie en geef je locatie door. Aanvragen lopen via ELYAN.',
    elektriciteit:
      'Op ELYAN vind je nagekeken elektriciens in Vlaanderen en Brussel. Bekijk diensten en vul je locatie in. Aanvragen lopen via ELYAN.',
    gevel:
      'Op ELYAN vind je nagekeken gevelspecialisten in Vlaanderen en Brussel. Geef na deze categorie je locatie door. Aanvragen lopen via ELYAN.',
    vloeren:
      'Op ELYAN vind je nagekeken vloerspecialisten in Vlaanderen en Brussel. Bekijk diensten en vul je locatie in. Aanvragen lopen via ELYAN.',
    schilderwerken:
      'Op ELYAN vind je nagekeken schildersbedrijven in Vlaanderen en Brussel. Start vanuit deze categorie en geef je locatie door. Aanvragen lopen via ELYAN.',
    ventilatie:
      'Op ELYAN vind je nagekeken ventilatiepartners in Vlaanderen en Brussel. Bekijk diensten en vul je locatie in. Aanvragen lopen via ELYAN.',
    zonnepanelen:
      'Op ELYAN vind je nagekeken zonnepanelenpartners in Vlaanderen en Brussel. Geef na deze categorie je locatie door. Aanvragen lopen via ELYAN.'
  };

  /** Vlaanderen-first + Brussel. Slugs match regioSlugFor (underscore → hyphen). */
  var PUBLIC_PROVINCES = [
    { id: 'antwerpen', slug: 'antwerpen', label: 'Antwerpen' },
    { id: 'oost_vlaanderen', slug: 'oost-vlaanderen', label: 'Oost-Vlaanderen' },
    { id: 'west_vlaanderen', slug: 'west-vlaanderen', label: 'West-Vlaanderen' },
    { id: 'vlaams_brabant', slug: 'vlaams-brabant', label: 'Vlaams-Brabant' },
    { id: 'limburg', slug: 'limburg', label: 'Limburg' },
    { id: 'brussel', slug: 'brussel', label: 'Brussel' }
  ];

  var VL_BRU_PROVINCES = {
    Antwerpen: true,
    'Oost-Vlaanderen': true,
    'West-Vlaanderen': true,
    Limburg: true,
    'Vlaams-Brabant': true,
    'Brussels Hoofdstedelijk Gewest': true
  };

  var PROVINCE_TO_SLUG = {
    Antwerpen: 'antwerpen',
    'Oost-Vlaanderen': 'oost-vlaanderen',
    'West-Vlaanderen': 'west-vlaanderen',
    Limburg: 'limburg',
    'Vlaams-Brabant': 'vlaams-brabant',
    'Brussels Hoofdstedelijk Gewest': 'brussel'
  };

  function isCategoryId(id) {
    return CATEGORY_IDS.indexOf(id) >= 0;
  }

  function labelFor(id) {
    return CATEGORY_LABELS[id] || id;
  }

  function helperFor(id) {
    return CATEGORY_HELPERS[id] || '';
  }

  function introFor(id) {
    return CATEGORY_INTROS[id] || '';
  }

  function seoFor(id) {
    return CATEGORY_SEO[id] || '';
  }

  function provinceBySlug(slug) {
    slug = String(slug || '').toLowerCase();
    for (var i = 0; i < PUBLIC_PROVINCES.length; i++) {
      if (PUBLIC_PROVINCES[i].slug === slug) return PUBLIC_PROVINCES[i];
    }
    return null;
  }

  function isVlaanderenOrBrusselLocation(loc) {
    if (!loc || !loc.province) return false;
    return !!VL_BRU_PROVINCES[loc.province];
  }

  function filterVlaanderenBrussel(locations) {
    return (locations || []).filter(isVlaanderenOrBrusselLocation);
  }

  /**
   * Sprint 3 search URL contract (frontend):
   * /vakmannen/{categoryId}[/{regioSlug}]?postcode=&gemeente=
   * Aligns with GET /api/public/v1/search?category=&postcode=&gemeente=
   */
  function buildSearchPath(categoryId, location, regioSlug) {
    if (!isCategoryId(categoryId)) return '/vakmannen';
    var path = '/vakmannen/' + encodeURIComponent(categoryId);
    var regio = regioSlug || null;
    if (!regio && location && location.province) {
      regio = PROVINCE_TO_SLUG[location.province] || null;
    }
    if (regio && provinceBySlug(regio)) {
      path += '/' + encodeURIComponent(regio);
    }
    var params = [];
    if (location && location.postcode) {
      params.push('postcode=' + encodeURIComponent(String(location.postcode)));
    }
    if (location && location.name) {
      params.push('gemeente=' + encodeURIComponent(String(location.name)));
    } else if (location && location.gemeente) {
      params.push('gemeente=' + encodeURIComponent(String(location.gemeente)));
    }
    if (params.length) path += '?' + params.join('&');
    return path;
  }

  function parseCategoryRoute(pathname) {
    var path = String(pathname || '').replace(/\/$/, '') || '';
    var m = path.match(/^\/vakmannen\/([^/]+)(?:\/([^/]+))?$/);
    if (!m) return { ok: false };
    var categoryId = decodeURIComponent(m[1]);
    var regioSlug = m[2] ? decodeURIComponent(m[2]) : null;
    if (!isCategoryId(categoryId)) return { ok: false, categoryId: categoryId };
    if (regioSlug && !provinceBySlug(regioSlug)) {
      return { ok: true, categoryId: categoryId, regioSlug: null, regioInvalid: true };
    }
    return { ok: true, categoryId: categoryId, regioSlug: regioSlug, regioInvalid: false };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    CATEGORY_IDS: CATEGORY_IDS,
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_HELPERS: CATEGORY_HELPERS,
    CATEGORY_INTROS: CATEGORY_INTROS,
    CATEGORY_SEO: CATEGORY_SEO,
    PUBLIC_PROVINCES: PUBLIC_PROVINCES,
    isCategoryId: isCategoryId,
    labelFor: labelFor,
    helperFor: helperFor,
    introFor: introFor,
    seoFor: seoFor,
    provinceBySlug: provinceBySlug,
    isVlaanderenOrBrusselLocation: isVlaanderenOrBrusselLocation,
    filterVlaanderenBrussel: filterVlaanderenBrussel,
    buildSearchPath: buildSearchPath,
    parseCategoryRoute: parseCategoryRoute,
    escapeHtml: escapeHtml,
    SITE_ORIGIN: 'https://www.elyan.be'
  };
});
