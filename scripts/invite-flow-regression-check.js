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

test('password setup URL is reset-password with token_hash + invite_token (no activate path)', function () {
  var url = buildPasswordSetupUrl(APP, HASH, ELYAN);
  var u = new URL(url);
  assert.strictEqual(u.pathname, '/professionals/reset-password');
  assert.strictEqual(u.searchParams.get('token_hash'), HASH);
  assert.strictEqual(u.searchParams.get('type'), 'invite');
  assert.strictEqual(u.searchParams.get('invite_token'), ELYAN);
  assert.strictEqual(u.searchParams.get('next'), null);
  assert.ok(url.indexOf('/professionals/activate') < 0);
  assert.ok(isPasswordSetupUrl(url));
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
  var passwordSetupUrl = buildPasswordSetupUrl(APP, HASH, ELYAN);
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
  assert.ok(html.indexOf('Wachtwoord instellen') >= 0);
  assert.ok(html.indexOf('Lidmaatschap bevestigen') >= 0);
  // Legacy confusing CTA label must not appear
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

test('supabase action_link is rejected as password setup CTA', function () {
  var action =
    'https://xyz.supabase.co/auth/v1/verify?token=' +
    HASH +
    '&type=invite&redirect_to=' +
    encodeURIComponent(APP + '/professionals/reset-password');
  assert.ok(!isPasswordSetupUrl(action));
});

test('verifyOtp must never navigate: redirect only when passwordUpdated', function () {
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: false, inviteToken: ELYAN }),
    null
  );
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: false, next: '/professionals/activate?token=x' }),
    null
  );
});

test('after updateUser: invite_token redirects to activate; else login', function () {
  var dest = resolvePasswordSetupRedirect({ passwordUpdated: true, inviteToken: ELYAN });
  assert.strictEqual(dest, '/professionals/activate?token=' + encodeURIComponent(ELYAN));
  assert.strictEqual(
    resolvePasswordSetupRedirect({ passwordUpdated: true }),
    '/professionals/login'
  );
});

test('new-user flow mapping: setup page visible then activate after password', function () {
  var setup = buildPasswordSetupUrl(APP, HASH, ELYAN);
  var u = new URL(setup);
  assert.strictEqual(u.pathname, '/professionals/reset-password');
  // Simulated: verifyOtp OK → still on reset-password (no navigation helper returns null)
  assert.strictEqual(
    resolvePasswordSetupRedirect({
      passwordUpdated: false,
      inviteToken: u.searchParams.get('invite_token')
    }),
    null
  );
  // Simulated: updateUser OK → activate for membership claim
  var after = resolvePasswordSetupRedirect({
    passwordUpdated: true,
    inviteToken: u.searchParams.get('invite_token')
  });
  assert.strictEqual(after, '/professionals/activate?token=' + encodeURIComponent(ELYAN));
});

test('existing-user flow: membership link is activate only (login then claim)', function () {
  var activateUrl = buildActivateUrl(APP, ELYAN);
  assert.ok(isActivateUrl(activateUrl));
  assert.ok(!isPasswordSetupUrl(activateUrl));
});

test('reset-password.js contains verify-then-update order and no navigate after verify alone', function () {
  var src = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'professionals', 'reset-password.js'),
    'utf8'
  );
  var verifyCall = src.indexOf("verifyOtp({ token_hash: tokenHash, type: 'invite' })");
  assert.ok(verifyCall > 0, 'invite verifyOtp call present');
  var afterVerify = src.slice(verifyCall);
  var updateCall = afterVerify.indexOf('updateUser({ password: p1 })');
  var redirectCall = afterVerify.indexOf('redirectAfterPasswordUpdate(');
  assert.ok(updateCall > 0, 'updateUser after verifyOtp');
  assert.ok(redirectCall > updateCall, 'redirect only after updateUser in invite path');
  var between = afterVerify.slice(0, updateCall);
  assert.ok(between.indexOf('location.replace') < 0, 'no navigation between verify and update');
  assert.ok(between.indexOf('redirectAfterPasswordUpdate') < 0, 'no redirect helper between verify and update');
});

test('control-invites uses buildPasswordSetupUrl / buildActivateUrl', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'api', 'control-invites.js'), 'utf8');
  assert.ok(src.indexOf('buildPasswordSetupUrl') >= 0);
  assert.ok(src.indexOf('buildActivateUrl') >= 0);
  assert.ok(src.indexOf('passwordSetupUrl') >= 0);
  assert.ok(src.indexOf("searchParams.set('next'") < 0, 'must not set next=activate on password setup URL');
});

console.log('\nAll invite-flow regression checks passed');
