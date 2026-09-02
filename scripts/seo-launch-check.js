'use strict';
/**
 * SEO launch-readiness static checks.
 * Run: node scripts/seo-launch-check.js
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

test('robots.txt points to www.elyan.be sitemap', function () {
  var robots = read('robots.txt');
  assert.ok(robots.indexOf('Sitemap: https://www.elyan.be/sitemap.xml') >= 0);
  assert.ok(robots.indexOf('Disallow: /professionals/') >= 0);
  assert.ok(robots.indexOf('Disallow: /api/') >= 0);
});

test('vercel rewrite for dynamic sitemap', function () {
  var conf = JSON.parse(read('vercel.json'));
  var hit = (conf.rewrites || []).some(function (r) {
    return r.source === '/sitemap.xml' && String(r.destination).indexOf('sitemap') >= 0;
  });
  assert.ok(hit);
});

test('no Vercel client analytics scripts in production HTML', function () {
  var pages = [
    'index.html', 'contact.html', 'partners.html', 'privacybeleid.html',
    'cookiebeleid.html', 'voorwaarden.html', 'vakmannen.html'
  ];
  pages.forEach(function (p) {
    var html = read(p);
    assert.ok(html.indexOf('/_vercel/insights/') < 0, p + ' has insights');
    assert.ok(html.indexOf('/_vercel/speed-insights/') < 0, p + ' has speed-insights');
  });
});

test('indexable pages have title and www canonical', function () {
  var pages = {
    'index.html': 'www.elyan.be',
    'vakmannen.html': 'www.elyan.be/vakmannen',
    'prijs-berekenen.html': 'www.elyan.be/prijs-berekenen',
    'partners.html': 'www.elyan.be/partners',
    'contact.html': 'www.elyan.be/contact'
  };
  Object.keys(pages).forEach(function (p) {
    var html = read(p);
    assert.ok(/<title>[^<]+<\/title>/i.test(html), p + ' title');
    assert.ok(html.indexOf('rel="canonical"') >= 0, p + ' canonical');
    assert.ok(html.indexOf(pages[p]) >= 0, p + ' canonical domain');
  });
});

test('professionals login is noindex', function () {
  assert.ok(read('professionals/login.html').indexOf('noindex') >= 0);
});

test('request intake page is noindex', function () {
  assert.ok(read('vakmannen-aanvraag.html').indexOf('noindex') >= 0);
});

test('no fake LocalBusiness schema', function () {
  var html = read('index.html');
  assert.ok(html.indexOf('LocalBusiness') < 0);
  assert.ok(html.indexOf('aggregateRating') < 0);
});

test('WebSite JSON-LD on homepage only', function () {
  assert.ok(read('index.html').indexOf('"@type":"WebSite"') >= 0);
});

test('analytics.js client helper exists', function () {
  assert.ok(read('js/analytics.js').indexOf('ElyanAnalytics') >= 0);
  assert.ok(read('js/analytics.js').indexOf('localStorage') < 0);
});

test('dynamic sitemap API exists', function () {
  assert.ok(fs.existsSync(path.join(root, 'api/sitemap.xml.js')));
});

if (failed) {
  console.error('\n' + failed + ' SEO check(s) failed.');
  process.exit(1);
}
console.log('\nAll SEO launch checks passed.');
