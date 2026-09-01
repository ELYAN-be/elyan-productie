'use strict';

var INTELLIGENCE = require('../../shared/vakmannen/intelligence');

var ELYAN_CATEGORY_IDS = [
  'dakwerken', 'badkamer', 'keuken', 'ramen-deuren', 'isolatie', 'verwarming',
  'elektriciteit', 'gevel', 'vloeren', 'schilderwerken', 'ventilatie', 'zonnepanelen'
];

/** Map interest-form specialty values → canonical ELYAN category id. */
var SPECIALTY_MAP = {
  badkamer: 'badkamer',
  keuken: 'keuken',
  dak: 'dakwerken',
  'ramen-deuren': 'ramen-deuren',
  isolatie: 'isolatie',
  verwarming: 'verwarming',
  elektriciteit: 'elektriciteit',
  vloeren: 'vloeren',
  schilderwerken: 'schilderwerken',
  gevel: 'gevel',
  zonnepanelen: 'zonnepanelen',
  ventilatie: 'ventilatie'
};

function isSupportedCategory(categoryId) {
  return ELYAN_CATEGORY_IDS.indexOf(categoryId) >= 0;
}

function mapSpecialtyToCategory(specialty) {
  var key = String(specialty || '').trim().toLowerCase();
  if (!key) return null;
  if (isSupportedCategory(key)) return key;
  if (SPECIALTY_MAP[key]) return SPECIALTY_MAP[key];
  if (key === 'algemeen' || key === 'andere') return null;
  return null;
}

function getCategoryLabel(categoryId) {
  if (!categoryId) return null;
  try {
    var cat = INTELLIGENCE.getCategory(categoryId);
    return cat && cat.label ? cat.label : categoryId;
  } catch (e) {
    return categoryId;
  }
}

module.exports = {
  ELYAN_CATEGORY_IDS: ELYAN_CATEGORY_IDS,
  SPECIALTY_MAP: SPECIALTY_MAP,
  isSupportedCategory: isSupportedCategory,
  mapSpecialtyToCategory: mapSpecialtyToCategory,
  getCategoryLabel: getCategoryLabel
};
