#!/usr/bin/env node
/**
 * Browser E2E: invite password CTA stays on set-password until server setup-password succeeds.
 * Fails if navigation to /professionals/activate happens before password submit.
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
    var setupPosts = 0;
    var server = http.createServer(function (req, res) {
      var u = new URL(req.url, ORIGIN);
      var pathname = u.pathname;
      var action = u.searchParams.get('action');

      if (pathname === '/api/professionals' && action === 'public-config') {
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

      if (pathname === '/api/professionals' && action === 'setup-password') {
        if (req.method !== 'POST') return send(res, 405, 'method');
        var chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () {
          setupPosts += 1;
          var body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
          if (!body.token || body.token !== ELYAN) {
            return send(res, 400, JSON.stringify({ error: 'invite_invalid', message: 'ongeldig' }), MIME['.json']);
          }
          if (!body.password || String(body.password).length < 8) {
            return send(res, 400, JSON.stringify({ error: 'password_too_weak', message: 'te kort' }), MIME['.json']);
          }
          return send(
            res,
            200,
            JSON.stringify({ ok: true, email: 'e2e@example.com', inviteToken: ELYAN }),
            MIME['.json']
          );
        });
        return;
      }

      if (pathname === '/api/professionals' && action === 'activate') {
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
      resolve({ server: server, getSetupPosts: function () { return setupPosts; } });
    });
  });
}

async function installSupabaseMock(page) {
  await page.addInitScript(function () {
    var raw = null;
    try { raw = sessionStorage.getItem('e2eAuth'); } catch (e) { raw = null; }
    var saved = null;
    try { saved = raw ? JSON.parse(raw) : null; } catch (e2) { saved = null; }
    window.__e2eAuth = {
      signInCalls: (saved && saved.signInCalls) || 0,
      session: (saved && saved.session) || null
    };
    window.__e2eAuthPersist = function () {
      try {
        sessionStorage.setItem('e2eAuth', JSON.stringify({
          signInCalls: window.__e2eAuth.signInCalls,
          session: window.__e2eAuth.session
        }));
      } catch (e3) { /* ignore */ }
    };
  });
  var mockJs =
    'window.supabase = { createClient: function () {' +
    '  if (!window.__e2eAuth) window.__e2eAuth = { signInCalls: 0, session: null };' +
    '  function persist() { if (window.__e2eAuthPersist) window.__e2eAuthPersist(); }' +
    '  return { auth: {' +
    '    signInWithPassword: async function () {' +
    '      window.__e2eAuth.signInCalls += 1;' +
    '      window.__e2eAuth.session = { access_token: "e2e" };' +
    '      persist();' +
    '      return { data: { session: window.__e2eAuth.session }, error: null };' +
    '    },' +
    '    getSession: async function () {' +
    '      return { data: { session: window.__e2eAuth.session }, error: null };' +
    '    },' +
    '    signOut: async function () {' +
    '      window.__e2eAuth.session = null;' +
    '      persist();' +
    '      return { error: null };' +
    '    },' +
    '    updateUser: async function () { return { data: {}, error: null }; },' +
    '    exchangeCodeForSession: async function () { return { data: { session: null }, error: null }; }' +
    '  }};' +
    '}};';
  await page.route('**/supabase.min.js', function (route) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: mockJs });
  });
  await page.route('**/supabase-js@2/dist/umd/supabase.min.js', function (route) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: mockJs });
  });
}

async function main() {
  var started = await startServer();
  var browser = await chromium.launch({ headless: true });
  var trace = [];
  var failed = null;

  try {
    var passwordSetupUrl = buildPasswordSetupUrl(ORIGIN, ELYAN);
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

    var page = await browser.newPage();
    await installSupabaseMock(page);

    page.on('framenavigated', function (frame) {
      if (frame !== page.mainFrame()) return;
      var entry = { ev: 'nav', pathname: new URL(page.url()).pathname };
      trace.push(entry);
      console.log('NAV', entry.pathname);
    });

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await Promise.all([
      page.waitForURL(/\/professionals\/set-password\//, { timeout: 15000 }),
      page.click('#cta-password')
    ]);

    var afterClickPath = new URL(page.url()).pathname;
    if (afterClickPath.indexOf('/professionals/activate') >= 0) {
      throw new Error('FAIL: first CTA navigated to activate');
    }
    if (afterClickPath !== '/professionals/set-password/' + ELYAN) {
      throw new Error('FAIL: unexpected set-password path ' + afterClickPath);
    }

    await page.waitForTimeout(2000);
    if (new URL(page.url()).pathname.indexOf('/professionals/activate') >= 0) {
      throw new Error('FAIL: redirected to activate before password submit');
    }
    if (started.getSetupPosts() !== 0) {
      throw new Error('FAIL: setup-password called before submit');
    }

    var payload = decodePasswordSetupPayload(afterClickPath.split('/').pop());
    if (!payload || payload.inviteToken !== ELYAN) {
      throw new Error('FAIL: payload decode mismatch');
    }

    // Mock session/activate APIs before submit so claim works after redirect.
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

    await page.fill('#password', 'TestPass123!');
    await page.fill('#password2', 'TestPass123!');

    var activated = page.waitForURL(/\/professionals\/activate\?token=/, { timeout: 15000 });
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      function () {
        return window.__e2eAuth && window.__e2eAuth.signInCalls >= 1;
      },
      { timeout: 10000 }
    );
    var auth = await page.evaluate(function () { return window.__e2eAuth; });
    await activated;
    if (started.getSetupPosts() < 1) throw new Error('FAIL: setup-password not called');
    if (!auth || auth.signInCalls < 1) throw new Error('FAIL: expected signInWithPassword after setup');

    await page.waitForSelector('#claimBtn', { timeout: 10000 });
    await Promise.all([
      page.waitForURL(/\/professionals\/dashboard/, { timeout: 15000 }),
      page.click('#claimBtn')
    ]);

    console.log('E2E_PASS', JSON.stringify({
      firstCtaPath: afterClickPath,
      setupPosts: started.getSetupPosts(),
      signInCalls: auth.signInCalls,
      claimPath: new URL(page.url()).pathname,
      trace: trace
    }));
  } catch (err) {
    failed = err;
    console.error('E2E_FAIL', err && err.message ? err.message : err);
    console.error('TRACE', JSON.stringify(trace, null, 2));
  } finally {
    await browser.close();
    started.server.close();
  }

  if (failed) process.exit(1);
}

main();
