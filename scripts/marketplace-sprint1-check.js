'use strict';
/**
 * Marketplace Phase 1 Sprint 1 — PublicSnapshot + ranking + privacy + 12-cat matrix.
 * Run: node scripts/marketplace-sprint1-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) {
  console.log('OK  ' + name);
}
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
var CI = require('../shared/vakmannen/intelligence');
var pub = require('../server/public-snapshot');
var rank = require('../server/marketplace-ranking');
var loc = require('../server/marketplace-location');
var marketplace = require('../server/marketplace-public');

var ALL_CATS = [
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
];

function sampleDraft(categoryId) {
  var sid = Draft.getServices(categoryId)[0].id;
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = 'on_request';
  var prices = {};
  prices[sid] = sp;
  return {
    company: {
      legal_name: 'Test BV',
      display_name: 'Test Display',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Geheimstraat 1',
      postcode: '9000',
      gemeente: 'Gent',
      gewest: 'vlaanderen',
      website: 'https://example.be',
      email: 'secret@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'Secret Person',
      contact_role: 'Zaakvoerder',
      language: 'nl-BE'
    },
    service_area: {
      mode: 'heel_belgie',
      radius_km: null,
      provinces: [],
      regions: [],
      public_text: 'Heel België',
      exclusions: ''
    },
    craft: {
      primary_category_id: categoryId,
      service_ids: [sid],
      conditionals: { secret: 'nope' },
      extras: {}
    },
    offer: {
      service_prices: prices,
      vat_basis: 'exclusief',
      project_minimum: 1000,
      client_types: ['particulier'],
      response_time: '24u',
      urgency_jobs: null,
      capacity: 'available',
      start_month: Draft.listStartMonths()[0].id,
      visit_speed: '2w',
      visit_extra: []
    },
    story: {
      years_active: '3-5',
      team_size: '2-3',
      strength: 'Nette afwerking',
      prefer: 'Renovatie',
      avoid: '',
      care: '',
      why_choose: '',
      materials: '',
      must_know: '',
      guarantee_line: '',
      show_years_public: true,
      show_team_public: false
    }
  };
}

// Patch internal_note onto price for leak test
function draftWithInternalNote(categoryId) {
  var d = sampleDraft(categoryId);
  var sid = d.craft.service_ids[0];
  d.offer.service_prices[sid].internal_note = 'NOOIT PUBLIEK';
  return d;
}

test('files exist for public API + snapshot modules', function () {
  assert.ok(fs.existsSync(path.join(root, 'server/public-snapshot.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/marketplace-public.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/marketplace-ranking.js')));
  assert.ok(fs.existsSync(path.join(root, 'api/public/v1.js')));
  assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/20260818_marketplace_public_snapshot.sql')));
  var vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.ok(
    (vercel.rewrites || []).some(function (r) {
      return r.source === '/api/public/v1/:path*' && /path=:path\*/.test(r.destination || '');
    }),
    'vercel rewrite must forward nested /api/public/v1/* to handler'
  );
});

test('PublicSnapshot allowlist omits private fields', function () {
  var built = pub.buildPublicSnapshotV1({
    draft: draftWithInternalNote('schilderwerken'),
    assets: [
      {
        id: 'a1',
        public_url: 'https://cdn.example/a1.webp',
        title: 'Project',
        sort_order: 0,
        is_cover: true,
        storage_key: 'elyan/partners/SECRET/a1'
      }
    ],
    coverAssetId: 'a1',
    slug: 'test-display',
    publishedAt: '2026-01-01T00:00:00.000Z',
    publicSnapshotVersion: 1
  });
  assert.ok(built.ok, built.code);
  var snap = built.snapshot;
  var raw = JSON.stringify(snap);
  assert.ok(!/"email"/i.test(raw));
  assert.ok(!/"phone"/i.test(raw));
  assert.ok(!/Geheimstraat/.test(raw));
  assert.ok(!/secret@/i.test(raw));
  assert.ok(!/Secret Person/.test(raw));
  assert.ok(!/NOOIT PUBLIEK/.test(raw));
  assert.ok(!/"conditionals"/i.test(raw));
  assert.ok(!/"partnerId"/i.test(raw));
  assert.ok(!/"storage_key"/i.test(raw));
  assert.ok(!/"storageKey"/i.test(raw));
  assert.ok(!/"response_time"/i.test(raw));
  assert.ok(snap.kbo);
  assert.ok(snap.displayName === 'Test Display');
  assert.ok(snap.services.length >= 1);
  assert.ok(snap.version === 1);
  assert.ok(snap.publicSnapshotVersion === 1);
  assert.strictEqual(pub.assertNoLeaks(snap).length, 0);
});

test('fail closed without slug/services/area', function () {
  var d = sampleDraft('keuken');
  d.service_area.public_text = '';
  var bad = pub.buildPublicSnapshotV1({
    draft: d,
    assets: [],
    slug: 'x',
    publicSnapshotVersion: 1
  });
  assert.ok(!bad.ok);
});

test('geo ranking freeze table', function () {
  assert.strictEqual(rank.geoFit({ provincieId: 'oost_vlaanderen', gewestId: 'vlaanderen' }, { mode: 'heel_belgie' }), 0.35);
  assert.strictEqual(
    rank.geoFit(
      { provincieId: 'oost_vlaanderen', gewestId: 'vlaanderen' },
      { mode: 'provincies', provinces: ['oost_vlaanderen'] }
    ),
    0.75
  );
  assert.strictEqual(
    rank.geoFit({ gewestId: 'vlaanderen' }, { mode: 'gewest', regions: ['vlaanderen'] }),
    0.5
  );
  assert.strictEqual(rank.geoFit({ gemeente: 'Gent' }, { mode: 'radius', coversGemeente: true, radiusKm: 20 }), 1.0);
  assert.strictEqual(
    rank.geoFit({ gemeente: 'Gent' }, { mode: 'radius', coversGemeente: false, radiusKm: 100, radiusContainsSearch: false }),
    0.45
  );
  assert.strictEqual(rank.geoFit({ provincieId: 'antwerpen' }, { mode: 'provincies', provinces: ['limburg'] }), 0);
});

test('heel_belgie does not beat local province coverage', function () {
  var local = rank.relevanceScore({
    categoryFit: 1,
    serviceFit: 1,
    geoFit: 0.75,
    availability: 1,
    quality: 0.5,
    verified: 1
  });
  var national = rank.relevanceScore({
    categoryFit: 1,
    serviceFit: 1,
    geoFit: 0.35,
    availability: 1,
    quality: 0.9,
    verified: 1
  });
  assert.ok(local > national, 'local geo should outweigh higher quality national');
});

test('quality score capped; cold-start exploration reserves slots', function () {
  var q = rank.qualityScore({ photoCount: 12, hasPriceOrOnRequest: true, hasStoryCore: true });
  assert.ok(q <= 1);
  var ranked = [];
  for (var i = 0; i < 10; i++) {
    ranked.push({
      slug: 'old-' + i,
      score: 0.9 - i * 0.01,
      publishedAtMs: Date.now() - 100 * 24 * 3600 * 1000
    });
  }
  ranked.push({ slug: 'new-1', score: 0.2, publishedAtMs: Date.now() - 2 * 24 * 3600 * 1000 });
  var out = rank.applyColdStartExploration(ranked, { pageSize: 12, nowMs: Date.now() });
  assert.ok(out[0].slug === 'new-1' || out.slice(0, 3).some(function (r) { return r.slug === 'new-1'; }));
});

test('location normalization', function () {
  var g = loc.normalizeLocation({ postcode: '9000' });
  assert.ok(g.ok);
  assert.strictEqual(g.location.gemeente, 'Gent');
  var bad = loc.normalizeLocation({ postcode: '0123' });
  assert.ok(!bad.ok);
});

test('problems map uses only CI categories', function () {
  marketplace.PROBLEMS.forEach(function (p) {
    assert.ok(CI.PartnerOnboardingEngine.getCategory(p.categoryId), p.categoryId);
  });
  assert.strictEqual(marketplace.listCategories().length, 12);
});

var matrix = [];
ALL_CATS.forEach(function (catId) {
  test('matrix ' + catId, function () {
    var cat = CI.PartnerOnboardingEngine.getCategory(catId);
    assert.ok(cat);
    var services = Draft.getServices(catId);
    assert.ok(services.length >= 1);
    services.forEach(function (s) {
      var models = Draft.pricingModelsForService(catId, s.id);
      assert.ok(models.indexOf('on_request') >= 0);
    });
    var built = pub.buildPublicSnapshotV1({
      draft: sampleDraft(catId),
      assets: [],
      slug: 'partner-' + catId,
      publicSnapshotVersion: 2,
      publishedAt: '2026-08-01T00:00:00.000Z'
    });
    assert.ok(built.ok, built.code);
    assert.strictEqual(built.snapshot.primaryCategoryId, catId);
    assert.strictEqual(pub.assertNoLeaks(built.snapshot).length, 0);
    // no cross-category service labels from foreign cat as primary
    assert.ok(
      built.snapshot.services.every(function (s) {
        return services.some(function (x) {
          return x.id === s.id;
        });
      })
    );
    matrix.push({ cat: catId, ok: true });
  });
});

test('12/12 matrix complete', function () {
  assert.strictEqual(matrix.length, 12);
  assert.ok(matrix.every(function (m) { return m.ok; }));
});

test('isPubliclyVisible fail closed', function () {
  assert.ok(
    !marketplace.isPubliclyVisible(
      { account_status: 'active' },
      { profile_status: 'published', public_snapshot: {} }
    )
  );
  assert.ok(
    !marketplace.isPubliclyVisible(
      { account_status: 'active' },
      { profile_status: 'paused', public_snapshot: { slug: 'x', displayName: 'Y', publicSnapshotVersion: 1 } }
    )
  );
  assert.ok(
    !marketplace.isPubliclyVisible(
      { account_status: 'suspended' },
      {
        profile_status: 'published',
        public_snapshot: { slug: 'x', displayName: 'Y', publicSnapshotVersion: 1, version: 1 }
      }
    )
  );
});

test('control publish wires public snapshot rebuild export', function () {
  var control = require('../server/control');
  assert.ok(typeof control.publishPartner === 'function');
  assert.ok(typeof control.rebuildPublicSnapshot === 'function');
  var src = fs.readFileSync(path.join(root, 'server/control.js'), 'utf8');
  assert.ok(src.indexOf('public_snapshot') >= 0);
  assert.ok(src.indexOf('buildPublicSnapshotV1') >= 0);
});

test('no service_role in public API bundle', function () {
  var src = fs.readFileSync(path.join(root, 'api/public/v1.js'), 'utf8');
  assert.ok(!/SERVICE_ROLE|service_role_key/i.test(src));
});

test('Phase A+B markers still present (compat)', function () {
  assert.ok(fs.existsSync(path.join(root, 'api/professionals.js')));
  assert.ok(fs.existsSync(path.join(root, 'api/control.js')));
  assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/20260816_phase_b_onboarding_foundation.sql')));
});

console.log('\nMATRIX_JSON ' + JSON.stringify(matrix));
if (failed) {
  console.error('\nMarketplace Sprint 1 checks FAILED (' + failed + ')');
  process.exit(1);
}
console.log('\nAll Marketplace Sprint 1 offline checks passed');
console.log('12/12 PASS');
process.exit(0);
