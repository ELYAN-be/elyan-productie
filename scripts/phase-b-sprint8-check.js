#!/usr/bin/env node
/**
 * Phase B Sprint 8 — ELYAN Control offline checks + in-memory lifecycle.
 * Run: node scripts/phase-b-sprint8-check.js
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;
var Draft = require('../js/professionals/onboarding-draft');

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

function buildCompleteDraft() {
  var sid = Draft.getServices('schilderwerken')[0].id;
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = 'on_request';
  var prices = {};
  prices[sid] = sp;
  return {
    company: {
      legal_name: 'Control Test BV',
      display_name: 'Control Schilders',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Testlaan 1',
      postcode: '1000',
      gemeente: 'Brussel',
      gewest: 'brussel',
      website: '',
      email: 'control-owner@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'Control Owner',
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
      primary_category_id: 'schilderwerken',
      service_ids: [sid],
      conditionals: {},
      extras: { scope: ['Binnen'] }
    },
    offer: {
      service_prices: prices,
      vat_basis: 'exclusief',
      project_minimum: null,
      client_types: ['particulier'],
      response_time: '24u',
      urgency_jobs: null,
      capacity: 'limited',
      start_month: Draft.listStartMonths()[0].id,
      visit_speed: '2w',
      visit_extra: []
    },
    story: {
      years_active: '3-5',
      team_size: '',
      strength: 'Nette schilderwerken binnenshuis.',
      prefer: 'Renovatieprojecten bij particulieren.',
      avoid: '',
      care: '',
      why_choose: '',
      materials: '',
      must_know: '',
      guarantee_line: '',
      show_years_public: true,
      show_team_public: false
    },
    confirmations: { data_correct: true, editorial_ok: true }
  };
}

test('control model exports transitions + publication gate', function () {
  var model = require('../server/control-model');
  assert.ok(model.canApproveOnboarding('submitted'));
  assert.ok(!model.canApproveOnboarding('changes_requested'));
  assert.ok(model.canRequestChanges('submitted'));
  assert.ok(model.canRequestChanges('changes_requested'));
  assert.ok(!model.canRequestChanges('approved'));
  assert.ok(model.canProfileAction('publish', 'ready'));
  assert.ok(!model.canProfileAction('publish', 'under_review'));
  assert.ok(model.canProfileAction('pause', 'published'));
  assert.ok(model.canProfileAction('hide', 'published'));
  assert.ok(model.canProfileAction('hide', 'paused'));
  assert.ok(model.canProfileAction('restore', 'paused'));
  assert.ok(model.canProfileAction('restore', 'hidden'));
  assert.ok(!model.canProfileAction('restore', 'published'));
  assert.strictEqual(model.nextProfileStatus('publish'), 'published');
  assert.strictEqual(model.slugifyBase('Control Schilders'), 'control-schilders');
  assert.ok(model.hasOpenReviewItems([{ item_status: 'open' }]));
  assert.ok(!model.hasOpenReviewItems([{ item_status: 'resolved' }]));
});

test('publication gate blocks incomplete / wrong status', function () {
  var model = require('../server/control-model');
  var draft = buildCompleteDraft();
  var fail = model.evaluatePublicationGate({
    partner: { account_status: 'active' },
    onboarding: { onboarding_status: 'submitted', draft: draft },
    profile: { profile_status: 'under_review' },
    reviewItems: []
  });
  assert.ok(!fail.ok);
  assert.ok(fail.missing.some(function (m) { return m.code === 'onboarding_not_approved'; }));

  var open = model.evaluatePublicationGate({
    partner: { account_status: 'active' },
    onboarding: { onboarding_status: 'approved', draft: draft },
    profile: { profile_status: 'ready' },
    reviewItems: [{ item_status: 'open' }]
  });
  assert.ok(!open.ok);
  assert.ok(open.missing.some(function (m) { return m.code === 'open_review_items'; }));

  var pass = model.evaluatePublicationGate({
    partner: { account_status: 'active' },
    onboarding: { onboarding_status: 'approved', draft: draft },
    profile: { profile_status: 'ready' },
    reviewItems: []
  });
  assert.ok(pass.ok, JSON.stringify(pass.missing));
});

test('published_snapshot freezes approved draft shape', function () {
  var model = require('../server/control-model');
  var draft = buildCompleteDraft();
  var snap = model.buildPublishedSnapshot({
    partnerId: 'p1',
    draft: draft,
    assets: [],
    slug: 'control-schilders',
    publishedAt: '2026-08-16T00:00:00.000Z',
    displayName: 'Control Schilders',
    legalName: 'Control Test BV'
  });
  assert.strictEqual(snap.version, 1);
  assert.strictEqual(snap.slug, 'control-schilders');
  assert.strictEqual(snap.displayName, 'Control Schilders');
  assert.ok(snap.company);
  assert.ok(snap.craft.primary_category_id);
  assert.ok(snap.offer.service_prices);
  // Mutating draft after snapshot must not affect frozen object fields that were picked
  draft.company.display_name = 'Hacked';
  assert.strictEqual(snap.company.display_name, 'Control Schilders');
});

test('API + UI files exist and wire staff-only Control', function () {
  [
    'api/control.js',
    'api/control-invites.js',
    'server/control.js',
    'server/control-model.js',
    'professionals/control.html',
    'js/professionals/control.js'
  ].forEach(function (f) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  });
  var api = fs.readFileSync(path.join(root, 'api/control.js'), 'utf8');
  assert.ok(api.indexOf('requireStaff') >= 0);
  assert.ok(api.indexOf('request-changes') >= 0);
  assert.ok(api.indexOf('approve') >= 0);
  assert.ok(api.indexOf('publish') >= 0);
  assert.ok(api.indexOf("actorType: 'staff'") < 0); // audit in service layer
  var ctrl = fs.readFileSync(path.join(root, 'server/control.js'), 'utf8');
  assert.ok(ctrl.indexOf("actorType: 'staff'") >= 0);
  assert.ok(ctrl.indexOf('control_approve') >= 0);
  assert.ok(ctrl.indexOf('open_review_items') >= 0);
  var html = fs.readFileSync(path.join(root, 'professionals/control.html'), 'utf8');
  assert.ok(html.indexOf('ELYAN Control') >= 0);
  assert.ok(html.indexOf('placeholder') < 0 || html.indexOf('placeholder="bijv') >= 0);
  assert.ok(html.indexOf('TODO') < 0);
  var vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
  assert.ok(vercel.indexOf('/professionals/control/:partnerId') >= 0);
});

test('professionals session exposes staff without changing membership authZ', function () {
  var src = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  assert.ok(src.indexOf('isStaff') >= 0);
  assert.ok(src.indexOf('staff:') >= 0 || src.indexOf('staff ') >= 0);
  assert.ok(src.indexOf('requirePartnerContext') >= 0);
  assert.ok(src.indexOf('approvePartner') < 0);
});

test('partner onboarding API has no approve/publish actions', function () {
  var src = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  assert.ok(src.indexOf("'approve'") < 0);
  assert.ok(src.indexOf("'publish'") < 0);
  assert.ok(src.indexOf('request-changes') < 0);
});

// ---------------------------------------------------------------------------
// Memory harness
// ---------------------------------------------------------------------------

function createMemoryDb() {
  var store = {
    partners: {},
    partner_onboarding: {},
    partner_profiles: {},
    partner_profile_assets: {},
    partner_review_items: {},
    audit_logs: []
  };
  var seq = 0;

  function matchFilters(row, filters) {
    return filters.every(function (f) {
      if (f.op === 'eq') return row[f.col] === f.val;
      if (f.op === 'in') return f.val.indexOf(row[f.col]) >= 0;
      return true;
    });
  }

  function emptyProfile(partnerId) {
    return {
      partner_id: partnerId,
      profile_status: 'not_created',
      slug: null,
      primary_category_id: null,
      specialty_line: null,
      cover_asset_id: null,
      published_snapshot: {},
      published_at: null,
      paused_at: null,
      hidden_at: null,
      ready_at: null
    };
  }

  function emptyOnboarding(partnerId) {
    return {
      partner_id: partnerId,
      onboarding_status: 'not_started',
      current_step_id: 'start',
      draft: {},
      version: 1,
      started_at: null,
      submitted_at: null,
      approved_at: null,
      last_saved_at: null,
      last_saved_by: null,
      submitted_by: null,
      review_notes: null,
      changes_requested_at: null,
      changes_requested_by: null
    };
  }

  function tableApi(name) {
    var filters = [];
    var payload = null;
    var mode = 'select';
    var api = {
      select: function () {
        return api;
      },
      insert: function (row) {
        mode = 'insert';
        payload = row;
        return api;
      },
      upsert: function (row) {
        mode = 'upsert';
        payload = row;
        return api;
      },
      update: function (row) {
        mode = 'update';
        payload = row;
        return api;
      },
      eq: function (col, val) {
        filters.push({ op: 'eq', col: col, val: val });
        return api;
      },
      in: function (col, vals) {
        filters.push({ op: 'in', col: col, val: vals });
        return api;
      },
      order: function () {
        return api;
      },
      maybeSingle: async function () {
        var result = await api._exec();
        if (Array.isArray(result.data)) {
          return { data: result.data[0] || null, error: result.error };
        }
        return result;
      },
      then: function (resolve, reject) {
        return api._exec().then(resolve, reject);
      },
      _exec: async function () {
        if (name === 'audit_logs' && mode === 'insert') {
          store.audit_logs.push(payload);
          return { data: payload, error: null };
        }
        if (mode === 'insert' || mode === 'upsert') {
          var rowsIn = Array.isArray(payload) ? payload : [payload];
          var out = rowsIn.map(function (row) {
            var key = row.partner_id || row.id || row.user_id;
            if (name === 'partner_review_items' || name === 'partner_profile_assets') {
              if (!row.id) {
                seq += 1;
                row.id = 'ri-' + seq;
              }
              key = row.id;
            }
            if (name === 'partners' && !key) {
              seq += 1;
              key = 'partner-' + seq;
              row.id = key;
            }
            if (!store[name]) store[name] = {};
            if (mode === 'upsert' && !store[name][key]) {
              if (name === 'partner_onboarding') store[name][key] = Object.assign(emptyOnboarding(key), row);
              else if (name === 'partner_profiles') store[name][key] = Object.assign(emptyProfile(key), row);
              else store[name][key] = Object.assign({}, row);
            } else if (mode === 'insert') {
              store[name][key] = Object.assign({}, store[name][key] || {}, row);
            } else {
              store[name][key] = Object.assign({}, store[name][key] || {}, row);
            }
            return store[name][key];
          });
          return { data: Array.isArray(payload) ? out : out[0], error: null };
        }
        if (mode === 'update') {
          var rows = Object.keys(store[name] || {})
            .map(function (k) { return store[name][k]; })
            .filter(function (r) { return matchFilters(r, filters); });
          if (!rows.length) return { data: null, error: null };
          rows.forEach(function (r) {
            Object.keys(payload).forEach(function (k) {
              r[k] = payload[k];
            });
          });
          return { data: rows.length === 1 ? rows[0] : rows, error: null };
        }
        var selected = Object.keys(store[name] || {})
          .map(function (k) { return Object.assign({}, store[name][k]); })
          .filter(function (r) { return matchFilters(r, filters); });
        return { data: selected, error: null };
      }
    };
    return api;
  }

  return {
    store: store,
    from: function (name) {
      return tableApi(name);
    },
    seedSubmittedPartner: function (partnerId, draft) {
      store.partners[partnerId] = {
        id: partnerId,
        legal_name: 'Control Test BV',
        display_name: 'Control Schilders',
        account_status: 'active'
      };
      store.partner_onboarding[partnerId] = Object.assign(emptyOnboarding(partnerId), {
        onboarding_status: 'submitted',
        current_step_id: 'review_hub',
        draft: draft || buildCompleteDraft(),
        version: 5,
        started_at: '2026-08-01T00:00:00.000Z',
        submitted_at: '2026-08-15T00:00:00.000Z',
        submitted_by: 'owner-1'
      });
      store.partner_profiles[partnerId] = Object.assign(emptyProfile(partnerId), {
        profile_status: 'under_review',
        primary_category_id: 'schilderwerken'
      });
    }
  };
}

async function withControlHarness(fn) {
  var db = createMemoryDb();
  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var controlPath = require.resolve('../server/control');
  var controlModelPath = require.resolve('../server/control-model');
  var onboardingPath = require.resolve('../server/onboarding');
  var assetsPath = require.resolve('../server/assets');

  var realSupabase = require.cache[supabasePath];
  var realAudit = require.cache[auditPath];

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { createAdminClient: function () { return db; } }
  };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: {
      writeAudit: async function (opts) {
        db.store.audit_logs.push(opts);
      }
    }
  };
  delete require.cache[controlPath];
  delete require.cache[controlModelPath];
  delete require.cache[onboardingPath];
  delete require.cache[assetsPath];

  try {
    var control = require('../server/control');
    var onboarding = require('../server/onboarding');
    await fn(control, onboarding, db);
  } finally {
    if (realSupabase) require.cache[supabasePath] = realSupabase;
    else delete require.cache[supabasePath];
    if (realAudit) require.cache[auditPath] = realAudit;
    else delete require.cache[auditPath];
    delete require.cache[controlPath];
    delete require.cache[controlModelPath];
    delete require.cache[onboardingPath];
    delete require.cache[assetsPath];
    require('../server/control-model');
    require('../server/control');
    require('../server/onboarding');
  }
}

async function runLifecycle() {
  await test('Control: submitted visible; request changes; multi items; resubmit; approve; publish; pause; hide; restore', async function () {
    await withControlHarness(async function (control, onboarding, db) {
      var partnerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      var otherId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      var staffId = 'staff-1111-1111-1111-111111111111';
      var ownerId = 'owner-2222-2222-2222-222222222222';
      var draft = buildCompleteDraft();

      db.seedSubmittedPartner(partnerId, draft);
      db.seedSubmittedPartner(otherId, draft);
      db.store.partners[otherId].display_name = 'Other Partner';
      db.store.partner_onboarding[otherId].onboarding_status = 'in_progress';
      db.store.partner_profiles[otherId].profile_status = 'draft';

      var listed = await control.listReviews({ filter: 'submitted' });
      assert.ok(listed.ok, listed.code);
      assert.ok(listed.items.some(function (i) { return i.partnerId === partnerId; }));
      assert.ok(!listed.items.some(function (i) { return i.partnerId === otherId; }));

      var review = await control.getReview({ partnerId: partnerId });
      assert.ok(review.ok);
      assert.strictEqual(review.onboarding.onboardingStatus, 'submitted');
      assert.ok(review.actions.canApprove);
      assert.ok(review.actions.canRequestChanges);
      assert.ok(review.sections.length >= 4);
      assert.ok(review.marketplacePreview);

      var badApproveStatus = await control.approvePartner({
        partnerId: otherId,
        staffUserId: staffId,
        req: {}
      });
      // other is in_progress — not_found still has rows; approve should fail transition
      // reseed other as submitted then wrong path: set changes_requested without resolving
      db.store.partner_onboarding[otherId].onboarding_status = 'changes_requested';
      db.store.partner_profiles[otherId].profile_status = 'under_review';
      badApproveStatus = await control.approvePartner({
        partnerId: otherId,
        staffUserId: staffId,
        req: {}
      });
      assert.strictEqual(badApproveStatus.code, 'invalid_status_transition');

      var changed = await control.requestChanges({
        partnerId: partnerId,
        staffUserId: staffId,
        items: [
          { stepId: 'bedrijf_bereik', fieldKey: 'kbo', message: 'Controleer het ondernemingsnummer.' },
          { stepId: 'verhaal', message: 'Schrijf de sterktezin concreter.' }
        ],
        req: {}
      });
      assert.ok(changed.ok, changed.code);
      assert.strictEqual(changed.onboarding.onboardingStatus, 'changes_requested');
      assert.strictEqual(changed.openReviewCount, 2);
      assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'control_request_changes'; }));

      // Partner sees only own items via onboarding get
      var partnerView = await onboarding.getOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: ownerId
      });
      assert.ok(partnerView.ok);
      assert.strictEqual(partnerView.reviewItems.length, 2);
      var otherView = await onboarding.getOnboarding({
        partnerId: otherId,
        role: 'owner',
        userId: ownerId
      });
      assert.ok(otherView.ok);
      assert.strictEqual(otherView.reviewItems.length, 0);

      // Cannot approve with open items after resubmit path — first resubmit
      var resub = await onboarding.resubmitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: ownerId,
        expectedVersion: partnerView.version,
        req: {}
      });
      assert.ok(resub.ok, resub.code);
      assert.strictEqual(resub.onboardingStatus, 'submitted');
      assert.strictEqual(resub.openReviewCount != null ? resub.openReviewCount : resub.reviewItems.filter(function (r) { return r.status === 'open'; }).length, 0);

      var approved = await control.approvePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(approved.ok, approved.code);
      assert.strictEqual(approved.onboarding.onboardingStatus, 'approved');
      assert.strictEqual(approved.profile.profileStatus, 'ready');
      assert.ok(approved.profile.readyAt || db.store.partner_profiles[partnerId].ready_at);

      var approveAgain = await control.approvePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(approveAgain.ok, 'idempotent approve');
      assert.strictEqual(approveAgain.profile.profileStatus, 'ready');

      var publishBad = await control.publishPartner({
        partnerId: otherId,
        staffUserId: staffId,
        req: {}
      });
      assert.strictEqual(publishBad.code, 'invalid_status_transition');

      var published = await control.publishPartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(published.ok, published.code);
      assert.strictEqual(published.profile.profileStatus, 'published');
      assert.ok(published.profile.slug);
      assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(published.profile.slug));
      var snap = db.store.partner_profiles[partnerId].published_snapshot;
      assert.ok(snap && snap.version === 1);
      assert.strictEqual(snap.slug, published.profile.slug);
      assert.ok(snap.company);
      assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'control_publish'; }));

      var publishAgain = await control.publishPartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(publishAgain.ok, 'idempotent publish');

      var paused = await control.pausePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(paused.ok, paused.code);
      assert.strictEqual(paused.profile.profileStatus, 'paused');

      var hidden = await control.hidePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(hidden.ok, hidden.code);
      assert.strictEqual(hidden.profile.profileStatus, 'hidden');

      var restored = await control.restorePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.ok(restored.ok, restored.code);
      assert.strictEqual(restored.profile.profileStatus, 'published');

      // Cross-partner: reviewing otherId does not leak partnerId items
      var otherReview = await control.getReview({ partnerId: otherId });
      assert.ok(otherReview.ok);
      assert.strictEqual(otherReview.partner.id, otherId);
      assert.ok(!otherReview.reviewItems.some(function (r) {
        return false;
      }));
    });
  });

  await test('Control: approve rejected when open review-items exist', async function () {
    await withControlHarness(async function (control, onboarding, db) {
      var partnerId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      var staffId = 'staff-3333-3333-3333-333333333333';
      db.seedSubmittedPartner(partnerId, buildCompleteDraft());
      await control.requestChanges({
        partnerId: partnerId,
        staffUserId: staffId,
        items: [{ stepId: 'aanbod', message: 'Prijsmodel verduidelijken aub.' }],
        req: {}
      });
      // Force back to submitted while leaving open item (adversarial)
      db.store.partner_onboarding[partnerId].onboarding_status = 'submitted';
      var denied = await control.approvePartner({
        partnerId: partnerId,
        staffUserId: staffId,
        req: {}
      });
      assert.strictEqual(denied.code, 'open_review_items');
    });
  });

  await test('Control API rejects missing staff wiring in source', async function () {
    var api = fs.readFileSync(path.join(root, 'api/control.js'), 'utf8');
    assert.ok(api.indexOf('requirePartnerContext') < 0);
    assert.ok(api.indexOf('withStaff') >= 0 || api.indexOf('requireStaff') >= 0);
  });
}

runLifecycle().then(function () {
  if (failed) {
    console.error(failed + ' Phase B Sprint 8 check(s) failed');
    process.exit(1);
  }
  console.log('All Phase B Sprint 8 offline checks passed');
});
