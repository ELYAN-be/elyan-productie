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
  var p3Form = EP.$('#p3Form');
  var p4Form = EP.$('#p4Form');

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
    regions: [],
    craft: Draft.emptyCraft(),
    offer: Draft.emptyOffer()
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
    updateLivingPreview();
  }

  function scheduleAutosave() {
    if (!state.canEdit) return;
    if (
      state.currentStepId !== 'bedrijf_bereik' &&
      state.currentStepId !== 'start' &&
      state.currentStepId !== 'ambacht' &&
      state.currentStepId !== 'aanbod'
    ) {
      return;
    }
    var draftPatch =
      state.currentStepId === 'aanbod'
        ? collectP4Draft()
        : state.currentStepId === 'ambacht'
          ? collectP3Draft()
          : collectP2Draft();
    applyLocalDraft(draftPatch);
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      var payload =
        state.currentStepId === 'aanbod'
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
      var copy = Shell.reviewHubCopy(state.onboardingStatus);
      if (reviewHubTitle) reviewHubTitle.textContent = copy.title;
      if (reviewHubBody) reviewHubBody.textContent = copy.body;
    }

    if (stepId === 'bedrijf_bereik') {
      hydrateP2Form();
    } else if (stepId === 'ambacht') {
      hydrateP3FromDraft();
    } else if (stepId === 'aanbod') {
      hydrateP4FromDraft();
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
      } else if (stepId === 'ambacht') {
        body.draft = collectP3Draft();
      } else if (stepId === 'aanbod') {
        body.draft = collectP4Draft();
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
          state.currentStepId === 'aanbod'
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
      await saveStep(landing, landingDraft ? { draft: landingDraft } : {});
    }
  }).catch(function (err) {
    EP.showEl(shellEl, false);
    EP.setStatus(statusEl, err.message || 'Er ging iets mis.', 'error');
  });
})();
