#!/usr/bin/env node
/**
 * Browser E2E 2 (local): submitted → changes_requested fixture → correct → resubmit.
 * Uses @elyan-test.invalid only.
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');

var ROOT = path.join(__dirname, '..');
var PORT = 8772;
var ORIGIN = 'http://127.0.0.1:' + PORT;
var PARTNER_ID = 'e2e22222-2222-2222-2222-222222222222';
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
      legal_name: 'E2E Resubmit BV',
      display_name: 'E2E Resubmit',
      rechtsvorm: 'bv',
      kbo: 'BE0123456749',
      btw_plichtig: false,
      btw_nummer: '',
      adres: 'Herstelstraat 2',
      postcode: '2000',
      gemeente: 'Antwerpen',
      gewest: 'vlaanderen',
      website: '',
      email: 'e2e-resubmit@elyan-test.invalid',
      phone: '+32470999888',
      contact_name: 'E2E Admin',
      contact_role: 'Admin',
      language: 'nl-BE'
    },
    service_area: {
      mode: 'radius',
      radius_km: 30,
      provinces: [],
      regions: [],
      public_text: 'Antwerpen + 30 km',
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
      years_active: '6-10',
      team_size: '',
      strength: 'Duidelijke planning en nette oplevering.',
      prefer: 'Particuliere interieurwerken.',
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

function payload(state) {
  return {
    ok: true,
    partnerId: PARTNER_ID,
    role: 'admin',
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
    reviewHub: true,
    editableSections: state.status === 'changes_requested'
      ? ['start', 'bedrijf_bereik', 'ambacht', 'aanbod', 'verhaal', 'portfolio', 'controle']
      : state.status === 'submitted'
        ? ['portfolio', 'verhaal_optional']
        : [],
    canEdit: state.status === 'changes_requested' || state.status === 'submitted',
    canSubmit: false,
    canResubmit: state.status === 'changes_requested',
    completion: { domainsFilled: 7, domainsTotal: 7, ratio: 100 },
    profileStrength: Draft.evaluateProfileStrength(state.draft, []),
    submitGates: Draft.evaluateSubmitGates(state.draft)
  };
}

function supabaseStub() {
  return [
    'window.supabase={createClient:function(){return{auth:{',
    'getSession:async function(){return{data:{session:{access_token:"e2e",user:{id:"u2",email:"e2e-resubmit@elyan-test.invalid"}}},error:null};},',
    'onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}};},',
    'signOut:async function(){return{error:null};}',
    '}};}};'
  ].join('');
}

function startServer() {
  var state = {
    status: 'changes_requested',
    profileStatus: 'draft',
    step: 'review_hub',
    version: 5,
    draft: buildDraft(),
    reviewItems: [{
      id: 'ri-e2e',
      stepId: 'bedrijf_bereik',
      fieldKey: 'kbo',
      message: 'Controleer het ondernemingsnummer',
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null
    }],
    resubmits: 0
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
          user: { id: 'u2', email: 'e2e-resubmit@elyan-test.invalid' },
          memberships: [{
            partnerId: PARTNER_ID,
            role: 'admin',
            partner: {
              id: PARTNER_ID,
              displayName: 'E2E Resubmit',
              legalName: 'E2E Resubmit BV',
              accountStatus: 'active'
            }
          }]
        }), MIME['.json']);
      }
      if (pathname === '/api/professionals' && action === 'onboarding') {
        return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
      }
      if (pathname === '/api/professionals' && (action === 'onboarding-save' || action === 'onboarding-resubmit')) {
        var chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () {
          var body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
          if (action === 'onboarding-save') {
            if (body.draft && body.draft.company) {
              state.draft.company = Object.assign({}, state.draft.company, body.draft.company);
            }
            if (body.draft && body.draft.confirmations) {
              state.draft.confirmations = Object.assign({}, state.draft.confirmations, body.draft.confirmations);
            }
            if (body.currentStepId) state.step = body.currentStepId;
            state.version += 1;
            // open feedback must survive autosave
            return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
          }
          state.resubmits += 1;
          state.status = 'submitted';
          state.profileStatus = 'under_review';
          state.step = 'review_hub';
          state.reviewItems = state.reviewItems.map(function (r) {
            return Object.assign({}, r, { status: 'resolved', resolvedAt: new Date().toISOString() });
          });
          state.version += 1;
          return send(res, 200, JSON.stringify(payload(state)), MIME['.json']);
        });
        return;
      }

      var filePath = pathname;
      if (filePath.indexOf('/professionals/onboarding') === 0 && !path.extname(filePath)) {
        filePath = '/professionals/onboarding.html';
      }
      var abs = path.join(ROOT, filePath.replace(/^\//, ''));
      if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return send(res, 404, 'not found');
      }
      return send(res, 200, fs.readFileSync(abs), MIME[path.extname(abs)] || 'application/octet-stream');
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

  await page.goto(ORIGIN + '/professionals/onboarding/review_hub', { waitUntil: 'networkidle' });
  await page.waitForSelector('#reviewOpenItemsList');
  var openText = await page.$eval('#reviewOpenItemsList', function (el) { return el.textContent; });
  if (openText.indexOf('ondernemingsnummer') < 0) throw new Error('Open review item missing');

  await page.click('#gotoControleBtn');
  await page.waitForSelector('#submitOnboardingBtn');
  var openStill = started.state.reviewItems.filter(function (r) { return r.status === 'open'; }).length;
  if (openStill !== 1) throw new Error('Autosave/navigation cleared open items');

  await page.click('#submitOnboardingBtn');
  await page.waitForSelector('#reviewStatusText');
  var status = await page.$eval('#reviewStatusText', function (el) { return el.textContent; });
  if (status.indexOf('Ingediend') < 0) throw new Error('Expected Ingediend after resubmit');
  if (started.state.resubmits !== 1) throw new Error('Expected 1 resubmit');
  if (started.state.status !== 'submitted') throw new Error('Expected submitted');
  if (started.state.reviewItems[0].status !== 'resolved') throw new Error('Expected resolved items');

  await browser.close();
  started.server.close();
  console.log('OK  e2e2 changes_requested → resubmit');
}

main().catch(function (err) {
  console.error('FAIL e2e2 —', err && err.message ? err.message : err);
  process.exit(1);
});
