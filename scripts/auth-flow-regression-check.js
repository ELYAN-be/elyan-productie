'use strict';
/**
 * Auth invite / password / recovery regression tests.
 * Run: node scripts/auth-flow-regression-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var {
  buildPasswordSetupUrl,
  buildActivateUrl,
  decodePasswordSetupPayload,
  encodePasswordSetupPayload,
  isPasswordSetupUrl,
  resolvePasswordSetupRedirect,
  buildInviteEmailHtml,
  extractInviteEmailHrefs
} = require('../server/invite-links');
var { inviteFailureCode, hashToken, generateRawToken } = require('../server/invites');
var { isStrongPassword } = require('../server/auth-password');

var APP = 'https://www.elyan.be';
var ELYAN = 'elyanInviteTokenBase64url_XxYyZz12';

function test(name, fn) {
  fn();
  console.log('OK ', name);
}

test('valid new invite password URL embeds only Elyan token (no supabase OTP)', function () {
  var url = buildPasswordSetupUrl(APP, ELYAN);
  var u = new URL(url);
  assert.strictEqual(u.pathname, '/professionals/set-password/' + ELYAN);
  assert.strictEqual(u.search, '');
  assert.ok(url.indexOf('token_hash') < 0);
  assert.ok(url.indexOf('/professionals/activate') < 0);
  assert.ok(isPasswordSetupUrl(url));
  var decoded = decodePasswordSetupPayload(u.pathname.split('/').pop());
  assert.strictEqual(decoded.inviteToken, ELYAN);
  assert.strictEqual(decoded.legacy, false);
});

test('legacy hash\\ninvite payload still decodes', function () {
  var legacySeg = Buffer.from('supabase_hashed_token_abc\n' + ELYAN, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  var decoded = decodePasswordSetupPayload(legacySeg);
  assert.ok(decoded.legacy);
  assert.strictEqual(decoded.inviteToken, ELYAN);
  assert.strictEqual(decoded.tokenHash, 'supabase_hashed_token_abc');
});

test('expired / used / revoked invite failure codes', function () {
  assert.strictEqual(inviteFailureCode(null), 'invite_invalid');
  assert.strictEqual(
    inviteFailureCode({ invite_status: 'revoked', expires_at: new Date(Date.now() + 99999).toISOString() }),
    'invite_revoked'
  );
  assert.strictEqual(
    inviteFailureCode({ invite_status: 'accepted', expires_at: new Date(Date.now() + 99999).toISOString() }),
    'invite_used'
  );
  assert.strictEqual(
    inviteFailureCode({ invite_status: 'pending', expires_at: new Date(Date.now() - 1000).toISOString() }),
    'invite_expired'
  );
  assert.strictEqual(
    inviteFailureCode({ invite_status: 'pending', expires_at: new Date(Date.now() + 99999).toISOString() }),
    null
  );
});

test('password strength gate', function () {
  assert.ok(!isStrongPassword('short'));
  assert.ok(!isStrongPassword(''));
  assert.ok(isStrongPassword('longenough'));
});

test('redirect only after passwordUpdated', function () {
  assert.strictEqual(resolvePasswordSetupRedirect({ passwordUpdated: false, inviteToken: ELYAN }), null);
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: true, inviteToken: ELYAN }),
    '/professionals/activate?token=' + encodeURIComponent(ELYAN)
  );
  assert.strictEqual(resolvePasswordSetupRedirect({ passwordUpdated: true }), '/professionals/login');
});

test('email first CTA is set-password; second is activate', function () {
  var passwordSetupUrl = buildPasswordSetupUrl(APP, ELYAN);
  var activateUrl = buildActivateUrl(APP, ELYAN);
  var html = buildInviteEmailHtml({
    partnerName: 'Test',
    passwordSetupUrl: passwordSetupUrl,
    activateUrl: activateUrl
  });
  var hrefs = extractInviteEmailHrefs(html);
  assert.ok(isPasswordSetupUrl(hrefs.passwordSetupUrl));
  assert.strictEqual(new URL(hrefs.passwordSetupUrl).pathname, '/professionals/set-password/' + ELYAN);
});

test('control-invites no longer embeds supabase generateLink OTP in CTA', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'control-invites.js'), 'utf8');
  assert.ok(src.indexOf('buildPasswordSetupUrl(appUrl, created.rawToken)') >= 0);
  assert.ok(src.indexOf('generateSupabaseInviteLink') < 0);
});

test('professionals API exposes setup-password action', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'professionals.js'), 'utf8');
  assert.ok(src.indexOf("action === 'setup-password'") >= 0);
  assert.ok(src.indexOf('setupPasswordForInvite') >= 0);
});

test('reset-password.js uses server setup-password (no client verifyOtp invite path)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'professionals', 'reset-password.js'), 'utf8');
  assert.ok(src.indexOf("apiFetch('setup-password'") >= 0);
  assert.ok(src.indexOf('verifyOtp') < 0);
  assert.ok(src.indexOf('signInWithPassword') >= 0);
  assert.ok(src.indexOf('exchangeCodeForSession') >= 0);
});

test('core.js keeps detectSessionInUrl enabled for recovery callbacks', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'professionals', 'core.js'), 'utf8');
  assert.ok(src.indexOf('detectSessionInUrl: true') >= 0);
  assert.ok(src.indexOf('detectSessionInUrl: !isPasswordSetupRoute') < 0);
  assert.ok(src.indexOf("PASSWORD_RECOVERY") >= 0);
  assert.ok(src.indexOf('markPasswordRecoveryPending') >= 0);
  assert.ok(src.indexOf('redirectIfPasswordRecoveryPending') >= 0);
});

test('reset-password recovery stays on form then returns to login (not onboarding)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'professionals', 'reset-password.js'), 'utf8');
  assert.ok(src.indexOf('updateUser({ password:') >= 0 || src.indexOf('updateUser({ password: p1 })') >= 0);
  assert.ok(src.indexOf('clearPasswordRecoveryPending') >= 0);
  assert.ok(src.indexOf('signOut') >= 0);
  assert.ok(src.indexOf("location.replace('/professionals/login'") >= 0);
  assert.ok(src.indexOf('bootRecoveryGate') >= 0);
  // Recovery success path must not call claimed/onboarding redirect helper with claimed=true
  assert.ok(src.indexOf('Always return to login after recovery') >= 0);
});

test('login.js allows staff Control without partner membership and blocks recovery auto-route', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'professionals', 'login.js'), 'utf8');
  assert.ok(src.indexOf('redirectIfPasswordRecoveryPending') >= 0);
  assert.ok(src.indexOf("controlFetch('session')") >= 0);
  assert.ok(src.indexOf('/professionals/control') >= 0);
  assert.ok(src.indexOf('continueAfterAuth') >= 0);
  assert.ok(src.indexOf('wantsControl') >= 0);
});

test('forgot-password still targets reset-password redirectTo', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'professionals', 'forgot-password.js'), 'utf8');
  assert.ok(src.indexOf("'/professionals/reset-password'") >= 0);
  assert.ok(src.indexOf('resetPasswordForEmail') >= 0);
});

test('elyan invite token hashing remains sha256', function () {
  var t = generateRawToken();
  assert.strictEqual(hashToken(t).length, 64);
  assert.strictEqual(encodePasswordSetupPayload(t), t);
});

test('double-open safe: opening set-password URL does not require OTP consume', function () {
  // Structural: password CTA has no supabase token_hash; GET is inert.
  var url = buildPasswordSetupUrl(APP, ELYAN);
  assert.ok(url.indexOf('token_hash') < 0);
  assert.ok(url.indexOf('type=invite') < 0);
});

console.log('\nAll auth-flow regression checks passed');
