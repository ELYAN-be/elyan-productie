/* ============================================================
   ELYAN — Vragenlijst per renovatiecategorie (12–15 vragen)
   Gedeeld door client (browser) en server (validatie).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanQuestions = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROVINCE_OPTIONS = [
    { value: 'antwerpen', label: 'Antwerpen' },
    { value: 'brussel', label: 'Brussel' },
    { value: 'henegouwen', label: 'Henegouwen' },
    { value: 'limburg', label: 'Limburg' },
    { value: 'luik', label: 'Luik' },
    { value: 'luxemburg', label: 'Luxemburg' },
    { value: 'namen', label: 'Namen' },
    { value: 'oost-vlaanderen', label: 'Oost-Vlaanderen' },
    { value: 'vlaams-brabant', label: 'Vlaams-Brabant' },
    { value: 'waals-brabant', label: 'Waals-Brabant' },
    { value: 'west-vlaanderen', label: 'West-Vlaanderen' }
  ];

  var LEVEL_OPTIONS = [
    { value: 'basis', label: 'Basis', priceHint: '€', desc: 'Functioneel en efficiënt, met standaard materialen.' },
    { value: 'standaard', label: 'Standaard', priceHint: '€€', desc: 'Kwalitatieve materialen met een verzorgde afwerking.' },
    { value: 'premium', label: 'Premium', priceHint: '€€€', desc: 'Hoogwaardige materialen en maatwerk tot in het detail.' }
  ];

  var AGE_OPTIONS = [
    { value: 'jong', label: 'Jonger dan 10 jaar', desc: 'Meestal 21% btw op renovatie.' },
    { value: 'middel', label: '10 tot 30 jaar', desc: 'Vaak in aanmerking voor 6% btw.' },
    { value: 'oud', label: 'Ouder dan 30 jaar', desc: 'Vaak 6% btw; extra aandacht voor leidingen en structuur.' }
  ];

  var URGENCY_OPTIONS = [
    { value: 'flexibel', label: 'Flexibel', desc: 'Geen harde deadline, tijd om te vergelijken.' },
    { value: 'binnen6', label: 'Binnen 6 maanden', desc: 'Planmatig, met ruimte voor offertes.' },
    { value: 'snel', label: 'Zo snel mogelijk', desc: 'Houd rekening met wachttijden bij aannemers.' }
  ];

  function when(key, values) {
    return function (answers) {
      var v = answers[key];
      return values.indexOf(v) !== -1;
    };
  }

  function sharedStart() {
    return [
      {
        id: 'province',
        type: 'chips',
        question: 'In welke provincie bevindt het project zich?',
        hint: 'Dit helpt ELYAN rekening te houden met regionale prijsverschillen.',
        options: PROVINCE_OPTIONS,
        autoAdvance: true
      },
      {
        id: 'housingAge',
        type: 'cards',
        question: 'Hoe oud is de woning ongeveer?',
        hint: 'Dit beïnvloedt btw-tarief, risico’s en praktische aanbevelingen.',
        options: AGE_OPTIONS,
        autoAdvance: true
      }
    ];
  }

  function levelQuestion() {
    return {
      id: 'level',
      type: 'finish',
      question: 'Welk afwerkingsniveau heb je in gedachten?',
      hint: 'Dit bepaalt de kwaliteit van materialen en afwerking.',
      options: LEVEL_OPTIONS,
      autoAdvance: true
    };
  }

  function urgencyQuestion() {
    return {
      id: 'urgency',
      type: 'cards',
      question: 'Wanneer wil je bij voorkeur starten?',
      hint: 'We gebruiken dit voor realistische planningstips in je rapport.',
      options: URGENCY_OPTIONS,
      autoAdvance: true
    };
  }

  function notesQuestion() {
    return {
      id: 'notes',
      type: 'notes',
      question: 'Nog specifieke wensen of opmerkingen?',
      hint: 'Optioneel. Hoe meer detail, hoe nuttiger je rapport.',
      optional: true
    };
  }

  function numberQuestion(presets, question, hint) {
    return {
      id: 'size',
      type: 'number',
      question: question || 'Hoeveel vierkante meter omvat het project?',
      hint: hint || 'Een schatting volstaat, je kan dit later steeds verfijnen.',
      presets: presets,
      defaultPresetIndex: 1,
      unit: 'm²',
      min: 1,
      max: 999
    };
  }

  var CATEGORY_QUESTIONS = {
    badkamer: function () {
      return sharedStart().concat([
        {
          id: 'scope',
          type: 'cards',
          question: 'Hoe grondig wil je de badkamer aanpakken?',
          hint: 'Het verschil tussen een opfrissing en een totale renovatie is groot in prijs.',
          options: [
            { value: 'opfrissing', label: 'Opfrissing', desc: 'Vooral sanitair en/of tegels vernieuwen, layout blijft.' },
            { value: 'gedeeltelijk', label: 'Gedeeltelijke renovatie', desc: 'Enkele zones of installaties vernieuwen.' },
            { value: 'volledig', label: 'Volledige renovatie', desc: 'Alles eruit, nieuwe opbouw en afwerking.' }
          ],
          autoAdvance: true
        },
        numberQuestion([4, 6, 8, 12], 'Hoe groot is de badkamer?', 'Meet bij voorkeur de vloeroppervlakte.'),
        {
          id: 'sanitary',
          type: 'cards',
          question: 'Welk sanitair wil je (nieuw) voorzien?',
          hint: 'Sanitair is vaak een van de zwaarste kostendrijvers.',
          options: [
            { value: 'douche', label: 'Douche', desc: 'Inloopdouche of douchecabine.' },
            { value: 'bad', label: 'Bad', desc: 'Ligbad of badcombinatie.' },
            { value: 'beide', label: 'Douche én bad', desc: 'Volledige sanitaire set-up.' },
            { value: 'behouden', label: 'Sanitair behouden', desc: 'Bestaand sanitair blijft grotendeels.' }
          ],
          autoAdvance: true
        },
        {
          id: 'tiling',
          type: 'cards',
          question: 'Wat met de betegeling?',
          hint: 'Volledige betegeling vraagt meer materiaal en werkuren.',
          options: [
            { value: 'volledig', label: 'Volledig betegelen', desc: 'Vloer én wanden (natte zones).' },
            { value: 'gedeeltelijk', label: 'Gedeeltelijk', desc: 'Enkel natte zone of vloer.' },
            { value: 'schilder', label: 'Schilderen / geen tegels', desc: 'Vochtbestendige afwerking zonder volle betegeling.' }
          ],
          autoAdvance: true
        },
        {
          id: 'plumbingMove',
          type: 'cards',
          question: 'Moeten water- of afvoerleidingen verplaatst worden?',
          hint: 'Leidingen op dezelfde plaats houden bespaart meestal sterk.',
          options: [
            { value: 'nee', label: 'Nee, zelfde plaats', desc: 'Kostenefficiëntste optie.' },
            { value: 'beperkt', label: 'Beperkt verplaatsen', desc: 'Kleine aanpassingen volstaan.' },
            { value: 'ja', label: 'Ja, nieuwe layout', desc: 'Leidingen volgen de nieuwe indeling.' }
          ],
          autoAdvance: true
        },
        {
          id: 'ventilation',
          type: 'cards',
          question: 'Is er (goede) ventilatie aanwezig?',
          hint: 'Goede ventilatie voorkomt vochtproblemen op lange termijn.',
          options: [
            { value: 'goed', label: 'Ja, in orde', desc: 'Bestaande ventilatie blijft.' },
            { value: 'verbeteren', label: 'Moet verbeterd', desc: 'Ventilator of mechanische afvoer voorzien.' },
            { value: 'onbekend', label: 'Weet ik niet', desc: 'We rekenen een voorzichtige buffer in.' }
          ],
          autoAdvance: true
        },
        {
          id: 'ufh',
          type: 'cards',
          question: 'Wil je vloerverwarming in de badkamer?',
          hint: 'Comfortabel, maar een aparte kosten- en droogtijdspost.',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja' }
          ],
          autoAdvance: true
        },
        {
          id: 'demolition',
          type: 'cards',
          question: 'Is er afbraak nodig?',
          hint: 'Denk aan oude tegels, chape of sanitair verwijderen.',
          options: [
            { value: 'beperkt', label: 'Beperkt', desc: 'Lichte demontage.' },
            { value: 'volledig', label: 'Volledige afbraak', desc: 'Alles uitbreken tot kale basis.' },
            { value: 'geen', label: 'Amper / geen', desc: 'Bestaande ondergrond blijft.' }
          ],
          showIf: when('scope', ['gedeeltelijk', 'volledig']),
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    keuken: function () {
      return sharedStart().concat([
        {
          id: 'scope',
          type: 'cards',
          question: 'Wat wil je met de keuken doen?',
          hint: 'Een nieuwe indeling of enkel nieuwe kasten maakt een groot verschil.',
          options: [
            { value: 'fronten', label: 'Fronten / facelift', desc: 'Deuren, werkblad of afwerking vernieuwen.' },
            { value: 'vervangen', label: 'Keuken vervangen', desc: 'Nieuwe kasten op dezelfde layout.' },
            { value: 'herindelen', label: 'Volledig herindelen', desc: 'Nieuwe indeling, aansluitingen en afwerking.' }
          ],
          autoAdvance: true
        },
        numberQuestion([8, 12, 16, 24], 'Hoe groot is de keukenruimte?', 'Meet de vloeroppervlakte van de keuken.'),
        {
          id: 'cabinets',
          type: 'cards',
          question: 'Welk type keukenkasten streef je na?',
          hint: 'Het kastenniveau bepaalt een groot deel van het materiaalbudget.',
          options: [
            { value: 'budget', label: 'Budget / standaard', desc: 'Goede basiskeuken, efficiënt geprijsd.' },
            { value: 'midden', label: 'Middensegment', desc: 'Sterke prijs-kwaliteit, gangbaar in België.' },
            { value: 'hoog', label: 'Hoogwaardig / maatwerk', desc: 'Premium materialen en afwerking.' }
          ],
          autoAdvance: true
        },
        {
          id: 'appliances',
          type: 'cards',
          question: 'Zijn nieuwe toestellen inbegrepen in het budget?',
          hint: 'Inbouwapparatuur weegt zwaar door in het totaal.',
          options: [
            { value: 'nee', label: 'Nee, apart / bestaand', desc: 'Toestellen niet in deze raming.' },
            { value: 'basis', label: 'Basispakket', desc: 'Oven, koelkast, kookplaat, dampkap.' },
            { value: 'uitgebreid', label: 'Uitgebreid pakket', desc: 'Inclusief vaatwas, micro, kwalitatieve toestellen.' }
          ],
          autoAdvance: true
        },
        {
          id: 'worktop',
          type: 'cards',
          question: 'Welk werkblad heb je in gedachten?',
          hint: 'Materiaalkeuze beïnvloedt zowel prijs als duurzaamheid.',
          options: [
            { value: 'laminaat', label: 'Laminaat / composiet basis' },
            { value: 'composiet', label: 'Composiet / keramiek' },
            { value: 'natuursteen', label: 'Natuursteen / premium' }
          ],
          autoAdvance: true
        },
        {
          id: 'connections',
          type: 'cards',
          question: 'Moeten water- of elektriciteitsaansluitingen verplaatst worden?',
          hint: 'Verplaatsen van aansluitingen verhoogt de kostprijs aanzienlijk.',
          options: [
            { value: 'nee', label: 'Nee, blijven staan' },
            { value: 'beperkt', label: 'Beperkte aanpassingen' },
            { value: 'ja', label: 'Ja, nieuwe layout' }
          ],
          showIf: when('scope', ['vervangen', 'herindelen']),
          autoAdvance: true
        },
        {
          id: 'splashback',
          type: 'cards',
          question: 'Wil je een spatwand of betegeling achter het werkblad?',
          options: [
            { value: 'nee', label: 'Nee / schilderen' },
            { value: 'ja', label: 'Ja, tegels of paneel' }
          ],
          autoAdvance: true
        },
        {
          id: 'flooring',
          type: 'cards',
          question: 'Wordt de keukenvloer mee vernieuwd?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    dak: function () {
      return sharedStart().concat([
        {
          id: 'roofType',
          type: 'cards',
          question: 'Welk type dak gaat het om?',
          options: [
            { value: 'hellend', label: 'Hellend dak', desc: 'Klassiek pannendak of leien.' },
            { value: 'plat', label: 'Plat dak', desc: 'EPDM, roofing of gelijkaardig.' }
          ],
          autoAdvance: true
        },
        {
          id: 'workType',
          type: 'cards',
          question: 'Welke werken wil je laten uitvoeren?',
          hint: 'Herstelling, isolatie of volledige vernieuwing hebben een andere prijslogica.',
          options: [
            { value: 'herstelling', label: 'Herstelling', desc: 'Lokale problemen aanpakken.' },
            { value: 'isolatie', label: 'Isolatie (+ afwerking)', desc: 'Focus op energieprestatie.' },
            { value: 'vernieuwen', label: 'Dakbedekking vernieuwen', desc: 'Nieuwe bedekking over het geheel.' },
            { value: 'volledig', label: 'Volledige dakrenovatie', desc: 'Bedekking, isolatie en details.' }
          ],
          autoAdvance: true
        },
        numberQuestion([60, 90, 120, 180], 'Hoe groot is het dakoppervlak ongeveer?', 'Een schatting van de dakoppervlakte volstaat.'),
        {
          id: 'material',
          type: 'cards',
          question: 'Welk materiaal heb je in gedachten?',
          showIf: function (a) {
            return a.workType === 'vernieuwen' || a.workType === 'volledig' || a.workType === 'isolatie';
          },
          options: [
            { value: 'pannen', label: 'Dakpannen' },
            { value: 'leien', label: 'Leien' },
            { value: 'epdm', label: 'EPDM / roofing (plat)' },
            { value: 'onbekend', label: 'Nog niet zeker' }
          ],
          autoAdvance: true
        },
        {
          id: 'insulation',
          type: 'cards',
          question: 'Wil je (extra) dakisolatie voorzien?',
          showIf: when('workType', ['herstelling', 'vernieuwen']),
          options: [
            { value: 'nee', label: 'Nee, niet nu' },
            { value: 'ja', label: 'Ja' },
            { value: 'onbekend', label: 'Nog te bekijken' }
          ],
          autoAdvance: true
        },
        {
          id: 'gutters',
          type: 'cards',
          question: 'Moeten goten of regenafvoer mee vernieuwd worden?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja' },
            { value: 'onbekend', label: 'Weet ik niet' }
          ],
          autoAdvance: true
        },
        {
          id: 'access',
          type: 'cards',
          question: 'Hoe is de toegankelijkheid van het dak?',
          hint: 'Moeilijke toegang of steigers verhogen de arbeids- en veiligheidskost.',
          options: [
            { value: 'vlot', label: 'Vlot bereikbaar', desc: 'Eenvoudige werftoegang.' },
            { value: 'normaal', label: 'Normaal', desc: 'Standaard steiger of ladderlift.' },
            { value: 'moeilijk', label: 'Moeilijk / steile situatie', desc: 'Complexere veiligheidsmaatregelen.' }
          ],
          autoAdvance: true
        },
        {
          id: 'asbestos',
          type: 'cards',
          question: 'Is er een vermoeden van asbesthoudend materiaal?',
          hint: 'Asbestvereist speciale verwijdering en beïnvloedt planning én budget.',
          showIf: when('housingAge', ['middel', 'oud']),
          options: [
            { value: 'nee', label: 'Nee / onwaarschijnlijk' },
            { value: 'mogelijk', label: 'Mogelijk', desc: 'Laat dit best controleren.' },
            { value: 'ja', label: 'Ja, vermoedelijk' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    vloeren: function () {
      return sharedStart().concat([
        {
          id: 'floorMaterial',
          type: 'cards',
          question: 'Welk vloermateriaal overweeg je?',
          options: [
            { value: 'laminaat', label: 'Laminaat / vinyl', desc: 'Snelle, budgetvriendelijke optie.' },
            { value: 'parket', label: 'Parket / hout', desc: 'Warm karakter, meer voorbereiding.' },
            { value: 'tegel', label: 'Tegels', desc: 'Duurzaam, ideaal voor natte ruimtes.' },
            { value: 'gietvloer', label: 'Gietvloer / premium', desc: 'Strak en hoogwaardig.' }
          ],
          autoAdvance: true
        },
        numberQuestion([15, 30, 50, 100], 'Hoeveel m² vloer wil je vernieuwen?', 'Tel de te vernieuwen ruimtes samen.'),
        {
          id: 'rooms',
          type: 'cards',
          question: 'Om hoeveel zones of ruimtes gaat het?',
          hint: 'Meer ruimtes betekent meer snijwerk, overgangen en afwerking.',
          options: [
            { value: '1', label: '1 ruimte' },
            { value: '2-3', label: '2 tot 3 ruimtes' },
            { value: 'meer', label: '4 of meer ruimtes' }
          ],
          autoAdvance: true
        },
        {
          id: 'removal',
          type: 'cards',
          question: 'Moet de bestaande vloer verwijderd worden?',
          options: [
            { value: 'nee', label: 'Nee, eroverheen mogelijk' },
            { value: 'ja', label: 'Ja, uitbreken' },
            { value: 'onbekend', label: 'Nog te bekijken' }
          ],
          autoAdvance: true
        },
        {
          id: 'substrate',
          type: 'cards',
          question: 'Hoe is de staat van de ondergrond?',
          hint: 'Oneffen of vochtige ondergrond vraagt egalisatie.',
          options: [
            { value: 'goed', label: 'Vlak en droog', desc: 'Beperkte voorbereiding.' },
            { value: 'matig', label: 'Matig / lokale oneffenheden', desc: 'Lichte egalisatie waarschijnlijk.' },
            { value: 'slecht', label: 'Slecht / vochtig', desc: 'Grondige voorbereiding nodig.' }
          ],
          autoAdvance: true
        },
        {
          id: 'leveling',
          type: 'cards',
          question: 'Is egalisatie of chape nodig?',
          showIf: when('substrate', ['matig', 'slecht']),
          options: [
            { value: 'beperkt', label: 'Beperkte egalisatie' },
            { value: 'volledig', label: 'Volledige egalisatie / chape' },
            { value: 'onbekend', label: 'Laat aannemer beoordelen' }
          ],
          autoAdvance: true
        },
        {
          id: 'ufh',
          type: 'cards',
          question: 'Is er (of komt er) vloerverwarming?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'bestaand', label: 'Ja, bestaand' },
            { value: 'nieuw', label: 'Ja, nieuw te voorzien' }
          ],
          autoAdvance: true
        },
        {
          id: 'wetRooms',
          type: 'cards',
          question: 'Zitten er natte ruimtes bij (badkamer, keuken)?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja' }
          ],
          autoAdvance: true
        },
        {
          id: 'skirting',
          type: 'cards',
          question: 'Wil je nieuwe plinten laten plaatsen?',
          options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nee', label: 'Nee' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    schilderwerken: function () {
      return sharedStart().concat([
        {
          id: 'paintScope',
          type: 'cards',
          question: 'Wat wil je laten schilderen?',
          options: [
            { value: 'binnen', label: 'Enkel binnen', desc: 'Muren en/of plafonds.' },
            { value: 'buiten', label: 'Enkel buiten', desc: 'Gevel of buitenschrijnwerk.' },
            { value: 'beide', label: 'Binnen én buiten', desc: 'Gecombineerd project.' }
          ],
          autoAdvance: true
        },
        numberQuestion([30, 60, 100, 180], 'Hoeveel m² moet er ongeveer geschilderd worden?', 'Tel muren en plafonds samen, of de geveloppervlakte.'),
        {
          id: 'surface',
          type: 'cards',
          question: 'In welke staat is de ondergrond?',
          hint: 'De staat van de ondergrond bepaalt het grootste deel van de voorbereidingstijd.',
          options: [
            { value: 'goed', label: 'Goed', desc: 'Licht opschuren en schilderen.' },
            { value: 'matig', label: 'Matig', desc: 'Plaatsen herstellen, vullen, schuren.' },
            { value: 'slecht', label: 'Slecht', desc: 'Losse lagen, scheuren of vochtsporen.' }
          ],
          autoAdvance: true
        },
        {
          id: 'wallpaper',
          type: 'cards',
          question: 'Moet er behang verwijderd worden?',
          showIf: when('paintScope', ['binnen', 'beide']),
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'gedeeltelijk', label: 'Gedeeltelijk' },
            { value: 'ja', label: 'Ja, overal' }
          ],
          autoAdvance: true
        },
        {
          id: 'colors',
          type: 'cards',
          question: 'Hoeveel kleuren of tinten ongeveer?',
          options: [
            { value: '1', label: '1 kleur' },
            { value: '2-3', label: '2 tot 3 kleuren' },
            { value: 'meer', label: 'Meer dan 3' }
          ],
          autoAdvance: true
        },
        {
          id: 'darkColors',
          type: 'cards',
          question: 'Komen er donkere of sterk afwijkende kleuren bij?',
          hint: 'Donkere kleuren vragen meestal 3 tot 4 lagen.',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja' }
          ],
          autoAdvance: true
        },
        {
          id: 'woodwork',
          type: 'cards',
          question: 'Moet binnenschrijnwerk mee geschilderd worden?',
          hint: 'Deuren, ramen, plinten of kasten.',
          showIf: when('paintScope', ['binnen', 'beide']),
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'beperkt', label: 'Beperkt' },
            { value: 'uitgebreid', label: 'Uitgebreid' }
          ],
          autoAdvance: true
        },
        {
          id: 'floors',
          type: 'cards',
          question: 'Over hoeveel bouwlagen of verdiepingen gaat het buitenwerk?',
          showIf: when('paintScope', ['buiten', 'beide']),
          options: [
            { value: '1', label: '1 bouwlaag' },
            { value: '2', label: '2 bouwlagen' },
            { value: '3plus', label: '3 of meer' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    }
  };

  var TYPE_OPTIONS = [
    { value: 'badkamer', label: 'Badkamer', icon: 'i-bath' },
    { value: 'keuken', label: 'Keuken', icon: 'i-utensils' },
    { value: 'dak', label: 'Dak', icon: 'i-roof' },
    { value: 'vloeren', label: 'Vloeren', icon: 'i-layers' },
    { value: 'schilderwerken', label: 'Schilderwerken', icon: 'i-roller' }
  ];

  function getQuestions(categoryKey) {
    var builder = CATEGORY_QUESTIONS[categoryKey];
    if (!builder) return [];
    return builder();
  }

  function isQuestionVisible(q, answers) {
    if (!q.showIf) return true;
    try {
      return !!q.showIf(answers || {});
    } catch (e) {
      return true;
    }
  }

  function getVisibleQuestions(categoryKey, answers) {
    return getQuestions(categoryKey).filter(function (q) {
      return isQuestionVisible(q, answers);
    });
  }

  function optionLabel(question, value) {
    if (!question || !question.options) return value;
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].value === value) return question.options[i].label;
    }
    return value;
  }

  function summarizeAnswers(categoryKey, answers) {
    var qs = getQuestions(categoryKey);
    var rows = [];
    qs.forEach(function (q) {
      if (q.id === 'notes') return;
      if (!isQuestionVisible(q, answers)) return;
      var val = answers[q.id];
      if (val === undefined || val === null || val === '') return;
      var display;
      if (q.type === 'number') display = val + ' ' + (q.unit || 'm²');
      else display = optionLabel(q, val);
      rows.push({ id: q.id, question: q.question, label: display });
    });
    return rows;
  }

  function validateAnswers(categoryKey, answers) {
    if (!CATEGORY_QUESTIONS[categoryKey]) return { ok: false, error: 'invalid_type' };
    answers = answers || {};
    var visible = getVisibleQuestions(categoryKey, answers);
    for (var i = 0; i < visible.length; i++) {
      var q = visible[i];
      if (q.optional || q.type === 'notes') continue;
      var v = answers[q.id];
      if (q.type === 'number') {
        var n = Number(v);
        if (!Number.isFinite(n) || n < (q.min || 1) || n > (q.max || 999)) {
          return { ok: false, error: 'invalid_' + q.id };
        }
      } else if (q.options) {
        var ok = q.options.some(function (o) { return o.value === v; });
        if (!ok) return { ok: false, error: 'invalid_' + q.id };
      }
    }
    return { ok: true };
  }

  return {
    TYPE_OPTIONS: TYPE_OPTIONS,
    PROVINCE_OPTIONS: PROVINCE_OPTIONS,
    getQuestions: getQuestions,
    getVisibleQuestions: getVisibleQuestions,
    isQuestionVisible: isQuestionVisible,
    summarizeAnswers: summarizeAnswers,
    validateAnswers: validateAnswers,
    optionLabel: optionLabel
  };
});
