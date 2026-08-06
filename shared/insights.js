/* ============================================================
   ELYAN — Antwoord-specifieke inzichten, planning & aanbevelingen
   Gebruikt door het PDF-rapport (en optioneel resultaten-scherm).
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
    var prov = pricing.PROVINCES[answers.province] || pricing.PROVINCES[result.province];
    var insights = [];
    var planning = [];
    var recommendations = [];
    var risks = [];

    // Shared
    if (answers.housingAge === 'jong') {
      insights.push('Je woning is jonger dan 10 jaar: reken doorgaans op 21% btw, tenzij een specifieke uitzondering van toepassing is.');
    } else if (answers.housingAge === 'middel' || answers.housingAge === 'oud') {
      insights.push('Je woning is ouder dan 10 jaar: check of het verlaagd btw-tarief van 6% van toepassing is — dat kan een groot verschil maken op arbeid.');
      recommendations.push('Vraag je aannemer expliciet om 6% btw toe te passen waar wettelijk mogelijk, en laat dit opnemen in de offerte.');
    }

    if (answers.urgency === 'snel') {
      planning.push('Je wilt snel starten: vraag offertes parallel aan en check wachttijden vroeg. Populaire aannemers boeken vaak weken tot maanden vooruit.');
      planning.push('Voorzie een snelle beslissingsmarge: materialen met lange levertijd bestel je best vroeg.');
    } else if (answers.urgency === 'binnen6') {
      planning.push('Met een horizon van ongeveer 6 maanden heb je tijd om 3 offertes te vergelijken en materialen rustig te kiezen.');
      planning.push('Plant de werken bij voorkeur buiten piekperiodes (nazomer/herfst zijn vaak iets vlotter voor planning).');
    } else {
      planning.push('Je bent flexibel in timing: gebruik dat voordeel om offertes te vergelijken en eventueel seizoenskorting of betere slots te zoeken.');
    }

    planning.push('Richttermijn voor uitvoering: ' + result.weeksLow + ' tot ' + result.weeksHigh + ' weken, afhankelijk van werfvoorbereiding en levertijden.');
    planning.push('Voorzie ' + pricing.fmtEUR(result.contingency) + ' (ca. 10–15%) als buffer bovenop de richtprijs voor onvoorziene posten.');

    if (type === 'badkamer') {
      if (answers.plumbingMove === 'ja') {
        insights.push('Leidingen verplaatsen voor een nieuwe layout is een van de sterkste kostendrijvers in badkamerrenovaties.');
        recommendations.push('Laat op plan zetten waar toevoer en afvoer komen vóór je sanitair definitief kiest — dat vermijdt herwerk.');
      } else if (answers.plumbingMove === 'nee') {
        insights.push('Door leidingen op dezelfde plaats te houden houd je de renovatie merkbaar kostenefficiënter.');
        recommendations.push('Kies sanitair en indeling die aansluiten op de bestaande aansluitpunten waar mogelijk.');
      }
      if (answers.tiling === 'volledig') {
        insights.push('Volledige betegeling verhoogt materiaal- en arbeidsuren, maar geeft een duurzame natte-zone afwerking.');
      }
      if (answers.ufh === 'ja') {
        planning.push('Vloerverwarming vraagt droogtijd vóór betegeling — bouw dit in je planning in.');
      }
      if (answers.ventilation !== 'goed') {
        risks.push('Onvoldoende ventilatie leidt vaak tot vocht- en schimmelproblemen. Voorzie een degelijke afvoer.');
      }
      if (answers.scope === 'volledig') {
        recommendations.push('Bij een totale afbraak: laat waterdichtheid, helling naar afvoer en ventilatie controleren vóór de afwerking start.');
      }
      recommendations.push('Kies kitwerk en voegen die bestand zijn tegen vocht; goedkoop kitwerk is een klassieke faalkost.');
    }

    if (type === 'keuken') {
      if (answers.appliances && answers.appliances !== 'nee') {
        insights.push('Toestellen zitten in jouw raming: vergelijk energielabels — het verschil in verbruik telt sneller door dan je denkt.');
      } else {
        insights.push('Toestellen zitten niet in deze raming. Houd apart budget vrij als je ze toch vernieuwt.');
      }
      if (answers.connections === 'ja') {
        risks.push('Aansluitingen verplaatsen vraagt coördinatie tussen keukenplaatser, elektricien en loodgieter.');
        recommendations.push('Laat een technisch plan maken vóór bestelling van kasten — foute uitsparingen zijn duur.');
      }
      if (answers.scope === 'fronten') {
        recommendations.push('Een facelift werkt het best als kastenstructuur nog stevig is; laat dat eerst nakijken.');
      }
      if (answers.worktop === 'natuursteen') {
        insights.push('Premium werkbladen vragen precieze opmeting en langere levertijd — bestel tijdig.');
      }
    }

    if (type === 'dak') {
      if (answers.workType === 'isolatie' || answers.insulation === 'ja' || answers.workType === 'volledig') {
        insights.push('Dakisolatie is vaak premie-gevoelig in België. Check Mijn VerbouwPremie, Primes Habitation of Renolution naargelang je regio.');
        recommendations.push('Vraag je aannemer naar het isolatiepeil (R-/U-waarde) en of de werken premieconform gedocumenteerd kunnen worden.');
      }
      if (answers.asbestos === 'ja' || answers.asbestos === 'mogelijk') {
        risks.push('Asbestverdachte materialen vragen een correcte diagnose en gespecialiseerde verwijdering vóór verdere werken.');
        planning.push('Plan asbestonderzoek vroeg in — dit kan de startdatum verschuiven.');
      }
      if (answers.access === 'moeilijk') {
        insights.push('Moeilijke toegang verhoogt steiger- en veiligheidskosten; vraag dit apart te specificeren in offertes.');
      }
      planning.push('Dakwerken zijn weersafhankelijk: voorjaar en nazomer zijn meestal het meest betrouwbaar.');
      recommendations.push('Laat goten, nokdetails en aansluitingen met muren expliciet opnemen in de offerte — daar ontstaan vaak lekken.');
    }

    if (type === 'vloeren') {
      if (answers.substrate === 'slecht' || answers.leveling === 'volledig') {
        insights.push('De ondergrond lijkt voorbereiding te vragen. Egalisatie of chape is vaak belangrijker voor het eindresultaat dan de topvloer zelf.');
        risks.push('Plaatsen op een slechte ondergrond leidt tot holtes, kraken of loskomend materiaal.');
      }
      if (answers.ufh === 'nieuw' || answers.ufh === 'bestaand') {
        recommendations.push('Bij vloerverwarming: kies een vloer met geschikte warmteweerstand en respecteer droogtijden strikt.');
        planning.push('Nieuwe dekvloeren met vloerverwarming hebben een opstartprotocol — reken dit mee in de planning.');
      }
      if (answers.wetRooms === 'ja') {
        recommendations.push('In natte zones: voorzie waterdichte onderlagen en juiste lijmsystemen, zeker bij tegels.');
      }
      if (answers.floorMaterial === 'parket') {
        insights.push('Parket vraagt een stabiel binnenklimaat; te vochtig of te droog leidt tot werking van het hout.');
      }
    }

    if (type === 'schilderwerken') {
      if (answers.surface === 'slecht') {
        insights.push('Een slechte ondergrond betekent dat een groot deel van het budget naar herstel gaat — dat is geen “extra”, maar noodzakelijk voor een duurzaam resultaat.');
      }
      if (answers.darkColors === 'ja') {
        recommendations.push('Voor donkere kleuren: reken op een geschikte primer en voldoende lagen; vraag dit zo te begroten.');
      }
      if (answers.paintScope === 'buiten' || answers.paintScope === 'beide') {
        planning.push('Buitenschilderwerken plan je best bij droog weer en milde temperaturen (idealiter 10–25°C).');
        recommendations.push('Laat gevels eerst beoordelen op vocht en barsten — schilderen over structurele problemen is weggegooid geld.');
      }
      if (answers.wallpaper === 'ja') {
        insights.push('Behang verwijderen is arbeidsintensief en wordt vaak onderschat in DIY-planning.');
      }
    }

    // Drivers from pricing
    (result.drivers || []).forEach(function (d) {
      if (d && d.text && insights.indexOf(d.text) === -1) {
        insights.push(d.text);
      }
    });

    // Generic quality recommendations
    recommendations.push('Vergelijk offertes niet alleen op totaalprijs, maar op wat inbegrepen is: afbraak, afvoer, bescherming, oplevering en garanties.');
    if (insights.length < 3) {
      insights.push('Vergelijkbare ' + (cat ? cat.resultNoun : 'renovatieprojecten') + ' in ' + (prov ? prov.label : 'jouw regio') + ' liggen typisch tussen ' + pricing.fmtEUR(result.peerLow) + ' en ' + pricing.fmtEUR(result.peerHigh) + '.');
    }

    // Deduplicate
    function uniq(arr) {
      var out = [];
      arr.forEach(function (x) { if (x && out.indexOf(x) === -1) out.push(x); });
      return out;
    }

    return {
      insights: uniq(insights).slice(0, 6),
      planning: uniq(planning).slice(0, 5),
      recommendations: uniq(recommendations).slice(0, 6),
      risks: uniq(risks).slice(0, 4),
      btwTip: (answers.housingAge === 'middel' || answers.housingAge === 'oud')
        ? pricing.BTW_TIP
        : 'Bij woningen jonger dan 10 jaar geldt meestal 21% btw. Laat dit bevestigen in je offerte.',
      fingerprint: buildFingerprint(type, answers, pricing)
    };
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
    var steps = pricing.VOLGENDE_STAPPEN.slice();
    if (type === 'dak' && (answers.insulation === 'ja' || answers.workType === 'isolatie' || answers.workType === 'volledig')) {
      steps.unshift('Controleer nu of je dakisolatie in aanmerking komt voor een regionale premie en welke attesten je aannemer moet leveren.');
    }
    if (answers.urgency === 'snel') {
      steps.unshift('Neem deze week contact op met minstens twee aannemers om wachttijden te checken.');
    }
    if (result.confidence === 'indicatief') {
      steps.push('Laat openstaande twijfels (ondergrond, asbest, leidingen) ter plaatse beoordelen voor je een definitieve keuze maakt.');
    }
    // unique + max 6
    var out = [];
    steps.forEach(function (s) { if (out.indexOf(s) === -1) out.push(s); });
    return out.slice(0, 6);
  }

  return {
    buildInsights: buildInsights,
    buildNextSteps: buildNextSteps,
    buildFingerprint: buildFingerprint
  };
});
