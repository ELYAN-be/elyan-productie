/* ============================================================
   ELYAN Calculator 2 — Question graph (UI only, no pricing)
   Phase 3.5: higher-accuracy conditional details
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof require !== 'undefined' ? require('./scope-model') : null,
      typeof require !== 'undefined' ? require('./property-profile') : null,
      typeof require !== 'undefined' ? require('./state') : null
    );
  } else {
    root.ElyanCalc2Questions = factory(
      root.ElyanCalc2Scope,
      root.ElyanCalc2Property,
      root.ElyanCalc2State
    );
  }
})(typeof self !== 'undefined' ? self : this, function (scopeModel, propertyModel, stateApi) {
  'use strict';

  function detailOf(state, packageId, key) {
    var d = state && state.packageDetails && state.packageDetails[packageId];
    return d ? d[key] : null;
  }

  var DETAIL_FLOWS = {
    dak: [
      {
        id: 'roofType',
        type: 'cards',
        title: 'Welk daktype heeft de woning?',
        hint: 'Een schatting volstaat.',
        options: [
          { value: 'hellend', label: 'Hellend dak' },
          { value: 'plat', label: 'Plat dak' },
          { value: 'gemengd', label: 'Gemengd' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'roofMaterial',
        type: 'chips',
        title: 'Welk dakmateriaal overweeg je?',
        hint: 'Enkel relevant voor bedekking. Onzeker? Kies “Weet ik niet”.',
        showIf: function (state) {
          var t = detailOf(state, 'dak', 'roofType');
          var intensity = state.scope && state.scope.dak;
          if (intensity === 'beperkt' && t === 'plat') return false;
          return intensity === 'grondig' || intensity === 'volledig' || intensity === 'weet_niet'
            || t === 'hellend' || t === 'gemengd' || t === 'plat' || t === 'weet_niet';
        },
        optionsFrom: function (state) {
          var t = detailOf(state, 'dak', 'roofType');
          if (t === 'plat') {
            return [
              { value: 'epdm', label: 'EPDM / roofing' },
              { value: 'weet_niet', label: 'Weet ik niet' }
            ];
          }
          return [
            { value: 'betonpannen', label: 'Betonpannen' },
            { value: 'keramisch', label: 'Keramische pannen' },
            { value: 'leien', label: 'Leien' },
            { value: 'epdm', label: 'EPDM / roofing (plat deel)' },
            { value: 'weet_niet', label: 'Weet ik niet' }
          ];
        }
      },
      {
        id: 'roofArea',
        type: 'number',
        title: 'Geschatte dakoppervlakte?',
        hint: 'Mag bij benadering. Laat leeg als je het niet weet.',
        unit: 'm²',
        presets: [60, 90, 120, 160],
        optional: true,
        unknownValue: 'weet_niet'
      },
      {
        id: 'roofInsulation',
        type: 'chips',
        title: 'Isolatie mee aanpakken?',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'deels', label: 'Deels' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'roofGutters',
        type: 'chips',
        title: 'Goten / regenafvoer mee vernieuwen?',
        showIf: function (state) {
          var intensity = state.scope && state.scope.dak;
          return intensity === 'grondig' || intensity === 'volledig' || intensity === 'weet_niet';
        },
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'roofStructure',
        type: 'chips',
        title: 'Hoe is de dakstructuur (naar jouw weten)?',
        hint: 'Structurele schade is vaak pas zichtbaar bij inspectie.',
        options: [
          { value: 'goed', label: 'Goed' },
          { value: 'matig', label: 'Matig' },
          { value: 'slecht', label: 'Slecht' },
          { value: 'weet_niet', label: 'Weet ik niet / inspectie nodig' }
        ]
      },
      {
        id: 'roofAccess',
        type: 'chips',
        title: 'Hoe bereikbaar is het dak?',
        options: [
          { value: 'normaal', label: 'Normaal' },
          { value: 'moeilijk', label: 'Moeilijk' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'roofAsbestos',
        type: 'chips',
        title: 'Asbestverdacht materiaal op/in het dak?',
        hint: 'Bij twijfel: “Mogelijk / inspectie”. Geen diagnose nodig.',
        showIf: function (state) {
          var y = state.propertyProfile && state.propertyProfile.yearBuilt;
          return y === 'voor_1950' || y === '1950_1970' || y === '1971_1990' || y === 'weet_niet' || !y;
        },
        options: [
          { value: 'nee', label: 'Nee / onwaarschijnlijk' },
          { value: 'mogelijk', label: 'Mogelijk / inspectie' },
          { value: 'ja', label: 'Ja, vermoedelijk' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    ramen: [
      {
        id: 'windowQtyMethod',
        type: 'cards',
        title: 'Hoe wil je de raamomvang doorgeven?',
        hint: 'Kies wat het makkelijkst is. Exacte opmeting is niet nodig.',
        options: [
          { value: 'm2', label: 'Ik ken ongeveer het totale raam-m²', desc: 'Eén getal volstaat.' },
          { value: 'count', label: 'Ik schat per type (aantal)', desc: 'Standaard, groot, schuif, deuren.' },
          { value: 'weet_niet', label: 'Weet ik niet', desc: 'We houden onzekerheid bij.' }
        ]
      },
      {
        id: 'windowAreaM2',
        type: 'number',
        title: 'Geschat totaal raamoppervlak?',
        unit: 'm²',
        presets: [8, 12, 18, 25, 35],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) { return detailOf(state, 'ramen', 'windowQtyMethod') === 'm2'; }
      },
      {
        id: 'windowCountStd',
        type: 'chips',
        title: 'Aantal standaardramen?',
        hint: 'Typisch ±1,2–1,8 m² per raam.',
        showIf: function (state) { return detailOf(state, 'ramen', 'windowQtyMethod') === 'count'; },
        options: [
          { value: '0', label: '0' }, { value: '2', label: '2' }, { value: '4', label: '4' },
          { value: '6', label: '6' }, { value: '8', label: '8' }, { value: '10plus', label: '10+' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'windowCountLarge',
        type: 'chips',
        title: 'Aantal grote ramen?',
        hint: 'Typisch ±2,5–4 m².',
        showIf: function (state) { return detailOf(state, 'ramen', 'windowQtyMethod') === 'count'; },
        options: [
          { value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' },
          { value: '3', label: '3' }, { value: '4plus', label: '4+' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'slidingCount',
        type: 'chips',
        title: 'Schuiframen / schuifdeuren?',
        showIf: function (state) { return detailOf(state, 'ramen', 'windowQtyMethod') === 'count'; },
        options: [
          { value: '0', label: 'Geen' }, { value: '1', label: '1' },
          { value: '2', label: '2' }, { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'exteriorDoorCount',
        type: 'chips',
        title: 'Buitendeuren vernieuwen?',
        options: [
          { value: '0', label: 'Geen' }, { value: '1', label: '1' },
          { value: '2plus', label: '2 of meer' }, { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'windowFrame',
        type: 'chips',
        title: 'Voorkeur kader?',
        options: [
          { value: 'pvc', label: 'PVC' },
          { value: 'aluminium', label: 'Aluminium' },
          { value: 'hout', label: 'Hout' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    isolatie: [
      {
        id: 'isoFocus',
        type: 'chips',
        title: 'Waar wil je isoleren?',
        options: [
          { value: 'dak', label: 'Dak / zolder' },
          { value: 'muren', label: 'Muren' },
          { value: 'vloer', label: 'Vloer' },
          { value: 'combi', label: 'Combinatie' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'isoPerformance',
        type: 'chips',
        title: 'Ambitie isolatieniveau?',
        options: [
          { value: 'standaard', label: 'Standaard' },
          { value: 'hoog', label: 'Hoog' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    verwarming: [
      {
        id: 'heatExisting',
        type: 'chips',
        title: 'Huidig verwarmingssysteem?',
        options: [
          { value: 'gas', label: 'Gas' },
          { value: 'stookolie', label: 'Stookolie' },
          { value: 'elektrisch', label: 'Elektrisch' },
          { value: 'warmtepomp', label: 'Warmtepomp' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'heatDesired',
        type: 'chips',
        title: 'Gewenst systeem?',
        options: [
          { value: 'ketel', label: 'Nieuwe ketel' },
          { value: 'hybride', label: 'Hybride' },
          { value: 'lucht_water', label: 'Lucht-water warmtepomp' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'underfloor',
        type: 'chips',
        title: 'Vloerverwarming voorzien?',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'deels', label: 'Deels' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'heatDhw',
        type: 'chips',
        title: 'Warm water (boiler / SWW) mee aanpakken?',
        options: [
          { value: 'behouden', label: 'Behouden' },
          { value: 'nieuw', label: 'Nieuw voorzien' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    elektriciteit: [
      {
        id: 'elecScope',
        type: 'chips',
        title: 'Omvang van de elektriciteitswerken?',
        options: [
          { value: 'partieel', label: 'Partieel aanpassen' },
          { value: 'volledig', label: 'Volledig vernieuwen' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'elecBoard',
        type: 'chips',
        title: 'Nieuw verdeelbord?',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'elecFitOut',
        type: 'chips',
        title: 'Aantal stopcontacten / afwerking?',
        options: [
          { value: 'basis', label: 'Basis' },
          { value: 'standaard', label: 'Standaard' },
          { value: 'uitgebreid', label: 'Uitgebreid' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    ventilatie: [
      {
        id: 'ventSystem',
        type: 'chips',
        title: 'Welk ventilatiesysteem overweeg je?',
        options: [
          { value: 'decentraal', label: 'Decentraal' },
          { value: 'systeem_c', label: 'Systeem C' },
          { value: 'systeem_d', label: 'Systeem D' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'ventBathCount',
        type: 'chips',
        title: 'Hoeveel badkamers aansluiten?',
        options: [
          { value: '0', label: '0' }, { value: '1', label: '1' },
          { value: '2', label: '2' }, { value: '3plus', label: '3+' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'ventToiletCount',
        type: 'chips',
        title: 'Aparte toiletten (buiten badkamer)?',
        options: [
          { value: '0', label: '0' }, { value: '1', label: '1' },
          { value: '2plus', label: '2+' }, { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'ventLaundry',
        type: 'chips',
        title: 'Wasplaats / utility mee?',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'ventKitchen',
        type: 'chips',
        title: 'Keuken als natte ruimte meerekenen?',
        hint: 'Bij systeem C/D meestal ja. Bij decentraal enkel als er een unit komt.',
        showIf: function (state) {
          var s = detailOf(state, 'ventilatie', 'ventSystem');
          return s === 'decentraal' || s === 'weet_niet' || !s;
        },
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    keuken: [
      {
        id: 'kitchenSize',
        type: 'number',
        title: 'Geschatte keukenoppervlakte?',
        unit: 'm²',
        presets: [8, 12, 16, 20],
        optional: true,
        unknownValue: 'weet_niet'
      },
      {
        id: 'kitchenLayout',
        type: 'chips',
        title: 'Layout wijzigen?',
        options: [
          { value: 'nee', label: 'Nee, zelfde plaats' },
          { value: 'ja', label: 'Ja, herindeling' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'kitchenAppliances',
        type: 'chips',
        title: 'Toestellen meenemen in de renovatie?',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'deels', label: 'Deels' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    badkamer: [
      {
        id: 'bathCount',
        type: 'chips',
        title: 'Hoeveel badkamers aanpakken?',
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3plus', label: '3 of meer' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'bathMainSize',
        type: 'number',
        title: 'Oppervlakte hoofdbadkamer?',
        unit: 'm²',
        presets: [4, 6, 8, 12],
        optional: true,
        unknownValue: 'weet_niet'
      },
      {
        id: 'bathMainIntensity',
        type: 'chips',
        title: 'Intensiteit hoofdbadkamer?',
        options: [
          { value: 'beperkt', label: 'Beperkt' },
          { value: 'grondig', label: 'Grondig' },
          { value: 'volledig', label: 'Volledig' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'bathSecondarySize',
        type: 'number',
        title: 'Oppervlakte tweede badkamer?',
        unit: 'm²',
        presets: [3, 4, 6, 8],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) {
          var c = detailOf(state, 'badkamer', 'bathCount');
          return c === '2' || c === '3plus';
        }
      },
      {
        id: 'bathSecondaryIntensity',
        type: 'chips',
        title: 'Intensiteit tweede badkamer?',
        showIf: function (state) {
          var c = detailOf(state, 'badkamer', 'bathCount');
          return c === '2' || c === '3plus';
        },
        options: [
          { value: 'beperkt', label: 'Beperkt' },
          { value: 'grondig', label: 'Grondig' },
          { value: 'volledig', label: 'Volledig' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'bathExtraCount',
        type: 'chips',
        title: 'Hoeveel extra badkamers naast de eerste twee?',
        showIf: function (state) { return detailOf(state, 'badkamer', 'bathCount') === '3plus'; },
        options: [
          { value: '1', label: '1 extra (totaal 3)' },
          { value: '2', label: '2 extra (totaal 4)' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'bathExtraSize',
        type: 'number',
        title: 'Typische oppervlakte per extra badkamer?',
        unit: 'm²',
        presets: [3, 4, 6],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) { return detailOf(state, 'badkamer', 'bathCount') === '3plus'; }
      },
      {
        id: 'bathExtraIntensity',
        type: 'chips',
        title: 'Intensiteit extra badkamer(s)?',
        showIf: function (state) { return detailOf(state, 'badkamer', 'bathCount') === '3plus'; },
        options: [
          { value: 'beperkt', label: 'Beperkt' },
          { value: 'grondig', label: 'Grondig' },
          { value: 'volledig', label: 'Volledig' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    vloeren: [
      {
        id: 'floorShare',
        type: 'chips',
        title: 'Welk deel van de vloeren?',
        options: [
          { value: 'deel', label: 'Enkele ruimtes' },
          { value: 'meeste', label: 'Grote delen' },
          { value: 'alle', label: 'Hele woning' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'floorMaterial',
        type: 'chips',
        title: 'Voorkeur vloer?',
        options: [
          { value: 'laminaat', label: 'Laminaat / vinyl' },
          { value: 'tegel', label: 'Tegel' },
          { value: 'parket', label: 'Parket' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ],

    schilderwerken: [
      {
        id: 'paintScope',
        type: 'chips',
        title: 'Schilderwerken waar?',
        options: [
          { value: 'binnen', label: 'Binnen' },
          { value: 'buiten', label: 'Buiten' },
          { value: 'beide', label: 'Binnen & buiten' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'paintInteriorSurfaces',
        type: 'chips',
        title: 'Wat schilder je binnen?',
        showIf: function (state) {
          var s = detailOf(state, 'schilderwerken', 'paintScope');
          return s === 'binnen' || s === 'beide';
        },
        options: [
          { value: 'walls', label: 'Enkel muren' },
          { value: 'ceilings', label: 'Enkel plafonds' },
          { value: 'walls_ceilings', label: 'Muren + plafonds' },
          { value: 'whole_interior', label: 'Volledig interieur' },
          { value: 'selected_rooms', label: 'Enkele kamers' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'paintAreaMethod',
        type: 'cards',
        title: 'Ken je het schilderoppervlak?',
        options: [
          { value: 'known', label: 'Ja, ik ken ongeveer de m²' },
          { value: 'estimate', label: 'Nee, schat op basis van woning' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'paintAreaM2',
        type: 'number',
        title: 'Geschat schilderoppervlak?',
        unit: 'm²',
        presets: [80, 120, 180, 250],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) { return detailOf(state, 'schilderwerken', 'paintAreaMethod') === 'known'; }
      }
    ],

    gevel: [
      {
        id: 'facadeWork',
        type: 'chips',
        title: 'Welke gevelwerken?',
        options: [
          { value: 'reinigen', label: 'Reinigen / herstellen' },
          { value: 'crepi', label: 'Crepi / afwerking' },
          { value: 'isolatie', label: 'Isolatie + afwerking' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'facadeElevations',
        type: 'chips',
        title: 'Hoeveel gevelvlakken aanpakken?',
        options: [
          { value: '1', label: '1 gevel' },
          { value: '2', label: '2 gevels' },
          { value: '3plus', label: '3 of meer' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'facadeAreaMethod',
        type: 'cards',
        title: 'Ken je het geveloppervlak?',
        options: [
          { value: 'known', label: 'Ja, ik ken ongeveer de m²' },
          { value: 'estimate', label: 'Nee, schat via woninggegevens' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      },
      {
        id: 'facadeAreaM2',
        type: 'number',
        title: 'Geschat geveloppervlak?',
        unit: 'm²',
        presets: [40, 80, 120, 180],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) { return detailOf(state, 'gevel', 'facadeAreaMethod') === 'known'; }
      },
      {
        id: 'facadeFrontage',
        type: 'number',
        title: 'Geschatte gevelbreedte / voorgevel (optioneel)?',
        hint: 'Helpt de schatting. Mag leeg blijven.',
        unit: 'm',
        presets: [5, 6, 8, 10, 12],
        optional: true,
        unknownValue: 'weet_niet',
        showIf: function (state) { return detailOf(state, 'gevel', 'facadeAreaMethod') === 'estimate'; }
      },
      {
        id: 'facadeAccess',
        type: 'chips',
        title: 'Steiger / bereikbaarheid?',
        options: [
          { value: 'laag', label: 'Beperkt nodig' },
          { value: 'middel', label: 'Normale steiger' },
          { value: 'hoog', label: 'Hoge / complexe steiger' },
          { value: 'weet_niet', label: 'Weet ik niet' }
        ]
      }
    ]
  };

  function resolveOptions(q, state) {
    if (typeof q.optionsFrom === 'function') return q.optionsFrom(state);
    return q.options || [];
  }

  function questionVisible(q, state, packageId, intensity) {
    if (typeof q.showIf === 'function') return !!q.showIf(state, packageId, intensity);
    return true;
  }

  function detailsForPackage(packageId, intensity, state) {
    if (!scopeModel.isActiveIntensity(intensity)) return [];
    var flow = DETAIL_FLOWS[packageId] || [];
    var filtered = flow.filter(function (q) {
      if (intensity === 'beperkt' && packageId === 'dak') {
        var allow = { roofType: 1, roofMaterial: 1, roofAccess: 1, roofInsulation: 1, roofArea: 1, roofAsbestos: 1 };
        if (!allow[q.id]) return false;
      }
      return questionVisible(q, state || { scope: {}, packageDetails: {} }, packageId, intensity);
    });
    return filtered.map(function (q) {
      var copy = Object.assign({}, q);
      copy.options = resolveOptions(q, state || { scope: {}, packageDetails: {} });
      return copy;
    });
  }

  function buildDetailQueue(scope, state) {
    var queue = [];
    var fullState = state || { scope: scope || {}, packageDetails: {} };
    if (!fullState.scope) fullState.scope = scope || {};
    (scopeModel.WORK_PACKAGES || []).forEach(function (pkg) {
      var intensity = (scope || fullState.scope || {})[pkg.id];
      var qs = detailsForPackage(pkg.id, intensity, fullState);
      qs.forEach(function (q) {
        queue.push({
          packageId: pkg.id,
          packageLabel: pkg.label,
          intensity: intensity,
          question: q
        });
      });
    });
    return queue;
  }

  function propertyScreens(state) {
    var screens = [
      { id: 'location', section: 'property' },
      { id: 'propertyType', section: 'property' },
      { id: 'yearBuilt', section: 'property' },
      { id: 'areaFloors', section: 'property' },
      { id: 'condition', section: 'property' },
      { id: 'epc', section: 'property' },
      { id: 'occupied', section: 'property' },
      { id: 'ownership', section: 'property' }
    ];
    if (state && state.goal === 'investor') {
      screens.push({ id: 'investorPriceOptional', section: 'property' });
    }
    return screens;
  }

  function buildFlow(state) {
    var flow = [{ id: 'goal', section: 'goal' }];
    propertyScreens(state).forEach(function (s) { flow.push(s); });
    flow.push({ id: 'scope', section: 'scope' });
    var details = buildDetailQueue(state.scope || {}, state);
    details.forEach(function (item, idx) {
      flow.push({
        id: 'detail:' + item.packageId + ':' + item.question.id,
        section: 'details',
        detailIndex: idx,
        detail: item
      });
    });
    flow.push({ id: 'finish', section: 'finish' });
    flow.push({ id: 'procurement', section: 'organisation' });
    flow.push({ id: 'structuralRisk', section: 'organisation' });
    flow.push({ id: 'review', section: 'review' });
    if (state && state.goal === 'investor') {
      flow.push({ id: 'financePurchase', section: 'finance' });
      flow.push({ id: 'financeBuyer', section: 'finance' });
      flow.push({ id: 'financeFunding', section: 'finance' });
      flow.push({ id: 'financeHolding', section: 'finance' });
      flow.push({ id: 'financeSelling', section: 'finance' });
      flow.push({ id: 'financeVat', section: 'finance' });
      flow.push({ id: 'financeResale', section: 'finance' });
      flow.push({ id: 'financeTarget', section: 'finance' });
      flow.push({ id: 'financeResult', section: 'finance' });
    }
    return flow;
  }

  return {
    DETAIL_FLOWS: DETAIL_FLOWS,
    detailsForPackage: detailsForPackage,
    buildDetailQueue: buildDetailQueue,
    propertyScreens: propertyScreens,
    buildFlow: buildFlow,
    propertyModel: propertyModel,
    scopeModel: scopeModel,
    stateApi: stateApi
  };
});
