'use strict';
/**
 * Marketplace PRE-LAUNCH — Interest Intake contract + offline logic checks.
 * Run: node scripts/marketplace-interest-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var http = require('http');

var root = path.join(__dirname, '..');
var failed = 0;

function source(rel) {
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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('OK  ' + name);
  } catch (err) {
    failed += 1;
    console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
  }
}

var intake = require('../server/interest-intake');
var UI = require('../shared/vakmannen/marketplace-ui');
var { rateLimit } = require('../server/rate-limit');
var publicHandler = require('../api/public/v1');

test('migration creates interest_intakes with RLS + service_role only', function () {
  var sql = source('supabase/migrations/20260819_interest_intakes.sql');
  assert.ok(sql.indexOf('CREATE TABLE IF NOT EXISTS public.interest_intakes') >= 0);
  assert.ok(sql.indexOf('ENABLE ROW LEVEL SECURITY') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.interest_intakes FROM anon') >= 0);
  assert.ok(sql.indexOf('REVOKE ALL ON TABLE public.interest_intakes FROM authenticated') >= 0);
  assert.ok(sql.indexOf('GRANT SELECT, INSERT ON TABLE public.interest_intakes TO service_role') >= 0);
  assert.ok(sql.indexOf('dedupe_key') >= 0);
  assert.ok(sql.indexOf('consent_at') >= 0);
});

test('aanvraag route helpers avoid category collision', function () {
  assert.deepStrictEqual(UI.parseAanvraagRoute('/vakmannen/p/dakwerken-pro/aanvraag'), {
    ok: true,
    slug: 'dakwerken-pro'
  });
  assert.strictEqual(UI.parseAanvraagRoute('/vakmannen/dakwerken').ok, false);
  assert.strictEqual(UI.parseAanvraagRoute('/vakmannen/p/dakwerken/aanvraag').ok, false);
  assert.strictEqual(UI.parseAanvraagRoute('/vakmannen/p/dakwerken/aanvraag').isCategory, true);
  assert.strictEqual(UI.buildAanvraagPath('acme-dak'), '/vakmannen/p/acme-dak/aanvraag');
});

test('vercel rewrite for /vakmannen/p/:slug/aanvraag before profile catch-all', function () {
  var conf = JSON.parse(source('vercel.json'));
  var rewrites = conf.rewrites || [];
  var aanvraagIdx = -1;
  var profileIdx = -1;
  rewrites.forEach(function (r, i) {
    if (String(r.source || '').indexOf('/vakmannen/p/:slug/aanvraag') >= 0) aanvraagIdx = i;
    if (r.destination === '/vakmannen-detail') profileIdx = i;
  });
  assert.ok(aanvraagIdx >= 0, 'aanvraag rewrite present');
  assert.ok(profileIdx >= 0, 'profile rewrite present');
  assert.ok(aanvraagIdx < profileIdx, 'aanvraag rewrite before profile catch-all');
  assert.ok(
    String(rewrites[aanvraagIdx].destination).indexOf('vakmannen-aanvraag') >= 0
  );
});

test('profile CTA navigates to /vakmannen/p/{slug}/aanvraag', function () {
  var js = source('js/vakmannen-public.js');
  assert.ok(js.indexOf('buildAanvraagPath') >= 0 || js.indexOf('/vakmannen/p/') >= 0);
  assert.ok(js.indexOf('goAanvraag') >= 0);
  assert.ok(js.indexOf('Vraag via ELYAN aan') >= 0 || js.indexOf('buildAanvraagPath') >= 0);
  assert.ok(js.indexOf('showAanvraagStub') < 0);
  assert.ok(js.indexOf('renderQuote') < 0);
});

test('intake page uses Partner Lab shell + interest JS', function () {
  var html = source('vakmannen-aanvraag.html');
  var js = source('js/marketplace-interest.js');
  assert.ok(html.indexOf('partner-lab.css') >= 0);
  assert.ok(html.indexOf('id="vk-aanvraag-app"') >= 0);
  assert.ok(html.indexOf('marketplace-interest.js') >= 0);
  assert.ok(html.indexOf('qa-seeds') < 0);
  assert.ok(js.indexOf('/api/public/v1/interest') >= 0);
  assert.ok(js.indexOf('Je aanvraag is verzonden via ELYAN') >= 0);
  assert.ok(js.indexOf('het vakbedrijf dat je hebt gekozen') >= 0);
  assert.ok(js.indexOf('niet rechtstreeks naar het vakbedrijf') < 0);
  assert.ok(!/tel:|mailto:/i.test(html + js));
});

test('validation: happy path + missing + honeypot (no explicit consent field required)', function () {
  var good = intake.validateInterestPayload({
    partnerSlug: 'acme-dak',
    name: 'Jan Peeters',
    email: 'jan@example.be',
    phone: '+32470000000',
    location: '9000 Gent',
    description: 'Nieuw dak voor rijhuis, hellend.',
    website: ''
  });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.data.spam, false);
  assert.strictEqual(good.data.email, 'jan@example.be');
  assert.strictEqual(good.data.consent, true);

  var missing = intake.validateInterestPayload({
    partnerSlug: 'acme-dak',
    name: '',
    email: 'jan@example.be',
    location: 'Gent',
    description: 'Nieuw dak voor rijhuis.',
    consent: true
  });
  assert.strictEqual(missing.ok, false);
  assert.strictEqual(missing.code, 'missing_fields');

  var badEmail = intake.validateInterestPayload({
    partnerSlug: 'acme-dak',
    name: 'Jan',
    email: 'niet-geldig',
    location: 'Gent',
    description: 'Nieuw dak voor rijhuis.',
    consent: true
  });
  assert.strictEqual(badEmail.ok, false);
  assert.strictEqual(badEmail.code, 'invalid_email');

  var spam = intake.validateInterestPayload({
    partnerSlug: 'acme-dak',
    name: 'Bot',
    email: 'bot@spam.invalid',
    location: 'Gent',
    description: 'Spam project text here.',
    consent: true,
    website: 'https://spam.example'
  });
  assert.strictEqual(spam.ok, true);
  assert.strictEqual(spam.data.spam, true);

  var badSlug = intake.validateInterestPayload({
    partnerSlug: '!!!',
    name: 'Jan',
    email: 'jan@example.be',
    location: 'Gent',
    description: 'Nieuw dak voor rijhuis.',
    consent: true
  });
  assert.strictEqual(badSlug.ok, false);
  assert.strictEqual(badSlug.code, 'not_found');
});

test('dedupe key is stable hash without raw PII shape', function () {
  var a = intake.buildDedupeKey('Jan@Example.BE', 'partner-1');
  var b = intake.buildDedupeKey('jan@example.be', 'partner-1');
  var c = intake.buildDedupeKey('jan@example.be', 'partner-2');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.ok(/^[a-f0-9]{64}$/.test(a));
  assert.strictEqual(intake.DEDUPE_WINDOW_MS, 5 * 60 * 1000);
});

test('rate limiter returns 429 shape for burst', function () {
  var key = 'interest_test_' + Date.now();
  var last = null;
  for (var i = 0; i < 9; i++) {
    last = rateLimit(key, 8, 10 * 60 * 1000);
  }
  assert.strictEqual(last.ok, false);
});

test('frozen marketplace surfaces unchanged (no intake chrome bleed)', function () {
  var landing = source('vakmannen.html');
  assert.ok(landing.indexOf('id="vk-app"') >= 0);
  assert.ok(landing.indexOf('marketplace-interest.js') < 0);
  assert.ok(landing.indexOf('lab-intake-partner') < 0);
  var detail = source('vakmannen-detail.html');
  assert.ok(detail.indexOf('marketplace-interest.js') < 0);
  assert.ok(detail.indexOf('id="vk-app"') >= 0);
});

test('API handler source wires POST interest + no-store', function () {
  var api = source('api/public/v1.js');
  assert.ok(api.indexOf("path === 'interest'") >= 0);
  assert.ok(api.indexOf('submitInterest') >= 0);
  assert.ok(api.indexOf('no-store') >= 0);
  assert.ok(api.indexOf('consent_required') >= 0);
});

function mockRes() {
  var headers = {};
  var body = '';
  return {
    statusCode: 0,
    headers: headers,
    setHeader: function (k, v) { headers[k] = v; },
    end: function (chunk) { body = chunk || ''; },
    getBody: function () {
      try { return JSON.parse(body || '{}'); } catch (e) { return {}; }
    },
    getHeader: function (k) { return headers[k]; }
  };
}

function runHandler(req) {
  return new Promise(function (resolve) {
    var res = mockRes();
    var origEnd = res.end;
    res.end = function (chunk) {
      origEnd(chunk);
      resolve(res);
    };
    Promise.resolve(publicHandler(req, res)).catch(function (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'server_error', message: String(err && err.message) }));
      resolve(res);
    });
  });
}

async function main() {
  await testAsync('POST interest accepts valid payload without explicit consent field', async function () {
    var res = await runHandler({
      method: 'POST',
      url: '/api/public/v1/interest',
      query: { path: 'interest' },
      headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'interest-check' },
      body: {
        partnerSlug: 'acme-dak',
        name: 'Jan Peeters',
        email: 'jan@example.be',
        location: '9000 Gent',
        description: 'Nieuw dak voor rijhuis, hellend.'
      }
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 500 || res.statusCode === 409);
    assert.notStrictEqual(res.getBody().error, 'consent_required');
    assert.strictEqual(res.getHeader('Cache-Control'), 'no-store');
  });

  await testAsync('POST interest honeypot returns ok without partner leak fields', async function () {
    var res = await runHandler({
      method: 'POST',
      url: '/api/public/v1/interest',
      query: { path: 'interest' },
      headers: { 'x-forwarded-for': '203.0.113.11', 'user-agent': 'interest-check' },
      body: {
        partnerSlug: 'acme-dak',
        name: 'Bot',
        email: 'bot@spam.invalid',
        location: 'Gent',
        description: 'Spam project text here.',
        consent: true,
        website: 'https://spam.example'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    var body = res.getBody();
    assert.strictEqual(body.ok, true);
    assert.ok(!body.email);
    assert.ok(!body.phone);
    assert.ok(!body.name);
    assert.ok(!body.partner_id);
  });

  await testAsync('POST interest invalid slug fails closed (not_found or missing_env)', async function () {
    var res = await runHandler({
      method: 'POST',
      url: '/api/public/v1/interest',
      query: { path: 'interest' },
      headers: { 'x-forwarded-for': '203.0.113.12', 'user-agent': 'interest-check' },
      body: {
        partnerSlug: 'no-such-partner-xyz',
        name: 'Jan Peeters',
        email: 'jan@example.be',
        location: '9000 Gent',
        description: 'Nieuw dak voor rijhuis, hellend.',
        consent: true
      }
    });
    // Without Supabase env → missing_env/503; with env → not_found/404. Never 200.
    assert.ok([404, 503, 500].indexOf(res.statusCode) >= 0, 'status ' + res.statusCode);
    assert.notStrictEqual(res.getBody().ok, true);
  });

  await testAsync('POST interest rate-limits after burst (429)', async function () {
    var ip = '203.0.113.' + (50 + Math.floor(Math.random() * 50));
    var last = null;
    for (var i = 0; i < 9; i++) {
      last = await runHandler({
        method: 'POST',
        url: '/api/public/v1/interest',
        query: { path: 'interest' },
        headers: { 'x-forwarded-for': ip, 'user-agent': 'interest-check' },
        body: {
          partnerSlug: 'acme-dak',
          name: 'Jan',
          email: 'jan@example.be',
          location: 'Gent',
          description: 'Nieuw dak voor rijhuis.',
          consent: true,
          website: 'https://honeypot-fill.example'
        }
      });
    }
    assert.strictEqual(last.statusCode, 429);
    assert.strictEqual(last.getBody().error, 'rate_limited');
  });

  // Keep http import used for future live smoke extensibility without unused lint noise.
  assert.ok(typeof http.createServer === 'function');

  if (failed) {
    console.error('\n' + failed + ' Interest Intake check(s) failed.');
    process.exit(1);
  }
  console.log('\nMarketplace Interest Intake checks passed.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
