'use strict';
/**
 * Phase B Sprint 2 — onboarding wizard shell offline checks.
 * Run: node scripts/phase-b-sprint2-check.js
 *
 * Covers: step routing, resume landing, review-status guards, dashboard CTA,
 * autosave UI wiring markers, mobile/desktop shell smoke, Phase A / Sprint 1
 * non-regression (pages + APIs still present).
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    fn();
    ok(name);
  } catch (e) {
    fail(name, e);
  }
}

var Shell = require('../js/professionals/onboarding-shell');

test('shell step ids match V2 frozen P1–P8', function () {
  assert.deepStrictEqual(Shell.STEP_IDS, [
    'start',
    'bedrijf_bereik',
    'ambacht',
    'aanbod',
    'verhaal',
    'portfolio',
    'controle',
    'review_hub'
  ]);
  assert.strictEqual(Shell.STEP_META.start.p, 1);
  assert.strictEqual(Shell.STEP_META.review_hub.p, 8);
  assert.strictEqual(Shell.WIZARD_STEPS.length, 7);
});

test('next/prev navigation within wizard', function () {
  assert.strictEqual(Shell.nextStepId('start'), 'bedrijf_bereik');
  assert.strictEqual(Shell.nextStepId('portfolio'), 'controle');
  assert.strictEqual(Shell.nextStepId('controle'), 'review_hub');
  assert.strictEqual(Shell.prevStepId('bedrijf_bereik'), 'start');
  assert.strictEqual(Shell.prevStepId('start'), null);
  assert.strictEqual(Shell.prevStepId('review_hub'), 'controle');
});

test('resume landing uses current_step_id for in_progress', function () {
  assert.strictEqual(
    Shell.resolveLandingStep({ onboardingStatus: 'not_started', currentStepId: 'start' }),
    'start'
  );
  assert.strictEqual(
    Shell.resolveLandingStep({
      onboardingStatus: 'in_progress',
      currentStepId: 'ambacht'
    }),
    'ambacht'
  );
  assert.strictEqual(
    Shell.resolveLandingStep({
      onboardingStatus: 'in_progress',
      currentStepId: 'review_hub'
    }),
    'controle'
  );
});

test('submitted / changes_requested / approved routing (Sprint 7)', function () {
  assert.strictEqual(
    Shell.resolveLandingStep({ onboardingStatus: 'submitted', currentStepId: 'ambacht' }),
    'review_hub'
  );
  assert.strictEqual(
    Shell.resolveLandingStep({ onboardingStatus: 'approved', currentStepId: 'controle' }),
    'review_hub'
  );
  assert.strictEqual(
    Shell.resolveLandingStep({
      onboardingStatus: 'changes_requested',
      currentStepId: 'bedrijf_bereik'
    }),
    'bedrijf_bereik'
  );

  assert.ok(Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'review_hub' }));
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'portfolio' }));
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'verhaal' }));
  assert.ok(!Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'ambacht' }));
  assert.ok(!Shell.canVisitStep({ onboardingStatus: 'submitted', stepId: 'bedrijf_bereik' }));

  assert.ok(Shell.canVisitStep({ onboardingStatus: 'changes_requested', stepId: 'review_hub' }));
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'changes_requested', stepId: 'ambacht' }));
  assert.ok(Shell.canVisitStep({ onboardingStatus: 'changes_requested', stepId: 'controle' }));

  assert.ok(Shell.canVisitStep({ onboardingStatus: 'approved', stepId: 'review_hub' }));
  assert.ok(!Shell.canVisitStep({ onboardingStatus: 'approved', stepId: 'portfolio' }));
});

test('route resolver ignores illegal requested steps', function () {
  assert.strictEqual(
    Shell.resolveRouteStep({
      onboardingStatus: 'submitted',
      currentStepId: 'review_hub',
      requestedStepId: 'aanbod'
    }),
    'review_hub'
  );
  assert.strictEqual(
    Shell.resolveRouteStep({
      onboardingStatus: 'in_progress',
      currentStepId: 'verhaal',
      requestedStepId: 'portfolio'
    }),
    'portfolio'
  );
  assert.strictEqual(
    Shell.resolveRouteStep({
      onboardingStatus: 'in_progress',
      currentStepId: 'verhaal',
      requestedStepId: 'review_hub'
    }),
    'verhaal'
  );
});

test('parseStepFromLocation supports path, query, hash', function () {
  assert.strictEqual(
    Shell.parseStepFromLocation({ pathname: '/professionals/onboarding/ambacht' }),
    'ambacht'
  );
  assert.strictEqual(
    Shell.parseStepFromLocation({ pathname: '/professionals/onboarding', search: '?step=portfolio' }),
    'portfolio'
  );
  assert.strictEqual(
    Shell.parseStepFromLocation({ pathname: '/professionals/onboarding', hash: '#bedrijf_bereik' }),
    'bedrijf_bereik'
  );
  assert.strictEqual(
    Shell.parseStepFromLocation({ pathname: '/professionals/onboarding', hash: '#/controle' }),
    'controle'
  );
  assert.strictEqual(
    Shell.parseStepFromLocation({ pathname: '/professionals/onboarding' }),
    null
  );
});

test('dashboard CTA kinds: start / resume / wait-for-review', function () {
  var start = Shell.dashboardCta({ onboardingStatus: 'not_started' });
  assert.strictEqual(start.kind, 'start');
  assert.ok(/Start/i.test(start.label));
  assert.strictEqual(start.href, '/professionals/onboarding');

  var resume = Shell.dashboardCta({ onboardingStatus: 'in_progress' });
  assert.strictEqual(resume.kind, 'resume');
  assert.ok(/verder|Ga verder/i.test(resume.label));

  var wait = Shell.dashboardCta({ onboardingStatus: 'submitted' });
  assert.strictEqual(wait.kind, 'wait_for_review');
  assert.ok(/review|Wacht/i.test(wait.label));
  assert.strictEqual(wait.href, '/professionals/onboarding/review_hub');

  var changes = Shell.dashboardCta({ onboardingStatus: 'changes_requested' });
  assert.strictEqual(changes.kind, 'changes_requested');
  assert.strictEqual(changes.href, '/professionals/onboarding/review_hub');

  var approved = Shell.dashboardCta({ onboardingStatus: 'approved' });
  assert.strictEqual(approved.kind, 'approved');
});

test('progress helper for wizard and review hub', function () {
  var p1 = Shell.progressFor('start');
  assert.strictEqual(p1.current, 1);
  assert.strictEqual(p1.total, 7);
  var p8 = Shell.progressFor('review_hub');
  assert.strictEqual(p8.current, 8);
  assert.strictEqual(p8.percent, 100);
});

test('onboarding HTML is wizard shell with P1–P8 panels', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
  Shell.STEP_IDS.forEach(function (id) {
    assert.ok(html.indexOf('data-step="' + id + '"') >= 0, id);
  });
  assert.ok(html.indexOf('id="saveStatus"') >= 0);
  assert.ok(html.indexOf('id="backBtn"') >= 0);
  assert.ok(html.indexOf('id="nextBtn"') >= 0);
  assert.ok(html.indexOf('id="progressFill"') >= 0);
  assert.ok(html.indexOf('prof-shell-wizard') >= 0);
  assert.ok(html.indexOf('onboarding-shell.js') >= 0);
  assert.ok(html.indexOf('onboarding.js') >= 0);
  // Sprint 2 shell: Google out of onboarding; Sprint 7 removed placeholders
  assert.ok(html.indexOf('google_intent') < 0);
  assert.ok(html.indexOf('submitOnboardingBtn') >= 0);
  assert.ok(html.indexOf('prof-placeholder') < 0);
});

test('onboarding.js wires session guard, GET onboarding resume, save UI', function () {
  var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
  assert.ok(src.indexOf('requireSessionOrRedirect') >= 0);
  assert.ok(src.indexOf("apiFetch('onboarding'") >= 0 || src.indexOf('apiFetch("onboarding"') >= 0);
  assert.ok(src.indexOf('onboarding-save') >= 0);
  assert.ok(src.indexOf('Opslaan…') >= 0 || src.indexOf('Opslaan...') >= 0);
  assert.ok(src.indexOf('Alles opgeslagen') >= 0);
  assert.ok(src.indexOf('resolveLandingStep') >= 0 || src.indexOf('resolveRouteStep') >= 0);
  assert.ok(src.indexOf('noMembership') >= 0);
  assert.ok(src.indexOf('currentStepId') >= 0);
  assert.ok(src.indexOf('version') >= 0);
});

test('dashboard CTA driven by onboarding-status', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/dashboard.html'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'js/professionals/dashboard.js'), 'utf8');
  assert.ok(html.indexOf('id="onboardingCta"') >= 0);
  assert.ok(html.indexOf('onboarding-shell.js') >= 0);
  assert.ok(js.indexOf('onboarding-status') >= 0);
  assert.ok(js.indexOf('dashboardCta') >= 0);
  assert.ok(js.indexOf('requireSessionOrRedirect') >= 0);
});

test('vercel rewrite for /professionals/onboarding/:step', function () {
  var v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  var hit = (v.rewrites || []).some(function (r) {
    return String(r.source) === '/professionals/onboarding/:step' &&
      String(r.destination) === '/professionals/onboarding';
  });
  assert.ok(hit, 'expected onboarding step rewrite');
});

test('responsive shell CSS covers mobile + desktop wizard', function () {
  var css = fs.readFileSync(path.join(root, 'css/professionals.css'), 'utf8');
  assert.ok(css.indexOf('prof-shell-wizard') >= 0);
  assert.ok(css.indexOf('prof-wizard-nav') >= 0);
  assert.ok(css.indexOf('prof-save-status') >= 0);
  assert.ok(css.indexOf('@media (max-width:640px)') >= 0);
  assert.ok(css.indexOf('prof-progress') >= 0);
});

test('no service_role leakage in sprint 2 browser bundles', function () {
  ['onboarding.js', 'onboarding-shell.js', 'dashboard.js', 'core.js'].forEach(function (f) {
    var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
    assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
    assert.ok(t.indexOf('service_role') < 0, f);
  });
});

test('Phase A pages and Sprint 1 APIs still present (no regression)', function () {
  ['login', 'activate', 'forgot-password', 'reset-password', 'dashboard', 'onboarding'].forEach(
    function (p) {
      assert.ok(fs.existsSync(path.join(root, 'professionals', p + '.html')), p);
    }
  );
  var api = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  [
    'session',
    'activate',
    'setup-password',
    'onboarding',
    'onboarding-status',
    'onboarding-save',
    'onboarding-submit',
    'onboarding-resubmit'
  ].forEach(function (a) {
    assert.ok(api.indexOf("'" + a + "'") >= 0 || api.indexOf('"' + a + '"') >= 0, a);
  });
  assert.ok(fs.existsSync(path.join(root, 'server/onboarding.js')));
  assert.ok(fs.existsSync(path.join(root, 'server/onboarding-model.js')));
  assert.ok(
    fs.existsSync(
      path.join(root, 'supabase/migrations/20260816_phase_b_onboarding_foundation.sql')
    )
  );
});

test('shell module stays aligned with server onboarding-model STEP_IDS', function () {
  var model = require('../server/onboarding-model');
  assert.deepStrictEqual(Shell.STEP_IDS, model.STEP_IDS);
  assert.deepStrictEqual(Shell.WIZARD_STEPS, model.WIZARD_STEPS);
});

console.log('');
if (failed) {
  console.error(failed + ' Phase B Sprint 2 check(s) failed');
  process.exit(1);
}
console.log('All Phase B Sprint 2 offline checks passed');
