'use strict';
/**
 * Legal launch-readiness static checks.
 * Run: node scripts/legal-launch-check.js
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

var legalPages = [
  'privacybeleid.html',
  'cookiebeleid.html',
  'voorwaarden.html',
  'voorwaarden-vakbedrijven.html'
];

test('legal pages exist', function () {
  legalPages.forEach(function (p) {
    assert.ok(fs.existsSync(path.join(root, p)), p + ' missing');
  });
});

test('internal legal identity blocker doc exists', function () {
  assert.ok(fs.existsSync(path.join(root, 'LEGAL_IDENTITY_PENDING.md')));
});

test('cookie inventory doc exists', function () {
  assert.ok(fs.existsSync(path.join(root, 'scripts/cookie-storage-inventory.md')));
});

test('no outdated no-login claim in cookie policy', function () {
  var cookie = read('cookiebeleid.html');
  assert.ok(cookie.indexOf('geen inlogfunctie') < 0, 'outdated no-login claim');
  assert.ok(cookie.indexOf('Supabase') >= 0 || cookie.indexOf('professionals') >= 0);
});

test('no calculator-only privacy scope', function () {
  var privacy = read('privacybeleid.html');
  assert.ok(privacy.indexOf('marketplace') >= 0 || privacy.indexOf('Marketplace') >= 0);
  assert.ok(privacy.indexOf('vakbedrijf') >= 0);
  assert.ok(privacy.indexOf('Partner Autopilot') >= 0 || privacy.indexOf('geautomatiseerde') >= 0);
});

test('no literal fake legal placeholders on public pages', function () {
  legalPages.forEach(function (p) {
    var html = read(p);
    assert.ok(html.indexOf('[ONDERNEMINGSNUMMER]') < 0, p);
    assert.ok(html.indexOf('[BTW-NUMMER') < 0, p);
    assert.ok(html.indexOf('GDPR compliant') < 0, p);
    assert.ok(html.indexOf('AVG gecertificeerd') < 0, p);
  });
});

test('consumer terms cover platform scope', function () {
  var terms = read('voorwaarden.html');
  assert.ok(terms.indexOf('indicatief') >= 0);
  assert.ok(terms.indexOf('geen') >= 0 && terms.indexOf('aannemer') >= 0);
  assert.ok(terms.indexOf('gratis') >= 0 || terms.indexOf('Gratis') >= 0);
  assert.ok(terms.indexOf('exact dat gekozen vakbedrijf') >= 0 || terms.indexOf('één door jou gekozen') >= 0);
});

test('professional terms exist and cover free launch', function () {
  var pro = read('voorwaarden-vakbedrijven.html');
  assert.ok(/gratis/i.test(pro));
  assert.ok(pro.indexOf('geen abonnement') >= 0);
  assert.ok(pro.indexOf('geen minimum') >= 0);
  assert.ok(pro.indexOf('niet automatisch') >= 0);
});

test('targeted request disclosure in marketplace-interest.js', function () {
  var js = read('js/marketplace-interest.js');
  assert.ok(js.indexOf('het vakbedrijf dat je hebt gekozen') >= 0);
  assert.ok(js.indexOf('niet rechtstreeks naar het vakbedrijf') < 0);
  assert.ok(js.indexOf('name="consent"') < 0, 'request form should use notice not checkbox');
});

test('privacy policy describes one-partner request sharing', function () {
  var privacy = read('privacybeleid.html');
  assert.ok(/exact dat gekozen|één gekozen/i.test(privacy));
});

test('analytics recheck marker present', function () {
  assert.ok(read('privacybeleid.html').indexOf('ANALYTICS') >= 0 || read('privacybeleid.html').indexOf('analytics') >= 0);
  assert.ok(read('scripts/cookie-storage-inventory.md').indexOf('RECHECKED AFTER ANALYTICS') >= 0);
});

test('index footer links to professional terms', function () {
  assert.ok(read('index.html').indexOf('voorwaarden-vakbedrijven.html') >= 0);
});

if (failed) {
  console.error('\n' + failed + ' check(s) failed.');
  process.exit(1);
}
console.log('\nAll legal launch checks passed.');
