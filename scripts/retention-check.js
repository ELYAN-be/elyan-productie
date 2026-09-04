/**
 * ELYAN retention policy checks — synthetic aged records only (in-memory).
 * No live Supabase. No production deletes.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var retention = require('../server/retention');
var failed = 0;

function test(name, fn) {
  try {
    var ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret
        .then(function () {
          console.log('ok - ' + name);
        })
        .catch(function (e) {
          failed += 1;
          console.error('FAIL - ' + name);
          console.error('  ' + (e && e.message ? e.message : e));
        });
    }
    console.log('ok - ' + name);
    return Promise.resolve();
  } catch (e) {
    failed += 1;
    console.error('FAIL - ' + name);
    console.error('  ' + (e && e.message ? e.message : e));
    return Promise.resolve();
  }
}

function source(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function makeAdmin(seed) {
  seed = seed || {};
  var tables = {
    retention_holds: seed.retention_holds || [],
    customer_requests: seed.customer_requests || [],
    partner_interest_candidates: seed.partner_interest_candidates || [],
    partner_onboarding: seed.partner_onboarding || [],
    partners: seed.partners || [],
    partner_profiles: seed.partner_profiles || [],
    partner_profile_assets: seed.partner_profile_assets || [],
    audit_logs: seed.audit_logs || [],
    analytics_daily_counts: seed.analytics_daily_counts || [],
    interest_intakes: seed.interest_intakes || []
  };
  var deleted = [];

  function matches(row, filters) {
    for (var i = 0; i < filters.length; i++) {
      var f = filters[i];
      if (f.op === 'eq' && row[f.col] !== f.val) return false;
      if (f.op === 'in' && f.val.indexOf(row[f.col]) < 0) return false;
      if (f.op === 'is' && f.val === null && row[f.col] != null) return false;
      if (f.op === 'not' && f.val === null && row[f.col] == null) return false;
      if (f.op === 'lt') {
        if (row[f.col] == null) return false;
        if (!(String(row[f.col]) < String(f.val))) return false;
      }
    }
    return true;
  }

  function query(table) {
    var filters = [];
    var limitN = null;
    var api = {
      select: function () { return api; },
      eq: function (col, val) { filters.push({ op: 'eq', col: col, val: val }); return api; },
      in: function (col, val) { filters.push({ op: 'in', col: col, val: val }); return api; },
      is: function (col, val) { filters.push({ op: 'is', col: col, val: val }); return api; },
      not: function (col, op, val) {
        if (op === 'is') filters.push({ op: 'not', col: col, val: val });
        return api;
      },
      lt: function (col, val) { filters.push({ op: 'lt', col: col, val: val }); return api; },
      limit: function (n) { limitN = n; return api; },
      maybeSingle: async function () {
        var rows = tables[table].filter(function (r) { return matches(r, filters); });
        return { data: rows[0] || null, error: null };
      },
      then: function (resolve) {
        var rows = tables[table].filter(function (r) { return matches(r, filters); });
        if (limitN != null) rows = rows.slice(0, limitN);
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      }
    };
    // Make thenable
    api.update = function (patch) {
      return {
        eq: async function (col, val) {
          tables[table].forEach(function (r) {
            if (r[col] === val) Object.assign(r, patch);
          });
          return { data: null, error: null };
        }
      };
    };
    api.delete = function () {
      var dels = [];
      function runDelete() {
        tables[table] = tables[table].filter(function (r) {
          for (var i = 0; i < dels.length; i++) {
            var d = dels[i];
            if (d.op === 'eq' && r[d.col] !== d.val) return true;
            if (d.op === 'lt' && !(String(r[d.col]) < String(d.val))) return true;
          }
          deleted.push({ table: table, id: r.id || r.event_date || r[dels[0] && dels[0].col] });
          return false;
        });
        return { data: null, error: null };
      }
      var chain = {
        eq: function (col, val) {
          dels.push({ op: 'eq', col: col, val: val });
          return chain;
        },
        lt: function (col, val) {
          dels.push({ op: 'lt', col: col, val: val });
          return chain;
        },
        then: function (resolve, reject) {
          return Promise.resolve(runDelete()).then(resolve, reject);
        }
      };
      return chain;
    };
    return api;
  }

  return {
    from: query,
    _tables: tables,
    _deleted: deleted
  };
}

async function main() {
  await test('privacybeleid retention section states concrete terms and no fake 10-year claim', function () {
    var html = source('privacybeleid.html');
    assert.ok(html.indexOf('Bewaartermijnen') >= 0);
    assert.ok(html.indexOf('24 maanden') >= 0);
    assert.ok(html.indexOf('12 maanden') >= 0);
    assert.ok(html.indexOf('6 maanden') >= 0);
    assert.ok(html.indexOf('90 dagen') >= 0);
    assert.ok(html.indexOf('36 maanden') >= 0);
    assert.ok(html.indexOf('10 jaar') < 0 && html.indexOf('10-jaar') < 0);
  });

  await test('cron endpoint requires secret and defaults dry-run', function () {
    var src = source('api/cron/retention.js');
    assert.ok(src.indexOf('CRON_SECRET') >= 0);
    assert.ok(src.indexOf('RETENTION_APPLY') >= 0);
    assert.ok(src.indexOf('dryRun') >= 0);
    assert.ok(src.indexOf('createAdminClient') >= 0);
  });

  await test('migration grants DELETE to service_role only pattern', function () {
    var sql = source('supabase/migrations/20260904_retention_policy.sql');
    assert.ok(sql.indexOf('retention_holds') >= 0);
    assert.ok(sql.indexOf('closed_at') >= 0);
    assert.ok(sql.indexOf('GRANT DELETE ON TABLE public.customer_requests TO service_role') >= 0);
    assert.ok(sql.indexOf('REVOKE ALL ON public.retention_holds FROM anon') >= 0);
  });

  await test('plan skips active request and ages closed request', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [
        {
          id: 'req-active',
          status: 'new',
          closed_at: null,
          interest_intake_id: 'int-a',
          customer_email: 'a@example.com'
        },
        {
          id: 'req-old',
          status: 'closed_lost',
          closed_at: '2024-01-01T00:00:00.000Z',
          interest_intake_id: 'int-old',
          customer_email: 'old@example.com'
        },
        {
          id: 'req-recent-closed',
          status: 'closed_won',
          closed_at: '2026-08-01T00:00:00.000Z',
          interest_intake_id: 'int-new',
          customer_email: 'new@example.com'
        }
      ],
      partner_interest_candidates: [],
      partner_onboarding: [],
      partners: [],
      partner_profiles: [],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var plan = await retention.planRetention(admin, { now: now });
    assert.ok(plan.ok);
    var closed = plan.actions.filter(function (a) {
      return a.category === 'closed_customer_requests';
    });
    assert.strictEqual(closed.length, 1);
    assert.strictEqual(closed[0].requestId, 'req-old');
    assert.ok(
      !plan.actions.some(function (a) {
        return a.requestId === 'req-active' || a.requestId === 'req-recent-closed';
      })
    );
  });

  await test('plan respects retention hold on closed request', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [
        { subject_type: 'customer_request', subject_id: 'req-held', reason: 'legal_dispute', cleared_at: null }
      ],
      customer_requests: [
        {
          id: 'req-held',
          status: 'closed_lost',
          closed_at: '2023-01-01T00:00:00.000Z',
          interest_intake_id: 'int-held',
          customer_email: 'held@example.com'
        }
      ],
      partner_interest_candidates: [],
      partner_onboarding: [],
      partners: [],
      partner_profiles: [],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var plan = await retention.planRetention(admin, { now: now });
    assert.ok(plan.ok);
    assert.strictEqual(
      plan.actions.filter(function (a) {
        return a.requestId === 'req-held';
      }).length,
      0
    );
  });

  await test('plan never deletes published/active professional', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [],
      partner_interest_candidates: [],
      partner_onboarding: [
        {
          partner_id: 'p-active',
          onboarding_status: 'in_progress',
          last_saved_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          started_at: '2024-01-01T00:00:00.000Z'
        }
      ],
      partners: [{ id: 'p-active', account_status: 'active', updated_at: '2024-01-01T00:00:00.000Z' }],
      partner_profiles: [
        {
          partner_id: 'p-active',
          profile_status: 'published',
          published_at: '2024-02-01T00:00:00.000Z'
        }
      ],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var plan = await retention.planRetention(admin, { now: now });
    assert.ok(plan.ok);
    assert.ok(
      !plan.actions.some(function (a) {
        return a.subjectId === 'p-active' && a.action === 'delete_partner';
      })
    );
  });

  await test('incomplete onboarding aged partner is planned; dry-run apply deletes nothing', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [],
      partner_interest_candidates: [],
      partner_onboarding: [
        {
          partner_id: 'p-stale',
          onboarding_status: 'in_progress',
          last_saved_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          started_at: '2024-01-01T00:00:00.000Z'
        }
      ],
      partners: [{ id: 'p-stale', account_status: 'active', updated_at: '2024-01-01T00:00:00.000Z' }],
      partner_profiles: [{ partner_id: 'p-stale', profile_status: 'draft', published_at: null }],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var plan = await retention.planRetention(admin, { now: now });
    assert.ok(
      plan.actions.some(function (a) {
        return a.subjectId === 'p-stale' && a.category === 'incomplete_onboarding';
      })
    );
    var applied = await retention.applyRetention(admin, plan, { dryRun: true, now: now });
    assert.ok(applied.ok);
    assert.strictEqual(applied.dryRun, true);
    assert.strictEqual(applied.applied, 0);
    assert.strictEqual(admin._tables.partners.length, 1);
  });

  await test('non-continuing candidate aged; continuing/published skipped', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [],
      partner_interest_candidates: [
        {
          id: 'c-old',
          autopilot_status: 'blocked',
          updated_at: '2025-01-01T00:00:00.000Z',
          partner_id: null,
          published_at: null
        },
        {
          id: 'c-published',
          autopilot_status: 'published',
          updated_at: '2024-01-01T00:00:00.000Z',
          partner_id: 'p1',
          published_at: '2024-02-01T00:00:00.000Z'
        },
        {
          id: 'c-fresh',
          autopilot_status: 'interest_received',
          updated_at: '2026-08-01T00:00:00.000Z',
          partner_id: null,
          published_at: null
        }
      ],
      partner_onboarding: [],
      partners: [],
      partner_profiles: [],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var plan = await retention.planRetention(admin, { now: now });
    var cand = plan.actions.filter(function (a) {
      return a.category === 'interest_candidates_non_continue';
    });
    assert.strictEqual(cand.length, 1);
    assert.strictEqual(cand[0].subjectId, 'c-old');
  });

  await test('analytics plan uses 36-month cutoff', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [],
      partner_interest_candidates: [],
      partner_onboarding: [],
      partners: [],
      partner_profiles: [],
      audit_logs: [],
      analytics_daily_counts: [{ event_date: '2020-01-01', event_name: 'x', count: 1 }]
    });
    var plan = await retention.planRetention(admin, { now: now });
    var a = plan.actions.filter(function (a) {
      return a.category === 'analytics_daily_counts';
    });
    assert.strictEqual(a.length, 1);
    assert.ok(a[0].beforeDate <= '2023-09-04');
  });

  await test('apply dry-run default never mutates even with --mental apply path', async function () {
    var now = new Date('2026-09-04T12:00:00.000Z');
    var admin = makeAdmin({
      retention_holds: [],
      customer_requests: [
        {
          id: 'req-old',
          status: 'closed_lost',
          closed_at: '2023-01-01T00:00:00.000Z',
          interest_intake_id: 'int-old',
          customer_email: 'old@example.com'
        }
      ],
      interest_intakes: [{ id: 'int-old' }],
      partner_interest_candidates: [],
      partner_onboarding: [],
      partners: [],
      partner_profiles: [],
      audit_logs: [],
      analytics_daily_counts: []
    });
    var run = await retention.runRetention(admin, { now: now }); // dryRun default true
    assert.ok(run.ok);
    assert.strictEqual(run.dryRun, true);
    assert.strictEqual(admin._tables.customer_requests.length, 1);
    assert.strictEqual(admin._tables.interest_intakes.length, 1);
  });

  await test('CLI refuses apply without confirm env', function () {
    var src = source('scripts/retention-run.js');
    assert.ok(src.indexOf('CONFIRM_RETENTION_APPLY') >= 0);
    assert.ok(src.indexOf('DRY-RUN') >= 0 || src.indexOf('dry-run') >= 0);
  });

  if (failed) {
    console.error('\n' + failed + ' retention check(s) failed');
    process.exit(1);
  }
  console.log('\nRETENTION CHECKS OK');
}

main();
