'use strict';
/** Marketplace Phase 1 Sprint 3 — static contract checks (Partner Lab shell + public API). */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var failed = 0;

function source(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function test(name, fn) {
  try { fn(); console.log('OK  ' + name); }
  catch (err) { failed += 1; console.error('FAIL ' + name + ' — ' + err.message); }
}

var publicJs = source('js/vakmannen-public.js');
var landingHtml = source('vakmannen.html');
var detailHtml = source('vakmannen-detail.html');
var ui = source('shared/vakmannen/marketplace-ui.js');
var location = require('../server/marketplace-location');

test('landing shell uses consumer navigation', function () {
  assert.ok(landingHtml.indexOf('id="vk-app"') >= 0);
  assert.ok(landingHtml.indexOf('hp-nav') >= 0);
  assert.ok(landingHtml.indexOf('Vind vakmannen') >= 0);
  assert.ok(landingHtml.indexOf('Start gratis') < 0);
  assert.ok(landingHtml.indexOf('homepage-v3.css') >= 0);
  assert.ok(landingHtml.indexOf('marketplace-nav.js') >= 0);
  assert.ok(landingHtml.indexOf('vakmannen-public.js') >= 0);
});

test('marketplace shell is functional (no marketing landing blocks)', function () {
  assert.ok(publicJs.indexOf('renderMarketplace') >= 0);
  assert.ok(publicJs.indexOf('Ontdek per vakgebied') < 0);
  assert.ok(publicJs.indexOf('Bekijk per provincie') < 0);
  assert.ok(publicJs.indexOf('Uitgelichte vakbedrijven') < 0);
  assert.ok(publicJs.indexOf('Renovatieplatform voor Vlaanderen') < 0);
  assert.ok(publicJs.indexOf('We bouwen ons netwerk zorgvuldig op.') >= 0);
  assert.ok(publicJs.indexOf('Geen vakbedrijven gevonden voor deze zoekopdracht.') >= 0);
  assert.ok(publicJs.indexOf('Bekijk profiel') >= 0);
});

test('search API and supported filters are wired in SPA', function () {
  assert.ok(publicJs.indexOf('/api/public/v1/search') >= 0);
  ['dienst', 'includeUnpriced', 'page', 'pageSize', 'provincie', 'sort'].forEach(function (key) {
    assert.ok(
      publicJs.indexOf("params.set('" + key + "'") >= 0 || publicJs.indexOf(key) >= 0,
      key
    );
  });
});

test('province routes become real geo filters', function () {
  var east = location.normalizeLocation({ provincieId: 'oost-vlaanderen' });
  assert.strictEqual(east.ok, true);
  assert.strictEqual(east.location.provincieId, 'oost_vlaanderen');
  assert.strictEqual(location.normalizeLocation({ provincieId: 'henegouwen' }).ok, false);
});

test('loading, empty, error states exist in lab results', function () {
  ['Vakbedrijven laden', 'Geen vakbedrijven gevonden', 'Opnieuw proberen', 'We bouwen ons netwerk'].forEach(function (copy) {
    assert.ok(publicJs.indexOf(copy) >= 0, copy);
  });
});

test('lab rows escape API text and reject unsafe image schemes', function () {
  assert.ok(ui.indexOf('safeHttpsUrl') >= 0);
  assert.ok(ui.indexOf('/^https:\\/\\//i.test') >= 0);
  assert.ok(publicJs.indexOf('safeUrl') >= 0 || publicJs.indexOf('safeHttpsUrl') >= 0);
  assert.ok(publicJs.indexOf('escapeHtml') >= 0 || publicJs.indexOf('esc(') >= 0);
});

test('results UI uses lab-list / lab-row (baseline shell)', function () {
  assert.ok(publicJs.indexOf('lab-list') >= 0);
  assert.ok(publicJs.indexOf('lab-row') >= 0);
  assert.ok(publicJs.indexOf('lab-filters') >= 0);
  assert.ok(publicJs.indexOf('mp-result-card') < 0);
});

test('profile chrome + public API, CTA to interest intake (no wizard)', function () {
  assert.ok(detailHtml.indexOf('vakmannen-public.js') >= 0);
  assert.ok(detailHtml.indexOf('partner-lab.css') >= 0);
  assert.ok(detailHtml.indexOf('id="vk-app"') >= 0);
  assert.ok(publicJs.indexOf('/api/public/v1/professionals/') >= 0);
  assert.ok(publicJs.indexOf('Offerte aanvragen') >= 0);
  assert.ok(publicJs.indexOf('buildAanvraagPath') >= 0 || publicJs.indexOf('/vakmannen/p/') >= 0);
  assert.ok(publicJs.indexOf('vk-next-step') >= 0 || publicJs.indexOf('aanvraag-note') >= 0);
  assert.ok(publicJs.indexOf('renderDetailQuestions') < 0);
  assert.ok(publicJs.indexOf('renderQuote') < 0);
  assert.ok(publicJs.indexOf('qa-seeds') < 0);
  assert.ok(publicJs.indexOf("status === 'live'") >= 0 || publicJs.indexOf('status === "live"') >= 0);
  assert.ok(publicJs.indexOf("status === 'demo'") < 0);
});

test('privacy: no tel/mail leaks in public surfaces', function () {
  [
    'js/vakmannen-public.js',
    'vakmannen.html',
    'vakmannen-detail.html'
  ].forEach(function (rel) {
    var src = source(rel);
    assert.ok(!/tel:|mailto:/i.test(src), rel);
  });
});

if (failed) { console.error('\n' + failed + ' Sprint 3 check(s) failed.'); process.exit(1); }
console.log('\nMarketplace Sprint 3 checks passed.');
