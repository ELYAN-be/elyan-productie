'use strict';
/**
 * ELYAN PRE-LAUNCH — Customer Requests Core + Automation V1 checks.
 * Run: node scripts/customer-requests-check.js
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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('OK  ' + name);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
  }
}

var requests = require('../server/customer-requests');
var intake = require('../server/interest-intake');
var publicHandler = require('../api/public/v1');

test('migration core: customer_requests 1:1 + RLS fail-closed + service_role only', function () {
  var sql = source('supabase/migrations/20260819_customer_requests.sql');
  assert.ok(sql.indexOf('CREATE TABLE IF NOT EXISTS public.customer_requests') >= 0);
  assert.ok(sql.indexOf('interest_intake_id uuid NOT NULL UNIQUE') >= 0);
  assert.ok(sql.indexOf("'new', 'contacted', 'qualified', 'closed_won', 'closed_lost'") >= 0);
  assert.ok(sql.indexOf('customer_request_status_events') >= 0);
  assert.ok(sql.indexOf('ENABLE ROW LEVEL SECURITY') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.customer_requests FROM anon') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.customer_requests FROM authenticated') >= 0);
  assert.ok(sql.indexOf('GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_requests TO service_role') >= 0);
  assert.ok(sql.indexOf('GRANT SELECT, INSERT ON TABLE public.customer_request_status_events TO service_role') >= 0);
});

test('migration automation: owner/follow-up/notes/activity/lost reasons + fail-closed', function () {
  var sql = source('supabase/migrations/20260820_customer_requests_automation.sql');
  assert.ok(sql.indexOf('owner_user_id') >= 0);
  assert.ok(sql.indexOf('next_follow_up_at') >= 0);
  assert.ok(sql.indexOf('closed_lost_reason') >= 0);
  assert.ok(sql.indexOf('no_response') >= 0);
  assert.ok(sql.indexOf('no_suitable_professional') >= 0);
  assert.ok(sql.indexOf('customer_request_notes') >= 0);
  assert.ok(sql.indexOf('customer_request_activity_events') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.customer_request_notes FROM anon') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.customer_request_activity_events FROM authenticated') >= 0);
  assert.ok(sql.indexOf('GRANT SELECT, INSERT ON TABLE public.customer_request_notes TO service_role') >= 0);
});

test('status transitions: valid path + invalid blocked', function () {
  assert.ok(requests.canTransition('new', 'contacted'));
  assert.ok(requests.canTransition('new', 'closed_lost'));
  assert.ok(requests.canTransition('contacted', 'qualified'));
  assert.ok(requests.canTransition('qualified', 'closed_won'));
  assert.ok(requests.canTransition('qualified', 'closed_lost'));
  assert.ok(!requests.canTransition('new', 'qualified'));
  assert.ok(!requests.canTransition('new', 'closed_won'));
  assert.ok(!requests.canTransition('closed_won', 'new'));
  assert.ok(!requests.canTransition('closed_lost', 'contacted'));
  assert.ok(!requests.canTransition('contacted', 'new'));
});

test('NL status labels + closed_lost reason keys/labels', function () {
  assert.strictEqual(requests.STATUS_LABELS_NL.new, 'Nieuw');
  assert.strictEqual(requests.STATUS_LABELS_NL.contacted, 'Gecontacteerd');
  assert.ok(requests.STATUS_LABELS_NL.closed_won.indexOf('gewonnen') >= 0);
  assert.ok(requests.STATUS_LABELS_NL.closed_won.indexOf('intro') >= 0);
  assert.deepStrictEqual(requests.CLOSED_LOST_REASONS, [
    'no_response',
    'not_qualified',
    'no_suitable_professional',
    'customer_cancelled',
    'duplicate',
    'out_of_scope',
    'other'
  ]);
  assert.strictEqual(requests.CLOSED_LOST_REASON_LABELS_NL.no_response, 'Geen reactie');
  assert.strictEqual(requests.CLOSED_LOST_REASON_LABELS_NL.other, 'Andere');
});

test('SLA: weekend-aware +2 business days (UTC Mon–Fri)', function () {
  // Fri 2026-08-14 10:00Z + 2 BD => Tue 2026-08-18 10:00Z
  var fri = new Date('2026-08-14T10:00:00.000Z');
  var deadline = requests.addBusinessDays(fri, 2);
  assert.strictEqual(deadline.toISOString(), '2026-08-18T10:00:00.000Z');

  // Sat created → first BD Mon, second Tue
  var sat = new Date('2026-08-15T12:00:00.000Z');
  assert.strictEqual(
    requests.addBusinessDays(sat, 2).toISOString(),
    '2026-08-18T12:00:00.000Z'
  );

  var rowNew = {
    status: 'new',
    created_at: '2026-08-14T10:00:00.000Z',
    next_follow_up_at: null
  };
  assert.ok(!requests.isNewSlaOverdue(rowNew, new Date('2026-08-18T09:59:00.000Z')));
  assert.ok(requests.isNewSlaOverdue(rowNew, new Date('2026-08-18T10:00:01.000Z')));

  var rowContacted = {
    status: 'contacted',
    created_at: '2026-08-14T10:00:00.000Z',
    next_follow_up_at: null
  };
  assert.ok(
    !requests.isNewSlaOverdue(rowContacted, new Date('2026-08-25T10:00:00.000Z')),
    'contacted must not be new-SLA overdue'
  );
});

test('buildRequestFromInterest maps intake fields (source + PII + partner)', function () {
  var row = requests.buildRequestFromInterest({
    id: 'intake-1',
    partner_id: 'partner-1',
    partner_slug: 'acme-dak',
    category_id: 'dakwerken',
    name: 'Jan Peeters',
    email: 'jan@example.be',
    phone: '+32470000000',
    location_text: '9000 Gent',
    description: 'Nieuw dak voor rijhuis, hellend.',
    consent_at: '2026-08-19T10:00:00.000Z',
    created_at: '2026-08-19T10:00:00.000Z'
  });
  assert.strictEqual(row.interest_intake_id, 'intake-1');
  assert.strictEqual(row.source, 'marketplace_interest');
  assert.strictEqual(row.status, 'new');
  assert.strictEqual(row.customer_name, 'Jan Peeters');
  assert.strictEqual(row.customer_email, 'jan@example.be');
  assert.strictEqual(row.message, 'Nieuw dak voor rijhuis, hellend.');
  assert.strictEqual(row.partner_slug, 'acme-dak');
  assert.strictEqual(row.category_id, 'dakwerken');
});

test('Control API wires staff-only request actions (core + automation)', function () {
  var api = source('api/control.js');
  assert.ok(api.indexOf('requests-list') >= 0);
  assert.ok(api.indexOf('requests-get') >= 0);
  assert.ok(api.indexOf('requests-set-status') >= 0);
  assert.ok(api.indexOf('requests-set-owner') >= 0);
  assert.ok(api.indexOf('requests-set-follow-up') >= 0);
  assert.ok(api.indexOf('requests-add-note') >= 0);
  assert.ok(api.indexOf('requests-orphans') >= 0);
  assert.ok(api.indexOf('requests-recover-orphans') >= 0);
  assert.ok(api.indexOf('listRequests') >= 0);
  assert.ok(api.indexOf('setRequestStatus') >= 0);
  assert.ok(api.indexOf('setRequestOwner') >= 0);
  assert.ok(api.indexOf('setRequestFollowUp') >= 0);
  assert.ok(api.indexOf('addRequestNote') >= 0);
  assert.ok(api.indexOf('listOrphanIntakes') >= 0);
  assert.ok(api.indexOf('recoverOrphanRequests') >= 0);
  assert.ok(api.indexOf('requireStaff') >= 0);
  assert.ok(api.indexOf('withStaff') >= 0);
  var idxList = api.indexOf("action === 'requests-list'");
  var idxStaff = api.indexOf('withStaff');
  assert.ok(idxList > idxStaff, 'requests-list after withStaff');
  var idxOrphans = api.indexOf("action === 'requests-orphans'");
  assert.ok(idxOrphans > idxStaff, 'requests-orphans after withStaff');
});

test('interest intake creates request after successful insert', function () {
  var src = source('server/interest-intake.js');
  assert.ok(src.indexOf('createRequestFromInterest') >= 0);
  assert.ok(src.indexOf('ensureRequestForIntakeId') >= 0);
  assert.ok(src.indexOf('interest_duplicate_ensure_failed') >= 0);
  assert.ok(src.indexOf('requestId') >= 0);
});

test('Control UI work queue + detail ops without marketplace redesign', function () {
  var html = source('professionals/aanvragen.html');
  var js = source('js/professionals/control-requests.js');
  var ctrl = source('professionals/control.html');
  assert.ok(html.indexOf('control-requests.js') >= 0);
  assert.ok(html.indexOf('Aanvragen') >= 0);
  assert.ok(html.indexOf('ctrlFilterOwner') >= 0);
  assert.ok(html.indexOf('ctrlFilterFollowUp') >= 0);
  assert.ok(html.indexOf('ctrlNotes') >= 0);
  assert.ok(html.indexOf('ctrlActivity') >= 0);
  assert.ok(js.indexOf('requests-list') >= 0);
  assert.ok(js.indexOf('requests-set-status') >= 0);
  assert.ok(js.indexOf('requests-set-owner') >= 0);
  assert.ok(js.indexOf('requests-set-follow-up') >= 0);
  assert.ok(js.indexOf('requests-add-note') >= 0);
  assert.ok(js.indexOf('closedLostReason') >= 0);
  assert.ok(ctrl.indexOf('/professionals/aanvragen') >= 0);
  var conf = JSON.parse(source('vercel.json'));
  var hit = (conf.rewrites || []).some(function (r) {
    return String(r.source || '').indexOf('/professionals/aanvragen/:requestId') >= 0;
  });
  assert.ok(hit, 'aanvragen detail rewrite');
  // Frozen marketplace surface untouched by this module path
  assert.ok(source('js/professionals/control-requests.js').indexOf('vk-app') < 0);
});

test('public interest response never leaks PII or requestId', function () {
  var api = source('api/public/v1.js');
  assert.ok(api.indexOf('Never expose PII') >= 0 || api.indexOf('payload = { ok: true }') >= 0);
  assert.ok(api.indexOf('requestId') < 0);
});

/* ---------- In-memory harness ---------- */

function makeDb() {
  var store = {
    customer_requests: {},
    customer_request_status_events: [],
    customer_request_notes: [],
    customer_request_activity_events: [],
    audit_logs: [],
    interest_intakes: {},
    staff_users: {
      'staff-1': { user_id: 'staff-1', role: 'elyan_ops' },
      'staff-2': { user_id: 'staff-2', role: 'elyan_admin' }
    }
  };

  function chain(table) {
    var filters = [];
    var orderCol = null;
    var orderAsc = true;
    var limitN = null;
    var mutate = null;
    var selectCols = '*';
    var op = 'select';

    function match(row) {
      return filters.every(function (f) {
        if (f.op === 'eq') return row[f.col] === f.val;
        if (f.op === 'gte') return row[f.col] >= f.val;
        if (f.op === 'in') {
          return Array.isArray(f.val) && f.val.indexOf(row[f.col]) >= 0;
        }
        return true;
      });
    }

    function rows() {
      var list;
      if (Array.isArray(store[table])) list = store[table].slice();
      else {
        list = Object.keys(store[table] || {}).map(function (k) {
          return store[table][k];
        });
      }
      return list.filter(match);
    }

    var api = {
      select: function (cols) {
        selectCols = cols || '*';
        return api;
      },
      insert: function (payload) {
        op = 'insert';
        mutate = Array.isArray(payload) ? payload : [payload];
        return api;
      },
      update: function (payload) {
        op = 'update';
        mutate = payload;
        return api;
      },
      eq: function (col, val) {
        filters.push({ op: 'eq', col: col, val: val });
        return api;
      },
      gte: function (col, val) {
        filters.push({ op: 'gte', col: col, val: val });
        return api;
      },
      in: function (col, vals) {
        filters.push({ op: 'in', col: col, val: vals || [] });
        return api;
      },
      order: function (col, opts) {
        orderCol = col;
        orderAsc = !(opts && opts.ascending === false);
        return api;
      },
      limit: function (n) {
        limitN = n;
        return api;
      },
      maybeSingle: async function () {
        var res = await api._run();
        if (res.error) return res;
        var data = Array.isArray(res.data) ? res.data[0] || null : res.data;
        return { data: data, error: null };
      },
      then: function (resolve, reject) {
        return api._run().then(resolve, reject);
      },
      _run: async function () {
        try {
          if (op === 'insert') {
            var inserted = [];
            mutate.forEach(function (row) {
              if (table === 'customer_requests') {
                if (store._failCustomerRequestInserts > 0) {
                  store._failCustomerRequestInserts -= 1;
                  throw new Error('simulated customer_request insert failure');
                }
                var id = row.id || 'req-' + Object.keys(store.customer_requests).length + 1;
                var clash = Object.keys(store.customer_requests).some(function (k) {
                  return store.customer_requests[k].interest_intake_id === row.interest_intake_id;
                });
                if (clash) {
                  throw new Error('duplicate key value violates unique constraint');
                }
                var full = Object.assign({ id: id }, row);
                store.customer_requests[id] = full;
                inserted.push(full);
              } else if (table === 'customer_request_status_events') {
                var ev = Object.assign(
                  {
                    id: 'ev-' + store.customer_request_status_events.length + 1,
                    created_at: new Date().toISOString()
                  },
                  row
                );
                store.customer_request_status_events.push(ev);
                inserted.push(ev);
              } else if (table === 'customer_request_notes') {
                var note = Object.assign(
                  {
                    id: 'note-' + (store.customer_request_notes.length + 1),
                    created_at: new Date().toISOString()
                  },
                  row
                );
                store.customer_request_notes.push(note);
                inserted.push(note);
              } else if (table === 'customer_request_activity_events') {
                var act = Object.assign(
                  {
                    id: 'act-' + (store.customer_request_activity_events.length + 1),
                    created_at: new Date().toISOString(),
                    meta: row.meta || {}
                  },
                  row
                );
                store.customer_request_activity_events.push(act);
                inserted.push(act);
              } else if (table === 'audit_logs') {
                store.audit_logs.push(row);
                inserted.push(row);
              } else if (table === 'interest_intakes') {
                var iid = row.id || 'intake-' + Object.keys(store.interest_intakes).length + 1;
                var fullI = Object.assign({ id: iid, created_at: new Date().toISOString() }, row);
                store.interest_intakes[iid] = fullI;
                inserted.push(fullI);
              } else if (table === 'staff_users') {
                store.staff_users[row.user_id] = row;
                inserted.push(row);
              }
            });
            return { data: inserted, error: null };
          }
          if (op === 'update') {
            var hit = rows();
            if (!hit.length) return { data: null, error: null };
            var updated = hit.map(function (r) {
              var next = Object.assign({}, r, mutate);
              if (table === 'customer_requests') store.customer_requests[r.id] = next;
              return next;
            });
            return { data: updated, error: null };
          }
          var list = rows();
          if (orderCol) {
            list.sort(function (a, b) {
              var av = a[orderCol];
              var bv = b[orderCol];
              if (av < bv) return orderAsc ? -1 : 1;
              if (av > bv) return orderAsc ? 1 : -1;
              return 0;
            });
          }
          if (limitN != null) list = list.slice(0, limitN);
          return { data: list, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
    };
    return api;
  }

  return {
    store: store,
    from: function (table) {
      return chain(table);
    }
  };
}

async function withHarness(fn) {
  var db = makeDb();
  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var reqPath = require.resolve('../server/customer-requests');
  var intakePath = require.resolve('../server/interest-intake');
  var marketplacePath = require.resolve('../server/marketplace-public');

  var prev = {
    supabase: require.cache[supabasePath],
    audit: require.cache[auditPath],
    req: require.cache[reqPath],
    intake: require.cache[intakePath],
    market: require.cache[marketplacePath]
  };

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
      createAdminClient: function () {
        return db;
      }
    }
  };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: {
      writeAudit: async function (opts) {
        db.store.audit_logs.push({
          actor_user_id: opts.actorUserId,
          actor_type: opts.actorType,
          partner_id: opts.partnerId,
          action: opts.action,
          meta: opts.meta || {}
        });
      },
      scrubMeta: function (m) {
        return m || {};
      },
      clientMeta: function () {
        return {};
      }
    }
  };
  require.cache[marketplacePath] = {
    id: marketplacePath,
    filename: marketplacePath,
    loaded: true,
    exports: {
      getProfessionalBySlug: async function (slug) {
        if (slug === 'acme-dak') {
          return {
            ok: true,
            professional: { slug: slug, primaryCategoryId: 'dakwerken', displayName: 'Acme Dak' }
          };
        }
        return { ok: false, code: 'not_found' };
      }
    }
  };

  delete require.cache[reqPath];
  delete require.cache[intakePath];
  var cr = require('../server/customer-requests');
  var ii = require('../server/interest-intake');

  var origFrom = db.from.bind(db);
  db.from = function (table) {
    if (table === 'partner_profiles') {
      return {
        select: function () {
          return {
            eq: function (col, val) {
              return {
                maybeSingle: async function () {
                  if (val === 'acme-dak') {
                    return {
                      data: {
                        partner_id: 'partner-acme',
                        slug: 'acme-dak',
                        profile_status: 'published',
                        public_snapshot: { primaryCategoryId: 'dakwerken' }
                      },
                      error: null
                    };
                  }
                  return { data: null, error: null };
                }
              };
            }
          };
        }
      };
    }
    return origFrom(table);
  };

  try {
    await fn(cr, ii, db);
  } finally {
    if (prev.supabase) require.cache[supabasePath] = prev.supabase;
    else delete require.cache[supabasePath];
    if (prev.audit) require.cache[auditPath] = prev.audit;
    else delete require.cache[auditPath];
    if (prev.market) require.cache[marketplacePath] = prev.market;
    else delete require.cache[marketplacePath];
    delete require.cache[reqPath];
    delete require.cache[intakePath];
    require('../server/customer-requests');
    require('../server/interest-intake');
  }
}

async function seedRequest(ii, email) {
  var created = await ii.submitInterest(
    {
      partnerSlug: 'acme-dak',
      name: 'Jan Peeters',
      email: email || 'jan@example.be',
      phone: '+32470000000',
      location: '9000 Gent',
      description: 'Nieuw dak voor rijhuis, hellend.',
      consent: true
    },
    { ip: '203.0.113.20', userAgent: 'requests-check' }
  );
  assert.ok(created.ok, created.code);
  return created;
}

async function main() {
  await testAsync('intake → internal request (1:1) + created activity', async function () {
    await withHarness(async function (cr, ii, db) {
      var result = await seedRequest(ii, 'jan@example.be');
      assert.ok(result.id);
      assert.ok(result.requestId);
      var reqs = Object.keys(db.store.customer_requests);
      assert.strictEqual(reqs.length, 1);
      var row = db.store.customer_requests[reqs[0]];
      assert.strictEqual(row.interest_intake_id, result.id);
      assert.strictEqual(row.status, 'new');
      assert.strictEqual(row.customer_email, 'jan@example.be');
      assert.strictEqual(row.source, 'marketplace_interest');
      assert.ok(
        db.store.customer_request_activity_events.some(function (a) {
          return a.action === 'created' && a.request_id === result.requestId;
        })
      );
    });
  });

  await testAsync('duplicate dedupe → no second request', async function () {
    await withHarness(async function (cr, ii, db) {
      var payload = {
        partnerSlug: 'acme-dak',
        name: 'Jan Peeters',
        email: 'jan@example.be',
        location: '9000 Gent',
        description: 'Nieuw dak voor rijhuis, hellend.',
        consent: true
      };
      var first = await ii.submitInterest(payload, { ip: '1.1.1.1' });
      assert.ok(first.ok && first.requestId);
      var second = await ii.submitInterest(payload, { ip: '1.1.1.1' });
      assert.ok(second.ok);
      assert.strictEqual(second.duplicate, true);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);
      assert.strictEqual(Object.keys(db.store.interest_intakes).length, 1);
    });
  });

  await testAsync('staff list/read + filters', async function () {
    await withHarness(async function (cr, ii, db) {
      await seedRequest(ii, 'jan@example.be');
      var listed = await cr.listRequests({ status: 'new' });
      assert.ok(listed.ok);
      assert.strictEqual(listed.items.length, 1);
      assert.ok('attention' in listed.items[0]);
      assert.ok('ageLabel' in listed.items[0]);
      var byCat = await cr.listRequests({ categoryId: 'dakwerken' });
      assert.strictEqual(byCat.items.length, 1);
      var byPartner = await cr.listRequests({ partnerSlug: 'acme-dak' });
      assert.strictEqual(byPartner.items.length, 1);
      var got = await cr.getRequest({ requestId: listed.items[0].id });
      assert.ok(got.ok);
      assert.strictEqual(got.request.customerEmail, 'jan@example.be');
      assert.ok(Array.isArray(got.statusEvents));
      assert.ok(Array.isArray(got.notes));
      assert.ok(Array.isArray(got.activity));
    });
  });

  await testAsync('status transitions + audit event', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'jan2@example.be');
      var id = created.requestId;
      var t1 = await cr.setRequestStatus({
        requestId: id,
        status: 'contacted',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(t1.ok, t1.code);
      assert.strictEqual(t1.request.status, 'contacted');
      var t2 = await cr.setRequestStatus({
        requestId: id,
        status: 'qualified',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(t2.ok);
      var t3 = await cr.setRequestStatus({
        requestId: id,
        status: 'closed_won',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(t3.ok);
      assert.ok(
        db.store.audit_logs.some(function (a) {
          return a.action === 'customer_request_status_changed' && a.meta && a.meta.to === 'closed_won';
        })
      );
      assert.ok(db.store.customer_request_status_events.length >= 3);
      assert.ok(
        db.store.customer_request_activity_events.some(function (a) {
          return a.action === 'closed' && a.meta && a.meta.outcome === 'closed_won';
        })
      );
    });
  });

  await testAsync('invalid transition blocked', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'jan3@example.be');
      var bad = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_won',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(bad.ok, false);
      assert.strictEqual(bad.code, 'invalid_status_transition');
    });
  });

  await testAsync('closed_lost requires reason + other detail; invalid key fails', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'lost1@example.be');
      var noReason = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_lost',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(noReason.ok, false);
      assert.strictEqual(noReason.code, 'closed_lost_reason_required');

      var badKey = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_lost',
        closedLostReason: 'price_too_high',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(badKey.ok, false);
      assert.strictEqual(badKey.code, 'closed_lost_reason_required');

      var otherNoDetail = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_lost',
        closedLostReason: 'other',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(otherNoDetail.ok, false);
      assert.strictEqual(otherNoDetail.code, 'closed_lost_detail_required');

      var ok = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_lost',
        closedLostReason: 'other',
        closedLostDetail: 'Buiten regio West-Vlaanderen',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(ok.ok, ok.code);
      assert.strictEqual(ok.request.closedLostReason, 'other');
      assert.ok(ok.request.closedLostDetail.indexOf('West-Vlaanderen') >= 0);
      assert.strictEqual(ok.request.nextFollowUpAt, null);
    });
  });

  await testAsync('ownership assign / deny non-staff / audit', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'own1@example.be');
      var deny = await cr.setRequestOwner({
        requestId: created.requestId,
        ownerUserId: 'partner-user-9',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(deny.ok, false);
      assert.strictEqual(deny.code, 'not_staff_owner');

      var ok = await cr.setRequestOwner({
        requestId: created.requestId,
        ownerUserId: 'staff-2',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(ok.ok, ok.code);
      assert.strictEqual(ok.request.ownerUserId, 'staff-2');
      assert.ok(
        db.store.audit_logs.some(function (a) {
          return a.action === 'customer_request_owner_changed' && a.meta.to === 'staff-2';
        })
      );

      var listedMine = await cr.listRequests({
        ownerFilter: 'me',
        staffUserId: 'staff-2'
      });
      assert.strictEqual(listedMine.items.length, 1);

      var listedUn = await cr.listRequests({ ownerFilter: 'unassigned' });
      assert.strictEqual(listedUn.items.length, 0);

      var cleared = await cr.setRequestOwner({
        requestId: created.requestId,
        clear: true,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(cleared.ok);
      assert.strictEqual(cleared.request.ownerUserId, null);
    });
  });

  await testAsync('follow-up set/update/clear + overdue + closed consistency', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'fu1@example.be');
      var past = '2026-08-01T09:00:00.000Z';
      var set1 = await cr.setRequestFollowUp({
        requestId: created.requestId,
        nextFollowUpAt: past,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(set1.ok, set1.code);
      assert.strictEqual(set1.request.nextFollowUpAt, past);
      assert.ok(set1.request.followUpOverdue);

      var future = '2026-12-01T09:00:00.000Z';
      var set2 = await cr.setRequestFollowUp({
        requestId: created.requestId,
        nextFollowUpAt: future,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(set2.ok);
      assert.strictEqual(set2.request.nextFollowUpAt, future);
      assert.ok(!set2.request.followUpOverdue);

      var cleared = await cr.setRequestFollowUp({
        requestId: created.requestId,
        clear: true,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(cleared.ok);
      assert.strictEqual(cleared.request.nextFollowUpAt, null);

      await cr.setRequestFollowUp({
        requestId: created.requestId,
        nextFollowUpAt: future,
        staffUserId: 'staff-1',
        req: {}
      });
      var closed = await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'closed_lost',
        closedLostReason: 'duplicate',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(closed.ok, closed.code);
      assert.strictEqual(closed.request.nextFollowUpAt, null);

      var badFu = await cr.setRequestFollowUp({
        requestId: created.requestId,
        nextFollowUpAt: future,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(badFu.ok, false);
      assert.strictEqual(badFu.code, 'invalid_follow_up_on_closed');
    });
  });

  await testAsync('notes create + chronology; partner/public have no API path', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'note1@example.be');
      var n1 = await cr.addRequestNote({
        requestId: created.requestId,
        content: 'Eerste belpoging — mailbox.',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(n1.ok, n1.code);
      var n2 = await cr.addRequestNote({
        requestId: created.requestId,
        content: 'Teruggebeld — wil offerte.',
        staffUserId: 'staff-2',
        req: {}
      });
      assert.ok(n2.ok);
      var got = await cr.getRequest({ requestId: created.requestId });
      assert.strictEqual(got.notes.length, 2);
      assert.ok(got.notes[0].createdAt <= got.notes[1].createdAt);
      assert.ok(
        db.store.customer_request_activity_events.filter(function (a) {
          return a.action === 'note_added';
        }).length >= 2
      );

      var api = source('api/control.js');
      assert.ok(api.indexOf('requirePartnerContext') < 0 || api.indexOf('requests-add-note') > 0);
      var pub = source('api/public/v1.js');
      assert.ok(pub.indexOf('requests-add-note') < 0);
      assert.ok(pub.indexOf('closed_lost_reason') < 0);
      assert.ok(pub.indexOf('next_follow_up') < 0);
    });
  });

  await testAsync('security: staff path only; IDOR-ish missing id fails closed', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'sec1@example.be');
      var missing = await cr.getRequest({ requestId: '00000000-0000-0000-0000-000000000099' });
      assert.strictEqual(missing.ok, false);
      assert.strictEqual(missing.code, 'not_found');

      var noteMissing = await cr.addRequestNote({
        requestId: '00000000-0000-0000-0000-000000000099',
        content: 'x',
        staffUserId: 'staff-1',
        req: {}
      });
      assert.strictEqual(noteMissing.ok, false);
      assert.strictEqual(noteMissing.code, 'not_found');

      var api = source('api/control.js');
      var idxNote = api.indexOf("action === 'requests-add-note'");
      var idxStaff = api.indexOf('withStaff');
      assert.ok(idxNote > idxStaff);
      assert.ok(created.requestId);
    });
  });

  await testAsync('attention filter: new SLA overdue listed', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'sla1@example.be');
      var row = db.store.customer_requests[created.requestId];
      row.created_at = '2026-08-10T10:00:00.000Z';
      var now = new Date('2026-08-20T10:00:00.000Z');
      var listed = await cr.listRequests({ attentionOnly: true, now: now });
      assert.strictEqual(listed.items.length, 1);
      assert.ok(listed.items[0].newSlaOverdue);
      assert.ok(listed.items[0].attention);

      await cr.setRequestStatus({
        requestId: created.requestId,
        status: 'contacted',
        staffUserId: 'staff-1',
        req: {}
      });
      var after = await cr.listRequests({ attentionOnly: true, now: now });
      assert.strictEqual(after.items.length, 0);
    });
  });

  function mockRes() {
    var headers = {};
    var body = '';
    return {
      statusCode: 0,
      headers: headers,
      setHeader: function (k, v) {
        headers[k] = v;
      },
      end: function (chunk) {
        body = chunk || '';
      },
      getBody: function () {
        try {
          return JSON.parse(body || '{}');
        } catch (e) {
          return {};
        }
      },
      getHeader: function (k) {
        return headers[k];
      }
    };
  }

  function runPublic(req) {
    return new Promise(function (resolve) {
      var res = mockRes();
      var origEnd = res.end;
      res.end = function (chunk) {
        origEnd(chunk);
        resolve(res);
      };
      Promise.resolve(publicHandler(req, res)).catch(function (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'server_error', message: String(err && err.message) }));
        resolve(res);
      });
    });
  }

  await testAsync('request creation failure returns server_error (no false success)', async function () {
    await withHarness(async function (cr, ii, db) {
      db.store._failCustomerRequestInserts = 1;
      var result = await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'fail-create@example.be',
          location: '9000 Gent',
          description: 'Nieuw dak voor rijhuis, hellend.',
          consent: true
        },
        { ip: '203.0.113.40' }
      );
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.code, 'server_error');
      assert.strictEqual(Object.keys(db.store.interest_intakes).length, 1);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 0);
    });
  });

  await testAsync('retry after partial failure ensures exactly one request', async function () {
    await withHarness(async function (cr, ii, db) {
      var payload = {
        partnerSlug: 'acme-dak',
        name: 'Jan Peeters',
        email: 'retry-partial@example.be',
        location: '9000 Gent',
        description: 'Nieuw dak voor rijhuis, hellend.',
        consent: true
      };
      db.store._failCustomerRequestInserts = 1;
      var first = await ii.submitInterest(payload, { ip: '203.0.113.41' });
      assert.strictEqual(first.ok, false);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 0);

      var second = await ii.submitInterest(payload, { ip: '203.0.113.41' });
      assert.ok(second.ok, second.code);
      assert.strictEqual(second.duplicate, true);
      assert.strictEqual(Object.keys(db.store.interest_intakes).length, 1);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);
      var reqId = Object.keys(db.store.customer_requests)[0];
      assert.strictEqual(
        db.store.customer_requests[reqId].interest_intake_id,
        Object.keys(db.store.interest_intakes)[0]
      );
    });
  });

  await testAsync('orphan detection is privacy-safe (no customer PII fields)', async function () {
    await withHarness(async function (cr, ii, db) {
      db.store._failCustomerRequestInserts = 1;
      await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Secret Person',
          email: 'orphan-detect@example.be',
          phone: '+32479999999',
          location: '9000 Gent',
          description: 'Secret orphan project text.',
          consent: true
        },
        { ip: '203.0.113.42' }
      );
      var orphans = await cr.listOrphanIntakes({});
      assert.ok(orphans.ok);
      assert.strictEqual(orphans.count, 1);
      var item = orphans.items[0];
      assert.ok(item.intakeId);
      assert.ok(item.createdAt);
      assert.strictEqual(item.partnerSlug, 'acme-dak');
      assert.ok(!('customerName' in item));
      assert.ok(!('customerEmail' in item));
      assert.ok(!('email' in item));
      assert.ok(!('name' in item));
      assert.ok(!('phone' in item));
      assert.ok(!('description' in item));
      assert.ok(!('message' in item));
      assert.ok(!('locationText' in item));
    });
  });

  await testAsync('orphan recovery + repeated recovery are idempotent', async function () {
    await withHarness(async function (cr, ii, db) {
      db.store._failCustomerRequestInserts = 1;
      await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'orphan-recover@example.be',
          location: '9000 Gent',
          description: 'Nieuw dak voor rijhuis, hellend.',
          consent: true
        },
        { ip: '203.0.113.43' }
      );
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 0);

      var first = await cr.recoverOrphanRequests({
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(first.ok);
      assert.strictEqual(first.recovered, 1);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);

      var second = await cr.recoverOrphanRequests({
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(second.ok);
      assert.strictEqual(second.recovered, 0);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);

      var intakeId = Object.keys(db.store.interest_intakes)[0];
      var third = await cr.recoverOrphanRequests({
        intakeId: intakeId,
        staffUserId: 'staff-1',
        req: {}
      });
      assert.ok(third.ok);
      assert.strictEqual(third.recovered, 0);
      assert.strictEqual(third.skipped, 1);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);
      assert.ok(
        db.store.audit_logs.some(function (a) {
          return a.action === 'customer_request_orphans_recovered';
        })
      );
    });
  });

  await testAsync('concurrent/repeated createRequestFromInterest stays 1:1', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await seedRequest(ii, 'concurrent@example.be');
      var intake = db.store.interest_intakes[created.id];
      var again = await cr.createRequestFromInterest(intake);
      assert.ok(again.ok);
      assert.strictEqual(again.duplicate, true);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);

      var ensuredA = await cr.ensureRequestForIntakeId(created.id);
      var ensuredB = await cr.ensureRequestForIntakeId(created.id);
      assert.ok(ensuredA.ok && ensuredB.ok);
      assert.strictEqual(ensuredA.ensured, false);
      assert.strictEqual(ensuredB.ensured, false);
      assert.strictEqual(ensuredA.request.id, ensuredB.request.id);
      assert.strictEqual(Object.keys(db.store.customer_requests).length, 1);
    });
  });

  await testAsync('no PII public leak on interest success (honeypot)', async function () {
    var res = await runPublic({
      method: 'POST',
      url: '/api/public/v1/interest',
      query: { path: 'interest' },
      headers: { 'x-forwarded-for': '203.0.113.99', 'user-agent': 'requests-check' },
      body: {
        partnerSlug: 'acme-dak',
        name: 'Secret Name',
        email: 'secret@example.be',
        phone: '+32471111111',
        location: 'Gent',
        description: 'Secret project description.',
        consent: true,
        website: 'https://bot.example'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    var body = res.getBody();
    assert.strictEqual(body.ok, true);
    assert.ok(!body.email);
    assert.ok(!body.phone);
    assert.ok(!body.name);
    assert.ok(!body.customerEmail);
    assert.ok(!body.requestId);
    assert.ok(!body.id);
    assert.ok(!body.notes);
    assert.ok(!body.ownerUserId);
    assert.ok(!body.closedLostReason);
  });

  await testAsync('frozen surface regression: marketplace + professionals scripts present', async function () {
    assert.ok(fs.existsSync(path.join(root, 'scripts/marketplace-sprint1-check.js')));
    assert.ok(fs.existsSync(path.join(root, 'scripts/marketplace-interest-check.js')));
    assert.ok(fs.existsSync(path.join(root, 'scripts/phase-b-sprint8-check.js')));
    var vak = source('shared/vakmannen/intelligence.js');
    assert.ok(vak.indexOf('CustomerRequestEngine') >= 0);
  });

  if (failed) {
    console.error('\n' + failed + ' customer-requests check(s) failed.');
    process.exit(1);
  }
  console.log('\nCustomer Requests core + automation checks passed.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
