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

test('events contract doc exists', function () {
  assert.ok(fs.existsSync(path.join(root, 'scripts/analytics-events.md')));
});

if (failed) {
  console.error('\n' + failed + ' analytics check(s) failed.');
  process.exit(1);
}
console.log('\nAll analytics checks passed.');
