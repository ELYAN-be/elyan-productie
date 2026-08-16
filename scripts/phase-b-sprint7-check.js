'use strict';
/**
 * Phase B Sprint 7 — P7 Controle & indienen + P8 Review Hub offline checks.
 * Run: node scripts/phase-b-sprint7-check.js
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

var Draft = require('../js/professionals/onboarding-draft');
var Shell = require('../js/professionals/onboarding-shell');
var model = require('../server/onboarding-model');

var VALID_KBO = 'BE0123456749';

function buildCompleteDraft(overrides) {
  var sid = Draft.getServices('schilderwerken')[0].id;
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = 'on_request';
  var prices = {};
  prices[sid] = sp;
  var draft = {
    company: {
      legal_name: 'Sprint7 BV',
      display_name: 'Sprint7 Schilders',
      rechtsvorm: 'bv',
      kbo: VALID_KBO,
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Teststraat 7',
      postcode: '9000',
      gemeente: 'Gent',
      gewest: 'vlaanderen',
      website: '',
      email: 'sprint7@elyan-test.invalid',
      phone: '+32470111222',
      contact_name: 'Sprint Owner',
      contact_role: 'Zaakvoerder',
      language: 'nl-BE'
    },
    service_area: {
      mode: 'radius',
      radius_km: 40,
      provinces: [],
      regions: [],
      public_text: 'Gent + 40 km',
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
      years_active: '6-10',
      team_size: '2-3',
      strength: 'Nette afwerking en duidelijke planning.',
      prefer: 'Interieurprojecten bij particulieren.',
      avoid: '',
      care: '',
      why_choose: '',
      materials: '',
      must_know: '',
      guarantee_line: '',
      show_years_public: true,
      show_team_public: false
    },
    confirmations: {
      data_correct: true,
      editorial_ok: true
    }
  };
  if (!overrides) return draft;
  return model.mergeDraft(draft, overrides);
}

test('HTML has P7 summary + checkboxes + P8 Review Hub (no placeholders/Google connect)', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
  assert.ok(html.indexOf('submitOnboardingBtn') >= 0);
  assert.ok(html.indexOf('f_data_correct') >= 0);
  assert.ok(html.indexOf('f_editorial_ok') >= 0);
  assert.ok(html.indexOf('controleSections') >= 0);
  assert.ok(html.indexOf('reviewOpenItems') >= 0);
  assert.ok(html.indexOf('reviewGoogleTeaser') >= 0);
  assert.ok(html.indexOf('prof-placeholder') < 0);
  assert.ok(html.toLowerCase().indexOf('google connect') < 0);
});

test('client wires submit/resubmit + Review Hub render', function () {
  var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('submitOrResubmit') >= 0);
  assert.ok(src.indexOf('renderControlePanel') >= 0);
  assert.ok(src.indexOf('renderReviewHubPanel') >= 0);
  assert.ok(src.indexOf('onboarding-submit') >= 0);
  assert.ok(src.indexOf('onboarding-resubmit') >= 0);
  assert.ok(src.indexOf('evaluateSubmitGates') >= 0);
  assert.ok(src.indexOf('lockCoreFieldsWhileSubmitted') >= 0);
});

test('submit-gate matrix: complete draft passes; missing P2/P3/P4/P5/checkboxes fail', function () {
  var full = buildCompleteDraft();
  assert.ok(Draft.evaluateSubmitGates(full).ok);

  var noP2 = buildCompleteDraft({ company: { legal_name: '' } });
  var g2 = Draft.evaluateSubmitGates(noP2);
  assert.ok(!g2.ok);
  assert.ok(g2.missing.some(function (m) { return m.stepId === 'bedrijf_bereik'; }));

  var noP3 = buildCompleteDraft({ craft: { service_ids: [] } });
  var g3 = Draft.evaluateSubmitGates(noP3);
  assert.ok(!g3.ok);
  assert.ok(g3.missing.some(function (m) { return m.fieldKey === 'service_ids'; }));

  var noP4 = buildCompleteDraft({ offer: { client_types: [] } });
  var g4 = Draft.evaluateSubmitGates(noP4);
  assert.ok(!g4.ok);
  assert.ok(g4.missing.some(function (m) { return m.stepId === 'aanbod'; }));

  var noP5 = buildCompleteDraft({ story: { strength: '' } });
  var g5 = Draft.evaluateSubmitGates(noP5);
  assert.ok(!g5.ok);
  assert.ok(g5.missing.some(function (m) { return m.stepId === 'verhaal'; }));

  var noCb1 = buildCompleteDraft({ confirmations: { data_correct: false, editorial_ok: true } });
  assert.ok(!Draft.evaluateSubmitGates(noCb1).ok);
  var noCb2 = buildCompleteDraft({ confirmations: { data_correct: true, editorial_ok: false } });
  assert.ok(!Draft.evaluateSubmitGates(noCb2).ok);
});

test('0 photos never blocks submit; website optional; deep-links present', function () {
  var full = buildCompleteDraft();
  assert.ok(Draft.evaluateSubmitGates(full).ok);
  assert.ok(Draft.validateP6Soft([]).ok);
  assert.ok(Draft.validateP6Soft([]).softNudge);

  var missing = Draft.evaluateSubmitGates(buildCompleteDraft({ company: { kbo: '' } })).missing;
  assert.ok(missing.some(function (m) {
    return m.fieldKey === 'kbo' && m.href.indexOf('/professionals/onboarding/bedrijf_bereik') === 0;
  }));
});

test('profile strength derived only — Basis/Sterk/Uitstekend; never blocks submit', function () {
  var empty = Draft.evaluateProfileStrength({}, []);
  assert.strictEqual(empty.level, 'Basis');
  var full = Draft.evaluateProfileStrength(buildCompleteDraft(), []);
  assert.ok(full.level === 'Sterk' || full.level === 'Uitstekend');
  assert.ok(typeof full.score === 'number');
  assert.ok(full.tip);
  assert.ok(Draft.evaluateSubmitGates(buildCompleteDraft()).ok);
});

test('controle sections summarize P2–P6', function () {
  var sections = Draft.buildControleSections(buildCompleteDraft(), []);
  assert.strictEqual(sections.length, 5);
  assert.strictEqual(sections[0].title, 'Bedrijf & bereik');
  assert.strictEqual(sections[4].title, 'Portfolio');
  assert.ok(sections[4].ok);
});

test('shell: changes_requested correction mode; submitted polish allowlist', function () {
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'changes_requested', stepId: 'controle' }));
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'portfolio' }));
  assert.ok(!Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'aanbod' }));
  assert.deepStrictEqual(model.editableSectionsFor('submitted'), ['portfolio', 'verhaal_optional']);
});

function createMemoryDb() {
  var store = {
    partner_onboarding: {},
    partner_profiles: {},
    partner_profile_assets: {},
    partner_review_items: {},
    audit_logs: []
  };

  function matchFilters(row, filters) {
    return filters.every(function (f) {
      if (f.op === 'eq') return row[f.col] === f.val;
      if (f.op === 'in') return f.val.indexOf(row[f.col]) >= 0;
      return true;
    });
  }

  function tableApi(name) {
    var filters = [];
    var payload = null;
    var mode = 'select';
    var orderAsc = true;
    var api = {
      select: function () { mode = mode === 'update' || mode === 'upsert' || mode === 'insert' ? mode : 'select'; return api; },
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
      delete: function () {
        mode = 'delete';
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
      order: function () { return api; },
      maybeSingle: async function () {
        var result = await api._exec();
        if (Array.isArray(result.data)) {
          return { data: result.data[0] || null, error: result.error };
        }
        return result;
      },
      single: async function () {
        var result = await api.maybeSingle();
        if (!result.data) return { data: null, error: { message: 'not found' } };
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
        if (mode === 'delete') {
          var toDelete = Object.keys(store[name] || {})
            .map(function (k) { return store[name][k]; })
            .filter(function (r) { return matchFilters(r, filters); });
          toDelete.forEach(function (r) {
            var key = r.id || r.partner_id;
            delete store[name][key];
          });
          return { data: toDelete, error: null };
        }
        if (mode === 'upsert' || mode === 'insert') {
          var key = payload.partner_id || payload.id;
          if (name === 'partner_review_items' || name === 'partner_profile_assets') {
            if (!payload.id) payload.id = 'row-' + Object.keys(store[name]).length;
            key = payload.id;
            if (!store[name][key]) store[name][key] = Object.assign({}, payload);
            else store[name][key] = Object.assign({}, store[name][key], payload);
            return { data: store[name][key], error: null };
          }
          if (!store[name][key]) {
            var base =
              name === 'partner_onboarding'
                ? {
                    partner_id: key,
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
                    changes_requested_at: null
                  }
                : {
                    partner_id: key,
                    profile_status: 'not_created',
                    slug: null,
                    primary_category_id: null,
                    specialty_line: null,
                    cover_asset_id: null,
                    published_at: null,
                    paused_at: null,
                    ready_at: null
                  };
            store[name][key] = Object.assign(base, payload);
          }
          return { data: store[name][key], error: null };
        }
        if (mode === 'update') {
          var rows = Object.keys(store[name])
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
        // select — return clones so callers are not mutated by later updates
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
    }
  };
}

async function withHarness(fn) {
  var db = createMemoryDb();
  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var onboardingPath = require.resolve('../server/onboarding');
  var modelPath = require.resolve('../server/onboarding-model');

  var realSupabase = require.cache[supabasePath];
  var realAudit = require.cache[auditPath];

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
      createAdminClient: function () { return db; }
    }
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
  delete require.cache[onboardingPath];
  delete require.cache[modelPath];

  try {
    var onboarding = require('../server/onboarding');
    await fn(onboarding, db);
  } finally {
    if (realSupabase) require.cache[supabasePath] = realSupabase;
    else delete require.cache[supabasePath];
    if (realAudit) require.cache[auditPath] = realAudit;
    else delete require.cache[auditPath];
    delete require.cache[onboardingPath];
    delete require.cache[modelPath];
    require('../server/onboarding-model');
    require('../server/onboarding');
  }
}


async function runServerMatrix() {
  await test('server submit gates + idempotent submit + under_review', async function () {
    await withHarness(async function (onboarding, db) {
      var partnerId = '77777777-7777-7777-7777-777777777777';
      var userId = '88888888-8888-8888-8888-888888888888';
      await onboarding.getOnboarding({ partnerId: partnerId, role: 'owner', userId: userId });

      var saved = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: 1,
        currentStepId: 'controle',
        draft: buildCompleteDraft({ confirmations: { data_correct: false, editorial_ok: true } }),
        req: {}
      });
      assert.ok(saved.ok, saved.code);

      var denied = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: saved.version,
        req: {}
      });
      assert.strictEqual(denied.code, 'submit_incomplete');
      assert.ok(denied.missing.some(function (m) { return m.fieldKey === 'data_correct'; }));

      var ready = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: saved.version,
        draft: { confirmations: { data_correct: true, editorial_ok: true } },
        req: {}
      });
      assert.ok(ready.ok, ready.code);

      var submitted = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: ready.version,
        req: {}
      });
      assert.ok(submitted.ok, submitted.code);
      assert.strictEqual(submitted.onboardingStatus, 'submitted');
      assert.strictEqual(submitted.profileStatus, 'under_review');
      assert.ok(submitted.profileStrength);

      var again = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: submitted.version,
        req: {}
      });
      assert.ok(again.ok);
      assert.strictEqual(again.onboardingStatus, 'submitted');

      var member = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'member',
        userId: userId,
        expectedVersion: submitted.version,
        req: {}
      });
      assert.strictEqual(member.code, 'forbidden');

      db.store.partner_onboarding[partnerId].onboarding_status = 'changes_requested';
      db.store.partner_review_items['ri-7'] = {
        id: 'ri-7',
        partner_id: partnerId,
        step_id: 'bedrijf_bereik',
        field_key: 'kbo',
        message: 'Controleer KBO',
        item_status: 'open',
        created_at: new Date().toISOString(),
        resolved_at: null
      };
      // autosave must not clear open review items
      var autosave = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: submitted.version,
        draft: { company: { contact_role: 'Zaakvoerder' } },
        req: {}
      });
      assert.ok(autosave.ok, autosave.code);
      assert.strictEqual(db.store.partner_review_items['ri-7'].item_status, 'open');

      var resub = await onboarding.resubmitOnboarding({
        partnerId: partnerId,
        role: 'admin',
        userId: userId,
        expectedVersion: autosave.version,
        req: {}
      });
      assert.ok(resub.ok, resub.code);
      assert.strictEqual(resub.onboardingStatus, 'submitted');
      assert.strictEqual(db.store.partner_review_items['ri-7'].item_status, 'resolved');
    });
  });

  await test('approved Review Hub payload + strength never authZ', async function () {
    await withHarness(async function (onboarding, db) {
      var partnerId = '99999999-9999-9999-9999-999999999999';
      var userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      await onboarding.getOnboarding({ partnerId: partnerId, role: 'owner', userId: userId });
      var saved = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: 1,
        draft: buildCompleteDraft(),
        currentStepId: 'controle',
        req: {}
      });
      var submitted = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: saved.version,
        req: {}
      });
      assert.ok(submitted.ok, submitted.code);
      db.store.partner_onboarding[partnerId].onboarding_status = 'approved';
      db.store.partner_onboarding[partnerId].approved_at = new Date().toISOString();
      db.store.partner_profiles[partnerId].profile_status = 'ready';
      var got = await onboarding.getOnboarding({ partnerId: partnerId, role: 'owner', userId: userId });
      assert.strictEqual(got.onboardingStatus, 'approved');
      assert.strictEqual(got.profileStatus, 'ready');
      assert.ok(!got.canEdit);
      assert.ok(got.profileStrength);
      assert.ok(got.profileStrength.level);
    });
  });
}

test('CSS covers controle/review hub mobile', function () {
  var css = fs.readFileSync(path.join(root, 'css/professionals.css'), 'utf8');
  assert.ok(css.indexOf('prof-controle-sections') >= 0);
  assert.ok(css.indexOf('prof-review-layout') >= 0);
  assert.ok(css.indexOf('prof-strength') >= 0);
  assert.ok(css.indexOf('@media (max-width:640px)') >= 0);
});

test('Phase A + Sprint 1–6 files still present', function () {
  [
    'professionals/login.html',
    'professionals/dashboard.html',
    'professionals/onboarding.html',
    'js/professionals/onboarding-draft.js',
    'js/professionals/onboarding-portfolio.js',
    'server/onboarding.js',
    'server/assets.js',
    'scripts/phase-b-sprint6-check.js'
  ].forEach(function (rel) {
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  });
});

Promise.resolve()
  .then(function () { return runServerMatrix(); })
  .then(function () {
    if (failed) {
      console.error('\n' + failed + ' Sprint 7 check(s) failed');
      process.exit(1);
    }
    console.log('\nAll Sprint 7 checks passed');
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
