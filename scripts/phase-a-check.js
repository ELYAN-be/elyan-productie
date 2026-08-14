/**
 * Phase A offline checks (no live Supabase required).
 * Run: node scripts/phase-a-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}

function test(name, fn) {
  try { fn(); ok(name); } catch (e) { fail(name, e); }
}

test('migration file exists', function () {
  var p = path.join(root, 'supabase/migrations/20260814_phase_a_foundation.sql');
  assert.ok(fs.existsSync(p));
  var sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.indexOf('account_status') >= 0);
  assert.ok(sql.indexOf('partner_invites') >= 0);
  assert.ok(sql.indexOf('ENABLE ROW LEVEL SECURITY') >= 0);
  assert.ok(sql.indexOf('onboarding_status') < 0);
  assert.ok(sql.indexOf('partners.status') < 0 || sql.indexOf('account_status') >= 0);
});

test('env example has no secrets and required names', function () {
  var env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'PROFESSIONALS_APP_URL', 'RESEND_API_KEY', 'BLOB_READ_WRITE_TOKEN'].forEach(function (k) {
    assert.ok(env.indexOf(k) >= 0, k);
  });
  assert.ok(env.indexOf('SUPABASE_JWT_SECRET') < 0);
  assert.ok(!/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(env));
});

test('invite hash is deterministic sha256', function () {
  var invites = require('../api/lib/invites');
  var raw = 'test-token-abc';
  var h1 = invites.hashToken(raw);
  var h2 = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  assert.strictEqual(h1, h2);
  assert.notStrictEqual(h1, raw);
});

test('email normalize lowercases', function () {
  var invites = require('../api/lib/invites');
  assert.strictEqual(invites.normalizeEmail('  Foo@ELYAN.BE '), 'foo@elyan.be');
  assert.ok(invites.isValidEmail('a@b.be'));
  assert.ok(!invites.isValidEmail('nope'));
});

test('inviteFailureCode fail-closed', function () {
  var invites = require('../api/lib/invites');
  assert.strictEqual(invites.inviteFailureCode(null), 'invite_invalid');
  assert.strictEqual(invites.inviteFailureCode({ invite_status: 'revoked', expires_at: new Date(Date.now() + 99999).toISOString() }), 'invite_revoked');
  assert.strictEqual(invites.inviteFailureCode({ invite_status: 'accepted', expires_at: new Date(Date.now() + 99999).toISOString() }), 'invite_used');
  assert.strictEqual(invites.inviteFailureCode({ invite_status: 'pending', expires_at: new Date(Date.now() - 1000).toISOString() }), 'invite_expired');
  assert.strictEqual(invites.inviteFailureCode({ invite_status: 'pending', expires_at: new Date(Date.now() + 99999).toISOString() }), null);
});

test('rate limit trips', function () {
  var rl = require('../api/lib/rate-limit');
  var key = 'test:' + Date.now();
  assert.ok(rl.rateLimit(key, 2, 60000).ok);
  assert.ok(rl.rateLimit(key, 2, 60000).ok);
  assert.ok(!rl.rateLimit(key, 2, 60000).ok);
});

test('audit scrub removes tokens', function () {
  var audit = require('../api/lib/audit');
  var scrubbed = audit.scrubMeta({ token: 'secret', email: 'a@b.be', token_hash: 'x' });
  assert.strictEqual(scrubbed.email, 'a@b.be');
  assert.strictEqual(scrubbed.token, undefined);
  assert.strictEqual(scrubbed.token_hash, undefined);
});

test('API route files exist', function () {
  [
    'api/professionals/session.js',
    'api/professionals/activate.js',
    'api/professionals/logout.js',
    'api/professionals/public-config.js',
    'api/professionals/login-audit.js',
    'api/control/invites.js',
    'api/lib/supabase.js',
    'api/lib/tenancy.js',
    'api/lib/invites.js'
  ].forEach(function (f) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  });
});

test('professionals pages exist', function () {
  ['login', 'activate', 'forgot-password', 'reset-password', 'dashboard', 'onboarding'].forEach(function (p) {
    assert.ok(fs.existsSync(path.join(root, 'professionals', p + '.html')), p);
  });
});

test('production prepare removes internal/ when VERCEL_ENV=production', function () {
  var script = fs.readFileSync(path.join(root, 'scripts/prepare-production-deploy.js'), 'utf8');
  assert.ok(script.indexOf("VERCEL_ENV") >= 0);
  assert.ok(script.indexOf("production") >= 0);
  assert.ok(script.indexOf("internal") >= 0);
  assert.ok(script.indexOf('rmSync') >= 0 || script.indexOf('rmdirSync') >= 0);
});

test('internal partner-lab still present in workspace (preview/dev)', function () {
  assert.ok(fs.existsSync(path.join(root, 'internal/partner-lab.html')));
});

test('no service role in browser bundles', function () {
  var core = fs.readFileSync(path.join(root, 'js/professionals/core.js'), 'utf8');
  assert.ok(core.indexOf('SERVICE_ROLE') < 0);
  assert.ok(core.indexOf('service_role') < 0);
  var files = fs.readdirSync(path.join(root, 'js/professionals'));
  files.forEach(function (f) {
    var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
    assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
  });
});

test('dashboard does not link to partner lab', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/dashboard.html'), 'utf8');
  assert.ok(html.indexOf('/internal/partner-lab') < 0);
});

console.log('');
if (failed) {
  console.error(failed + ' Phase A check(s) failed');
  process.exit(1);
}
console.log('All Phase A offline checks passed');
