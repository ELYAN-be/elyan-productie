'use strict';
/**
 * Marketplace V1 finalisation — targeted offline contract checks.
 * Run: node scripts/marketplace-v1-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;

function source(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function test(name, fn) {
  try {
    fn();
    console.log('OK  ' + name);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + ' — ' + err.message);
  }
}

var snap = require('../server/public-snapshot');
var intake = require('../server/interest-intake');

test('capacity label uses Tijdelijk volzet', function () {
  assert.strictEqual(snap.capacityPublicLabel('full'), 'Tijdelijk volzet');
});

test('isPartnerAtCapacity detects full capacity from snapshot', function () {
  assert.strictEqual(
    snap.isPartnerAtCapacity({
      availability: { capacityId: 'full', capacityLabel: 'Tijdelijk volzet' }
    }),
    true
  );
  assert.strictEqual(
    snap.isPartnerAtCapacity({
      availability: { capacityLabel: 'Momenteel volzet' }
    }),
    true
  );
  assert.strictEqual(
    snap.isPartnerAtCapacity({
      availability: { capacityId: 'available', capacityLabel: 'Nieuwe projecten mogelijk' }
    }),
    false
  );
});

test('interest intake rejects temporarily full partner in resolve path', function () {
  var js = source('server/interest-intake.js');
  assert.ok(js.indexOf('isPartnerAtCapacity') >= 0);
  assert.ok(js.indexOf("code: 'partner_unavailable'") >= 0);
});

test('public API maps partner_unavailable to 409', function () {
  var api = source('api/public/v1.js');
  assert.ok(api.indexOf("code === 'partner_unavailable'") >= 0);
  assert.ok(api.indexOf('return 409') >= 0);
});

test('marketplace search keeps volzet visible (no hide filter by default)', function () {
  var mp = source('server/marketplace-public.js');
  assert.ok(mp.indexOf("availability && availability !== 'all'") >= 0);
  assert.ok(mp.indexOf('applyColdStartExploration') < 0, 'cold-start randomness disabled for V1');
});

test('vakmannen UI blocks request CTA when temporarily full', function () {
  var js = source('js/vakmannen-public.js');
  assert.ok(js.indexOf('isTemporarilyFull') >= 0);
  assert.ok(js.indexOf('Vraag via ELYAN aan') >= 0);
  assert.ok(js.indexOf('Gecontroleerd door ELYAN') < 0, 'no fake verified badge on cards');
  assert.ok(js.indexOf('Vind een vakbedrijf voor je renovatie') >= 0);
  assert.ok(js.indexOf('Filters wissen') >= 0);
  assert.ok(js.indexOf('filterAvailability') >= 0);
});

test('interest form blocks volzet client-side and shows confirmation copy', function () {
  var js = source('js/marketplace-interest.js');
  assert.ok(js.indexOf('isTemporarilyFull') >= 0);
  assert.ok(js.indexOf('Je aanvraag is verzonden via ELYAN') >= 0);
  assert.ok(js.indexOf('partner_unavailable') >= 0);
});

test('control request detail exposes partner response fields', function () {
  var cr = source('server/customer-requests.js');
  var ui = source('js/professionals/control-requests.js');
  assert.ok(cr.indexOf('partner_request_responses') >= 0);
  assert.ok(cr.indexOf('partnerResponseStatusLabel') >= 0);
  assert.ok(ui.indexOf('Partnerreactie') >= 0);
});

test('toPublicCard exposes capacity and public pricing hints', function () {
  var card = snap.toPublicCard({
    slug: 'demo',
    displayName: 'Demo',
    primaryCategoryId: 'dakwerken',
    services: [{ id: 'a', label: 'Dak' }],
    serviceArea: { publicText: 'Antwerpen' },
    pricing: [
      {
        model: 'price_range',
        displayString: '€80 – €100/m²',
        priceSource: 'partner',
        publicConsent: true
      }
    ],
    availability: { capacityId: 'full', capacityLabel: 'Tijdelijk volzet' }
  });
  assert.strictEqual(card.atCapacity, true);
  assert.strictEqual(card.hasPublicPricing, true);
});

test('validateInterestPayload still requires partner slug', function () {
  var bad = intake.validateInterestPayload({ consent: true, name: 'x', email: 'a@b.c', location: '9000', description: '1234567890' });
  assert.strictEqual(bad.ok, false);
});

if (failed) {
  console.error('\n' + failed + ' marketplace V1 check(s) failed.');
  process.exit(1);
}
console.log('\nMarketplace V1 checks passed.');
