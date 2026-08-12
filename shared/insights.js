/* ============================================================
   ELYAN. Antwoord-specifieke inzichten (price-aware, risk-aware)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanInsights = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function buildInsights(type, answers, result, pricing) {
    answers = answers || {};
    result = result || {};
    var cat = pricing.CATEGORIES[type];
    var prov = pricing.PROVINCES[answers.province];
    var insights = [];
    var planning = [];
    var recommendations = [];
    var risks = [];
    var conclusions = [];
    var included = [];
    var confirmItems = [];
    var assumptions = [];
    var riskRows = [];
    var savings = [];
    var quoteChecks = [];
    var contractorQuestions = [];
    var redFlags = [];
    var timeline = [];

    if (type === 'zonnepanelen') {
      assumptions.push('Het opgegeven vermogen/aantal panelen (±' + (answers.size || result.size) + ' kWp na normalisatie) klopt bij benadering.');
    } else {
      assumptions.push('De aangegeven oppervlakte (' + (answers.size || result.size) + ' m²) klopt bij benadering.');
    }
    assumptions.push('Afwerkingsniveau "' + ((pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level || 'standaard') + '" is representatief voor jouw materiaalkeuze.');
    assumptions.push('Normale leveromstandigheden en geen uitzonderlijke prijsstijgingen tijdens de werf.');
    assumptions.push('Geen structurele verborgen schade buiten wat je hebt aangegeven.');
    if (answers.access === 'moeilijk') {
      assumptions.push('Moeilijke toegang zoals aangegeven is meegenomen in steiger/veiligheid.');
    } else if (answers.access === 'vlot') {
      assumptions.push('Vlotte toegang zoals aangegeven, geen uitzonderlijke steigercomplexiteit.');
    } else if (answers.access) {
      assumptions.push('Werftoegang is normaal zoals aangegeven.');
    }
    if (answers.asbestos === 'nee') assumptions.push('Geen asbestproblematiek verwacht op basis van jouw antwoord.');
    if (answers.asbestos === 'mogelijk') assumptions.push('Asbest is als mogelijk risico meegenomen via een onderzoeksbuffer, geen volledige sanering.');
    if (answers.gutters === 'nee') assumptions.push('Goten blijven buiten scope (niet vernieuwen volgens jouw antwoord).');
    if (answers.connections === 'nee') assumptions.push('Keukenaansluitingen blijven op bestaande plaatsen.');
    if (answers.plumbingMove === 'nee') assumptions.push('Badkamerleidingen blijven op bestaande plaatsen.');
    if (answers.woodwork === 'nee') assumptions.push('Schrijnwerk zit niet in deze schilder-raming.');

    redFlags.push('Onduidelijke totaalpost zonder scope of hoeveelheden');
    redFlags.push('Grote voorschotten zonder duidelijke planning of materialenlijst');
    redFlags.push('Geen materiaaltypes of merken vermeld');
    redFlags.push('Btw-tarief onduidelijk of niet gesplitst');
    redFlags.push('Meerwerken zonder afgesproken prijsmethode');
    redFlags.push('Geen indicatieve start- of oplevertermijn');
    redFlags.push('Geen garantievoorwaarden');
    redFlags.push('Offerte veel lager dan marktband zonder uitleg over scope');

    if (answers.housingAge === 'jong') {
      insights.push('Je woning is jonger dan 10 jaar: reken doorgaans op 21% btw, tenzij een specifieke uitzondering geldt.');
    } else if (answers.housingAge === 'middel' || answers.housingAge === 'oud') {
      insights.push('Indicatief btw-scenario 6%: je woning is ouder dan 10 jaar. Definitieve toepasselijkheid moet de aannemer bevestigen.');
      recommendations.push('Vraag expliciet om het toepasselijke btw-tarief en de wettelijke voorwaarden in de offerte op te nemen.');
    }

    if (answers.urgency === 'snel') {
      planning.push('Je wilt snel starten: vraag offertes parallel en check wachttijden vroeg.');
    } else if (answers.urgency === 'binnen6') {
      planning.push('Met ±6 maanden horizon heb je tijd om minstens 3 offertes te vergelijken.');
    } else {
      planning.push('Flexibele timing: gebruik dat om offertes te vergelijken en betere slots te zoeken.');
    }

    var lp = result.labourPlan || {};
    if (lp.labourHours) {
      planning.push('Raming manuren: ca. ' + lp.labourHours + ' u met ploeg van ' + (lp.crewSize || result.crewSize || 2) + ' → ongeveer ' + (lp.workDays || result.workDays) + ' effectieve werkdagen.');
    }
    planning.push('Kalenderdoorlooptijd (richting): ' + result.weeksLow + '–' + result.weeksHigh + ' weken, inclusief voorbereiding en levertijden.');
    if (result.contingency) {
      var pctLow = result.contingencyPct ? Math.round(result.contingencyPct.low * 100) : 10;
      var pctHigh = result.contingencyPct ? Math.round(result.contingencyPct.high * 100) : 15;
      planning.push('Budgetbuffer: ' + pricing.fmtEUR(result.contingency) + ' (indicatief ' + pctLow + '–' + pctHigh + '%), gekoppeld aan de onzekerheid van jouw antwoorden.');
    }

    if (type === 'badkamer') {
      included.push('Bescherming van de werf');
      if (answers.demolition && answers.demolition !== 'geen') included.push('Afbraak en afvoer zoals aangegeven');
      if (answers.plumbingMove === 'nee') included.push('Heraansluiting leidingen op bestaande plaatsen');
      if (answers.plumbingMove === 'beperkt') included.push('Beperkte leidingaanpassingen');
      if (answers.plumbingMove === 'ja') included.push('Leidingen volgens nieuwe layout');
      if (answers.tiling === 'volledig') included.push('Volledige vloer- en wandbetegeling + waterdichting');
      if (answers.tiling === 'gedeeltelijk') included.push('Gedeeltelijke betegeling + waterdichting natte zone');
      if (answers.sanitary && answers.sanitary !== 'behouden') included.push('Nieuw sanitair (' + answers.sanitary + ') inclusief montage');
      included.push('Kitwerk, afwerking en oplevering');

      confirmItems.push('Verborgen leidingschade of vocht in chape');
      confirmItems.push('Exacte tegelkeuze, formaat en legpatroon');
      confirmItems.push('Ventilatiecapaciteit en afvoerroute');

      if (answers.plumbingMove === 'ja') {
        insights.push('Leidingen verplaatsen is een van de sterkste kostendrijvers in jouw badkamerproject.');
        risks.push('Coördinatie tussen loodgieter, elektricien en tegelzetter is kritiek bij een nieuwe layout.');
        riskRows.push({ risk: 'Nieuwe leidinglayout', impact: 'HOOG', check: 'Laat toevoer/afvoer op plan zetten vóór sanitairkeuze.' });
        savings.push({ text: 'De bestaande indeling behouden kan fors besparen op loodgieterswerk.', amount: null });
      } else if (answers.plumbingMove === 'nee') {
        insights.push('Door leidingen op dezelfde plaats te houden blijft de renovatie merkbaar kostenefficiënter.');
        conclusions.push('Kostenefficiënte keuze: leidingen blijven staan.');
      }
      if (answers.tiling === 'volledig') {
        insights.push('Volledige betegeling verhoogt materiaal én tegelzeturen, maar geeft een duurzame natte-zone afwerking.');
        riskRows.push({ risk: 'Waterdichting', impact: 'HOOG', check: 'Vraag welk waterdichtingssysteem wordt gebruikt.' });
      }
      if (answers.ufh === 'ja') {
        planning.push('Vloerverwarming vraagt droogtijd vóór betegeling, bouw dit in de planning in.');
        riskRows.push({ risk: 'Droogtijd vloerverwarming', impact: 'MIDDEL', check: 'Laat opstartprotocol en droogtijd schriftelijk vastleggen.' });
      }
      if (answers.ventilation !== 'goed') {
        risks.push('Onvoldoende ventilatie leidt vaak tot vocht- en schimmelproblemen.');
        riskRows.push({ risk: 'Ventilatie', impact: 'MIDDEL', check: 'Controleer afvoerdebiet in natte zone.' });
      }
      if (answers.scope === 'volledig') {
        recommendations.push('Bij totale afbraak: laat helling naar afvoer en waterdichtheid controleren vóór afwerking.');
        conclusions.push('Volledige renovatie: reken op realistische manuren voor afbraak, techniek en betegeling.');
      }

      timeline = [
        { phase: 'Bescherming', days: 1, note: 'Werf afdekken' },
        { phase: 'Afbraak', days: answers.demolition === 'volledig' ? 2 : 1, note: 'Sanitair/tegels verwijderen' },
        { phase: 'Leidingen & elektriciteit', days: answers.plumbingMove === 'ja' ? 4 : answers.plumbingMove === 'beperkt' ? 3 : 2, note: 'Technische werken' },
        { phase: 'Waterdichting', days: 1, note: 'Nat systeem' },
        { phase: 'Tegelwerk', days: Math.max(3, Math.round((answers.size || 6) * 0.45)), note: 'Vloer & wand' },
        { phase: 'Sanitair', days: 2, note: 'Montage toestellen' },
        { phase: 'Afwerking', days: 1, note: 'Kitwerk & details' },
        { phase: 'Oplevering', days: 1, note: 'Controle & oplevering' }
      ];

      quoteChecks = [
        'Exacte m² en scope vermeld',
        'Afbraak & afvoer inbegrepen',
        'Waterdichtingssysteem vermeld',
        'Tegelmerk/-formaat + lijm/voeg inbegrepen',
        'Sanitairlijst met types',
        'Leidingwerken (scope) expliciet',
        'Elektriciteit natte zone',
        'Ventilatie inbegrepen of uitgesloten',
        'Btw afzonderlijk vermeld',
        'Planning & droogtijden',
        'Garanties & meerwerken',
        'Betalingsschema'
      ];
      contractorQuestions = [
        'Welk waterdichtingssysteem gebruikt u?',
        'Zijn leidingen volledig inbegrepen of meerwerk?',
        'Is tegelmateriaal, voeg en lijm volledig inbegrepen?',
        'Is ventilatie inbegrepen?',
        'Wat gebeurt er bij schade aan de ondergrond?',
        'Welke tegellijm en voeg zijn voorzien bij mijn tegelkeuze?',
        'Is kitwerk en oplevering inbegrepen?',
        'Welk btw-tarief passen jullie toe en waarom?',
        'Wat is het betalingsschema gekoppeld aan mijlpalen?'
      ];
      savings.push({ text: 'Beperk betegeling waar functioneel mogelijk (bijv. halfhoge wanden i.p.v. volledige hoogte).', amount: null });
      savings.push({ text: 'Standaardformaten tegels beperken plaatsingsuren t.o.v. grootformaattegels.', amount: null });
    }

    if (type === 'keuken') {
      included.push(answers.scope === 'fronten' ? 'Fronten/facelift' : 'Keukenkasten volgens gekozen segment');
      included.push('Werkblad (' + (answers.worktop || 'standaard') + ')');
      if (answers.appliances && answers.appliances !== 'nee') included.push('Apparatuurpakket (' + answers.appliances + ')');
      else included.push('Geen nieuwe toestellen in deze raming');
      if (answers.splashback === 'ja') included.push('Spatwand');
      if (answers.flooring === 'ja') included.push('Keukenvloer vernieuwen');
      included.push('Montage en basis heraansluitingen volgens antwoorden');

      confirmItems.push('Exacte kastenspecificatie en handgrepen');
      confirmItems.push('Levertijd werkblad (opmeting na plaatsing korpus)');
      confirmItems.push('Of bestaande toestellen hergebruikt worden');

      if (answers.appliances && answers.appliances !== 'nee') {
        insights.push('Toestellen zitten in jouw raming, vergelijk energielabels én inbouwmaten vóór bestelling.');
      } else {
        insights.push('Toestellen zitten niet in deze raming. Houd apart budget vrij als je ze toch vernieuwt.');
      }
      if (answers.connections === 'ja') {
        risks.push('Aansluitingen verplaatsen vraagt coördinatie tussen keukenplaatser, elektricien en loodgieter.');
        riskRows.push({ risk: 'Technische verplaatsingen', impact: 'HOOG', check: 'Technisch plan vóór kastbestelling.' });
        savings.push({ text: 'Zelfde hoofdlayout behouden vermijdt dure leiding- en elektrawerken.', amount: null });
      } else {
        savings.push({ text: 'Behoud bestaande aansluitpunten, dat beperkt loodgieter- en elektrakosten.', amount: null });
      }
      if (answers.appliances === 'basis') {
        savings.push({ text: 'Kies middenklasse apparatuur waar prestaties vergelijkbaar zijn met premium.', amount: null });
      }
      if (answers.scope === 'fronten') {
        recommendations.push('Een facelift werkt alleen als de kaststructuur nog stevig is, laat dat eerst nakijken.');
        savings.push({ text: 'Fronten i.p.v. volledige vervanging bespaart fors als de korpus nog goed is.', amount: null });
      }
      if (answers.worktop === 'natuursteen') {
        insights.push('Premium werkblad: reken op precieze opmeting en langere levertijd.');
        conclusions.push('Werkbladkeuze heeft een groot aandeel in jouw materiaalbudget.');
      }

      timeline = [
        { phase: 'Opmeting & bestelling', days: 5, note: 'Keukenplan en levertijd (kalender)' },
        { phase: 'Demontage', days: 1, note: 'Oude keuken weg' },
        { phase: 'Techniek', days: answers.connections === 'ja' ? 3 : 1, note: 'Water/elektra' },
        { phase: 'Montage kasten', days: 2, note: 'Korpus & fronten' },
        { phase: 'Werkblad', days: 2, note: 'Opmeting na korpus + plaatsing' },
        { phase: 'Apparatuur & afwerking', days: 1, note: 'Aansluiten & oplevering' },
        { phase: 'Oplevering', days: 1, note: 'Controle' }
      ];

      quoteChecks = [
        'Kastenmerk/-lijn vermeld', 'Werkbladtype + plaatsing', 'Apparatuurlijst (in/excl.)',
        'Demontage & afvoer', 'Water & elektra scope', 'Spatwand in/excl.',
        'Btw afzonderlijk', 'Levertijden', 'Garantie op montage', 'Meerwerken', 'Betalingsschema'
      ];
      contractorQuestions = [
        'Welke kastlijn en plaatdikte zitten in de prijs?',
        'Is demontage en afvoer van de oude keuken inbegrepen?',
        'Wie plaatst het werkblad en na hoeveel dagen opmeting?',
        'Welke elektra- en waterwerken zijn inbegrepen?',
        'Wat als de muur niet haaks of vlak is?',
        'Zijn plinten, vulstukken en sifonafwerking inbegrepen?',
        'Welk btw-tarief geldt op kast vs. plaatsing?',
        'Wat is de planning van bestelling tot oplevering?',
        'Hoe worden meerwerken geprijsd?'
      ];
    }

    if (type === 'dak') {
      if (answers.workType === 'volledig' || answers.workType === 'vernieuwen') included.push('Demontage bestaande bedekking & afvoer');
      if (answers.workType === 'volledig' || answers.workType === 'isolatie' || answers.insulation === 'ja') included.push('Dakisolatie');
      if (answers.workType === 'volledig' || answers.workType === 'vernieuwen') {
        included.push('Onderdak en lattenwerk');
        included.push('Nieuwe dakbedekking (' + (answers.material || 'volgens keuze') + ')');
      }
      if (answers.gutters === 'ja') included.push('Goten & regenafvoer');
      included.push('Steiger/toegang volgens bereikbaarheid');
      included.push('Aansluitdetails en oplevering');

      confirmItems.push('Staat van het gebinte / houtrot');
      confirmItems.push('Asbeststatus (indien relevant)');
      confirmItems.push('Parkeervergunning / werfinrichting');

      if (answers.workType === 'isolatie' || answers.insulation === 'ja' || answers.workType === 'volledig') {
        insights.push('Dakisolatie zit in jouw scope, check premievoorwaarden sinds 1 maart 2026 (inkomenscategorie telt zwaar).');
        recommendations.push('Vraag R-/U-waarde en premieconforme documentatie aan je aannemer.');
        conclusions.push('Isolatie combineert energievoordeel met werfefficiëntie als bedekking sowieso openligt.');
        savings.push({ text: 'Combineer isolatie en dakbedekking in één werffase, vermijd dubbele steiger- en mobilisatiekosten.', amount: null });
      }
      if (answers.asbestos === 'ja' || answers.asbestos === 'mogelijk') {
        risks.push('Asbestverdachte materialen vragen diagnose en gespecialiseerde verwijdering vóór verdere werken.');
        riskRows.push({ risk: 'Asbest', impact: answers.asbestos === 'ja' ? 'HOOG' : 'MIDDEL', check: 'Laat een asbestinventaris maken vóór start.' });
        planning.push('Plan asbestonderzoek vroeg, dit kan de startdatum verschuiven.');
      }
      if (answers.access === 'moeilijk') {
        insights.push('Moeilijke toegang verhoogt steiger- en veiligheidskosten; vraag dit apart te specificeren.');
        riskRows.push({ risk: 'Bereikbaarheid', impact: 'MIDDEL', check: 'Steigerplan en valbeveiliging in offerte.' });
      }
      planning.push('Dakwerken zijn weersafhankelijk: voorjaar en nazomer zijn meestal het meest betrouwbaar.');
      recommendations.push('Laat goten, nokdetails en muuraansluitingen expliciet opnemen, daar ontstaan vaak lekken.');
      riskRows.push({ risk: 'Verborgen houtrot / constructie', impact: 'MIDDEL', check: 'Laat onderliggende constructie inspecteren tijdens afbraak.' });
      riskRows.push({ risk: 'Aansluitdetails', impact: 'MIDDEL', check: 'Controleer nok, dakramen en muurplaten in de offerte.' });
      riskRows.push({ risk: 'Weersomstandigheden', impact: 'MIDDEL', check: 'Vraag hoe weerverlet en planning worden geregeld.' });
      if (answers.asbestos === 'nee') {
        riskRows.push({ risk: 'Asbest (onverwacht)', impact: 'LAAG', check: 'Bevestig dat inventaris/inspectie niet nodig is of al gebeurd is.' });
      }

      timeline = [
        { phase: 'Voorbereiding', days: 1, note: 'Steiger, veiligheid, werfinrichting' },
        { phase: 'Afbraak', days: Math.max(1, Math.round((answers.size || 90) / 80)), note: 'Bedekking demontage & afvoer' },
        { phase: 'Onderbouw', days: Math.max(1, Math.round((answers.size || 90) / 70)), note: 'Onderdak & lattenwerk' },
        { phase: 'Isolatie', days: (answers.insulation === 'ja' || answers.workType === 'volledig' || answers.workType === 'isolatie') ? Math.max(1, Math.round((answers.size || 90) / 60)) : 0, note: 'Isolatieplaatsing' },
        { phase: 'Dakbedekking', days: Math.max(2, Math.round((answers.size || 90) / 40)), note: 'Nieuwe bedekking' },
        { phase: 'Details & afwerking', days: 1, note: 'Nok, aansluitingen, dakranden' },
        { phase: 'Oplevering', days: 1, note: 'Controle & steiger afbreken' }
      ].filter(function (t) { return t.days > 0; });

      quoteChecks = [
        'Exacte oppervlakte vermeld',
        'Afbraak inbegrepen',
        'Container / afval inbegrepen',
        'Type onderdak vermeld',
        'Isolatietype + dikte / Rd-waarde vermeld',
        'Merk/type dakpan of bedekking vermeld',
        'Hulpstukken inbegrepen',
        'Goten inbegrepen of expliciet uitgesloten',
        'Steiger & valbeveiliging inbegrepen',
        'Dakranden/details inbegrepen',
        'Btw afzonderlijk vermeld',
        'Start- en oplevertermijn vermeld',
        'Garantie vermeld',
        'Voorwaarden voor meerwerk beschreven',
        'Betalingsschema beschreven'
      ];
      contractorQuestions = [
        'Wat gebeurt er als tijdens afbraak houtrot wordt gevonden?',
        'Is steiger en valbeveiliging volledig inbegrepen?',
        'Welke isolatiedikte en Rd-waarde is voorzien?',
        'Welke hulpstukken zijn inbegrepen in de m²-prijs?',
        'Hoe worden niet-voorziene meerwerken geprijsd?',
        'Is afvoer van oude materialen inbegrepen?',
        'Hoe behandelen jullie nokken, dakdoorvoeren en muurplaten?',
        'Welk btw-tarief passen jullie toe en waarom?',
        'Wat is de garantie op waterdichtheid?',
        'Wat is het betalingsschema gekoppeld aan mijlpalen?'
      ];
      if (answers.gutters !== 'ja') {
        savings.push({ text: 'Behoud goede bestaande goten wanneer technisch verantwoord, dat vermijdt een aparte gootpost.', amount: null });
      }
      savings.push({ text: 'Standaardiseer dakpan en hulpstukken i.p.v. mix van speciale stukken.', amount: null });
    }

    if (type === 'vloeren') {
      included.push('Vloermateriaal (' + (answers.floorMaterial || 'gekozen type') + ') inclusief snijverlies');
      included.push('Plaatsing');
      if (answers.removal === 'ja') included.push('Uitbreken bestaande vloer & afvoer');
      if (answers.leveling === 'beperkt' || answers.substrate === 'matig') included.push('Beperkte egalisatie');
      if (answers.leveling === 'volledig' || answers.substrate === 'slecht') included.push('Volledige egalisatie / chape-voorbereiding');
      if (answers.skirting === 'ja') included.push('Plinten');
      included.push('Ondervloer / vochtscherm waar relevant');

      confirmItems.push('Exacte vlakheid van de ondergrond na inspectie');
      confirmItems.push('Vochtmeting bij chape of kelderzones');
      confirmItems.push('Overgangsprofielen tussen ruimtes');

      if (answers.substrate === 'slecht' || answers.leveling === 'volledig') {
        insights.push('De ondergrond vraagt voorbereiding, egalisatie is vaak belangrijker voor het eindresultaat dan de topvloer.');
        riskRows.push({ risk: 'Ondergrond', impact: 'HOOG', check: 'Laat vlakheid en vocht meten vóór plaatsing.' });
      }
      if (answers.ufh === 'nieuw' || answers.ufh === 'bestaand') {
        recommendations.push('Kies een vloer met geschikte warmteweerstand en respecteer droogtijden.');
        riskRows.push({ risk: 'Vloerverwarming', impact: 'MIDDEL', check: 'Vraag compatibiliteit en opstartprotocol.' });
      }
      if (answers.floorMaterial === 'parket') {
        insights.push('Parket vraagt een stabiel binnenklimaat; te vochtig of te droog leidt tot werking van het hout.');
      }
      if (answers.floorMaterial === 'tegel') {
        conclusions.push('Tegelvloer: arbeid (tegelzetten) weegt zwaarder door dan bij laminaat.');
        savings.push({ text: 'Rechte legpatronen en standaardformaten beperken snijverlies en plaatsingstijd t.o.v. visgraat/grootformaattegels.', amount: null });
      }

      timeline.push({ phase: 'Voorbereiding', days: 1, note: 'Ruimen & meten' });
      if (answers.removal === 'ja') timeline.push({ phase: 'Uitbraak', days: Math.max(1, Math.round((answers.size || 30) / 40)), note: 'Oude vloer weg' });
      timeline.push({ phase: 'Egalisatie', days: (answers.leveling === 'volledig' || answers.substrate === 'slecht') ? 2 : 1, note: 'Ondergrond' });
      timeline.push({ phase: 'Plaatsing', days: Math.max(1, Math.round((answers.size || 30) / (answers.floorMaterial === 'tegel' ? 12 : 30))), note: 'Nieuwe vloer' });
      timeline.push({ phase: 'Afwerking', days: 1, note: 'Plinten & oplevering' });

      quoteChecks = ['Vloertype & klasse', 'Snijverlies %', 'Uitbraak & afvoer', 'Egalisatie', 'Ondervloer', 'Plinten', 'Droogtijden', 'Btw', 'Garantie', 'Meerwerken ondergrond'];
      contractorQuestions = [
        'Welke ondervloer en vochtscherm voorzien jullie?',
        'Is egalisatie inbegrepen of na keuring meerwerk?',
        'Hoeveel snijverlies rekenen jullie?',
        'Zijn plinten en profielen inbegrepen?',
        'Wat bij vocht in de chape?',
        'Welke lijm/voeg bij tegels?',
        'Welk btw-tarief?',
        'Wat is de planning inclusief droogtijd?'
      ];
    }

    if (type === 'schilderwerken') {
      included.push('Beschermen en afplakken');
      included.push('Verf & primers (materiaal)');
      included.push('Schilderuren volgens staat van de ondergrond');
      if (answers.wallpaper && answers.wallpaper !== 'nee') included.push('Behang verwijderen');
      if (answers.woodwork && answers.woodwork !== 'nee') included.push('Schrijnwerk zoals aangegeven');
      included.push('Opruimen en oplevering');

      confirmItems.push('Kleurstalen op de echte muur (lichtinval)');
      confirmItems.push('Herstel van grotere scheuren of vochtplekken');
      confirmItems.push('Of radiatoren/deuren volledig meegenomen worden');

      if (answers.surface === 'slecht') {
        insights.push('Een slechte ondergrond betekent dat een groot deel van het budget naar herstel gaat, noodzakelijk voor een duurzaam resultaat.');
        riskRows.push({ risk: 'Ondergrondherstel', impact: 'HOOG', check: 'Laat hersteluren apart begroten.' });
        conclusions.push('Voorbereiding is hier geen “extra”, maar de kern van de kwaliteit.');
      }
      if (answers.darkColors === 'ja') {
        recommendations.push('Voor donkere kleuren: reken op geschikte primer en voldoende lagen.');
      }
      if (answers.paintScope === 'buiten' || answers.paintScope === 'beide') {
        planning.push('Buitenschilderwerken: plan bij droog weer en milde temperaturen (idealiter 10–25°C).');
        riskRows.push({ risk: 'Weersomstandigheden', impact: 'MIDDEL', check: 'Vraag hoe weerverlet wordt aangerekend.' });
      }
      if (answers.wallpaper === 'ja') {
        insights.push('Behang verwijderen is arbeidsintensief en wordt vaak onderschat.');
      }
      savings.push({ text: 'Zelfde kleurfamilie en goede ondergrond beperken het aantal lagen en dus manuren.', amount: null });

      timeline.push({ phase: 'Beschermen', days: 1, note: 'Afplakken & afdekken' });
      timeline.push({ phase: 'Voorbereiding', days: answers.surface === 'slecht' ? 3 : answers.surface === 'matig' ? 2 : 1, note: 'Schuren/plamuren' });
      timeline.push({ phase: 'Schilderen', days: Math.max(2, Math.round((answers.size || 60) / 40)), note: 'Grondlaag + afwerking' });
      timeline.push({ phase: 'Oplevering', days: 1, note: 'Retouches & opruimen' });

      quoteChecks = ['m²-opmeting', 'Aantal lagen', 'Verftype/-merk', 'Voorbereiding ondergrond', 'Schrijnwerk', 'Steiger (indien buiten)', 'Btw', 'Planning', 'Opruimen', 'Garantie'];
      contractorQuestions = [
        'Hoeveel lagen zijn inbegrepen voor mijn kleur?',
        'Welke voorbereiding zit in de prijs bij mijn ondergrond?',
        'Is behangverwijdering inbegrepen?',
        'Welke verfkwaliteit gebruiken jullie?',
        'Is schrijnwerk apart of inbegrepen?',
        'Hoe gaan jullie om met vochtplekken?',
        'Welk btw-tarief?',
        'Wat is de planning per ruimte?'
      ];
    }

    if (type === 'ramen') {
      included.push('Plaatsing kaders en beglazing (' + (answers.frame || 'pvc') + ')');
      if (answers.removal === 'ja') included.push('Uithalen bestaand schrijnwerk en afvoer');
      included.push('Afstellen en basisafwerking dagkanten');
      if (answers.doors === '1' || answers.doors === '2plus') included.push('Buitendeuren zoals aangegeven');
      if (answers.sliding === 'ja' || answers.sliding === 'groot') included.push('Schuifpartij met toeslagfactor');

      confirmItems.push('Exacte raamstaat (maten per opening)');
      confirmItems.push('U-waarde / glasspecificatie in offerte');
      confirmItems.push('Afwerking binnen- en buitenzijde (pleister, dorpels)');

      insights.push('Ramenprijzen hangen sterk af van kadermateriaal, beglazing en schuifpartijen, niet alleen van m².');
      if (answers.frame === 'aluminium') insights.push('Aluminium ligt typisch boven PVC in materiaalprijs bij vergelijkbare opening.');
      if (answers.glazing === 'hr+++') insights.push('HR+++ verhoogt comfort en materiaalkost; vraag U-waarde expliciet op de offerte.');

      risks.push('Maatafwijkingen bij opmeting leiden vaak tot meerwerken of herbestelling.');
      if (answers.access === 'moeilijk') risks.push('Moeilijke geveltoegang verhoogt steiger- en plaatsingstijd.');
      riskRows.push({ risk: 'Opmeting', impact: 'HOOG', check: 'Laat elke opening opmeten vóór bestelling.' });
      riskRows.push({ risk: 'Aansluitdetails', impact: 'MIDDEL', check: 'Dorpels, waterkering en luchtdichting expliciet laten opnemen.' });

      timeline.push({ phase: 'Opmeting & bestelling', days: 2, note: 'Staat + productietijd starten' });
      timeline.push({ phase: 'Productie', days: Math.max(5, Math.round((answers.size || 15) / 3)), note: 'Afhankelijk van leverancier' });
      timeline.push({ phase: 'Plaatsing', days: Math.max(1, Math.round((result.workDays || 3) * 0.7)), note: 'Uithalen + plaatsen' });
      timeline.push({ phase: 'Afwerking', days: 1, note: 'Dagkanten & oplevering' });

      quoteChecks = [
        'Kadermateriaal en merk/type vermeld',
        'Beglazing (HR/HR++/HR+++) en U-waarde',
        'Aantal manuren of plaatsingspost apart',
        'Uithalen en afvoer inbegrepen of apart',
        'Dagkanten / dorpels gespecificeerd',
        'Btw-tarief en garanties'
      ];
      contractorQuestions = [
        'Welke U-waarde garanderen jullie per raam?',
        'Is demontage en afvoer inbegrepen?',
        'Hoe werken jullie luchtdichting en waterkering uit?',
        'Wat is de levertijd na opmeting?',
        'Zijn dorpels en dagkanten inbegrepen?',
        'Welk btw-tarief past u toe?'
      ];
      savings.push({ text: 'Standaardiseer maten en vermijd onnodige speciale vormen.', amount: null });
      savings.push({ text: 'PVC met HR++ is vaak de beste prijs/prestatie voor renovatie.', amount: null });
    }

    if (type === 'isolatie') {
      included.push('Isolatiemateriaal voor ' + (answers.subtype || 'gekozen subtype'));
      included.push('Plaatsing door isolatiespecialist');
      if (answers.prep === 'uitgebreid') included.push('Uitgebreide voorbereiding');
      if (answers.finish && answers.finish !== 'nee') included.push('Afwerking zoals aangegeven');

      confirmItems.push('Exacte Rd-/U-doelwaarde');
      confirmItems.push('Vocht- en luchtdichtingsdetails');
      if (answers.subtype === 'dak_binnen') {
        confirmItems.push('Scope = isolatie only (geen dakbedekking/herbouw)');
        insights.push('Dit is dakisolatie langs binnen, geen volledige dakrenovatie. Voor bedekking/herbouw gebruik je categorie Dak.');
      }

      insights.push('Isolatiepremies hangen af van Rd-waarde, inkomen en eigendomstype, check het officiële loket.');
      if (answers.performance === 'hoog') insights.push('Hoge prestatie verhoogt materiaaldikte en kost, maar verbetert comfort en premiekans.');

      risks.push('Koudebruggen en onzorgvuldige luchtdichting ondermijnen de investering.');
      if (answers.subtype === 'spouw') risks.push('Niet elke spouw is geschikt, laat vooraf controleren op breedte en vervuiling.');
      riskRows.push({ risk: 'Uitvoeringskwaliteit', impact: 'HOOG', check: 'Vraag details over overlappingen, tape en doorbrekingen.' });
      riskRows.push({ risk: 'Scopeverwarring', impact: 'MIDDEL', check: 'Scheid isolatie van afwerking/dakbedekking in de offerte.' });

      timeline.push({ phase: 'Voorbereiding', days: answers.prep === 'uitgebreid' ? 2 : 1, note: 'Beschermen / herstel' });
      timeline.push({ phase: 'Isoleren', days: Math.max(1, result.workDays || 2), note: 'Plaatsing' });
      timeline.push({ phase: 'Afwerking', days: (answers.finish && answers.finish !== 'nee') ? 2 : 0, note: 'Indien in scope' });

      quoteChecks = [
        'Subtype en m² duidelijk',
        'Rd-waarde / dikte vermeld',
        'Luchtdichting opgenomen',
        'Afwerking wel/niet inbegrepen',
        'Afval en bescherming',
        'Btw-tarief'
      ];
      contractorQuestions = [
        'Welke Rd-waarde realiseren jullie?',
        'Hoe behandelen jullie doorbrekingen en aansluitingen?',
        'Is afwerking inbegrepen?',
        'Zijn er aandachtspunten voor vocht/condensatie?',
        'Welke premie-attesten leveren jullie?',
        'Welk btw-tarief?'
      ];
      savings.push({ text: 'Combineer isolatie met geplande gevel- of dakwerken om mobilisatie te delen.', amount: null });
      if (answers.subtype === 'buitenmuur') {
        savings.push({ text: 'Vergelijk ETICS all-in met aparte isolatie+crepi posten op dezelfde scope.', amount: null });
      }
    }

    if (type === 'verwarming') {
      included.push('Verwarmingstoestel / systeem volgens keuze (' + (answers.projectType || '') + ')');
      included.push('Installatie, aansluiting en inregeling');
      if (answers.dhw === 'nieuw') included.push('Nieuw sanitair warm water');

      confirmItems.push('Vermogen afgestemd op warmteverliesberekening');
      confirmItems.push('Afgiftesysteem (radiatoren/vloer) compatibel met regime');
      confirmItems.push('Geluid, opstelling en vergunningen (buitenunit)');

      insights.push('De juiste capaciteit hangt af van isolatie en warmteverlies, niet alleen van woningm².');
      if (answers.projectType === 'lucht_water' && answers.insulationLevel === 'slecht') {
        insights.push('Let op: lucht-water warmtepomp bij slechte isolatie is vaak inefficiënt. We ramen wel, maar isoleer bij voorkeur eerst of kies hybride.');
        risks.push('Warmtepomp in een slecht geïsoleerde woning kan leiden tot hoog verbruik en comfortklachten.');
        recommendations.push('Laat eerst isolatie en warmteverlies beoordelen vóór je een full WP plaatst.');
      }
      if (answers.projectType === 'hybride') insights.push('Hybride kan een tussenstap zijn wanneer volledige elektrificatie nog niet past.');

      risks.push('Onduidelijke afgifte-temperatuur leidt tot verkeerde toestelkeuze.');
      riskRows.push({ risk: 'Dimensionering', impact: 'HOOG', check: 'Vraag warmteverliesberekening of minstens onderbouwde capaciteit.' });
      riskRows.push({ risk: 'Afgifte', impact: 'MIDDEL', check: 'Controleer of radiatoren/vloer bij lage temperatuur werken.' });

      timeline.push({ phase: 'Studie & bestelling', days: 3, note: 'Capaciteit & materiaal' });
      timeline.push({ phase: 'Installatie', days: Math.max(2, result.workDays || 3), note: 'Toestel + leidingen' });
      timeline.push({ phase: 'Inregeling', days: 1, note: 'Oplevering & uitleg' });

      quoteChecks = [
        'Toesteltype en vermogen',
        'SWW wel/niet inbegrepen',
        'Afgiftesysteem beschreven',
        'Inregeling en oplevering',
        'Buitenunit / opstelling indien WP',
        'Btw en garanties'
      ];
      contractorQuestions = [
        'Op welk warmteverlies baseren jullie het vermogen?',
        'Is mijn afgiftesysteem geschikt?',
        'Wat gebeurt er met sanitair warm water?',
        'Welke geluidsnorm halen jullie bij de buitenunit?',
        'Welke premiedossiers ondersteunen jullie?',
        'Welk btw-tarief?'
      ];
      savings.push({ text: 'Isoleer kritieke schilvlakken vóór of samen met een warmtepomp.', amount: null });
      savings.push({ text: 'Vraag een hybride-optie als full WP technisch of budgettair te zwaar is.', amount: null });
    }

    if (type === 'elektriciteit') {
      included.push('Bekabeling en punten volgens scope (' + (answers.scope || '') + ')');
      if (answers.board === 'nieuw') included.push('Nieuw verdeelbord');
      if (answers.inspection === 'ja') included.push('Keuring / AREI-controle');
      included.push('Afwerking stopcontacten en schakelaars volgens fit-out');

      confirmItems.push('Aantal circuits en zekeringschema');
      confirmItems.push('Of sleuven/pleisterwerk inbegrepen zijn');
      confirmItems.push('Datum en scope van keuring');

      insights.push('Volledige herbekabeling kost per m² duidelijk meer dan een partiële aanpassing, scope is de grootste knop.');
      if (answers.fitOut === 'uitgebreid') insights.push('Uitgebreide puntbezetting verhoogt zowel materiaal als uren.');
      if (answers.board === 'nieuw') insights.push('Een nieuw bord is vaak nodig bij volledige renovatie of verouderde installaties.');

      risks.push('Verborgen leidingen en asbest in oude muren kunnen planning verstoren.');
      riskRows.push({ risk: 'Scope-creep', impact: 'HOOG', check: 'Leg zones en aantal punten schriftelijk vast.' });
      riskRows.push({ risk: 'Keuring', impact: 'MIDDEL', check: 'Laat non-conformiteiten vóór oplevering oplossen.' });

      timeline.push({ phase: 'Plan & trekkingen', days: Math.max(2, Math.round((result.workDays || 4) * 0.5)), note: 'Sleuven / buizen' });
      timeline.push({ phase: 'Aansluiten', days: Math.max(1, Math.round((result.workDays || 4) * 0.35)), note: 'Bord & punten' });
      timeline.push({ phase: 'Keuring', days: 1, note: answers.inspection === 'ja' ? 'AREI' : 'Optioneel later' });

      quoteChecks = [
        'Scope (partieel/volledig) expliciet',
        'Bord wel/niet nieuw',
        'Aantal punten of forfait per ruimte',
        'Sleuwen/herstellen inbegrepen?',
        'Keuring inbegrepen?',
        'Btw-tarief'
      ];
      contractorQuestions = [
        'Hoeveel circuits voorzien jullie?',
        'Zijn sleuven en herstellingen inbegrepen?',
        'Vervangen jullie het bord volledig?',
        'Wanneer plannen jullie de keuring?',
        'Hoe gaan jullie om met bestaande bekabeling die blijft?',
        'Welk btw-tarief?'
      ];
      savings.push({ text: 'Bundel elektra met andere breekwerken om sleuven te delen.', amount: null });
      savings.push({ text: 'Kies standaard fit-out i.p.v. overal dubbele punten.', amount: null });
    }

    if (type === 'gevel') {
      included.push('Gevelwerken: ' + (answers.intervention || 'zoals gekozen'));
      if (answers.scaffold === 'middel' || answers.scaffold === 'hoog') included.push('Steiger en werfinrichting (aparte post)');
      if (answers.finish && answers.finish !== 'nee') included.push('Extra afwerking/kleur');

      confirmItems.push('Oppervlakte per gevelvlak');
      confirmItems.push('Steigerduur en wie plaatst/haalt af');
      confirmItems.push('Ondergrondvoorbereiding bij slechte staat');

      insights.push('Steiger is bij middel/hoge toegang een must-post, vergelijk die apart in offertes.');
      if (answers.intervention === 'isolatie_afwerking') insights.push('Isolatie+afwerking (ETICS) combineert energie en uitzicht; check premievoorwaarden.');
      if (answers.condition === 'slecht') insights.push('Slechte staat betekent vaak meer herstel vóór de zichtafwerking.');

      risks.push('Weersafhankelijkheid kan de planning rekken bij crepi/bekleding.');
      riskRows.push({ risk: 'Steiger', impact: 'HOOG', check: 'Vraag huurduur, op-/afbouw en meerwerk bij uitloop.' });
      riskRows.push({ risk: 'Ondergrond', impact: 'MIDDEL', check: 'Laat hechting/vocht beoordelen voor start.' });

      timeline.push({ phase: 'Steiger & bescherming', days: (answers.scaffold === 'laag' ? 0 : 1), note: 'Werfinrichting' });
      timeline.push({ phase: 'Gevelwerken', days: Math.max(2, result.workDays || 4), note: answers.intervention || 'uitvoering' });
      timeline.push({ phase: 'Afwerking', days: 1, note: 'Oplevering / nazicht' });

      quoteChecks = [
        'Interventie en m² per gevel',
        'Steiger apart gespecificeerd',
        'Voorbereiding bij slechte staat',
        'Materiaaltype (crepi/bekleding/ETICS)',
        'Weersvoorbehoud',
        'Btw-tarief'
      ];
      contractorQuestions = [
        'Hoe lang blijft de steiger staan?',
        'Welke voorbereiding zit in de prijs?',
        'Welk systeem/merk gebruiken jullie?',
        'Hoe garanderen jullie waterdichting bij ETICS?',
        'Wat bij regenvertraging?',
        'Welk btw-tarief?'
      ];
      savings.push({ text: 'Combineer gevelisolatie met schilder- of raamwerken in één steigerfase.', amount: null });
    }

    if (type === 'zonnepanelen') {
      included.push('Panelen, omvormer en montage');
      included.push('AREI-keuring');
      if (answers.electricalAdapt && answers.electricalAdapt !== 'nee') included.push('Elektrische aanpassing zoals aangegeven');
      if (answers.battery === 'ja') included.push('Thuisbatterij (optioneel add-on)');

      confirmItems.push('Dakgeschiktheid (oriëntatie, schaduw, structuur)');
      confirmItems.push('Omvormertype en monitoring');
      confirmItems.push('Netstudie / aanmelding waar nodig');

      insights.push('ELYAN raamde hardware en montage, geen gegarandeerde besparing of terugverdientijd.');
      insights.push('Prijs per Wp is de beste vergelijkingsmaat; batterij maakt totalen niet-direct vergelijkbaar.');
      if (answers.access === 'moeilijk') insights.push('Moeilijke daktoegang verhoogt montageuren met ongeveer 15–25%.');
      if (answers.battery === 'ja') insights.push('Batterij is een aparte investeringsbeslissing; reken die niet mee in een “pure PV”-vergelijking.');

      risks.push('Schaduw, oriëntatie of zwakke dakstructuur kunnen opbrengst of uitvoerbaarheid beperken.');
      riskRows.push({ risk: 'Dakstructuur', impact: 'HOOG', check: 'Laat draagkracht en bevestiging controleren.' });
      riskRows.push({ risk: 'Administratie', impact: 'MIDDEL', check: 'Check aanmelding, keuring en eventuele steun per regio.' });

      timeline.push({ phase: 'Site-check & bestelling', days: 2, note: 'Dak & elektrisch' });
      timeline.push({ phase: 'Montage', days: Math.max(1, result.workDays || 2), note: 'Panelen + omvormer' });
      timeline.push({ phase: 'Keuring', days: 1, note: 'AREI' });

      quoteChecks = [
        '€/Wp of totaal + vermogen (kWp)',
        'Omvormer inbegrepen',
        'Montagesysteem per daktype',
        'AREI-keuring',
        'Batterij apart of inbegrepen',
        'Geen misleidende gegarandeerde besparing zonder aannames'
      ];
      contractorQuestions = [
        'Welk vermogen en hoeveel panelen leveren jullie exact?',
        'Is de omvormer inbegrepen en welk type?',
        'Hoe bevestigen jullie op mijn daktype?',
        'Wat kost de batterij apart?',
        'Wie doet keuring en aanmelding?',
        'Welke aannames zitten achter eventuele opbrengstcijfers?'
      ];
      savings.push({ text: 'Vergelijk offertes op €/Wp excl. batterij, met dezelfde kWp.', amount: null });
      savings.push({ text: 'Optimaliseer paneelplaatsing i.p.v. blind meer panelen bij te plaatsen in schaduw.', amount: null });
    }

    if (type === 'ventilatie') {
      included.push('Ventilatiesysteem (' + (answers.system || '') + ')');
      included.push('Installatie en inregeling');
      if (answers.routing === 'renovatie' || answers.routing === 'complex') included.push('Kanaalwerk volgens complexiteit');

      confirmItems.push('Debieten per ruimte');
      confirmItems.push('Geluidsniveau unit en ventielen');
      confirmItems.push('Onderhoudsfilter en toegang');

      insights.push('Systeem D is duurder maar recupereert warmte; C is goedkoper maar ventileert anders.');
      if (answers.routing === 'complex') insights.push('Complex kanaalwerk in renovatie is vaak de grootste urenpost, niet de unit alleen.');
      if (answers.system === 'decentraal') insights.push('Decentrale units vermijden lange kanalen, maar je hebt meer toestellen en onderhoudspunten.');

      risks.push('Te krappe kanalen of slechte inregeling geven lawaai en tocht.');
      riskRows.push({ risk: 'Inregeling', impact: 'HOOG', check: 'Vraag meetrapport van debieten bij oplevering.' });
      riskRows.push({ risk: 'Bouwkundig', impact: 'MIDDEL', check: 'Doorboringen en brandcompartimentering vooraf plannen.' });

      timeline.push({ phase: 'Uitzetten tracés', days: 1, note: 'Routing' });
      timeline.push({ phase: 'Installatie', days: Math.max(2, result.workDays || 3), note: 'Unit + kanalen' });
      timeline.push({ phase: 'Inregeling', days: 1, note: 'Debieten & oplevering' });

      quoteChecks = [
        'Systeemtype (C/D/decentraal)',
        'Unitmerk en capaciteit',
        'Kanaalwerk omschreven',
        'Inregeling inbegrepen',
        'Onderhoudsvoorschrift',
        'Btw-tarief'
      ];
      contractorQuestions = [
        'Welke debieten garanderen jullie per natte ruimte?',
        'Hoe dempen jullie geluid?',
        'Is inregeling met meetrapport inbegrepen?',
        'Waar komt de unit en hoe bereikbaar zijn filters?',
        'Hoe zitten brandkleppen/doorboringen in de prijs?',
        'Welk btw-tarief?'
      ];
      savings.push({ text: 'Plan ventilatie samen met plafond- of chape-werken om kanalen makkelijker te trekken.', amount: null });
      savings.push({ text: 'Kies systeemniveau op basis van luchtdichtheid van de woning, niet alleen op prijs.', amount: null });
    }

    (result.drivers || []).forEach(function (d) {
      if (!d) return;
      var line = d.text;
      if (d.amount) {
        var sign = d.amount > 0 ? '+' : '';
        line = d.text + ' (' + sign + pricing.fmtEUR(Math.abs(d.amount)) + ')';
      }
      if (insights.indexOf(line) === -1 && insights.indexOf(d.text) === -1) insights.push(line);
    });

    if (result.marketPosition === 'hoger') {
      insights.push('Jouw raming ligt boven de typische marktband, meestal door scope, bereikbaarheid of materiaalniveau, niet automatisch “te duur”.');
    } else if (result.marketPosition === 'lager') {
      insights.push('Jouw raming ligt onder de typische marktband, vaak door beperkte scope of efficiënte keuzes (zelfde layout, basisafwerking).');
    } else {
      insights.push('Jouw verwachte budget ligt binnen de Belgische marktband 2026 voor vergelijkbare projecten.');
    }

    // Top 3 conclusions
    if (!conclusions.length) {
      var ur = (pricing.unitRateDisplay && pricing.unitRateDisplay(type, result))
        || result.unitRate
        || { formatted: pricing.fmtEUR(result.perM2), suffix: '/m²' };
      conclusions.push('Verwacht budget rond ' + pricing.fmtEUR(result.price) + ' excl. btw (' + ur.formatted + ur.suffix + ').');
    }
    if (result.drivers && result.drivers[0]) {
      var d0 = result.drivers[0];
      conclusions.push('Belangrijkste kostendrijver: ' + d0.text + (d0.amount ? ' (' + (d0.amount > 0 ? '+' : '') + pricing.fmtEUR(d0.amount) + ')' : '') + '.');
    }
    if (lp.labourHours) {
      conclusions.push('Arbeidsplan: ca. ' + lp.labourHours + ' manuren, ploeg van ' + (lp.crewSize || 2) + ', ±' + (lp.workDays || result.workDays) + ' werkdagen.');
    }
    while (conclusions.length < 3) {
      conclusions.push('Vergelijk offertes op dezelfde werkpakketten als in dit rapport.');
    }

    recommendations.push('Vergelijk offertes niet alleen op totaalprijs, maar op scope: afbraak, afvoer, bescherming, oplevering en garanties.');

    if (type === 'vloeren') {
      savings.push({ text: 'Controleer de ondergrond vooraf, onverwachte egalisatie is een klassieke meerpost.', amount: null });
      if (answers.floorMaterial !== 'tegel') {
        savings.push({ text: 'Vermijd complexe legpatronen als budget belangrijk is.', amount: null });
      }
    }
    if (type === 'schilderwerken') {
      savings.push({ text: 'Combineer meerdere ruimtes in één opdracht om mobilisatie te delen.', amount: null });
      savings.push({ text: 'Herstel de ondergrond vooraf waar je zelf eenvoudig kan bijdragen (afdekken, lichte schuur).', amount: null });
    }

    var pctLow = result.contingencyPct ? Math.round(result.contingencyPct.low * 100) : 10;
    var pctHigh = result.contingencyPct ? Math.round(result.contingencyPct.high * 100) : 15;
    var bufferReason = 'Voor dit project adviseren we ' + pctLow + '–' + pctHigh + '% buffer';
    if (result.confidence === 'indicatief' || pctHigh >= 18) {
      bufferReason += ' omdat er meerdere onzekerheden in jouw antwoorden zitten.';
    } else if (pctHigh <= 10) {
      bufferReason += ', jouw antwoorden zijn relatief duidelijk, dus een lagere buffer volstaat.';
    } else {
      bufferReason += ', typisch voor een standaard renovatie met normale onzekerheid.';
    }

    var executiveConclusion = buildExecutiveConclusion(type, answers, result, pricing, conclusions);

    function uniq(arr) {
      var out = [];
      arr.forEach(function (x) { if (x && out.indexOf(x) === -1) out.push(x); });
      return out;
    }

    return {
      insights: uniq(insights).slice(0, 8),
      planning: uniq(planning).slice(0, 6),
      recommendations: uniq(recommendations).slice(0, 8),
      risks: uniq(risks).slice(0, 5),
      conclusions: conclusions.slice(0, 3),
      executiveConclusion: executiveConclusion,
      included: uniq(included),
      confirmItems: uniq(confirmItems),
      assumptions: uniq(assumptions),
      riskRows: riskRows.slice(0, 6),
      savings: uniq(savings.map(function (s) { return s.text || s; })).slice(0, 5).map(function (t) {
        return typeof t === 'string' ? { text: t, amount: null } : t;
      }),
      quoteChecks: quoteChecks,
      contractorQuestions: contractorQuestions.slice(0, 10),
      redFlags: uniq(redFlags),
      timeline: timeline,
      bufferReason: bufferReason,
      btwTip: (answers.housingAge === 'middel' || answers.housingAge === 'oud')
        ? pricing.BTW_TIP
        : 'Bij woningen jonger dan 10 jaar geldt meestal 21% btw. Laat dit bevestigen in je offerte.',
      fingerprint: buildFingerprint(type, answers, pricing)
    };
  }

  function buildExecutiveConclusion(type, answers, result, pricing, conclusions) {
    var noun = (pricing.CATEGORIES[type] && pricing.CATEGORIES[type].resultNoun) || 'renovatie';
    var pos = result.marketPosition;
    var parts = [];
    if (pos === 'niet-direct-vergelijkbaar') {
      parts.push('Jouw ' + noun + ' bevat scope-elementen die niet 1-op-1 met de marktband te vergelijken zijn, gebruik de kostentabel als basis, niet alleen het totaal.');
    } else if (pos === 'hoger') {
      parts.push('Jouw project ligt boven de typische Belgische marktband voor vergelijkbare scope, vaak door materiaalniveau, bereikbaarheid of extra posten.');
    } else if (pos === 'lager') {
      parts.push('Jouw project ligt onder de typische Belgische marktband, meestal door efficiënte scopekeuzes, niet automatisch “te goedkoop”.');
    } else {
      parts.push('Jouw project bevindt zich binnen de normale Belgische marktband voor deze ' + noun + '.');
    }
    if (result.drivers && result.drivers[0]) {
      parts.push(result.drivers[0].text + ' is jouw grootste kostendrijver.');
    } else if (conclusions && conclusions[0]) {
      parts.push(conclusions[0]);
    }
    if (type === 'dak' && answers.access !== 'moeilijk') {
      parts.push('Bereikbaarheid is in jouw situatie geen uitzonderlijke kostendrijver.');
    }
    if (type === 'dak' && (answers.insulation === 'ja' || answers.workType === 'volledig')) {
      parts.push('Isolatie en dakbedekking wegen zwaar in het budget.');
    }
    return parts.slice(0, 3).join(' ');
  }

  function buildFingerprint(type, answers, pricing) {
    var parts = [];
    var cat = pricing.CATEGORIES[type];
    if (cat) parts.push(cat.label);
    if (pricing.sizeDisplay) {
      var sd = pricing.sizeDisplay(type, answers, {});
      if (sd && sd.short) parts.push(sd.short);
    } else if (type !== 'zonnepanelen' && answers.size) {
      parts.push(answers.size + ' m²');
    } else if (type === 'zonnepanelen' && answers.size) {
      parts.push(answers.size + ' kWp');
    }
    if (answers.level && pricing.LEVEL_LABEL) parts.push(pricing.LEVEL_LABEL[answers.level] || answers.level);
    var extras = [];
    if (type === 'badkamer' && answers.sanitary) extras.push(answers.sanitary);
    if (type === 'keuken' && answers.scope) extras.push(answers.scope);
    if (type === 'dak' && answers.workType) extras.push(answers.workType);
    if (type === 'vloeren' && answers.floorMaterial) extras.push(answers.floorMaterial);
    if (type === 'schilderwerken' && answers.paintScope) extras.push(answers.paintScope);
    if (type === 'ramen') {
      if (answers.frame) extras.push(answers.frame);
      if (answers.glazing) extras.push(answers.glazing);
    }
    if (type === 'isolatie' && answers.subtype) extras.push(answers.subtype);
    if (type === 'verwarming' && answers.projectType) extras.push(answers.projectType);
    if (type === 'elektriciteit' && answers.scope) extras.push(answers.scope);
    if (type === 'gevel' && answers.intervention) extras.push(answers.intervention);
    if (type === 'zonnepanelen') {
      if (answers.sizeMode === 'panels' && answers.panelCount) extras.push(answers.panelCount + ' panelen');
      if (answers.battery === 'ja') extras.push('batterij');
    }
    if (type === 'ventilatie' && answers.system) extras.push(answers.system);
    if (extras.length) parts.push(extras.join(' · '));
    return parts.join(' · ');
  }

  function buildNextSteps(type, answers, result, pricing) {
    var scopeCheck = type === 'zonnepanelen'
      ? 'Controleer vermogen (kWp/panelen) en scope aan de hand van de kostentabel in dit rapport.'
      : 'Controleer oppervlakte en scope aan de hand van de kostentabel in dit rapport.';
    var steps = [
      scopeCheck,
      'Verzamel foto\'s of plannen van de huidige situatie.',
      'Vraag minstens 3 offertes die dezelfde werkpakketten volgen.',
      'Gebruik de ELYAN-kostentabel als referentie bij het vergelijken.',
      'Laat btw-scenario en eventuele premievoorwaarden bevestigen.',
      'Leg scope, planning, meerwerken en buffer schriftelijk vast.',
      'Plan een budgetbuffer van ' + pricing.fmtEUR(result.contingency || 0) + '.'
    ];
    if (type === 'dak' && (answers.insulation === 'ja' || answers.workType === 'isolatie' || answers.workType === 'volledig')) {
      steps.unshift('Check Mijn VerbouwPremie / regionaal loket: sinds 1 maart 2026 tellen inkomenscategorieën zwaarder.');
    }
    if (answers.urgency === 'snel') {
      steps.unshift('Neem deze week contact op met minstens twee aannemers om wachttijden te checken.');
    }
    if (result.confidence === 'indicatief') {
      steps.push('Laat openstaande twijfels (ondergrond, asbest, leidingen) ter plaatse beoordelen.');
    }
    var out = [];
    steps.forEach(function (s) { if (out.indexOf(s) === -1) out.push(s); });
    return out.slice(0, 8);
  }

  return {
    buildInsights: buildInsights,
    buildNextSteps: buildNextSteps,
    buildFingerprint: buildFingerprint
  };
});
