#!/usr/bin/env node
/**
 * Browser E2E 1 (local): invite/auth fixture → P1–P6 filled → P7 submit → P8.
 * Uses @elyan-test.invalid only. Mocked BFF + static shell.
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');

var ROOT = path.join(__dirname, '..');
var PORT = 8771;
var ORIGIN = 'http://127.0.0.1:' + PORT;
var PARTNER_ID = 'e2e11111-1111-1111-1111-111111111111';
var Draft = require('../js/professionals/onboarding-draft');

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
      legal_name: 'E2E Schilders BV',
      display_name: 'E2E Schilders',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Testlaan 1',
      postcode: '1000',
      gemeente: 'Brussel',
      gewest: 'brussel',
      website: '',
      email: 'e2e-owner@elyan-test.invalid',
      phone: '+32470123456',
      contact_name: 'E2E Owner',
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
    confirmations: { data_correct: false, editorial_ok: false }
  };
}

function payload(state) {
  return {
    ok: true,
    partnerId: PARTNER_ID,
    role: 'owner',
    onboarding: {
      partnerId: PARTNER_ID,
      onboardingStatus: state.status,
      currentStepId: state.step,
      draft: state.draft,
      version: state.version
    },
    profile: { partnerId: PARTNER_ID, profileStatus: state.profileStatus },
    draft: state.draft,
    version: state.version,
    currentStepId: state.step,
    onboardingStatus: state.status,
    profileStatus: state.profileStatus,
    reviewItems: state.reviewItems || [],
    assets: [],
    coverAssetId: null,
    reviewHub: state.status === 'submitted' || state.status === 'changes_requested' || state.status === 'approved',
    editableSections: state.status === 'submitted'
      ? ['portfolio', 'verhaal_optional']
      : state.status === 'in_progress' || state.status === 'changes_requested'
        ? ['start', 'bedrijf_bereik', 'ambacht', 'aanbod', 'verhaal', 'portfolio', 'controle']
        : [],
    canEdit: state.status !== 'approved',
    canSubmit: state.status === 'in_progress',
    canResubmit: state.status === 'changes_requested',
    completion: { domainsFilled: 6, domainsTotal: 7, ratio: 85 },
    profileStrength: Draft.evaluateProfileStrength(state.draft, []),
    submitGates: Draft.evaluateSubmitGates(state.draft)
  };
}

function startServer() {
  var state = {
    status: 'in_progress',
    profileStatus: 'draft',
    step: 'controle',
    version: 3,
    draft: buildDraft(),
    reviewItems: [],
    submits: 0
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

      if (pathname === '/api/professionals' && action === 'session') {
        return send(res, 200, JSON.stringify({
          ok: true,
          user: { id: 'u-e2e', email: 'e2e-owner@elyan-test.invalid' },
          memberships: [{
            partnerId: PARTNER_ID,
            role: 'owner',
            partner: {
              id: PARTNER_ID,
              displayName: 'E2E Schilders',
              legalName: 'E2E Schilders BV',
              accountStatus: 'active'
            }
          }]
        }), MIME['.json']);
      }

      if (pathname === '/api/professionals' && action === 'onboarding') {
        return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
      }

      if (pathname === '/api/professionals' && (action === 'onboarding-save' || action === 'onboarding-submit' || action === 'onboarding-resubmit')) {
        var chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () {
          var body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
          if (action === 'onboarding-save') {
            if (body.draft && typeof body.draft === 'object') {
              Object.keys(body.draft).forEach(function (k) {
                if (k === 'confirmations') {
                  state.draft.confirmations = Object.assign({}, state.draft.confirmations, body.draft.confirmations);
                } else if (body.draft[k] && typeof body.draft[k] === 'object' && !Array.isArray(body.draft[k])) {
                  state.draft[k] = Object.assign({}, state.draft[k] || {}, body.draft[k]);
                } else {
                  state.draft[k] = body.draft[k];
                }
              });
            }
            if (body.currentStepId) state.step = body.currentStepId;
            state.version += 1;
            return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
          }
          if (action === 'onboarding-submit') {
            state.submits += 1;
            var gates = Draft.evaluateSubmitGates(state.draft);
            if (!gates.ok) {
              return send(res, 400, JSON.stringify({
                ok: false,
                error: 'submit_incomplete',
                missing: gates.missing
              }), MIME['.json']);
            }
            state.status = 'submitted';
            state.profileStatus = 'under_review';
            state.step = 'review_hub';
            state.version += 1;
            return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
          }
          return send(res, 400, JSON.stringify({ ok: false, error: 'bad_action' }), MIME['.json']);
        });
        return;
      }

      var filePath = pathname === '/' ? '/professionals/onboarding.html' : pathname;
      if (filePath.indexOf('/professionals/onboarding') === 0 && !path.extname(filePath)) {
        filePath = '/professionals/onboarding.html';
      }
      var abs = path.join(ROOT, filePath.replace(/^\//, ''));
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return send(res, 404, 'not found');
      }
      var ext = path.extname(abs);
      return send(res, 200, fs.readFileSync(abs), MIME[ext] || 'application/octet-stream');
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
      body: [
        'window.supabase={createClient:function(){return{auth:{',
        'getSession:async function(){return{data:{session:{access_token:"e2e",user:{id:"u-e2e",email:"e2e-owner@elyan-test.invalid"}}},error:null};},',
        'onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}};},',
        'signOut:async function(){return{error:null};}',
        '}};}};'
      ].join('')
    });
  });

  await page.goto(ORIGIN + '/professionals/onboarding/controle', { waitUntil: 'networkidle' });
  await page.waitForSelector('#submitOnboardingBtn');

  var disabledBefore = await page.$eval('#submitOnboardingBtn', function (el) { return el.disabled; });
  if (!disabledBefore) throw new Error('Submit should be disabled without checkboxes');

  await page.check('#f_data_correct');
  await page.check('#f_editorial_ok');
  await page.waitForTimeout(900);

  var disabledAfter = await page.$eval('#submitOnboardingBtn', function (el) { return el.disabled; });
  if (disabledAfter) throw new Error('Submit should enable when gates + checkboxes ok');

  await page.click('#submitOnboardingBtn');
  await page.waitForSelector('#reviewHubTitle');
  var title = await page.$eval('#reviewHubTitle', function (el) { return el.textContent; });
  if (title.indexOf('Ingediend') < 0 && title.toLowerCase().indexOf('review') < 0) {
    throw new Error('Expected Review Hub after submit, got: ' + title);
  }
  var statusText = await page.$eval('#reviewStatusText', function (el) { return el.textContent; });
  if (statusText.indexOf('Ingediend') < 0) throw new Error('Expected Ingediend status, got ' + statusText);
  if (started.state.submits !== 1) throw new Error('Expected 1 submit, got ' + started.state.submits);
  if (started.state.status !== 'submitted') throw new Error('Expected submitted status');
  if (started.state.profileStatus !== 'under_review') throw new Error('Expected under_review');

  await browser.close();
  started.server.close();
  console.log('OK  e2e1 submit → Review Hub');
}

main().catch(function (err) {
  console.error('FAIL e2e1 —', err && err.message ? err.message : err);
  process.exit(1);
});
