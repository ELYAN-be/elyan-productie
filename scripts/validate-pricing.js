#!/usr/bin/env node
/* ============================================================
   ELYAN — Pricing validation (25+ scenarios)
   node scripts/validate-pricing.js
   ============================================================ */
var pricing = require('../shared/pricing');

var SCENARIOS = {
  dak: [
    { name: 'klein/basic', answers: { size: 40, level: 'basis', roofType: 'hellend', workType: 'herstelling', material: 'pannen', insulation: 'nee', gutters: 'nee', access: 'vlot', housingAge: 'middel', asbestos: 'nee' } },
    { name: 'gemiddeld', answers: { size: 80, level: 'standaard', roofType: 'hellend', workType: 'vernieuwen', material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal', housingAge: 'middel', asbestos: 'nee' } },
    { name: 'volledig standaard', answers: { size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig', material: 'pannen', insulation: 'ja', gutters: 'nee', access: 'normaal', housingAge: 'middel', asbestos: 'nee' } },
    { name: 'premium', answers: { size: 120, level: 'premium', roofType: 'hellend', workType: 'volledig', material: 'leien', insulation: 'ja', gutters: 'ja', access: 'normaal', housingAge: 'oud', asbestos: 'nee' } },
    { name: 'complex', answers: { size: 100, level: 'standaard', roofType: 'hellend', workType: 'volledig', material: 'pannen', insulation: 'ja', gutters: 'ja', access: 'moeilijk', housingAge: 'oud', asbestos: 'ja' } }
  ],
  badkamer: [
    { name: 'klein/basic', answers: { size: 4, level: 'basis', scope: 'opfrissing', sanitary: 'behouden', tiling: 'schilder', plumbingMove: 'nee', ventilation: 'goed', ufh: 'nee', demolition: 'geen', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 6, level: 'standaard', scope: 'gedeeltelijk', sanitary: 'douche', tiling: 'gedeeltelijk', plumbingMove: 'nee', ventilation: 'goed', ufh: 'nee', demolition: 'beperkt', housingAge: 'middel' } },
    { name: 'volledig standaard', answers: { size: 8, level: 'standaard', scope: 'volledig', sanitary: 'douche', tiling: 'volledig', plumbingMove: 'beperkt', ventilation: 'goed', ufh: 'nee', demolition: 'volledig', housingAge: 'middel' } },
    { name: 'premium', answers: { size: 10, level: 'premium', scope: 'volledig', sanitary: 'beide', tiling: 'volledig', plumbingMove: 'ja', ventilation: 'verbeteren', ufh: 'ja', demolition: 'volledig', housingAge: 'oud' } },
    { name: 'complex', answers: { size: 8, level: 'standaard', scope: 'volledig', sanitary: 'beide', tiling: 'volledig', plumbingMove: 'ja', ventilation: 'onbekend', ufh: 'ja', demolition: 'volledig', housingAge: 'oud' } }
  ],
  keuken: [
    { name: 'klein/basic', answers: { size: 8, level: 'basis', scope: 'fronten', cabinets: 'budget', appliances: 'nee', worktop: 'laminaat', connections: 'nee', splashback: 'nee', flooring: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 10, level: 'standaard', scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee', housingAge: 'middel' } },
    { name: 'volledig standaard', answers: { size: 12, level: 'standaard', scope: 'vervangen', cabinets: 'midden', appliances: 'basis', worktop: 'composiet', connections: 'nee', splashback: 'ja', flooring: 'nee', housingAge: 'middel' } },
    { name: 'premium', answers: { size: 16, level: 'premium', scope: 'herindelen', cabinets: 'hoog', appliances: 'uitgebreid', worktop: 'natuursteen', connections: 'ja', splashback: 'ja', flooring: 'ja', housingAge: 'oud' } },
    { name: 'complex', answers: { size: 14, level: 'standaard', scope: 'herindelen', cabinets: 'midden', appliances: 'uitgebreid', worktop: 'composiet', connections: 'ja', splashback: 'ja', flooring: 'ja', housingAge: 'oud' } }
  ],
  vloeren: [
    { name: 'klein/basic', answers: { size: 15, level: 'basis', floorMaterial: 'laminaat', rooms: '1', removal: 'nee', substrate: 'goed', ufh: 'nee', wetRooms: 'nee', skirting: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 30, level: 'standaard', floorMaterial: 'laminaat', rooms: '2-3', removal: 'nee', substrate: 'matig', leveling: 'beperkt', ufh: 'nee', wetRooms: 'nee', skirting: 'ja', housingAge: 'middel' } },
    { name: 'volledig standaard', answers: { size: 50, level: 'standaard', floorMaterial: 'tegel', rooms: '2-3', removal: 'ja', substrate: 'matig', leveling: 'beperkt', ufh: 'nee', wetRooms: 'nee', skirting: 'ja', housingAge: 'middel' } },
    { name: 'premium', answers: { size: 60, level: 'premium', floorMaterial: 'parket', rooms: 'meer', removal: 'ja', substrate: 'goed', ufh: 'bestaand', wetRooms: 'nee', skirting: 'ja', housingAge: 'oud' } },
    { name: 'complex', answers: { size: 50, level: 'standaard', floorMaterial: 'tegel', rooms: 'meer', removal: 'ja', substrate: 'slecht', leveling: 'volledig', ufh: 'nieuw', wetRooms: 'ja', skirting: 'ja', housingAge: 'oud' } }
  ],
  schilderwerken: [
    { name: 'klein/basic', answers: { size: 30, level: 'basis', paintScope: 'binnen', surface: 'goed', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 60, level: 'standaard', paintScope: 'binnen', surface: 'matig', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'beperkt', housingAge: 'middel' } },
    { name: 'volledig standaard', answers: { size: 100, level: 'standaard', paintScope: 'binnen', surface: 'matig', wallpaper: 'nee', colors: '1', darkColors: 'nee', woodwork: 'nee', housingAge: 'middel' } },
    { name: 'premium', answers: { size: 120, level: 'premium', paintScope: 'beide', surface: 'goed', wallpaper: 'nee', colors: '2-3', darkColors: 'ja', woodwork: 'uitgebreid', floors: '2', housingAge: 'oud' } },
    { name: 'complex', answers: { size: 100, level: 'standaard', paintScope: 'buiten', surface: 'slecht', wallpaper: 'nee', colors: 'meer', darkColors: 'ja', woodwork: 'nee', floors: '3plus', housingAge: 'oud' } }
  ],
  ramen: [
    { name: 'klein/basic', answers: { size: 8, level: 'basis', frame: 'pvc', glazing: 'hr', sliding: 'nee', doors: '0', removal: 'nee', access: 'normaal', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 15, level: 'standaard', frame: 'pvc', glazing: 'hr++', sliding: 'nee', doors: '1', removal: 'ja', access: 'normaal', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 25, level: 'standaard', frame: 'aluminium', glazing: 'hr+++', sliding: 'groot', doors: '2plus', removal: 'ja', access: 'moeilijk', housingAge: 'oud' } }
  ],
  isolatie: [
    { name: 'klein/basic', answers: { size: 40, level: 'basis', subtype: 'spouw', performance: 'standaard', access: 'normaal', prep: 'beperkt', finish: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 80, level: 'standaard', subtype: 'dak_binnen', performance: 'standaard', access: 'normaal', prep: 'beperkt', finish: 'beperkt', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 120, level: 'standaard', subtype: 'buitenmuur', performance: 'hoog', access: 'moeilijk', prep: 'uitgebreid', finish: 'hoog', housingAge: 'oud' } }
  ],
  verwarming: [
    { name: 'klein/basic', answers: { size: 90, level: 'basis', projectType: 'ketel_vervangen', insulationLevel: 'matig', distribution: 'radiatoren', dhw: 'behouden', replaceVsNew: 'vervangen', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 120, level: 'standaard', projectType: 'hybride', insulationLevel: 'matig', distribution: 'gemengd', dhw: 'nieuw', replaceVsNew: 'vervangen', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 160, level: 'standaard', projectType: 'lucht_water', insulationLevel: 'slecht', distribution: 'vloer', dhw: 'nieuw', replaceVsNew: 'nieuw', housingAge: 'oud' } }
  ],
  elektriciteit: [
    { name: 'klein/basic', answers: { size: 70, level: 'basis', scope: 'partieel', floors: '1', board: 'behouden', fitOut: 'basis', inspection: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 110, level: 'standaard', scope: 'volledig', floors: '2', board: 'nieuw', fitOut: 'standaard', inspection: 'ja', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 160, level: 'standaard', scope: 'renovatie_volledig', floors: '3plus', board: 'nieuw', fitOut: 'uitgebreid', inspection: 'ja', housingAge: 'oud' } }
  ],
  gevel: [
    { name: 'klein/basic', answers: { size: 40, level: 'basis', intervention: 'reinigen', condition: 'goed', elevations: '1', scaffold: 'laag', finish: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 90, level: 'standaard', intervention: 'crepi', condition: 'matig', elevations: '2', scaffold: 'middel', finish: 'basis', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 140, level: 'standaard', intervention: 'isolatie_afwerking', condition: 'slecht', elevations: '3plus', scaffold: 'hoog', finish: 'premium', housingAge: 'oud' } }
  ],
  zonnepanelen: [
    { name: 'klein/basic', answers: { size: 3, sizeMode: 'kwp', kwp: 3, level: 'basis', roofType: 'hellend', access: 'normaal', electricalAdapt: 'nee', battery: 'nee', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 5, sizeMode: 'kwp', kwp: 5, level: 'standaard', roofType: 'hellend', access: 'normaal', electricalAdapt: 'beperkt', battery: 'nee', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 8, sizeMode: 'panels', panelCount: 20, level: 'standaard', roofType: 'plat', access: 'moeilijk', electricalAdapt: 'nieuw', battery: 'ja', housingAge: 'oud' } }
  ],
  ventilatie: [
    { name: 'klein/basic', answers: { size: 80, level: 'basis', system: 'decentraal', wetRooms: '1', floors: '1', routing: 'eenvoudig', housingAge: 'middel' } },
    { name: 'gemiddeld', answers: { size: 120, level: 'standaard', system: 'systeem_c', wetRooms: '2', floors: '2', routing: 'renovatie', housingAge: 'middel' } },
    { name: 'complex', answers: { size: 180, level: 'standaard', system: 'systeem_d', wetRooms: '3plus', floors: '3plus', routing: 'complex', housingAge: 'oud' } }
  ]
};

var PROV = 'oost-vlaanderen';
var errors = [];
var warnings = [];
var count = 0;

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

Object.keys(SCENARIOS).forEach(function (type) {
  SCENARIOS[type].forEach(function (sc) {
    count++;
    var answers = Object.assign({ province: PROV, urgency: 'binnen6' }, sc.answers);
    var r;
    try {
      r = pricing.calcEstimate(type, PROV, answers);
    } catch (e) {
      fail(type + '/' + sc.name + ': throw ' + e.message);
      return;
    }

    var tag = type + '/' + sc.name;
    if (!Number.isFinite(r.price) || !Number.isFinite(r.low) || !Number.isFinite(r.high)) fail(tag + ': NaN/Infinity in prices');
    if (r.price < 0 || r.low < 0 || r.high < 0) fail(tag + ': negative price');
    if (!(r.low <= r.price && r.price <= r.high)) fail(tag + ': low<=expected<=high failed (' + r.low + ',' + r.price + ',' + r.high + ')');

    var a = r.amounts || {};
    var sum = (a.materiaal || 0) + (a.arbeid || 0) + (a.overige || 0);
    if (Math.abs(sum - r.price) > 150) fail(tag + ': material+labour+other != price (' + sum + ' vs ' + r.price + ')');

    var lineSum = 0;
    (r.costBreakdown || []).forEach(function (it) { lineSum += it.amount || 0; });
    if (r.costBreakdown && r.costBreakdown.length && Math.abs(lineSum - r.price) > 200) {
      warn(tag + ': line items sum ' + lineSum + ' vs price ' + r.price);
    }

    var vatExpected = Math.round((r.subtotalExVat || r.price) * (r.vatRate || 0) / 50) * 50;
    if (Math.abs((r.vatAmount || 0) - vatExpected) > 100) warn(tag + ': vat arithmetic soft mismatch');
    if (Math.abs((r.totalInclVat || 0) - ((r.subtotalExVat || 0) + (r.vatAmount || 0))) > 50) fail(tag + ': incl vat mismatch');

    if ((a.arbeid || 0) > 0 && !(r.labourHours > 0)) fail(tag + ': labour amount without manuren');
    if (r.labourHours > 0) {
      if (!(r.crewSize >= 1)) fail(tag + ': invalid crew');
      var expectedDays = Math.ceil(r.labourHours / (r.crewSize * 6.5));
      if (Math.abs((r.workDays || 0) - expectedDays) > 2) warn(tag + ': workDays ' + r.workDays + ' vs expected ~' + expectedDays);
    }

    if (r.perM2 <= 0) fail(tag + ': invalid €/m²');

    // Sanity ratios
    if (type === 'dak' && sc.name.indexOf('volledig') !== -1 && r.price > 15000 && (a.arbeid || 0) < 2000) {
      fail(tag + ': full roof with almost no labour');
    }
    if (type === 'badkamer' && sc.name.indexOf('volledig') !== -1 && (a.arbeid || 0) < 2500) {
      fail(tag + ': full bathroom should have thousands in labour');
    }
    if (type === 'schilderwerken' && (a.materiaal || 0) > (a.arbeid || 0) * 1.5 && r.size >= 50) {
      warn(tag + ': paint material unusually high vs labour');
    }

    // Giant unexplained bucket
    (r.costBreakdown || []).forEach(function (it) {
      if (it.amount > r.price * 0.75 && (r.costBreakdown || []).length > 3) {
        warn(tag + ': single package dominates (>75%): ' + it.label);
      }
    });
  });
});

console.log('Validated', count, 'scenarios');
console.log('Errors:', errors.length);
errors.forEach(function (e) { console.log('  ERROR', e); });
console.log('Warnings:', warnings.length);
warnings.forEach(function (w) { console.log('  WARN', w); });
process.exit(errors.length ? 1 : 0);
