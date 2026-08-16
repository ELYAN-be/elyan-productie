#!/usr/bin/env node
/**
 * Browser E2E (local): claim button posts activate and reaches dashboard.
 * Also asserts activate.js surfaces API server_error message (regression guard).
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');

var ROOT = path.join(__dirname, '..');
var PORT = 8767;
var ORIGIN = 'http://127.0.0.1:' + PORT;
var TOKEN = 'e2eClaimToken_Base64urlXx';

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

function startServer(mode) {
  return new Promise(function (resolve) {
    var claimPosts = 0;
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

      if (pathname === '/api/professionals' && action === 'activate') {
        if (req.method === 'GET') {
          return send(
            res,
            200,
            JSON.stringify({
              ok: true,
              partner: { displayName: 'Claim Partner' },
              email: 'claim@example.com',
              role: 'owner'
            }),
            MIME['.json']
          );
        }
        if (req.method === 'POST') {
          claimPosts += 1;
          var chunks = [];
          req.on('data', function (c) {
            chunks.push(c);
          });
          req.on('end', function () {
            var auth = req.headers.authorization || '';
            if (!/^Bearer\s+\S+/i.test(auth)) {
              return send(
                res,
                401,
                JSON.stringify({
                  error: 'missing_token',
                  message: 'Je bent niet aangemeld. Log opnieuw in.'
                }),
                MIME['.json']
              );
            }
            if (mode === 'fail_members') {
              // Legacy broken behavior (pre-fix): permission denied → server_error
              return send(
                res,
                400,
                JSON.stringify({
                  error: 'server_error',
                  message: 'Er ging iets mis. Probeer het later opnieuw.'
                }),
                MIME['.json']
              );
            }
            return send(
              res,
              200,
              JSON.stringify({
                ok: true,
                partnerId: 'p1',
                membershipId: 'm1',
                role: 'owner',
                partner: { id: 'p1', displayName: 'Claim Partner', legalName: 'Claim BV' }
              }),
              MIME['.json']
            );
          });
          return;
        }
      }

      if (pathname === '/api/professionals' && action === 'session') {
        return send(
          res,
          200,
          JSON.stringify({
            ok: true,
            user: { id: 'u1', email: 'claim@example.com' },
            memberships: [
              {
                membershipId: 'm1',
                role: 'owner',
                partnerId: 'p1',
                partner: {
                  id: 'p1',
                  displayName: 'Claim Partner',
                  legalName: 'Claim BV',
                  accountStatus: 'active'
                }
              }
            ]
          }),
          MIME['.json']
        );
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
      resolve({ server: server, getClaimPosts: function () { return claimPosts; } });
    });
  });
}

async function installSupabaseMock(page) {
  await page.addInitScript(function () {
    window.__e2eAuth = { session: { access_token: 'e2e-claim-token' } };
  });
  var mockJs =
    'window.supabase = { createClient: function () {' +
    '  return { auth: {' +
    '    getSession: async function () { return { data: { session: window.__e2eAuth.session }, error: null }; },' +
    '    signOut: async function () { window.__e2eAuth.session = null; return { error: null }; }' +
    '  }};' +
    '}};';
  await page.route('**/supabase.min.js', function (route) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: mockJs });
  });
  await page.route('**/supabase-js@2/dist/umd/supabase.min.js', function (route) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: mockJs });
  });
}

async function runCase(mode, expectDashboard) {
  var started = await startServer(mode);
  var browser = await chromium.launch({ headless: true });
  try {
    var page = await browser.newPage();
    await installSupabaseMock(page);
    await page.goto(ORIGIN + '/professionals/activate?token=' + encodeURIComponent(TOKEN), {
      waitUntil: 'networkidle'
    });
    // Session is present in the mock → activate.js auto-claims without requiring a click.
    if (expectDashboard) {
      await page.waitForURL(/\/professionals\/dashboard/, { timeout: 15000 });
      console.log('CLAIM_E2E_PASS', mode, page.url());
    } else {
      await page.waitForSelector('#activateStatus', { timeout: 10000 });
      await page.waitForFunction(
        function () {
          var el = document.querySelector('#activateStatus');
          return el && String(el.textContent || '').indexOf('Er ging iets mis. Probeer het later opnieuw.') >= 0;
        },
        { timeout: 15000 }
      );
      var msg = await page.locator('#activateStatus').textContent();
      if (String(msg).indexOf('Er ging iets mis. Probeer het later opnieuw.') < 0) {
        throw new Error('expected server_error message, got: ' + msg);
      }
      if (new URL(page.url()).pathname.indexOf('/professionals/dashboard') >= 0) {
        throw new Error('should not reach dashboard in fail mode');
      }
      console.log('CLAIM_E2E_PASS', mode, 'surfaced_server_error');
    }
    if (started.getClaimPosts() < 1) throw new Error('claim POST not sent');
  } finally {
    await browser.close();
    started.server.close();
    // Port reuse delay
    await new Promise(function (r) { setTimeout(r, 300); });
  }
}

async function main() {
  // Guard: UI must show the known production error text when API returns server_error
  await runCase('fail_members', false);
  // Happy path after BFF fix
  await runCase('ok', true);
}

main().catch(function (err) {
  console.error('CLAIM_E2E_FAIL', err && err.message ? err.message : err);
  process.exit(1);
});
