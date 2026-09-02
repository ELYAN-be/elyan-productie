'use strict';
/**
 * ELYAN — Control Customers · Data · Reporting V1 checks.
 * Run: node scripts/control-data-check.js
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

var cd = require('../server/control-data');
var cr = require('../server/customer-requests');

test('no customers table migration introduced', function () {
  var migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations'));
  migrations.forEach(function (f) {
    if (!/\.sql$/i.test(f)) return;
    var sql = source('supabase/migrations/' + f);
    assert.ok(
      !/CREATE TABLE IF NOT EXISTS public\.customers\b/i.test(sql),
      'must not create customers table in ' + f
    );
  });
});

test('identity: normalize email + aggregate by email only', function () {
  assert.strictEqual(cd.normalizeEmail('  Ada@Example.BE '), 'ada@example.be');
  var rows = [
    {
      customer_email: 'ada@example.be',
      customer_name: 'Ada',
      customer_phone: '1',
      location_text: 'Gent',
      status: 'new',
      created_at: '2026-08-01T10:00:00.000Z',
      updated_at: '2026-08-01T10:00:00.000Z'
    },
    {
      customer_email: 'ada@example.be',
      customer_name: 'Ada One',
      customer_phone: null,
      location_text: 'Gent',
      status: 'closed_won',
      created_at: '2026-08-10T10:00:00.000Z',
      updated_at: '2026-08-11T10:00:00.000Z'
    },
    {
      customer_email: 'bob@example.be',
      customer_name: 'Bob',
      customer_phone: null,
      location_text: 'Antwerpen',
      status: 'contacted',
      created_at: '2026-08-05T10:00:00.000Z',
      updated_at: '2026-08-05T10:00:00.000Z'
    }
  ];
  var items = cd.aggregateCustomers(rows);
  assert.strictEqual(items.length, 2);
  var ada = items.filter(function (i) {
    return i.email === 'ada@example.be';
  })[0];
  assert.ok(ada);
  assert.strictEqual(ada.totalRequests, 2);
  assert.strictEqual(ada.activeRequests, 1);
  assert.strictEqual(ada.nameAmbiguous, true);
  assert.strictEqual(ada.firstRequestAt, '2026-08-01T10:00:00.000Z');
});

test('ops buckets: new / sla approaching / overdue / follow-up / unassigned', function () {
  var now = new Date('2026-08-18T12:00:00.000Z');
  // Fri 08-14 + 2 BD = Tue 08-18 10:00 → overdue at noon
  var overdueNew = {
    status: 'new',
    created_at: '2026-08-14T10:00:00.000Z',
    owner_user_id: null,
    next_follow_up_at: null
  };
  assert.ok(cd.classifyOpsBucket(overdueNew, now).indexOf('sla_overdue') >= 0);
  assert.ok(cd.classifyOpsBucket(overdueNew, now).indexOf('new_needing_first_contact') >= 0);
  assert.ok(cd.classifyOpsBucket(overdueNew, now).indexOf('unassigned_active') >= 0);

  // Deadline Tue 18 10:00; now Mon 17 12:00 → approaching (<24h)
  var approachNow = new Date('2026-08-17T12:00:00.000Z');
  var approaching = {
    status: 'new',
    created_at: '2026-08-14T10:00:00.000Z',
    owner_user_id: 'u1',
    next_follow_up_at: null
  };
  assert.ok(cd.isNewSlaApproaching(approaching, approachNow));
  assert.ok(cd.classifyOpsBucket(approaching, approachNow).indexOf('sla_approaching') >= 0);
  assert.ok(cd.classifyOpsBucket(approaching, approachNow).indexOf('sla_overdue') < 0);

  var fu = {
    status: 'contacted',
    created_at: '2026-08-10T10:00:00.000Z',
    owner_user_id: 'u1',
    next_follow_up_at: '2026-08-17T10:00:00.000Z'
  };
  assert.ok(cd.classifyOpsBucket(fu, now).indexOf('follow_up_overdue') >= 0);
});

test('funnel + rates: empty → no misleading %; denominators explicit', function () {
  var period = cd.parsePeriod({ period: '30', now: new Date('2026-08-20T12:00:00.000Z') });
  var empty = cd.buildReporting([], {}, period, {});
  assert.strictEqual(empty.funnel.empty, true);
  assert.strictEqual(empty.funnel.stages[0].count, 0);
  assert.strictEqual(empty.funnel.stages[1].rate.value, null);
  assert.strictEqual(empty.funnel.stages[1].rate.label, cd.NA);

  var rows = [
    {
      id: 'r1',
      status: 'new',
      created_at: '2026-08-15T10:00:00.000Z',
      category_id: 'dakwerken',
      partner_id: 'p1',
      partner_slug: 'acme-dak',
      closed_lost_reason: null
    },
    {
      id: 'r2',
      status: 'contacted',
      created_at: '2026-08-16T10:00:00.000Z',
      category_id: 'dakwerken',
      partner_id: 'p1',
      partner_slug: 'acme-dak',
      closed_lost_reason: null
    },
    {
      id: 'r3',
      status: 'qualified',
      created_at: '2026-08-17T10:00:00.000Z',
      category_id: 'keuken',
      partner_id: 'p2',
      partner_slug: 'keuken-pro',
      closed_lost_reason: null
    },
    {
      id: 'r4',
      status: 'closed_won',
      created_at: '2026-08-18T10:00:00.000Z',
      category_id: 'keuken',
      partner_id: 'p2',
      partner_slug: 'keuken-pro',
      closed_lost_reason: null
    },
    {
      id: 'r5',
      status: 'closed_lost',
      created_at: '2026-08-19T10:00:00.000Z',
      category_id: 'dakwerken',
      partner_id: 'p1',
      partner_slug: 'acme-dak',
      closed_lost_reason: 'no_response'
    }
  ];
  var fc = {
    r2: '2026-08-16T12:00:00.000Z',
    r3: '2026-08-17T11:00:00.000Z',
    r4: '2026-08-18T11:00:00.000Z'
  };
  var rep = cd.buildReporting(rows, fc, period, {});
  assert.strictEqual(rep.funnel.stages[0].count, 5);
  assert.strictEqual(rep.funnel.stages[1].count, 4); // contacted+qualified+won+lost
  assert.strictEqual(rep.funnel.stages[2].count, 2); // qualified+won
  assert.strictEqual(rep.funnel.stages[3].count, 1);
  assert.strictEqual(rep.funnel.stages[3].key, 'successful_introduction');
  assert.strictEqual(rep.funnel.denominator, 'received');
  assert.ok(rep.funnel.stages[1].rate.value != null);
  assert.strictEqual(rep.funnel.stages[1].rate.denominator, 5);
  assert.strictEqual(rep.loss.closedLostTotal, 1);
  assert.strictEqual(rep.loss.items[0].reason, 'no_response');
  assert.strictEqual(rep.loss.items[0].count, 1);
  assert.strictEqual(rep.marketplaceAnalytics.available, false);
  assert.strictEqual(rep.supply.byRegion.available, false);
  assert.ok(rep.supply.byCategory.length >= 2);
  assert.ok(rep.professionalIntelligence.items.length >= 2);
});

test('loss: frozen keys only; other detail not a category', function () {
  assert.deepStrictEqual(cr.CLOSED_LOST_REASONS, [
    'no_response',
    'not_qualified',
    'no_suitable_professional',
    'customer_cancelled',
    'duplicate',
    'out_of_scope',
    'other'
  ]);
  var period = cd.parsePeriod({ period: '30', now: new Date('2026-08-20T12:00:00.000Z') });
  var rows = [
    {
      id: 'a',
      status: 'closed_lost',
      created_at: '2026-08-19T10:00:00.000Z',
      category_id: null,
      partner_id: 'p',
      partner_slug: 'p',
      closed_lost_reason: 'other',
      closed_lost_detail: 'custom free text never becomes category'
    },
    {
      id: 'b',
      status: 'closed_lost',
      created_at: '2026-08-19T11:00:00.000Z',
      category_id: null,
      partner_id: 'p',
      partner_slug: 'p',
      closed_lost_reason: 'duplicate'
    }
  ];
  var rep = cd.buildReporting(rows, {}, period, {});
  assert.strictEqual(rep.loss.closedLostTotal, 2);
  var other = rep.loss.items.filter(function (i) {
    return i.reason === 'other';
  })[0];
  assert.strictEqual(other.count, 1);
  var reasons = rep.loss.items.map(function (i) {
    return i.reason;
  });
  assert.ok(reasons.indexOf('custom free text never becomes category') < 0);
});

test('filters: period + category + partner; region unavailable', function () {
  var period = cd.parsePeriod({
    period: 'custom',
    createdFrom: '2026-08-01',
    createdTo: '2026-08-31',
    now: new Date('2026-08-20T12:00:00.000Z')
  });
  assert.strictEqual(period.period, 'custom');
  assert.ok(period.fromIso);
  assert.ok(period.toIso.indexOf('23:59:59') >= 0 || period.to);

  var rows = [
    {
      id: '1',
      status: 'new',
      created_at: '2026-08-10T10:00:00.000Z',
      category_id: 'dakwerken',
      partner_id: 'p1',
      partner_slug: 'acme-dak',
      closed_lost_reason: null
    },
    {
      id: '2',
      status: 'new',
      created_at: '2026-08-10T10:00:00.000Z',
      category_id: 'keuken',
      partner_id: 'p2',
      partner_slug: 'other',
      closed_lost_reason: null
    }
  ];
  var filtered = cd.buildReporting(rows, {}, period, { categoryId: 'dakwerken' });
  assert.strictEqual(filtered.funnel.stages[0].count, 1);
  assert.strictEqual(filtered.filters.region.available, false);

  var byPartner = cd.buildReporting(rows, {}, period, { partnerSlug: 'acme-dak' });
  assert.strictEqual(byPartner.funnel.stages[0].count, 1);
});

test('first contact within SLA metric uses events + Automation deadline', function () {
  var period = cd.parsePeriod({ period: '30', now: new Date('2026-08-20T12:00:00.000Z') });
  // Fri 08-14 created; SLA = Tue 08-18 10:00
  var rows = [
    {
      id: 'in',
      status: 'contacted',
      created_at: '2026-08-14T10:00:00.000Z',
      category_id: null,
      partner_id: 'p',
      partner_slug: 'p',
      closed_lost_reason: null
    },
    {
      id: 'out',
      status: 'contacted',
      created_at: '2026-08-14T10:00:00.000Z',
      category_id: null,
      partner_id: 'p',
      partner_slug: 'p',
      closed_lost_reason: null
    }
  ];
  var fc = {
    in: '2026-08-17T09:00:00.000Z',
    out: '2026-08-18T11:00:00.000Z'
  };
  var rep = cd.buildReporting(rows, fc, period, {});
  assert.strictEqual(rep.firstContact.contactedWithEventCount, 2);
  assert.strictEqual(rep.firstContact.pctFirstContactWithinSla.numerator, 1);
  assert.strictEqual(rep.firstContact.pctFirstContactWithinSla.denominator, 2);
  assert.ok(rep.firstContact.avgTimeToFirstContactMs != null);
});

test('API wires ops/customers/reporting behind staff', function () {
  var api = source('api/control.js');
  assert.ok(api.indexOf("action === 'ops-attention'") >= 0);
  assert.ok(api.indexOf("action === 'customers-list'") >= 0);
  assert.ok(api.indexOf("action === 'customers-get'") >= 0);
  assert.ok(api.indexOf("action === 'reporting'") >= 0);
  assert.ok(api.indexOf('getOperationsAttention') >= 0);
  assert.ok(api.indexOf('listCustomers') >= 0);
  assert.ok(api.indexOf('getReporting') >= 0);
  assert.ok(api.indexOf('withStaff') >= 0);
  // actions sit inside withStaff callback — ensure requireStaff still gates
  assert.ok(api.indexOf('requireStaff') >= 0);
});

test('UI pages + nav + rewrite exist; no CSV export', function () {
  ['overzicht', 'klanten', 'rapportage'].forEach(function (page) {
    var html = source('professionals/' + page + '.html');
    assert.ok(html.indexOf('noindex') >= 0);
    assert.ok(html.indexOf('Overzicht') >= 0);
    assert.ok(html.indexOf('Klanten') >= 0);
    assert.ok(html.indexOf('Rapportage') >= 0);
    assert.ok(html.toLowerCase().indexOf('csv') < 0);
  });
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/control-home.js')));
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/control-customers.js')));
  assert.ok(fs.existsSync(path.join(root, 'js/professionals/control-reporting.js')));

  var home = source('js/professionals/control-home.js');
  assert.ok(home.indexOf('ops-attention') >= 0);
  assert.ok(home.indexOf('autopilot-queue') >= 0);
  assert.ok(home.indexOf('Alles bijgewerkt') >= 0);
  assert.ok(home.indexOf('/professionals/aanvragen/') >= 0);

  var ctrl = source('js/professionals/control.js');
  assert.ok(ctrl.indexOf('AUTOPILOT_STATUS_LABELS') >= 0);
  assert.ok(ctrl.indexOf('Publiceer') >= 0);
  assert.ok(ctrl.indexOf('Vraag aanvulling') >= 0);

  var reqCtrl = source('js/professionals/control-requests.js');
  assert.ok(reqCtrl.indexOf('REQUEST_STATUS_LABELS') >= 0);
  assert.ok(reqCtrl.indexOf('Succesvolle introductie') >= 0);
  assert.ok(reqCtrl.indexOf('Partnerreactie:') >= 0);

  var cust = source('js/professionals/control-customers.js');
  assert.ok(cust.indexOf('customers-list') >= 0);
  assert.ok(cust.indexOf('customers-get') >= 0);
  assert.ok(cust.indexOf('Niet beschikbaar') >= 0);

  var rep = source('js/professionals/control-reporting.js');
  assert.ok(rep.indexOf('reporting') >= 0);
  assert.ok(rep.indexOf('Succesvolle introductie') >= 0 || source('professionals/rapportage.html').indexOf('Succesvolle introductie') >= 0);
  assert.ok(rep.indexOf('Niet beschikbaar') >= 0);

  var vercel = JSON.parse(source('vercel.json'));
  var hit = (vercel.rewrites || []).some(function (r) {
    return String(r.source || '').indexOf('/professionals/klanten/:customerKey') >= 0;
  });
  assert.ok(hit, 'klanten detail rewrite');
});

test('privacy: staff-only pages; no customer login / marketing / scoring', function () {
  var cust = source('js/professionals/control-customers.js');
  assert.ok(cust.indexOf('requireStaffOrRedirect') >= 0);
  assert.ok(cust.indexOf('loyalty') < 0);
  assert.ok(cust.indexOf('score') < 0);
  var server = source('server/control-data.js');
  assert.ok(server.indexOf('fuzzy') < 0 || server.indexOf('No fuzzy') >= 0);
  assert.ok(server.indexOf('normalized email') >= 0 || server.indexOf('normalized_email') >= 0);
});

test('performance bounds documented as constants', function () {
  assert.ok(cd.CUSTOMERS_FETCH_LIMIT <= 5000);
  assert.ok(cd.REPORTING_FETCH_LIMIT <= 5000);
  assert.ok(cd.OPS_FETCH_LIMIT <= 500);
});

test('frozen: no vk-app / marketplace redesign in control-data UI', function () {
  ['control-home.js', 'control-customers.js', 'control-reporting.js'].forEach(function (f) {
    var js = source('js/professionals/' + f);
    assert.ok(js.indexOf('vk-app') < 0);
    assert.ok(js.indexOf('vakmannen') < 0);
  });
});

test('existing control nav updated without removing Partners/Aanvragen', function () {
  var partners = source('professionals/control.html');
  var aanvragen = source('professionals/aanvragen.html');
  assert.ok(partners.indexOf('/professionals/overzicht') >= 0);
  assert.ok(partners.indexOf('/professionals/klanten') >= 0);
  assert.ok(partners.indexOf('/professionals/rapportage') >= 0);
  assert.ok(aanvragen.indexOf('/professionals/overzicht') >= 0);
  assert.ok(aanvragen.indexOf('Aanvragen') >= 0);
});

console.log('');
if (failed) {
  console.error(failed + ' control-data check(s) failed');
  process.exit(1);
}
console.log('All control-data checks passed');
