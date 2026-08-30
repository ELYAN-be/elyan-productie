'use strict';
var fs = require('fs');
var assert = require('assert');
var h = fs.readFileSync('index.html', 'utf8');
var css = fs.readFileSync('css/homepage-v3.css', 'utf8');
var js = fs.readFileSync('js/homepage-v3.js', 'utf8');

assert.ok(h.indexOf('class="hp-v3 hp-v4"') >= 0 || (h.indexOf('hp-v3') >= 0 && h.indexOf('hp-v4') >= 0), 'body.hp-v3 hp-v4');
assert.ok(h.indexOf('/css/homepage-v3.css') >= 0, 'homepage css linked');
assert.ok(h.indexOf('/js/homepage-v3.js') >= 0, 'homepage js linked');
assert.ok(h.indexOf('marketplace-landing.js') < 0, 'no marketplace-landing on homepage');
assert.ok(h.indexOf('partner-lab.css') < 0, 'no partner-lab on homepage');
assert.ok(h.indexOf('vakmannen.css') < 0, 'no vakmannen.css on homepage');
assert.strictEqual((h.match(/<h1[\s>]/g) || []).length, 1, 'exactly one H1');
assert.ok(h.indexOf('Vind de juiste vakman voor je renovatie.') >= 0, 'hero H1 copy');
assert.ok(h.indexOf('Renovatieplatform voor Vlaanderen en Brussel') >= 0, 'hero eyebrow');
assert.ok(h.indexOf('Vind een vakman voor je renovatie | ELYAN') >= 0, 'title');
assert.ok(h.indexOf('id="calculatorOverlay"') >= 0, 'calc1 overlay');
assert.ok(h.indexOf('id="calc2Overlay"') >= 0, 'calc2 overlay');
assert.ok(h.indexOf('data-action="start-calculator"') >= 0, 'calc1 trigger');
assert.ok(h.indexOf('data-action="start-calculator-2"') >= 0, 'calc2 trigger');
assert.ok(h.indexOf('Eerst je richtprijs berekenen') >= 0, 'secondary calc CTA copy');
assert.ok(h.indexOf('class="hp-calc-secondary"') >= 0, 'secondary calc CTA class');
assert.ok(h.indexOf('hp-search-unit') >= 0, 'search unit wrapper');
assert.ok(h.indexOf('hp-hero-stage') >= 0, 'full-bleed hero stage');
assert.ok(h.indexOf('elyan-hero-craftsman-final.jpg') >= 0, 'approved final craftsman hero desktop');
assert.ok(h.indexOf('elyan-hero-craftsman-natural-v2-sm.jpg') >= 0, 'frozen natural-v2 mobile hero');
assert.ok(css.indexOf('object-fit: cover') >= 0, 'full-bleed cover hero');
assert.ok(css.indexOf('rgba(18, 22, 16') >= 0 || css.indexOf('rgba(18,22,16') >= 0, 'desktop charcoal/olive scrim');
assert.ok(css.indexOf('rgba(10, 10, 9') >= 0 || css.indexOf('rgba(10,10,9') >= 0, 'frozen mobile charcoal scrim');
assert.ok(css.indexOf('object-position: 58% 52%') >= 0, 'frozen mobile object-position');
assert.ok(css.indexOf('var(--hp-olive-dark) 0%') < 0, 'no olive copy-column scrim');
assert.ok(h.indexOf('aria-label="Menu openen"') >= 0, 'accessible menu button');
assert.ok(h.indexOf('hp-menu-icon') >= 0, 'hamburger menu icon');
assert.ok(h.indexOf('Tijdelijke sfeerbeelding') < 0, 'no visitor-facing temp photo caption');
assert.ok(h.indexOf('elyan.info@gmail.com') < 0, 'no public gmail in footer');
assert.ok(h.indexOf('/contact.html') >= 0, 'contact route present');
assert.ok(h.indexOf('id="hpProfessionals" hidden') >= 0, 'professionals hidden by default');
assert.ok(h.indexOf('/assets/report/page-summary.png') >= 0, 'genuine report summary asset');
assert.ok(h.indexOf('/assets/report/page-costs.png') >= 0, 'genuine report costs asset');
assert.ok(h.indexOf('/assets/report/page-checklist.png') >= 0, 'genuine report checklist asset');
assert.ok(h.indexOf('hp-report-page--front') >= 0, 'report page wrappers');
assert.ok(h.indexOf('Ontdek ELYAN for Professionals') >= 0, 'professionals CTA copy');
assert.ok(h.indexOf('Made in Belgium') >= 0, 'made in belgium');
assert.ok(h.indexOf('Zolderrenovatie') < 0, 'no invented Zolderrenovatie category');
assert.ok(h.indexOf('Loodgieter') < 0, 'no invented Loodgieter category');
assert.ok(!/hp-cat-tile[^>]*>[\s\S]*?>Tuin</.test(h), 'no invented Tuin category tile');
assert.strictEqual((h.match(/class="hp-cat-tile"/g) || []).length, 12, '12 category tiles');

var cats = [
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
];
cats.forEach(function (id) {
  assert.ok(h.indexOf('/vakmannen/' + id) >= 0, 'route ' + id);
  assert.ok(h.indexOf('value="' + id + '"') >= 0, 'select ' + id);
});

assert.ok(h.indexOf('href="/partners"') >= 0, 'professionals route');
assert.ok(h.indexOf('#controle-toelichting') >= 0, 'nagekeken links to explanation');
assert.ok(css.indexOf('body.hp-v3') >= 0, 'css scoped');
assert.ok(css.indexOf('hp-hero-stage') >= 0, 'v4 hero styles');
assert.ok(css.indexOf('prefers-reduced-motion') >= 0, 'reduced motion');
assert.ok(js.indexOf('buildMarketplaceSearchUrl') >= 0, 'url builder');
assert.ok(js.indexOf('clearFieldInvalid') >= 0, 'clean initial validation');
assert.ok(js.indexOf('aria-hidden') >= 0, 'error aria-hidden sync');
assert.ok(js.indexOf('cards.length < 3') >= 0, 'hide pros under 3 cards');
assert.ok(js.indexOf('initReportVisual') >= 0, 'report asset fail-safe');
assert.ok(css.indexOf('.hp-field.is-invalid') >= 0, 'invalid styles gated');
assert.ok(css.indexOf('hp-calc-secondary') >= 0, 'secondary CTA styles');
assert.ok(css.indexOf('#prijsinzicht.hp-section--olive') >= 0, 'price section containment');
assert.ok(css.indexOf('overflow: hidden') >= 0, 'overflow clipped where needed');
assert.ok(css.indexOf('hp-report-page') >= 0, 'report page styles');
assert.ok(fs.existsSync('assets/report/page-summary.png'), 'report summary file exists');
assert.ok(fs.existsSync('assets/report/page-costs.png'), 'report costs file exists');
assert.ok(fs.existsSync('assets/report/page-checklist.png'), 'report checklist file exists');

var fn = new Function(
  'window',
  'document',
  js + '\n;return window.ElyanHomepageV3;'
);
var stubDoc = {
  body: { classList: { contains: function () { return false; } } },
  readyState: 'complete',
  addEventListener: function () {},
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
var api = fn({}, stubDoc);
assert.strictEqual(
  api.buildMarketplaceSearchUrl('badkamer', '2000'),
  '/vakmannen/badkamer?postcode=2000'
);
assert.strictEqual(
  api.buildMarketplaceSearchUrl('dakwerken', 'Gent'),
  '/vakmannen/dakwerken?gemeente=Gent'
);
assert.strictEqual(api.buildMarketplaceSearchUrl('', 'Gent'), null);
assert.strictEqual(api.buildMarketplaceSearchUrl('badkamer', ''), null);
assert.strictEqual(api.CATEGORIES.length, 12);

console.log('OK  homepage-v4 focused checks passed');
