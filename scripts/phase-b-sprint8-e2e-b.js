#!/usr/bin/env node
/**
 * Sprint 8 E2E B — submit → changes requested → partner correct → resubmit → approve → publish
 * In-memory Control + onboarding services (no live Supabase). @elyan-test.invalid only.
 */
'use strict';

var assert = require('assert');
var Draft = require('../js/professionals/onboarding-draft');

function buildDraft() {
  var sid = Draft.getServices('schilderwerken')[0].id;
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = 'on_request';
  var prices = {};
  prices[sid] = sp;
  return {
    company: {
      legal_name: 'E2E8B BV',
      display_name: 'E2E8B Partner',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Testlaan 1',
      postcode: '1000',
      gemeente: 'Brussel',
      gewest: 'brussel',
      website: '',
      email: 'e2e8b-owner@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'E2E8B Owner',
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

// Reuse sprint8 harness by requiring the check's patterns inline (duplicate minimal)
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
      select: function () { return api; },
      insert: function (row) { mode = 'insert'; payload = row; return api; },
      upsert: function (row) { mode = 'upsert'; payload = row; return api; },
      update: function (row) { mode = 'update'; payload = row; return api; },
      eq: function (col, val) { filters.push({ op: 'eq', col: col, val: val }); return api; },
      in: function (col, vals) { filters.push({ op: 'in', col: col, val: vals }); return api; },
      order: function () { return api; },
      maybeSingle: async function () {
        var result = await api._exec();
        if (Array.isArray(result.data)) return { data: result.data[0] || null, error: result.error };
        return result;
      },
      then: function (resolve, reject) { return api._exec().then(resolve, reject); },
      _exec: async function () {
        if (name === 'audit_logs' && mode === 'insert') {
          store.audit_logs.push(payload);
          return { data: payload, error: null };
        }
        if (mode === 'insert' || mode === 'upsert') {
          var rowsIn = Array.isArray(payload) ? payload : [payload];
          var out = rowsIn.map(function (row) {
            var key = row.partner_id || row.id;
            if (name === 'partner_review_items' || name === 'partner_profile_assets') {
              if (!row.id) { seq += 1; row.id = 'ri-' + seq; }
              key = row.id;
            }
            if (!store[name]) store[name] = {};
            if (mode === 'upsert' && !store[name][key]) {
              if (name === 'partner_onboarding') store[name][key] = Object.assign(emptyOnboarding(key), row);
              else if (name === 'partner_profiles') store[name][key] = Object.assign(emptyProfile(key), row);
              else store[name][key] = Object.assign({}, row);
            } else {
              store[name][key] = Object.assign({}, store[name][key] || {}, row);
            }
            return store[name][key];
          });
          return { data: Array.isArray(payload) ? out : out[0], error: null };
        }
        if (mode === 'update') {
          var rows = Object.keys(store[name] || {}).map(function (k) { return store[name][k]; })
            .filter(function (r) { return matchFilters(r, filters); });
          if (!rows.length) return { data: null, error: null };
          rows.forEach(function (r) {
            Object.keys(payload).forEach(function (k) { r[k] = payload[k]; });
          });
          return { data: rows.length === 1 ? rows[0] : rows, error: null };
        }
        var selected = Object.keys(store[name] || {}).map(function (k) { return Object.assign({}, store[name][k]); })
          .filter(function (r) { return matchFilters(r, filters); });
        return { data: selected, error: null };
      }
    };
    return api;
  }
  return {
    store: store,
    from: function (name) { return tableApi(name); }
  };
}

async function main() {
  var db = createMemoryDb();
  var partnerId = 'e2e8bbb1-2222-2222-2222-222222222222';
  var staffId = 'e2e8staff-2222-2222-2222-222222222222';
  var ownerId = 'e2e8owner-2222-2222-2222-222222222222';
  var draft = buildDraft();

  db.store.partners[partnerId] = {
    id: partnerId,
    legal_name: 'E2E8B BV',
    display_name: 'E2E8B Partner',
    account_status: 'active'
  };
  db.store.partner_onboarding[partnerId] = {
    partner_id: partnerId,
    onboarding_status: 'submitted',
    current_step_id: 'review_hub',
    draft: draft,
    version: 4,
    started_at: '2026-08-01T00:00:00.000Z',
    submitted_at: '2026-08-15T00:00:00.000Z',
    submitted_by: ownerId,
    approved_at: null,
    last_saved_at: null,
    last_saved_by: null,
    review_notes: null,
    changes_requested_at: null,
    changes_requested_by: null
  };
  db.store.partner_profiles[partnerId] = {
    partner_id: partnerId,
    profile_status: 'under_review',
    slug: null,
    primary_category_id: 'schilderwerken',
    specialty_line: null,
    cover_asset_id: null,
    published_snapshot: {},
    published_at: null,
    paused_at: null,
    hidden_at: null,
    ready_at: null
  };

  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var controlPath = require.resolve('../server/control');
  var onboardingPath = require.resolve('../server/onboarding');
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
      writeAudit: async function (opts) { db.store.audit_logs.push(opts); }
    }
  };
  delete require.cache[controlPath];
  delete require.cache[onboardingPath];

  try {
    var control = require('../server/control');
    var onboarding = require('../server/onboarding');

    var changed = await control.requestChanges({
      partnerId: partnerId,
      staffUserId: staffId,
      items: [
        { stepId: 'verhaal', fieldKey: 'strength', message: 'Maak de sterktezin concreter.' },
        { stepId: 'bedrijf_bereik', message: 'Controleer de handelsnaam.' }
      ],
      req: {}
    });
    assert.ok(changed.ok, changed.code);
    assert.strictEqual(changed.onboarding.onboardingStatus, 'changes_requested');
    assert.strictEqual(changed.openReviewCount, 2);

    var partnerSee = await onboarding.getOnboarding({
      partnerId: partnerId,
      role: 'owner',
      userId: ownerId
    });
    assert.strictEqual(partnerSee.reviewItems.filter(function (r) { return r.status === 'open'; }).length, 2);

    // Partner corrects story
    var saved = await onboarding.saveOnboarding({
      partnerId: partnerId,
      role: 'owner',
      userId: ownerId,
      expectedVersion: partnerSee.version,
      draft: {
        story: {
          strength: 'Precieze binnenschilderwerken met nette oplevering.'
        }
      },
      req: {}
    });
    assert.ok(saved.ok, saved.code);

    var resub = await onboarding.resubmitOnboarding({
      partnerId: partnerId,
      role: 'owner',
      userId: ownerId,
      expectedVersion: saved.version,
      req: {}
    });
    assert.ok(resub.ok, resub.code);
    assert.strictEqual(resub.onboardingStatus, 'submitted');
    assert.strictEqual(resub.reviewItems.filter(function (r) { return r.status === 'open'; }).length, 0);

    var approved = await control.approvePartner({
      partnerId: partnerId,
      staffUserId: staffId,
      req: {}
    });
    assert.ok(approved.ok, approved.code);
    assert.strictEqual(approved.profile.profileStatus, 'ready');

    var published = await control.publishPartner({
      partnerId: partnerId,
      staffUserId: staffId,
      req: {}
    });
    assert.ok(published.ok, published.code);
    assert.strictEqual(published.profile.profileStatus, 'published');
    assert.ok(published.profile.slug);
    assert.ok(db.store.partner_profiles[partnerId].published_snapshot.version === 1);
    assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'control_request_changes'; }));
    assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'control_approve'; }));
    assert.ok(db.store.audit_logs.some(function (a) { return a.action === 'control_publish'; }));

    console.log('OK  Sprint 8 E2E B changes → resubmit → approve → publish');
  } finally {
    if (realSupabase) require.cache[supabasePath] = realSupabase;
    else delete require.cache[supabasePath];
    if (realAudit) require.cache[auditPath] = realAudit;
    else delete require.cache[auditPath];
    delete require.cache[controlPath];
    delete require.cache[onboardingPath];
  }
}

main().catch(function (err) {
  console.error('FAIL E2E B —', err && err.message ? err.message : err);
  process.exit(1);
});
