(function () {
  'use strict';

  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanOnboardingShell;
  var Draft = window.ElyanOnboardingDraft;
  var Portfolio = window.ElyanOnboardingPortfolio;
  if (!EP || !Shell || !Draft || !Portfolio) return;

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
  var p3Form = EP.$('#p3Form');
  var p4Form = EP.$('#p4Form');
  var p5Form = EP.$('#p5Form');

  var state = {
    partnerId: null,
    role: null,
    canEdit: false,
    canSubmit: false,
    canResubmit: false,
    partnerDisplayName: '',
    partnerLegalName: '',
    onboardingStatus: 'not_started',
    currentStepId: 'start',
    version: 1,
    draft: {},
    saving: false,
    submitting: false,
    dirtySave: false,
    saveTimer: null,
    publicTextTouched: false,
    btwPlichtig: null,
    areaMode: '',
    provinces: [],
    regions: [],
    craft: Draft.emptyCraft(),
    offer: Draft.emptyOffer(),
    story: Draft.emptyStory(),
    confirmations: Draft.emptyConfirmations(),
    assets: [],
    coverAssetId: null,
    pendingUploads: {},
    dragAssetId: null,
    reviewItems: [],
    profileStrength: null,
    profileStatus: null
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
    var craft = Draft.pickCraft(state.draft.craft || state.craft);
    var model = Draft.previewModel({
      company: company,
      service_area: area,
      craft: craft,
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
    if (p2Form) {
      p2Form.querySelectorAll('input, select, textarea, button').forEach(function (el) {
        if (el.closest && el.closest('.prof-wizard-nav')) return;
        if (el.tagName === 'BUTTON') el.disabled = ro;
        else el.readOnly = ro;
        if (el.tagName === 'SELECT' || el.type === 'number' || el.type === 'checkbox') el.disabled = ro;
      });
    }
    document.querySelectorAll('#btwSeg button, #areaModeGrid button, #provincesGrid button, #regionsGrid button').forEach(function (b) {
      b.disabled = ro;
    });
    if (p3Form) {
      p3Form.querySelectorAll('input, select, textarea, button').forEach(function (el) {
        if (el.tagName === 'BUTTON') el.disabled = ro;
        else el.readOnly = ro;
        if (el.tagName === 'SELECT' || el.type === 'number' || el.type === 'checkbox') el.disabled = ro;
      });
    }
    document.querySelectorAll('#categoryGrid button, #servicesGrid button, #conditionalsHost button, #extrasHost button').forEach(function (b) {
      b.disabled = ro;
    });
    if (p4Form) {
      p4Form.querySelectorAll('input, select, textarea, button').forEach(function (el) {
        if (el.tagName === 'BUTTON') el.disabled = ro;
        else el.readOnly = ro;
        if (el.tagName === 'SELECT' || el.type === 'number' || el.type === 'checkbox') el.disabled = ro;
      });
    }
    document.querySelectorAll(
      '#vatBasisGrid button, #clientTypesGrid button, #responseTimeGrid button, #urgencyGrid button, #capacityGrid button, #visitSpeedGrid button, #visitExtraGrid button, #servicePricesHost button'
    ).forEach(function (b) {
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

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStrength(el, strength) {
    if (!el) return;
    if (!strength) {
      el.innerHTML = '';
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML =
      '<p class="prof-strength-level">Profielsterkte: ' + escapeHtml(strength.level) +
      (strength.score != null ? ' · ' + strength.score + '%' : '') + '</p>' +
      '<p class="prof-strength-tip">' + escapeHtml(strength.tip || '') + '</p>';
  }

  function renderControlePanel() {
    var sectionsEl = EP.$('#controleSections');
    var missingWrap = EP.$('#controleMissing');
    var missingList = EP.$('#controleMissingList');
    var submitBtn = EP.$('#submitOnboardingBtn');
    var submitHint = EP.$('#submitHint');
    var banner = EP.$('#controleChangesBanner');
    var conf = Draft.pickConfirmations(state.draft.confirmations || state.confirmations);
    state.confirmations = conf;

    var dataCb = EP.$('#f_data_correct');
    var editCb = EP.$('#f_editorial_ok');
    if (dataCb) dataCb.checked = !!conf.data_correct;
    if (editCb) editCb.checked = !!conf.editorial_ok;

    var gates = Draft.evaluateSubmitGates(
      Object.assign({}, state.draft, { confirmations: conf })
    );
    var sections = Draft.buildControleSections(
      Object.assign({}, state.draft, { confirmations: conf }),
      state.assets
    );
    renderStrength(EP.$('#controleStrength'), Draft.evaluateProfileStrength(state.draft, state.assets));

    if (sectionsEl) {
      sectionsEl.innerHTML = sections.map(function (sec) {
        var missHtml = (sec.missing || [])
          .map(function (m) {
            return (
              '<li><a href="' + escapeHtml(m.href) +
              '" data-deep-step="' + escapeHtml(m.stepId) +
              '" data-deep-field="' + escapeHtml(m.fieldKey || '') + '">' +
              escapeHtml(m.message) + '</a></li>'
            );
          })
          .join('');
        return (
          '<article class="prof-summary-card' + (sec.ok ? '' : ' is-incomplete') + '">' +
          '<div class="prof-summary-head"><h3>' + escapeHtml(sec.title) + '</h3>' +
          '<button type="button" class="btn" data-edit-step="' + escapeHtml(sec.stepId) + '"' +
          (state.canEdit ? '' : ' disabled') + '>Aanpassen</button></div>' +
          '<ul class="prof-summary-lines">' +
          (sec.lines || []).map(function (line) {
            return '<li>' + escapeHtml(line) + '</li>';
          }).join('') +
          '</ul>' +
          (missHtml ? '<ul class="prof-summary-missing">' + missHtml + '</ul>' : '') +
          '</article>'
        );
      }).join('');
    }

    var gateMissing = (gates.missing || []).filter(function (m) {
      return m.stepId !== 'controle';
    });
    if (missingWrap && missingList) {
      if (gateMissing.length) {
        missingWrap.hidden = false;
        missingList.innerHTML = gateMissing.map(function (m) {
          return (
            '<li><a href="' + escapeHtml(m.href) +
            '" data-deep-step="' + escapeHtml(m.stepId) +
            '" data-deep-field="' + escapeHtml(m.fieldKey || '') + '">' +
            escapeHtml(m.message) + '</a></li>'
          );
        }).join('');
      } else {
        missingWrap.hidden = true;
        missingList.innerHTML = '';
      }
    }

    if (banner) {
      if (state.onboardingStatus === 'changes_requested') {
        var openCount = (state.reviewItems || []).filter(function (r) {
          return r.status === 'open';
        }).length;
        banner.hidden = false;
        banner.textContent = openCount > 0
          ? 'ELYAN vroeg om aanpassingen (' + openCount + ' open). Corrigeer de punten en dien opnieuw in.'
          : 'ELYAN vroeg om aanpassingen. Controleer jullie gegevens en dien opnieuw in.';
      } else {
        banner.hidden = true;
        banner.textContent = '';
      }
    }

    var isResubmit = state.onboardingStatus === 'changes_requested';
    var maySubmit = state.canEdit && !state.submitting &&
      ((isResubmit && state.canResubmit) || (!isResubmit && state.canSubmit));
    if (submitBtn) {
      submitBtn.textContent = isResubmit ? 'Opnieuw indienen' : 'Indienen bij ELYAN';
      submitBtn.disabled = !maySubmit || !gates.ok || state.submitting;
    }
    if (submitHint) {
      if (state.submitting) submitHint.textContent = 'Bezig met indienen…';
      else if (!state.canEdit) submitHint.textContent = 'Alleen-lezen: indienen niet beschikbaar.';
      else if (!gates.ok) submitHint.textContent = 'Los de ontbrekende punten op om in te dienen.';
      else {
        submitHint.textContent = isResubmit
          ? 'Alles staat klaar om opnieuw in te dienen.'
          : 'Alles staat klaar om in te dienen bij ELYAN.';
      }
    }

    var fieldset = EP.$('#controleConfirmFieldset');
    if (fieldset) {
      fieldset.querySelectorAll('input').forEach(function (el) {
        el.disabled = !state.canEdit || state.submitting;
      });
    }
  }

  function openReviewItems() {
    return (state.reviewItems || []).filter(function (r) {
      return r.status === 'open';
    });
  }

  function renderReviewHubPanel() {
    var copy = Shell.reviewHubCopy(state.onboardingStatus);
    if (reviewHubTitle) reviewHubTitle.textContent = copy.title;
    if (reviewHubBody) reviewHubBody.textContent = copy.body;

    var statusText = EP.$('#reviewStatusText');
    var banner = EP.$('#reviewHubBanner');
    var checks = EP.$('#reviewChecksList');
    var openWrap = EP.$('#reviewOpenItems');
    var openList = EP.$('#reviewOpenItemsList');
    var google = EP.$('#reviewGoogleTeaser');
    var polish = EP.$('#reviewPolishActions');
    var tipsEl = EP.$('#reviewPolishTips');

    var statusMap = {
      submitted: 'Ingediend',
      changes_requested: 'Wijzigingen gevraagd',
      approved: 'Goedgekeurd'
    };
    if (statusText) statusText.textContent = statusMap[state.onboardingStatus] || copy.title;

    if (banner) {
      if (state.onboardingStatus === 'changes_requested') {
        banner.hidden = false;
        banner.className = 'prof-banner prof-banner-warn';
        banner.textContent = 'Er zijn open aanpassingen. Corrigeer ze en dien opnieuw in via Controle.';
      } else if (state.onboardingStatus === 'approved') {
        banner.hidden = false;
        banner.className = 'prof-banner prof-banner-ok';
        banner.textContent = state.profileStatus === 'ready'
          ? 'Goedgekeurd — jullie profielstatus is klaar voor publicatie door ELYAN.'
          : 'Goedgekeurd — ELYAN zet jullie profiel verder klaar.';
      } else if (state.onboardingStatus === 'submitted') {
        banner.hidden = false;
        banner.className = 'prof-banner prof-banner-ok';
        banner.textContent = 'Ingediend — ELYAN bereidt jullie profiel voor (meestal binnen 3 werkdagen).';
      } else {
        banner.hidden = true;
      }
    }

    if (checks) {
      checks.innerHTML = (Shell.REVIEW_CHECKS || []).map(function (c) {
        return '<li>' + escapeHtml(c) + '</li>';
      }).join('');
    }

    var open = openReviewItems();
    if (openWrap && openList) {
      if (state.onboardingStatus === 'changes_requested' && open.length) {
        openWrap.hidden = false;
        openList.innerHTML = open.map(function (item) {
          var stepId = item.stepId || Draft.stepIdForField(item.fieldKey);
          var href = Draft.deepLinkFor(stepId, item.fieldKey);
          return (
            '<li><a href="' + escapeHtml(href) +
            '" data-deep-step="' + escapeHtml(stepId) +
            '" data-deep-field="' + escapeHtml(item.fieldKey || '') + '">' +
            escapeHtml(item.message || 'Aanpassing gevraagd') + '</a></li>'
          );
        }).join('');
      } else {
        openWrap.hidden = true;
        openList.innerHTML = '';
      }
    }

    var strength = state.profileStrength || Draft.evaluateProfileStrength(state.draft, state.assets);
    renderStrength(EP.$('#reviewStrength'), strength);
    if (tipsEl) {
      var tips = (strength && strength.tips) || [];
      tipsEl.innerHTML = tips.length
        ? '<h3>Concrete tips</h3><ul>' +
          tips.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') +
          '</ul>'
        : '';
    }

    if (google) {
      google.hidden = !(state.onboardingStatus === 'approved' || state.profileStatus === 'ready');
    }
    if (polish) {
      polish.hidden = !(state.canEdit &&
        (state.onboardingStatus === 'submitted' || state.onboardingStatus === 'changes_requested'));
    }

    var model = Draft.previewModel({
      company: state.draft.company,
      service_area: state.draft.service_area,
      craft: state.draft.craft || state.craft,
      fallbackName: state.partnerDisplayName
    });
    var rn = EP.$('#reviewPreviewName');
    var rm = EP.$('#reviewPreviewMeta');
    var ra = EP.$('#reviewPreviewArea');
    var rh = EP.$('#reviewPreviewHint');
    if (rn) rn.textContent = model.displayName;
    if (rm) rm.textContent = model.locationLine;
    if (ra) ra.textContent = model.areaText;
    if (rh) rh.textContent = model.specialtyHint;
    var media = EP.$('#reviewPreviewMedia');
    if (media) {
      var cover = (state.assets || []).filter(function (a) {
        return a.isCover || a.id === state.coverAssetId;
      })[0];
      var rawCover = cover && (cover.previewUrl || cover.publicUrl);
      if (rawCover) {
        media.classList.add('has-cover');
        if (EP.resolveMediaUrl && EP.isPrivatePreviewPath && EP.isPrivatePreviewPath(rawCover)) {
          media.style.backgroundImage = '';
          EP.resolveMediaUrl(rawCover).then(function (resolved) {
            if (resolved) {
              media.style.backgroundImage =
                'url("' + String(resolved).replace(/"/g, '') + '")';
            }
          });
        } else {
          media.style.backgroundImage =
            'url("' + String(rawCover).replace(/"/g, '') + '")';
        }
      } else {
        media.classList.remove('has-cover');
        media.style.backgroundImage = '';
      }
    }
  }

  function focusField(fieldKey) {
    if (!fieldKey) return;
    var map = {
      legal_name: '#f_legal_name',
      display_name: '#f_display_name',
      rechtsvorm: '#f_rechtsvorm',
      kbo: '#f_kbo',
      btw_plichtig: '#btwSeg',
      btw_nummer: '#f_btw_nummer',
      adres: '#f_adres',
      postcode: '#f_postcode',
      gemeente: '#f_gemeente',
      gewest: '#f_gewest',
      website: '#f_website',
      email: '#f_email',
      phone: '#f_phone',
      contact_name: '#f_contact_name',
      language: '#f_language',
      mode: '#areaModeGrid',
      radius_km: '#f_radius_km',
      provinces: '#provincesGrid',
      regions: '#regionsGrid',
      public_text: '#f_public_text',
      primary_category_id: '#categoryGrid',
      service_ids: '#servicesGrid',
      years_active: '#f_years_active',
      strength: '#f_strength',
      prefer: '#f_prefer',
      data_correct: '#f_data_correct',
      editorial_ok: '#f_editorial_ok'
    };
    var sel = map[fieldKey];
    if (!sel && fieldKey.indexOf('cond_') === 0) sel = '#conditionalsHost';
    if (!sel && fieldKey.indexOf('extra_') === 0) sel = '#extrasHost';
    if (!sel && fieldKey.indexOf('price_') === 0) sel = '#servicePricesHost';
    var el = sel ? EP.$(sel) : null;
    if (el && el.focus) {
      try { el.focus(); } catch (e) { /* ignore */ }
    } else if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function followDeepLink(stepId, fieldKey) {
    if (!stepId) return;
    if (!Shell.canVisitStep({ onboardingStatus: state.onboardingStatus, stepId: stepId })) {
      return;
    }
    await goToStep(stepId, { persist: state.canEdit });
    setTimeout(function () { focusField(fieldKey); }, 50);
  }

  function collectConfirmations() {
    return {
      confirmations: {
        data_correct: !!(EP.$('#f_data_correct') && EP.$('#f_data_correct').checked),
        editorial_ok: !!(EP.$('#f_editorial_ok') && EP.$('#f_editorial_ok').checked)
      }
    };
  }

  async function persistConfirmations() {
    if (!state.canEdit) return;
    var patch = collectConfirmations();
    state.confirmations = patch.confirmations;
    state.draft.confirmations = patch.confirmations;
    await saveStep('controle', { draft: patch });
    renderControlePanel();
  }

  async function submitOrResubmit() {
    if (state.submitting || !state.canEdit) return;
    var patch = collectConfirmations();
    state.draft.confirmations = patch.confirmations;
    var gates = Draft.evaluateSubmitGates(state.draft);
    if (!gates.ok) {
      renderControlePanel();
      setSaveUi('error', 'Nog niet alle verplichte punten zijn in orde.');
      return;
    }

    state.submitting = true;
    renderControlePanel();
    setSaveUi('saving', 'Indienen…');
    try {
      await saveStep('controle', { draft: patch });
      var action = state.onboardingStatus === 'changes_requested'
        ? 'onboarding-resubmit'
        : 'onboarding-submit';
      var res = await EP.apiFetch(action, {
        method: 'POST',
        body: { partnerId: state.partnerId, version: state.version }
      });
      if (!res.ok || !res.body || !res.body.ok) {
        var code = res.body && res.body.error;
        if (code === 'submit_incomplete') {
          setSaveUi('error', 'Nog niet alle verplichte punten zijn in orde.');
          renderControlePanel();
          return;
        }
        if (code === 'version_conflict' && res.body.currentVersion) {
          state.version = res.body.currentVersion;
          setSaveUi('error', 'Conflict — opnieuw proberen…');
          state.submitting = false;
          return submitOrResubmit();
        }
        setSaveUi('error', (res.body && (res.body.message || res.body.detail)) || 'Indienen mislukt');
        return;
      }
      applyPayload(res.body);
      setSaveUi('ok', 'Ingediend');
      showStep('review_hub');
      renderReviewHubPanel();
    } catch (err) {
      setSaveUi('error', err.message || 'Indienen mislukt');
    } finally {
      state.submitting = false;
      if (state.currentStepId === 'controle') renderControlePanel();
    }
  }

  function collectP3Draft() {
    return { craft: Draft.pickCraft(state.craft) };
  }

  function renderQuestionBlocks(host, questions, answers, kind) {
    if (!host) return;
    answers = answers || {};
    host.innerHTML = (questions || []).map(function (qq) {
      if (Draft.isInfoQuestion(qq)) {
        return '<p class="prof-info-note" data-info-key="' + escapeHtml(qq.key) + '">' + escapeHtml(qq.label) + '</p>';
      }
      var errKey = (kind === 'cond' ? 'cond_' : 'extra_') + qq.key;
      if (qq.type === 'multi') {
        var selected = Array.isArray(answers[qq.key]) ? answers[qq.key] : [];
        return '<div class="prof-q-block" data-q-key="' + escapeHtml(qq.key) + '">' +
          '<p class="prof-q-label">' + escapeHtml(qq.label) + '</p>' +
          '<div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (selected.indexOf(oid) >= 0 ? ' is-selected' : '') +
              '" data-' + kind + '-multi="' + escapeHtml(qq.key) + '" data-val="' + escapeHtml(oid) + '">' +
              escapeHtml(olab) + '</button>';
          }).join('') +
          '</div>' +
          '<span class="prof-field-error" data-error-for="' + escapeHtml(errKey) + '" hidden></span>' +
          '</div>';
      }
      if (qq.type === 'single' || qq.type === 'select') {
        var cur = answers[qq.key] || '';
        return '<div class="prof-q-block" data-q-key="' + escapeHtml(qq.key) + '">' +
          '<p class="prof-q-label">' + escapeHtml(qq.label) + '</p>' +
          '<div class="lab-choice-grid is-2">' +
          (qq.options || []).map(function (opt) {
            var oid = typeof opt === 'string' ? opt : opt.id;
            var olab = typeof opt === 'string' ? opt : opt.label;
            return '<button type="button" class="lab-choice' + (cur === oid ? ' is-selected' : '') +
              '" data-' + kind + '-single="' + escapeHtml(qq.key) + '" data-val="' + escapeHtml(oid) + '">' +
              escapeHtml(olab) + '</button>';
          }).join('') +
          '</div>' +
          '<span class="prof-field-error" data-error-for="' + escapeHtml(errKey) + '" hidden></span>' +
          '</div>';
      }
      if (qq.type === 'number' || qq.type === 'text') {
        var val = answers[qq.key] == null ? '' : answers[qq.key];
        return '<div class="prof-q-block" data-q-key="' + escapeHtml(qq.key) + '">' +
          '<label class="lab-field">' + escapeHtml(qq.label) +
          '<input data-' + kind + '-field="' + escapeHtml(qq.key) + '" type="' +
          (qq.type === 'number' ? 'number' : 'text') + '" value="' + escapeHtml(val) + '"' +
          (qq.placeholder ? ' placeholder="' + escapeHtml(qq.placeholder) + '"' : '') + '>' +
          '</label>' +
          '<span class="prof-field-error" data-error-for="' + escapeHtml(errKey) + '" hidden></span>' +
          '</div>';
      }
      return '';
    }).join('');
  }

  function pruneCraftAnswers() {
    var catId = state.craft.primary_category_id;
    var serviceIds = state.craft.service_ids || [];
    var condAllowed = {};
    Draft.getConditionalsForSelected(catId, serviceIds).forEach(function (q) {
      condAllowed[q.key] = true;
    });
    var nextCond = {};
    Object.keys(state.craft.conditionals || {}).forEach(function (k) {
      if (condAllowed[k]) nextCond[k] = state.craft.conditionals[k];
    });
    state.craft.conditionals = nextCond;

    var extraAllowed = {};
    Draft.getOnboardExtras(catId).forEach(function (q) {
      if (!Draft.isInfoQuestion(q)) extraAllowed[q.key] = true;
    });
    var nextEx = {};
    Object.keys(state.craft.extras || {}).forEach(function (k) {
      if (extraAllowed[k]) nextEx[k] = state.craft.extras[k];
    });
    state.craft.extras = nextEx;
  }

  function renderP3() {
    var catGrid = EP.$('#categoryGrid');
    if (catGrid && !catGrid.getAttribute('data-ready')) {
      catGrid.innerHTML = Draft.listCategories().map(function (c) {
        return '<button type="button" class="lab-choice" data-category="' + escapeHtml(c.id) + '">' +
          escapeHtml(c.label) + '</button>';
      }).join('');
      catGrid.setAttribute('data-ready', '1');
    }

    var catId = state.craft.primary_category_id || '';
    document.querySelectorAll('#categoryGrid [data-category]').forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.getAttribute('data-category') === catId);
    });

    var servicesFieldset = EP.$('#servicesFieldset');
    var servicesGrid = EP.$('#servicesGrid');
    var servicesLead = EP.$('#servicesLead');
    var cat = catId ? Draft.getCategory(catId) : null;
    if (servicesFieldset) servicesFieldset.hidden = !cat;
    if (cat && servicesGrid) {
      if (servicesLead) {
        servicesLead.textContent = cat.label + ': selecteer wat jullie effectief doen (minstens één).';
      }
      var selected = state.craft.service_ids || [];
      servicesGrid.innerHTML = Draft.getServices(catId).map(function (s) {
        return '<button type="button" class="lab-choice' + (selected.indexOf(s.id) >= 0 ? ' is-selected' : '') +
          '" data-service="' + escapeHtml(s.id) + '">' + escapeHtml(s.label) + '</button>';
      }).join('');
    }

    var condQs = cat ? Draft.getConditionalsForSelected(catId, state.craft.service_ids || []) : [];
    var condFieldset = EP.$('#conditionalsFieldset');
    var condHost = EP.$('#conditionalsHost');
    if (condFieldset) condFieldset.hidden = !condQs.length;
    renderQuestionBlocks(condHost, condQs, state.craft.conditionals, 'cond');

    var extraQs = cat ? Draft.getOnboardExtras(catId) : [];
    var extrasFieldset = EP.$('#extrasFieldset');
    var extrasHost = EP.$('#extrasHost');
    if (extrasFieldset) extrasFieldset.hidden = !extraQs.length;
    renderQuestionBlocks(extrasHost, extraQs, state.craft.extras, 'extra');

    setFormReadOnly(!state.canEdit);
  }

  function hydrateP3FromDraft() {
    state.craft = Draft.pickCraft(state.draft && state.draft.craft);
    renderP3();
    updateLivingPreview();
  }

  function syncOfferWithCraft() {
    state.offer = Draft.pruneOfferToServices(state.offer, state.craft.service_ids || []);
    if (!Draft.showUrgencyJobs(state.craft)) state.offer.urgency_jobs = null;
    if (Draft.hasCiProjectMinimum(state.craft.primary_category_id)) {
      state.offer.project_minimum = null;
    }
  }

  function collectP4Draft() {
    syncOfferWithCraft();
    return {
      craft: Draft.pickCraft(state.craft),
      offer: Draft.pickOffer(state.offer)
    };
  }

  function ensureServicePrice(sid) {
    if (!state.offer.service_prices[sid]) {
      state.offer.service_prices[sid] = Draft.emptyServicePrice();
    }
    return state.offer.service_prices[sid];
  }

  function unitHintLabel(hint) {
    if (!hint) return '';
    var map = {
      m2: 'm²',
      lm: 'lopende meter',
      stuk: 'stuk',
      wp: 'Wp',
      kwh: 'kWh'
    };
    return map[hint] || hint;
  }

  function renderP4() {
    syncOfferWithCraft();
    var catId = state.craft.primary_category_id || '';
    var serviceIds = state.craft.service_ids || [];
    var host = EP.$('#servicePricesHost');
    var lead = EP.$('#p4PricesLead');
    if (lead) {
      lead.textContent = serviceIds.length
        ? 'Vul per dienst een richtprijs in. “Op aanvraag” mag altijd.'
        : 'Selecteer eerst diensten bij Ambacht.';
    }
    if (host) {
      host.innerHTML = serviceIds.map(function (sid) {
        var svc = Draft.getServices(catId).filter(function (s) { return s.id === sid; })[0];
        var label = svc ? svc.label : sid;
        var sp = ensureServicePrice(sid);
        var models = Draft.pricingModelsForService(catId, sid);
        var unit = unitHintLabel(Draft.unitHintForService(catId, sid));
        var needsMin = Draft.modelNeedsMin(sp.pricing_model);
        var needsMax = Draft.modelNeedsMax(sp.pricing_model);
        var onReq = sp.pricing_model === 'on_request';
        return '<article class="prof-price-card" data-service-price="' + escapeHtml(sid) + '">' +
          '<h3>' + escapeHtml(label) + '</h3>' +
          (unit ? '<p class="prof-price-unit">Eenheid: ' + escapeHtml(unit) + '</p>' : '') +
          '<p class="prof-q-label">Prijsmodel</p>' +
          '<div class="lab-choice-grid is-2">' +
          models.map(function (m) {
            return '<button type="button" class="lab-choice' + (sp.pricing_model === m ? ' is-selected' : '') +
              '" data-price-model="' + escapeHtml(sid) + '" data-model="' + escapeHtml(m) + '">' +
              escapeHtml(Draft.priceModelLabel(m)) + '</button>';
          }).join('') +
          '</div>' +
          '<span class="prof-field-error" data-error-for="price_' + escapeHtml(sid) + '_model" hidden></span>' +
          '<div class="prof-price-amounts"' + (onReq ? ' hidden' : '') + '>' +
          '<label class="lab-field">Vanaf / min (€)' +
          '<input type="number" min="0" step="1" inputmode="decimal" data-price-min="' + escapeHtml(sid) + '" value="' +
          (sp.min_price != null ? escapeHtml(sp.min_price) : '') + '"' + (needsMin ? ' required' : '') + '>' +
          '</label>' +
          '<span class="prof-field-error" data-error-for="price_' + escapeHtml(sid) + '_min" hidden></span>' +
          '<label class="lab-field"' + (needsMax || sp.max_price != null ? '' : '') + '>Tot / max (€)' +
          (needsMax ? '' : ' <span class="prof-opt">(optioneel)</span>') +
          '<input type="number" min="0" step="1" inputmode="decimal" data-price-max="' + escapeHtml(sid) + '" value="' +
          (sp.max_price != null ? escapeHtml(sp.max_price) : '') + '"' + (needsMax ? ' required' : '') + '>' +
          '</label>' +
          '<span class="prof-field-error" data-error-for="price_' + escapeHtml(sid) + '_max" hidden></span>' +
          '</div>' +
          '<label class="lab-field prof-price-note">Interne notitie <span class="prof-opt">(niet publiek)</span>' +
          '<input type="text" maxlength="200" data-price-note="' + escapeHtml(sid) + '" value="' +
          escapeHtml(sp.internal_note || '') + '" placeholder="Enkel voor jullie / ELYAN">' +
          '</label>' +
          '</article>';
      }).join('');
    }

    var vatGrid = EP.$('#vatBasisGrid');
    if (vatGrid) {
      vatGrid.innerHTML = Draft.VAT_BASIS_OPTIONS.map(function (o) {
        return '<button type="button" class="lab-choice' + (state.offer.vat_basis === o.id ? ' is-selected' : '') +
          '" data-vat-basis="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var hasCiMin = Draft.hasCiProjectMinimum(catId);
    var minFs = EP.$('#projectMinFieldset');
    var minInput = EP.$('#f_project_minimum');
    var minNote = EP.$('#projectMinCiNote');
    if (minInput) {
      minInput.value = state.offer.project_minimum != null ? state.offer.project_minimum : '';
      minInput.disabled = !state.canEdit || hasCiMin;
    }
    if (minNote) minNote.hidden = !hasCiMin;
    if (minFs) minFs.classList.toggle('is-ci-sourced', !!hasCiMin);

    var ctGrid = EP.$('#clientTypesGrid');
    if (ctGrid) {
      ctGrid.innerHTML = Draft.CLIENT_TYPES.map(function (o) {
        var sel = (state.offer.client_types || []).indexOf(o.id) >= 0;
        return '<button type="button" class="lab-choice' + (sel ? ' is-selected' : '') +
          '" data-client-type="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var rtGrid = EP.$('#responseTimeGrid');
    if (rtGrid) {
      rtGrid.innerHTML = Draft.RESPONSE_TIMES.map(function (o) {
        return '<button type="button" class="lab-choice' + (state.offer.response_time === o.id ? ' is-selected' : '') +
          '" data-response-time="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var showUrg = Draft.showUrgencyJobs(state.craft);
    var urgFs = EP.$('#urgencyFieldset');
    if (urgFs) urgFs.hidden = !showUrg;
    var urgGrid = EP.$('#urgencyGrid');
    if (urgGrid && showUrg) {
      urgGrid.innerHTML = Draft.URGENCY_OPTIONS.map(function (o) {
        return '<button type="button" class="lab-choice' + (state.offer.urgency_jobs === o.id ? ' is-selected' : '') +
          '" data-urgency="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var capGrid = EP.$('#capacityGrid');
    if (capGrid) {
      capGrid.innerHTML = Draft.getCapacityOptions().map(function (o) {
        return '<button type="button" class="lab-choice' + (state.offer.capacity === o.id ? ' is-selected' : '') +
          '" data-capacity="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var startSel = EP.$('#f_start_month');
    if (startSel) {
      var months = Draft.listStartMonths();
      var cur = state.offer.start_month || '';
      startSel.innerHTML = '<option value="">Kies maand…</option>' + months.map(function (m) {
        return '<option value="' + escapeHtml(m.id) + '"' + (cur === m.id ? ' selected' : '') + '>' +
          escapeHtml(m.label) + '</option>';
      }).join('');
    }

    var visitGrid = EP.$('#visitSpeedGrid');
    if (visitGrid) {
      visitGrid.innerHTML = Draft.getVisitOptions().map(function (o) {
        return '<button type="button" class="lab-choice' + (state.offer.visit_speed === o.id ? ' is-selected' : '') +
          '" data-visit-speed="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    var veOpts = Draft.getVisitExtraOptions();
    var veWrap = EP.$('#visitExtraWrap');
    var veGrid = EP.$('#visitExtraGrid');
    if (veWrap) veWrap.hidden = !veOpts.length;
    if (veGrid) {
      veGrid.innerHTML = veOpts.map(function (o) {
        var sel = (state.offer.visit_extra || []).indexOf(o.id) >= 0;
        return '<button type="button" class="lab-choice' + (sel ? ' is-selected' : '') +
          '" data-visit-extra="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }

    setFormReadOnly(!state.canEdit);
  }

  function hydrateP4FromDraft() {
    state.craft = Draft.pickCraft(state.draft && state.draft.craft);
    state.offer = Draft.pickOffer(state.draft && state.draft.offer);
    syncOfferWithCraft();
    renderP4();
  }

  function collectP5Draft() {
    return { story: Draft.pickStory(state.story) };
  }

  function renderP5() {
    var yearsGrid = EP.$('#yearsActiveGrid');
    if (yearsGrid) {
      yearsGrid.innerHTML = Draft.YEARS_ACTIVE.map(function (o) {
        return '<button type="button" class="lab-choice' +
          (state.story.years_active === o.id ? ' is-selected' : '') +
          '" data-years-active="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }
    var teamGrid = EP.$('#teamSizeGrid');
    if (teamGrid) {
      teamGrid.innerHTML = Draft.TEAM_SIZES.map(function (o) {
        return '<button type="button" class="lab-choice' +
          (state.story.team_size === o.id ? ' is-selected' : '') +
          '" data-team-size="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</button>';
      }).join('');
    }
    var map = {
      f_strength: 'strength',
      f_prefer: 'prefer',
      f_avoid: 'avoid',
      f_care: 'care',
      f_why_choose: 'why_choose',
      f_materials: 'materials',
      f_must_know: 'must_know',
      f_guarantee_line: 'guarantee_line'
    };
    Object.keys(map).forEach(function (id) {
      var el = EP.$('#' + id);
      if (el) el.value = state.story[map[id]] || '';
    });
    var showYears = EP.$('#f_show_years_public');
    if (showYears) showYears.checked = state.story.show_years_public !== false;
    var showTeam = EP.$('#f_show_team_public');
    if (showTeam) showTeam.checked = !!state.story.show_team_public;
    setFormReadOnly(!state.canEdit);
  }

  function hydrateP5FromDraft() {
    state.story = Draft.pickStory(state.draft && state.draft.story);
    renderP5();
  }

  function syncAssetsFromPayload(payload) {
    if (payload && Array.isArray(payload.assets)) {
      state.assets = payload.assets.slice();
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'coverAssetId')) {
      state.coverAssetId = payload.coverAssetId || null;
    } else if (payload && payload.profile && payload.profile.coverAssetId != null) {
      state.coverAssetId = payload.profile.coverAssetId;
    }
  }

  function updatePortfolioSoftNudge() {
    var soft = Draft.validateP6Soft(state.assets);
    var el = EP.$('#p6SoftNudge');
    if (!el) return;
    if (soft.softNudge) {
      el.hidden = false;
      el.textContent = soft.message;
    } else {
      el.hidden = true;
      el.textContent = '';
    }
    var countEl = EP.$('#portfolioCount');
    if (countEl) {
      countEl.textContent = state.assets.length
        ? state.assets.length + ' / ' + Draft.PORTFOLIO_MAX_ASSETS + ' foto’s'
        : 'Nog geen foto’s — dat is oké voor later.';
    }
  }

  function renderPortfolio() {
    var grid = EP.$('#portfolioGrid');
    if (!grid) return;
    var items = state.assets.slice().sort(function (a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    var pendingHtml = Object.keys(state.pendingUploads).map(function (localId) {
      var p = state.pendingUploads[localId];
      return '<li class="prof-portfolio-item is-uploading" data-local-id="' + escapeHtml(localId) + '">' +
        '<div class="prof-portfolio-thumb">' +
        (p.previewUrl ? '<img data-local-preview="1" src="' + escapeHtml(p.previewUrl) + '" alt="">' : '') +
        '<div class="prof-upload-bar"><span style="width:' + Math.round((p.progress || 0) * 100) + '%"></span></div>' +
        '</div>' +
        '<div class="prof-portfolio-body">' +
        '<p class="lab-hint">' + (p.error ? escapeHtml(p.error) : 'Bezig met uploaden…') + '</p>' +
        (p.error
          ? '<div class="prof-portfolio-actions"><button type="button" class="btn" data-retry-local="' +
            escapeHtml(localId) + '">Opnieuw</button>' +
            '<button type="button" class="btn" data-cancel-local="' + escapeHtml(localId) + '">Verwijder</button></div>'
          : '') +
        '</div></li>';
    }).join('');

    grid.innerHTML = items.map(function (a) {
      var isCover = !!a.isCover || a.id === state.coverAssetId;
      var src = a.previewUrl || a.publicUrl || '';
      return '<li class="prof-portfolio-item" draggable="' + (state.canEdit ? 'true' : 'false') +
        '" data-asset-id="' + escapeHtml(a.id) + '">' +
        '<div class="prof-portfolio-thumb" data-drag-handle="1">' +
        (src
          ? '<img data-asset-img="' + escapeHtml(a.id) + '" data-src="' + escapeHtml(src) + '" alt="">'
          : '') +
        (isCover ? '<span class="prof-cover-badge">Cover</span>' : '') +
        '</div>' +
        '<div class="prof-portfolio-body">' +
        '<label class="lab-field">Titel <span class="prof-opt">(optioneel)</span>' +
        '<input type="text" maxlength="60" data-asset-title="' + escapeHtml(a.id) + '" value="' +
        escapeHtml(a.title || '') + '"' + (state.canEdit ? '' : ' disabled') + '>' +
        '</label>' +
        '<div class="prof-portfolio-actions">' +
        (state.canEdit && !isCover
          ? '<button type="button" class="btn" data-set-cover="' + escapeHtml(a.id) + '">Als cover</button>'
          : '') +
        (state.canEdit
          ? '<button type="button" class="btn" data-delete-asset="' + escapeHtml(a.id) + '">Verwijder</button>'
          : '') +
        '</div></div></li>';
    }).join('') + pendingHtml;

    updatePortfolioSoftNudge();
    var drop = EP.$('#portfolioDropzone');
    if (drop) drop.hidden = !state.canEdit || state.assets.length >= Draft.PORTFOLIO_MAX_ASSETS;
    hydrateAuthorizedImages(grid);
  }

  function hydrateAuthorizedImages(rootEl) {
    if (!rootEl || !EP.resolveMediaUrl) return;
    var imgs = rootEl.querySelectorAll('img[data-src]');
    Array.prototype.forEach.call(imgs, function (img) {
      var raw = img.getAttribute('data-src');
      if (!raw) return;
      EP.resolveMediaUrl(raw).then(function (resolved) {
        if (resolved) img.src = resolved;
      });
    });
  }

  function hydratePortfolioFromPayload() {
    renderPortfolio();
  }

  async function persistAssetOrder() {
    if (!state.canEdit) return;
    var orderedIds = state.assets
      .slice()
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
      .map(function (a) { return a.id; });
    var res = await EP.apiFetch('onboarding-assets-reorder', {
      method: 'POST',
      body: { partnerId: state.partnerId, orderedIds: orderedIds }
    });
    if (res.ok && res.body && res.body.ok) {
      syncAssetsFromPayload(res.body);
      renderPortfolio();
    }
  }

  async function uploadOneFile(file, localId) {
    var checked = Portfolio.validateSourceFile(file);
    if (!checked.ok) {
      state.pendingUploads[localId] = {
        progress: 1,
        error: checked.message,
        file: file,
        previewUrl: state.pendingUploads[localId] && state.pendingUploads[localId].previewUrl
      };
      renderPortfolio();
      return;
    }
    if (state.assets.length >= Draft.PORTFOLIO_MAX_ASSETS) {
      delete state.pendingUploads[localId];
      setSaveUi('error', 'Maximaal 12 projectfoto’s.');
      renderPortfolio();
      return;
    }
    state.pendingUploads[localId] = state.pendingUploads[localId] || {};
    state.pendingUploads[localId].file = file;
    state.pendingUploads[localId].error = '';
    state.pendingUploads[localId].progress = 0.1;
    renderPortfolio();

    var compressed = await Portfolio.compressImageFile(file, function (p) {
      if (state.pendingUploads[localId]) {
        state.pendingUploads[localId].progress = Math.min(0.75, 0.1 + p * 0.65);
        renderPortfolio();
      }
    });
    if (!compressed.ok) {
      state.pendingUploads[localId].error = compressed.message || 'Compressie mislukt';
      renderPortfolio();
      return;
    }
    if (state.pendingUploads[localId]) state.pendingUploads[localId].progress = 0.85;
    renderPortfolio();

    var res = await EP.apiFetch('onboarding-asset-upload', {
      method: 'POST',
      body: {
        partnerId: state.partnerId,
        dataBase64: compressed.dataBase64,
        contentType: compressed.contentType,
        title: ''
      }
    });
    if (!res.ok || !res.body || !res.body.ok) {
      state.pendingUploads[localId].error =
        (res.body && (res.body.message || res.body.detail)) || 'Upload mislukt';
      state.pendingUploads[localId].progress = 1;
      renderPortfolio();
      setSaveUi('error', state.pendingUploads[localId].error);
      return;
    }
    delete state.pendingUploads[localId];
    syncAssetsFromPayload(res.body);
    renderPortfolio();
    setSaveUi('ok', 'Foto opgeslagen');
  }

  async function handleIncomingFiles(fileList) {
    if (!state.canEdit) return;
    var files = Array.prototype.slice.call(fileList || []);
    var room = Draft.PORTFOLIO_MAX_ASSETS - state.assets.length;
    if (room <= 0) {
      setSaveUi('error', 'Maximaal 12 projectfoto’s.');
      return;
    }
    files = files.slice(0, room);
    for (var i = 0; i < files.length; i++) {
      var localId = 'local-' + Date.now() + '-' + i;
      var previewUrl = '';
      try {
        previewUrl = URL.createObjectURL(files[i]);
      } catch (e) { /* ignore */ }
      state.pendingUploads[localId] = { progress: 0, file: files[i], previewUrl: previewUrl, error: '' };
      renderPortfolio();
      // sequential to keep version/order predictable
      await uploadOneFile(files[i], localId);
    }
  }

  function applyLocalDraft(patch) {
    state.draft = Object.assign({}, state.draft, patch);
    if (patch.company) {
      state.draft.company = Object.assign({}, state.draft.company || {}, patch.company);
    }
    if (patch.service_area) {
      state.draft.service_area = Object.assign({}, state.draft.service_area || {}, patch.service_area);
    }
    if (patch.craft) {
      state.draft.craft = Draft.mergeCraft(state.draft.craft, patch.craft);
      state.craft = Draft.pickCraft(state.draft.craft);
    }
    if (patch.offer) {
      state.draft.offer = Draft.mergeOffer(state.draft.offer, patch.offer);
      state.offer = Draft.pruneOfferToServices(
        Draft.pickOffer(state.draft.offer),
        state.craft.service_ids || []
      );
      state.draft.offer = state.offer;
    }
    if (patch.story) {
      state.draft.story = Object.assign({}, state.draft.story || {}, patch.story);
      state.story = Draft.pickStory(state.draft.story);
    }
    updateLivingPreview();
  }

  function scheduleAutosave() {
    if (!state.canEdit) return;
    if (
      state.currentStepId !== 'bedrijf_bereik' &&
      state.currentStepId !== 'start' &&
      state.currentStepId !== 'ambacht' &&
      state.currentStepId !== 'aanbod' &&
      state.currentStepId !== 'verhaal'
    ) {
      return;
    }
    var draftPatch =
      state.currentStepId === 'verhaal'
        ? collectP5Draft()
        : state.currentStepId === 'aanbod'
          ? collectP4Draft()
          : state.currentStepId === 'ambacht'
            ? collectP3Draft()
            : collectP2Draft();
    applyLocalDraft(draftPatch);
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      var payload =
        state.currentStepId === 'verhaal'
          ? collectP5Draft()
          : state.currentStepId === 'aanbod'
            ? collectP4Draft()
            : state.currentStepId === 'ambacht'
              ? collectP3Draft()
              : collectP2Draft();
      saveStep(state.currentStepId, { draft: payload });
    }, 700);
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
      renderReviewHubPanel();
    }

    if (stepId === 'controle') {
      renderControlePanel();
    } else if (stepId === 'bedrijf_bereik') {
      hydrateP2Form();
    } else if (stepId === 'ambacht') {
      hydrateP3FromDraft();
    } else if (stepId === 'aanbod') {
      hydrateP4FromDraft();
    } else if (stepId === 'verhaal') {
      hydrateP5FromDraft();
      if (state.onboardingStatus === 'submitted') {
        lockCoreFieldsWhileSubmitted();
      }
    } else if (stepId === 'portfolio') {
      hydratePortfolioFromPayload();
    } else {
      updateLivingPreview();
    }

    var reviewLocked = state.onboardingStatus === 'submitted' || state.onboardingStatus === 'approved';
    var prev = Shell.prevStepId(stepId);
    var next = Shell.nextStepId(stepId);

    if (backBtn) {
      if (state.onboardingStatus === 'changes_requested') {
        backBtn.hidden = !prev || stepId === 'review_hub';
        backBtn.disabled = !prev || stepId === 'review_hub';
      } else {
        backBtn.hidden = reviewLocked || !prev || stepId === 'review_hub';
        backBtn.disabled = reviewLocked || !prev || stepId === 'review_hub';
      }
    }
    if (nextBtn) {
      if (
        stepId === 'controle' ||
        stepId === 'review_hub' ||
        stepId === 'start' ||
        (reviewLocked && state.onboardingStatus !== 'changes_requested')
      ) {
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

  function lockCoreFieldsWhileSubmitted() {
    // V2: core story fields locked; optional story fields remain editable.
    ['#f_years_active', '#f_strength', '#f_prefer'].forEach(function (sel) {
      var el = EP.$(sel);
      if (!el) return;
      el.disabled = true;
      el.readOnly = true;
    });
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
    state.canSubmit = !!payload.canSubmit;
    state.canResubmit = !!payload.canResubmit;
    state.onboardingStatus = payload.onboardingStatus || payload.onboarding && payload.onboarding.onboardingStatus;
    state.profileStatus = payload.profileStatus || (payload.profile && payload.profile.profileStatus) || null;
    state.version = payload.version;
    state.profileStrength = payload.profileStrength || null;
    state.reviewItems = Array.isArray(payload.reviewItems) ? payload.reviewItems : [];
    if (payload.currentStepId) {
      state.currentStepId = payload.currentStepId;
    }
    if (payload.draft && typeof payload.draft === 'object') {
      state.draft = payload.draft;
    } else if (payload.onboarding && payload.onboarding.draft) {
      state.draft = payload.onboarding.draft;
    }
    if (state.draft && state.draft.confirmations) {
      state.confirmations = Draft.pickConfirmations(state.draft.confirmations);
    }
    syncAssetsFromPayload(payload);
    if (state.draft && state.draft.story) {
      state.story = Draft.pickStory(state.draft.story);
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
      } else if (stepId === 'ambacht') {
        body.draft = collectP3Draft();
      } else if (stepId === 'aanbod') {
        body.draft = collectP4Draft();
      } else if (stepId === 'verhaal') {
        body.draft = collectP5Draft();
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
      if (state.draft && state.draft.craft) {
        state.craft = Draft.pickCraft(state.draft.craft);
      }
      if (state.draft && state.draft.offer) {
        state.offer = Draft.pickOffer(state.draft.offer);
        syncOfferWithCraft();
      }
      if (state.draft && state.draft.story) {
        state.story = Draft.pickStory(state.draft.story);
      }
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
        var queuedDraft =
          state.currentStepId === 'verhaal'
            ? collectP5Draft()
            : state.currentStepId === 'aanbod'
              ? collectP4Draft()
              : state.currentStepId === 'ambacht'
                ? collectP3Draft()
                : state.currentStepId === 'bedrijf_bereik'
                  ? collectP2Draft()
                  : null;
        saveStep(state.currentStepId, queuedDraft ? { draft: queuedDraft } : {});
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
      if (!draft) {
        if (stepId === 'bedrijf_bereik' || state.currentStepId === 'bedrijf_bereik') {
          draft = collectP2Draft();
        } else if (stepId === 'ambacht' || state.currentStepId === 'ambacht') {
          draft = collectP3Draft();
        } else if (stepId === 'aanbod' || state.currentStepId === 'aanbod') {
          draft = collectP4Draft();
        } else if (stepId === 'verhaal' || state.currentStepId === 'verhaal') {
          draft = collectP5Draft();
        }
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
      if (state.currentStepId === 'ambacht') {
        var p3 = collectP3Draft();
        var p3Check = Draft.validateP3Complete(p3);
        if (!p3Check.ok) {
          showFieldErrors(p3Check.errors);
          setSaveUi('error', 'Controleer de gemarkeerde velden.');
          return;
        }
        clearFieldErrors();
        applyLocalDraft(p3);
        var nextP3 = Shell.nextStepId(state.currentStepId);
        if (nextP3 && nextP3 !== 'review_hub') goToStep(nextP3, { draft: p3 });
        return;
      }
      if (state.currentStepId === 'aanbod') {
        var p4 = collectP4Draft();
        var p4Check = Draft.validateP4Complete(p4);
        if (!p4Check.ok) {
          showFieldErrors(p4Check.errors);
          setSaveUi('error', 'Controleer de gemarkeerde velden.');
          return;
        }
        clearFieldErrors();
        applyLocalDraft(p4);
        var nextP4 = Shell.nextStepId(state.currentStepId);
        if (nextP4 && nextP4 !== 'review_hub') goToStep(nextP4, { draft: p4 });
        return;
      }
      if (state.currentStepId === 'verhaal') {
        var p5 = collectP5Draft();
        var p5Check = Draft.validateP5Complete(p5);
        if (!p5Check.ok) {
          showFieldErrors(p5Check.errors);
          setSaveUi('error', 'Controleer de gemarkeerde velden.');
          return;
        }
        clearFieldErrors();
        applyLocalDraft(p5);
        var nextP5 = Shell.nextStepId(state.currentStepId);
        if (nextP5 && nextP5 !== 'review_hub') goToStep(nextP5, { draft: p5 });
        return;
      }
      if (state.currentStepId === 'portfolio') {
        // 0 photos allowed — soft nudge only, never a blocker
        var nextP6 = Shell.nextStepId(state.currentStepId);
        if (nextP6 && nextP6 !== 'review_hub') goToStep(nextP6);
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

  var categoryGrid = EP.$('#categoryGrid');
  if (categoryGrid) {
    categoryGrid.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-category]');
      if (!btn || !state.canEdit) return;
      var nextId = btn.getAttribute('data-category');
      if (!nextId || nextId === state.craft.primary_category_id) return;
      if (Draft.hasCategoryDependentP3Data(state.craft)) {
        var ok = window.confirm(
          'Categorie wijzigen wist de geselecteerde diensten, verfijning en projectvoorkeuren. Bedrijfsgegevens blijven bewaard. Doorgaan?'
        );
        if (!ok) return;
      }
      state.craft = Draft.resetCraftForCategoryChange(nextId);
      state.offer = Draft.emptyOffer();
      applyLocalDraft({ craft: state.craft, offer: state.offer });
      renderP3();
      scheduleAutosave();
    });
  }

  var servicesGridEl = EP.$('#servicesGrid');
  if (servicesGridEl) {
    servicesGridEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-service]');
      if (!btn || !state.canEdit) return;
      var id = btn.getAttribute('data-service');
      var list = state.craft.service_ids || [];
      var i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
      state.craft.service_ids = list;
      pruneCraftAnswers();
      syncOfferWithCraft();
      applyLocalDraft({ craft: Draft.pickCraft(state.craft), offer: Draft.pickOffer(state.offer) });
      renderP3();
      scheduleAutosave();
    });
  }

  function bindAnswerHost(host) {
    if (!host) return;
    host.addEventListener('click', function (ev) {
      if (!state.canEdit) return;
      var multi = ev.target.closest('[data-cond-multi], [data-extra-multi]');
      if (multi) {
        var mKey = multi.getAttribute('data-cond-multi') || multi.getAttribute('data-extra-multi');
        var mVal = multi.getAttribute('data-val');
        var bucket = multi.hasAttribute('data-cond-multi') ? state.craft.conditionals : state.craft.extras;
        if (!Array.isArray(bucket[mKey])) bucket[mKey] = [];
        var mi = bucket[mKey].indexOf(mVal);
        if (mi >= 0) bucket[mKey].splice(mi, 1);
        else bucket[mKey].push(mVal);
        applyLocalDraft(collectP3Draft());
        renderP3();
        scheduleAutosave();
        return;
      }
      var single = ev.target.closest('[data-cond-single], [data-extra-single]');
      if (single) {
        var sKey = single.getAttribute('data-cond-single') || single.getAttribute('data-extra-single');
        var sVal = single.getAttribute('data-val');
        var sBucket = single.hasAttribute('data-cond-single') ? state.craft.conditionals : state.craft.extras;
        sBucket[sKey] = sVal;
        applyLocalDraft(collectP3Draft());
        renderP3();
        scheduleAutosave();
      }
    });
    host.addEventListener('input', function (ev) {
      if (!state.canEdit || !ev.target) return;
      var field = ev.target.getAttribute('data-cond-field') || ev.target.getAttribute('data-extra-field');
      if (!field) return;
      var fBucket = ev.target.hasAttribute('data-cond-field') ? state.craft.conditionals : state.craft.extras;
      var raw = ev.target.value;
      if (ev.target.type === 'number') {
        fBucket[field] = raw === '' ? null : Number(raw);
      } else {
        fBucket[field] = raw;
      }
      applyLocalDraft(collectP3Draft());
      scheduleAutosave();
    });
  }
  bindAnswerHost(EP.$('#conditionalsHost'));
  bindAnswerHost(EP.$('#extrasHost'));

  function touchP4() {
    applyLocalDraft(collectP4Draft());
    scheduleAutosave();
  }

  if (p4Form) {
    p4Form.addEventListener('click', function (ev) {
      if (!state.canEdit) return;
      var modelBtn = ev.target.closest('[data-price-model]');
      if (modelBtn) {
        var sid = modelBtn.getAttribute('data-price-model');
        var model = modelBtn.getAttribute('data-model');
        var sp = ensureServicePrice(sid);
        sp.pricing_model = model;
        if (model === 'on_request') {
          sp.min_price = null;
          sp.max_price = null;
        }
        renderP4();
        touchP4();
        return;
      }
      var vatBtn = ev.target.closest('[data-vat-basis]');
      if (vatBtn) {
        state.offer.vat_basis = vatBtn.getAttribute('data-vat-basis');
        renderP4();
        touchP4();
        return;
      }
      var ctBtn = ev.target.closest('[data-client-type]');
      if (ctBtn) {
        var ct = ctBtn.getAttribute('data-client-type');
        var list = state.offer.client_types || [];
        var ix = list.indexOf(ct);
        if (ix >= 0) list.splice(ix, 1);
        else list.push(ct);
        state.offer.client_types = list;
        renderP4();
        touchP4();
        return;
      }
      var rtBtn = ev.target.closest('[data-response-time]');
      if (rtBtn) {
        state.offer.response_time = rtBtn.getAttribute('data-response-time');
        renderP4();
        touchP4();
        return;
      }
      var urgBtn = ev.target.closest('[data-urgency]');
      if (urgBtn) {
        state.offer.urgency_jobs = urgBtn.getAttribute('data-urgency');
        renderP4();
        touchP4();
        return;
      }
      var capBtn = ev.target.closest('[data-capacity]');
      if (capBtn) {
        state.offer.capacity = capBtn.getAttribute('data-capacity');
        renderP4();
        touchP4();
        return;
      }
      var vsBtn = ev.target.closest('[data-visit-speed]');
      if (vsBtn) {
        state.offer.visit_speed = vsBtn.getAttribute('data-visit-speed');
        renderP4();
        touchP4();
        return;
      }
      var veBtn = ev.target.closest('[data-visit-extra]');
      if (veBtn) {
        var ve = veBtn.getAttribute('data-visit-extra');
        var veList = state.offer.visit_extra || [];
        var vix = veList.indexOf(ve);
        if (vix >= 0) veList.splice(vix, 1);
        else veList.push(ve);
        state.offer.visit_extra = veList;
        renderP4();
        touchP4();
      }
    });
    p4Form.addEventListener('input', function (ev) {
      if (!state.canEdit || !ev.target) return;
      var minEl = ev.target.getAttribute('data-price-min');
      if (minEl) {
        var spMin = ensureServicePrice(minEl);
        spMin.min_price = ev.target.value === '' ? null : Number(ev.target.value);
        touchP4();
        return;
      }
      var maxEl = ev.target.getAttribute('data-price-max');
      if (maxEl) {
        var spMax = ensureServicePrice(maxEl);
        spMax.max_price = ev.target.value === '' ? null : Number(ev.target.value);
        touchP4();
        return;
      }
      var noteEl = ev.target.getAttribute('data-price-note');
      if (noteEl) {
        ensureServicePrice(noteEl).internal_note = String(ev.target.value || '').slice(0, 200);
        touchP4();
        return;
      }
      if (ev.target.id === 'f_project_minimum') {
        state.offer.project_minimum = ev.target.value === '' ? null : Number(ev.target.value);
        touchP4();
        return;
      }
      if (ev.target.id === 'f_start_month') {
        state.offer.start_month = ev.target.value || '';
        touchP4();
      }
    });
    p4Form.addEventListener('change', function (ev) {
      if (!state.canEdit || !ev.target) return;
      if (ev.target.id === 'f_start_month') {
        state.offer.start_month = ev.target.value || '';
        touchP4();
      }
    });
  }

  function touchP5() {
    // Keep toggles in sync from DOM
    var showYears = EP.$('#f_show_years_public');
    var showTeam = EP.$('#f_show_team_public');
    state.story.show_years_public = showYears ? !!showYears.checked : true;
    state.story.show_team_public = showTeam ? !!showTeam.checked : false;
    state.story.strength = (EP.$('#f_strength') && EP.$('#f_strength').value) || '';
    state.story.prefer = (EP.$('#f_prefer') && EP.$('#f_prefer').value) || '';
    state.story.avoid = (EP.$('#f_avoid') && EP.$('#f_avoid').value) || '';
    state.story.care = (EP.$('#f_care') && EP.$('#f_care').value) || '';
    state.story.why_choose = (EP.$('#f_why_choose') && EP.$('#f_why_choose').value) || '';
    state.story.materials = (EP.$('#f_materials') && EP.$('#f_materials').value) || '';
    state.story.must_know = (EP.$('#f_must_know') && EP.$('#f_must_know').value) || '';
    state.story.guarantee_line = (EP.$('#f_guarantee_line') && EP.$('#f_guarantee_line').value) || '';
    applyLocalDraft(collectP5Draft());
    scheduleAutosave();
  }

  if (p5Form) {
    p5Form.addEventListener('click', function (ev) {
      if (!state.canEdit) return;
      var yBtn = ev.target.closest('[data-years-active]');
      if (yBtn) {
        state.story.years_active = yBtn.getAttribute('data-years-active');
        renderP5();
        touchP5();
        return;
      }
      var tBtn = ev.target.closest('[data-team-size]');
      if (tBtn) {
        state.story.team_size = tBtn.getAttribute('data-team-size');
        renderP5();
        touchP5();
      }
    });
    p5Form.addEventListener('input', function () {
      if (!state.canEdit) return;
      touchP5();
    });
    p5Form.addEventListener('change', function () {
      if (!state.canEdit) return;
      touchP5();
    });
  }

  var portfolioGrid = EP.$('#portfolioGrid');
  var portfolioDrop = EP.$('#portfolioDropzone');
  var portfolioInput = EP.$('#portfolioFileInput');
  var portfolioPickBtn = EP.$('#portfolioPickBtn');

  if (portfolioPickBtn && portfolioInput) {
    portfolioPickBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!state.canEdit) return;
      portfolioInput.click();
    });
  }
  if (portfolioDrop && portfolioInput) {
    portfolioDrop.addEventListener('click', function () {
      if (!state.canEdit) return;
      portfolioInput.click();
    });
    portfolioDrop.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      if (!state.canEdit) return;
      portfolioDrop.classList.add('is-dragover');
    });
    portfolioDrop.addEventListener('dragleave', function () {
      portfolioDrop.classList.remove('is-dragover');
    });
    portfolioDrop.addEventListener('drop', function (ev) {
      ev.preventDefault();
      portfolioDrop.classList.remove('is-dragover');
      if (!state.canEdit) return;
      handleIncomingFiles(ev.dataTransfer && ev.dataTransfer.files);
    });
  }
  if (portfolioInput) {
    portfolioInput.addEventListener('change', function () {
      if (!state.canEdit) return;
      handleIncomingFiles(portfolioInput.files);
      portfolioInput.value = '';
    });
  }

  if (portfolioGrid) {
    portfolioGrid.addEventListener('click', async function (ev) {
      if (!state.canEdit) return;
      var retry = ev.target.closest('[data-retry-local]');
      if (retry) {
        var rid = retry.getAttribute('data-retry-local');
        var pending = state.pendingUploads[rid];
        if (pending && pending.file) await uploadOneFile(pending.file, rid);
        return;
      }
      var cancel = ev.target.closest('[data-cancel-local]');
      if (cancel) {
        var cid = cancel.getAttribute('data-cancel-local');
        delete state.pendingUploads[cid];
        renderPortfolio();
        return;
      }
      var coverBtn = ev.target.closest('[data-set-cover]');
      if (coverBtn) {
        var coverId = coverBtn.getAttribute('data-set-cover');
        var coverRes = await EP.apiFetch('onboarding-asset-update', {
          method: 'POST',
          body: { partnerId: state.partnerId, assetId: coverId, setCover: true }
        });
        if (coverRes.ok && coverRes.body && coverRes.body.ok) {
          syncAssetsFromPayload(coverRes.body);
          renderPortfolio();
          setSaveUi('ok', 'Cover bijgewerkt');
        } else {
          setSaveUi('error', (coverRes.body && coverRes.body.message) || 'Cover wijzigen mislukt');
        }
        return;
      }
      var delBtn = ev.target.closest('[data-delete-asset]');
      if (delBtn) {
        var delId = delBtn.getAttribute('data-delete-asset');
        var delRes = await EP.apiFetch('onboarding-asset-delete', {
          method: 'POST',
          body: { partnerId: state.partnerId, assetId: delId }
        });
        if (delRes.ok && delRes.body && delRes.body.ok) {
          syncAssetsFromPayload(delRes.body);
          renderPortfolio();
          setSaveUi('ok', 'Foto verwijderd');
        } else {
          setSaveUi('error', (delRes.body && delRes.body.message) || 'Verwijderen mislukt');
        }
      }
    });

    var titleTimer = null;
    portfolioGrid.addEventListener('input', function (ev) {
      if (!state.canEdit || !ev.target || !ev.target.getAttribute('data-asset-title')) return;
      var assetId = ev.target.getAttribute('data-asset-title');
      var title = ev.target.value;
      var asset = state.assets.filter(function (a) { return a.id === assetId; })[0];
      if (asset) asset.title = title;
      if (titleTimer) clearTimeout(titleTimer);
      titleTimer = setTimeout(async function () {
        var res = await EP.apiFetch('onboarding-asset-update', {
          method: 'POST',
          body: { partnerId: state.partnerId, assetId: assetId, title: title }
        });
        if (res.ok && res.body && res.body.ok) {
          syncAssetsFromPayload(res.body);
          setSaveUi('ok', 'Titel opgeslagen');
        }
      }, 500);
    });

    portfolioGrid.addEventListener('dragstart', function (ev) {
      if (!state.canEdit) return;
      var item = ev.target.closest('[data-asset-id]');
      if (!item) return;
      state.dragAssetId = item.getAttribute('data-asset-id');
      item.classList.add('is-dragging');
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', state.dragAssetId);
      }
    });
    portfolioGrid.addEventListener('dragend', function (ev) {
      var item = ev.target.closest('[data-asset-id]');
      if (item) item.classList.remove('is-dragging');
      state.dragAssetId = null;
    });
    portfolioGrid.addEventListener('dragover', function (ev) {
      ev.preventDefault();
    });
    portfolioGrid.addEventListener('drop', async function (ev) {
      ev.preventDefault();
      if (!state.canEdit) return;
      var target = ev.target.closest('[data-asset-id]');
      var fromId = state.dragAssetId || (ev.dataTransfer && ev.dataTransfer.getData('text/plain'));
      if (!target || !fromId) return;
      var toId = target.getAttribute('data-asset-id');
      if (fromId === toId) return;
      var ordered = state.assets
        .slice()
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      var fromIdx = -1;
      var toIdx = -1;
      ordered.forEach(function (a, i) {
        if (a.id === fromId) fromIdx = i;
        if (a.id === toId) toIdx = i;
      });
      if (fromIdx < 0 || toIdx < 0) return;
      var moved = ordered.splice(fromIdx, 1)[0];
      ordered.splice(toIdx, 0, moved);
      ordered.forEach(function (a, i) { a.sortOrder = i; });
      state.assets = ordered;
      renderPortfolio();
      await persistAssetOrder();
      setSaveUi('ok', 'Volgorde opgeslagen');
    });
  }

  document.addEventListener('click', function (ev) {
    var editBtn = ev.target.closest('[data-edit-step]');
    if (editBtn) {
      ev.preventDefault();
      followDeepLink(editBtn.getAttribute('data-edit-step'), null);
      return;
    }
    var deep = ev.target.closest('[data-deep-step]');
    if (deep) {
      ev.preventDefault();
      followDeepLink(deep.getAttribute('data-deep-step'), deep.getAttribute('data-deep-field'));
    }
  });

  var submitBtn = EP.$('#submitOnboardingBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      submitOrResubmit();
    });
  }
  var dataCb = EP.$('#f_data_correct');
  var editCb = EP.$('#f_editorial_ok');
  if (dataCb) {
    dataCb.addEventListener('change', function () {
      persistConfirmations();
    });
  }
  if (editCb) {
    editCb.addEventListener('change', function () {
      persistConfirmations();
    });
  }
  var gotoControleBtn = EP.$('#gotoControleBtn');
  if (gotoControleBtn) {
    gotoControleBtn.addEventListener('click', function () {
      followDeepLink('controle', null);
    });
  }
  var polishPortfolioBtn = EP.$('#polishPortfolioBtn');
  if (polishPortfolioBtn) {
    polishPortfolioBtn.addEventListener('click', function () {
      followDeepLink('portfolio', null);
    });
  }
  var polishStoryBtn = EP.$('#polishStoryBtn');
  if (polishStoryBtn) {
    polishStoryBtn.addEventListener('click', function () {
      followDeepLink('verhaal', null);
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
    state.craft = Draft.pickCraft(state.draft && state.draft.craft);
    state.offer = Draft.pickOffer(state.draft && state.draft.offer);
    state.story = Draft.pickStory(state.draft && state.draft.story);
    syncOfferWithCraft();
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
      var landingDraft = null;
      if (landing === 'bedrijf_bereik') landingDraft = collectP2Draft();
      else if (landing === 'ambacht') landingDraft = collectP3Draft();
      else if (landing === 'aanbod') landingDraft = collectP4Draft();
      else if (landing === 'verhaal') landingDraft = collectP5Draft();
      await saveStep(landing, landingDraft ? { draft: landingDraft } : {});
    }
  }).catch(function (err) {
    EP.showEl(shellEl, false);
    EP.setStatus(statusEl, err.message || 'Er ging iets mis.', 'error');
  });
})();
