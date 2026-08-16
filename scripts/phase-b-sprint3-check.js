'use strict';
/**
 * Phase B Sprint 3 — P1 Start + P2 Bedrijf & bereik offline checks.
 * Run: node scripts/phase-b-sprint3-check.js
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

var Shell = require('../js/professionals/onboarding-shell');
var Draft = require('../js/professionals/onboarding-draft');
var model = require('../server/onboarding-model');

var VALID_KBO = 'BE0123456749';

test('P1→P2 shell routing', function () {
  assert.strictEqual(Shell.nextStepId('start'), 'bedrijf_bereik');
  assert.strictEqual(Shell.prevStepId('bedrijf_bereik'), 'start');
  assert.strictEqual(
    Shell.resolveLandingStep({ onboardingStatus: 'in_progress', currentStepId: 'bedrijf_bereik' }),
    'bedrijf_bereik'
  );
});

test('Belgian KBO / BTW / postcode / phone formatting', function () {
  var k = Draft.validateKbo('BE 0123.456.749');
  assert.ok(k.ok);
  assert.strictEqual(k.value, VALID_KBO);
  assert.strictEqual(Draft.formatKboDisplay(VALID_KBO), 'BE 0123.456.749');
  assert.ok(!Draft.validateKbo('BE 0123.456.748').ok);

  var pc = Draft.validatePostcode('2000');
  assert.ok(pc.ok);
  assert.ok(!Draft.validatePostcode('0200').ok);

  var ph = Draft.validatePhone('0470 12 34 56');
  assert.ok(ph.ok);
  assert.strictEqual(ph.value, '+32470123456');
  assert.ok(!Draft.validatePhone('123').ok);
});

test('sanitizeP2Patch rejects unknown keys and bad formats; keeps partials', function () {
  var badKey = Draft.sanitizeP2Patch({ company: { foo: 1 } });
  assert.ok(!badKey.ok);

  var badKbo = Draft.sanitizeP2Patch({ company: { kbo: 'BE0000000000' } });
  assert.ok(!badKbo.ok);

  var partial = Draft.sanitizeP2Patch({
    company: { legal_name: 'Demo Dakwerken BV', display_name: 'Demo Dak' }
  });
  assert.ok(partial.ok);
  assert.strictEqual(partial.draft.company.legal_name, 'Demo Dakwerken BV');
  assert.ok(!Object.prototype.hasOwnProperty.call(partial.draft.company, 'phone'));

  var area = Draft.sanitizeP2Patch({
    service_area: { mode: 'radius', radius_km: 25, public_text: 'Antwerpen + 25 km' }
  });
  assert.ok(area.ok);
  assert.strictEqual(area.draft.service_area.radius_km, 25);
});

test('server validateDraftStructure uses P2 sanitizer', function () {
  assert.ok(model.validateDraftStructure({ company: { legal_name: 'OK Name' } }).ok);
  assert.ok(!model.validateDraftStructure({ company: { kbo: 'not-a-kbo' } }).ok);
  assert.ok(!model.validateDraftStructure({ google_intent: true }).ok);
  assert.ok(model.validateDraftStructure({ craft: { primary_category_id: 'dakwerken' } }).ok);
});

test('validateP2Complete requires V2 P2 fields only', function () {
  var empty = Draft.validateP2Complete({});
  assert.ok(!empty.ok);
  assert.ok(empty.errors.legal_name);
  assert.ok(empty.errors.mode);

  var full = Draft.validateP2Complete({
    company: {
      legal_name: 'Demo Dakwerken BV',
      display_name: 'Demo Dak',
      rechtsvorm: 'bv',
      kbo: VALID_KBO,
      btw_plichtig: true,
      btw_nummer: VALID_KBO,
      adres: 'Voorbeeldstraat 1',
      postcode: '2000',
      gemeente: 'Antwerpen',
      gewest: 'vlaanderen',
      website: '',
      email: 'partner@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'Ann Demo',
      contact_role: 'Zaakvoerder',
      language: 'nl-BE'
    },
    service_area: {
      mode: 'radius',
      radius_km: 30,
      provinces: [],
      regions: [],
      public_text: 'Antwerpen + 30 km',
      exclusions: ''
    }
  });
  assert.ok(full.ok, JSON.stringify(full.errors));
});

test('onboarding HTML has P1 CTA, living preview, P2 fields; no photos/Google; later placeholders', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
  assert.ok(html.indexOf('Profiel starten') >= 0);
  assert.ok(html.indexOf('id="startProfileBtn"') >= 0);
  assert.ok(html.indexOf('livingPreview') >= 0 || html.indexOf('prof-living-preview') >= 0);
  assert.ok(html.indexOf('10 minuten') >= 0 || html.indexOf('ongeveer 10') >= 0);
  [
    'legal_name',
    'display_name',
    'rechtsvorm',
    'kbo',
    'btw_nummer',
    'adres',
    'postcode',
    'gemeente',
    'gewest',
    'website',
    'email',
    'phone',
    'contact_name',
    'contact_role',
    'language',
    'public_text',
    'exclusions'
  ].forEach(function (name) {
    assert.ok(html.indexOf('name="' + name + '"') >= 0, name);
  });
  assert.ok(html.indexOf('areaModeGrid') >= 0);
  assert.ok(html.indexOf('onboarding-draft.js') >= 0);
  assert.ok(html.indexOf('google_intent') < 0);
  assert.ok(html.indexOf('data-step="ambacht"') >= 0);
  assert.ok(html.indexOf('id="p3Form"') >= 0 || html.indexOf('categoryGrid') >= 0);
  assert.ok(html.indexOf('submitOnboardingBtn') >= 0);
  assert.ok(html.indexOf('f_data_correct') >= 0);
  assert.ok(html.indexOf('f_editorial_ok') >= 0);
});

test('onboarding.js wires start CTA, draft autosave, P2 validation, resume', function () {
  var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('startProfileBtn') >= 0);
  assert.ok(src.indexOf('bedrijf_bereik') >= 0);
  assert.ok(src.indexOf('onboarding-save') >= 0);
  assert.ok(src.indexOf('collectP2Draft') >= 0);
  assert.ok(src.indexOf('validateP2Complete') >= 0);
  assert.ok(src.indexOf('scheduleAutosave') >= 0);
  assert.ok(src.indexOf('updateLivingPreview') >= 0);
  assert.ok(src.indexOf('canEdit') >= 0);
  assert.ok(src.indexOf('Alleen-lezen') >= 0);
  assert.ok(src.indexOf('requireSessionOrRedirect') >= 0);
});

test('responsive CSS covers P1/P2 form + preview', function () {
  var css = fs.readFileSync(path.join(root, 'css/professionals.css'), 'utf8');
  assert.ok(css.indexOf('prof-start-layout') >= 0);
  assert.ok(css.indexOf('prof-living-preview') >= 0);
  assert.ok(css.indexOf('prof-fieldset') >= 0);
  assert.ok(css.indexOf('prof-field-error') >= 0);
  assert.ok(css.indexOf('@media (max-width:640px)') >= 0);
});

test('role matrix unchanged: owner/admin write, member read', function () {
  assert.ok(model.canEditRole('owner'));
  assert.ok(model.canEditRole('admin'));
  assert.ok(!model.canEditRole('member'));
  assert.ok(model.canReadRole('member'));
});

test('preview model uses display_name for living preview', function () {
  var m = Draft.previewModel({
    company: { display_name: 'Atelier Noord' },
    service_area: { public_text: 'Antwerpen + 20 km' },
    fallbackName: 'Fallback'
  });
  assert.strictEqual(m.displayName, 'Atelier Noord');
  assert.strictEqual(m.areaText, 'Antwerpen + 20 km');
});

test('Sprint 2 + Phase A markers still present (compat)', function () {
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/onboarding-shell.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/onboarding.js')));
  var api = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  assert.ok(api.indexOf('onboarding-save') >= 0);
  assert.ok(api.indexOf('requirePartnerContext') >= 0);
  ['login', 'dashboard', 'onboarding'].forEach(function (p) {
    assert.ok(fs.existsSync(path.join(root, 'professionals', p + '.html')), p);
  });
});

test('no service_role leakage in sprint 3 browser bundles', function () {
  ['onboarding.js', 'onboarding-shell.js', 'onboarding-draft.js', 'core.js'].forEach(function (f) {
    var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
    assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
    assert.ok(t.indexOf('service_role') < 0, f);
  });
});

console.log('');
if (failed) {
  console.error(failed + ' Phase B Sprint 3 check(s) failed');
  process.exit(1);
}
console.log('All Phase B Sprint 3 offline checks passed');
