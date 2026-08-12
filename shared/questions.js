/* ============================================================
   ELYAN. Vragenlijst per renovatiecategorie (12–15 vragen)
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
    },

    ramen: function () {
      return sharedStart().concat([
        numberQuestion([8, 15, 25, 40], 'Hoeveel m² raamoppervlakte ongeveer?', 'Tel zichtbare glas/kaderoppervlakte; een schatting volstaat.'),
        {
          id: 'frame',
          type: 'cards',
          question: 'Welk kadermateriaal heb je in gedachten?',
          options: [
            { value: 'pvc', label: 'PVC', desc: 'Meest gekozen prijs/kwaliteit.' },
            { value: 'aluminium', label: 'Aluminium', desc: 'Slanker, vaak duurder.' },
            { value: 'hout', label: 'Hout', desc: 'Warm uitzicht, meer onderhoud.' }
          ],
          autoAdvance: true
        },
        {
          id: 'glazing',
          type: 'cards',
          question: 'Welke beglazing?',
          options: [
            { value: 'hr', label: 'HR', desc: 'Standaard isolerend glas.' },
            { value: 'hr++', label: 'HR++', desc: 'Gangbare renovatiekeuze.' },
            { value: 'hr+++', label: 'HR+++', desc: 'Hoogste isolatiewaarde.' }
          ],
          autoAdvance: true
        },
        {
          id: 'sliding',
          type: 'cards',
          question: 'Zit er een (grote) schuifpartij bij?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'ja', label: 'Ja, standaard schuif' },
            { value: 'groot', label: 'Ja, grote schuifpartij' }
          ],
          autoAdvance: true
        },
        {
          id: 'doors',
          type: 'cards',
          question: 'Hoeveel buitendeuren vernieuwen?',
          options: [
            { value: '0', label: 'Geen' },
            { value: '1', label: '1 deur' },
            { value: '2plus', label: '2 of meer' }
          ],
          autoAdvance: true
        },
        {
          id: 'removal',
          type: 'cards',
          question: 'Moeten bestaande ramen/deuren uitgebroken worden?',
          options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nee', label: 'Nee (nieuwbouw/openingen klaar)' }
          ],
          autoAdvance: true
        },
        {
          id: 'access',
          type: 'cards',
          question: 'Hoe is de bereikbaarheid van de gevel?',
          options: [
            { value: 'normaal', label: 'Normaal' },
            { value: 'moeilijk', label: 'Moeilijk', desc: 'Steiger, smalle doorgang, hoogte…' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    isolatie: function () {
      return sharedStart().concat([
        {
          id: 'subtype',
          type: 'cards',
          question: 'Welk type isolatie?',
          hint: 'Dakisolatie langs binnen = enkel isolatie, geen volledige dakrenovatie (dat is categorie Dak).',
          options: [
            { value: 'spouw', label: 'Spouwmuur', desc: 'Injectie of na-isolatie spouw.' },
            { value: 'dak_binnen', label: 'Dak (binnen)', desc: 'Isolatie langs binnen, geen dakherbouw.' },
            { value: 'zoldervloer', label: 'Zoldervloer', desc: 'Isolatie op/onder zoldervloer.' },
            { value: 'vloer', label: 'Vloer', desc: 'Vloer- of kruipruimte-isolatie.' },
            { value: 'binnenmuur', label: 'Binnenmuur', desc: 'Voorzetwand / binnenisolatie.' },
            { value: 'buitenmuur', label: 'Buitenmuur', desc: 'Buitenisolatie + afwerking.' }
          ],
          autoAdvance: true
        },
        numberQuestion([30, 60, 100, 150], 'Hoeveel m² moet geïsoleerd worden?'),
        {
          id: 'performance',
          type: 'cards',
          question: 'Welke isolatieprestatie mik je?',
          options: [
            { value: 'standaard', label: 'Standaard', desc: 'Gangbare Rd voor renovatie.' },
            { value: 'hoog', label: 'Hoog', desc: 'Dikker of performanter pakket.' }
          ],
          autoAdvance: true
        },
        {
          id: 'access',
          type: 'cards',
          question: 'Hoe is de werftoegang?',
          options: [
            { value: 'normaal', label: 'Normaal' },
            { value: 'moeilijk', label: 'Moeilijk' }
          ],
          autoAdvance: true
        },
        {
          id: 'prep',
          type: 'cards',
          question: 'Hoeveel voorbereiding is nodig?',
          options: [
            { value: 'beperkt', label: 'Beperkt', desc: 'Oppervlak grotendeels klaar.' },
            { value: 'uitgebreid', label: 'Uitgebreid', desc: 'Veel herstel, uitbraak of bescherming.' }
          ],
          autoAdvance: true
        },
        {
          id: 'finish',
          type: 'cards',
          question: 'Welke afwerking na isolatie?',
          hint: 'Vooral relevant bij binnen- of buitenmuur.',
          showIf: when('subtype', ['binnenmuur', 'buitenmuur', 'dak_binnen']),
          options: [
            { value: 'nee', label: 'Geen / later', desc: 'Enkel isolatiepakket.' },
            { value: 'beperkt', label: 'Beperkt', desc: 'Basisdichtingen / platen.' },
            { value: 'standaard', label: 'Standaard', desc: 'Afwerking klaar voor schilder.' },
            { value: 'hoog', label: 'Hoogwaardig', desc: 'Zichtafwerking inbegrepen.' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    verwarming: function () {
      return sharedStart().concat([
        {
          id: 'projectType',
          type: 'cards',
          question: 'Welk type verwarmingsproject?',
          options: [
            { value: 'ketel_vervangen', label: 'Ketel vervangen', desc: 'Condensatieketel of gelijkaardig.' },
            { value: 'lucht_water', label: 'Lucht-water warmtepomp', desc: 'Volledige WP.' },
            { value: 'hybride', label: 'Hybride', desc: 'WP + ketel.' },
            { value: 'vloerverwarming', label: 'Vloerverwarming', desc: 'Verdeling / UFH.' },
            { value: 'radiatoren', label: 'Radiatoren', desc: 'Radiatoren vernieuwen/uitbreiden.' }
          ],
          autoAdvance: true
        },
        numberQuestion([80, 120, 160, 220], 'Hoeveel m² verwarmde oppervlakte?', 'Gebruik de verwarmde woonoppervlakte als schatting.'),
        {
          id: 'insulationLevel',
          type: 'cards',
          question: 'Hoe is de isolatie van de woning?',
          hint: 'Bij slechte isolatie is een warmtepomp vaak minder efficiënt, we waarschuwen daarvoor.',
          options: [
            { value: 'slecht', label: 'Slecht', desc: 'Weinig of geen isolatie.' },
            { value: 'matig', label: 'Matig', desc: 'Deels geïsoleerd.' },
            { value: 'goed', label: 'Goed', desc: 'Goed geïsoleerde schil.' }
          ],
          autoAdvance: true
        },
        {
          id: 'distribution',
          type: 'cards',
          question: 'Hoe wordt de warmte verdeeld?',
          showIf: when('projectType', ['ketel_vervangen', 'lucht_water', 'hybride']),
          options: [
            { value: 'radiatoren', label: 'Radiatoren' },
            { value: 'vloer', label: 'Vloerverwarming' },
            { value: 'gemengd', label: 'Gemengd' }
          ],
          autoAdvance: true
        },
        {
          id: 'dhw',
          type: 'cards',
          question: 'Wat met sanitair warm water?',
          options: [
            { value: 'behouden', label: 'Bestaand behouden' },
            { value: 'nieuw', label: 'Nieuw voorzien' },
            { value: 'nee', label: 'Niet van toepassing' }
          ],
          autoAdvance: true
        },
        {
          id: 'replaceVsNew',
          type: 'cards',
          question: 'Vervanging of nieuwe installatie?',
          options: [
            { value: 'vervangen', label: 'Vervangen bestaand', desc: 'Op bestaande aansluitingen.' },
            { value: 'nieuw', label: 'Nieuwe opbouw', desc: 'Meer aanpassingen mogelijk.' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    elektriciteit: function () {
      return sharedStart().concat([
        {
          id: 'scope',
          type: 'cards',
          question: 'Hoe uitgebreid is de elektra-aanpak?',
          options: [
            { value: 'partieel', label: 'Partieel', desc: 'Enkele circuits of zones.' },
            { value: 'volledig', label: 'Volledig', desc: 'Herbekabeling van de woning.' },
            { value: 'renovatie_volledig', label: 'Renovatie volledig', desc: 'Volledig + zwaardere fit-out in renovatie.' }
          ],
          autoAdvance: true
        },
        numberQuestion([70, 100, 140, 200], 'Hoe groot is de woning ongeveer (m²)?'),
        {
          id: 'floors',
          type: 'cards',
          question: 'Over hoeveel bouwlagen?',
          options: [
            { value: '1', label: '1 bouwlaag' },
            { value: '2', label: '2 bouwlagen' },
            { value: '3plus', label: '3 of meer' }
          ],
          autoAdvance: true
        },
        {
          id: 'board',
          type: 'cards',
          question: 'Wat met het verdeelbord?',
          options: [
            { value: 'behouden', label: 'Behouden / beperkt aanpassen' },
            { value: 'nieuw', label: 'Nieuw bord' }
          ],
          autoAdvance: true
        },
        {
          id: 'fitOut',
          type: 'cards',
          question: 'Welke puntbezetting / fit-out?',
          options: [
            { value: 'basis', label: 'Basis', desc: 'Essentiële stopcontacten en verlichting.' },
            { value: 'standaard', label: 'Standaard', desc: 'Comfortabele bezetting.' },
            { value: 'uitgebreid', label: 'Uitgebreid', desc: 'Veel punten, data, zones…' }
          ],
          autoAdvance: true
        },
        {
          id: 'inspection',
          type: 'cards',
          question: 'Keuring (AREI) meenemen in de raming?',
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

    gevel: function () {
      return sharedStart().concat([
        {
          id: 'intervention',
          type: 'cards',
          question: 'Welke gevelingreep?',
          options: [
            { value: 'reinigen', label: 'Reinigen', desc: 'Reinigen / impregneren.' },
            { value: 'voegen', label: 'Voegen', desc: 'Uit- en hervoegen.' },
            { value: 'herstel', label: 'Herstel', desc: 'Lokaal metselwerkherstel.' },
            { value: 'crepi', label: 'Crepi', desc: 'Sierpleister.' },
            { value: 'bekleding', label: 'Bekleding', desc: 'Gevelbekleding.' },
            { value: 'isolatie_afwerking', label: 'Isolatie + afwerking', desc: 'ETICS / buitenisolatie.' }
          ],
          autoAdvance: true
        },
        numberQuestion([40, 80, 120, 180], 'Hoeveel m² geveloppervlakte?'),
        {
          id: 'condition',
          type: 'cards',
          question: 'In welke staat is de gevel?',
          options: [
            { value: 'goed', label: 'Goed' },
            { value: 'matig', label: 'Matig' },
            { value: 'slecht', label: 'Slecht' }
          ],
          autoAdvance: true
        },
        {
          id: 'elevations',
          type: 'cards',
          question: 'Hoeveel gevelvlakken / oriëntaties?',
          options: [
            { value: '1', label: '1 gevel' },
            { value: '2', label: '2 gevels' },
            { value: '3plus', label: '3 of meer' }
          ],
          autoAdvance: true
        },
        {
          id: 'scaffold',
          type: 'cards',
          question: 'Welke steiger / toegang nodig?',
          hint: 'Bij middel of hoog rekenen we steiger expliciet als aparte post.',
          options: [
            { value: 'laag', label: 'Laag / begane grond', desc: 'Meestal geen steiger.' },
            { value: 'middel', label: 'Middel', desc: 'Standaard steiger.' },
            { value: 'hoog', label: 'Hoog / complex', desc: 'Hoge of complexe steiger.' }
          ],
          autoAdvance: true
        },
        {
          id: 'finish',
          type: 'cards',
          question: 'Extra afwerking of kleurlaag?',
          showIf: when('intervention', ['crepi', 'bekleding', 'isolatie_afwerking', 'herstel']),
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'basis', label: 'Basis' },
            { value: 'premium', label: 'Premium / speciale kleur' }
          ],
          autoAdvance: true
        },
        levelQuestion(),
        urgencyQuestion(),
        notesQuestion()
      ]);
    },

    zonnepanelen: function () {
      return sharedStart().concat([
        {
          id: 'sizeMode',
          type: 'cards',
          question: 'Hoe wil je de installatiegrootte opgeven?',
          options: [
            { value: 'panels', label: 'Aantal panelen' },
            { value: 'kwp', label: 'Vermogen (kWp)' }
          ],
          autoAdvance: true
        },
        {
          id: 'panelCount',
          type: 'number',
          question: 'Hoeveel panelen ongeveer?',
          hint: 'We rekenen met ±400 Wp per paneel.',
          showIf: when('sizeMode', ['panels']),
          presets: [8, 12, 16, 20],
          defaultPresetIndex: 1,
          unit: 'panelen',
          min: 1,
          max: 999
        },
        {
          id: 'kwp',
          type: 'number',
          question: 'Welk vermogen (kWp)?',
          hint: 'Typisch 3–8 kWp voor een woning.',
          showIf: when('sizeMode', ['kwp']),
          presets: [3, 4.5, 6, 8],
          defaultPresetIndex: 1,
          unit: 'kWp',
          min: 1,
          max: 999
        },
        {
          id: 'roofType',
          type: 'cards',
          question: 'Welk daktype?',
          options: [
            { value: 'hellend', label: 'Hellend dak' },
            { value: 'plat', label: 'Plat dak' }
          ],
          autoAdvance: true
        },
        {
          id: 'access',
          type: 'cards',
          question: 'Hoe is de daktoegang?',
          options: [
            { value: 'normaal', label: 'Normaal' },
            { value: 'moeilijk', label: 'Moeilijk', desc: '+15–25% montage-impact.' }
          ],
          autoAdvance: true
        },
        {
          id: 'electricalAdapt',
          type: 'cards',
          question: 'Elektrische aanpassing nodig?',
          options: [
            { value: 'nee', label: 'Nee' },
            { value: 'beperkt', label: 'Beperkt' },
            { value: 'nieuw', label: 'Nieuw / zwaar' }
          ],
          autoAdvance: true
        },
        {
          id: 'battery',
          type: 'cards',
          question: 'Thuisbatterij meenemen? (optioneel)',
          hint: 'We geven geen gegarandeerde besparing of terugverdientijd.',
          optional: true,
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

    ventilatie: function () {
      return sharedStart().concat([
        {
          id: 'system',
          type: 'cards',
          question: 'Welk ventilatiesysteem?',
          options: [
            { value: 'decentraal', label: 'Decentraal', desc: 'Losse units per ruimte.' },
            { value: 'systeem_c', label: 'Systeem C', desc: 'Mechanische afvoer.' },
            { value: 'systeem_d', label: 'Systeem D', desc: 'WTW / balansventilatie.' }
          ],
          autoAdvance: true
        },
        numberQuestion([80, 120, 160, 200], 'Hoe groot is de woning ongeveer (m²)?'),
        {
          id: 'wetRooms',
          type: 'cards',
          question: 'Hoeveel natte ruimtes (badkamer, toilet, keuken)?',
          options: [
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3plus', label: '3 of meer' }
          ],
          autoAdvance: true
        },
        {
          id: 'floors',
          type: 'cards',
          question: 'Over hoeveel bouwlagen?',
          options: [
            { value: '1', label: '1 bouwlaag' },
            { value: '2', label: '2 bouwlagen' },
            { value: '3plus', label: '3 of meer' }
          ],
          autoAdvance: true
        },
        {
          id: 'routing',
          type: 'cards',
          question: 'Hoe complex is het kanaalwerk?',
          options: [
            { value: 'eenvoudig', label: 'Eenvoudig', desc: 'Korte, rechte tracés.' },
            { value: 'renovatie', label: 'Renovatie', desc: 'Bestaande woning, gemiddeld.' },
            { value: 'complex', label: 'Complex', desc: 'Veel bochten, doorboringen, verdiepingen.' }
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
    { value: 'ramen', label: 'Ramen & deuren', icon: 'i-window' },
    { value: 'isolatie', label: 'Isolatie', icon: 'i-insulation' },
    { value: 'verwarming', label: 'Verwarming & warmtepomp', icon: 'i-heat' },
    { value: 'elektriciteit', label: 'Elektriciteit', icon: 'i-bolt' },
    { value: 'vloeren', label: 'Vloeren', icon: 'i-layers' },
    { value: 'schilderwerken', label: 'Schilderwerken', icon: 'i-roller' },
    { value: 'gevel', label: 'Gevel', icon: 'i-facade' },
    { value: 'zonnepanelen', label: 'Zonnepanelen', icon: 'i-solar' },
    { value: 'ventilatie', label: 'Ventilatie', icon: 'i-vent' }
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
