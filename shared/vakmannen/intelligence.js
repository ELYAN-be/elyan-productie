/* ============================================================
   ELYAN Category Intelligence Engine v1
   CORE + CATEGORY INTELLIGENCE + SHARED SERVICES
   Lab-only data/logic layer — no visual redesign.
   ============================================================ */
(function (global) {
  'use strict';

  var EV = global.ElyanVakmannen = global.ElyanVakmannen || {};

  /* ---------- Pricing enum ---------- */
  var PRICING_MODELS = [
    'per_m2', 'per_linear_meter', 'per_item', 'per_hour',
    'starting_price', 'price_range', 'project_price', 'project_minimum',
    'per_wp', 'per_kwh', 'on_request'
  ];

  /* ---------- Shared services (single source of truth) ---------- */
  var SHARED_SERVICES = {
    roof_insulation: { id: 'roof_insulation', label: 'Dakisolatie', categories: ['dakwerken', 'isolatie'] },
    external_wall_insulation: { id: 'external_wall_insulation', label: 'Buitengevelisolatie', categories: ['gevel', 'isolatie'] },
    floor_insulation: { id: 'floor_insulation', label: 'Vloerisolatie', categories: ['vloeren', 'isolatie'] },
    underfloor_heating: { id: 'underfloor_heating', label: 'Vloerverwarming', categories: ['verwarming', 'vloeren', 'badkamer'] },
    electrical_installation: { id: 'electrical_installation', label: 'Elektrische installatie', categories: ['elektriciteit', 'zonnepanelen', 'badkamer', 'keuken'] },
    ventilation: { id: 'ventilation', label: 'Ventilatie', categories: ['ventilatie', 'badkamer'] },
    ev_charging: { id: 'ev_charging', label: 'Laadpaal', categories: ['elektriciteit', 'zonnepanelen'] }
  };

  function svc(id, label, opts) {
    opts = opts || {};
    return {
      id: id,
      label: label,
      sharedId: opts.sharedId || null,
      pricingModels: opts.pricingModels || ['price_range', 'on_request'],
      unitHint: opts.unitHint || null,
      conditionals: opts.conditionals || null
    };
  }

  function q(key, type, label, options, extra) {
    var o = { key: key, type: type, label: label, options: options || null };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  var UNKNOWN = { id: 'unknown', label: 'Ik weet het niet' };

  /* ---------- Category intelligence (12) ---------- */
  var CI = {};

  CI.dakwerken = {
    id: 'dakwerken',
    label: 'Dakwerken',
    plural: 'Dakwerkers',
    services: [
      svc('volledig', 'Volledige dakrenovatie', { pricingModels: ['per_m2', 'price_range', 'project_minimum', 'starting_price'], unitHint: 'm2' }),
      svc('hellend', 'Hellend dak', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2', conditionals: {
        covering: q('hellendCovering', 'multi', 'Welke hellende bedekkingen?', [
          'Keramische dakpannen', 'Betonnen dakpannen', 'Natuurleien', 'Kunstleien', 'Metalen dakbedekking', 'Andere'
        ])
      }}),
      svc('plat', 'Plat dak', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2', conditionals: {
        systems: q('platSystems', 'multi', 'Welke platte-dakwerken?', [
          'EPDM', 'Bitumineuze roofing', 'Kunststof afdichting', 'Isolatie', 'Afschot', 'Dakranden', 'Hemelwaterafvoer', 'Daklichten'
        ])
      }}),
      svc('bedekking', 'Dakbedekking', { pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('isolatie', 'Dakisolatie', { sharedId: 'roof_insulation', pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('herstelling', 'Dakherstelling / lekkage', { pricingModels: ['starting_price', 'per_hour', 'project_minimum', 'on_request'] }),
      svc('constructie', 'Dakconstructie / timmerwerk', { pricingModels: ['on_request', 'project_price', 'per_hour'] }),
      svc('goten', 'Goten / afvoer', { pricingModels: ['per_linear_meter', 'starting_price', 'on_request'], unitHint: 'lm' }),
      svc('dakvenster', 'Dakvensters', { pricingModels: ['per_item', 'starting_price', 'on_request'], unitHint: 'stuk' }),
      svc('schoorsteen', 'Schoorsteenwerken', { pricingModels: ['on_request', 'starting_price', 'project_price'] })
    ],
    projectTypes: ['Kleine herstellingen', 'Gedeeltelijke renovatie', 'Volledige renovatie', 'Renovatie + isolatie', 'Nieuwbouw', 'Appartementsgebouw'],
    onboardQuestions: [
      q('projectTypes', 'multi', 'Welke projecttypes nemen jullie aan?', null),
      q('minProject', 'number', 'Projectminimum (€)', null, { placeholder: '8500' })
    ],
    customerQuestions: [
      q('roofType', 'single', 'Type dak', ['Hellend', 'Plat', UNKNOWN.label]),
      q('area', 'text', 'Geschatte oppervlakte (m²)', null, { allowUnknown: true, placeholder: 'bv. 120' }),
      q('covering', 'single', 'Huidige bedekking', ['Pannen', 'Leien', 'EPDM / plat', UNKNOWN.label]),
      q('insulation', 'single', 'Isolatie aanwezig?', ['Ja', 'Nee', UNKNOWN.label]),
      q('wants', 'multi', 'Wat wil je laten uitvoeren?', ['Nieuwe bedekking', 'Isolatie', 'Constructie', 'Goten', 'Dakvenster', 'Herstelling'])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'projectTypes', 'minProject', 'area', 'materials']
  };

  CI.badkamer = {
    id: 'badkamer', label: 'Badkamer', plural: 'Badkamerspecialisten',
    services: [
      svc('volledig', 'Volledige badkamerrenovatie', { pricingModels: ['project_price', 'price_range', 'starting_price'] }),
      svc('douche_ipv_bad', 'Bad vervangen door douche', { pricingModels: ['project_price', 'starting_price', 'on_request'] }),
      svc('douche', 'Douche', { pricingModels: ['project_price', 'starting_price', 'per_item'] }),
      svc('bad', 'Bad', { pricingModels: ['project_price', 'starting_price', 'per_item'] }),
      svc('sanitair', 'Sanitair', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('tegelwerken', 'Tegelwerken', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('meubel', 'Badkamermeubel', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('leidingen', 'Leidingen / afvoer', { pricingModels: ['on_request', 'project_price', 'per_hour'] }),
      svc('elek', 'Elektriciteit badkamer', { sharedId: 'electrical_installation', pricingModels: ['on_request', 'per_hour', 'starting_price'] }),
      svc('verlichting', 'Verlichting', { pricingModels: ['per_item', 'on_request'] }),
      svc('vloerverwarming', 'Vloerverwarming', { sharedId: 'underfloor_heating', pricingModels: ['per_m2', 'on_request'], unitHint: 'm2' }),
      svc('ventilatie', 'Ventilatie', { sharedId: 'ventilation', pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('maatwerk', 'Maatwerk', { pricingModels: ['on_request', 'project_price'] }),
      svc('afbraak', 'Afbraak', { pricingModels: ['starting_price', 'on_request', 'project_price'] })
    ],
    projectTypes: ['Totaalrenovatie', 'Deelrenovatie', 'Doucheproject', 'Luxe badkamer', 'Compacte badkamer', 'Toegankelijke badkamer', 'Nieuwbouw'],
    onboardQuestions: [
      q('coordination', 'single', 'Totaalproject-coördinatie?', ['Volledige coördinatie', 'Met vaste onderaannemers', 'Gedeeltelijk', 'Alleen specifieke werken']),
      q('projectTypes', 'multi', 'Projecttypes', null)
    ],
    customerQuestions: [
      q('layoutChange', 'single', 'Indeling wijzigen?', ['Ja', 'Nee', UNKNOWN.label]),
      q('scope', 'multi', 'Wat moet erin?', ['Sanitair', 'Tegelwerk', 'Afbraak', 'Ventilatie', 'Verwarming', 'Elektriciteit']),
      q('materialsBy', 'single', 'Materialen?', ['Door partner', 'Door mij', 'Gemengd', UNKNOWN.label])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery', 'coordination'],
    matchingFields: ['services', 'coordination', 'projectTypes', 'layoutChange', 'materialsBy']
  };

  CI.keuken = {
    id: 'keuken', label: 'Keuken', plural: 'Keukenspecialisten',
    services: [
      svc('volledig', 'Volledige keukenrenovatie', { pricingModels: ['project_price', 'price_range', 'starting_price'] }),
      svc('nieuw', 'Nieuwe keuken', { pricingModels: ['project_price', 'price_range', 'starting_price'] }),
      svc('vernieuwen', 'Bestaande keuken vernieuwen', { pricingModels: ['project_price', 'starting_price', 'on_request'] }),
      svc('fronten', 'Keukenkasten / fronten', { pricingModels: ['project_price', 'starting_price', 'on_request'] }),
      svc('maatwerk', 'Maatwerk', { pricingModels: ['on_request', 'project_price'] }),
      svc('werkblad', 'Werkblad', { pricingModels: ['per_linear_meter', 'starting_price', 'on_request'], unitHint: 'lm' }),
      svc('eiland', 'Eiland', { pricingModels: ['starting_price', 'on_request', 'project_price'] }),
      svc('toestellen', 'Toestellen', { pricingModels: ['per_item', 'on_request'] }),
      svc('spoelbak', 'Spoelbak / kraan', { pricingModels: ['per_item', 'starting_price'] }),
      svc('elek', 'Elektriciteit', { sharedId: 'electrical_installation', pricingModels: ['on_request', 'per_hour'] }),
      svc('sanitair', 'Sanitair', { pricingModels: ['on_request', 'per_hour'] }),
      svc('verlichting', 'Verlichting', { pricingModels: ['per_item', 'on_request'] }),
      svc('afbraak', 'Afbraak', { pricingModels: ['starting_price', 'on_request'] }),
      svc('plaatsing', 'Plaatsing', { pricingModels: ['project_price', 'starting_price'] })
    ],
    projectTypes: ['Ontwerp tot plaatsing', 'Levering + plaatsing', 'Alleen plaatsing', 'Maatwerk', 'Specifieke werken'],
    onboardQuestions: [
      q('businessType', 'single', 'Bedrijfstype', ['Ontwerp tot plaatsing', 'Levering + plaatsing', 'Alleen plaatsing', 'Maatwerk', 'Specifieke werken']),
      q('design', 'multi', 'Ontwerpservices', ['Ontwerpservice', '3D-visualisatie', 'Opmeting', 'Materiaaladvies', 'Showroom'])
    ],
    customerQuestions: [
      q('needs', 'multi', 'Wat heb je nodig?', ['Ontwerp', 'Maatwerk', 'Toestellen', 'Werkblad', 'Afbraak', 'Technieken', 'Volledige coördinatie']),
      q('showroom', 'single', 'Showroom gewenst?', ['Ja', 'Nee', 'Maakt niet uit'])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery', 'showroom'],
    matchingFields: ['services', 'businessType', 'design', 'needs']
  };

  CI['ramen-deuren'] = {
    id: 'ramen-deuren', label: 'Ramen & deuren', plural: 'Ramen- & deurenspecialisten',
    services: [
      svc('ramen', 'Ramen', { pricingModels: ['per_item', 'per_m2', 'starting_price', 'project_price'] }),
      svc('buitendeuren', 'Buitendeuren', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('schuif', 'Schuiframen / hefschuiframen', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('beglazing', 'Beglazing', { pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('vervangen', 'Ramen vervangen', { pricingModels: ['per_item', 'per_m2', 'project_price'] }),
      svc('nieuwbouw', 'Nieuwbouw', { pricingModels: ['project_price', 'on_request'] }),
      svc('rolluiken', 'Rolluiken', { pricingModels: ['per_item', 'starting_price'] }),
      svc('screens', 'Screens', { pricingModels: ['per_item', 'starting_price'] }),
      svc('vliegenramen', 'Vliegenramen', { pricingModels: ['per_item', 'starting_price'] }),
      svc('binnenafwerking', 'Binnenafwerking', { pricingModels: ['on_request', 'per_item'] }),
      svc('buitenafwerking', 'Buitenafwerking', { pricingModels: ['on_request', 'per_item'] })
    ],
    projectTypes: ['Renovatie', 'Nieuwbouw', 'Gedeeltelijke vervanging', 'Volledige woning'],
    onboardQuestions: [
      q('materials', 'multi', 'Materialen', ['PVC', 'Aluminium', 'Hout', 'Hout-aluminium', 'Andere']),
      q('glazing', 'multi', 'Beglazing', ['Hoogrendement', 'Driedubbel', 'Akoestisch', 'Veiligheid', 'Zonwerend']),
      q('showroom', 'single', 'Showroom?', ['Ja', 'Nee'])
    ],
    customerQuestions: [
      q('materialPref', 'single', 'Gewenst materiaal', ['PVC', 'Aluminium', 'Hout', 'Hout-aluminium', UNKNOWN.label]),
      q('count', 'text', 'Aantal elementen', null, { allowUnknown: true, placeholder: 'bv. 8 ramen' }),
      q('extras', 'multi', 'Extra', ['Screens', 'Rolluiken', 'Binnenafwerking', 'Opmeting'])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery', 'materials'],
    matchingFields: ['services', 'materials', 'glazing', 'count', 'extras']
  };

  CI.isolatie = {
    id: 'isolatie', label: 'Isolatie', plural: 'Isolatiespecialisten',
    services: [
      svc('dak', 'Dakisolatie', { sharedId: 'roof_insulation', pricingModels: ['per_m2', 'starting_price', 'price_range'], unitHint: 'm2' }),
      svc('zolder', 'Zoldervloerisolatie', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('spouw', 'Spouwmuurisolatie', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('buitenmuur', 'Buitenmuurisolatie', { sharedId: 'external_wall_insulation', pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('binnenmuur', 'Binnenmuurisolatie', { pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('vloer', 'Vloerisolatie', { sharedId: 'floor_insulation', pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('kelder', 'Kelderplafondisolatie', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('luchtdicht', 'Luchtdichtheidswerken', { pricingModels: ['on_request', 'project_price'] })
    ],
    projectTypes: ['Woningrenovatie', 'Deelproject', 'EPB-gericht', 'Nieuwbouw'],
    onboardQuestions: [
      q('materials', 'multi', 'Materialen', ['Minerale wol', 'Glaswol', 'Rotswol', 'PUR', 'PIR', 'EPS', 'XPS', 'Cellulose', 'Houtvezel', 'Andere'])
    ],
    customerQuestions: [
      q('type', 'single', 'Wat wil je isoleren?', ['Dak', 'Zoldervloer', 'Spouw', 'Buitenmuur', 'Binnenmuur', 'Vloer', 'Kelder', UNKNOWN.label]),
      q('existing', 'single', 'Bestaande isolatie?', ['Ja', 'Nee', UNKNOWN.label]),
      q('moisture', 'single', 'Vochtproblemen?', ['Ja', 'Nee', UNKNOWN.label]),
      q('area', 'text', 'Oppervlakte (m²)', null, { allowUnknown: true })
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'materials', 'type', 'moisture', 'area']
  };

  CI.verwarming = {
    id: 'verwarming', label: 'Verwarming', plural: 'Verwarmingsspecialisten',
    services: [
      svc('warmtepomp', 'Warmtepomp', { pricingModels: ['starting_price', 'project_price', 'price_range', 'on_request'] }),
      svc('hybride', 'Hybride warmtepomp', { pricingModels: ['starting_price', 'project_price', 'on_request'] }),
      svc('bodem', 'Bodem/water', { pricingModels: ['on_request', 'project_price'] }),
      svc('cv', 'Centrale verwarming', { pricingModels: ['starting_price', 'project_price', 'on_request'] }),
      svc('ketel', 'Ketel vervangen', { pricingModels: ['starting_price', 'project_price'] }),
      svc('vloerverwarming', 'Vloerverwarming', { sharedId: 'underfloor_heating', pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('radiatoren', 'Radiatoren', { pricingModels: ['per_item', 'starting_price'] }),
      svc('lt_radiatoren', 'Lage-temperatuurradiatoren', { pricingModels: ['per_item', 'on_request'] }),
      svc('wp_boiler', 'Warmtepompboiler', { pricingModels: ['starting_price', 'on_request'] }),
      svc('boiler', 'Boiler', { pricingModels: ['starting_price', 'per_item'] }),
      svc('onderhoud', 'Onderhoud', { pricingModels: ['starting_price', 'per_hour', 'project_minimum'] }),
      svc('storing', 'Storingen', { pricingModels: ['per_hour', 'starting_price'] })
    ],
    projectTypes: ['Nieuwe installatie', 'Vervanging', 'Uitbreiding', 'Onderhoud'],
    onboardQuestions: [
      q('systems', 'multi', 'Systemen', ['Lucht-water', 'Hybride', 'Bodem/water', 'CV-ketel', 'Vloerverwarming'])
    ],
    customerQuestions: [
      q('current', 'single', 'Huidige installatie', ['CV-ketel', 'Warmtepomp', 'Elektrisch', UNKNOWN.label]),
      q('homeSize', 'text', 'Woninggrootte (m²)', null, { allowUnknown: true }),
      q('goal', 'single', 'Doel', ['Nieuwe installatie', 'Vervanging', 'Onderhoud', 'Storing'])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'systems', 'current', 'goal']
  };

  CI.elektriciteit = {
    id: 'elektriciteit', label: 'Elektriciteit', plural: 'Elektriciens',
    services: [
      svc('volledig', 'Volledige elektrische installatie', { sharedId: 'electrical_installation', pricingModels: ['project_price', 'price_range', 'starting_price', 'on_request'] }),
      svc('renovatie', 'Renovatie', { pricingModels: ['project_price', 'per_hour', 'on_request'] }),
      svc('kast', 'Zekeringskast', { pricingModels: ['starting_price', 'project_price'] }),
      svc('kringen', 'Nieuwe kringen', { pricingModels: ['per_item', 'per_hour', 'starting_price'] }),
      svc('stopcontacten', 'Stopcontacten', { pricingModels: ['per_item', 'per_hour'] }),
      svc('verlichting', 'Verlichting', { pricingModels: ['per_item', 'per_hour'] }),
      svc('conformiteit', 'Conformiteitswerken', { pricingModels: ['on_request', 'project_price'] }),
      svc('aarding', 'Aarding', { pricingModels: ['starting_price', 'on_request'] }),
      svc('schemas', 'Elektrische schema’s', { pricingModels: ['starting_price', 'on_request'] }),
      svc('domotica', 'Domotica', { pricingModels: ['on_request', 'project_price'] }),
      svc('laadpaal', 'Laadpaal', { sharedId: 'ev_charging', pricingModels: ['starting_price', 'project_price', 'on_request'] }),
      svc('data', 'Data / netwerk', { pricingModels: ['per_item', 'per_hour', 'on_request'] }),
      svc('storing', 'Storingen', { pricingModels: ['per_hour', 'starting_price'] })
    ],
    projectTypes: ['Kleine interventie', 'Volledige renovatie', 'Nieuwbouw', 'Laadpaal', 'Urgentie'],
    onboardQuestions: [
      q('noteKeuring', 'info', 'Opgelet: officiële AREI-keuring gebeurt door een erkend controleorganisme, niet standaard door de installateur.', null),
      q('scope', 'multi', 'Focus', ['Renovatie woningen', 'Bord vernieuwen', 'Laadpunten', 'Verlichting', 'Domotica', 'Storingen'])
    ],
    customerQuestions: [
      q('urgency', 'single', 'Urgentie', ['Storing / snel', 'Gepland', 'Flexibel']),
      q('scope', 'multi', 'Scope', ['Volledige renovatie', 'Bord', 'Stopcontacten', 'Verlichting', 'Laadpaal', 'Negatief keuringsverslag', 'Schema’s']),
      q('keuring', 'single', 'Negatief keuringsverslag?', ['Ja', 'Nee', UNKNOWN.label])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'scope', 'urgency', 'keuring']
  };

  CI.gevel = {
    id: 'gevel', label: 'Gevel', plural: 'Gevelspecialisten',
    services: [
      svc('renovatie', 'Gevelrenovatie', { pricingModels: ['per_m2', 'price_range', 'project_minimum', 'on_request'], unitHint: 'm2' }),
      svc('voegen', 'Voegwerken', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('reiniging', 'Gevelreiniging', { pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('crepi', 'Crepi', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('bekleding', 'Gevelbekleding', { pricingModels: ['per_m2', 'on_request', 'price_range'], unitHint: 'm2' }),
      svc('isolatie', 'Gevelisolatie', { sharedId: 'external_wall_insulation', pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('metselwerk', 'Metselwerk', { pricingModels: ['on_request', 'per_m2', 'project_price'] }),
      svc('hydrofoberen', 'Hydrofoberen', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('herstellingen', 'Herstellingen', { pricingModels: ['starting_price', 'on_request', 'per_hour'] })
    ],
    projectTypes: ['Volledige gevel', 'Deelgevel', 'Isolatie + afwerking', 'Reiniging / voegen'],
    onboardQuestions: [
      q('finishes', 'multi', 'Afwerkingen', ['Crepi', 'Steenstrips', 'Schilderen', 'Isolatie + afwerking', 'Voegwerken'])
    ],
    customerQuestions: [
      q('gevelType', 'single', 'Geveltype', ['Baksteen', 'Crepi', 'Bekleding', UNKNOWN.label]),
      q('needs', 'multi', 'Wat nodig?', ['Voegwerk', 'Reiniging', 'Isolatie', 'Crepi', 'Bekleding', 'Schadeherstel']),
      q('scaffolding', 'single', 'Stelling nodig?', ['Ja', 'Nee', UNKNOWN.label])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'finishes', 'gevelType', 'needs']
  };

  CI.vloeren = {
    id: 'vloeren', label: 'Vloeren', plural: 'Vloerspecialisten',
    services: [
      svc('tegel', 'Tegels', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('parket', 'Parket', { pricingModels: ['per_m2', 'price_range', 'starting_price'], unitHint: 'm2' }),
      svc('hout', 'Houten vloer', { pricingModels: ['per_m2', 'price_range', 'on_request'], unitHint: 'm2' }),
      svc('gietvloer', 'Gietvloer', { pricingModels: ['per_m2', 'on_request', 'price_range'], unitHint: 'm2' }),
      svc('vinyl', 'Vinyl / PVC', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('chape', 'Chape', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('egalisatie', 'Egalisatie', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('uitbraak', 'Uitbraak', { pricingModels: ['per_m2', 'starting_price', 'on_request'], unitHint: 'm2' }),
      svc('opbouw', 'Nieuwe vloeropbouw', { pricingModels: ['per_m2', 'on_request', 'project_price'], unitHint: 'm2' }),
      svc('isolatie', 'Vloerisolatie', { sharedId: 'floor_insulation', pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('vloerverwarming', 'Vloerverwarming', { sharedId: 'underfloor_heating', pricingModels: ['per_m2', 'on_request'], unitHint: 'm2' })
    ],
    projectTypes: ['Alleen afwerking', 'Volledige vloeropbouw', 'Uitbraak + nieuw', 'Met vloerverwarming'],
    onboardQuestions: [
      q('floors', 'multi', 'Vloertypes', ['Tegel', 'Parket', 'Vinyl', 'Gietvloer', 'Chape'])
    ],
    customerQuestions: [
      q('floorType', 'single', 'Gewenste vloer', ['Tegel', 'Parket', 'Vinyl', 'Gietvloer', UNKNOWN.label]),
      q('removeOld', 'single', 'Uitbraak nodig?', ['Ja', 'Nee', UNKNOWN.label]),
      q('ufh', 'single', 'Vloerverwarming?', ['Ja', 'Nee', UNKNOWN.label]),
      q('area', 'text', 'Oppervlakte (m²)', null, { allowUnknown: true }),
      q('materialsBy', 'single', 'Materiaal door', ['Partner', 'Klant', 'Gemengd', UNKNOWN.label])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'floorType', 'removeOld', 'ufh', 'area']
  };

  CI.schilderwerken = {
    id: 'schilderwerken', label: 'Schilderwerken', plural: 'Schilders',
    services: [
      svc('binnenmuren', 'Binnenmuren', { pricingModels: ['per_m2', 'price_range', 'project_price'], unitHint: 'm2' }),
      svc('plafonds', 'Plafonds', { pricingModels: ['per_m2', 'price_range'], unitHint: 'm2' }),
      svc('woning', 'Volledige woning', { pricingModels: ['project_price', 'price_range', 'starting_price'] }),
      svc('houtwerk', 'Houtwerk', { pricingModels: ['per_item', 'per_hour', 'starting_price'] }),
      svc('trap', 'Trap', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('buiten', 'Buitenwerk', { pricingModels: ['per_m2', 'project_price', 'on_request'], unitHint: 'm2' }),
      svc('behang', 'Behang', { pricingModels: ['per_m2', 'starting_price'], unitHint: 'm2' }),
      svc('spuitwerk', 'Spuitwerk', { pricingModels: ['per_m2', 'on_request'], unitHint: 'm2' }),
      svc('decoratief', 'Decoratieve afwerking', { pricingModels: ['on_request', 'per_m2'] })
    ],
    projectTypes: ['Binnen', 'Buiten', 'Volledige woning', 'Detail / lakwerk'],
    onboardQuestions: [
      q('scope', 'multi', 'Focus', ['Binnen', 'Buiten', 'Lakwerk', 'Behang', 'Spuitwerk'])
    ],
    customerQuestions: [
      q('substrate', 'single', 'Ondergrondstaat', ['Schilderklaar', 'Beperkte voorbereiding', 'Veel voorbereiding', 'Inspectie nodig', UNKNOWN.label]),
      q('occupied', 'single', 'Bewoonde woning?', ['Ja', 'Nee']),
      q('area', 'text', 'Oppervlakte / kamers', null, { allowUnknown: true, placeholder: 'bv. 3 kamers of 80 m²' })
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'substrate', 'occupied', 'area']
  };

  CI.ventilatie = {
    id: 'ventilatie', label: 'Ventilatie', plural: 'Ventilatiespecialisten',
    services: [
      svc('c', 'Systeem C', { sharedId: 'ventilation', pricingModels: ['starting_price', 'project_price', 'on_request'] }),
      svc('c_vraag', 'Vraaggestuurd C', { sharedId: 'ventilation', pricingModels: ['starting_price', 'project_price', 'on_request'] }),
      svc('d', 'Systeem D', { sharedId: 'ventilation', pricingModels: ['starting_price', 'project_price', 'price_range', 'on_request'] }),
      svc('balans', 'Balansventilatie', { pricingModels: ['starting_price', 'on_request', 'project_price'] }),
      svc('renovatie', 'Renovatiesysteem', { pricingModels: ['on_request', 'project_price'] }),
      svc('decentraal', 'Decentrale ventilatie', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('onderhoud', 'Onderhoud', { pricingModels: ['starting_price', 'per_item'] }),
      svc('reiniging', 'Kanaalreiniging', { pricingModels: ['starting_price', 'on_request'] }),
      svc('inregeling', 'Inregeling', { pricingModels: ['starting_price', 'on_request'] }),
      svc('optimalisatie', 'Optimalisatie', { pricingModels: ['on_request', 'starting_price'] })
    ],
    projectTypes: ['Renovatie', 'Nieuwbouw', 'Onderhoud', 'Vervanging'],
    onboardQuestions: [
      q('systems', 'multi', 'Systemen', ['Systeem C', 'Vraaggestuurd C', 'Systeem D', 'Decentrale units'])
    ],
    customerQuestions: [
      q('context', 'single', 'Context', ['Renovatie', 'Nieuwbouw', 'Onderhoud', UNKNOWN.label]),
      q('existing', 'single', 'Bestaand systeem?', ['Geen', 'C', 'D', 'Decentraal', UNKNOWN.label]),
      q('goal', 'multi', 'Doel', ['Nieuwe installatie', 'Onderhoud', 'Kanaalreiniging', 'Inregeling'])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'systems', 'context', 'goal']
  };

  CI.zonnepanelen = {
    id: 'zonnepanelen', label: 'Zonnepanelen', plural: 'Zonnepanelenpartners',
    services: [
      svc('nieuw', 'Nieuwe PV-installatie', { pricingModels: ['starting_price', 'project_price', 'price_range', 'per_wp', 'on_request'] }),
      svc('uitbreiding', 'Uitbreiding', { pricingModels: ['per_wp', 'starting_price', 'on_request'] }),
      svc('vervanging', 'Vervanging', { pricingModels: ['on_request', 'project_price'] }),
      svc('omvormer', 'Omvormer', { pricingModels: ['per_item', 'starting_price', 'on_request'] }),
      svc('batterij', 'Thuisbatterij', { pricingModels: ['starting_price', 'project_price', 'per_kwh', 'on_request'] }),
      svc('ems', 'EMS / monitoring', { pricingModels: ['starting_price', 'on_request'] }),
      svc('laadpaal', 'Laadpaalkoppeling', { sharedId: 'ev_charging', pricingModels: ['starting_price', 'on_request'] }),
      svc('onderhoud', 'Onderhoud', { pricingModels: ['starting_price', 'per_item'] }),
      svc('storing', 'Storingen', { pricingModels: ['per_hour', 'starting_price'] }),
      svc('elek', 'Elektrische werken', { sharedId: 'electrical_installation', pricingModels: ['on_request', 'per_hour'] })
    ],
    projectTypes: ['Nieuwe installatie', 'Uitbreiding', 'Batterij', 'Service bestaande systemen'],
    onboardQuestions: [
      q('roofTypes', 'multi', 'Daktypes', ['Pannendak', 'Leien dak', 'Plat dak', 'Metaal', 'Andere']),
      q('claimNote', 'info', 'Hard rule: geen ongecontroleerde rendement- of besparingsclaims op het publieke profiel.', null)
    ],
    customerQuestions: [
      q('goal', 'single', 'Doel', ['Nieuwe installatie', 'Uitbreiding', 'Batterij', 'Omvormer', 'Onderhoud']),
      q('roof', 'single', 'Daktype', ['Pannen', 'Leien', 'Plat', 'Metaal', UNKNOWN.label]),
      q('usage', 'text', 'Jaarverbruik (kWh)', null, { allowUnknown: true, placeholder: 'bv. 4500' }),
      q('extras', 'multi', 'Koppelingen', ['Thuisbatterij', 'Laadpaal', 'Warmtepomp']),
      q('asbestos', 'single', 'Asbest op dak?', ['Ja', 'Nee', UNKNOWN.label])
    ],
    publicFields: ['services', 'prices', 'availability', 'specialties', 'google', 'gallery'],
    matchingFields: ['services', 'roofTypes', 'goal', 'roof', 'extras', 'asbestos']
  };

  /* ---------- Core constants ---------- */
  var CORE_ONBOARD_STEPS = [
    { id: 'bedrijf', label: 'Bedrijf' },
    { id: 'werkgebied', label: 'Werkgebied' },
    { id: 'categorie', label: 'Hoofdcategorie' },
    { id: 'diensten', label: 'Diensten' },
    { id: 'voorkeuren', label: 'Projectvoorkeuren' },
    { id: 'prijzen', label: 'Prijzen' },
    { id: 'beschikbaarheid', label: 'Beschikbaarheid' },
    { id: 'eigenheid', label: 'Bedrijfseigenheid' },
    { id: 'fotos', label: 'Projectfoto’s' },
    { id: 'google', label: 'Google Reviews' },
    { id: 'controle', label: 'Controle' }
  ];

  var IDENTITY_QUESTIONS = [
    q('yearsActive', 'select', 'Hoe lang zijn jullie actief?', ['0–2 jaar', '3–5 jaar', '6–10 jaar', '11–20 jaar', '20+ jaar']),
    q('strength', 'text', 'Waar zijn jullie bijzonder sterk in?', null, { placeholder: 'Bijvoorbeeld: renovatie van hellende daken of complexe details', empty: true }),
    q('prefer', 'text', 'Welke projecten doen jullie het liefst?', null, { placeholder: 'Bijvoorbeeld: gezinswoningen, totaalrenovaties', empty: true }),
    q('avoid', 'text', 'Welke projecten nemen jullie bewust niet aan?', null, { placeholder: 'Bijvoorbeeld: spoedwerken zonder opmeting', empty: true }),
    q('care', 'text', 'Waar letten jullie extra op tijdens uitvoering?', null, { placeholder: 'Bijvoorbeeld: nette werf, planning, communicatie', empty: true }),
    q('whyChoose', 'text', 'Waarom kiezen klanten vaak voor jullie?', null, { placeholder: 'Kort en eerlijk', empty: true }),
    q('materialsText', 'text', 'Welke materialen / merken / systemen gebruiken jullie vaak?', null, { placeholder: 'Bijvoorbeeld: keramische pannen, EPDM, PIR', empty: true }),
    q('mustKnow', 'text', 'Wat moet een klant vooraf zeker over jullie weten?', null, { placeholder: 'Optioneel', empty: true })
  ];

  var VISIT_OPTIONS = [
    { id: '3d', label: 'Binnen 3 werkdagen', public: 'meestal binnen 3 werkdagen' },
    { id: '1w', label: 'Binnen 1 week', public: 'meestal binnen 1 week' },
    { id: '2w', label: 'Binnen 2 weken', public: 'meestal binnen 7 tot 14 dagen' },
    { id: '3_4w', label: 'Binnen 3–4 weken', public: 'meestal binnen 3 tot 4 weken' },
    { id: 'planning', label: 'Afhankelijk van planning', public: 'afhankelijk van planning' },
    { id: 'afspraak', label: 'Enkel op afspraak / contact', public: 'op afspraak' }
  ];

  var CAPACITY_OPTIONS = [
    { id: 'available', label: 'Nieuwe projecten mogelijk', public: 'Nieuwe projecten mogelijk' },
    { id: 'limited', label: 'Beperkt beschikbaar', public: 'Beperkt beschikbaar' },
    { id: 'full', label: 'Tijdelijk volzet', public: 'Tijdelijk volzet' }
  ];

  /* Partner Lab visit-extra types (optional P4 multi); same options for all categories. */
  var VISIT_EXTRA_OPTIONS = [
    { id: 'technisch_bezoek', label: 'Technisch bezoek' },
    { id: 'opmeting', label: 'Opmeting' },
    { id: 'ontwerpgesprek', label: 'Ontwerpgesprek' },
    { id: 'onderhoudsafspraak', label: 'Onderhoudsafspraak' }
  ];

  var DECLINE_REASONS = [
    { id: 'planning', label: 'Planning' },
    { id: 'outside_area', label: 'Buiten werkgebied' },
    { id: 'project_type', label: 'Type project' },
    { id: 'project_size', label: 'Projectomvang' },
    { id: 'budget', label: 'Budget' },
    { id: 'capacity', label: 'Capaciteit' },
    { id: 'other', label: 'Andere reden' }
  ];

  var REQUEST_STATUS = {
    NEW: 'new', VIEWED: 'viewed', INTERESTED: 'interested', DECLINED: 'declined',
    CONTACT_STARTED: 'contact_started', COMPLETED: 'completed'
  };

  /* ---------- Price engine ---------- */
  var PriceEngine = {
    models: PRICING_MODELS,
    labelFor: function (model) {
      var map = {
        per_m2: '€ / m²',
        per_linear_meter: '€ / lopende meter',
        per_item: '€ / stuk',
        per_hour: '€ / uur',
        starting_price: 'Vanafprijs',
        price_range: 'Prijsrange',
        project_price: 'Projectprijs',
        project_minimum: 'Projectminimum',
        per_wp: '€ / Wp',
        per_kwh: '€ / kWh',
        on_request: 'Op aanvraag'
      };
      return map[model] || model;
    },
    format: function (sp) {
      if (!sp) return { display: 'Prijs op aanvraag', context: '', model: 'on_request' };
      if (sp.display) return { display: sp.display, context: sp.context || this.labelFor(sp.pricing_model || sp.model), model: sp.pricing_model || sp.model };
      var model = sp.pricing_model || sp.model || 'on_request';
      if (model === 'on_request') return { display: 'Prijs op aanvraag', context: sp.label || '', model: model };
      if (model === 'starting_price' || (sp.min_price != null && sp.max_price == null)) {
        return { display: 'Vanaf € ' + Number(sp.min_price || sp.from).toLocaleString('nl-BE'), context: this.labelFor(model), model: model };
      }
      if (sp.min_price != null && sp.max_price != null) {
        var unit = '';
        if (model === 'per_m2') unit = ' / m²';
        if (model === 'per_linear_meter') unit = ' / lm';
        if (model === 'per_wp') unit = ' / Wp';
        if (model === 'per_kwh') unit = ' / kWh';
        if (model === 'per_hour') unit = ' / uur';
        return {
          display: '€ ' + Number(sp.min_price).toLocaleString('nl-BE') + ' – € ' + Number(sp.max_price).toLocaleString('nl-BE') + unit,
          context: 'Richtprijs · ' + this.labelFor(model),
          model: model
        };
      }
      return { display: 'Prijs op aanvraag', context: '', model: 'on_request' };
    },
    modelsForService: function (categoryId, serviceId) {
      var cat = CI[categoryId];
      if (!cat) return ['on_request'];
      for (var i = 0; i < cat.services.length; i++) {
        if (cat.services[i].id === serviceId) return cat.services[i].pricingModels.slice();
      }
      return ['on_request'];
    }
  };

  /* ---------- Matching engine ---------- */
  var MatchingEngine = {
    evaluate: function (partner, request) {
      var reasons = [];
      var ok = true;
      if (!partner || !request) return { ok: false, label: 'Onvoldoende gegevens', score: 0, reasons: [] };
      if (partner.category !== request.category) {
        return { ok: false, label: 'Andere categorie', score: 0, reasons: ['category_mismatch'] };
      }
      if (request.service && partner.services && partner.services.indexOf(request.service) < 0 &&
          partner.subtypes && partner.subtypes.indexOf(request.service) < 0) {
        ok = false; reasons.push('service_mismatch');
      }
      if (request.province && partner.province && request.province !== partner.province) {
        // soft — radius may still cover
        reasons.push('province_differs');
      }
      if (partner.capacity === 'full' && (request.timing === 'asap' || request.timing === '1m')) {
        ok = false; reasons.push('capacity');
      }
      if (partner.minProjectValue && request.budgetMax && request.budgetMax < partner.minProjectValue) {
        ok = false; reasons.push('below_minimum');
      }
      var label = ok ? 'Past bij je selectie' : 'Mogelijk minder relevant';
      if (ok && reasons.length === 0) label = 'Relevant voor dit project';
      return { ok: ok, label: label, score: ok ? (reasons.length ? 70 : 90) : 30, reasons: reasons };
    }
  };

  /* ---------- Profile mapper ---------- */
  var ProfileMapper = {
    mapPublic: function (partner, categoryId) {
      var cat = CI[categoryId || partner.category] || null;
      if (!cat) {
        return {
          identity: { name: partner && partner.name, specialtyLine: partner && partner.specialtyLine, image: partner && partner.image },
          trust: { controlled: true, google: null },
          core: {}, gallery: [], about: null, strengths: [], services: [], prices: [], availability: false, google: false, extras: {}
        };
      }
      var publicSet = {};
      (cat.publicFields || []).forEach(function (f) { publicSet[f] = true; });
      var pf = partner.publicFields || {};
      return {
        identity: { name: partner.name, specialtyLine: partner.specialtyLine, image: partner.image },
        trust: { controlled: true, google: partner.google && partner.google.consent ? partner.google : null },
        core: {
          radius: partner.radius,
          startMonth: partner.startMonth,
          visit: partner.visitPublic || partner.visit,
          capacityPublic: partner.capacityPublic
        },
        gallery: partner.gallery || [],
        about: partner.about || null,
        strengths: partner.strengths || [],
        services: publicSet.services ? (partner.serviceLabels || partner.specialties || []) : [],
        prices: publicSet.prices ? (partner.services || []) : [],
        availability: publicSet.availability !== false,
        google: publicSet.google !== false,
        extras: {
          years: pf.years ? partner.years : null,
          showroom: pf.showroom || partner.showroom || null,
          coordination: partner.coordination || null
        }
      };
    }
  };

  /* ---------- Onboarding engine ---------- */
  var PartnerOnboardingEngine = {
    steps: CORE_ONBOARD_STEPS,
    identityQuestions: IDENTITY_QUESTIONS,
    visitOptions: VISIT_OPTIONS,
    capacityOptions: CAPACITY_OPTIONS,
    visitExtraOptions: VISIT_EXTRA_OPTIONS,
    getCategory: function (id) { return CI[id] || null; },
    listCategories: function () {
      return Object.keys(CI).map(function (id) {
        return { id: id, label: CI[id].label, plural: CI[id].plural };
      });
    },
    getServices: function (categoryId) {
      var c = CI[categoryId];
      return c ? c.services.slice() : [];
    },
    getConditionalsForSelected: function (categoryId, selectedServiceIds) {
      var c = CI[categoryId];
      if (!c) return [];
      var out = [];
      selectedServiceIds = selectedServiceIds || [];
      c.services.forEach(function (s) {
        if (selectedServiceIds.indexOf(s.id) >= 0 && s.conditionals) {
          Object.keys(s.conditionals).forEach(function (k) {
            out.push(s.conditionals[k]);
          });
        }
      });
      return out;
    },
    getOnboardExtras: function (categoryId) {
      var c = CI[categoryId];
      if (!c) return [];
      var qs = (c.onboardQuestions || []).slice();
      if (c.projectTypes) {
        qs = qs.map(function (question) {
          if (question.key === 'projectTypes' && !question.options) {
            return q('projectTypes', 'multi', question.label, c.projectTypes.slice());
          }
          return question;
        });
      }
      return qs;
    },
    /** CI models for service + on_request (V2: always allowed escape hatch). */
    pricingModelsForService: function (categoryId, serviceId) {
      var models = PriceEngine.modelsForService(categoryId, serviceId);
      if (models.indexOf('on_request') < 0) models.push('on_request');
      return models;
    },
    unitHintForService: function (categoryId, serviceId) {
      var c = CI[categoryId];
      if (!c) return null;
      for (var i = 0; i < c.services.length; i++) {
        if (c.services[i].id === serviceId) return c.services[i].unitHint || null;
      }
      return null;
    },
    /** V2: show spoed only for dakwerken or selected service id `herstelling`. */
    showUrgencyJobs: function (categoryId, serviceIds) {
      if (categoryId === 'dakwerken') return true;
      serviceIds = serviceIds || [];
      return serviceIds.indexOf('herstelling') >= 0;
    },
    /** True when CI already asks project minimum as onboardQuestion (single source → P3). */
    hasCiProjectMinimum: function (categoryId) {
      var c = CI[categoryId];
      if (!c) return false;
      return (c.onboardQuestions || []).some(function (qq) {
        return qq.key === 'minProject';
      });
    },
    emptyAnswers: function () {
      return {
        companyName: '', tradeName: '', vat: '', website: '', email: '', phone: '',
        contact: '', contactRole: '', address: '', areaMode: 'radius', area: '',
        primaryCategory: '', subtypes: [], conditionalAnswers: {},
        yearsActive: '', strength: '', prefer: '', avoid: '', care: '', whyChoose: '',
        materialsText: '', mustKnow: '',
        capacity: 'limited', startMonth: '', visitSpeed: '2w',
        hasGoogle: '', googleQuery: '', googleConsent: false,
        prices: {}
      };
    }
  };

  /* ---------- Customer request engine ---------- */
  var CustomerRequestEngine = {
    declineReasons: DECLINE_REASONS,
    status: REQUEST_STATUS,
    getSteps: function (categoryId) {
      return [
        { id: 'service', label: 'Type werk' },
        { id: 'details', label: 'Projectdetails' },
        { id: 'timing', label: 'Timing' },
        { id: 'photos', label: 'Foto’s' },
        { id: 'budget', label: 'Budget' },
        { id: 'contact', label: 'Contact' },
        { id: 'review', label: 'Overzicht' }
      ];
    },
    getServiceOptions: function (categoryId) {
      var c = CI[categoryId];
      return c ? c.services.map(function (s) { return { id: s.id, label: s.label, sharedId: s.sharedId }; }) : [];
    },
    getDetailQuestions: function (categoryId) {
      var c = CI[categoryId];
      return c ? (c.customerQuestions || []).slice() : [];
    },
    emptyRequest: function (categoryId, partnerId) {
      return {
        category: categoryId || '',
        partnerIds: partnerId ? [partnerId] : [],
        service: '',
        answers: {},
        timing: '3m',
        hasBudget: 'nee',
        budgetFrom: '', budgetTo: '',
        name: '', email: '', phone: '', address: '',
        photos: 0,
        status: REQUEST_STATUS.NEW,
        step: 0,
        sent: false
      };
    }
  };

  /* ---------- Shared service resolver ---------- */
  function resolveSharedOwners(sharedId) {
    var s = SHARED_SERVICES[sharedId];
    return s ? s.categories.slice() : [];
  }

  function findServiceByShared(categoryId, sharedId) {
    var c = CI[categoryId];
    if (!c) return null;
    for (var i = 0; i < c.services.length; i++) {
      if (c.services[i].sharedId === sharedId) return c.services[i];
    }
    return null;
  }

  /* ---------- Export ---------- */
  EV.Intelligence = {
    version: '1.0.0',
    PRICING_MODELS: PRICING_MODELS,
    SHARED_SERVICES: SHARED_SERVICES,
    CATEGORIES: CI,
    CORE_ONBOARD_STEPS: CORE_ONBOARD_STEPS,
    IDENTITY_QUESTIONS: IDENTITY_QUESTIONS,
    VISIT_OPTIONS: VISIT_OPTIONS,
    CAPACITY_OPTIONS: CAPACITY_OPTIONS,
    VISIT_EXTRA_OPTIONS: VISIT_EXTRA_OPTIONS,
    DECLINE_REASONS: DECLINE_REASONS,
    REQUEST_STATUS: REQUEST_STATUS,
    PriceEngine: PriceEngine,
    MatchingEngine: MatchingEngine,
    ProfileMapper: ProfileMapper,
    PartnerOnboardingEngine: PartnerOnboardingEngine,
    CustomerRequestEngine: CustomerRequestEngine,
    resolveSharedOwners: resolveSharedOwners,
    findServiceByShared: findServiceByShared,
    getCategory: function (id) { return CI[id] || null; },
    qaChecklist: function () {
      return Object.keys(CI).map(function (id) {
        var c = CI[id];
        return {
          id: id,
          services: c.services.length,
          shared: c.services.filter(function (s) { return !!s.sharedId; }).map(function (s) { return s.sharedId; }),
          onboardQ: (c.onboardQuestions || []).length,
          customerQ: (c.customerQuestions || []).length,
          pricingModels: Array.from(new Set(c.services.reduce(function (acc, s) { return acc.concat(s.pricingModels); }, [])))
        };
      });
    }
  };

  // Back-compat aliases used by public pages
  if (!EV.CATEGORIES || !EV.CATEGORIES.dakwerken || !EV.CATEGORIES.dakwerken.services) {
    // keep existing categories.js if loaded; Intelligence is additive
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = EV.Intelligence;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
