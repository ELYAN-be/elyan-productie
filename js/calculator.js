/* ============================================================
   ELYAN — Calculator engine (dynamische vragen + resultaten)
   Vereist: /shared/pricing.js, /shared/questions.js, /shared/insights.js
   ============================================================ */
(function () {
  'use strict';

  var pricing = window.ElyanPricing;
  var questionsLib = window.ElyanQuestions;
  var insightsLib = window.ElyanInsights;

  if (!pricing || !questionsLib) {
    console.error('ELYAN: shared modules niet geladen');
    return;
  }

  var CATEGORIES = pricing.CATEGORIES;
  var PROVINCES = pricing.PROVINCES;
  var LEVEL_LABEL = pricing.LEVEL_LABEL;
  var REGION_LINKS = pricing.REGION_LINKS;
  var BTW_TIP = pricing.BTW_TIP;
  var PRAKTISCHE_TIPS = pricing.PRAKTISCHE_TIPS;
  var calcEstimate = pricing.calcEstimate;
  var fmtEUR = pricing.fmtEUR;

  function trackEvent(name, data) {
    try {
      if (typeof window.va === 'function') {
        window.va('event', { name: name, data: data || {} });
      }
    } catch (e) { /* ignore */ }
  }

  var state = {
    phase: 'type', // type | questions | loading
    qIndex: 0,
    type: null,
    answers: {},
    email: '',
    visibleQuestions: []
  };

  document.addEventListener('DOMContentLoaded', function () {
    var calculatorOverlay = document.getElementById('calculatorOverlay');
    var resultsOverlay = document.getElementById('resultsOverlay');
    var progressFill = document.getElementById('progressFill');
    var stepCount = document.getElementById('stepCount');
    var appBack = document.getElementById('appBack');
    var stepHost = document.getElementById('calcStepHost');
    var typeStep = document.getElementById('typeStep');
    var loadingStep = document.getElementById('loadingStep');
    var loadingTextEl = document.getElementById('loadingText');
    var NOTES_MAX = 500;

    /* ---------- hero demo ---------- */
    var demoExamples = [
      { cat: 'badkamer', prov: 'antwerpen', m2: 8, level: 'standaard' },
      { cat: 'dak', prov: 'west-vlaanderen', m2: 90, level: 'standaard' },
      { cat: 'keuken', prov: 'vlaams-brabant', m2: 14, level: 'premium' },
      { cat: 'vloeren', prov: 'limburg', m2: 45, level: 'basis' },
      { cat: 'schilderwerken', prov: 'namen', m2: 120, level: 'standaard' }
    ];
    var demoIndex = 0;
    var demoCard = document.getElementById('demoCard');
    var demoType = document.getElementById('demoType');
    var demoProvince = document.getElementById('demoProvince');
    var demoSize = document.getElementById('demoSize');
    var demoLevel = document.getElementById('demoLevel');
    var demoPrice = document.getElementById('demoPrice');
    var demoRange = document.getElementById('demoRange');

    function moneyText(n) {
      return String(fmtEUR(n)).replace(/^€\s*/, '€\u00a0').replace(/(\d)\s+(\d)/g, '$1\u00a0$2');
    }
    function setRangeEl(el, low, high) {
      if (!el) return;
      el.classList.add('price-range', 'is-stack');
      el.classList.remove('is-forced-stack');
      el.innerHTML =
        '<span class="money">' + moneyText(low) + '</span>' +
        '<span class="range-sep" aria-hidden="true">\u00a0–\u00a0</span>' +
        '<span class="range-tot" aria-hidden="true">tot </span>' +
        '<span class="money">' + moneyText(high) + '</span>';
    }

    function fitDemoPrice() {
      if (!demoPrice) return;
      demoPrice.classList.remove('is-forced-stack');
      /* Force designed stack only when one-line range would overflow the card */
      if (demoPrice.scrollWidth > demoPrice.clientWidth + 1) {
        demoPrice.classList.add('is-forced-stack');
      }
    }

    function paintDemo(i) {
      var ex = demoExamples[i];
      var r = calcEstimate(ex.cat, ex.prov, ex.m2, ex.level);
      if (demoType) demoType.textContent = CATEGORIES[ex.cat].label;
      if (demoProvince) demoProvince.textContent = PROVINCES[ex.prov].label;
      if (demoSize) demoSize.textContent = ex.m2 + ' m²';
      if (demoLevel) demoLevel.textContent = (LEVEL_LABEL && LEVEL_LABEL[ex.level]) || ex.level;
      setRangeEl(demoPrice, r.low, r.high);
      if (demoRange) demoRange.textContent = 'Verwachte prijs ' + moneyText(r.price);
      requestAnimationFrame(fitDemoPrice);
    }
    if (demoCard) {
      paintDemo(0);
      window.addEventListener('resize', fitDemoPrice);
      setInterval(function () {
        demoCard.classList.add('demo-fade');
        setTimeout(function () {
          demoIndex = (demoIndex + 1) % demoExamples.length;
          paintDemo(demoIndex);
          demoCard.classList.remove('demo-fade');
        }, 420);
      }, 4400);
    }

    function showView(view) {
      document.body.classList.toggle('lock-scroll', view !== 'home');
      calculatorOverlay.classList.toggle('active', view === 'calculator');
      resultsOverlay.classList.toggle('active', view === 'results');
      calculatorOverlay.scrollTop = 0;
      resultsOverlay.scrollTop = 0;
    }

    var calcTimeout = null;
    var msgTimer = null;
    function cancelCalculation() {
      if (calcTimeout) { clearTimeout(calcTimeout); calcTimeout = null; }
      if (msgTimer) { clearInterval(msgTimer); msgTimer = null; }
    }

    function refreshVisible() {
      if (!state.type) {
        state.visibleQuestions = [];
        return;
      }
      state.visibleQuestions = questionsLib.getVisibleQuestions(state.type, state.answers);
      // Drop antwoorden van verborgen vragen zodat ze de prijs niet beïnvloeden
      var visibleIds = {};
      state.visibleQuestions.forEach(function (q) { visibleIds[q.id] = true; });
      Object.keys(state.answers).forEach(function (key) {
        if (key === 'notes') return;
        if (!visibleIds[key]) delete state.answers[key];
      });
    }

    function totalSteps() {
      // type + visible questions
      return 1 + state.visibleQuestions.length;
    }

    function currentStepNumber() {
      if (state.phase === 'type') return 1;
      return 1 + state.qIndex + 1;
    }

    function updateProgress() {
      var total = Math.max(2, totalSteps());
      var current = state.phase === 'loading' ? total : Math.min(currentStepNumber(), total);
      var pct = Math.min(100, (current / total) * 100);
      progressFill.style.width = pct + '%';
      if (state.phase === 'loading') {
        stepCount.textContent = 'Even geduld';
      } else {
        stepCount.textContent = 'Stap ' + current + ' van ' + total;
      }
    }

    function openCalculator() {
      state.phase = 'type';
      state.qIndex = 0;
      state.type = null;
      state.answers = {};
      state.visibleQuestions = [];
      appBack.style.visibility = '';
      if (loadingStep) loadingStep.classList.remove('active');
      if (typeStep) typeStep.classList.add('active');
      if (stepHost) {
        stepHost.innerHTML = '';
        stepHost.classList.remove('active');
      }
      document.querySelectorAll('.js-type-option').forEach(function (o) { o.classList.remove('selected'); });
      updateProgress();
      showView('calculator');
    }

    function closeToHome() {
      cancelCalculation();
      if (loadingStep) loadingStep.classList.remove('active');
      showView('home');
    }

    document.querySelectorAll('[data-action="start-calculator"]').forEach(function (btn) {
      btn.addEventListener('click', openCalculator);
    });
    document.querySelectorAll('[data-action="close-app"]').forEach(function (btn) {
      btn.addEventListener('click', closeToHome);
    });

    function goPrev() {
      if (state.phase === 'loading') return;
      if (state.phase === 'type') {
        closeToHome();
        return;
      }
      if (state.qIndex <= 0) {
        state.phase = 'type';
        state.qIndex = 0;
        if (stepHost) {
          stepHost.innerHTML = '';
          stepHost.classList.remove('active');
        }
        if (typeStep) typeStep.classList.add('active');
        updateProgress();
        return;
      }
      state.qIndex--;
      // skip backwards over now-hidden questions
      refreshVisible();
      if (state.qIndex >= state.visibleQuestions.length) {
        state.qIndex = Math.max(0, state.visibleQuestions.length - 1);
      }
      renderQuestion();
    }
    appBack.addEventListener('click', goPrev);

    /* ---------- type selection ---------- */
    document.querySelectorAll('.js-type-option').forEach(function (el) {
      el.addEventListener('click', function () {
        state.type = el.dataset.type;
        document.querySelectorAll('.js-type-option').forEach(function (o) { o.classList.remove('selected'); });
        el.classList.add('selected');
        // default size from first number question presets
        refreshVisible();
        var numQ = state.visibleQuestions.filter(function (q) { return q.type === 'number'; })[0];
        if (numQ && numQ.presets && numQ.presets.length) {
          var idx = numQ.defaultPresetIndex != null ? numQ.defaultPresetIndex : 1;
          state.answers.size = numQ.presets[Math.min(idx, numQ.presets.length - 1)];
        }
        setTimeout(function () {
          state.phase = 'questions';
          state.qIndex = 0;
          if (typeStep) typeStep.classList.remove('active');
          renderQuestion();
        }, 320);
      });
    });

    function iconSvg(id) {
      return '<svg class="icon"><use href="#' + id + '"></use></svg>';
    }

    function renderQuestion() {
      refreshVisible();
      var list = state.visibleQuestions;
      if (!list.length) {
        runCalculation();
        return;
      }
      if (state.qIndex >= list.length) {
        runCalculation();
        return;
      }
      var q = list[state.qIndex];
      if (typeStep) typeStep.classList.remove('active');
      if (loadingStep) loadingStep.classList.remove('active');
      stepHost.classList.add('active');

      var html = '<div class="calc-step-inner">';
      html += '<h2 class="calc-question"></h2>';
      html += '<p class="calc-hint"></p>';
      html += '<div class="calc-q-body"></div>';
      html += '</div>';
      stepHost.innerHTML = html;
      stepHost.querySelector('.calc-question').textContent = q.question;
      stepHost.querySelector('.calc-hint').textContent = q.hint || '';
      var body = stepHost.querySelector('.calc-q-body');

      if (q.type === 'chips') {
        var grid = document.createElement('div');
        grid.className = 'option-grid option-grid-provinces';
        q.options.forEach(function (opt) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip-btn' + (state.answers[q.id] === opt.value ? ' selected' : '');
          b.textContent = opt.label;
          b.addEventListener('click', function () {
            state.answers[q.id] = opt.value;
            grid.querySelectorAll('.chip-btn').forEach(function (x) { x.classList.remove('selected'); });
            b.classList.add('selected');
            if (q.id === 'province') { /* keep */ }
            advanceAfter(q);
          });
          grid.appendChild(b);
        });
        body.appendChild(grid);
      } else if (q.type === 'cards' || q.type === 'finish') {
        var g = document.createElement('div');
        g.className = 'option-grid' + (q.type === 'finish' ? ' finish-grid' : ' cards-grid');
        if (q.options.length >= 4) g.classList.add('option-grid-4');
        q.options.forEach(function (opt) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'option-card' + (q.type === 'finish' ? ' finish-card' : '') + (state.answers[q.id] === opt.value ? ' selected' : '');
          var inner = '';
          if (opt.priceHint) inner += '<span class="finish-price">' + opt.priceHint + '</span>';
          if (opt.icon) inner += iconSvg(opt.icon);
          inner += '<span class="opt-label"></span>';
          if (opt.desc) inner += '<p></p>';
          b.innerHTML = inner;
          b.querySelector('.opt-label').textContent = opt.label;
          if (opt.desc) b.querySelector('p').textContent = opt.desc;
          b.addEventListener('click', function () {
            state.answers[q.id] = opt.value;
            g.querySelectorAll('.option-card').forEach(function (x) { x.classList.remove('selected'); });
            b.classList.add('selected');
            advanceAfter(q);
          });
          g.appendChild(b);
        });
        body.appendChild(g);
      } else if (q.type === 'number') {
        renderNumberQuestion(body, q);
      } else if (q.type === 'notes') {
        renderNotesQuestion(body, q);
      }

      updateProgress();
      calculatorOverlay.scrollTop = 0;
    }

    function advanceAfter(q) {
      if (q.autoAdvance === false) return;
      setTimeout(function () {
        goNextQuestion();
      }, 340);
    }

    function goNextQuestion() {
      var currentId = state.visibleQuestions[state.qIndex] && state.visibleQuestions[state.qIndex].id;
      refreshVisible();
      var next = 0;
      if (currentId) {
        for (var i = 0; i < state.visibleQuestions.length; i++) {
          if (state.visibleQuestions[i].id === currentId) {
            next = i + 1;
            break;
          }
        }
      } else {
        next = state.qIndex + 1;
      }
      state.qIndex = next;
      if (state.qIndex >= state.visibleQuestions.length) {
        runCalculation();
      } else {
        renderQuestion();
      }
    }

    function renderNumberQuestion(body, q) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div class="size-input-wrap">' +
          '<button type="button" class="size-btn" data-act="dec" aria-label="Verminderen">−</button>' +
          '<div class="size-display">' +
            '<input type="number" class="js-size-input" inputmode="numeric" min="' + (q.min || 1) + '" max="' + (q.max || 999) + '" aria-label="Aantal">' +
            '<span class="size-unit">' + (q.unit || 'm²') + '</span>' +
          '</div>' +
          '<button type="button" class="size-btn" data-act="inc" aria-label="Verhogen">+</button>' +
        '</div>' +
        '<p class="field-error" role="alert"></p>' +
        '<div class="size-presets"></div>' +
        '<button type="button" class="btn btn-primary btn-lg btn-block js-size-next">Volgende <svg class="icon"><use href="#i-arrow-right"></use></svg></button>';
      body.appendChild(wrap);

      var input = wrap.querySelector('.js-size-input');
      var err = wrap.querySelector('.field-error');
      var presetsEl = wrap.querySelector('.size-presets');
      var val = Number(state.answers[q.id]);
      if (!Number.isFinite(val) || val < 1) {
        val = q.presets && q.presets[q.defaultPresetIndex != null ? q.defaultPresetIndex : 1] || 20;
        state.answers[q.id] = val;
      }
      input.value = val;

      (q.presets || []).forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'preset-chip';
        b.textContent = p + ' ' + (q.unit || 'm²');
        b.addEventListener('click', function () {
          state.answers[q.id] = p;
          input.value = p;
          err.classList.remove('show');
        });
        presetsEl.appendChild(b);
      });

      input.addEventListener('input', function () {
        var v = parseInt(input.value, 10);
        state.answers[q.id] = isNaN(v) ? 0 : Math.min(q.max || 999, v);
        err.classList.remove('show');
      });
      wrap.querySelector('[data-act="inc"]').addEventListener('click', function () {
        state.answers[q.id] = Math.min(q.max || 999, (Number(state.answers[q.id]) || 0) + 1);
        input.value = state.answers[q.id];
      });
      wrap.querySelector('[data-act="dec"]').addEventListener('click', function () {
        state.answers[q.id] = Math.max(q.min || 1, (Number(state.answers[q.id]) || 1) - 1);
        input.value = state.answers[q.id];
      });
      wrap.querySelector('.js-size-next').addEventListener('click', function () {
        var v = Number(state.answers[q.id]);
        if (!v || v < (q.min || 1)) {
          err.textContent = 'Vul een geldig aantal in (minstens ' + (q.min || 1) + ').';
          err.classList.add('show');
          input.focus();
          return;
        }
        goNextQuestion();
      });
    }

    function renderNotesQuestion(body, q) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<label class="sr-only" for="notesInput">Extra opmerkingen</label>' +
        '<textarea id="notesInput" placeholder="Bijv. open keuken, inloopdouche, vloerverwarming..."></textarea>' +
        '<span class="char-count" id="notesCount">0 / ' + NOTES_MAX + '</span>' +
        '<div class="calc-actions">' +
          '<button type="button" class="btn btn-ghost js-skip-notes">Overslaan</button>' +
          '<button type="button" class="btn btn-primary btn-lg js-calc-btn">Bereken mijn renovatie <svg class="icon"><use href="#i-arrow-right"></use></svg></button>' +
        '</div>';
      body.appendChild(wrap);
      var ta = wrap.querySelector('#notesInput');
      var count = wrap.querySelector('#notesCount');
      ta.setAttribute('maxlength', String(NOTES_MAX));
      ta.value = state.answers.notes || '';
      count.textContent = ta.value.length + ' / ' + NOTES_MAX;
      ta.addEventListener('input', function () {
        state.answers.notes = ta.value;
        count.textContent = ta.value.length + ' / ' + NOTES_MAX;
      });
      wrap.querySelector('.js-skip-notes').addEventListener('click', function () {
        state.answers.notes = '';
        runCalculation();
      });
      wrap.querySelector('.js-calc-btn').addEventListener('click', function () {
        runCalculation();
      });
    }

    function runCalculation() {
      cancelCalculation();
      state.phase = 'loading';
      if (typeStep) typeStep.classList.remove('active');
      if (stepHost) {
        stepHost.classList.remove('active');
        stepHost.innerHTML = '';
      }
      loadingStep.classList.add('active');
      appBack.style.visibility = 'hidden';
      updateProgress();
      progressFill.style.width = '100%';

      var provinceLabel = PROVINCES[state.answers.province] ? PROVINCES[state.answers.province].label : 'jouw regio';
      var messages = [
        'Jouw antwoorden analyseren...',
        'Belgische richtprijzen vergelijken in ' + provinceLabel + '...',
        'Kostenposten berekenen...',
        'Persoonlijk rapport voorbereiden...'
      ];
      var i = 0;
      loadingTextEl.textContent = messages[0];
      loadingTextEl.style.opacity = 1;
      msgTimer = setInterval(function () {
        i++;
        if (i < messages.length) {
          loadingTextEl.style.opacity = 0;
          setTimeout(function () {
            loadingTextEl.textContent = messages[i];
            loadingTextEl.style.opacity = 1;
          }, 220);
        }
      }, 800);

      calcTimeout = setTimeout(function () {
        cancelCalculation();
        loadingStep.classList.remove('active');
        appBack.style.visibility = '';
        showResults();
        trackEvent('calculation_completed', { type: state.type, province: state.answers.province, level: state.answers.level });
      }, 3000);
    }

    function setCostRow(key, amount, pct) {
      var row = document.querySelector('[data-cost="' + key + '"]');
      if (!row) return;
      row.querySelector('.amt').textContent = fmtEUR(amount);
      var fill = row.querySelector('.cost-bar-fill');
      fill.dataset.pct = Math.round(pct * 100);
      fill.style.width = '0%';
    }

    function showResults() {
      var answers = Object.assign({}, state.answers);
      if (!answers.province && state.answers.province) answers.province = state.answers.province;
      var r = calcEstimate(state.type, answers.province, answers);
      var cat = CATEGORIES[state.type];
      var prov = PROVINCES[answers.province];
      var pack = insightsLib ? insightsLib.buildInsights(state.type, answers, r, pricing) : { insights: cat ? [] : [], recommendations: [], planning: [], risks: [], btwTip: BTW_TIP };

      document.getElementById('resultsTitle').textContent = 'Jouw ' + cat.resultNoun + ' in ' + prov.label;
      setRangeEl(document.getElementById('resultPrice'), r.low, r.high);
      document.getElementById('resultRange').textContent = 'Richtprijs ' + moneyText(r.price) + '  ·  ca. ' + moneyText(r.perM2) + '/m²';
      document.getElementById('resultDuration').textContent = r.weeksLow + ' – ' + r.weeksHigh + ' weken';

      // Update price card label if present
      var priceLabel = document.querySelector('.price-card .label');
      if (priceLabel) priceLabel.textContent = 'Geschatte prijsvork';

      var materiaalBedrag = (r.amounts && r.amounts.materiaal != null)
        ? r.amounts.materiaal
        : Math.round(r.price * r.split.materiaal);
      var arbeidBedrag = (r.amounts && r.amounts.arbeid != null)
        ? r.amounts.arbeid
        : Math.round(r.price * r.split.arbeid);
      var overigeBedrag = (r.amounts && r.amounts.overige != null)
        ? r.amounts.overige
        : (r.price - materiaalBedrag - arbeidBedrag);
      setCostRow('materiaal', materiaalBedrag, r.split.materiaal);
      setCostRow('arbeid', arbeidBedrag, r.split.arbeid);
      setCostRow('overige', overigeBedrag, r.split.overige);

      var aandachtsList = document.getElementById('aandachtspuntenList');
      aandachtsList.innerHTML = '';
      var attention = (pack.insights || []).slice(0, 4);
      if (pack.risks && pack.risks.length) attention = attention.concat(pack.risks.slice(0, 1));
      if (!attention.length && cat) {
        attention = (r.drivers || []).map(function (d) { return d.text; }).slice(0, 3);
      }
      attention.slice(0, 4).forEach(function (t) {
        var li = document.createElement('li');
        li.className = 'tip-item';
        li.innerHTML = iconSvg('i-info') + '<span></span>';
        li.querySelector('span').textContent = t;
        aandachtsList.appendChild(li);
      });

      var tipsList = document.getElementById('praktischeTipsList');
      tipsList.innerHTML = '';
      var tips = (pack.recommendations || []).slice(0, 2).concat(PRAKTISCHE_TIPS.slice(0, 2));
      tips.slice(0, 4).forEach(function (t) {
        var li = document.createElement('li');
        li.className = 'tip-item';
        li.innerHTML = iconSvg('i-bulb') + '<span></span>';
        li.querySelector('span').textContent = t;
        tipsList.appendChild(li);
      });

      document.getElementById('premieNote').textContent = cat.premieNote;
      document.getElementById('btwTipText').textContent = pack.btwTip || BTW_TIP;
      var regionLink = REGION_LINKS[prov.region];
      var premieLinkEl = document.getElementById('premieLink');
      premieLinkEl.textContent = regionLink.label;
      premieLinkEl.href = regionLink.url;

      document.getElementById('emailCaptureForm').style.display = '';
      document.getElementById('emailSuccessState').classList.remove('show');
      document.getElementById('emailInput').value = '';
      document.getElementById('emailInput').classList.remove('invalid');
      document.getElementById('emailErrorMsg').classList.remove('show');
      setSubmitLoading(false);

      showView('results');
      setTimeout(function () {
        document.querySelectorAll('.cost-bar-fill').forEach(function (el) {
          el.style.width = el.dataset.pct + '%';
        });
      }, 100);
    }

    function isValidEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    var submitBtn = document.getElementById('submitEmailBtn');
    function setSubmitLoading(loading) {
      submitBtn.classList.toggle('is-loading', loading);
      submitBtn.disabled = loading;
    }

    function requestReport() {
      var input = document.getElementById('emailInput');
      var email = input.value.trim();
      var errorEl = document.getElementById('emailErrorMsg');
      if (!isValidEmail(email)) {
        errorEl.textContent = 'Vul een geldig e-mailadres in.';
        errorEl.classList.add('show');
        input.classList.add('invalid');
        input.focus();
        return;
      }
      errorEl.classList.remove('show');
      input.classList.remove('invalid');
      setSubmitLoading(true);

      var answers = Object.assign({}, state.answers);
      fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: state.type,
          province: answers.province,
          size: answers.size,
          level: answers.level,
          notes: (answers.notes || '').slice(0, 500),
          answers: answers
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('request_failed');
        return res.json();
      }).then(function () {
        state.email = email;
        document.getElementById('emailCaptureForm').style.display = 'none';
        document.getElementById('emailSuccessState').classList.add('show');
        trackEvent('email_submitted', { type: state.type, province: answers.province });
      }).catch(function () {
        errorEl.textContent = 'Er ging iets mis bij het verzenden. Probeer het opnieuw of mail ons op elyan.info@gmail.com.';
        errorEl.classList.add('show');
      }).finally(function () {
        setSubmitLoading(false);
      });
    }

    submitBtn.addEventListener('click', requestReport);
    document.getElementById('emailInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); requestReport(); }
    });

    document.querySelectorAll('[data-action="restart"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cancelCalculation();
        state.phase = 'type';
        state.qIndex = 0;
        state.type = null;
        state.answers = {};
        state.email = '';
        state.visibleQuestions = [];
        document.querySelectorAll('.option-card.selected, .chip-btn.selected').forEach(function (o) { o.classList.remove('selected'); });
        if (stepHost) { stepHost.innerHTML = ''; stepHost.classList.remove('active'); }
        if (typeStep) typeStep.classList.add('active');
        if (loadingStep) loadingStep.classList.remove('active');
        updateProgress();
        showView('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (resultsOverlay.classList.contains('active')) closeToHome();
        else if (calculatorOverlay.classList.contains('active')) closeToHome();
      }
    });

    updateProgress();
  });
})();
