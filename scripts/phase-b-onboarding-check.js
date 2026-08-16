'use strict';
/**
 * Phase B Sprint 1 — onboarding foundation offline checks.
 * Run: node scripts/phase-b-onboarding-check.js
 *
 * Covers: schema, draft model, status transitions, authZ rules, optimistic lock,
 * submit/resubmit lifecycle (in-memory harness), Phase A backward compatibility.
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

var model = require('../server/onboarding-model');

// ---------------------------------------------------------------------------
// Migration / Phase A compatibility
// ---------------------------------------------------------------------------

test('Phase B migration creates required tables and statuses', function () {
  var sql = fs.readFileSync(
    path.join(root, 'supabase/migrations/20260816_phase_b_onboarding_foundation.sql'),
    'utf8'
  );
  [
    'partner_onboarding',
    'partner_profiles',
    'partner_profile_assets',
    'partner_review_items',
    'onboarding_status',
    'profile_status',
    'current_step_id',
    'not_started',
    'in_progress',
    'submitted',
    'changes_requested',
    'approved',
    'not_created',
    'under_review',
    'published',
    'paused',
    'hidden',
    'bedrijf_bereik',
    'review_hub',
    'cover_asset_id',
    'ENABLE ROW LEVEL SECURITY',
    'GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_onboarding TO service_role'
  ].forEach(function (needle) {
    assert.ok(sql.indexOf(needle) >= 0, needle);
  });
  // Draft is jsonb on onboarding — no separate temp/drafts table
  assert.ok(sql.indexOf('draft jsonb') >= 0);
  assert.ok(sql.indexOf('partner_profile_drafts') < 0);
  assert.ok(sql.indexOf('TEMP TABLE') < 0 && sql.indexOf('temp_') < 0);
  // Phase A partners table not redefined
  assert.ok(!/CREATE TABLE public\.partners\s*\(/.test(sql));
});

test('Phase A foundation still has no onboarding_status (no regression)', function () {
  var sql = fs.readFileSync(
    path.join(root, 'supabase/migrations/20260814_phase_a_foundation.sql'),
    'utf8'
  );
  assert.ok(sql.indexOf('onboarding_status') < 0);
  assert.ok(sql.indexOf('account_status') >= 0);
});

test('Phase B service_role grants repair migration exists', function () {
  var sql = fs.readFileSync(
    path.join(root, 'supabase/migrations/20260816_phase_b_service_role_grants.sql'),
    'utf8'
  );
  ['partner_onboarding', 'partner_profiles', 'partner_profile_assets', 'partner_review_items'].forEach(
    function (t) {
      assert.ok(sql.indexOf(t) >= 0, t);
    }
  );
});

test('authenticated SELECT only — no write grants on Phase B tables', function () {
  var sql = fs.readFileSync(
    path.join(root, 'supabase/migrations/20260816_phase_b_onboarding_foundation.sql'),
    'utf8'
  );
  assert.ok(/GRANT SELECT ON public\.partner_onboarding TO authenticated/.test(sql));
  assert.ok(!/GRANT .+INSERT.+ON public\.partner_onboarding TO authenticated/.test(sql));
  assert.ok(!/GRANT .+ON public\.partner_onboarding TO anon/.test(sql));
  assert.ok(sql.indexOf('REVOKE ALL ON public.partner_onboarding FROM anon') >= 0);
});

// ---------------------------------------------------------------------------
// Model / status / draft
// ---------------------------------------------------------------------------

test('step ids match V2 frozen set', function () {
  assert.deepStrictEqual(model.STEP_IDS, [
    'start',
    'bedrijf_bereik',
    'ambacht',
    'aanbod',
    'verhaal',
    'portfolio',
    'controle',
    'review_hub'
  ]);
});

test('role matrix: owner/admin edit, member read-only', function () {
  assert.ok(model.canEditRole('owner'));
  assert.ok(model.canEditRole('admin'));
  assert.ok(!model.canEditRole('member'));
  assert.ok(model.canReadRole('member'));
});

test('status transition helpers', function () {
  assert.ok(model.canAutosave('not_started'));
  assert.ok(model.canAutosave('in_progress'));
  assert.ok(model.canAutosave('changes_requested'));
  assert.ok(model.canAutosave('submitted'));
  assert.ok(!model.canAutosave('approved'));
  assert.ok(model.canSubmit('in_progress'));
  assert.ok(!model.canSubmit('submitted'));
  assert.ok(model.canResubmit('changes_requested'));
  assert.ok(!model.canResubmit('in_progress'));
});

test('mergeDraft deep-merges objects and replaces arrays', function () {
  var merged = model.mergeDraft(
    { company: { legal_name: 'A', phone: '1' }, services: ['x'] },
    { company: { phone: '2' }, services: ['y'] }
  );
  assert.strictEqual(merged.company.legal_name, 'A');
  assert.strictEqual(merged.company.phone, '2');
  assert.deepStrictEqual(merged.services, ['y']);
});

test('validateDraftStructure rejects malformed and google_intent', function () {
  assert.ok(model.validateDraftStructure(null).ok);
  assert.ok(model.validateDraftStructure({ company: {} }).ok);
  assert.ok(!model.validateDraftStructure([]).ok);
  assert.ok(!model.validateDraftStructure('x').ok);
  assert.strictEqual(model.validateDraftStructure({ google_intent: true }).code, 'invalid_draft');
});

test('editableSections and reviewHub flags', function () {
  assert.ok(model.editableSectionsFor('in_progress').indexOf('ambacht') >= 0);
  assert.deepStrictEqual(model.editableSectionsFor('submitted'), ['portfolio', 'verhaal_optional']);
  assert.deepStrictEqual(model.editableSectionsFor('approved'), []);
  assert.ok(model.isReviewHub('submitted'));
  assert.ok(!model.isReviewHub('in_progress'));
});

test('draftCompletion counts domains', function () {
  var c = model.draftCompletion({ company: { a: 1 }, craft: { primary_category_id: 'dakwerken' } });
  assert.strictEqual(c.domainsFilled, 2);
  assert.strictEqual(c.domainsTotal, 7);
});

test('API router wires Phase B actions and Phase A actions remain', function () {
  var src = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  [
    'onboarding',
    'onboarding-status',
    'onboarding-save',
    'onboarding-submit',
    'onboarding-resubmit',
    'session',
    'activate',
    'setup-password'
  ].forEach(function (a) {
    assert.ok(src.indexOf("'" + a + "'") >= 0 || src.indexOf('"' + a + '"') >= 0, a);
  });
  assert.ok(src.indexOf('requirePartnerContext') >= 0);
});

test('server modules export definitive APIs (no TODO stubs)', function () {
  var onboarding = require('../server/onboarding');
  ['getOnboarding', 'getOnboardingStatus', 'saveOnboarding', 'submitOnboarding', 'resubmitOnboarding'].forEach(
    function (fn) {
      assert.strictEqual(typeof onboarding[fn], 'function', fn);
    }
  );
  var src = fs.readFileSync(path.join(root, 'server/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('TODO') < 0);
  assert.ok(src.indexOf('FIXME') < 0);
});

// ---------------------------------------------------------------------------
// In-memory lifecycle harness (no live Supabase / no invites)
// ---------------------------------------------------------------------------

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

async function runLifecycle() {
  await test('lifecycle: get → save → submit → changes_requested → resubmit', async function () {
    await withHarness(async function (onboarding, db) {
      var partnerId = '11111111-1111-1111-1111-111111111111';
      var userId = '22222222-2222-2222-2222-222222222222';

      var got = await onboarding.getOnboarding({ partnerId: partnerId, role: 'owner', userId: userId });
      assert.ok(got.ok);
      assert.strictEqual(got.onboardingStatus, 'not_started');
      assert.strictEqual(got.profileStatus, 'not_created');
      assert.strictEqual(got.version, 1);
      assert.strictEqual(got.currentStepId, 'start');

      var saved = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: 1,
        currentStepId: 'bedrijf_bereik',
        draft: { company: { legal_name: 'Test BV', display_name: 'Test' } },
        req: {}
      });
      assert.ok(saved.ok, saved.code);
      assert.strictEqual(saved.onboardingStatus, 'in_progress');
      assert.strictEqual(saved.profileStatus, 'draft');
      assert.strictEqual(saved.version, 2);
      assert.strictEqual(saved.draft.company.legal_name, 'Test BV');
      assert.strictEqual(saved.currentStepId, 'bedrijf_bereik');
      assert.ok(saved.canSubmit);

      var conflict = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: 1,
        draft: { company: { legal_name: 'Stale' } },
        req: {}
      });
      assert.ok(!conflict.ok);
      assert.strictEqual(conflict.code, 'version_conflict');

      var memberDenied = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'member',
        userId: userId,
        expectedVersion: 2,
        draft: { company: { legal_name: 'Nope' } },
        req: {}
      });
      assert.strictEqual(memberDenied.code, 'forbidden');

      var submitted = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: 2,
        req: {}
      });
      assert.ok(submitted.ok, submitted.code);
      assert.strictEqual(submitted.onboardingStatus, 'submitted');
      assert.strictEqual(submitted.profileStatus, 'under_review');
      assert.strictEqual(submitted.currentStepId, 'review_hub');
      assert.ok(submitted.reviewHub);
      assert.ok(!submitted.canSubmit);

      var locked = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: submitted.version,
        draft: { company: { legal_name: 'Locked' } },
        req: {}
      });
      assert.strictEqual(locked.code, 'section_locked');

      var polish = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: submitted.version,
        draft: {
          portfolio: {},
          story: {
            why_choose: 'Klanten kiezen ons voor nette planning.',
            guarantee_line: '2 jaar op plaatsing'
          }
        },
        currentStepId: 'portfolio',
        req: {}
      });
      assert.ok(polish.ok, polish.code);

      // Simulate Control request_changes
      var row = db.store.partner_onboarding[partnerId];
      row.onboarding_status = 'changes_requested';
      row.changes_requested_at = new Date().toISOString();
      db.store.partner_profiles[partnerId].profile_status = 'draft';
      db.store.partner_review_items['ri-1'] = {
        id: 'ri-1',
        partner_id: partnerId,
        step_id: 'bedrijf_bereik',
        field_key: 'kbo',
        message: 'KBO controleren',
        item_status: 'open',
        created_at: new Date().toISOString(),
        resolved_at: null
      };

      var status = await onboarding.getOnboardingStatus({
        partnerId: partnerId,
        role: 'admin',
        userId: userId
      });
      assert.ok(status.ok);
      assert.strictEqual(status.onboardingStatus, 'changes_requested');
      assert.strictEqual(status.openReviewCount, 1);
      assert.ok(status.canResubmit);

      var resub = await onboarding.resubmitOnboarding({
        partnerId: partnerId,
        role: 'admin',
        userId: userId,
        expectedVersion: polish.version,
        req: {}
      });
      assert.ok(resub.ok, resub.code);
      assert.strictEqual(resub.onboardingStatus, 'submitted');
      assert.strictEqual(resub.profileStatus, 'under_review');
      assert.strictEqual(db.store.partner_review_items['ri-1'].item_status, 'resolved');

      var badSubmit = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: userId,
        expectedVersion: resub.version,
        req: {}
      });
      assert.strictEqual(badSubmit.code, 'invalid_status_transition');

      assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'onboarding_started'; }));
      assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'onboarding_submitted'; }));
      assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'onboarding_resubmitted'; }));
    });
  });

  await test('member can read onboarding but not submit', async function () {
    await withHarness(async function (onboarding) {
      var partnerId = '33333333-3333-3333-3333-333333333333';
      var got = await onboarding.getOnboarding({ partnerId: partnerId, role: 'member', userId: 'u' });
      assert.ok(got.ok);
      assert.ok(!got.canEdit);
      assert.ok(!got.canSubmit);
      var sub = await onboarding.submitOnboarding({
        partnerId: partnerId,
        role: 'member',
        userId: 'u',
        expectedVersion: 1,
        req: {}
      });
      assert.strictEqual(sub.code, 'forbidden');
    });
  });

  await test('malformed save payload rejected', async function () {
    await withHarness(async function (onboarding) {
      var partnerId = '44444444-4444-4444-4444-444444444444';
      await onboarding.getOnboarding({ partnerId: partnerId, role: 'owner', userId: 'u' });
      var bad = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u',
        expectedVersion: 1,
        draft: ['not', 'object'],
        req: {}
      });
      assert.strictEqual(bad.code, 'invalid_draft');
      var noVer = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u',
        draft: {},
        req: {}
      });
      assert.strictEqual(noVer.code, 'version_required');
      var badStep = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u',
        expectedVersion: 1,
        currentStepId: 'unknown_step',
        req: {}
      });
      assert.strictEqual(badStep.code, 'invalid_step');
    });
  });
}

runLifecycle().then(function () {
  console.log('');
  if (failed) {
    console.error(failed + ' Phase B onboarding check(s) failed');
    process.exit(1);
  }
  console.log('All Phase B onboarding offline checks passed');
});
