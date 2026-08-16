'use strict';
/**
 * Phase B Sprint 4 — P3 Ambacht offline checks (Category Intelligence).
 * Run: node scripts/phase-b-sprint4-check.js
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

test('CI loads 12 categories via PartnerOnboardingEngine', function () {
  var cats = Draft.listCategories();
  assert.strictEqual(cats.length, 12);
  assert.strictEqual(Object.keys(CI.CATEGORIES).length, 12);
  [
    'dakwerken',
    'badkamer',
    'keuken',
    'ramen-deuren',
    'isolatie',
    'verwarming',
    'elektriciteit',
    'gevel',
    'vloeren',
    'schilderwerken',
    'ventilatie',
    'zonnepanelen'
  ].forEach(function (id) {
    assert.ok(Draft.getCategory(id), id);
  });
});

test('services per category come from CI only', function () {
  var dak = Draft.getServices('dakwerken');
  assert.ok(dak.length >= 8);
  assert.ok(dak.some(function (s) { return s.id === 'hellend'; }));
  var elec = Draft.getServices('elektriciteit');
  assert.ok(elec.some(function (s) { return s.id === 'laadpaal'; }));
  assert.deepStrictEqual(
    Draft.getServices('nope'),
    []
  );
});

test('conditionals show only for selected services', function () {
  var none = Draft.getConditionalsForSelected('dakwerken', ['volledig']);
  assert.strictEqual(none.length, 0);
  var hellend = Draft.getConditionalsForSelected('dakwerken', ['hellend']);
  assert.ok(hellend.some(function (q) { return q.key === 'hellendCovering'; }));
  var both = Draft.getConditionalsForSelected('dakwerken', ['hellend', 'plat']);
  assert.ok(both.some(function (q) { return q.key === 'hellendCovering'; }));
  assert.ok(both.some(function (q) { return q.key === 'platSystems'; }));
});

test('onboard extras include info-only items that are not stored', function () {
  var extras = Draft.getOnboardExtras('elektriciteit');
  assert.ok(extras.some(function (q) { return q.type === 'info' && q.key === 'noteKeuring'; }));
  var bad = Draft.sanitizeCraft({
    primary_category_id: 'elektriciteit',
    service_ids: ['kast'],
    conditionals: {},
    extras: { noteKeuring: 'should not store' }
  });
  assert.ok(!bad.ok, 'info key must be rejected');

  var okEx = Draft.sanitizeCraft({
    primary_category_id: 'elektriciteit',
    service_ids: ['kast'],
    conditionals: {},
    extras: { scope: ['Bord vernieuwen'] }
  });
  assert.ok(okEx.ok);
  assert.ok(!Object.prototype.hasOwnProperty.call(okEx.craft.extras, 'noteKeuring'));
});

test('sanitizeCraft rejects unknown category/service/conditional keys', function () {
  assert.ok(!Draft.sanitizeCraft({ primary_category_id: 'astronaut' }).ok);
  assert.ok(!Draft.sanitizeCraft({
    primary_category_id: 'dakwerken',
    service_ids: ['not-a-service']
  }).ok);
  assert.ok(!Draft.sanitizeCraft({
    primary_category_id: 'dakwerken',
    service_ids: ['volledig'],
    conditionals: { hellendCovering: ['Keramische dakpannen'] }
  }).ok);
  assert.ok(Draft.sanitizeCraft({
    primary_category_id: 'dakwerken',
    service_ids: ['hellend'],
    conditionals: { hellendCovering: ['Keramische dakpannen'] },
    extras: { projectTypes: ['Kleine herstellingen'], minProject: 8500 }
  }).ok);
});

test('validateP3Complete requires category, ≥1 service, visible requireds', function () {
  var empty = Draft.validateP3Complete({});
  assert.ok(!empty.ok);
  assert.ok(empty.errors.primary_category_id);

  var noSvc = Draft.validateP3Complete({
    craft: { primary_category_id: 'dakwerken', service_ids: [] }
  });
  assert.ok(!noSvc.ok);
  assert.ok(noSvc.errors.service_ids);

  var missingCond = Draft.validateP3Complete({
    craft: {
      primary_category_id: 'dakwerken',
      service_ids: ['hellend'],
      conditionals: {},
      extras: { projectTypes: ['Kleine herstellingen'] }
    }
  });
  assert.ok(!missingCond.ok);
  assert.ok(missingCond.errors.cond_hellendCovering);

  var full = Draft.validateP3Complete({
    craft: {
      primary_category_id: 'dakwerken',
      service_ids: ['hellend'],
      conditionals: { hellendCovering: ['Keramische dakpannen'] },
      extras: { projectTypes: ['Kleine herstellingen'] }
    }
  });
  assert.ok(full.ok, JSON.stringify(full.errors));
});

test('category reset clears only category-dependent P3 data', function () {
  var before = {
    primary_category_id: 'dakwerken',
    service_ids: ['hellend'],
    conditionals: { hellendCovering: ['Keramische dakpannen'] },
    extras: { projectTypes: ['Kleine herstellingen'] }
  };
  assert.ok(Draft.hasCategoryDependentP3Data(before));
  var reset = Draft.resetCraftForCategoryChange('badkamer');
  assert.strictEqual(reset.primary_category_id, 'badkamer');
  assert.deepStrictEqual(reset.service_ids, []);
  assert.deepStrictEqual(reset.conditionals, {});
  assert.deepStrictEqual(reset.extras, {});

  var company = { legal_name: 'Demo BV' };
  var area = { mode: 'radius', radius_km: 20 };
  var merged = model.mergeDraft(
    { company: company, service_area: area, craft: before },
    { craft: reset }
  );
  assert.strictEqual(merged.company.legal_name, 'Demo BV');
  assert.strictEqual(merged.service_area.mode, 'radius');
  assert.strictEqual(merged.craft.primary_category_id, 'badkamer');
  assert.deepStrictEqual(merged.craft.service_ids, []);
  assert.deepStrictEqual(merged.craft.conditionals, {});
});

test('server validateDraftStructure enforces CI craft rules', function () {
  assert.ok(model.validateDraftStructure({ craft: { primary_category_id: 'dakwerken' } }).ok);
  assert.ok(!model.validateDraftStructure({ craft: { primary_category_id: 'nope' } }).ok);
  assert.ok(!model.validateDraftStructure({
    craft: { primary_category_id: 'dakwerken', service_ids: ['xyz'] }
  }).ok);
  var okPatch = model.validateDraftStructure({
    craft: {
      primary_category_id: 'keuken',
      service_ids: ['nieuw'],
      conditionals: {},
      extras: { businessType: 'Maatwerk', design: ['Showroom'] }
    }
  });
  assert.ok(okPatch.ok);
});

test('shell routing P2→P3→P4 unchanged', function () {
  assert.strictEqual(Shell.nextStepId('bedrijf_bereik'), 'ambacht');
  assert.strictEqual(Shell.nextStepId('ambacht'), 'aanbod');
  assert.strictEqual(Shell.prevStepId('ambacht'), 'bedrijf_bereik');
});

test('onboarding HTML/JS wires P3 Ambacht + CI script', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
  assert.ok(html.indexOf('shared/vakmannen/intelligence.js') >= 0);
  assert.ok(html.indexOf('id="p3Form"') >= 0);
  assert.ok(html.indexOf('id="categoryGrid"') >= 0);
  assert.ok(html.indexOf('id="servicesGrid"') >= 0);
  assert.ok(html.indexOf('id="conditionalsHost"') >= 0);
  assert.ok(html.indexOf('id="extrasHost"') >= 0);
  assert.ok(html.indexOf('data-step="aanbod"') >= 0);
  assert.ok(html.indexOf('type="file"') < 0);
  assert.ok(html.indexOf('google_intent') < 0);

  var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('collectP3Draft') >= 0);
  assert.ok(src.indexOf('validateP3Complete') >= 0);
  assert.ok(src.indexOf('resetCraftForCategoryChange') >= 0);
  assert.ok(src.indexOf('hasCategoryDependentP3Data') >= 0);
  assert.ok(src.indexOf('scheduleAutosave') >= 0);
  assert.ok(src.indexOf('canEdit') >= 0);
});

test('role matrix unchanged', function () {
  assert.ok(model.canEditRole('owner'));
  assert.ok(model.canEditRole('admin'));
  assert.ok(!model.canEditRole('member'));
  assert.ok(model.canReadRole('member'));
});

test('no service_role leakage in sprint 4 browser bundles', function () {
  ['onboarding.js', 'onboarding-shell.js', 'onboarding-draft.js', 'core.js'].forEach(function (f) {
    var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
    assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
    assert.ok(t.indexOf('service_role') < 0, f);
  });
});

test('Sprint 1–3 markers still present (compat)', function () {
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/onboarding-shell.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/onboarding.js')));
  var api = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  assert.ok(api.indexOf('onboarding-save') >= 0);
  assert.ok(api.indexOf('requirePartnerContext') >= 0);
});

console.log('');
if (failed) {
  console.error(failed + ' Phase B Sprint 4 check(s) failed');
  process.exit(1);
}
console.log('All Phase B Sprint 4 offline checks passed');
