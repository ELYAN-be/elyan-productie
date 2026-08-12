/* ============================================================
   ELYAN Calculator 2. Work-package scope model (UI/state only)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2Scope = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WORK_PACKAGES = [
    { id: 'dak', label: 'Dak', icon: 'i-roof' },
    { id: 'ramen', label: 'Ramen & deuren', icon: 'i-window' },
    { id: 'isolatie', label: 'Isolatie', icon: 'i-insulation' },
    { id: 'verwarming', label: 'Verwarming & warmtepomp', icon: 'i-heat' },
    { id: 'elektriciteit', label: 'Elektriciteit', icon: 'i-bolt' },
    { id: 'ventilatie', label: 'Ventilatie', icon: 'i-vent' },
    { id: 'keuken', label: 'Keuken', icon: 'i-utensils' },
    { id: 'badkamer', label: 'Badkamer', icon: 'i-bath' },
    { id: 'vloeren', label: 'Vloeren', icon: 'i-layers' },
    { id: 'schilderwerken', label: 'Schilderwerken', icon: 'i-roller' },
    { id: 'gevel', label: 'Gevel', icon: 'i-facade' }
  ];

  var INTENSITY = [
    { value: 'niet_nodig', label: 'Niet nodig', short: 'Niet' },
    { value: 'beperkt', label: 'Beperkt renoveren', short: 'Beperkt' },
    { value: 'grondig', label: 'Grondig renoveren', short: 'Grondig' },
    { value: 'volledig', label: 'Volledig vervangen', short: 'Volledig' },
    { value: 'weet_niet', label: 'Weet ik niet', short: 'Onbekend' }
  ];

  var ACTIVE = { beperkt: true, grondig: true, volledig: true, weet_niet: true };

  function isActiveIntensity(value) {
    return !!ACTIVE[value];
  }

  function intensityLabel(value) {
    for (var i = 0; i < INTENSITY.length; i++) {
      if (INTENSITY[i].value === value) return INTENSITY[i].label;
    }
    return value || '-';
  }

  function packageById(id) {
    for (var i = 0; i < WORK_PACKAGES.length; i++) {
      if (WORK_PACKAGES[i].id === id) return WORK_PACKAGES[i];
    }
    return null;
  }

  function emptyScope() {
    var scope = {};
    WORK_PACKAGES.forEach(function (p) { scope[p.id] = null; });
    return scope;
  }

  function activePackages(scope) {
    return WORK_PACKAGES.filter(function (p) {
      return isActiveIntensity(scope && scope[p.id]);
    });
  }

  return {
    WORK_PACKAGES: WORK_PACKAGES,
    INTENSITY: INTENSITY,
    isActiveIntensity: isActiveIntensity,
    intensityLabel: intensityLabel,
    packageById: packageById,
    emptyScope: emptyScope,
    activePackages: activePackages
  };
});
