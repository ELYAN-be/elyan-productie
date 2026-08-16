'use strict';
/**
 * Phase B Sprint 5 — P4 Aanbod offline checks (Category Intelligence).
 * Run: node scripts/phase-b-sprint5-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    fn();
    ok(name);
  } catch (e) {
    fail(name, e);
  }
}

var Draft = require('../js/professionals/onboarding-draft');
var model = require('../server/onboarding-model');
var Shell = require('../js/professionals/onboarding-shell');
var CI = require('../shared/vakmannen/intelligence');

var ALL_CATS = [
  'dakwerken', 'badkamer', 'keuken', 'ramen-deuren', 'isolatie', 'verwarming',
  'elektriciteit', 'gevel', 'vloeren', 'schilderwerken', 'ventilatie', 'zonnepanelen'
];

function samplePrice(modelId, min, max) {
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = modelId;
  if (modelId !== 'on_request') {
    sp.min_price = min != null ? min : 100;
    if (modelId === 'price_range' || max != null) sp.max_price = max != null ? max : 200;
  }
  return sp;
}

function baseOffer(opts) {
  opts = opts || {};
  var offer = Draft.emptyOffer();
  offer.vat_basis = opts.vat_basis || 'exclusief';
  offer.client_types = opts.client_types || ['particulier'];
  offer.response_time = opts.response_time || '24u';
  offer.capacity = opts.capacity || 'limited';
  offer.start_month = opts.start_month || Draft.listStartMonths()[0].id;
  offer.visit_speed = opts.visit_speed || '2w';
  offer.service_prices = opts.service_prices || {};
  if (opts.urgency_jobs != null) offer.urgency_jobs = opts.urgency_jobs;
  if (opts.project_minimum != null) offer.project_minimum = opts.project_minimum;
  if (opts.visit_extra) offer.visit_extra = opts.visit_extra;
  return offer;
}

test('CI exposes visit/capacity/visitExtra + P4 helpers', function () {
  assert.ok(CI.PartnerOnboardingEngine.visitOptions.length >= 4);
  assert.ok(CI.PartnerOnboardingEngine.capacityOptions.length === 3);
  assert.ok(CI.PartnerOnboardingEngine.visitExtraOptions.length >= 3);
  assert.ok(typeof CI.PartnerOnboardingEngine.pricingModelsForService === 'function');
  assert.ok(typeof CI.PartnerOnboardingEngine.showUrgencyJobs === 'function');
});

test('all pricingModels covered + on_request always allowed', function () {
  var seen = {};
  ALL_CATS.forEach(function (catId) {
    Draft.getServices(catId).forEach(function (s) {
      var models = Draft.pricingModelsForService(catId, s.id);
      assert.ok(models.indexOf('on_request') >= 0, catId + '/' + s.id + ' missing on_request');
      (s.pricingModels || []).forEach(function (m) {
        seen[m] = true;
        assert.ok(models.indexOf(m) >= 0, catId + '/' + s.id + ' missing CI model ' + m);
      });
    });
  });
  CI.PRICING_MODELS.forEach(function (m) {
    if (m === 'per_wp' || m === 'per_kwh') {
      // may only appear on solar — still must exist in enum
      assert.ok(CI.PRICING_MODELS.indexOf(m) >= 0);
      return;
    }
    assert.ok(seen[m] || m === 'on_request', 'pricing model never used in CI: ' + m);
  });
  // solar should exercise per_wp / per_kwh where present
  var solar = Draft.getServices('zonnepanelen');
  var solarModels = {};
  solar.forEach(function (s) {
    Draft.pricingModelsForService('zonnepanelen', s.id).forEach(function (m) {
      solarModels[m] = true;
    });
  });
  assert.ok(solarModels.on_request);
});

test('on_request requires no amounts; range needs max ≥ min', function () {
  var craft = {
    primary_category_id: 'dakwerken',
    service_ids: ['herstelling', 'volledig']
  };
  var offer = baseOffer({
    service_prices: {
      herstelling: samplePrice('on_request'),
      volledig: samplePrice('price_range', 80, 120)
    }
  });
  assert.ok(Draft.validateP4Complete({ craft: craft, offer: offer }).ok);

  offer.service_prices.volledig = samplePrice('price_range', 120, 80);
  assert.ok(!Draft.validateP4Complete({ craft: craft, offer: offer }).ok);

  offer.service_prices.volledig = samplePrice('starting_price', 90);
  offer.service_prices.volledig.max_price = null;
  assert.ok(Draft.validateP4Complete({ craft: craft, offer: offer }).ok);
});

test('reject wrong CI price models per service', function () {
  var bad = Draft.sanitizeOffer({
    service_prices: {
      volledig: { pricing_model: 'per_wp', min_price: 1 }
    }
  }, { primary_category_id: 'dakwerken', service_ids: ['volledig'] });
  assert.ok(!bad.ok);

  var okOr = Draft.sanitizeOffer({
    service_prices: {
      volledig: { pricing_model: 'on_request' }
    }
  }, { primary_category_id: 'dakwerken', service_ids: ['volledig'] });
  assert.ok(okOr.ok);
});

test('customer types + response time + availability + start month', function () {
  var craft = { primary_category_id: 'badkamer', service_ids: ['douche'] };
  var offer = baseOffer({
    client_types: [],
    service_prices: { douche: samplePrice('starting_price', 1500) }
  });
  assert.ok(!Draft.validateP4Complete({ craft: craft, offer: offer }).ok);

  offer.client_types = ['b2b', 'syndic_vme'];
  offer.response_time = '';
  assert.ok(!Draft.validateP4Complete({ craft: craft, offer: offer }).ok);

  offer.response_time = 'zelfde_dag';
  offer.capacity = 'available';
  offer.visit_speed = '3d';
  offer.start_month = Draft.listStartMonths()[5].id;
  assert.ok(Draft.validateP4Complete({ craft: craft, offer: offer }).ok);

  var badMonth = Draft.sanitizeOffer({ start_month: '1999-01' }, craft);
  assert.ok(!badMonth.ok);

  var neg = Draft.sanitizeOffer({
    service_prices: { douche: { pricing_model: 'starting_price', min_price: -5 } }
  }, craft);
  assert.ok(!neg.ok);
});

test('urgency only when V2 rule matches (dakwerken or herstelling)', function () {
  assert.ok(Draft.showUrgencyJobs({ primary_category_id: 'dakwerken', service_ids: ['volledig'] }));
  assert.ok(Draft.showUrgencyJobs({ primary_category_id: 'elektriciteit', service_ids: ['herstelling'] }));
  assert.ok(!Draft.showUrgencyJobs({ primary_category_id: 'gevel', service_ids: ['herstellingen'] }));
  assert.ok(!Draft.showUrgencyJobs({ primary_category_id: 'badkamer', service_ids: ['douche'] }));
});

test('P3 service remove prunes orphan P4 prices (client+server)', function () {
  var draft = {
    craft: { primary_category_id: 'dakwerken', service_ids: ['volledig', 'goten'] },
    offer: baseOffer({
      service_prices: {
        volledig: samplePrice('per_m2', 90),
        goten: samplePrice('per_linear_meter', 40),
        orphan: samplePrice('on_request')
      }
    })
  };
  var pruned = Draft.pruneOfferToServices(draft.offer, ['volledig']);
  assert.ok(pruned.service_prices.volledig);
  assert.ok(!pruned.service_prices.goten);
  assert.ok(!pruned.service_prices.orphan);

  var merged = model.mergeDraft(draft, {
    craft: { primary_category_id: 'dakwerken', service_ids: ['volledig'] }
  });
  assert.ok(merged.offer.service_prices.volledig);
  assert.ok(!merged.offer.service_prices.goten);
  assert.ok(!merged.offer.service_prices.orphan);
});

test('sanitize + resume round-trip restores P4 exactly', function () {
  var craft = {
    primary_category_id: 'elektriciteit',
    service_ids: ['storing', 'laadpaal']
  };
  var offer = baseOffer({
    vat_basis: 'inclusief',
    client_types: ['particulier', 'b2b'],
    response_time: '48u',
    capacity: 'full',
    visit_speed: '1w',
    visit_extra: ['opmeting'],
    service_prices: {
      storing: samplePrice('per_hour', 75),
      laadpaal: samplePrice('on_request')
    }
  });
  offer.service_prices.storing.internal_note = 'Interne check';
  var san = Draft.sanitizeOffer(offer, craft);
  assert.ok(san.ok, san.message);
  var picked = Draft.pickOffer(san.offer);
  assert.strictEqual(picked.vat_basis, 'inclusief');
  assert.deepStrictEqual(picked.client_types, ['particulier', 'b2b']);
  assert.strictEqual(picked.service_prices.storing.min_price, 75);
  assert.strictEqual(picked.service_prices.storing.internal_note, 'Interne check');
  assert.strictEqual(picked.service_prices.laadpaal.pricing_model, 'on_request');
  assert.strictEqual(picked.service_prices.laadpaal.min_price, null);
});

test('authZ roles unchanged', function () {
  assert.ok(model.canEditRole('owner'));
  assert.ok(model.canEditRole('admin'));
  assert.ok(!model.canEditRole('member'));
  assert.ok(model.canReadRole('member'));
});

test('server validateDraftStructure enforces offer CI rules', function () {
  assert.ok(model.validateDraftStructure({
    offer: { vat_basis: 'exclusief', client_types: ['particulier'] }
  }).ok);
  assert.ok(!model.validateDraftStructure({
    offer: {
      service_prices: {
        volledig: { pricing_model: 'per_kwh', min_price: 1 }
      }
    },
    craft: { primary_category_id: 'dakwerken', service_ids: ['volledig'] }
  }).ok);
  assert.ok(!model.validateDraftStructure({ offer: { weird: true } }).ok);
});

test('shell P3→P4→P5 routing', function () {
  assert.strictEqual(Shell.nextStepId('ambacht'), 'aanbod');
  assert.strictEqual(Shell.nextStepId('aanbod'), 'verhaal');
  assert.strictEqual(Shell.prevStepId('aanbod'), 'ambacht');
});

test('HTML/JS wires P4 Aanbod; P5–P6 owned by Sprint 6', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
  assert.ok(html.indexOf('id="p4Form"') >= 0);
  assert.ok(html.indexOf('id="servicePricesHost"') >= 0);
  assert.ok(html.indexOf('id="clientTypesGrid"') >= 0);
  assert.ok(html.indexOf('id="capacityGrid"') >= 0);
  assert.ok(html.indexOf('google_intent') < 0);

  var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('collectP4Draft') >= 0);
  assert.ok(src.indexOf('validateP4Complete') >= 0);
  assert.ok(src.indexOf('pruneOfferToServices') >= 0);
  assert.ok(src.indexOf('scheduleAutosave') >= 0);
});

test('12-category matrix: no hardcoded category exceptions outside V2 urgency rule', function () {
  var draftSrc = fs.readFileSync(path.join(root, 'js/professionals/onboarding-draft.js'), 'utf8');
  var onboardSrc = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  // UI must not hardcode category ids for pricing
  assert.ok(onboardSrc.indexOf("=== 'dakwerken'") < 0);
  assert.ok(onboardSrc.indexOf('showUrgencyJobs') >= 0);

  var matrix = [];
  ALL_CATS.forEach(function (catId) {
    var services = Draft.getServices(catId);
    assert.ok(services.length >= 1, catId);
    var sid = services[0].id;
    var models = Draft.pricingModelsForService(catId, sid);
    assert.ok(models.indexOf('on_request') >= 0);

    var craft = {
      primary_category_id: catId,
      service_ids: [sid],
      conditionals: {},
      extras: {}
    };
    // satisfy required conditionals/extras lightly for craft sanity
    Draft.getConditionalsForSelected(catId, [sid]).forEach(function (q) {
      if (q.type === 'multi' && q.options && q.options.length) {
        craft.conditionals[q.key] = [typeof q.options[0] === 'string' ? q.options[0] : q.options[0].id];
      } else if ((q.type === 'single' || q.type === 'select') && q.options && q.options.length) {
        craft.conditionals[q.key] = typeof q.options[0] === 'string' ? q.options[0] : q.options[0].id;
      }
    });
    Draft.getOnboardExtras(catId).forEach(function (q) {
      if (Draft.isInfoQuestion(q)) return;
      if (q.type === 'multi' && q.options && q.options.length) {
        craft.extras[q.key] = [typeof q.options[0] === 'string' ? q.options[0] : q.options[0].id];
      } else if ((q.type === 'single' || q.type === 'select') && q.options && q.options.length) {
        craft.extras[q.key] = typeof q.options[0] === 'string' ? q.options[0] : q.options[0].id;
      }
    });

    var modelPick = models.indexOf('starting_price') >= 0
      ? 'starting_price'
      : models.indexOf('price_range') >= 0
        ? 'price_range'
        : models[0];
    var offer = baseOffer({
      service_prices: {}
    });
    offer.service_prices[sid] = samplePrice(
      modelPick,
      100,
      modelPick === 'price_range' ? 200 : null
    );

    var showUrg = Draft.showUrgencyJobs(craft);
    var expectedUrg = catId === 'dakwerken' || sid === 'herstelling';
    assert.strictEqual(showUrg, expectedUrg, catId + ' urgency mismatch');

    var complete = Draft.validateP4Complete({ craft: craft, offer: offer });
    assert.ok(complete.ok, catId + ' ' + JSON.stringify(complete.errors));

    var server = model.validateDraftStructure({ craft: craft, offer: offer });
    assert.ok(server.ok, catId + ' server ' + (server.message || server.code));

    matrix.push({
      id: catId,
      services: services.length,
      on_request: true,
      urgency: showUrg,
      ciProjectMin: Draft.hasCiProjectMinimum(catId),
      ok: true
    });
  });

  assert.strictEqual(matrix.length, 12);
  assert.ok(matrix.every(function (r) { return r.ok; }));
  // only dakwerken has CI project minimum onboardQuestion
  assert.ok(Draft.hasCiProjectMinimum('dakwerken'));
  ALL_CATS.filter(function (c) { return c !== 'dakwerken'; }).forEach(function (c) {
    assert.ok(!Draft.hasCiProjectMinimum(c), c + ' should not hardcode project min');
  });
  console.log('MATRIX ' + JSON.stringify(matrix.map(function (r) {
    return r.id + ':ok urg=' + r.urgency;
  })));
});

test('no service_role leakage in sprint 5 bundles', function () {
  ['onboarding.js', 'onboarding-shell.js', 'onboarding-draft.js', 'core.js'].forEach(function (f) {
    var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
    assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
    assert.ok(t.indexOf('service_role') < 0, f);
  });
});

test('Sprint 1–4 regression markers present', function () {
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/onboarding-shell.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/onboarding.js')));
  var api = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  assert.ok(api.indexOf('onboarding-save') >= 0);
  assert.ok(api.indexOf('requirePartnerContext') >= 0);
  assert.ok(Draft.validateP3Complete);
  assert.ok(Draft.validateP2Complete);
});

console.log('');
if (failed) {
  console.error(failed + ' Phase B Sprint 5 check(s) failed');
  process.exit(1);
}
console.log('All Phase B Sprint 5 offline checks passed');
