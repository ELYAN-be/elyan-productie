#!/usr/bin/env node
/**
 * Browser E2E: invite password CTA must stay on set-password until password submit.
 * Fails if navigation to /professionals/activate happens before successful updateUser.
 *
 * Run: node scripts/invite-password-browser-e2e.js
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');
var {
  buildPasswordSetupUrl,
  buildActivateUrl,
  buildInviteEmailHtml,
  extractInviteEmailHrefs,
  decodePasswordSetupPayload
} = require('../server/invite-links');

var ROOT = path.join(__dirname, '..');
var PORT = 8765;
var ORIGIN = 'http://127.0.0.1:' + PORT;
var HASH = 'e2e_hashed_token_abc123';
var ELYAN = 'e2eInviteToken_Base64urlXx';

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function startServer() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var u = new URL(req.url, ORIGIN);
      var pathname = u.pathname;

      if (pathname === '/api/professionals' && u.searchParams.get('action') === 'public-config') {
        return send(
          res,
          200,
          JSON.stringify({
            ok: true,
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJub25lIn0.e30.e2e'
          }),
          MIME['.json']
        );
      }

      if (pathname === '/api/professionals' && u.searchParams.get('action') === 'activate') {
        return send(
          res,
          200,
          JSON.stringify({
            ok: true,
            partner: { displayName: 'E2E Partner' },
            email: 'e2e@example.com',
            role: 'owner'
          }),
          MIME['.json']
        );
      }

      // Mirror Vercel rewrite: set-password/:payload -> reset-password.html
      if (/^\/professionals\/set-password\/[A-Za-z0-9_-]+$/.test(pathname)) {
        pathname = '/professionals/reset-password';
      }

      if (pathname.endsWith('/')) pathname += 'index.html';
      if (!path.extname(pathname) && fs.existsSync(path.join(ROOT, pathname.slice(1) + '.html'))) {
        pathname = pathname + '.html';
      }

      var filePath = path.join(ROOT, pathname.replace(/^\//, ''));
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return send(res, 404, 'not found');
      }
      var ext = path.extname(filePath);
      send(res, 200, fs.readFileSync(filePath), MIME[ext] || 'application/octet-stream');
    });
    server.listen(PORT, '127.0.0.1', function () {
      resolve(server);
    });
  });
}

async function installSupabaseMock(page) {
  await page.addInitScript(function () {
    if (!window.__e2eAuth) {
      window.__e2eAuth = {
        verifyCalls: 0,
        updateCalls: 0,
        session: null
      };
    }
    try {
      var raw = sessionStorage.getItem('__e2eAuth');
      if (raw) {
        var parsed = JSON.parse(raw);
        window.__e2eAuth.verifyCalls = parsed.verifyCalls || 0;
        window.__e2eAuth.updateCalls = parsed.updateCalls || 0;
        window.__e2eAuth.session = parsed.session || null;
      }
    } catch (e) { /* ignore */ }
  });

  var mockJs =
    'window.supabase = { createClient: function () {' +
    '  function persist() {' +
    '    try { sessionStorage.setItem("__e2eAuth", JSON.stringify({' +
    '      verifyCalls: window.__e2eAuth.verifyCalls,' +
    '      updateCalls: window.__e2eAuth.updateCalls,' +
    '      session: window.__e2eAuth.session' +
    '    })); } catch (e) {}' +
    '  }' +
    '  if (!window.__e2eAuth) window.__e2eAuth = { verifyCalls: 0, updateCalls: 0, session: null };' +
    '  try {' +
    '    var raw = sessionStorage.getItem("__e2eAuth");' +
    '    if (raw) {' +
    '      var parsed = JSON.parse(raw);' +
    '      window.__e2eAuth.verifyCalls = parsed.verifyCalls || window.__e2eAuth.verifyCalls;' +
    '      window.__e2eAuth.updateCalls = parsed.updateCalls || window.__e2eAuth.updateCalls;' +
    '      if (parsed.session) window.__e2eAuth.session = parsed.session;' +
    '    }' +
    '  } catch (e) {}' +
    '  return { auth: {' +
    '    verifyOtp: async function () {' +
    '      window.__e2eAuth.verifyCalls += 1;' +
    '      window.__e2eAuth.session = { access_token: "e2e" };' +
    '      persist();' +
    '      return { data: { session: window.__e2eAuth.session }, error: null };' +
    '    },' +
    '    updateUser: async function () {' +
    '      window.__e2eAuth.updateCalls += 1; persist();' +
    '      return { data: { user: { id: "e2e" } }, error: null };' +
    '    },' +
    '    getSession: async function () {' +
    '      return { data: { session: window.__e2eAuth.session }, error: null };' +
    '    },' +
    '    signOut: async function () {' +
    '      window.__e2eAuth.session = null; persist();' +
    '      return { error: null };' +
    '    }' +
    '  }};' +
    '}};';

  await page.route('**/supabase-js@2/dist/umd/supabase.min.js', function (route) {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: mockJs
    });
  });
  await page.route('**/supabase.min.js', function (route) {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: mockJs
    });
  });
}

async function main() {
  var server = await startServer();
  var browser = await chromium.launch({ headless: true });
  var trace = [];
  var failed = null;

  try {
    var passwordSetupUrl = buildPasswordSetupUrl(ORIGIN, HASH, ELYAN);
    var activateUrl = buildActivateUrl(ORIGIN, ELYAN);
    var html = buildInviteEmailHtml({
      partnerName: 'E2E Partner',
      passwordSetupUrl: passwordSetupUrl,
      activateUrl: activateUrl
    });
    var hrefs = extractInviteEmailHrefs(html);
    if (hrefs.passwordSetupUrl !== passwordSetupUrl) {
      throw new Error('email first CTA mismatch');
    }

    var context = await browser.newContext();
    var page = await context.newPage();
    await installSupabaseMock(page);

    page.on('framenavigated', function (frame) {
      if (frame !== page.mainFrame()) return;
      var entry = { ev: 'nav', url: page.url(), pathname: new URL(page.url()).pathname };
      trace.push(entry);
      console.log('NAV', entry.pathname);
    });

    // 1) Open email HTML and click first CTA
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await Promise.all([
      page.waitForURL(/\/professionals\/set-password\//, { timeout: 15000 }),
      page.click('#cta-password')
    ]);

    var afterClickPath = new URL(page.url()).pathname;
    if (afterClickPath.indexOf('/professionals/activate') >= 0) {
      throw new Error('FAIL: first CTA navigated to activate: ' + page.url());
    }
    if (afterClickPath.indexOf('/professionals/set-password/') !== 0) {
      throw new Error('FAIL: first CTA did not open set-password: ' + page.url());
    }

    // 2) Stay on set-password — no premature activate
    await page.waitForTimeout(2500);
    var stayedPath = new URL(page.url()).pathname;
    if (stayedPath.indexOf('/professionals/activate') >= 0) {
      throw new Error('FAIL: redirected to activate before password submit');
    }
    if (stayedPath.indexOf('/professionals/set-password/') !== 0) {
      throw new Error('FAIL: left set-password before submit: ' + page.url());
    }

    var h1 = await page.locator('h1').first().textContent();
    if (String(h1).indexOf('Nieuw wachtwoord') < 0) {
      throw new Error('FAIL: expected password page H1, got: ' + h1);
    }
    if ((await page.locator('#resetForm').count()) < 1) {
      throw new Error('FAIL: reset form missing');
    }

    var payload = decodePasswordSetupPayload(stayedPath.split('/').pop());
    if (!payload || payload.tokenHash !== HASH || payload.inviteToken !== ELYAN) {
      throw new Error('FAIL: payload decode mismatch');
    }

    // 3) Set password
    await page.fill('#password', 'TestPass123!');
    await page.fill('#password2', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 4) Only after success → activate
    await page.waitForURL(/\/professionals\/activate\?token=/, { timeout: 15000 });
    var finalPath = new URL(page.url()).pathname;
    if (finalPath !== '/professionals/activate') {
      throw new Error('FAIL: expected activate after password update, got ' + page.url());
    }
    var token = new URL(page.url()).searchParams.get('token');
    if (token !== ELYAN) {
      throw new Error('FAIL: activate token mismatch');
    }

    var auth = await page.evaluate(function () {
      return window.__e2eAuth;
    });
    if (!auth || auth.verifyCalls < 1 || auth.updateCalls < 1) {
      throw new Error('FAIL: expected verifyOtp + updateUser calls');
    }

    // 5) Claim → dashboard (mock activate POST via apiFetch path)
    await page.route('**/api/professionals?action=activate', async function (route) {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
      }
      return route.continue();
    });
    await page.route('**/api/professionals?action=session', async function (route) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: { id: 'e2e', email: 'e2e@example.com' },
          memberships: [{ partnerId: 'p1', role: 'owner' }]
        })
      });
    });

    // activate.js loads preview on boot — wait for claim button
    await page.waitForSelector('#claimBtn', { timeout: 10000 });
    await Promise.all([
      page.waitForURL(/\/professionals\/dashboard/, { timeout: 15000 }),
      page.click('#claimBtn')
    ]);

    console.log('E2E_PASS', JSON.stringify({
      firstCtaPath: afterClickPath,
      stayedPath: stayedPath,
      afterPasswordPath: finalPath,
      claimPath: new URL(page.url()).pathname,
      verifyCalls: auth.verifyCalls,
      updateCalls: auth.updateCalls,
      trace: trace
    }));
  } catch (err) {
    failed = err;
    console.error('E2E_FAIL', err && err.message ? err.message : err);
    console.error('TRACE', JSON.stringify(trace, null, 2));
  } finally {
    await browser.close();
    server.close();
  }

  if (failed) process.exit(1);
}

main();
