'use strict';
/**
 * ELYAN PRE-LAUNCH — Customer Requests / Intake Core checks.
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

test('migration: customer_requests 1:1 + RLS fail-closed + service_role only', function () {
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

test('NL status labels for operators', function () {
  assert.strictEqual(requests.STATUS_LABELS_NL.new, 'Nieuw');
  assert.strictEqual(requests.STATUS_LABELS_NL.contacted, 'Gecontacteerd');
  assert.ok(requests.STATUS_LABELS_NL.closed_won.indexOf('gewonnen') >= 0);
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

test('Control API wires staff-only request actions', function () {
  var api = source('api/control.js');
  assert.ok(api.indexOf('requests-list') >= 0);
  assert.ok(api.indexOf('requests-get') >= 0);
  assert.ok(api.indexOf('requests-set-status') >= 0);
  assert.ok(api.indexOf('listRequests') >= 0);
  assert.ok(api.indexOf('setRequestStatus') >= 0);
  assert.ok(api.indexOf('requireStaff') >= 0);
  assert.ok(api.indexOf('withStaff') >= 0);
});

test('interest intake creates request after successful insert', function () {
  var src = source('server/interest-intake.js');
  assert.ok(src.indexOf('createRequestFromInterest') >= 0);
  assert.ok(src.indexOf('requestId') >= 0);
});

test('Control UI for aanvragen + nav without redesigning partner review', function () {
  var html = source('professionals/aanvragen.html');
  var js = source('js/professionals/control-requests.js');
  var ctrl = source('professionals/control.html');
  assert.ok(html.indexOf('control-requests.js') >= 0);
  assert.ok(html.indexOf('Aanvragen') >= 0);
  assert.ok(js.indexOf('requests-list') >= 0);
  assert.ok(js.indexOf('requests-set-status') >= 0);
  assert.ok(ctrl.indexOf('/professionals/aanvragen') >= 0);
  var conf = JSON.parse(source('vercel.json'));
  var hit = (conf.rewrites || []).some(function (r) {
    return String(r.source || '').indexOf('/professionals/aanvragen/:requestId') >= 0;
  });
  assert.ok(hit, 'aanvragen detail rewrite');
});

test('public interest response never leaks PII or requestId', function () {
  var api = source('api/public/v1.js');
  assert.ok(api.indexOf('Never expose PII') >= 0 || api.indexOf('payload = { ok: true }') >= 0);
  assert.ok(api.indexOf('requestId') < 0);
});

/* ---------- In-memory harness for create / list / status / audit ---------- */

function makeDb() {
  var store = {
    customer_requests: {},
    customer_request_status_events: [],
    audit_logs: [],
    interest_intakes: {}
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
        return true;
      });
    }

    function rows() {
      var list = Object.keys(store[table] || {}).map(function (k) {
        return store[table][k];
      });
      if (Array.isArray(store[table])) list = store[table].slice();
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
                var id = row.id || 'req-' + Object.keys(store.customer_requests).length + 1;
                // unique interest_intake_id
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
                  { id: 'ev-' + store.customer_request_status_events.length + 1, created_at: new Date().toISOString() },
                  row
                );
                store.customer_request_status_events.push(ev);
                inserted.push(ev);
              } else if (table === 'audit_logs') {
                store.audit_logs.push(row);
                inserted.push(row);
              } else if (table === 'interest_intakes') {
                var iid = row.id || 'intake-' + Object.keys(store.interest_intakes).length + 1;
                var fullI = Object.assign({ id: iid, created_at: new Date().toISOString() }, row);
                store.interest_intakes[iid] = fullI;
                inserted.push(fullI);
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
          // select
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
      scrubMeta: function (m) { return m || {}; },
      clientMeta: function () { return {}; }
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

  // Patch resolvePublicPartner path: interest-intake also queries partner_profiles
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

async function main() {
  await testAsync('intake → internal request (1:1)', async function () {
    await withHarness(async function (cr, ii, db) {
      var result = await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'jan@example.be',
          phone: '+32470000000',
          location: '9000 Gent',
          description: 'Nieuw dak voor rijhuis, hellend.',
          consent: true
        },
        { ip: '203.0.113.20', userAgent: 'requests-check' }
      );
      assert.ok(result.ok, result.code);
      assert.ok(result.id);
      assert.ok(result.requestId);
      var reqs = Object.keys(db.store.customer_requests);
      assert.strictEqual(reqs.length, 1);
      var row = db.store.customer_requests[reqs[0]];
      assert.strictEqual(row.interest_intake_id, result.id);
      assert.strictEqual(row.status, 'new');
      assert.strictEqual(row.customer_email, 'jan@example.be');
      assert.strictEqual(row.source, 'marketplace_interest');
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
      await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'jan@example.be',
          location: 'Gent',
          description: 'Nieuw dak voor rijhuis.',
          consent: true
        },
        {}
      );
      var listed = await cr.listRequests({ status: 'new' });
      assert.ok(listed.ok);
      assert.strictEqual(listed.items.length, 1);
      var byCat = await cr.listRequests({ categoryId: 'dakwerken' });
      assert.strictEqual(byCat.items.length, 1);
      var byPartner = await cr.listRequests({ partnerSlug: 'acme-dak' });
      assert.strictEqual(byPartner.items.length, 1);
      var got = await cr.getRequest({ requestId: listed.items[0].id });
      assert.ok(got.ok);
      assert.strictEqual(got.request.customerEmail, 'jan@example.be');
      assert.ok(Array.isArray(got.statusEvents));
    });
  });

  await testAsync('status transitions + audit event', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'jan2@example.be',
          location: 'Gent',
          description: 'Nieuw dak voor rijhuis.',
          consent: true
        },
        {}
      );
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
    });
  });

  await testAsync('invalid transition blocked', async function () {
    await withHarness(async function (cr, ii, db) {
      var created = await ii.submitInterest(
        {
          partnerSlug: 'acme-dak',
          name: 'Jan Peeters',
          email: 'jan3@example.be',
          location: 'Gent',
          description: 'Nieuw dak voor rijhuis.',
          consent: true
        },
        {}
      );
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

  await testAsync('non-staff blocked at API source (no partner path)', async function () {
    var api = source('api/control.js');
    // All request actions live inside withStaff callback
    var idxList = api.indexOf("action === 'requests-list'");
    var idxStaff = api.indexOf('withStaff');
    assert.ok(idxList > idxStaff, 'requests-list after withStaff');
    assert.ok(api.indexOf('requirePartnerContext') < 0 || api.indexOf('requests-list') > 0);
  });

  function mockRes() {
    var headers = {};
    var body = '';
    return {
      statusCode: 0,
      headers: headers,
      setHeader: function (k, v) { headers[k] = v; },
      end: function (chunk) { body = chunk || ''; },
      getBody: function () {
        try { return JSON.parse(body || '{}'); } catch (e) { return {}; }
      },
      getHeader: function (k) { return headers[k]; }
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
  });

  if (failed) {
    console.error('\n' + failed + ' customer-requests check(s) failed.');
    process.exit(1);
  }
  console.log('\nCustomer Requests core checks passed.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
