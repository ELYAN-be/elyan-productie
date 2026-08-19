'use strict';
/**
 * Marketplace Phase 1 Sprint 2 — checks after Partner Lab shell restore.
 * Live UX = 760d6fd #vk-app shell + public API. Sprint 2 mp-* modules remain
 * as non-driving artifacts; homepage must NOT load marketplace-landing.js.
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

test('landing HTML reactivates Partner Lab shell (#vk-app)', function () {
  var html = fs.readFileSync(path.join(root, 'vakmannen.html'), 'utf8');
  assert.ok(html.indexOf('id="vk-app"') >= 0, 'vk-app mount');
  assert.ok(html.indexOf('partner-lab.css') >= 0);
  assert.ok(html.indexOf('vakmannen.css') >= 0);
  assert.ok(html.indexOf('page-partner-lab') >= 0);
  assert.ok(html.indexOf('vakmannen-public.js') >= 0);
  assert.ok(html.indexOf('marketplace-landing.js') < 0, 'Sprint 2 landing must not drive homepage');
  assert.ok(html.indexOf('marketplace.css') < 0, 'marketplace.css not primary');
  assert.ok(html.indexOf('qa-seeds.js') < 0, 'no qa-seeds as production data');
  assert.ok(html.indexOf('partners-data.js') < 0);
  assert.ok(html.indexOf('rel="canonical"') >= 0);
  assert.ok(html.indexOf('https://www.elyan.be/vakmannen') >= 0);
  assert.ok(html.toLowerCase().indexOf('vergelijk') < 0, 'no compare-copy');
  assert.ok(html.indexOf('heel België') < 0 && html.indexOf('Heel België') < 0);
  assert.ok(!/tel:|mailto:/i.test(html), 'no tel/mail CTA');
});

test('public JS wires modern API into lab shell', function () {
  var js = fs.readFileSync(path.join(root, 'js/vakmannen-public.js'), 'utf8');
  assert.ok(js.indexOf('/api/public/v1/search') >= 0, 'search API');
  assert.ok(js.indexOf('/api/public/v1/professionals/') >= 0, 'profile API');
  assert.ok(js.indexOf('lab-search') >= 0);
  assert.ok(js.indexOf('lab-featured') >= 0);
  assert.ok(js.indexOf('lab-row') >= 0);
  assert.ok(js.indexOf('lab-cat-mosaic') >= 0);
  assert.ok(js.indexOf('lab-identity') >= 0);
  assert.ok(js.indexOf('qa-seeds') < 0);
  assert.ok(js.indexOf("status === 'demo'") < 0 && js.indexOf('status === "demo"') < 0);
  assert.ok(js.indexOf('renderQuote') < 0, 'no full quote wizard');
  assert.ok(js.indexOf('vk-next-step') >= 0 || js.indexOf('aanvraag-note') >= 0);
  assert.ok(js.indexOf('Offerte aanvragen') >= 0);
  assert.ok(js.indexOf('buildAanvraagPath') >= 0 || js.indexOf('/vakmannen/p/') >= 0);
});

test('category routes rewrite to SPA shell (one UI)', function () {
  var conf = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  var rewrites = conf.rewrites || [];
  var catRewrites = rewrites.filter(function (r) {
    return String(r.source || '').indexOf('dakwerken|badkamer') >= 0;
  });
  assert.ok(catRewrites.length >= 2, 'category + regio rewrites');
  catRewrites.forEach(function (r) {
    assert.ok(r.destination === '/vakmannen' || r.destination === '/vakmannen.html', 'SPA destination: ' + r.destination);
  });
  ALL_CATS.forEach(function (id) {
    assert.ok(catRewrites.map(function (r) { return r.source; }).join(' ').indexOf(id) >= 0, 'rewrite covers ' + id);
  });
  var profileIdx = -1;
  var lastCatIdx = -1;
  rewrites.forEach(function (r, i) {
    if (r.destination === '/vakmannen-detail') profileIdx = i;
    if (String(r.source || '').indexOf('dakwerken|badkamer') >= 0) lastCatIdx = i;
  });
  assert.ok(profileIdx >= 0, 'profile slug rewrite present');
  assert.ok(lastCatIdx >= 0 && profileIdx > lastCatIdx, 'profile rewrite after category allowlist');
});

test('profile shell uses Partner Lab + public API (no wizard / qa-seeds)', function () {
  var html = fs.readFileSync(path.join(root, 'vakmannen-detail.html'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'js/vakmannen-public.js'), 'utf8');
  assert.ok(html.indexOf('vakmannen-public.js') >= 0);
  assert.ok(html.indexOf('partner-lab.css') >= 0);
  assert.ok(html.indexOf('vakmannen.css') >= 0);
  assert.ok(html.indexOf('id="vk-app"') >= 0);
  assert.ok(html.indexOf('marketplace-profile.js') < 0);
  assert.ok(html.indexOf('marketplace.css') < 0);
  assert.ok(html.indexOf('qa-seeds') < 0);
  assert.ok(html.indexOf('partners-data.js') < 0);
  assert.ok(js.indexOf('/api/public/v1/professionals/') >= 0);
  assert.ok(js.indexOf('Offerte aanvragen') >= 0);
  assert.ok(js.indexOf('renderDetailQuestions') < 0);
  assert.ok(js.indexOf("status === 'demo'") < 0 && js.indexOf('status === "demo"') < 0);
  assert.ok(!/tel:|mailto:/i.test(html + js));
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

test('SPA public JS a11y + API smoke tokens', function () {
  var pub = fs.readFileSync(path.join(root, 'js/vakmannen-public.js'), 'utf8');
  assert.ok(pub.indexOf('/api/public/v1/search') >= 0);
  assert.ok(pub.indexOf('/api/public/v1/professionals/') >= 0);
  assert.ok(pub.indexOf('parseCategoryRoute') >= 0 || pub.indexOf('buildSearchPath') >= 0);
  assert.ok(pub.indexOf('lab-suggest') >= 0);
  assert.ok(pub.indexOf('aria-autocomplete') >= 0 || fs.readFileSync(path.join(root, 'vakmannen.html'), 'utf8').indexOf('vk-app') >= 0);
});

test('no compare / heel België / tel-mail in live public surfaces', function () {
  var files = [
    'js/vakmannen-public.js',
    'vakmannen.html',
    'vakmannen-detail.html',
    'shared/vakmannen/marketplace-ui.js'
  ];
  files.forEach(function (rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(src.toLowerCase().indexOf('vergelijk') < 0, rel + ' compare');
    assert.ok(src.indexOf('heel België') < 0 && src.indexOf('Heel België') < 0, rel + ' heel België');
    assert.ok(!/tel:\+|mailto:/i.test(src), rel + ' contact CTA');
  });
});

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
        fileMap['/vakmannen/' + id] = 'vakmannen.html';
        fileMap['/vakmannen/' + id + '/antwerpen'] = 'vakmannen.html';
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
        assert.ok(landing.body.indexOf('id="vk-app"') >= 0);
        assert.ok(landing.body.indexOf('vakmannen-public.js') >= 0);
        assert.ok(landing.body.indexOf('partner-lab.css') >= 0);

        for (var i = 0; i < ALL_CATS.length; i++) {
          var r = await request(port, '/vakmannen/' + ALL_CATS[i]);
          assert.strictEqual(r.status, 200, ALL_CATS[i]);
          assert.ok(r.body.indexOf('id="vk-app"') >= 0, ALL_CATS[i] + ' shell');
        }

        var unknown = await request(port, '/vakmannen/niet-bestaande-categorie');
        assert.strictEqual(unknown.status, 404);

        ok('http smoke: /vakmannen 200, 12/12 categories 200 SPA shell, unknown 404');
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
