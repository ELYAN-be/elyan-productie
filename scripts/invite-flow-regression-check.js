'use strict';
/**
 * Regression tests: Professionals invite password-setup URL mapping + redirects.
 * Run: node scripts/invite-flow-regression-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var {
  buildActivateUrl,
  buildPasswordSetupUrl,
  encodePasswordSetupPayload,
  decodePasswordSetupPayload,
  isPasswordSetupUrl,
  isActivateUrl,
  buildInviteEmailHtml,
  extractInviteEmailHrefs,
  resolvePasswordSetupRedirect
} = require('../server/invite-links');

var APP = 'https://www.elyan.be';
var HASH = 'supabase_hashed_token_abc';
var ELYAN = 'elyanInviteTokenBase64url_Xx';

function test(name, fn) {
  fn();
  console.log('OK ', name);
}

test('password setup URL is opaque set-password path with Elyan token only', function () {
  var url = buildPasswordSetupUrl(APP, ELYAN);
  var u = new URL(url);
  assert.ok(/^\/professionals\/set-password\/[A-Za-z0-9_-]+$/.test(u.pathname));
  assert.strictEqual(u.search, '');
  assert.ok(url.indexOf('/professionals/activate') < 0);
  assert.ok(url.indexOf('token_hash') < 0);
  assert.ok(isPasswordSetupUrl(url));
  var decoded = decodePasswordSetupPayload(u.pathname.split('/').pop());
  assert.strictEqual(decoded.inviteToken, ELYAN);
});

test('activate URL is membership confirm only', function () {
  var url = buildActivateUrl(APP, ELYAN);
  var u = new URL(url);
  assert.strictEqual(u.pathname, '/professionals/activate');
  assert.strictEqual(u.searchParams.get('token'), ELYAN);
  assert.ok(isActivateUrl(url));
  assert.ok(!isPasswordSetupUrl(url));
});

test('email HTML first CTA href is password setup; second is activate', function () {
  var passwordSetupUrl = buildPasswordSetupUrl(APP, ELYAN);
  var activateUrl = buildActivateUrl(APP, ELYAN);
  var html = buildInviteEmailHtml({
    partnerName: 'Testbedrijf',
    passwordSetupUrl: passwordSetupUrl,
    activateUrl: activateUrl
  });
  var hrefs = extractInviteEmailHrefs(html);
  assert.ok(hrefs.passwordSetupUrl);
  assert.ok(hrefs.activateUrl);
  assert.ok(isPasswordSetupUrl(hrefs.passwordSetupUrl));
  assert.ok(isActivateUrl(hrefs.activateUrl));
  assert.ok(hrefs.passwordSetupUrl.indexOf('/professionals/activate') < 0);
  assert.ok(hrefs.passwordSetupUrl.indexOf('/professionals/set-password/') >= 0);
  assert.ok(html.indexOf('Wachtwoord instellen') >= 0);
  assert.ok(html.indexOf('Lidmaatschap bevestigen') >= 0);
  assert.ok(html.indexOf('Account activeren / wachtwoord instellen') < 0);
});

test('legacy next=activate passwordSetupUrl is rejected', function () {
  var legacy =
    APP +
    '/professionals/reset-password?token_hash=' +
    encodeURIComponent(HASH) +
    '&type=invite&next=' +
    encodeURIComponent('/professionals/activate?token=' + ELYAN);
  assert.ok(!isPasswordSetupUrl(legacy));
});

test('legacy query invite_token form is still accepted', function () {
  var legacy =
    APP +
    '/professionals/reset-password?token_hash=' +
    encodeURIComponent(HASH) +
    '&type=invite&invite_token=' +
    encodeURIComponent(ELYAN);
  assert.ok(isPasswordSetupUrl(legacy));
});

test('supabase action_link is rejected as password setup CTA', function () {
  var action =
    'https://xyz.supabase.co/auth/v1/verify?token=' +
    HASH +
    '&type=invite&redirect_to=' +
    encodeURIComponent(APP + '/professionals/reset-password');
  assert.ok(!isPasswordSetupUrl(action));
});

test('verify/setup must never navigate: redirect only when passwordUpdated', function () {
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: false, inviteToken: ELYAN }),
    null
  );
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: false, next: '/professionals/activate?token=x' }),
    null
  );
});

test('after password saved: invite_token redirects to activate; else login', function () {
  var dest = resolvePasswordSetupRedirect({ passwordUpdated: true, inviteToken: ELYAN });
  assert.strictEqual(dest, '/professionals/activate?token=' + encodeURIComponent(ELYAN));
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: true }),
    '/professionals/login'
  );
});

test('new-user flow mapping: setup page then activate after password', function () {
  var setup = buildPasswordSetupUrl(APP, ELYAN);
  var u = new URL(setup);
  assert.ok(u.pathname.indexOf('/professionals/set-password/') === 0);
  var payload = decodePasswordSetupPayload(u.pathname.split('/').pop());
  assert.strictEqual(
    resolvePasswordSetupRedirect({
      passwordUpdated: false,
      inviteToken: payload.inviteToken
    }),
    null
  );
  var after = resolvePasswordSetupRedirect({
    passwordUpdated: true,
    inviteToken: payload.inviteToken
  });
  assert.strictEqual(after, '/professionals/activate?token=' + encodeURIComponent(ELYAN));
});

test('existing-user flow: membership link is activate only (login then claim)', function () {
  var activateUrl = buildActivateUrl(APP, ELYAN);
  assert.ok(isActivateUrl(activateUrl));
  assert.ok(!isPasswordSetupUrl(activateUrl));
});

test('encode/decode roundtrip for new format', function () {
  var enc = encodePasswordSetupPayload(ELYAN);
  var dec = decodePasswordSetupPayload(enc);
  assert.strictEqual(dec.inviteToken, ELYAN);
});

test('reset-password.js uses setup-password API (no invite verifyOtp)', function () {
  var src = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'professionals', 'reset-password.js'),
    'utf8'
  );
  assert.ok(src.indexOf("apiFetch('setup-password'") >= 0);
  assert.ok(src.indexOf('verifyOtp') < 0);
  assert.ok(src.indexOf('signInWithPassword') >= 0);
});

test('control-invites uses buildPasswordSetupUrl with raw invite token only', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'control-invites.js'), 'utf8');
  assert.ok(src.indexOf('buildPasswordSetupUrl') >= 0);
  assert.ok(src.indexOf('buildActivateUrl') >= 0);
  assert.ok(src.indexOf('passwordSetupUrl') >= 0);
  assert.ok(src.indexOf('generateSupabaseInviteLink') < 0);
  assert.ok(src.indexOf("searchParams.set('next'") < 0, 'must not set next=activate on password setup URL');
});

test('vercel rewrites set-password to reset-password page', function () {
  var cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  var hit = (cfg.rewrites || []).some(function (r) {
    return r.source === '/professionals/set-password/:payload' &&
      r.destination === '/professionals/reset-password';
  });
  assert.ok(hit, 'set-password rewrite missing');
});

console.log('\nAll invite-flow regression checks passed');
