/* ============================================================
   ELYAN Calculator 2 — Property profile helpers (UI/state only)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2Property = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROVINCES = [
    { value: 'antwerpen', label: 'Antwerpen', region: 'vlaanderen' },
    { value: 'oost-vlaanderen', label: 'Oost-Vlaanderen', region: 'vlaanderen' },
    { value: 'west-vlaanderen', label: 'West-Vlaanderen', region: 'vlaanderen' },
    { value: 'vlaams-brabant', label: 'Vlaams-Brabant', region: 'vlaanderen' },
    { value: 'limburg', label: 'Limburg', region: 'vlaanderen' },
    { value: 'brussel', label: 'Brussel', region: 'brussel' },
    { value: 'waals-brabant', label: 'Waals-Brabant', region: 'wallonie' },
    { value: 'henegouwen', label: 'Henegouwen', region: 'wallonie' },
    { value: 'luik', label: 'Luik', region: 'wallonie' },
    { value: 'namen', label: 'Namen', region: 'wallonie' },
    { value: 'luxemburg', label: 'Luxemburg', region: 'wallonie' }
  ];

  var PROPERTY_TYPES = [
    { value: 'rijwoning', label: 'Rijwoning', desc: 'Woning met twee gemeenschappelijke zijgevels.' },
    { value: 'halfopen', label: 'Halfopen bebouwing', desc: 'Eén gemeenschappelijke zijgevel.' },
    { value: 'open', label: 'Open bebouwing', desc: 'Vrijstaand pand.' },
    { value: 'appartement', label: 'Appartement', desc: 'Appartement of duplex.' }
  ];

  var CONDITIONS = [
    { value: 'goed', label: 'Goed', desc: 'Bewoonbaar, lichte updates nodig.' },
    { value: 'matig', label: 'Matig', desc: 'Verouderd maar structureel oké.' },
    { value: 'verouderd', label: 'Verouderd', desc: 'Duidelijke renovatie nodig.' },
    { value: 'zwaar', label: 'Zwaar te renoveren', desc: 'Grote ingrepen te verwachten.' },
    { value: 'onbekend', label: 'Onbekend', desc: 'Nog niet voldoende bekeken.' }
  ];

  var FLOORS = [
    { value: '1', label: '1 verdieping' },
    { value: '2', label: '2 verdiepingen' },
    { value: '3', label: '3 verdiepingen' },
    { value: '4plus', label: '4 of meer' }
  ];

  var EPC_OPTIONS = [
    { value: 'A', label: 'Label A' },
    { value: 'B', label: 'Label B' },
    { value: 'C', label: 'Label C' },
    { value: 'D', label: 'Label D' },
    { value: 'E', label: 'Label E' },
    { value: 'F', label: 'Label F' },
    { value: 'G', label: 'Label G' },
    { value: 'weet_niet', label: 'Weet ik niet' }
  ];

  var YEAR_BUCKETS = [
    { value: 'voor_1950', label: 'Voor 1950' },
    { value: '1950_1970', label: '1950 – 1970' },
    { value: '1971_1990', label: '1971 – 1990' },
    { value: '1991_2005', label: '1991 – 2005' },
    { value: '2006_2015', label: '2006 – 2015' },
    { value: 'na_2015', label: 'Na 2015' },
    { value: 'weet_niet', label: 'Weet ik niet' }
  ];

  var AREA_PRESETS = [80, 100, 120, 150, 180, 220];

  function provinceLabel(value) {
    for (var i = 0; i < PROVINCES.length; i++) {
      if (PROVINCES[i].value === value) return PROVINCES[i].label;
    }
    return value || '—';
  }

  /**
   * Approximate Belgian postcode → province (UI helper only).
   * User can always override province manually.
   */
  function deriveProvinceFromPostcode(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 4) return null;
    var n = parseInt(digits.slice(0, 4), 10);
    if (!n || n < 1000 || n > 9999) return null;
    if (n >= 1000 && n <= 1299) return 'brussel';
    if (n >= 1300 && n <= 1499) return 'waals-brabant';
    if ((n >= 1500 && n <= 1999) || (n >= 3000 && n <= 3499)) return 'vlaams-brabant';
    if (n >= 2000 && n <= 2999) return 'antwerpen';
    if (n >= 3500 && n <= 3999) return 'limburg';
    if (n >= 4000 && n <= 4999) return 'luik';
    if (n >= 5000 && n <= 5999) return 'namen';
    if ((n >= 6000 && n <= 6599) || (n >= 7000 && n <= 7999)) return 'henegouwen';
    if (n >= 6600 && n <= 6999) return 'luxemburg';
    if (n >= 8000 && n <= 8999) return 'west-vlaanderen';
    if (n >= 9000 && n <= 9999) return 'oost-vlaanderen';
    return null;
  }

  function emptyProfile() {
    return {
      postcode: '',
      municipality: '',
      province: null,
      provinceDerived: false,
      propertyType: null,
      yearBuilt: null,
      areaM2: null,
      floors: null,
      condition: null,
      epc: null,
      occupiedDuringWorks: null,
      ownershipStatus: null,
      intendedPurchasePrice: null
    };
  }

  function labelOf(list, value) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].value === value) return list[i].label;
    }
    return value || '—';
  }

  return {
    PROVINCES: PROVINCES,
    PROPERTY_TYPES: PROPERTY_TYPES,
    CONDITIONS: CONDITIONS,
    FLOORS: FLOORS,
    EPC_OPTIONS: EPC_OPTIONS,
    YEAR_BUCKETS: YEAR_BUCKETS,
    AREA_PRESETS: AREA_PRESETS,
    provinceLabel: provinceLabel,
    deriveProvinceFromPostcode: deriveProvinceFromPostcode,
    emptyProfile: emptyProfile,
    labelOf: labelOf
  };
});
