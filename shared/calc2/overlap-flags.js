/* ============================================================
   ELYAN Calculator 2 — Overlap flag detection (metadata only)
   Does NOT deduct costs. Phase 4 reconciles.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2Overlap = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Inspect active package results / mappings and return overlap flags.
   * @param {object} packageResults map id → package result
   * @param {object} scope Calc2 scope intensities
   */
  function detectOverlapFlags(packageResults, scope) {
    var flags = [];
    var active = {};
    Object.keys(scope || {}).forEach(function (id) {
      var v = scope[id];
      if (v && v !== 'niet_nodig') active[id] = v;
    });

    // Treat bathroom instances as active bathroom package
    Object.keys(packageResults || {}).forEach(function (key) {
      if (key.indexOf('badkamer') === 0 || (packageResults[key] && packageResults[key].packageType === 'badkamer')) {
        if (scope && scope.badkamer && scope.badkamer !== 'niet_nodig') active.badkamer = scope.badkamer;
      }
    });

    function add(code, packages, note, severity) {
      flags.push({
        code: code,
        packages: packages,
        note: note,
        severity: severity || 'medium'
      });
    }

    if (active.dak && active.gevel) {
      add('scaffolding', ['dak', 'gevel'],
        'Dak en gevel kunnen dezelfde steigercampagne delen — niet optellen als twee volle steigers.', 'high');
      add('access_equipment', ['dak', 'gevel'],
        'Gemeenschappelijke toegang/werfinrichting mogelijk.', 'medium');
    }

    if (active.schilderwerken && (active.gevel || active.dak)) {
      var paintPkgs = ['schilderwerken'].concat(active.gevel ? ['gevel'] : []).concat(active.dak ? ['dak'] : []);
      add('scaffolding', paintPkgs,
        'Buitenschilderwerk kan steiger delen met gevel/dak.', 'medium');
    }

    if (active.ramen && (active.gevel || active.schilderwerken)) {
      add('scaffolding', ['ramen'].concat(active.gevel ? ['gevel'] : []).concat(active.schilderwerken ? ['schilderwerken'] : []),
        'Raamvervanging buiten kan steiger/toegang delen met gevel of buitenschilderwerk.', 'low');
    }

    // Isolatie vs dak / gevel collisions
    var isoDetails = packageResults && packageResults.isolatie && packageResults.isolatie.inputMapping;
    var isoSubtype = isoDetails && isoDetails.resolvedAnswers && isoDetails.resolvedAnswers.subtype;
    if (active.isolatie && active.dak && (isoSubtype === 'dak_binnen' || isoSubtype === 'zoldervloer' || !isoSubtype)) {
      add('insulation_roof_overlap', ['isolatie', 'dak'],
        'Dakisolatie in Isolatie-categorie kan overlappen met isolatie in Dak-pakket — scope controleren.', 'high');
    }
    if (active.isolatie && active.gevel && (isoSubtype === 'buitenmuur' || !isoSubtype)) {
      add('insulation_facade_overlap', ['isolatie', 'gevel'],
        'Buitenmuurisolatie vs gevel ETICS/isolatie+afwerking — risico op dubbele scope.', 'high');
    }

    if (active.elektriciteit && active.keuken) {
      add('electrical_overlap', ['elektriciteit', 'keuken'],
        'Keukenaansluitingen kunnen deels in een volle elektra-renovatie zitten.', 'medium');
    }
    if (active.elektriciteit && active.badkamer) {
      add('electrical_overlap', ['elektriciteit', 'badkamer'],
        'Badkamerelektriciteit kan overlappen met volledige herbekabeling.', 'medium');
    }
    if (active.elektriciteit && active.verwarming) {
      add('electrical_overlap', ['elektriciteit', 'verwarming'],
        'Warmtepomp/elektrische versterking kan elektra-scope raken.', 'low');
    }

    if (active.badkamer && active.keuken) {
      add('plumbing_overlap', ['badkamer', 'keuken'],
        'Sanitaire/leidingwerken kunnen gedeelde afbraak of afvoer hebben.', 'low');
    }
    if (active.badkamer && active.vloeren) {
      add('demolition', ['badkamer', 'vloeren'],
        'Afbraak/chape in badkamer en vloeren kunnen overlappen in natte zones.', 'medium');
    }

    if (active.keuken || active.badkamer || active.vloeren || active.ramen) {
      var demoPkgs = [];
      ['keuken', 'badkamer', 'vloeren', 'ramen', 'dak'].forEach(function (id) {
        if (active[id]) demoPkgs.push(id);
      });
      if (demoPkgs.length >= 2) {
        add('demolition', demoPkgs,
          'Meerdere pakketten bevatten afbraak — projectniveau mag niet alles stapelen.', 'medium');
        add('waste', demoPkgs,
          'Afvoer/containerkosten kunnen gedeeld worden over pakketten.', 'medium');
      }
    }

    if (Object.keys(active).length >= 4) {
      add('site_setup', Object.keys(active),
        'Meerdere trades → gedeelde werfinrichting/mobilisatie waarschijnlijk.', 'medium');
      add('mobilisation', Object.keys(active),
        'Eén werfopstart i.p.v. N× pakket-opstart.', 'medium');
    }

    if (active.vloeren && active.schilderwerken) {
      add('finishing', ['vloeren', 'schilderwerken'],
        'Afwerkingsvolgorde beïnvloedt bescherming/herstel — geen prijs-aftrek hier.', 'low');
    }

    // Deduplicate by code+packages signature
    var seen = {};
    return flags.filter(function (f) {
      var key = f.code + '|' + f.packages.slice().sort().join(',');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function flagsForPackage(packageId, allFlags) {
    var base = String(packageId).indexOf('badkamer') === 0 ? 'badkamer' : packageId;
    return (allFlags || []).filter(function (f) {
      return f.packages.indexOf(packageId) !== -1 || f.packages.indexOf(base) !== -1;
    });
  }

  return {
    detectOverlapFlags: detectOverlapFlags,
    flagsForPackage: flagsForPackage
  };
});
