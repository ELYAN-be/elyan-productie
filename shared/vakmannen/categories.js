/* ============================================================
   ELYAN Vakmannen — Category domain models (all 12)
   Research notes (BE/VL, 2025–2026 indicative market ranges):
   - Units and subtypes reflect common Belgian contractor practice.
   - Public prices are ALWAYS partner-supplied indications, never
     ELYAN quotes. Where market ranges are uncertain → on_request.
   - Sources consulted for structure (not copied as product claims):
     renovatiekampioen.be, isolatie-info.be, renovatiewerken.be,
     and ELYAN Calculator 1 existing category packaging.
   TODO: validate ranges with partner onboarding + ELYAN ops.
   ============================================================ */
(function (global) {
  'use strict';

  var PRICING = {
    M2_RANGE: 'm2_range',
    LM_RANGE: 'lm_range',
    PER_UNIT: 'per_unit',
    HOURLY: 'hourly',
    FROM: 'from',
    PROJECT_RANGE: 'project_range',
    PACKAGE: 'package',
    ON_REQUEST: 'on_request',
    AFTER_VISIT: 'after_visit'
  };

  function cat(def) { return def; }

  var CATEGORIES = {
    dakwerken: cat({
      id: 'dakwerken',
      label: 'Dakwerken',
      plural: 'Dakwerkers',
      researchNote: '€/m² for renovatie/isolatie; vanaf for herstelling; lm for goten.',
      subtypes: [
        { id: 'volledig', label: 'Volledige dakrenovatie', unitHint: 'm2' },
        { id: 'hellend', label: 'Hellend dak', unitHint: 'm2' },
        { id: 'plat', label: 'Plat dak', unitHint: 'm2' },
        { id: 'bedekking', label: 'Dakbedekking vervangen', unitHint: 'm2' },
        { id: 'isolatie', label: 'Dakisolatie', unitHint: 'm2' },
        { id: 'herstelling', label: 'Dakherstelling / lekkage', unitHint: 'from' },
        { id: 'constructie', label: 'Dakconstructie / timmerwerk', unitHint: 'on_request' },
        { id: 'goten', label: 'Goten / afvoer', unitHint: 'lm' },
        { id: 'dakvenster', label: 'Dakvensters', unitHint: 'unit' },
        { id: 'schoorsteen', label: 'Schoorsteenwerken', unitHint: 'on_request' }
      ],
      materials: ['Keramische pannen', 'Betonnen pannen', 'Leien', 'EPDM', 'Bitumen', 'Zink', 'PIR / minerale wol'],
      priceModels: [PRICING.M2_RANGE, PRICING.FROM, PRICING.LM_RANGE, PRICING.PER_UNIT, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Exacte m²', 'Staat onderdak', 'Asbest', 'Constructieve herstellingen'],
      exclusions: ['Asbestsanering', 'Interieurwerken buiten scope'],
      requestFields: ['workType', 'roofType', 'area', 'covering', 'insulation', 'condition', 'wants', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'roofTypes', type: 'multi', label: 'Welke daktypes doen jullie?', options: ['Hellend dak', 'Plat dak', 'Beide'] },
        { key: 'materials', type: 'multi', label: 'Materialen / systemen', options: ['Keramische pannen', 'Leien', 'EPDM', 'Bitumen', 'Isolatiepakketten', 'Zink'] },
        { key: 'smallJobs', type: 'select', label: 'Kleine herstellingen?', options: ['Ja', 'Nee', 'Beperkt'] }
      ]
    }),

    badkamer: cat({
      id: 'badkamer',
      label: 'Badkamer',
      plural: 'Badkamerspecialisten',
      researchNote: 'Usually project/forfait pricing; m² less common for full baths. Indicative BE: €3.500–€25.000 full renovation.',
      subtypes: [
        { id: 'volledig', label: 'Volledige badkamerrenovatie', unitHint: 'project' },
        { id: 'douche', label: 'Douche / inloopdouche', unitHint: 'project' },
        { id: 'bad', label: 'Bad plaatsen / vervangen', unitHint: 'project' },
        { id: 'sanitair', label: 'Sanitair', unitHint: 'unit' },
        { id: 'tegelwerken', label: 'Tegelwerken', unitHint: 'm2' },
        { id: 'meubel', label: 'Badkamermeubel / wastafel', unitHint: 'unit' },
        { id: 'leidingen', label: 'Leidingwerken', unitHint: 'on_request' },
        { id: 'ventilatie', label: 'Badkamerventilatie', unitHint: 'unit' }
      ],
      materials: ['Keramische tegels', 'Natuursteen', 'Inloopdouche', 'Thermostatische kranen'],
      priceModels: [PRICING.PROJECT_RANGE, PRICING.FROM, PRICING.M2_RANGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Leidingroutes', 'Waterdichtingsdetails', 'Afmetingen op maat'],
      exclusions: ['Structurele afbraak buiten badkamer'],
      requestFields: ['workType', 'size', 'existing', 'wants', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'scope', type: 'multi', label: 'Typische scope', options: ['Volledige renovatie', 'Douche', 'Tegelwerken', 'Sanitair', 'Leidingwerk'] },
        { key: 'wetWorks', type: 'select', label: 'Waterdichting inbegrepen?', options: ['Ja', 'Nee', 'Afhankelijk'] }
      ]
    }),

    keuken: cat({
      id: 'keuken',
      label: 'Keuken',
      plural: 'Keukenspecialisten',
      researchNote: 'Project/package pricing dominant; placement-only vs full kitchen differ strongly.',
      subtypes: [
        { id: 'volledig', label: 'Volledige keuken', unitHint: 'project' },
        { id: 'plaatsing', label: 'Keukenplaatsing', unitHint: 'project' },
        { id: 'renovatie', label: 'Renovatie bestaande keuken', unitHint: 'project' },
        { id: 'werkblad', label: 'Werkblad', unitHint: 'lm' },
        { id: 'toestellen', label: 'Toestellen', unitHint: 'unit' },
        { id: 'maatwerk', label: 'Maatwerk', unitHint: 'on_request' },
        { id: 'aansluitingen', label: 'Elektra & sanitair aansluiting', unitHint: 'on_request' }
      ],
      materials: ['Laminaat', 'Composiet', 'Natuursteen', 'Hout'],
      priceModels: [PRICING.PROJECT_RANGE, PRICING.FROM, PRICING.LM_RANGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Exacte opmeting', 'Aansluitpunten', 'Draagmuren'],
      exclusions: ['Losse toestellen zonder plaatsing (tenzij aangeboden)'],
      requestFields: ['workType', 'layout', 'wants', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'offerings', type: 'multi', label: 'Wat leveren jullie?', options: ['Plaatsing alleen', 'Keuken + plaatsing', 'Werkblad', 'Aansluitingen', 'Maatwerk'] }
      ]
    }),

    'ramen-deuren': cat({
      id: 'ramen-deuren',
      label: 'Ramen & deuren',
      plural: 'Ramen- & deurenspecialisten',
      researchNote: 'Often €/m² glass or €/unit; PVC/ALU/hout matter. BE indicative €600–€1.200/m² glass surface.',
      subtypes: [
        { id: 'ramen', label: 'Ramen vervangen', unitHint: 'm2_or_unit' },
        { id: 'buitendeuren', label: 'Buitendeuren', unitHint: 'unit' },
        { id: 'schuif', label: 'Schuiframen / -deuren', unitHint: 'unit' },
        { id: 'voordeur', label: 'Voordeur', unitHint: 'unit' },
        { id: 'binnendeuren', label: 'Binnendeuren', unitHint: 'unit' },
        { id: 'beglazing', label: 'Beglazing vernieuwen', unitHint: 'm2' },
        { id: 'roluiken', label: 'Roluiken / screens', unitHint: 'unit' }
      ],
      materials: ['PVC', 'Aluminium', 'Hout', 'Hout-aluminium', 'Dubbel glas', 'Drievoudig glas'],
      priceModels: [PRICING.PER_UNIT, PRICING.M2_RANGE, PRICING.FROM, PRICING.PROJECT_RANGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Exacte opmeting', 'Dagmaten', 'Metselwerkherstellingen'],
      exclusions: ['Structurele gevelopeningen zonder aannemer'],
      requestFields: ['workType', 'count', 'materialPref', 'glazing', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'materials', type: 'multi', label: 'Materialen', options: ['PVC', 'Aluminium', 'Hout', 'Hout-aluminium'] },
        { key: 'glazing', type: 'multi', label: 'Beglazing', options: ['Dubbel glas', 'Drievoudig glas', 'Renovatieglas'] }
      ]
    }),

    isolatie: cat({
      id: 'isolatie',
      label: 'Isolatie',
      plural: 'Isolatiespecialisten',
      researchNote: 'Strong €/m² culture. Dak/spouw/gevel/vloer differ widely (approx. €15–€250/m² depending on method).',
      subtypes: [
        { id: 'dak', label: 'Dakisolatie', unitHint: 'm2' },
        { id: 'zolder', label: 'Zoldervloerisolatie', unitHint: 'm2' },
        { id: 'spouw', label: 'Spouwmuurisolatie', unitHint: 'm2' },
        { id: 'buitenmuur', label: 'Buitengevelisolatie', unitHint: 'm2' },
        { id: 'binnenmuur', label: 'Binnenmuurisolatie', unitHint: 'm2' },
        { id: 'vloer', label: 'Vloerisolatie', unitHint: 'm2' },
        { id: 'kelder', label: 'Kelderisolatie', unitHint: 'm2' }
      ],
      materials: ['Minerale wol', 'PIR', 'EPS', 'Inblaasisolatie', 'Gespoten schuim'],
      priceModels: [PRICING.M2_RANGE, PRICING.FROM, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Opbouw', 'Vochtproblemen', 'Koudebruggen'],
      exclusions: ['Asbestsanering'],
      requestFields: ['workType', 'area', 'method', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'methods', type: 'multi', label: 'Isolatiemethodes', options: ['Inblazen', 'Platen', 'Gespoten schuim', 'Minerale wol'] }
      ]
    }),

    verwarming: cat({
      id: 'verwarming',
      label: 'Verwarming',
      plural: 'Verwarmingsspecialisten',
      researchNote: 'Installatie/package pricing; warmtepomp often from €15k–€25k all-in market ballpark — show partner ranges only.',
      subtypes: [
        { id: 'warmtepomp', label: 'Warmtepomp', unitHint: 'package' },
        { id: 'hybride', label: 'Hybride systeem', unitHint: 'package' },
        { id: 'cv', label: 'CV-ketel', unitHint: 'package' },
        { id: 'vloerverwarming', label: 'Vloerverwarming', unitHint: 'm2' },
        { id: 'radiatoren', label: 'Radiatoren', unitHint: 'unit' },
        { id: 'boiler', label: 'Boiler / warm water', unitHint: 'unit' },
        { id: 'onderhoud', label: 'Onderhoud / herstelling', unitHint: 'hourly_or_from' }
      ],
      materials: ['Lucht-water', 'Bodem-water', 'Hybride', 'Condensatieketel'],
      priceModels: [PRICING.FROM, PRICING.PACKAGE, PRICING.PROJECT_RANGE, PRICING.M2_RANGE, PRICING.HOURLY, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Warmteverliesberekening', 'Afgiftesysteem', 'Elektrische aansluiting'],
      exclusions: ['Werken zonder keuring waar verplicht'],
      requestFields: ['workType', 'currentSystem', 'homeSize', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'systems', type: 'multi', label: 'Systemen', options: ['Lucht-water warmtepomp', 'Hybride', 'CV-ketel', 'Vloerverwarming'] }
      ]
    }),

    elektriciteit: cat({
      id: 'elektriciteit',
      label: 'Elektriciteit',
      plural: 'Elektriciens',
      researchNote: 'Hourly + forfait common; full rewiring sometimes €/m² living area. Keuring is BE-specific.',
      subtypes: [
        { id: 'volledig', label: 'Volledige herbekabeling', unitHint: 'project_or_m2' },
        { id: 'bord', label: 'Elektrisch bord', unitHint: 'package' },
        { id: 'stopcontacten', label: 'Stopcontacten & schakelaars', unitHint: 'unit' },
        { id: 'verlichting', label: 'Verlichting', unitHint: 'unit' },
        { id: 'laden', label: 'Laadpunt wagen', unitHint: 'package' },
        { id: 'keuring', label: 'Keuring / aanpassing', unitHint: 'from' },
        { id: 'domotica', label: 'Domotica', unitHint: 'on_request' }
      ],
      materials: ['Traditioneel', 'Domotica', 'Laadinfrastructuur'],
      priceModels: [PRICING.HOURLY, PRICING.FROM, PRICING.PACKAGE, PRICING.PROJECT_RANGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Schema bestaande installatie', 'Vermogen', 'Kabeltracés'],
      exclusions: ['Illegale installaties zonder regularisatiepad'],
      requestFields: ['workType', 'scope', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'scope', type: 'multi', label: 'Typische werken', options: ['Renovatie woningen', 'Bord vernieuwen', 'Laadpunten', 'Verlichting', 'Keuring'] }
      ]
    }),

    gevel: cat({
      id: 'gevel',
      label: 'Gevel',
      plural: 'Gevelspecialisten',
      researchNote: '€/m² dominant for crepi/isolatie/steenstrips; cleaning often from/project.',
      subtypes: [
        { id: 'gevelrenovatie', label: 'Gevelrenovatie', unitHint: 'm2' },
        { id: 'crepi', label: 'Crepi / sierpleister', unitHint: 'm2' },
        { id: 'steenstrips', label: 'Steenstrips', unitHint: 'm2' },
        { id: 'isolatie', label: 'Gevelisolatie', unitHint: 'm2' },
        { id: 'voegen', label: 'Voegwerken', unitHint: 'm2' },
        { id: 'reiniging', label: 'Gevelreiniging', unitHint: 'm2_or_from' },
        { id: 'schilderen', label: 'Gevelschilderen', unitHint: 'm2' }
      ],
      materials: ['EPS + crepi', 'Minerale pleister', 'Steenstrips', 'Baksteen'],
      priceModels: [PRICING.M2_RANGE, PRICING.FROM, PRICING.PROJECT_RANGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Ondergrond', 'Hoogte / stelling', 'Detailaansluitingen'],
      exclusions: ['Structurele gevelherstellingen buiten scope'],
      requestFields: ['workType', 'area', 'finish', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'finishes', type: 'multi', label: 'Afwerkingen', options: ['Crepi', 'Steenstrips', 'Schilderen', 'Isolatie + afwerking'] }
      ]
    }),

    vloeren: cat({
      id: 'vloeren',
      label: 'Vloeren',
      plural: 'Vloerspecialisten',
      researchNote: '€/m² for floor finishes; lm for plinten; chape separate.',
      subtypes: [
        { id: 'tegel', label: 'Tegelvloer', unitHint: 'm2' },
        { id: 'parket', label: 'Parket', unitHint: 'm2' },
        { id: 'laminaat', label: 'Laminaat / vinyl', unitHint: 'm2' },
        { id: 'chape', label: 'Chape', unitHint: 'm2' },
        { id: 'egaliseren', label: 'Egaliseren', unitHint: 'm2' },
        { id: 'plinten', label: 'Plinten & afwerking', unitHint: 'lm' }
      ],
      materials: ['Keramiek', 'Natuursteen', 'Massief parket', 'Meerlagenparket', 'Vinyl'],
      priceModels: [PRICING.M2_RANGE, PRICING.LM_RANGE, PRICING.FROM, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Ondergrondvlakheid', 'Vocht', 'Uitzettingsvoegen'],
      exclusions: ['Structurele vloerwerken buiten afwerking'],
      requestFields: ['workType', 'area', 'materialPref', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'floors', type: 'multi', label: 'Vloertypes', options: ['Tegel', 'Parket', 'Vinyl', 'Chape'] }
      ]
    }),

    schilderwerken: cat({
      id: 'schilderwerken',
      label: 'Schilderwerken',
      plural: 'Schilders',
      researchNote: '€/m² and hourly both common; interiors often project forfait.',
      subtypes: [
        { id: 'binnen', label: 'Binnenschilderwerk', unitHint: 'm2' },
        { id: 'buiten', label: 'Buitenschilderwerk', unitHint: 'm2' },
        { id: 'lakwerk', label: 'Lakwerk (deuren/ramen)', unitHint: 'unit_or_hourly' },
        { id: 'behang', label: 'Behang', unitHint: 'm2' },
        { id: 'plafond', label: 'Plafonds', unitHint: 'm2' },
        { id: 'gevel', label: 'Gevelschilderen', unitHint: 'm2' }
      ],
      materials: ['Latex', 'Alkyd', 'Behang', 'Voorstrijk'],
      priceModels: [PRICING.M2_RANGE, PRICING.HOURLY, PRICING.PROJECT_RANGE, PRICING.FROM, PRICING.ON_REQUEST],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Ondergrondstaat', 'Aantal lagen', 'Kleurkeuze'],
      exclusions: ['Asbestverf zonder sanering'],
      requestFields: ['workType', 'area', 'rooms', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'scope', type: 'multi', label: 'Focus', options: ['Binnen', 'Buiten', 'Lakwerk', 'Behang'] }
      ]
    }),

    ventilatie: cat({
      id: 'ventilatie',
      label: 'Ventilatie',
      plural: 'Ventilatiespecialisten',
      researchNote: 'System C/D package pricing; strongly after-visit dependent.',
      subtypes: [
        { id: 'd', label: 'Systeem D', unitHint: 'package' },
        { id: 'c', label: 'Systeem C', unitHint: 'package' },
        { id: 'renovatie', label: 'Renovatieventilatie', unitHint: 'package' },
        { id: 'decentraal', label: 'Decentrale units', unitHint: 'unit' },
        { id: 'onderhoud', label: 'Onderhoud / reiniging', unitHint: 'from' },
        { id: 'kanalen', label: 'Kanalen', unitHint: 'on_request' }
      ],
      materials: ['Systeem D', 'Systeem C', 'Decentrale WTW'],
      priceModels: [PRICING.FROM, PRICING.PACKAGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Woninglayout', 'Kanaalroutes', 'Geluidsdemping'],
      exclusions: ['Werken zonder EPB-context waar relevant'],
      requestFields: ['workType', 'homeType', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'systems', type: 'multi', label: 'Systemen', options: ['Systeem D', 'Systeem C', 'Decentrale units'] }
      ]
    }),

    zonnepanelen: cat({
      id: 'zonnepanelen',
      label: 'Zonnepanelen',
      plural: 'Zonnepanelenpartners',
      researchNote: '€/Wp or package; battery separate. Strongly site-dependent → after visit / on request often correct.',
      subtypes: [
        { id: 'installatie', label: 'Nieuwe installatie', unitHint: 'wp_or_package' },
        { id: 'uitbreiding', label: 'Uitbreiding', unitHint: 'wp' },
        { id: 'thuisbatterij', label: 'Thuisbatterij', unitHint: 'package' },
        { id: 'omvormer', label: 'Omvormer vervangen', unitHint: 'unit' },
        { id: 'onderhoud', label: 'Onderhoud / controle', unitHint: 'from' }
      ],
      materials: ['Monokristallijn', 'Micro-omvormers', 'String-omvormer', 'Thuisbatterij'],
      priceModels: [PRICING.FROM, PRICING.PACKAGE, PRICING.ON_REQUEST, PRICING.AFTER_VISIT],
      filters: ['subtype', 'timing', 'region'],
      afterVisit: ['Dakoriëntatie', 'Schaduwwerking', 'Omvormerlocatie', 'Netstudie'],
      exclusions: ['Ongeschikte dakconstructie zonder versterking'],
      requestFields: ['workType', 'consumption', 'roof', 'timing', 'photos', 'budget', 'contact'],
      onboardExtras: [
        { key: 'offerings', type: 'multi', label: 'Aanbod', options: ['Panelen', 'Batterij', 'Omvormers', 'Monitoring'] }
      ]
    })
  };

  var CATEGORY_LIST = Object.keys(CATEGORIES).map(function (id) {
    return { id: id, label: CATEGORIES[id].label, plural: CATEGORIES[id].plural };
  });

  var VISIT_SPEED_OPTIONS = [
    { id: '3d', label: 'Binnen 3 werkdagen', public: 'meestal binnen 3 werkdagen' },
    { id: '1w', label: 'Binnen 1 week', public: 'meestal binnen 1 week' },
    { id: '2w', label: 'Binnen 2 weken', public: 'meestal binnen 7 tot 14 dagen' },
    { id: '3_4w', label: 'Binnen 3–4 weken', public: 'meestal binnen 3 tot 4 weken' },
    { id: 'planning', label: 'Afhankelijk van planning', public: 'afhankelijk van planning' },
    { id: 'afspraak', label: 'Enkel op afspraak / contact', public: 'op afspraak' }
  ];

  var CAPACITY_OPTIONS = [
    { id: 'available', label: 'Beschikbaar', public: 'Nieuwe projecten mogelijk' },
    { id: 'limited', label: 'Beperkt beschikbaar', public: 'Beperkt beschikbaar' },
    { id: 'full', label: 'Momenteel volzet', public: null }
  ];

  var CUSTOMER_TIMING = [
    { id: 'alle', label: 'Alle timing' },
    { id: 'asap', label: 'Zo snel mogelijk' },
    { id: '1m', label: 'Binnen 1 maand' },
    { id: '3m', label: 'Binnen 3 maanden' },
    { id: '6m', label: 'Binnen 6 maanden' },
    { id: 'flex', label: 'Later / flexibel' }
  ];

  var REQUEST_STATUS = {
    NEW: 'new',
    VIEWED: 'viewed',
    INTERESTED: 'interested',
    DECLINED: 'declined',
    CONTACT_STARTED: 'contact_started',
    COMPLETED: 'completed'
  };

  var PROVINCES = [
    'Antwerpen', 'Limburg', 'Oost-Vlaanderen', 'West-Vlaanderen',
    'Vlaams-Brabant', 'Waals-Brabant', 'Henegouwen', 'Luik',
    'Luxemburg', 'Namen', 'Brussels Hoofdstedelijk Gewest'
  ];

  global.ElyanVakmannen = global.ElyanVakmannen || {};
  global.ElyanVakmannen.PRICING = PRICING;
  global.ElyanVakmannen.CATEGORIES = CATEGORIES;
  global.ElyanVakmannen.CATEGORY_LIST = CATEGORY_LIST;
  global.ElyanVakmannen.VISIT_SPEED_OPTIONS = VISIT_SPEED_OPTIONS;
  global.ElyanVakmannen.CAPACITY_OPTIONS = CAPACITY_OPTIONS;
  global.ElyanVakmannen.CUSTOMER_TIMING = CUSTOMER_TIMING;
  global.ElyanVakmannen.REQUEST_STATUS = REQUEST_STATUS;
  global.ElyanVakmannen.PROVINCES = PROVINCES;
  global.ElyanVakmannen.getCategory = function (id) {
    var CI = global.ElyanVakmannen.Intelligence;
    if (CI && CI.CATEGORIES && CI.CATEGORIES[id]) {
      var intel = CI.CATEGORIES[id];
      var base = CATEGORIES[id] || {};
      return {
        id: intel.id,
        label: intel.label,
        plural: intel.plural,
        subtypes: intel.services.map(function (s) {
          return { id: s.id, label: s.label, sharedId: s.sharedId || null, unitHint: s.unitHint || null, pricingModels: s.pricingModels || [] };
        }),
        customerQuestions: intel.customerQuestions || [],
        onboardQuestions: intel.onboardQuestions || [],
        projectTypes: intel.projectTypes || [],
        publicFields: intel.publicFields || [],
        matchingFields: intel.matchingFields || [],
        priceModels: base.priceModels || [],
        filters: base.filters || ['subtype', 'timing', 'region'],
        materials: base.materials || [],
        researchNote: base.researchNote || null
      };
    }
    if (CATEGORIES[id]) return CATEGORIES[id];
    return null;
  };
})(typeof window !== 'undefined' ? window : global);
