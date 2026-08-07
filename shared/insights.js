/* ============================================================
   ELYAN — Antwoord-specifieke inzichten (price-aware, risk-aware)
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

    assumptions.push('De aangegeven oppervlakte (' + (answers.size || result.size) + ' m²) klopt bij benadering.');
    assumptions.push('Afwerkingsniveau "' + ((pricing.LEVEL_LABEL && pricing.LEVEL_LABEL[answers.level]) || answers.level || 'standaard') + '" is representatief voor jouw materiaalkeuze.');
    assumptions.push('Normale leveromstandigheden en geen uitzonderlijke prijsstijgingen tijdens de werf.');
    assumptions.push('Geen structurele verborgen schade buiten wat je hebt aangegeven.');
    if (answers.access === 'moeilijk') {
      assumptions.push('Moeilijke toegang zoals aangegeven is meegenomen in steiger/veiligheid.');
    } else if (answers.access === 'vlot') {
      assumptions.push('Vlotte toegang zoals aangegeven — geen uitzonderlijke steigercomplexiteit.');
    } else if (answers.access) {
      assumptions.push('Werftoegang is normaal zoals aangegeven.');
    }
    if (answers.asbestos === 'nee') assumptions.push('Geen asbestproblematiek verwacht op basis van jouw antwoord.');
    if (answers.asbestos === 'mogelijk') assumptions.push('Asbest is als mogelijk risico meegenomen via een onderzoeksbuffer — geen volledige sanering.');
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
        planning.push('Vloerverwarming vraagt droogtijd vóór betegeling — bouw dit in de planning in.');
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
        insights.push('Toestellen zitten in jouw raming — vergelijk energielabels én inbouwmaten vóór bestelling.');
      } else {
        insights.push('Toestellen zitten niet in deze raming. Houd apart budget vrij als je ze toch vernieuwt.');
      }
      if (answers.connections === 'ja') {
        risks.push('Aansluitingen verplaatsen vraagt coördinatie tussen keukenplaatser, elektricien en loodgieter.');
        riskRows.push({ risk: 'Technische verplaatsingen', impact: 'HOOG', check: 'Technisch plan vóór kastbestelling.' });
        savings.push({ text: 'Zelfde hoofdlayout behouden vermijdt dure leiding- en elektrawerken.', amount: null });
      } else {
        savings.push({ text: 'Behoud bestaande aansluitpunten — dat beperkt loodgieter- en elektrakosten.', amount: null });
      }
      if (answers.appliances === 'basis') {
        savings.push({ text: 'Kies middenklasse apparatuur waar prestaties vergelijkbaar zijn met premium.', amount: null });
      }
      if (answers.scope === 'fronten') {
        recommendations.push('Een facelift werkt alleen als de kaststructuur nog stevig is — laat dat eerst nakijken.');
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
        insights.push('Dakisolatie zit in jouw scope — check premievoorwaarden sinds 1 maart 2026 (inkomenscategorie telt zwaar).');
        recommendations.push('Vraag R-/U-waarde en premieconforme documentatie aan je aannemer.');
        conclusions.push('Isolatie combineert energievoordeel met werfefficiëntie als bedekking sowieso openligt.');
        savings.push({ text: 'Combineer isolatie en dakbedekking in één werffase — vermijd dubbele steiger- en mobilisatiekosten.', amount: null });
      }
      if (answers.asbestos === 'ja' || answers.asbestos === 'mogelijk') {
        risks.push('Asbestverdachte materialen vragen diagnose en gespecialiseerde verwijdering vóór verdere werken.');
        riskRows.push({ risk: 'Asbest', impact: answers.asbestos === 'ja' ? 'HOOG' : 'MIDDEL', check: 'Laat een asbestinventaris maken vóór start.' });
        planning.push('Plan asbestonderzoek vroeg — dit kan de startdatum verschuiven.');
      }
      if (answers.access === 'moeilijk') {
        insights.push('Moeilijke toegang verhoogt steiger- en veiligheidskosten; vraag dit apart te specificeren.');
        riskRows.push({ risk: 'Bereikbaarheid', impact: 'MIDDEL', check: 'Steigerplan en valbeveiliging in offerte.' });
      }
      planning.push('Dakwerken zijn weersafhankelijk: voorjaar en nazomer zijn meestal het meest betrouwbaar.');
      recommendations.push('Laat goten, nokdetails en muuraansluitingen expliciet opnemen — daar ontstaan vaak lekken.');
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
        savings.push({ text: 'Behoud goede bestaande goten wanneer technisch verantwoord — dat vermijdt een aparte gootpost.', amount: null });
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
        insights.push('De ondergrond vraagt voorbereiding — egalisatie is vaak belangrijker voor het eindresultaat dan de topvloer.');
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
        insights.push('Een slechte ondergrond betekent dat een groot deel van het budget naar herstel gaat — noodzakelijk voor een duurzaam resultaat.');
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
      insights.push('Jouw raming ligt boven de typische marktband — meestal door scope, bereikbaarheid of materiaalniveau, niet automatisch “te duur”.');
    } else if (result.marketPosition === 'lager') {
      insights.push('Jouw raming ligt onder de typische marktband — vaak door beperkte scope of efficiënte keuzes (zelfde layout, basisafwerking).');
    } else {
      insights.push('Jouw verwachte budget ligt binnen de Belgische marktband 2026 voor vergelijkbare projecten.');
    }

    // Top 3 conclusions
    if (!conclusions.length) {
      conclusions.push('Verwacht budget rond ' + pricing.fmtEUR(result.price) + ' excl. btw (' + pricing.fmtEUR(result.perM2) + '/m²).');
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
      savings.push({ text: 'Controleer de ondergrond vooraf — onverwachte egalisatie is een klassieke meerpost.', amount: null });
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
      bufferReason += ' — jouw antwoorden zijn relatief duidelijk, dus een lagere buffer volstaat.';
    } else {
      bufferReason += ' — typisch voor een standaard renovatie met normale onzekerheid.';
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
      parts.push('Jouw ' + noun + ' bevat scope-elementen die niet 1-op-1 met de marktband te vergelijken zijn — gebruik de kostentabel als basis, niet alleen het totaal.');
    } else if (pos === 'hoger') {
      parts.push('Jouw project ligt boven de typische Belgische marktband voor vergelijkbare scope — vaak door materiaalniveau, bereikbaarheid of extra posten.');
    } else if (pos === 'lager') {
      parts.push('Jouw project ligt onder de typische Belgische marktband — meestal door efficiënte scopekeuzes, niet automatisch “te goedkoop”.');
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
    if (answers.size) parts.push(answers.size + ' m²');
    if (answers.level && pricing.LEVEL_LABEL) parts.push(pricing.LEVEL_LABEL[answers.level] || answers.level);
    var extras = [];
    if (type === 'badkamer' && answers.sanitary) extras.push(answers.sanitary);
    if (type === 'keuken' && answers.scope) extras.push(answers.scope);
    if (type === 'dak' && answers.workType) extras.push(answers.workType);
    if (type === 'vloeren' && answers.floorMaterial) extras.push(answers.floorMaterial);
    if (type === 'schilderwerken' && answers.paintScope) extras.push(answers.paintScope);
    if (extras.length) parts.push(extras.join(' · '));
    return parts.join(' · ');
  }

  function buildNextSteps(type, answers, result, pricing) {
    var steps = [
      'Controleer oppervlakte en scope aan de hand van de kostentabel in dit rapport.',
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
