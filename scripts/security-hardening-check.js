/**
 * Security & production hardening V1 — static + unit regression checks.
 * No live secrets printed. No product redesign assertions beyond freeze.
 */
'use strict';

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
    var ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret
        .then(function () { console.log('ok - ' + name); })
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

test('PublicSnapshot leak blocklist covers customer PII keys', function () {
  var snap = require('../server/public-snapshot');
  var src = source('server/public-snapshot.js');
  ['email', 'phone', 'address', 'contact_name', 'partner_id', 'user_id'].forEach(function (k) {
    assert.ok(src.indexOf("'" + k + "'") >= 0 || src.indexOf('"' + k + '"') >= 0, k);
  });
  assert.strictEqual(typeof snap.buildPublicSnapshotV1, 'function');
});

test('marketplace public fail-closed on unpublished', function () {
  var src = source('server/marketplace-public.js');
  assert.ok(src.indexOf('profile_status') >= 0);
  assert.ok(src.indexOf("'published'") >= 0 || src.indexOf('"published"') >= 0);
  assert.ok(src.indexOf('account_status') >= 0);
});

test('interest intake preserves abuse controls', function () {
  var src = source('server/interest-intake.js');
  assert.ok(src.indexOf('honeypot') >= 0 || src.indexOf('website') >= 0);
  assert.ok(src.indexOf('consent') >= 0);
  assert.ok(src.indexOf('DEDUPE') >= 0 || src.indexOf('dedupe') >= 0);
  var api = source('api/public/v1.js');
  assert.ok(api.indexOf('rate_limited') >= 0);
  assert.ok(api.indexOf('payload = { ok: true }') >= 0);
});

test('rate limiter prefers trusted IP / rightmost XFF', function () {
  var rl = require('../server/rate-limit');
  assert.strictEqual(
    rl.clientIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.50' } }),
    '203.0.113.50'
  );
  assert.strictEqual(
    rl.clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.99' } }),
    '203.0.113.99',
    'must not trust left-most spoofed hop'
  );
  assert.strictEqual(
    rl.clientIp({ headers: { 'x-real-ip': '198.51.100.7' } }),
    '198.51.100.7'
  );
  assert.strictEqual(
    rl.clientIp({
      headers: {
        'x-vercel-forwarded-for': '203.0.113.2',
        'x-forwarded-for': '1.1.1.1, 9.9.9.9'
      }
    }),
    '203.0.113.2',
    'platform header must win over client-spoofable XFF'
  );
  assert.strictEqual(rl.clientIp({ headers: {} }), 'unknown');
  assert.strictEqual(
    rl.clientIp({ headers: { 'x-forwarded-for': ['8.8.8.8, 10.0.0.9'] } }),
    '10.0.0.9',
    'array header values must normalize'
  );
  var key = rl.clientKey({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } }, 't');
  assert.ok(key.indexOf('10.0.0.1') === 0);
  assert.ok(key.indexOf('9.9.9.9') < 0);
});

test('rate limiter trips and documents non-distributed role', function () {
  var rl = require('../server/rate-limit');
  var src = source('server/rate-limit.js');
  assert.ok(src.indexOf('NOT a') >= 0 || src.indexOf('Not a global') >= 0 || src.indexOf('not sync') >= 0);
  assert.ok(src.indexOf('burst') >= 0 || src.indexOf('secondary') >= 0);
  var k = 'sec-hardening-trip:' + Date.now();
  assert.ok(rl.rateLimit(k, 2, 60000).ok);
  assert.ok(rl.rateLimit(k, 2, 60000).ok);
  assert.ok(!rl.rateLimit(k, 2, 60000).ok);
});

test('unauthenticated email endpoints have rate limits', function () {
  ['api/send-report.js', 'api/send-project-report.js', 'api/partner-interest.js'].forEach(function (f) {
    var src = source(f);
    assert.ok(src.indexOf('rateLimit') >= 0, f + ' missing rateLimit');
    assert.ok(src.indexOf('rate_limited') >= 0, f + ' missing 429');
  });
});

test('partner-interest honeypot does not collide with live form fields', function () {
  var api = source('api/partner-interest.js');
  var formJs = source('js/partners.js');
  assert.ok(api.indexOf('body.url') >= 0 || api.indexOf('url ||') >= 0);
  assert.ok(api.indexOf('fax') >= 0);
  assert.ok(api.indexOf('hp_company') >= 0);
  // Live payload uses website, not url/fax/hp_company.
  assert.ok(formJs.indexOf('website: website') >= 0 || formJs.indexOf('website:') >= 0);
  assert.ok(formJs.indexOf('url:') < 0);
  assert.ok(formJs.indexOf('fax:') < 0);
  assert.ok(formJs.indexOf('hp_company') < 0);
  assert.ok(api.indexOf('return res.status(200).json({ ok: true })') >= 0);
});

test('Control auth is staff-gated server-side', function () {
  var src = source('api/control.js');
  assert.ok(src.indexOf('requireStaff') >= 0);
  assert.ok(src.indexOf('withStaff') >= 0);
  assert.ok(src.indexOf('not_staff') >= 0);
  assert.ok(src.indexOf("result.code !== 'server_error'") >= 0);
});

test('Professional tenancy uses requirePartnerContext', function () {
  var ten = source('server/tenancy.js');
  assert.ok(ten.indexOf('requirePartnerContext') >= 0);
  assert.ok(ten.indexOf('authorization_denied') >= 0);
  var assets = source('server/assets.js');
  assert.ok(assets.indexOf('partner_id !== partnerId') >= 0 || assets.indexOf('data.partner_id !== partnerId') >= 0);
});

test('error responses avoid stack leakage patterns', function () {
  var pub = source('api/public/v1.js');
  assert.ok(pub.indexOf('e.stack') < 0 && pub.indexOf('err.stack') < 0);
  assert.ok(pub.indexOf("sendError(res, 500, 'server_error')") >= 0);
  var http = source('server/http.js');
  assert.ok(http.indexOf('userMessage') >= 0);
  assert.ok(http.indexOf('stack') < 0);
  var ctrl = source('api/control.js');
  assert.ok(ctrl.indexOf("result.code !== 'server_error'") >= 0);
  var prof = source('api/professionals.js');
  assert.ok(prof.indexOf("result.code !== 'server_error'") >= 0);
});

test('Phase 1 security headers: HSTS without preload/subdomains; no CSP', function () {
  var conf = JSON.parse(source('vercel.json'));
  assert.ok(Array.isArray(conf.headers) && conf.headers.length >= 1);
  var hdrs = conf.headers[0].headers || [];
  var map = {};
  hdrs.forEach(function (h) {
    map[h.key] = h.value;
  });
  assert.strictEqual(map['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(map['X-Frame-Options'], 'SAMEORIGIN');
  assert.ok(map['Referrer-Policy']);
  assert.ok(map['Permissions-Policy']);
  assert.strictEqual(map['Strict-Transport-Security'], 'max-age=15768000');
  assert.ok(map['Strict-Transport-Security'].indexOf('preload') < 0);
  assert.ok(map['Strict-Transport-Security'].indexOf('includeSubDomains') < 0);
  assert.strictEqual(map['Content-Security-Policy'], undefined, 'no blind CSP');
});

test('public cache TTLs shortened; interest uses no-store', function () {
  var src = source('api/public/v1.js');
  assert.ok(src.indexOf('max-age=30') >= 0);
  assert.ok(src.indexOf('stale-while-revalidate=60') >= 0);
  assert.ok(src.indexOf('stale-while-revalidate=300') < 0);
  assert.ok(src.indexOf("sendJson(res, 200, payload, null)") >= 0);
  assert.ok(src.indexOf("Cache-Control', 'no-store'") >= 0 || src.indexOf('Cache-Control", "no-store"') >= 0);
});

test('blob drafts use private store; published derivatives use public store', function () {
  var src = source('server/blob-storage.js');
  assert.ok(src.indexOf("access: 'private'") >= 0);
  assert.ok(src.indexOf('putPrivateObject') >= 0);
  assert.ok(src.indexOf('BLOB_PRIVATE_READ_WRITE_TOKEN') >= 0);
  assert.ok(src.indexOf("access: 'public'") >= 0);
  assert.ok(src.indexOf('putPublicObject') >= 0);
  assert.ok(src.indexOf('getPrivateBuffer') >= 0);
  assert.ok(src.indexOf('encodePublicDerivative') >= 0);
  assert.ok(src.indexOf('limitInputPixels') >= 0);
  assert.ok(src.indexOf('.withMetadata(') < 0);
  assert.ok(src.indexOf('keepExif') < 0);
  assert.ok(src.indexOf('keepXmp') < 0);
  assert.ok(src.indexOf('keepMetadata') < 0);
  var pkg = JSON.parse(source('package.json'));
  assert.ok(pkg.dependencies && pkg.dependencies.sharp);
});

test('no committed env secrets in tracked examples', function () {
  var ex = source('.env.example');
  assert.ok(ex.indexOf('eyJ') < 0, 'no JWT-like values in .env.example');
  var gitignore = source('.gitignore');
  assert.ok(gitignore.indexOf('.env') >= 0);
});

test('interest success payload strips PII', function () {
  var src = source('api/public/v1.js');
  assert.ok(src.indexOf('payload = { ok: true }') >= 0);
  assert.ok(src.indexOf('result.email') < 0);
  assert.ok(src.indexOf('result.phone') < 0);
});

test('package.json wires security-hardening into marketplace suite', function () {
  var pkg = JSON.parse(source('package.json'));
  assert.ok(pkg.scripts['test:security-hardening'].indexOf('security-hardening-check.js') >= 0);
  assert.ok(pkg.scripts['test:security-hardening'].indexOf('private-assets-check.js') >= 0);
  assert.ok(pkg.scripts['test:marketplace'].indexOf('test:security-hardening') >= 0);
  assert.ok(fs.existsSync(path.join(root, 'scripts/security-hardening-check.js')));
  assert.ok(fs.existsSync(path.join(root, 'scripts/private-assets-check.js')));
});

(async function () {
  try {
    var handler = require('../api/control');
    assert.strictEqual(typeof handler, 'function');
    var res = {
      statusCode: 0,
      headers: {},
      setHeader: function (k, v) { this.headers[k] = v; },
      end: function (body) { this.body = body; }
    };
    await handler({
      method: 'GET',
      url: '/api/control?action=list',
      headers: {},
      query: { action: 'list' }
    }, res);
    assert.strictEqual(res.statusCode, 401, 'unauthenticated control must not 500');
    var body = JSON.parse(res.body);
    assert.ok(body.error === 'missing_token' || body.error === 'invalid_token');
    assert.ok(!/stack|MODULE_NOT_FOUND|Error:/i.test(res.body));
    console.log('ok - Control module loads and unauthenticated requests return 401 not 500');
  } catch (e) {
    failed += 1;
    console.error('FAIL - Control module loads and unauthenticated requests return 401 not 500');
    console.error('  ' + (e && e.message ? e.message : e));
  }

  if (failed) {
    console.error('\n' + failed + ' security check(s) failed');
    process.exit(1);
  }
  console.log('\nAll security hardening checks passed');
})();
