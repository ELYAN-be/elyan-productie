/**
 * Marketplace Phase 1 — location normalization (Vlaanderen-first foundation).
 */
'use strict';

var Draft = require('../js/professionals/onboarding-draft');

/** Minimal postcode → { gemeente, provincieId, gewestId } for tests + common BE codes. */
var POSTCODE_SEED = {
  '1000': { gemeente: 'Brussel', provincieId: 'brussel', gewestId: 'brussel' },
  '2000': { gemeente: 'Antwerpen', provincieId: 'antwerpen', gewestId: 'vlaanderen' },
  '3000': { gemeente: 'Leuven', provincieId: 'vlaams_brabant', gewestId: 'vlaanderen' },
  '4000': { gemeente: 'Luik', provincieId: 'luik', gewestId: 'wallonie' },
  '5000': { gemeente: 'Namen', provincieId: 'namen', gewestId: 'wallonie' },
  '8000': { gemeente: 'Brugge', provincieId: 'west_vlaanderen', gewestId: 'vlaanderen' },
  '9000': { gemeente: 'Gent', provincieId: 'oost_vlaanderen', gewestId: 'vlaanderen' },
  '3500': { gemeente: 'Hasselt', provincieId: 'limburg', gewestId: 'vlaanderen' }
};

var GEMEENTE_SEED = {};
Object.keys(POSTCODE_SEED).forEach(function (pc) {
  var g = POSTCODE_SEED[pc];
  GEMEENTE_SEED[g.gemeente.toLowerCase()] = {
    gemeente: g.gemeente,
    provincieId: g.provincieId,
    gewestId: g.gewestId,
    postcode: pc
  };
});

function normalizeLocation(input) {
  input = input || {};
  var postcode = input.postcode ? String(input.postcode).replace(/\s+/g, '').trim() : '';
  var gemeente = input.gemeente ? String(input.gemeente).trim() : '';

  if (postcode) {
    if (!/^[1-9][0-9]{3}$/.test(postcode)) {
      return { ok: false, code: 'location_invalid' };
    }
    var byPc = POSTCODE_SEED[postcode];
    if (byPc) {
      return {
        ok: true,
        location: {
          postcode: postcode,
          gemeente: byPc.gemeente,
          provincieId: byPc.provincieId,
          gewestId: byPc.gewestId
        }
      };
    }
    // Unknown postcode: accept structurally with gewest heuristic by range
    var n = Number(postcode);
    var gewestId = 'vlaanderen';
    var provincieId = null;
    if (n >= 1000 && n < 1300) {
      gewestId = 'brussel';
      provincieId = 'brussel';
    } else if (n >= 4000 && n < 8000) {
      gewestId = 'wallonie';
    }
    return {
      ok: true,
      location: {
        postcode: postcode,
        gemeente: gemeente || null,
        provincieId: provincieId,
        gewestId: gewestId
      }
    };
  }

  if (gemeente) {
    var hit = GEMEENTE_SEED[gemeente.toLowerCase()];
    if (hit) {
      return {
        ok: true,
        location: {
          postcode: hit.postcode || null,
          gemeente: hit.gemeente,
          provincieId: hit.provincieId,
          gewestId: hit.gewestId
        }
      };
    }
    return {
      ok: true,
      location: {
        postcode: null,
        gemeente: gemeente,
        provincieId: null,
        gewestId: null
      }
    };
  }

  return { ok: true, location: null };
}

function regioSlugFor(location) {
  if (!location) return null;
  if (location.provincieId) return location.provincieId.replace(/_/g, '-');
  if (location.gewestId) return location.gewestId;
  return null;
}

module.exports = {
  normalizeLocation: normalizeLocation,
  regioSlugFor: regioSlugFor,
  POSTCODE_SEED: POSTCODE_SEED
};
