/**
 * Phase B Sprint 2 — onboarding wizard shell helpers (V2 frozen).
 * Works in browser (script tag) and Node (require) for offline tests.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanOnboardingShell = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STEP_IDS = [
    'start',
    'bedrijf_bereik',
    'ambacht',
    'aanbod',
    'verhaal',
    'portfolio',
    'controle',
    'review_hub'
  ];

  var STEP_META = {
    start: { id: 'start', p: 1, title: 'Start', short: 'Start' },
    bedrijf_bereik: {
      id: 'bedrijf_bereik',
      p: 2,
      title: 'Bedrijf & bereik',
      short: 'Bedrijf'
    },
    ambacht: { id: 'ambacht', p: 3, title: 'Ambacht', short: 'Ambacht' },
    aanbod: { id: 'aanbod', p: 4, title: 'Aanbod', short: 'Aanbod' },
    verhaal: { id: 'verhaal', p: 5, title: 'Verhaal', short: 'Verhaal' },
    portfolio: { id: 'portfolio', p: 6, title: 'Portfolio', short: 'Portfolio' },
    controle: { id: 'controle', p: 7, title: 'Controle', short: 'Controle' },
    review_hub: {
      id: 'review_hub',
      p: 8,
      title: 'Review Hub',
      short: 'Review'
    }
  };

  var WIZARD_STEPS = STEP_IDS.filter(function (s) {
    return s !== 'review_hub';
  });

  var REVIEW_STATUSES = {
    submitted: true,
    changes_requested: true,
    approved: true
  };

  function isStepId(v) {
    return STEP_IDS.indexOf(v) >= 0;
  }

  function stepIndex(stepId) {
    return STEP_IDS.indexOf(stepId);
  }

  function wizardIndex(stepId) {
    return WIZARD_STEPS.indexOf(stepId);
  }

  function isWizardStep(stepId) {
    return wizardIndex(stepId) >= 0;
  }

  function nextStepId(stepId) {
    var i = wizardIndex(stepId);
    if (i < 0) return null;
    if (i >= WIZARD_STEPS.length - 1) return 'review_hub';
    return WIZARD_STEPS[i + 1];
  }

  function prevStepId(stepId) {
    if (stepId === 'review_hub') return 'controle';
    var i = wizardIndex(stepId);
    if (i <= 0) return null;
    return WIZARD_STEPS[i - 1];
  }

  function isReviewStatus(status) {
    return !!REVIEW_STATUSES[status];
  }

  /**
   * Server-resume landing: honour saved current_step_id.
   * Review Hub for submitted/approved; changes_requested may resume on saved wizard step.
   */
  function resolveLandingStep(opts) {
    opts = opts || {};
    var status = opts.onboardingStatus || 'not_started';
    var saved = isStepId(opts.currentStepId) ? opts.currentStepId : 'start';

    if (status === 'submitted' || status === 'approved') {
      return 'review_hub';
    }
    if (status === 'changes_requested') {
      if (saved && saved !== 'start' && isStepId(saved)) return saved;
      return 'review_hub';
    }
    if (status === 'not_started') {
      return 'start';
    }
    if (saved === 'review_hub') {
      return 'controle';
    }
    return saved;
  }

  /**
   * Whether the shell may show a step for the given status (V2 + Sprint 7).
   * - in_progress: wizard steps
   * - submitted: Review Hub + polish allowlist (portfolio / verhaal)
   * - changes_requested: wizard + Review Hub (correction mode)
   * - approved: Review Hub only
   */
  function canVisitStep(opts) {
    opts = opts || {};
    var status = opts.onboardingStatus || 'not_started';
    var stepId = opts.stepId;
    if (!isStepId(stepId)) return false;

    if (status === 'approved') {
      return stepId === 'review_hub';
    }
    if (status === 'submitted') {
      return (
        stepId === 'review_hub' ||
        stepId === 'portfolio' ||
        stepId === 'verhaal'
      );
    }
    if (status === 'changes_requested') {
      return isWizardStep(stepId) || stepId === 'review_hub';
    }
    if (status === 'not_started' || status === 'in_progress') {
      return isWizardStep(stepId);
    }
    return false;
  }

  /**
   * Resolve URL/hash request against status + saved step.
   */
  function resolveRouteStep(opts) {
    opts = opts || {};
    var landing = resolveLandingStep(opts);
    var requested = opts.requestedStepId;
    if (requested && canVisitStep({
      onboardingStatus: opts.onboardingStatus,
      stepId: requested
    })) {
      return requested;
    }
    return landing;
  }

  /**
   * Parse step from pathname (/professionals/onboarding/:step), ?step=, or #hash.
   */
  function parseStepFromLocation(loc) {
    loc = loc || {};
    var pathname = String(loc.pathname || '');
    var search = String(loc.search || '');
    var hash = String(loc.hash || '');

    var pathMatch = pathname.match(/\/professionals\/onboarding\/([a-z0-9_]+)\/?$/i);
    if (pathMatch && isStepId(pathMatch[1])) return pathMatch[1];

    var q = search.match(/[?&]step=([a-z0-9_]+)/i);
    if (q && isStepId(q[1])) return q[1];

    var h = hash.replace(/^#\/?/, '');
    if (h.indexOf('step=') === 0) h = h.slice(5);
    if (h && isStepId(h)) return h;

    return null;
  }

  function stepPath(stepId) {
    if (!isStepId(stepId)) return '/professionals/onboarding';
    return '/professionals/onboarding/' + stepId;
  }

  /**
   * Dashboard CTA from onboarding_status (Sprint 2 shell).
   * kinds: start | resume | wait_for_review | changes_requested | approved
   */
  function dashboardCta(opts) {
    opts = opts || {};
    var status = opts.onboardingStatus || 'not_started';
    var href = '/professionals/onboarding';

    if (status === 'not_started') {
      return {
        kind: 'start',
        href: href,
        label: 'Start onboarding',
        hint: 'Richt je bedrijfsprofiel in voor ELYAN.'
      };
    }
    if (status === 'in_progress') {
      return {
        kind: 'resume',
        href: href,
        label: 'Ga verder met onboarding',
        hint: 'Je voortgang is bewaard. Ga verder waar je gebleven was.'
      };
    }
    if (status === 'submitted') {
      return {
        kind: 'wait_for_review',
        href: stepPath('review_hub'),
        label: 'Wacht op review',
        hint: 'Je aanvraag staat bij ELYAN Control. Je kunt de status volgen in Review Hub.'
      };
    }
    if (status === 'changes_requested') {
      return {
        kind: 'changes_requested',
        href: stepPath('review_hub'),
        label: 'Bekijk gevraagde wijzigingen',
        hint: 'ELYAN vroeg om aanpassingen. Open Review Hub om verder te gaan.'
      };
    }
    if (status === 'approved') {
      return {
        kind: 'approved',
        href: stepPath('review_hub'),
        label: 'Onboarding goedgekeurd',
        hint: 'Je onboarding is goedgekeurd. Bekijk de status in Review Hub.'
      };
    }
    return {
      kind: 'start',
      href: href,
      label: 'Naar onboarding',
      hint: ''
    };
  }

  function progressFor(stepId) {
    if (stepId === 'review_hub') {
      return {
        current: STEP_IDS.length,
        total: STEP_IDS.length,
        label: 'Stap 8 van 8',
        percent: 100
      };
    }
    var i = wizardIndex(stepId);
    var n = i >= 0 ? i + 1 : 1;
    var totalWizard = WIZARD_STEPS.length;
    return {
      current: n,
      total: totalWizard,
      label: 'Stap ' + n + ' van ' + totalWizard,
      percent: Math.round((n / totalWizard) * 100)
    };
  }

  function reviewHubCopy(status) {
    if (status === 'submitted') {
      return {
        title: 'Ingediend',
        body: 'ELYAN bereidt jullie profiel voor. Meestal binnen 3 werkdagen horen jullie meer.'
      };
    }
    if (status === 'changes_requested') {
      return {
        title: 'Wijzigingen gevraagd',
        body: 'ELYAN vroeg om aanpassingen. Los de open punten op en dien opnieuw in.'
      };
    }
    if (status === 'approved') {
      return {
        title: 'Goedgekeurd',
        body: 'Jullie onboarding is goedgekeurd. Het marketplace-profiel staat klaar voor publicatie door ELYAN.'
      };
    }
    return {
      title: 'Review Hub',
      body: 'Dit scherm opent automatisch na indienen.'
    };
  }

  var REVIEW_CHECKS = [
    'KBO en bedrijfsgegevens op consistentie',
    'Diensten en richtprijzen',
    'Foto’s en cover',
    'Tekstkwaliteit van jullie verhaal'
  ];

  return {
    STEP_IDS: STEP_IDS,
    STEP_META: STEP_META,
    WIZARD_STEPS: WIZARD_STEPS,
    REVIEW_CHECKS: REVIEW_CHECKS,
    isStepId: isStepId,
    stepIndex: stepIndex,
    wizardIndex: wizardIndex,
    isWizardStep: isWizardStep,
    nextStepId: nextStepId,
    prevStepId: prevStepId,
    isReviewStatus: isReviewStatus,
    resolveLandingStep: resolveLandingStep,
    canVisitStep: canVisitStep,
    resolveRouteStep: resolveRouteStep,
    parseStepFromLocation: parseStepFromLocation,
    stepPath: stepPath,
    dashboardCta: dashboardCta,
    progressFor: progressFor,
    reviewHubCopy: reviewHubCopy
  };
});
