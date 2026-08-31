'use strict';
var fs = require('fs');
var assert = require('assert');
var h = fs.readFileSync('index.html', 'utf8');
var css = fs.readFileSync('css/homepage-v3.css', 'utf8');
var js = fs.readFileSync('js/homepage-v3.js', 'utf8');

assert.ok(h.indexOf('hp-hero-shell') >= 0, 'hero shell');
assert.ok(h.indexOf('hp-hero-cue') < 0, 'no price cue');
assert.ok(h.indexOf('hp-hero-cats') < 0, 'no cats');
assert.ok(h.indexOf('Renovatiecalculator') < 0, 'no calc block');
assert.ok(h.indexOf('Bereken eerst je richtprijs') >= 0, 'secondary calc');
assert.ok(h.indexOf('Nog niet klaar om een vakman te kiezen?') >= 0, 'secondary lead');
assert.ok(h.indexOf('data-action="start-calculator"') >= 0, 'calc hook');
assert.ok(h.indexOf('hp-h1-line') >= 0, 'H1 lines');
assert.ok(h.indexOf('>Vakgebied<') >= 0, 'label vakgebied');
assert.ok(h.indexOf('>Locatie<') >= 0, 'label locatie');
assert.ok(h.indexOf('Kies een vakgebied') >= 0, 'ph');
assert.ok(h.indexOf('Gemeente of postcode') >= 0, 'loc ph');
assert.ok(h.indexOf('elyan-hero-craftsman-desktop-now') >= 0, 'desktop asset');
assert.ok(h.indexOf('desktop-2x') < 0, 'no fake 2x');
assert.ok(h.indexOf('href="/" class="logo"') >= 0, 'logo');
assert.ok(h.indexOf('Over ELYAN') >= 0, 'nav about');
assert.ok(h.indexOf('Inloggen') >= 0, 'nav login');
assert.ok(css.indexOf('HERO ARCHITECTURE') >= 0, 'arch css');
assert.ok(css.indexOf('mask-image') >= 0, 'photo mask');
assert.ok(css.indexOf('is-ready #hpHeroTitle') >= 0, 'h1 reveal fix');
assert.ok(css.indexOf('width: 740px') >= 0 || css.indexOf('width: 720px') >= 0, 'search width');
assert.ok(css.indexOf('height: 74px') >= 0, 'search height');
assert.ok(js.indexOf('initHeroParallax();') < 0, 'parallax off');
assert.ok(js.indexOf('initHeroReveal') >= 0, 'reveal');
assert.ok(js.indexOf('initHeroCueRotate') < 0, 'no cue rotate');

var heroSlice = h.slice(h.indexOf('class="hp-hero"'), h.indexOf('id="vakgebieden"'));
assert.ok(heroSlice.indexOf('Gecontroleerde vakbedrijven') < 0, 'no trust1');
assert.ok(heroSlice.indexOf('Persoonlijke opvolging') < 0, 'no trust4');
assert.ok(heroSlice.indexOf('hp-trust-row') < 0, 'no trust row');

var fn = new Function('window', 'document', js + '\n;return window.ElyanHomepageV3;');
var stubDoc = {
  body: { classList: { contains: function () { return false; } } },
  readyState: 'complete',
  addEventListener: function () {},
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
var api = fn({ location: { hostname: 'elyan.be' } }, stubDoc);
assert.strictEqual(api.buildMarketplaceSearchUrl('badkamer', '2000'), '/vakmannen/badkamer?postcode=2000');

console.log('OK  homepage-arch-hero checks passed');
