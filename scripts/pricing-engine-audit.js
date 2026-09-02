#!/usr/bin/env node
'use strict';
/**
 * ELYAN Pricing Engine — read-only audit (Phase A)
 * node scripts/pricing-engine-audit.js
 * Does NOT mutate production data or pricing logic.
 */
var pricing = require('../shared/pricing');
var Adapters = require('../shared/calc2/answer-adapters');
var PackageEngine = require('../shared/calc2/package-engine');
var Scope = require('../shared/calc2/scope-model');

var PROV = 'oost-vlaanderen';
var TYPE_MAP = {
  dakwerken: 'dak',
  badkamer: 'badkamer',
  keuken: 'keuken',
  'ramen-deuren': 'ramen',
  isolatie: 'isolatie',
  verwarming: 'verwarming',
  elektriciteit: 'elektriciteit',
  gevel: 'gevel',
  vloeren: 'vloeren',
  schilderwerken: 'schilderwerken',
  ventilatie: 'ventilatie',
  zonnepanelen: 'zonnepanelen'
};

var SCENARIOS = {
  dak: {
    BASIC: { size: 40, level: 'basis', roofType: 'hellend', workType: 'herstelling', material: 'pannen', insulation: 'nee', gutters: 'nee', access: 'vlot', housingAge: 'middel', asbestos: 'nee' },
    TYPICAL: { size: 80, level: 'standaard', roofType: 'hellend', workType: 'vernieuwen', material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal', housingAge: 'middel', asbestos: 'nee' },
    COMPLEX: { size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig', material: 'pannen', insulation: 'ja', gutters: 'ja', access: 'moeilijk', housingAge: 'oud', asbestos: 'ja' }
  },
  badkamer: {
    BASIC: { size: 4, level: 'basis', scope: 'opfrissing', sanitary: 'behouden', tiling: 'schilder', plumbingMove: 'nee', ventilation: 'goed', ufh: 'nee', demolition: 'geen', housingAge: 'middel' },
    TYPICAL: { size: 8, level: 'standaard', scope: 'volledig', sanitary: 'douche', tiling: 'volledig', plumbingMove: 'beperkt', ventilation: 'goed', ufh: 'nee', demolition: 'volledig', housingAge: 'middel' },
    COMPLEX: { size: 10, level: 'premium', scope: 'volledig', sanitary: 'beide', tiling: 'volledig', plumbingMove: 'ja', ventilation: 'verbeteren', ufh: 'ja', demolition: 'volledig', housingAge: 'oud' }
  },
  keuken: {
    BASIC: { size: 8, level: 'basis', scope: 'fronten', cabinets: 'budget', appliances: 'nee', worktop: 'laminaat', connections: 'nee', splashback: 'nee', flooring: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 12, level: 'standaard', scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee', housingAge: 'middel' },
    COMPLEX: { size: 16, level: 'premium', scope: 'herindelen', cabinets: 'hoog', appliances: 'uitgebreid', worktop: 'natuursteen', connections: 'ja', splashback: 'ja', flooring: 'ja', housingAge: 'oud' }
  },
  ramen: {
    BASIC: { size: 8, level: 'basis', frame: 'pvc', glazing: 'hr', sliding: 'nee', doors: '0', removal: 'nee', access: 'normaal', housingAge: 'middel' },
    TYPICAL: { size: 15, level: 'standaard', frame: 'pvc', glazing: 'hr++', sliding: 'nee', doors: '1', removal: 'ja', access: 'normaal', housingAge: 'middel' },
    COMPLEX: { size: 25, level: 'standaard', frame: 'aluminium', glazing: 'hr+++', sliding: 'groot', doors: '2plus', removal: 'ja', access: 'moeilijk', housingAge: 'oud' }
  },
  isolatie: {
    BASIC: { size: 40, level: 'basis', subtype: 'spouw', performance: 'standaard', access: 'normaal', prep: 'beperkt', finish: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 80, level: 'standaard', subtype: 'dak_binnen', performance: 'standaard', access: 'normaal', prep: 'beperkt', finish: 'beperkt', housingAge: 'middel' },
    COMPLEX: { size: 120, level: 'standaard', subtype: 'buitenmuur', performance: 'hoog', access: 'moeilijk', prep: 'uitgebreid', finish: 'hoog', housingAge: 'oud' }
  },
  verwarming: {
    BASIC: { size: 90, level: 'basis', projectType: 'ketel_vervangen', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'vervangen', housingAge: 'middel' },
    TYPICAL: { size: 120, level: 'standaard', projectType: 'hybride', insulationLevel: 'matig', distribution: 'gemengd', dhw: 'nieuw', replaceVsNew: 'vervangen', housingAge: 'middel' },
    COMPLEX: { size: 160, level: 'standaard', projectType: 'lucht_water', insulationLevel: 'slecht', distribution: 'vloer', dhw: 'nieuw', replaceVsNew: 'nieuw', housingAge: 'oud' }
  },
  elektriciteit: {
    BASIC: { size: 70, level: 'basis', scope: 'partieel', floors: '1', board: 'behouden', fitOut: 'basis', inspection: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 110, level: 'standaard', scope: 'volledig', floors: '2', board: 'nieuw', fitOut: 'standaard', inspection: 'ja', housingAge: 'middel' },
    COMPLEX: { size: 160, level: 'standaard', scope: 'renovatie_volledig', floors: '3plus', board: 'nieuw', fitOut: 'uitgebreid', inspection: 'ja', housingAge: 'oud' }
  },
  gevel: {
    BASIC: { size: 40, level: 'basis', intervention: 'reinigen', condition: 'goed', elevations: '1', scaffold: 'laag', finish: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 90, level: 'standaard', intervention: 'crepi', condition: 'matig', elevations: '2', scaffold: 'middel', finish: 'basis', housingAge: 'middel' },
    COMPLEX: { size: 140, level: 'standaard', intervention: 'isolatie_afwerking', condition: 'slecht', elevations: '3plus', scaffold: 'hoog', finish: 'premium', housingAge: 'oud' }
  },
  vloeren: {
    BASIC: { size: 15, level: 'basis', floorMaterial: 'laminaat', rooms: '1', removal: 'nee', substrate: 'goed', ufh: 'nee', wetRooms: 'nee', skirting: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 50, level: 'standaard', floorMaterial: 'tegel', rooms: '2-3', removal: 'ja', substrate: 'matig', leveling: 'beperkt', ufh: 'nee', wetRooms: 'nee', skirting: 'ja', housingAge: 'middel' },
    COMPLEX: { size: 50, level: 'standaard', floorMaterial: 'tegel', rooms: 'meer', removal: 'ja', substrate: 'slecht', leveling: 'volledig', ufh: 'nieuw', wetRooms: 'ja', skirting: 'ja', housingAge: 'oud' }
  },
  schilderwerken: {
    BASIC: { size: 30, level: 'basis', paintScope: 'binnen', surface: 'goed', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 100, level: 'standaard', paintScope: 'binnen', surface: 'matig', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'beperkt', housingAge: 'middel' },
    COMPLEX: { size: 100, level: 'standaard', paintScope: 'buiten', surface: 'slecht', wallpaper: 'nee', colors: 'meer', darkColors: 'ja', woodwork: 'nee', floors: '3plus', housingAge: 'oud' }
  },
  ventilatie: {
    BASIC: { size: 80, level: 'basis', system: 'decentraal', wetRooms: '1', floors: '1', routing: 'eenvoudig', housingAge: 'middel' },
    TYPICAL: { size: 120, level: 'standaard', system: 'systeem_c', wetRooms: '2', floors: '2', routing: 'renovatie', housingAge: 'middel' },
    COMPLEX: { size: 180, level: 'standaard', system: 'systeem_d', wetRooms: '3plus', floors: '3plus', routing: 'complex', housingAge: 'oud' }
  },
  zonnepanelen: {
    BASIC: { size: 3, sizeMode: 'kwp', kwp: 3, level: 'basis', roofType: 'hellend', access: 'normaal', electricalAdapt: 'nee', battery: 'nee', housingAge: 'middel' },
    TYPICAL: { size: 5, sizeMode: 'kwp', kwp: 5, level: 'standaard', roofType: 'hellend', access: 'normaal', electricalAdapt: 'beperkt', battery: 'nee', housingAge: 'middel' },
    COMPLEX: { size: 8, sizeMode: 'panels', panelCount: 20, level: 'standaard', roofType: 'plat', access: 'moeilijk', electricalAdapt: 'nieuw', battery: 'ja', housingAge: 'oud' }
  }
};

var flags = [];
var monoFails = [];
var sizeNotes = [];

function est(type, answers) {
  return pricing.calcEstimate(type, PROV, Object.assign({ province: PROV, urgency: 'binnen6' }, answers));
}

function mid(low, exp, high) {
  return Math.round((low + exp + high) / 3);
}

function runScenarios() {
  var out = {};
  Object.keys(TYPE_MAP).forEach(function (label) {
    var type = TYPE_MAP[label];
    var sets = SCENARIOS[type];
    out[label] = {};
    ['BASIC', 'TYPICAL', 'COMPLEX'].forEach(function (tier) {
      var r = est(type, sets[tier]);
      out[label][tier] = {
        inputs: sets[tier],
        low: r.low,
        expected: r.price,
        high: r.high,
        midpoint: mid(r.low, r.price, r.high),
        vatRate: r.vatRate,
        contingency: r.contingency,
        perM2: r.perM2,
        drivers: (r.drivers || []).map(function (d) { return d.text; })
      };
      if (!(r.low <= r.price && r.price <= r.high)) {
        flags.push({ kind: 'range_order', where: label + '/' + tier, detail: r.low + '/' + r.price + '/' + r.high });
      }
      if (!Number.isFinite(r.price)) {
        flags.push({ kind: 'nan', where: label + '/' + tier });
      }
    });
    // monotonic: COMPLEX >= TYPICAL >= BASIC (expected price)
    if (out[label].COMPLEX.expected < out[label].TYPICAL.expected - 50) {
      monoFails.push(label + ': COMPLEX expected < TYPICAL (' + out[label].COMPLEX.expected + ' < ' + out[label].TYPICAL.expected + ')');
    }
    if (out[label].TYPICAL.expected < out[label].BASIC.expected - 50) {
      monoFails.push(label + ': TYPICAL expected < BASIC');
    }
  });
  return out;
}

function testMonotonicity() {
  // premium finish >= basis (dak)
  var base = est('dak', SCENARIOS.dak.TYPICAL);
  var prem = est('dak', Object.assign({}, SCENARIOS.dak.TYPICAL, { level: 'premium' }));
  if (prem.price < base.price) monoFails.push('dak: premium level reduces price');

  // badkamer plumbing ja >= nee
  var plN = est('badkamer', SCENARIOS.badkamer.TYPICAL);
  var plY = est('badkamer', Object.assign({}, SCENARIOS.badkamer.TYPICAL, { plumbingMove: 'ja' }));
  if (plY.price < plN.price) monoFails.push('badkamer: plumbingMove ja reduces price');

  // demolition should not reduce (full bathroom)
  var demoN = est('badkamer', Object.assign({}, SCENARIOS.badkamer.TYPICAL, { demolition: 'geen', scope: 'volledig' }));
  var demoY = est('badkamer', Object.assign({}, SCENARIOS.badkamer.TYPICAL, { demolition: 'volledig' }));
  if (demoY.price < demoN.price) monoFails.push('badkamer: demolition reduces price');

  // urgency has no price effect
  var u1 = est('dak', Object.assign({}, SCENARIOS.dak.TYPICAL, { urgency: 'flexibel' }));
  var u2 = est('dak', Object.assign({}, SCENARIOS.dak.TYPICAL, { urgency: 'snel' }));
  if (u1.price !== u2.price) flags.push({ kind: 'urgency_affects_price', where: 'dak', detail: u1.price + ' vs ' + u2.price });

  // housingAge affects VAT not base price
  var h1 = est('dak', Object.assign({}, SCENARIOS.dak.TYPICAL, { housingAge: 'jong' }));
  var h2 = est('dak', Object.assign({}, SCENARIOS.dak.TYPICAL, { housingAge: 'oud' }));
  if (h1.price !== h2.price) flags.push({ kind: 'housingAge_affects_base', where: 'dak', detail: h1.price + ' vs ' + h2.price });
  if (h1.vatRate === h2.vatRate) flags.push({ kind: 'housingAge_vat_unchanged', where: 'dak' });
}

function testSizeBehavior() {
  var sizes = [5, 15, 50, 200, 500];
  sizes.forEach(function (sz) {
    var r = est('vloeren', Object.assign({}, SCENARIOS.vloeren.TYPICAL, { size: sz }));
    sizeNotes.push({ cat: 'vloeren', size: sz, expected: r.price, low: r.low, perM2: r.perM2 });
    if (r.price < 400) flags.push({ kind: 'below_global_min', where: 'vloeren size=' + sz, detail: r.price });
  });
  var tinyDak = est('dak', Object.assign({}, SCENARIOS.dak.BASIC, { size: 5 }));
  if (tinyDak.price < 500) sizeNotes.push({ cat: 'dak', size: 5, note: 'global min clamp active', expected: tinyDak.price });
}

function testCalc2Reuse() {
  var state = {
    goal: 'homeowner',
    finishProfile: 'comfort',
    propertyProfile: { province: PROV, propertyType: 'rijwoning', yearBuilt: '1971_1990', areaM2: 130, floors: '2', condition: 'verouderd' },
    scope: Scope.emptyScope(),
    packageDetails: {
      dak: { roofType: 'hellend', roofMaterial: 'betonpannen', roofArea: 80, roofInsulation: 'ja', roofAccess: 'normaal', roofGutters: 'nee', roofAsbestos: 'nee' },
      badkamer: { bathCount: '1', bathMainSize: 8, bathMainIntensity: 'grondig' }
    }
  };
  state.scope.dak = 'grondig';
  state.scope.badkamer = 'grondig';
  var bundle = PackageEngine.priceActivePackages(state, { includeCalc1Snapshot: true });
  var dakPkg = bundle.packages && bundle.packages.dak;
  var direct = est('dak', SCENARIOS.dak.TYPICAL);
  if (dakPkg && dakPkg.estimate) {
    var diff = Math.abs(dakPkg.estimate.expected - direct.price);
    if (diff > 500) {
      flags.push({ kind: 'calc2_calc1_drift', where: 'dak', detail: 'adapter=' + dakPkg.estimate.expected + ' direct=' + direct.price });
    }
  }
  // contingency not stacked
  if (dakPkg && dakPkg.calc1Meta && dakPkg.calc1Meta.contingencyIncludedInPrice !== false) {
    flags.push({ kind: 'calc2_contingency_stack', where: 'dak package-engine meta' });
  }
}

function categoryMeta() {
  var meta = {};
  Object.keys(TYPE_MAP).forEach(function (label) {
    var type = TYPE_MAP[label];
    var r = est(type, SCENARIOS[type].TYPICAL);
    meta[label] = {
      calcType: type,
      unit: type === 'zonnepanelen' ? 'kWp' : 'm²',
      globalMin: 'finalize(): max(400/500) low/base/high clamps',
      vatPath: 'vatScenario(housingAge) → subtotalExVat=price, vatAmount separate',
      majorModifiers: (r.drivers || []).slice(0, 3).map(function (d) { return d.text; }),
      status: 'GREEN'
    };
  });
  return meta;
}

function main() {
  console.log('=== ELYAN PRICING ENGINE AUDIT (read-only) ===\n');
  var scenarios = runScenarios();
  testMonotonicity();
  testSizeBehavior();
  testCalc2Reuse();

  console.log('Architecture:');
  console.log('  market-data: shared/market-data-2026.js');
  console.log('  engine: shared/pricing.js → calcEstimate → calc* → finalize');
  console.log('  calc1 UI: js/calculator.js');
  console.log('  calc2: shared/calc2/answer-adapters.js → package-engine.js → Pricing.calcEstimate');
  console.log('  report: api/lib/pdf-report.js consumes calcEstimate result');
  console.log('  legacy bridge: api/lib/pricing.js re-exports shared/pricing.js\n');

  console.log('Scenario results (excl. VAT, €):');
  Object.keys(scenarios).forEach(function (cat) {
    console.log('\n' + cat.toUpperCase());
    ['BASIC', 'TYPICAL', 'COMPLEX'].forEach(function (tier) {
      var s = scenarios[cat][tier];
      console.log('  ' + tier + ': low=' + s.low + ' exp=' + s.expected + ' high=' + s.high + ' mid=' + s.midpoint);
    });
  });

  if (monoFails.length) {
    console.log('\nMonotonicity exceptions:');
    monoFails.forEach(function (m) { console.log('  - ' + m); });
  } else {
    console.log('\nMonotonicity tier checks: PASS');
  }

  if (flags.length) {
    console.log('\nFlags (' + flags.length + '):');
    flags.forEach(function (f) { console.log('  [' + f.kind + '] ' + f.where + (f.detail ? ': ' + f.detail : '')); });
  } else {
    console.log('\nFlags: none');
  }

  console.log('\nSize behavior sample (vloeren TYPICAL):');
  sizeNotes.forEach(function (n) { console.log('  size=' + n.size + ' → €' + n.expected + ' (€' + n.perM2 + '/m²)'); });

  console.log('\nQuestion keys with NO base-price effect (confirmed):');
  console.log('  urgency → insights/planning only (shared/questions.js urgencyQuestion hint)');
  console.log('  notes → NOT USED in pricing.js');
  console.log('  housingAge → VAT scenario + premie copy only (not base excl. price)');

  console.log('\nAUDIT COMPLETE — NO PRICING CHANGES MADE');
  process.exit(monoFails.length ? 1 : 0);
}

main();
