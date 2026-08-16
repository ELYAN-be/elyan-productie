(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanOnboardingShell;
  var Draft = window.ElyanOnboardingDraft;
  if (!EP || !Shell || !Draft) return;

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
  var startProfileBtn = EP.$('#startProfileBtn');
  var reviewHubTitle = EP.$('#reviewHubTitle');
  var reviewHubBody = EP.$('#reviewHubBody');
  var p2Form = EP.$('#p2Form');

  var state = {
    partnerId: null,
    role: null,
    canEdit: false,
    partnerDisplayName: '',
    partnerLegalName: '',
    onboardingStatus: 'not_started',
    currentStepId: 'start',
    version: 1,
    draft: {},
    saving: false,
    dirtySave: false,
    saveTimer: null,
    publicTextTouched: false,
    btwPlichtig: null,
    areaMode: '',
    provinces: [],
    regions: []
  };

  EP.$('#logoutBtn').addEventListener('click', function () {
    EP.logout();
  });

  function setSaveUi(kind, message) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = message || '';
    saveStatusEl.className = 'prof-save-status' + (kind ? ' is-' + kind : '');
  }

  function fillSelect(el, options, includeBlank) {
    if (!el) return;
    el.innerHTML = '';
    if (includeBlank) {
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Kies…';
      el.appendChild(blank);
    }
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      el.appendChild(opt);
    });
  }

  function initStaticControls() {
    fillSelect(EP.$('#f_rechtsvorm'), Draft.RECHTSVORMEN, true);
    fillSelect(EP.$('#f_gewest'), Draft.GEWESTEN, true);
    fillSelect(EP.$('#f_language'), Draft.LANGUAGES, false);

    var modeGrid = EP.$('#areaModeGrid');
    if (modeGrid) {
      modeGrid.innerHTML = Draft.AREA_MODES.map(function (m) {
        return '<button type="button" class="lab-choice" data-area-mode="' + m.id + '">' + m.label + '</button>';
      }).join('');
    }
    var provGrid = EP.$('#provincesGrid');
    if (provGrid) {
      provGrid.innerHTML = Draft.PROVINCES.map(function (p) {
        return '<button type="button" class="lab-choice" data-province="' + p.id + '">' + p.label + '</button>';
      }).join('');
    }
    var regGrid = EP.$('#regionsGrid');
    if (regGrid) {
      regGrid.innerHTML = Draft.GEWESTEN.map(function (g) {
        return '<button type="button" class="lab-choice" data-region="' + g.id + '">' + g.label + '</button>';
      }).join('');
    }
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

  function updateLivingPreview() {
    var company = Draft.pickCompany(state.draft.company);
    var area = Draft.pickServiceArea(state.draft.service_area);
    var model = Draft.previewModel({
      company: company,
      service_area: area,
      fallbackName: state.partnerDisplayName
    });
    ['previewName', 'previewNameP2'].forEach(function (id) {
      var el = EP.$('#' + id);
      if (el) el.textContent = model.displayName;
    });
    ['previewMeta', 'previewMetaP2'].forEach(function (id) {
      var el = EP.$('#' + id);
      if (el) el.textContent = model.locationLine;
    });
    ['previewArea', 'previewAreaP2'].forEach(function (id) {
      var el = EP.$('#' + id);
      if (el) el.textContent = model.areaText;
    });
    var hint = EP.$('#previewHint');
    if (hint) hint.textContent = model.specialtyHint;
  }

  function setFieldError(key, message) {
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function clearFieldErrors() {
    document.querySelectorAll('[data-error-for]').forEach(function (el) {
      el.textContent = '';
      el.hidden = true;
    });
  }

  function showFieldErrors(errors) {
    clearFieldErrors();
    Object.keys(errors || {}).forEach(function (k) {
      setFieldError(k, errors[k]);
    });
  }

  function syncAreaModeUi() {
    var mode = state.areaMode;
    document.querySelectorAll('[data-area-mode]').forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.getAttribute('data-area-mode') === mode);
    });
    var radiusWrap = EP.$('#radiusWrap');
    var provincesWrap = EP.$('#provincesWrap');
    var regionsWrap = EP.$('#regionsWrap');
    if (radiusWrap) radiusWrap.hidden = mode !== 'radius';
    if (provincesWrap) provincesWrap.hidden = mode !== 'provincies';
    if (regionsWrap) regionsWrap.hidden = mode !== 'gewest';

    document.querySelectorAll('[data-province]').forEach(function (btn) {
      var id = btn.getAttribute('data-province');
      btn.classList.toggle('is-selected', state.provinces.indexOf(id) >= 0);
    });
    document.querySelectorAll('[data-region]').forEach(function (btn) {
      var id = btn.getAttribute('data-region');
      btn.classList.toggle('is-selected', state.regions.indexOf(id) >= 0);
    });
  }

  function syncBtwUi() {
    document.querySelectorAll('#btwSeg [data-btw]').forEach(function (btn) {
      var v = btn.getAttribute('data-btw') === 'true';
      btn.classList.toggle('is-active', state.btwPlichtig === v);
    });
    var wrap = EP.$('#btwNumberWrap');
    if (wrap) wrap.hidden = state.btwPlichtig !== true;
  }

  function setFormReadOnly(ro) {
    if (!p2Form) return;
    p2Form.querySelectorAll('input, select, textarea, button').forEach(function (el) {
      if (el.closest && el.closest('.prof-wizard-nav')) return;
      if (el.tagName === 'BUTTON') el.disabled = ro;
      else el.readOnly = ro;
      if (el.tagName === 'SELECT' || el.type === 'number' || el.type === 'checkbox') el.disabled = ro;
    });
    document.querySelectorAll('#btwSeg button, #areaModeGrid button, #provincesGrid button, #regionsGrid button').forEach(function (b) {
      b.disabled = ro;
    });
    if (startProfileBtn) startProfileBtn.disabled = ro;
  }

  function hydrateP2Form() {
    var company = Draft.pickCompany(state.draft.company);
    var area = Draft.pickServiceArea(state.draft.service_area);

    if (!company.legal_name && state.partnerLegalName) company.legal_name = state.partnerLegalName;
    if (!company.display_name && state.partnerDisplayName) company.display_name = state.partnerDisplayName;
    if (!company.language) company.language = 'nl-BE';

    var map = {
      legal_name: '#f_legal_name',
      display_name: '#f_display_name',
      rechtsvorm: '#f_rechtsvorm',
      kbo: '#f_kbo',
      btw_nummer: '#f_btw_nummer',
      adres: '#f_adres',
      postcode: '#f_postcode',
      gemeente: '#f_gemeente',
      gewest: '#f_gewest',
      website: '#f_website',
      email: '#f_email',
      phone: '#f_phone',
      contact_name: '#f_contact_name',
      contact_role: '#f_contact_role',
      language: '#f_language'
    };
    Object.keys(map).forEach(function (k) {
      var el = EP.$(map[k]);
      if (!el) return;
      var val = company[k] == null ? '' : company[k];
      if (k === 'kbo' && val) val = Draft.formatKboDisplay(val);
      if (k === 'btw_nummer' && val) val = Draft.formatKboDisplay(val);
      if (k === 'phone' && val) val = Draft.formatPhoneDisplay(val);
      el.value = val;
    });

    state.btwPlichtig = company.btw_plichtig === true || company.btw_plichtig === false
      ? company.btw_plichtig
      : null;
    state.areaMode = area.mode || '';
    state.provinces = (area.provinces || []).slice();
    state.regions = (area.regions || []).slice();
    state.publicTextTouched = !!(area.public_text && String(area.public_text).trim());

    var radiusEl = EP.$('#f_radius_km');
    if (radiusEl) radiusEl.value = area.radius_km != null ? area.radius_km : '';
    var pub = EP.$('#f_public_text');
    if (pub) pub.value = area.public_text || '';
    var excl = EP.$('#f_exclusions');
    if (excl) excl.value = area.exclusions || '';

    syncBtwUi();
    syncAreaModeUi();
    maybeSuggestPublicText();
    updateLivingPreview();
  }

  function collectP2Draft() {
    var company = {
      legal_name: (EP.$('#f_legal_name') || {}).value || '',
      display_name: (EP.$('#f_display_name') || {}).value || '',
      rechtsvorm: (EP.$('#f_rechtsvorm') || {}).value || '',
      kbo: (EP.$('#f_kbo') || {}).value || '',
      btw_plichtig: state.btwPlichtig,
      btw_nummer: state.btwPlichtig === true ? ((EP.$('#f_btw_nummer') || {}).value || '') : '',
      adres: (EP.$('#f_adres') || {}).value || '',
      postcode: (EP.$('#f_postcode') || {}).value || '',
      gemeente: (EP.$('#f_gemeente') || {}).value || '',
      gewest: (EP.$('#f_gewest') || {}).value || '',
      website: (EP.$('#f_website') || {}).value || '',
      email: (EP.$('#f_email') || {}).value || '',
      phone: (EP.$('#f_phone') || {}).value || '',
      contact_name: (EP.$('#f_contact_name') || {}).value || '',
      contact_role: (EP.$('#f_contact_role') || {}).value || '',
      language: (EP.$('#f_language') || {}).value || 'nl-BE'
    };
    var radiusRaw = (EP.$('#f_radius_km') || {}).value;
    var area = {
      mode: state.areaMode || '',
      radius_km: state.areaMode === 'radius' && radiusRaw !== '' && radiusRaw != null
        ? Number(radiusRaw)
        : null,
      provinces: state.areaMode === 'provincies' ? state.provinces.slice() : [],
      regions: state.areaMode === 'gewest' ? state.regions.slice() : [],
      public_text: (EP.$('#f_public_text') || {}).value || '',
      exclusions: (EP.$('#f_exclusions') || {}).value || ''
    };
    return { company: company, service_area: area };
  }

  function maybeSuggestPublicText() {
    if (state.publicTextTouched) return;
    var pub = EP.$('#f_public_text');
    if (!pub) return;
    var draft = collectP2Draft();
    var suggestion = Draft.suggestPublicText(draft.company, draft.service_area);
    if (suggestion && suggestion !== 'jullie regio') {
      pub.value = suggestion.slice(0, 80);
    }
  }

  function applyLocalDraft(patch) {
    state.draft = Draft.pickCompany && state.draft
      ? Object.assign({}, state.draft, patch)
      : Object.assign({}, state.draft, patch);
    if (patch.company) {
      state.draft.company = Object.assign({}, state.draft.company || {}, patch.company);
    }
    if (patch.service_area) {
      state.draft.service_area = Object.assign({}, state.draft.service_area || {}, patch.service_area);
    }
    updateLivingPreview();
  }

  function scheduleAutosave() {
    if (!state.canEdit) return;
    if (state.currentStepId !== 'bedrijf_bereik' && state.currentStepId !== 'start') return;
    applyLocalDraft(collectP2Draft());
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      saveStep(state.currentStepId, { draft: collectP2Draft() });
    }, 700);
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

    if (stepId === 'bedrijf_bereik') {
      hydrateP2Form();
    } else {
      updateLivingPreview();
    }

    var reviewLocked = Shell.isReviewStatus(state.onboardingStatus);
    var prev = Shell.prevStepId(stepId);
    var next = Shell.nextStepId(stepId);

    if (backBtn) {
      backBtn.hidden = reviewLocked || !prev;
      backBtn.disabled = reviewLocked || !prev;
    }
    if (nextBtn) {
      if (reviewLocked || stepId === 'controle' || stepId === 'review_hub' || stepId === 'start') {
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
    if (payload.draft && typeof payload.draft === 'object') {
      state.draft = payload.draft;
    } else if (payload.onboarding && payload.onboarding.draft) {
      state.draft = payload.onboarding.draft;
    }
  }

  async function saveStep(stepId, opts) {
    opts = opts || {};
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
      var body = {
        partnerId: state.partnerId,
        currentStepId: stepId,
        version: state.version
      };
      if (opts.draft) {
        body.draft = opts.draft;
      } else if (stepId === 'bedrijf_bereik') {
        body.draft = collectP2Draft();
      }
      var res = await EP.apiFetch('onboarding-save', {
        method: 'POST',
        body: body
      });
      if (!res.ok || !res.body || !res.body.ok) {
        var code = res.body && res.body.error;
        if (code === 'version_conflict' && res.body.currentVersion) {
          state.version = res.body.currentVersion;
          setSaveUi('error', 'Conflict — opnieuw proberen…');
          state.saving = false;
          return saveStep(stepId, opts);
        }
        setSaveUi('error', (res.body && (res.body.message || res.body.detail)) || 'Opslaan mislukt');
        return { ok: false, body: res.body };
      }
      applyPayload(res.body);
      setSaveUi('ok', 'Alles opgeslagen');
      updateLivingPreview();
      return { ok: true, body: res.body };
    } catch (err) {
      setSaveUi('error', err.message || 'Opslaan mislukt');
      return { ok: false, error: err };
    } finally {
      state.saving = false;
      if (state.dirtySave) {
        state.dirtySave = false;
        saveStep(state.currentStepId, { draft: collectP2Draft() });
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
      var draft = opts.draft;
      if (!draft && (stepId === 'bedrijf_bereik' || state.currentStepId === 'bedrijf_bereik')) {
        draft = collectP2Draft();
      }
      await saveStep(stepId, { draft: draft });
      showStep(stepId);
    }
  }

  if (startProfileBtn) {
    startProfileBtn.addEventListener('click', function () {
      if (!state.canEdit) return;
      goToStep('bedrijf_bereik', { persist: true });
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      var prev = Shell.prevStepId(state.currentStepId);
      if (prev) goToStep(prev);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (state.currentStepId === 'bedrijf_bereik') {
        var draft = collectP2Draft();
        var check = Draft.validateP2Complete(draft);
        if (!check.ok) {
          showFieldErrors(check.errors);
          setSaveUi('error', 'Controleer de gemarkeerde velden.');
          return;
        }
        clearFieldErrors();
        applyLocalDraft(draft);
        var next = Shell.nextStepId(state.currentStepId);
        if (next && next !== 'review_hub') goToStep(next, { draft: draft });
        return;
      }
      var nextStep = Shell.nextStepId(state.currentStepId);
      if (nextStep && nextStep !== 'review_hub') goToStep(nextStep);
      else if (nextStep === 'review_hub') {
        goToStep('controle', { persist: true });
      }
    });
  }

  if (p2Form) {
    p2Form.addEventListener('input', function (ev) {
      if (!state.canEdit) return;
      if (ev.target && ev.target.id === 'f_public_text') {
        state.publicTextTouched = true;
      }
      if (ev.target && (ev.target.id === 'f_gemeente' || ev.target.id === 'f_radius_km' || ev.target.id === 'f_display_name')) {
        maybeSuggestPublicText();
      }
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
    });
    p2Form.addEventListener('change', function () {
      if (!state.canEdit) return;
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
    });
    p2Form.addEventListener('blur', function (ev) {
      if (!ev.target || !state.canEdit) return;
      var id = ev.target.id;
      if (id === 'f_kbo') {
        var k = Draft.validateKbo(ev.target.value);
        if (k.ok && k.value) ev.target.value = Draft.formatKboDisplay(k.value);
        setFieldError('kbo', k.ok || k.empty ? '' : k.message);
      }
      if (id === 'f_btw_nummer') {
        var b = Draft.validateBtwNumber(ev.target.value, { required: false });
        if (b.ok && b.value) ev.target.value = Draft.formatKboDisplay(b.value);
        setFieldError('btw_nummer', b.ok || b.empty ? '' : b.message);
      }
      if (id === 'f_phone') {
        var ph = Draft.validatePhone(ev.target.value);
        if (ph.ok && ph.value) ev.target.value = Draft.formatPhoneDisplay(ph.value);
        setFieldError('phone', ph.ok || ph.empty ? '' : ph.message);
      }
      if (id === 'f_postcode') {
        var pc = Draft.validatePostcode(ev.target.value);
        setFieldError('postcode', pc.ok || pc.empty ? '' : pc.message);
      }
      if (id === 'f_email') {
        var em = Draft.validateEmail(ev.target.value);
        setFieldError('email', em.ok || em.empty ? '' : em.message);
      }
    }, true);
  }

  var btwSeg = EP.$('#btwSeg');
  if (btwSeg) {
    btwSeg.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-btw]');
      if (!btn || !state.canEdit) return;
      state.btwPlichtig = btn.getAttribute('data-btw') === 'true';
      syncBtwUi();
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
    });
  }

  var areaModeGrid = EP.$('#areaModeGrid');
  if (areaModeGrid) {
    areaModeGrid.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-area-mode]');
      if (!btn || !state.canEdit) return;
      state.areaMode = btn.getAttribute('data-area-mode');
      if (state.areaMode !== 'provincies') state.provinces = [];
      if (state.areaMode !== 'gewest') state.regions = [];
      syncAreaModeUi();
      maybeSuggestPublicText();
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
    });
  }

  var provincesGrid = EP.$('#provincesGrid');
  if (provincesGrid) {
    provincesGrid.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-province]');
      if (!btn || !state.canEdit) return;
      var id = btn.getAttribute('data-province');
      var i = state.provinces.indexOf(id);
      if (i >= 0) state.provinces.splice(i, 1);
      else state.provinces.push(id);
      syncAreaModeUi();
      maybeSuggestPublicText();
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
    });
  }

  var regionsGrid = EP.$('#regionsGrid');
  if (regionsGrid) {
    regionsGrid.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-region]');
      if (!btn || !state.canEdit) return;
      var id = btn.getAttribute('data-region');
      var i = state.regions.indexOf(id);
      if (i >= 0) state.regions.splice(i, 1);
      else state.regions.push(id);
      syncAreaModeUi();
      maybeSuggestPublicText();
      applyLocalDraft(collectP2Draft());
      scheduleAutosave();
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

  initStaticControls();

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
    state.partnerDisplayName = membership.partner.displayName || '';
    state.partnerLegalName = membership.partner.legalName || '';
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
    setFormReadOnly(!state.canEdit);

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

    if (
      state.canEdit &&
      landing &&
      landing !== onboardRes.body.currentStepId &&
      !Shell.isReviewStatus(state.onboardingStatus)
    ) {
      await saveStep(landing, landing === 'bedrijf_bereik' ? { draft: collectP2Draft() } : {});
    }
  }).catch(function (err) {
    EP.showEl(shellEl, false);
    EP.setStatus(statusEl, err.message || 'Er ging iets mis.', 'error');
  });
})();
