'use strict';
/**
 * Aggregate analytics contract checks.
 * Run: node scripts/analytics-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;

function read(rel) {
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

var analytics = require('../server/analytics');

test('migration defines analytics_daily_counts + increment RPC', function () {
  var sql = read('supabase/migrations/20260902_analytics_daily_counts.sql');
  assert.ok(sql.indexOf('analytics_daily_counts') >= 0);
  assert.ok(sql.indexOf('increment_analytics_daily_count') >= 0);
  assert.ok(sql.indexOf('ENABLE ROW LEVEL SECURITY') >= 0);
  assert.ok(sql.indexOf('GRANT EXECUTE') >= 0);
});

test('allowed event accepted', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'landing_view', surface: 'home' });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.event, 'landing_view');
  assert.strictEqual(v.d1, 'home');
});

test('unknown event rejected', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'page_view_xyz' });
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.code, 'unknown_event');
});

test('unknown dimension rejected', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'landing_view', surface: 'unknown_surface' });
  assert.strictEqual(v.ok, false);
});

test('PII-like keys rejected', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'landing_view', surface: 'home', email: 'a@b.be' });
  assert.strictEqual(v.ok, false);
});

test('arbitrary category rejected', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'marketplace_search', category: 'dak' });
  assert.strictEqual(v.ok, false);
});

test('canonical category accepted', function () {
  var v = analytics.validateAnalyticsPayload({ event: 'marketplace_search', category: 'dakwerken' });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.d1, 'dakwerken');
});

test('report_requested requires calculator', function () {
  var bad = analytics.validateAnalyticsPayload({ event: 'report_requested' });
  assert.strictEqual(bad.ok, false);
  var good = analytics.validateAnalyticsPayload({ event: 'report_requested', calculator: 'calc1' });
  assert.strictEqual(good.ok, true);
});

test('client analytics has no storage', function () {
  var js = read('js/analytics.js');
  assert.ok(js.indexOf('localStorage') < 0);
  assert.ok(js.indexOf('sessionStorage') < 0);
  assert.ok(js.indexOf('document.cookie') < 0);
});

test('server success hooks wired', function () {
  assert.ok(read('server/interest-intake.js').indexOf('request_submitted') >= 0);
  assert.ok(read('api/partner-interest.js').indexOf('partner_interest_submitted') >= 0);
  assert.ok(read('api/send-report.js').indexOf('report_requested') >= 0);
  assert.ok(read('api/send-project-report.js').indexOf('report_requested') >= 0);
});

test('analytics endpoint exists', function () {
  assert.ok(fs.existsSync(path.join(root, 'api/analytics.js')));
});

test('request_started only on intake form load, not profile CTA', function () {
  var pub = read('js/vakmannen-public.js');
  var intake = read('js/marketplace-interest.js');
  assert.ok(intake.indexOf("'request_started'") >= 0 || intake.indexOf('"request_started"') >= 0);
  assert.ok(pub.indexOf("'request_started'") < 0 && pub.indexOf('"request_started"') < 0,
    'vakmannen-public must not fire request_started on CTA');
});

test('calculator_started uses in-memory dedupe only', function () {
  var calc = read('js/calculator.js');
  var calc2 = read('js/calculator2.js');
  var client = read('js/analytics.js');
  assert.ok(client.indexOf('Object.create(null)') >= 0, 'in-memory fired map');
  assert.ok(calc.indexOf('trackOnce') >= 0 || calc.indexOf('calculator_started') >= 0);
  assert.ok(calc2.indexOf('trackOnce') >= 0);
  assert.ok(calc.indexOf('sessionStorage') < 0 && calc2.indexOf('sessionStorage') < 0);
});

test('events contract documents no session identifier', function () {
  var doc = read('scripts/analytics-events.md');
  assert.ok(doc.indexOf('No session ID') >= 0 || doc.indexOf('no session ID') >= 0);
  assert.ok(doc.indexOf('page/runtime') >= 0 || doc.indexOf('page-runtime') >= 0);
  assert.ok(doc.indexOf('not profile CTA') >= 0 || doc.indexOf('not profile CTA click') >= 0);
});

if (failed) {
  console.error('\n' + failed + ' analytics check(s) failed.');
  process.exit(1);
}
console.log('\nAll analytics checks passed.');
