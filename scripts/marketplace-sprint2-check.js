'use strict';
/**
 * Marketplace Phase 1 Sprint 2 — landing + category UX (Design Freeze V3 D1/D2).
 * Run: node scripts/marketplace-sprint2-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var http = require('http');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) {
  console.log('OK  ' + name);
}
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    fn();
    ok(name);
  } catch (e) {
    fail(name, e);
  }
}

var UI = require('../shared/vakmannen/marketplace-ui');
var marketplace = require('../server/marketplace-public');
var CI = require('../shared/vakmannen/intelligence');

var ALL_CATS = UI.CATEGORY_IDS.slice();
var PROBLEMS = marketplace.listProblems();

test('exact 12 category ids frozen', function () {
  assert.deepStrictEqual(ALL_CATS, [
    'dakwerken',
    'badkamer',
    'keuken',
    'ramen-deuren',
    'isolatie',
    'verwarming',
    'elektriciteit',
    'gevel',
    'vloeren',
    'schilderwerken',
    'ventilatie',
    'zonnepanelen'
  ]);
  assert.strictEqual(marketplace.listCategories().length, 12);
});

test('13 problem → category mappings frozen', function () {
  assert.strictEqual(PROBLEMS.length, 13);
  var expected = {
    leak_roof: 'dakwerken',
    new_roof: 'dakwerken',
    bathroom: 'badkamer',
    kitchen: 'keuken',
    windows: 'ramen-deuren',
    insulation: 'isolatie',
    heating: 'verwarming',
    electrical: 'elektriciteit',
    facade: 'gevel',
    floors: 'vloeren',
    painting: 'schilderwerken',
    ventilation: 'ventilatie',
    solar: 'zonnepanelen'
  };
  PROBLEMS.forEach(function (p) {
    assert.strictEqual(p.categoryId, expected[p.id], p.id);
    assert.ok(UI.isCategoryId(p.categoryId));
  });
});

test('parseCategoryRoute validates categories', function () {
  assert.strictEqual(UI.parseCategoryRoute('/vakmannen/dakwerken').ok, true);
  assert.strictEqual(UI.parseCategoryRoute('/vakmannen/dakwerken/antwerpen').regioSlug, 'antwerpen');
  assert.strictEqual(UI.parseCategoryRoute('/vakmannen/niet-bestaand').ok, false);
});

test('buildSearchPath encodes Sprint 3 contract', function () {
  var p = UI.buildSearchPath('dakwerken', { name: 'Gent', postcode: '9000', province: 'Oost-Vlaanderen' });
  assert.ok(p.indexOf('/vakmannen/dakwerken/oost-vlaanderen') === 0);
  assert.ok(p.indexOf('postcode=9000') >= 0);
  assert.ok(p.indexOf('gemeente=Gent') >= 0);
});

test('landing HTML D1 section order + copy gates', function () {
  var html = fs.readFileSync(path.join(root, 'vakmannen.html'), 'utf8');
  var order = [
    'site-header',
    'mp-hero',
    'mp-trust',
    'id="categorieen"',
    'id="probleemgids"',
    'id="hoe-het-werkt"',
    'mp-seo',
    'site-footer'
  ];
  var last = -1;
  order.forEach(function (token) {
    var i = html.indexOf(token);
    assert.ok(i > last, 'missing or out of order: ' + token);
    last = i;
  });
  assert.ok(html.indexOf('Vind een nagekeken vakbedrijf voor jouw renovatie') >= 0);
  assert.ok(html.indexOf('Profielen nagekeken door ELYAN') >= 0);
  assert.ok(html.indexOf('Aanvragen lopen via ELYAN') >= 0);
  assert.ok(html.indexOf('Richtprijzen waar beschikbaar') >= 0);
  assert.ok(html.indexOf('Kies wat je wilt renoveren') >= 0);
  assert.ok(html.indexOf('Bekijk geschikte vakbedrijven') >= 0);
  assert.ok(html.indexOf('Vraag een bedrijf aan via ELYAN') >= 0);
  assert.ok(html.indexOf('rel="canonical"') >= 0);
  assert.ok(html.indexOf('https://www.elyan.be/vakmannen') >= 0);
  assert.ok(html.indexOf('marketplace-landing.js') >= 0);
  assert.ok(html.toLowerCase().indexOf('vergelijk') < 0, 'no compare-copy');
  assert.ok(html.indexOf('heel België') < 0 && html.indexOf('Heel België') < 0);
  assert.ok(!/tel:|mailto:/i.test(html), 'no tel/mail CTA');
  assert.ok(html.indexOf('vakmannen-public.js') < 0, 'old lab public JS must not load');
});

test('category template present + no result cards / intake', function () {
  var html = fs.readFileSync(path.join(root, 'vakmannen-categorie.html'), 'utf8');
  assert.ok(html.indexOf('marketplace-category.js') >= 0);
  assert.ok(html.indexOf('rel="canonical"') >= 0);
  assert.ok(html.indexOf('Interest') < 0);
  assert.ok(html.toLowerCase().indexOf('vergelijk') < 0);
  assert.ok(html.indexOf('heel België') < 0);
  assert.ok(!/tel:|mailto:/i.test(html));
  var js = fs.readFileSync(path.join(root, 'js/marketplace-category.js'), 'utf8');
  assert.ok(js.indexOf('result') < 0 || js.indexOf('Geen resultaten') >= 0);
  assert.ok(js.indexOf('/api/public/v1/search') < 0, 'must not call search API this sprint');
  assert.ok(js.indexOf('buildSearchPath') >= 0);
  assert.ok(js.indexOf('role="combobox"') >= 0);
  assert.ok(js.indexOf('role="listbox"') >= 0);
  assert.ok(js.indexOf('Bevestig locatie') >= 0);
  assert.ok(js.indexOf('binnenkort') < 0);
});

test('CSS responsive breakpoints + reduced motion', function () {
  var css = fs.readFileSync(path.join(root, 'css/marketplace.css'), 'utf8');
  assert.ok(css.indexOf('min-width: 768px') >= 0);
  assert.ok(css.indexOf('min-width: 1200px') >= 0);
  assert.ok(css.indexOf('max-width: 767px') >= 0);
  assert.ok(css.indexOf('prefers-reduced-motion') >= 0);
  assert.ok(css.indexOf('min-height: 44px') >= 0 || css.indexOf('min-height:44px') >= 0);
});

test('vercel rewrites: 12 categories + province; no catch-all profile', function () {
  var conf = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  var sources = (conf.rewrites || []).map(function (r) {
    return r.source;
  });
  var catRewrite = sources.filter(function (s) {
    return s.indexOf('dakwerken|badkamer') >= 0;
  });
  assert.ok(catRewrite.length >= 2, 'category + regio rewrites');
  assert.ok(
    sources.every(function (s) {
      return s.indexOf('vakmannen-detail') < 0;
    }),
    'no rewrite to vakmannen-detail'
  );
  ALL_CATS.forEach(function (id) {
    assert.ok(catRewrite.join(' ').indexOf(id) >= 0, 'rewrite covers ' + id);
  });
});

test('sitemap includes landing + 12 categories', function () {
  var sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(sm.indexOf('/vakmannen') >= 0);
  ALL_CATS.forEach(function (id) {
    assert.ok(sm.indexOf('/vakmannen/' + id) >= 0, 'sitemap ' + id);
  });
});

test('CI services available for all 12 categories', function () {
  var eng = CI.PartnerOnboardingEngine || CI;
  ALL_CATS.forEach(function (id) {
    var cat = eng.getCategory(id);
    assert.ok(cat, id);
    assert.ok(cat.services && cat.services.length > 0, id + ' services');
  });
});

test('package scripts wire sprint2', function () {
  var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:marketplace-sprint2']);
  assert.ok(pkg.scripts['test:marketplace'].indexOf('sprint2') >= 0);
});

test('landing + category JS a11y smoke tokens', function () {
  var landing = fs.readFileSync(path.join(root, 'js/marketplace-landing.js'), 'utf8');
  var cat = fs.readFileSync(path.join(root, 'js/marketplace-category.js'), 'utf8');
  assert.ok(landing.indexOf('mp-cat-tile') >= 0);
  assert.ok(landing.indexOf('/api/public/v1/categories') >= 0);
  assert.ok(landing.indexOf('/api/public/v1/problems') >= 0);
  assert.ok(cat.indexOf('aria-expanded') >= 0);
  assert.ok(cat.indexOf('aria-activedescendant') >= 0);
  assert.ok(cat.indexOf('mp-breadcrumb') >= 0 || fs.readFileSync(path.join(root, 'vakmannen-categorie.html'), 'utf8').indexOf('mp-breadcrumb') >= 0);
  assert.ok(cat.indexOf('go404') >= 0 || cat.indexOf('/404') >= 0);
});

test('no compare / heel België / tel-mail in marketplace CSS+UI modules', function () {
  var files = [
    'css/marketplace.css',
    'shared/vakmannen/marketplace-ui.js',
    'js/marketplace-landing.js',
    'js/marketplace-category.js'
  ];
  files.forEach(function (rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(src.toLowerCase().indexOf('vergelijk') < 0, rel + ' compare');
    assert.ok(src.indexOf('heel België') < 0 && src.indexOf('Heel België') < 0, rel + ' heel België');
    assert.ok(!/tel:\+|mailto:/i.test(src), rel + ' contact CTA');
  });
});

/** Optional local static smoke via tiny server when not in CI-only mode */
function request(port, urlPath) {
  return new Promise(function (resolve, reject) {
    var req = http.get({ hostname: '127.0.0.1', port: port, path: urlPath }, function (res) {
      var chunks = [];
      res.on('data', function (c) {
        chunks.push(c);
      });
      res.on('end', function () {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
  });
}

function runHttpSmoke() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var urlPath = (req.url || '/').split('?')[0];
      var fileMap = {
        '/vakmannen': 'vakmannen.html',
        '/vakmannen/': 'vakmannen.html',
        '/404': '404.html'
      };
      ALL_CATS.forEach(function (id) {
        fileMap['/vakmannen/' + id] = 'vakmannen-categorie.html';
        fileMap['/vakmannen/' + id + '/antwerpen'] = 'vakmannen-categorie.html';
      });
      var rel = fileMap[urlPath];
      if (!rel) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      var fp = path.join(root, rel);
      if (!fs.existsSync(fp)) {
        res.statusCode = 404;
        res.end('missing');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fs.readFileSync(fp));
    });
    server.listen(0, '127.0.0.1', async function () {
      var port = server.address().port;
      try {
        var landing = await request(port, '/vakmannen');
        assert.strictEqual(landing.status, 200);
        assert.ok(landing.body.indexOf('Vind een nagekeken vakbedrijf') >= 0);

        for (var i = 0; i < ALL_CATS.length; i++) {
          var r = await request(port, '/vakmannen/' + ALL_CATS[i]);
          assert.strictEqual(r.status, 200, ALL_CATS[i]);
        }

        var unknown = await request(port, '/vakmannen/niet-bestaande-categorie');
        assert.strictEqual(unknown.status, 404);

        ok('http smoke: /vakmannen 200, 12/12 categories 200, unknown 404');
      } catch (e) {
        fail('http smoke', e);
      } finally {
        server.close(function () {
          resolve();
        });
      }
    });
  });
}

runHttpSmoke().then(function () {
  if (failed) {
    console.error('\n' + failed + ' failure(s)');
    process.exit(1);
  }
  console.log('\nAll marketplace sprint 2 checks passed.');
  process.exit(0);
});
