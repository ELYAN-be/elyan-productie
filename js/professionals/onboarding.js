(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanOnboardingShell;
  if (!EP || !Shell) return;

  var statusEl = EP.$('#onboardStatus');
  var shellEl = EP.$('#wizardShell');
  var partnerLabel = EP.$('#partnerLabel');
  var saveStatusEl = EP.$('#saveStatus');
  var progressLabel = EP.$('#progressLabel');
  var stepTitleEl = EP.$('#stepTitle');
  var progressBar = EP.$('#progressBar');
  var progressFill = EP.$('#progressFill');
  var stepDots = EP.$('#stepDots');
  var backBtn = EP.$('#backBtn');
  var nextBtn = EP.$('#nextBtn');
  var reviewHubTitle = EP.$('#reviewHubTitle');
  var reviewHubBody = EP.$('#reviewHubBody');

  var state = {
    partnerId: null,
    role: null,
    canEdit: false,
    onboardingStatus: 'not_started',
    currentStepId: 'start',
    version: 1,
    saving: false,
    dirtySave: false
  };

  EP.$('#logoutBtn').addEventListener('click', function () {
    EP.logout();
  });

  function setSaveUi(kind, message) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = message || '';
    saveStatusEl.className = 'prof-save-status' + (kind ? ' is-' + kind : '');
  }

  function renderDots(activeId) {
    if (!stepDots) return;
    stepDots.innerHTML = '';
    Shell.STEP_IDS.forEach(function (id) {
      var li = document.createElement('li');
      li.className = 'prof-step-dot';
      if (id === activeId) li.className += ' is-active';
      if (Shell.isReviewStatus(state.onboardingStatus) && id === 'review_hub') {
        li.className += ' is-active';
      }
      var meta = Shell.STEP_META[id];
      li.title = meta ? meta.title : id;
      stepDots.appendChild(li);
    });
  }

  function showStep(stepId) {
    var panels = document.querySelectorAll('.prof-step-panel');
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-step') !== stepId;
    });

    var meta = Shell.STEP_META[stepId] || Shell.STEP_META.start;
    var progress = Shell.progressFor(stepId);
    if (progressLabel) progressLabel.textContent = progress.label;
    if (stepTitleEl) stepTitleEl.textContent = meta.title;
    if (progressFill) progressFill.style.width = progress.percent + '%';
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', String(meta.p));
      progressBar.setAttribute('aria-valuemax', '8');
    }
    renderDots(stepId);

    if (stepId === 'review_hub') {
      var copy = Shell.reviewHubCopy(state.onboardingStatus);
      if (reviewHubTitle) reviewHubTitle.textContent = copy.title;
      if (reviewHubBody) reviewHubBody.textContent = copy.body;
    }

    var reviewLocked = Shell.isReviewStatus(state.onboardingStatus);
    var prev = Shell.prevStepId(stepId);
    var next = Shell.nextStepId(stepId);

    if (backBtn) {
      backBtn.hidden = reviewLocked || !prev;
      backBtn.disabled = reviewLocked || !prev;
    }
    if (nextBtn) {
      if (reviewLocked || stepId === 'controle' || stepId === 'review_hub') {
        nextBtn.hidden = true;
      } else {
        nextBtn.hidden = false;
        nextBtn.disabled = !next;
        nextBtn.textContent = 'Volgende';
      }
    }

    state.currentStepId = stepId;
    syncUrl(stepId);
  }

  function syncUrl(stepId) {
    try {
      var path = Shell.stepPath(stepId);
      if (location.pathname + (location.search || '') !== path) {
        history.replaceState({ step: stepId }, '', path);
      }
    } catch (e) {
      /* ignore history errors */
    }
  }

  function applyPayload(payload) {
    state.partnerId = payload.partnerId;
    state.role = payload.role;
    state.canEdit = !!payload.canEdit;
    state.onboardingStatus = payload.onboardingStatus || payload.onboarding && payload.onboarding.onboardingStatus;
    state.version = payload.version;
    if (payload.currentStepId) {
      state.currentStepId = payload.currentStepId;
    }
  }

  async function saveStep(stepId) {
    if (!state.canEdit) {
      setSaveUi('ok', 'Alleen-lezen');
      return { ok: true, skipped: true };
    }
    if (state.saving) {
      state.dirtySave = true;
      return { ok: true, queued: true };
    }
    state.saving = true;
    setSaveUi('saving', 'Opslaan…');
    try {
      var res = await EP.apiFetch('onboarding-save', {
        method: 'POST',
        body: {
          partnerId: state.partnerId,
          currentStepId: stepId,
          version: state.version
        }
      });
      if (!res.ok || !res.body || !res.body.ok) {
        var code = res.body && res.body.error;
        if (code === 'version_conflict' && res.body.currentVersion) {
          state.version = res.body.currentVersion;
          setSaveUi('error', 'Conflict — opnieuw proberen…');
          state.saving = false;
          return saveStep(stepId);
        }
        setSaveUi('error', (res.body && res.body.message) || 'Opslaan mislukt');
        return { ok: false, body: res.body };
      }
      applyPayload(res.body);
      setSaveUi('ok', 'Alles opgeslagen');
      return { ok: true, body: res.body };
    } catch (err) {
      setSaveUi('error', err.message || 'Opslaan mislukt');
      return { ok: false, error: err };
    } finally {
      state.saving = false;
      if (state.dirtySave) {
        state.dirtySave = false;
        saveStep(state.currentStepId);
      }
    }
  }

  async function goToStep(stepId, opts) {
    opts = opts || {};
    if (!Shell.canVisitStep({
      onboardingStatus: state.onboardingStatus,
      stepId: stepId
    })) {
      stepId = Shell.resolveLandingStep({
        onboardingStatus: state.onboardingStatus,
        currentStepId: state.currentStepId
      });
    }
    showStep(stepId);
    if (opts.persist !== false) {
      await saveStep(stepId);
      // After first save, status may become in_progress — refresh nav rules
      showStep(stepId);
    }
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      var prev = Shell.prevStepId(state.currentStepId);
      if (prev) goToStep(prev);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var next = Shell.nextStepId(state.currentStepId);
      if (next && next !== 'review_hub') goToStep(next);
      else if (next === 'review_hub') {
        // Sprint 2: controle is last wizard screen — no submit yet
        goToStep('controle', { persist: true });
      }
    });
  }

  window.addEventListener('popstate', function () {
    var requested = Shell.parseStepFromLocation(location);
    var step = Shell.resolveRouteStep({
      onboardingStatus: state.onboardingStatus,
      currentStepId: state.currentStepId,
      requestedStepId: requested
    });
    showStep(step);
  });

  EP.requireSessionOrRedirect().then(async function (session) {
    if (!session) return;
    if (session.noMembership) {
      EP.showEl(shellEl, false);
      EP.setStatus(statusEl, 'Geen actief partnerlidmaatschap gevonden.', 'error');
      setSaveUi('', '');
      return;
    }
    if (session.error) {
      EP.showEl(shellEl, false);
      EP.setStatus(statusEl, (session.error && session.error.message) || 'Kon sessie niet laden.', 'error');
      return;
    }

    var membership = session.memberships[0];
    partnerLabel.textContent = membership.partner.displayName;
    state.partnerId = membership.partnerId || membership.partner.id;
    state.role = membership.role;

    var onboardRes = await EP.apiFetch('onboarding', {
      method: 'GET',
      query: { partnerId: state.partnerId }
    });
    if (onboardRes.status === 401) {
      location.replace('/professionals/login?next=' + encodeURIComponent(location.pathname));
      return;
    }
    if (onboardRes.status === 403) {
      EP.showEl(shellEl, false);
      EP.setStatus(statusEl, (onboardRes.body && onboardRes.body.message) || 'Geen toegang tot onboarding.', 'error');
      return;
    }
    if (!onboardRes.ok || !onboardRes.body || !onboardRes.body.ok) {
      EP.showEl(shellEl, false);
      EP.setStatus(statusEl, (onboardRes.body && onboardRes.body.message) || 'Onboarding laden mislukt.', 'error');
      return;
    }

    applyPayload(onboardRes.body);
    EP.showEl(shellEl, true);
    EP.setStatus(statusEl, '', '');

    if (!state.canEdit) {
      setSaveUi('ok', 'Alleen-lezen');
    } else {
      setSaveUi('ok', 'Alles opgeslagen');
    }

    var requested = Shell.parseStepFromLocation(location);
    var landing = Shell.resolveRouteStep({
      onboardingStatus: state.onboardingStatus,
      currentStepId: state.currentStepId || onboardRes.body.currentStepId,
      requestedStepId: requested
    });
    showStep(landing);

    // Persist resume landing when editable and step differs from server
    if (
      state.canEdit &&
      landing &&
      landing !== onboardRes.body.currentStepId &&
      !Shell.isReviewStatus(state.onboardingStatus)
    ) {
      await saveStep(landing);
    }
  }).catch(function (err) {
    EP.showEl(shellEl, false);
    EP.setStatus(statusEl, err.message || 'Er ging iets mis.', 'error');
  });
})();
