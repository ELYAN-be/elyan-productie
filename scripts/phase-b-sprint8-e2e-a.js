#!/usr/bin/env node
/**
 * Sprint 8 E2E A (local): Control approve → publish (submitted fixture).
 * @elyan-test.invalid only. Mocked BFF + Playwright.
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');
var Draft = require('../js/professionals/onboarding-draft');
var controlModel = require('../server/control-model');

var ROOT = path.join(__dirname, '..');
var PORT = 8781;
var ORIGIN = 'http://127.0.0.1:' + PORT;
var PARTNER_ID = 'e2e8aaa1-1111-1111-1111-111111111111';

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

function buildDraft() {
  var sid = Draft.getServices('schilderwerken')[0].id;
  var sp = Draft.emptyServicePrice();
  sp.pricing_model = 'on_request';
  var prices = {};
  prices[sid] = sp;
  return {
    company: {
      legal_name: 'E2E8 Schilders BV',
      display_name: 'E2E8 Schilders',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Testlaan 1',
      postcode: '1000',
      gemeente: 'Brussel',
      gewest: 'brussel',
      website: '',
      email: 'e2e8-owner@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'E2E8 Owner',
      contact_role: 'Zaakvoerder',
      language: 'nl-BE'
    },
    service_area: {
      mode: 'heel_belgie',
      radius_km: null,
      provinces: [],
      regions: [],
      public_text: 'Heel België',
      exclusions: ''
    },
    craft: {
      primary_category_id: 'schilderwerken',
      service_ids: [sid],
      conditionals: {},
      extras: { scope: ['Binnen'] }
    },
    offer: {
      service_prices: prices,
      vat_basis: 'exclusief',
      project_minimum: null,
      client_types: ['particulier'],
      response_time: '24u',
      urgency_jobs: null,
      capacity: 'limited',
      start_month: Draft.listStartMonths()[0].id,
      visit_speed: '2w',
      visit_extra: []
    },
    story: {
      years_active: '3-5',
      team_size: '',
      strength: 'Nette schilderwerken binnenshuis.',
      prefer: 'Renovatieprojecten bij particulieren.',
      avoid: '',
      care: '',
      why_choose: '',
      materials: '',
      must_know: '',
      guarantee_line: '',
      show_years_public: true,
      show_team_public: false
    },
    confirmations: { data_correct: true, editorial_ok: true }
  };
}

function controlReview(state) {
  return {
    ok: true,
    partner: {
      id: PARTNER_ID,
      legalName: 'E2E8 Schilders BV',
      displayName: 'E2E8 Schilders',
      accountStatus: 'active'
    },
    onboarding: {
      partnerId: PARTNER_ID,
      onboardingStatus: state.status,
      draft: state.draft,
      version: state.version
    },
    profile: {
      partnerId: PARTNER_ID,
      profileStatus: state.profileStatus,
      slug: state.slug,
      readyAt: state.readyAt,
      publishedAt: state.publishedAt
    },
    draft: state.draft,
    assets: [],
    reviewItems: state.reviewItems || [],
    openReviewCount: 0,
    sections: Draft.buildControleSections(state.draft, []),
    marketplacePreview: controlModel.buildMarketplacePreview({
      partnerId: PARTNER_ID,
      draft: state.draft,
      assets: [],
      displayName: 'E2E8 Schilders',
      legalName: 'E2E8 Schilders BV',
      slug: state.slug,
      profileStatus: state.profileStatus
    }),
    actions: {
      canRequestChanges: state.status === 'submitted',
      canApprove: state.status === 'submitted',
      canPublish: state.profileStatus === 'ready',
      canPause: state.profileStatus === 'published',
      canHide: state.profileStatus === 'published' || state.profileStatus === 'paused',
      canRestore: state.profileStatus === 'paused' || state.profileStatus === 'hidden'
    }
  };
}

function supabaseStub() {
  return [
    'window.supabase={createClient:function(){return{auth:{',
    'getSession:async function(){return{data:{session:{access_token:"e2e",user:{id:"staff",email:"e2e8-staff@elyan-test.invalid"}}},error:null};},',
    'onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}};},',
    'signOut:async function(){return{error:null};}',
    '}};}};'
  ].join('');
}

function startServer() {
  var state = {
    status: 'submitted',
    profileStatus: 'under_review',
    version: 6,
    draft: buildDraft(),
    reviewItems: [],
    slug: null,
    readyAt: null,
    publishedAt: null,
    snapshot: null,
    audits: []
  };

  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var u = new URL(req.url, ORIGIN);
      var pathname = u.pathname;
      var action = u.searchParams.get('action');

      if (pathname === '/api/professionals' && action === 'public-config') {
        return send(res, 200, JSON.stringify({
          ok: true,
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'eyJhbGciOiJub25lIn0.e30.e2e'
        }), MIME['.json']);
      }

      if (pathname === '/api/control') {
        var chunks = [];
        var finish = function (body) {
          action = action || (body && body.action) || '';
          if (action === 'session') {
            return send(res, 200, JSON.stringify({
              ok: true,
              user: { id: 'staff', email: 'e2e8-staff@elyan-test.invalid' },
              staff: { role: 'elyan_admin' }
            }), MIME['.json']);
          }
          if (action === 'list') {
            return send(res, 200, JSON.stringify({
              ok: true,
              filter: 'submitted',
              items: [{
                partnerId: PARTNER_ID,
                displayName: 'E2E8 Schilders',
                legalName: 'E2E8 Schilders BV',
                onboardingStatus: state.status,
                profileStatus: state.profileStatus
              }],
              count: 1
            }), MIME['.json']);
          }
          if (action === 'review') {
            return send(res, 200, JSON.stringify(controlReview(state)), MIME['.json']);
          }
          if (action === 'approve') {
            state.status = 'approved';
            state.profileStatus = 'ready';
            state.readyAt = new Date().toISOString();
            state.audits.push('control_approve');
            return send(res, 200, JSON.stringify(controlReview(state)), MIME['.json']);
          }
          if (action === 'publish') {
            state.profileStatus = 'published';
            state.slug = 'e2e8-schilders';
            state.publishedAt = new Date().toISOString();
            state.snapshot = controlModel.buildPublishedSnapshot({
              partnerId: PARTNER_ID,
              draft: state.draft,
              assets: [],
              slug: state.slug,
              publishedAt: state.publishedAt,
              displayName: 'E2E8 Schilders',
              legalName: 'E2E8 Schilders BV'
            });
            state.audits.push('control_publish');
            return send(res, 200, JSON.stringify(controlReview(state)), MIME['.json']);
          }
          return send(res, 400, JSON.stringify({ error: 'missing_fields' }), MIME['.json']);
        };
        if (req.method === 'GET') return finish({});
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () {
          var body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
          finish(body);
        });
        return;
      }

      var filePath = pathname;
      if (filePath === '/professionals/control' || /^\/professionals\/control\//.test(filePath)) {
        filePath = '/professionals/control.html';
      }
      var abs = path.join(ROOT, filePath.replace(/^\//, ''));
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return send(res, 404, 'not found');
      }
      return send(res, 200, fs.readFileSync(abs), MIME[path.extname(abs)] || 'text/plain');
    });

    server.listen(PORT, '127.0.0.1', function () {
      resolve({ server: server, state: state });
    });
  });
}

async function main() {
  var started = await startServer();
  var browser = await chromium.launch({ headless: true });
  var page = await browser.newPage();

  await page.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2/**', function (route) {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: supabaseStub()
    });
  });

  await page.goto(ORIGIN + '/professionals/control', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-open-partner]');
  await page.click('[data-open-partner]');
  await page.waitForSelector('#ctrlReviewView:not([hidden])');
  await page.waitForSelector('[data-act="approve"]');

  await page.click('[data-act="approve"]');
  await page.click('#ctrlConfirmOk');
  await page.waitForSelector('[data-act="publish"]');

  await page.click('[data-act="publish"]');
  await page.click('#ctrlConfirmOk');
  await page.waitForFunction(function () {
    var el = document.querySelector('#ctrlBadges');
    return el && el.textContent.indexOf('Gepubliceerd') >= 0;
  });

  if (started.state.profileStatus !== 'published') throw new Error('expected published');
  if (started.state.slug !== 'e2e8-schilders') throw new Error('bad slug');
  if (!started.state.snapshot || started.state.snapshot.version !== 1) throw new Error('bad snapshot');
  if (started.state.audits.join(',') !== 'control_approve,control_publish') {
    throw new Error('bad audits ' + started.state.audits.join(','));
  }

  await browser.close();
  started.server.close();
  console.log('OK  Sprint 8 E2E A approve → publish');
}

main().catch(function (err) {
  console.error('FAIL E2E A —', err && err.message ? err.message : err);
  process.exit(1);
});
