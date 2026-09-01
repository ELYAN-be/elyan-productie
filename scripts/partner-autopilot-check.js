'use strict';
/**
 * Partner Autopilot V1 — targeted offline checks.
 * Run: node scripts/partner-autopilot-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

process.env.PARTNER_AUTOPILOT_MEMORY = '1';
delete process.env.AUTO_PUBLISH_PARTNERS;

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    var ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret.then(function () { ok(name); }).catch(function (e) { fail(name, e); });
    }
    ok(name);
    return Promise.resolve();
  } catch (e) {
    fail(name, e);
    return Promise.resolve();
  }
}

var screening = require('../server/partner-autopilot/screening');
var store = require('../server/partner-autopilot/store');
var readiness = require('../server/partner-autopilot/readiness');
var composer = require('../server/partner-autopilot/profile-composer');
var config = require('../server/partner-autopilot/config');
var Draft = require('../js/professionals/onboarding-draft');
var { buildPublicSnapshotV1 } = require('../server/public-snapshot');
var { partnerSafeRequestCard } = require('../server/partner-request-responses');

var VALID_KBO = '0123456749';

function baseInterest(overrides) {
  return Object.assign({
    companyName: 'Dak Pro BV',
    contactName: 'Jan',
    email: 'jan+' + Date.now() + '@elyan-test.invalid',
    phone: '+32470123456',
    specialty: 'dak',
    region: 'antwerpen',
    consent: true,
    enterpriseNumber: VALID_KBO
  }, overrides || {});
}

async function run() {
  store.resetMemoryStoreForTests();

  await test('migration file exists', function () {
    var sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260901_partner_autopilot_v1.sql'), 'utf8');
    assert(/partner_interest_candidates/i.test(sql));
    assert(/partner_request_responses/i.test(sql));
  });

  await test('AUTO_PUBLISH default OFF', function () {
    assert.strictEqual(config.isAutoPublishPartners(), false);
  });

  await test('intake → one candidate idempotent', async function () {
    store.resetMemoryStoreForTests();
    var input = baseInterest({ email: 'dup@elyan-test.invalid' });
    var a = await store.upsertInterestCandidate({
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      specialty: input.specialty,
      region: input.region,
      consentAt: new Date().toISOString(),
      categoryId: 'dakwerken'
    });
    var b = await store.upsertInterestCandidate({
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      specialty: input.specialty,
      region: input.region,
      consentAt: new Date().toISOString(),
      categoryId: 'dakwerken'
    });
    assert.strictEqual(a.created, true);
    assert.strictEqual(b.created, false);
    assert.strictEqual(a.candidate.id, b.candidate.id);
  });

  await test('screening valid proceeds', function () {
    var s = screening.runScreening(baseInterest());
    assert.strictEqual(s.verdict, 'READY');
    assert.strictEqual(s.categoryId, 'dakwerken');
  });

  await test('screening missing field blocked', function () {
    var s = screening.runScreening(baseInterest({ email: 'bad' }));
    assert.strictEqual(s.verdict, 'BLOCKED');
    assert(s.issues.some(function (i) { return i.code === 'invalid_email'; }));
  });

  await test('unsupported category review not fake verify', function () {
    var s = screening.runScreening(baseInterest({ specialty: 'algemeen', enterpriseNumber: null }));
    assert.strictEqual(s.verdict, 'REVIEW_REQUIRED');
    assert(s.issues.some(function (i) { return i.code === 'company_verification_required'; }));
    assert(!s.issues.some(function (i) { return /gecontroleerd/i.test(i.message); }));
  });

  await test('category questions dakwerken only', function () {
    var dak = Draft.getServices('dakwerken');
    var keuken = Draft.getServices('keuken');
    assert(dak.length > 0);
    assert(keuken.length > 0);
    var dakLabels = dak.map(function (s) { return (s.label || '').toLowerCase(); }).join(' ');
    assert(!/keuken/i.test(dakLabels));
    assert(/keuken|kasten|blad/i.test(
      keuken.map(function (s) { return (s.label || '').toLowerCase(); }).join(' ')
    ));
  });

  await test('partner price separate from market + consent gate', function () {
    var sid = Draft.getServices('dakwerken')[0].id;
    var sp = Draft.emptyServicePrice();
    sp.pricing_model = 'price_range';
    sp.min_price = 80;
    sp.max_price = 110;
    sp.public_consent = false;
    var draft = {
      company: { legal_name: 'X', display_name: 'X', kbo: 'BE' + VALID_KBO, adres: 'a', postcode: '2000', gemeente: 'Antwerpen', gewest: 'vlaanderen', email: 'x@test.invalid', phone: '+32470123456', contact_name: 'X' },
      service_area: { mode: 'radius', radius_km: 25, public_text: 'Antwerpen' },
      craft: { primary_category_id: 'dakwerken', service_ids: [sid] },
      offer: { service_prices: {}, vat_basis: 'exclusief', capacity: 'nu', start_month: '2026-10', client_types: ['particulier'], response_time: '48u', visit_speed: 'binnen_week' },
      story: { strength: 'Dakwerken' }
    };
    draft.offer.service_prices[sid] = sp;
    var built = buildPublicSnapshotV1({
      draft: draft,
      displayName: 'X',
      legalName: 'X',
      slug: 'x-dak',
      assets: []
    });
    assert.strictEqual(built.ok, true);
    var priced = built.snapshot.pricing.filter(function (p) { return p.priceSource === 'partner'; });
    assert.strictEqual(priced.length, 0);

    sp.public_consent = true;
    draft.offer.service_prices[sid] = sp;
    built = buildPublicSnapshotV1({ draft: draft, displayName: 'X', legalName: 'X', slug: 'x-dak', assets: [] });
    priced = built.snapshot.pricing.filter(function (p) { return p.priceSource === 'partner'; });
    assert.strictEqual(priced.length, 1);
    assert(/vakbedrijf/i.test(priced[0].priceSourceLabel));
    assert(!/ELYAN marktindicatie/i.test(priced[0].priceSourceLabel));
  });

  await test('anti-hallucination no years without evidence', function () {
    var composed = composer.composeProfileFromDraft({
      company: { display_name: 'Test Dak' },
      craft: { primary_category_id: 'dakwerken', service_ids: [] },
      service_area: { public_text: 'Mechelen' },
      story: {}
    });
    assert(!/\d+\s*jaar/i.test(composed.introduction || ''));
    assert(!/gecertificeerd/i.test(composed.description || ''));
  });

  await test('AI failure deterministic fallback', async function () {
    var out = await composer.composeProfile({
      company: { display_name: 'Test' },
      craft: { primary_category_id: 'dakwerken', service_ids: [] },
      service_area: { public_text: 'Antwerpen' }
    }, {
      aiCompose: function () { throw new Error('ai down'); }
    });
    assert(out.source === 'deterministic' || out.introduction);
  });

  await test('readiness explicit issues', function () {
    var r = readiness.evaluateAutopilotReadiness({
      partner: { account_status: 'active' },
      onboarding: { onboarding_status: 'submitted', draft: { craft: {}, offer: {}, service_area: {} } },
      profile: { profile_status: 'draft' },
      checkUnsupportedClaims: false
    });
    assert(r.verdict === 'BLOCKED' || r.verdict === 'REVIEW_REQUIRED');
    assert(r.issues.length > 0);
    assert(!/score/i.test(JSON.stringify(r.issues)));
  });

  await test('pilot publish not automatic', function () {
    assert.strictEqual(config.isAutoPublishPartners(), false);
  });

  await test('public privacy partner request card', function () {
    var card = partnerSafeRequestCard({
      id: 'r1',
      category_id: 'dakwerken',
      location_text: 'Mechelen',
      message: 'Hellend dak 120m2',
      created_at: new Date().toISOString()
    }, null);
    assert(!card.customerEmail);
    assert(!card.customerPhone);
    assert(card.title.indexOf('Mechelen') >= 0);
  });

  await test('professional shell nav V1', function () {
    var html = fs.readFileSync(path.join(root, 'js/professionals/pro-shell.js'), 'utf8');
    assert(/Aanvragen/.test(html));
    assert(/Beschikbaarheid/.test(html));
    assert(/Mijn profiel/.test(html));
    assert(/Mijn bedrijf/.test(html));
    assert(!/CRM/.test(html));
  });

  if (failed) {
    console.error('\n' + failed + ' check(s) failed.');
    process.exit(1);
  }
  console.log('\nPartner Autopilot V1 checks passed.');
}

run();
