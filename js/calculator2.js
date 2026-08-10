/* ============================================================
   ELYAN Calculator 2 — UI controller
   Phase 3: raw per-package pricing review (no project total)
   Isolated from js/calculator.js
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var Scope = window.ElyanCalc2Scope;
    var Property = window.ElyanCalc2Property;
    var StateApi = window.ElyanCalc2State;
    var Questions = window.ElyanCalc2Questions;
    var PackageEngine = window.ElyanCalc2PackageEngine;
    var ProjectEngine = window.ElyanCalc2ProjectEngine;
    var FinanceEngine = window.ElyanCalc2FinanceEngine;
    var UiResults = window.ElyanCalc2UiResults;
    var Labels = window.ElyanCalc2ResultLabels;
    if (!Scope || !Property || !StateApi || !Questions) {
      console.warn('[ELYAN Calc2] modules missing — UI not started');
      return;
    }

    var overlay = document.getElementById('calc2Overlay');
    var host = document.getElementById('calc2StepHost');
    var progressFill = document.getElementById('calc2ProgressFill');
    var progressLabel = document.getElementById('calc2ProgressLabel');
    var sectionTabs = document.getElementById('calc2SectionTabs');
    var backBtn = document.getElementById('calc2Back');
    if (!overlay || !host) return;

    var state = StateApi.createState();
    var flowIndex = 0;
    var flow = Questions.buildFlow(state);
    var pendingReviewAnimation = false;
    var ANALYSIS_MESSAGES = [
      'Renovatiewerken analyseren…',
      'Dubbele kosten controleren…',
      'Projectrisico’s verwerken…',
      'Budgetscenario opbouwen…'
    ];
    var FINANCE_ANALYSIS_MESSAGES = [
      'Aankoopkosten verwerken…',
      'Financieel scenario berekenen…',
      'Break-even analyseren…'
    ];

    function escapeHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function rebuildFlow(keepId) {
      var prevId = keepId || (flow[flowIndex] && flow[flowIndex].id);
      flow = Questions.buildFlow(state);
      var next = 0;
      if (prevId) {
        for (var i = 0; i < flow.length; i++) {
          if (flow[i].id === prevId) { next = i; break; }
        }
      }
      flowIndex = Math.min(next, flow.length - 1);
    }

    function currentNode() {
      return flow[flowIndex] || flow[0];
    }

    function visibleSections() {
      return StateApi.SECTIONS.filter(function (s) {
        return s.id !== 'finance' || state.goal === 'investor';
      });
    }

    function updateChrome() {
      var node = currentNode();
      var section = node.section || 'goal';
      var secs = visibleSections();
      var idx = 0;
      for (var si = 0; si < secs.length; si++) {
        if (secs[si].id === section) { idx = si; break; }
      }
      var pct = Math.round(((idx + 1) / secs.length) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressLabel) {
        progressLabel.textContent = (secs[idx] && secs[idx].label) || 'Project';
      }
      if (sectionTabs) {
        sectionTabs.innerHTML = secs.map(function (s, i) {
          var active = s.id === section ? ' is-active' : '';
          var done = i < idx ? ' is-done' : '';
          return '<li class="calc2-sec' + active + done + '" aria-current="' + (s.id === section ? 'step' : 'false') + '">' +
            escapeHtml(s.label) + '</li>';
        }).join('');
      }
      if (backBtn) backBtn.disabled = flowIndex === 0;
    }

    function goTo(index) {
      flowIndex = Math.max(0, Math.min(index, flow.length - 1));
      render();
    }

    function next() {
      StateApi.touch(state);
      rebuildFlow(flow[flowIndex] && flow[flowIndex].id);
      if (flowIndex < flow.length - 1) {
        var nextNode = flow[flowIndex + 1];
        if (nextNode && nextNode.id === 'review') pendingReviewAnimation = true;
        goTo(flowIndex + 1);
      } else render();
    }

    function prev() {
      if (flowIndex > 0) goTo(flowIndex - 1);
    }

    function setDetail(packageId, key, value) {
      if (!state.packageDetails[packageId]) state.packageDetails[packageId] = {};
      state.packageDetails[packageId][key] = value;
      StateApi.touch(state);
    }

    function getDetail(packageId, key) {
      return state.packageDetails[packageId] && state.packageDetails[packageId][key];
    }

    function openCalculator2() {
      var calc1Overlay = document.getElementById('calculatorOverlay');
      var resultsOv = document.getElementById('resultsOverlay');
      if (calc1Overlay && calc1Overlay.classList.contains('active')) {
        calc1Overlay.classList.remove('active');
      }
      if (resultsOv && resultsOv.classList.contains('active')) {
        resultsOv.classList.remove('active');
      }
      state = StateApi.createState();
      flowIndex = 0;
      flow = Questions.buildFlow(state);
      pendingReviewAnimation = false;
      overlay.classList.add('active');
      document.body.classList.add('lock-scroll');
      render();
      try { overlay.focus(); } catch (e) {}
    }

    function closeCalculator2() {
      overlay.classList.remove('active');
      if (!document.getElementById('calculatorOverlay') ||
          !document.getElementById('calculatorOverlay').classList.contains('active')) {
        if (!document.getElementById('resultsOverlay') ||
            !document.getElementById('resultsOverlay').classList.contains('active')) {
          document.body.classList.remove('lock-scroll');
        }
      }
    }

    /* ---------- render helpers ---------- */

    function cardOptions(options, selected, name) {
      return '<div class="calc2-cards" role="radiogroup" aria-label="' + escapeHtml(name) + '">' +
        options.map(function (o) {
          var sel = selected === o.value ? ' selected' : '';
          return '<button type="button" class="calc2-card' + sel + '" data-value="' + escapeHtml(o.value) + '" role="radio" aria-checked="' + (selected === o.value) + '">' +
            '<span class="calc2-card-title">' + escapeHtml(o.label) + '</span>' +
            (o.desc || o.support ? '<span class="calc2-card-desc">' + escapeHtml(o.desc || o.support) + '</span>' : '') +
            '</button>';
        }).join('') + '</div>';
    }

    function chipOptions(options, selected, name) {
      return '<div class="calc2-chips" role="radiogroup" aria-label="' + escapeHtml(name) + '">' +
        options.map(function (o) {
          var sel = selected === o.value ? ' selected' : '';
          return '<button type="button" class="calc2-chip' + sel + '" data-value="' + escapeHtml(o.value) + '" role="radio" aria-checked="' + (selected === o.value) + '">' +
            escapeHtml(o.label) + '</button>';
        }).join('') + '</div>';
    }

    function navRow(opts) {
      opts = opts || {};
      return '<div class="calc2-nav">' +
        (opts.showNext
          ? '<button type="button" class="btn btn-primary btn-lg calc2-next"' + (opts.nextDisabled ? ' disabled' : '') + '>' +
              (opts.nextLabel || 'Verder') +
              ' <svg class="icon"><use href="#i-arrow-right"></use></svg></button>'
          : '') +
        (opts.note ? '<p class="calc2-nav-note">' + escapeHtml(opts.note) + '</p>' : '') +
        '</div>';
    }

    function screenShell(title, hint, bodyHtml, navOpts) {
      return '<div class="calc2-screen">' +
        '<h2 class="calc2-title" id="calc2Title">' + escapeHtml(title) + '</h2>' +
        (hint ? '<p class="calc2-hint">' + escapeHtml(hint) + '</p>' : '') +
        '<div class="calc2-body">' + bodyHtml + '</div>' +
        navRow(navOpts) +
        '</div>';
    }

    /* ---------- screens ---------- */

    function renderGoal() {
      var goals = [StateApi.GOALS.homeowner, StateApi.GOALS.investor];
      host.innerHTML = screenShell(
        'Wat wil je doen?',
        'Kies het traject dat het best bij jouw situatie past. Je kan later nog wijzigen.',
        cardOptions(goals.map(function (g) {
          return { value: g.value, label: g.label, support: g.support };
        }), state.goal, 'Doel'),
        { showNext: true, nextDisabled: !state.goal }
      );
      host.querySelectorAll('.calc2-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.goal = btn.getAttribute('data-value');
          StateApi.touch(state);
          rebuildFlow('goal');
          render();
        });
      });
      bindNext(function () { if (state.goal) next(); });
    }

    function renderLocation() {
      var p = state.propertyProfile;
      var derivedNote = p.provinceDerived && p.province
        ? 'Provincie automatisch afgeleid uit postcode — je kan dit corrigeren.'
        : 'Vul postcode in; provincie wordt waar mogelijk voorgesteld.';
      host.innerHTML = screenShell(
        'Waar ligt de woning?',
        derivedNote,
        '<div class="calc2-form-grid">' +
          '<label class="calc2-field"><span>Postcode</span>' +
            '<input type="text" inputmode="numeric" autocomplete="postal-code" id="calc2Postcode" maxlength="4" value="' + escapeHtml(p.postcode || '') + '" placeholder="bv. 9000">' +
          '</label>' +
          '<label class="calc2-field"><span>Gemeente</span>' +
            '<input type="text" autocomplete="address-level2" id="calc2Municipality" value="' + escapeHtml(p.municipality || '') + '" placeholder="bv. Gent">' +
          '</label>' +
        '</div>' +
        '<p class="calc2-sublabel">Provincie / regio</p>' +
        chipOptions(Property.PROVINCES.map(function (x) {
          return { value: x.value, label: x.label };
        }), p.province, 'Provincie'),
        { showNext: true, nextDisabled: !(p.postcode && p.postcode.length >= 4 && p.province) }
      );

      var pc = host.querySelector('#calc2Postcode');
      var mun = host.querySelector('#calc2Municipality');
      function refreshNextState() {
        var n = host.querySelector('.calc2-next');
        if (n) n.disabled = !(p.postcode && p.postcode.length >= 4 && p.province);
      }
      pc.addEventListener('input', function () {
        p.postcode = pc.value.replace(/\D/g, '').slice(0, 4);
        pc.value = p.postcode;
        var derived = Property.deriveProvinceFromPostcode(p.postcode);
        if (derived && p.postcode.length === 4) {
          p.province = derived;
          p.provinceDerived = true;
          host.querySelectorAll('.calc2-chip').forEach(function (btn) {
            var on = btn.getAttribute('data-value') === p.province;
            btn.classList.toggle('selected', on);
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
          });
        }
        StateApi.touch(state);
        refreshNextState();
      });
      mun.addEventListener('input', function () {
        p.municipality = mun.value;
        StateApi.touch(state);
      });
      host.querySelectorAll('.calc2-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          p.province = btn.getAttribute('data-value');
          p.provinceDerived = false;
          StateApi.touch(state);
          host.querySelectorAll('.calc2-chip').forEach(function (b) {
            var on = b === btn;
            b.classList.toggle('selected', on);
            b.setAttribute('aria-checked', on ? 'true' : 'false');
          });
          refreshNextState();
        });
      });
      bindNext(function () {
        if (p.postcode && p.postcode.length >= 4 && p.province) next();
      });
    }

    function renderSimpleChoice(title, hint, options, getter, setter) {
      var selected = getter();
      host.innerHTML = screenShell(
        title, hint,
        cardOptions(options, selected, title),
        { showNext: true, nextDisabled: !selected }
      );
      host.querySelectorAll('.calc2-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setter(btn.getAttribute('data-value'));
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () { if (getter()) next(); });
    }

    function renderAreaFloors() {
      var p = state.propertyProfile;
      host.innerHTML = screenShell(
        'Hoe groot is de woning?',
        'Gebruik de bewoonbare oppervlakte als schatting.',
        '<p class="calc2-sublabel">Bewoonbare oppervlakte</p>' +
        '<div class="calc2-chips" id="calc2AreaPresets">' +
          Property.AREA_PRESETS.map(function (n) {
            var sel = Number(p.areaM2) === n ? ' selected' : '';
            return '<button type="button" class="calc2-chip' + sel + '" data-area="' + n + '">' + n + ' m²</button>';
          }).join('') +
          '<button type="button" class="calc2-chip' + (p.areaM2 === 'weet_niet' ? ' selected' : '') + '" data-area="weet_niet">Weet ik niet</button>' +
        '</div>' +
        '<label class="calc2-field calc2-field-spaced"><span>Of vul zelf in (m²)</span>' +
          '<input type="number" id="calc2AreaCustom" min="20" max="800" inputmode="numeric" value="' +
            (p.areaM2 && p.areaM2 !== 'weet_niet' ? escapeHtml(p.areaM2) : '') + '" placeholder="bv. 135">' +
        '</label>' +
        '<p class="calc2-sublabel">Aantal verdiepingen</p>' +
        '<div class="calc2-chips" id="calc2FloorChips" role="radiogroup" aria-label="Verdiepingen">' +
          Property.FLOORS.map(function (o) {
            var sel = p.floors === o.value ? ' selected' : '';
            return '<button type="button" class="calc2-chip' + sel + '" data-value="' + o.value + '" role="radio" aria-checked="' + (p.floors === o.value) + '">' +
              escapeHtml(o.label) + '</button>';
          }).join('') +
        '</div>',
        { showNext: true, nextDisabled: !(p.areaM2 && p.floors) }
      );
      host.querySelectorAll('#calc2AreaPresets .calc2-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = btn.getAttribute('data-area');
          p.areaM2 = v === 'weet_niet' ? 'weet_niet' : Number(v);
          StateApi.touch(state);
          render();
        });
      });
      var custom = host.querySelector('#calc2AreaCustom');
      custom.addEventListener('change', function () {
        var n = Number(custom.value);
        if (n >= 20 && n <= 800) {
          p.areaM2 = n;
          StateApi.touch(state);
          render();
        }
      });
      host.querySelectorAll('#calc2FloorChips .calc2-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          p.floors = btn.getAttribute('data-value');
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () { if (p.areaM2 && p.floors) next(); });
    }

    function renderScope() {
      var rows = Scope.WORK_PACKAGES.map(function (pkg) {
        var current = state.scope[pkg.id];
        return '<div class="calc2-scope-row" data-pkg="' + escapeHtml(pkg.id) + '">' +
          '<div class="calc2-scope-head">' +
            '<svg class="icon" aria-hidden="true"><use href="#' + escapeHtml(pkg.icon) + '"></use></svg>' +
            '<span class="calc2-scope-label">' + escapeHtml(pkg.label) + '</span>' +
          '</div>' +
          '<div class="calc2-scope-choices" role="radiogroup" aria-label="' + escapeHtml(pkg.label) + '">' +
            Scope.INTENSITY.map(function (opt) {
              var sel = current === opt.value ? ' selected' : '';
              return '<button type="button" class="calc2-scope-chip' + sel + '" data-value="' + escapeHtml(opt.value) + '" title="' + escapeHtml(opt.label) + '" role="radio" aria-checked="' + (current === opt.value) + '">' +
                escapeHtml(opt.short) + '</button>';
            }).join('') +
          '</div></div>';
      }).join('');

      var allSet = Scope.WORK_PACKAGES.every(function (p) { return !!state.scope[p.id]; });
      host.innerHTML = screenShell(
        'Welke werken staan op het plan?',
        'Kies per onderdeel de intensiteit. “Weet ik niet” is een geldig antwoord.',
        '<div class="calc2-scope-legend" aria-hidden="true">' +
          Scope.INTENSITY.map(function (o) {
            return '<span><strong>' + escapeHtml(o.short) + '</strong> ' + escapeHtml(o.label) + '</span>';
          }).join('') +
        '</div>' +
        '<div class="calc2-scope-list">' + rows + '</div>',
        { showNext: true, nextDisabled: !allSet, nextLabel: 'Details bekijken' }
      );

      host.querySelectorAll('.calc2-scope-row').forEach(function (row) {
        var pkgId = row.getAttribute('data-pkg');
        row.querySelectorAll('.calc2-scope-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            state.scope[pkgId] = btn.getAttribute('data-value');
            if (!Scope.isActiveIntensity(state.scope[pkgId])) {
              delete state.packageDetails[pkgId];
            }
            StateApi.touch(state);
            rebuildFlow('scope');
            render();
          });
        });
      });
      bindNext(function () {
        if (Scope.WORK_PACKAGES.every(function (p) { return !!state.scope[p.id]; })) next();
      });
    }

    function renderDetail(node) {
      var item = node.detail;
      var q = item.question;
      var selected = getDetail(item.packageId, q.id);
      var badge = '<div class="calc2-pkg-badge">' +
        '<span class="calc2-pkg-badge-name">' + escapeHtml(item.packageLabel) + '</span>' +
        '<span class="calc2-pkg-badge-int">' + escapeHtml(Scope.intensityLabel(item.intensity)) + '</span>' +
        '</div>';

      var body = badge;
      if (q.type === 'number') {
        body += '<div class="calc2-chips" id="calc2DetailPresets">' +
          (q.presets || []).map(function (n) {
            var sel = Number(selected) === n ? ' selected' : '';
            return '<button type="button" class="calc2-chip' + sel + '" data-val="' + n + '">' + n + ' ' + escapeHtml(q.unit || '') + '</button>';
          }).join('') +
          '<button type="button" class="calc2-chip' + (selected === 'weet_niet' ? ' selected' : '') + '" data-val="weet_niet">Weet ik niet</button>' +
        '</div>' +
        '<label class="calc2-field calc2-field-spaced"><span>Of vul zelf in' + (q.unit ? ' (' + escapeHtml(q.unit) + ')' : '') + '</span>' +
          '<input type="number" id="calc2DetailCustom" inputmode="numeric" value="' +
            (selected && selected !== 'weet_niet' ? escapeHtml(selected) : '') + '">' +
        '</label>';
      } else if (q.type === 'cards') {
        body += cardOptions(q.options, selected, q.title);
      } else {
        body += chipOptions(q.options, selected, q.title);
      }

      var canContinue = q.optional ? true : !!selected;
      host.innerHTML = screenShell(
        q.title,
        q.hint || null,
        body,
        { showNext: true, nextDisabled: !canContinue && !q.optional, nextLabel: 'Volgende' }
      );

      if (q.type === 'number') {
        host.querySelectorAll('#calc2DetailPresets .calc2-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var v = btn.getAttribute('data-val');
            setDetail(item.packageId, q.id, v === 'weet_niet' ? 'weet_niet' : Number(v));
            render();
          });
        });
        var custom = host.querySelector('#calc2DetailCustom');
        custom.addEventListener('change', function () {
          var n = Number(custom.value);
          if (n > 0) {
            setDetail(item.packageId, q.id, n);
            render();
          }
        });
      } else {
        host.querySelectorAll('.calc2-card, .calc2-chip').forEach(function (btn) {
          if (btn.closest('#calc2DetailPresets')) return;
          btn.addEventListener('click', function () {
            setDetail(item.packageId, q.id, btn.getAttribute('data-value'));
            render();
          });
        });
      }
      bindNext(function () {
        if (q.optional || getDetail(item.packageId, q.id)) next();
      });
    }

    function renderFinish() {
      host.innerHTML = screenShell(
        'Welk afwerkingsniveau past bij jouw project?',
        'Dit stuurt materiaal- en afwerkingskeuzes voor elk onderdeel.',
        cardOptions(StateApi.FINISH, state.finishProfile, 'Afwerking'),
        { showNext: true, nextDisabled: !state.finishProfile, nextLabel: 'Verder' }
      );
      host.querySelectorAll('.calc2-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.finishProfile = btn.getAttribute('data-value');
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () { if (state.finishProfile) next(); });
    }

    function fmtEUR(n) {
      if (!Number.isFinite(n)) return '—';
      return '€' + Math.round(n).toLocaleString('nl-BE');
    }

    function uiCtx(project, analysis) {
      return {
        escapeHtml: escapeHtml,
        fmtEUR: fmtEUR,
        Labels: Labels || {},
        StateApi: StateApi,
        Scope: Scope,
        Property: Property,
        state: state,
        project: project,
        analysis: analysis,
        ir: project && project.investorReadiness
      };
    }

    function renderProjectResultBlock(project) {
      if (UiResults && UiResults.buildHomeownerResultHtml) {
        return UiResults.buildHomeownerResultHtml(uiCtx(project));
      }
      if (!project) {
        return '<div class="calc2-review-card"><p class="calc2-review-note">Project-engine niet beschikbaar.</p></div>';
      }
      return '<div class="calc2-review-card"><p class="calc2-review-note">Resultatenmodule niet geladen.</p></div>';
    }

    function showAnalysisLoading(messages, thenFn) {
      if (!UiResults || !UiResults.buildAnalysisLoadingHtml) {
        thenFn();
        return;
      }
      var msgs = messages || ANALYSIS_MESSAGES;
      var idx = 0;
      host.innerHTML = UiResults.buildAnalysisLoadingHtml([msgs[0]]);
      updateChrome();
      var tick = setInterval(function () {
        idx += 1;
        if (idx < msgs.length) {
          host.innerHTML = UiResults.buildAnalysisLoadingHtml([msgs[idx]]);
        }
      }, 350);
      setTimeout(function () {
        clearInterval(tick);
        thenFn();
      }, Math.min(1400, 350 * msgs.length + 200));
    }

    function showAnalysisThenReview() {
      showAnalysisLoading(ANALYSIS_MESSAGES, renderReview);
    }

    function bindReportCapture(root, project, analysis) {
      var slot = root.querySelector('#calc2ReportCapture');
      if (!slot || !UiResults || !UiResults.buildEmailCaptureHtml) return;
      slot.innerHTML = UiResults.buildEmailCaptureHtml(uiCtx(project, analysis));

      var form = slot.querySelector('#calc2EmailForm');
      var success = slot.querySelector('#calc2EmailSuccess');
      var input = slot.querySelector('#calc2EmailInput');
      var submit = slot.querySelector('#calc2EmailSubmit');
      var errorEl = slot.querySelector('#calc2EmailError');
      if (!submit || !input) return;

      function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
      }

      function setLoading(on) {
        submit.disabled = on;
        submit.classList.toggle('is-loading', on);
      }

      submit.addEventListener('click', function () {
        var email = input.value.trim();
        if (!isValidEmail(email)) {
          if (errorEl) {
            errorEl.textContent = 'Vul een geldig e-mailadres in.';
            errorEl.classList.add('show');
          }
          input.focus();
          return;
        }
        if (errorEl) errorEl.classList.remove('show');
        setLoading(true);

        fetch('/api/send-project-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            state: JSON.parse(StateApi.serialize(state))
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('request_failed');
          return res.json();
        }).then(function () {
          if (form) form.hidden = true;
          if (success) success.hidden = false;
        }).catch(function () {
          if (errorEl) {
            errorEl.textContent = 'Je analyse is klaar, maar het rapport kon niet worden verzonden. Probeer opnieuw.';
            errorEl.classList.add('show');
          }
        }).finally(function () {
          setLoading(false);
        });
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit.click(); }
      });
    }

    function bindReviewInteractions(project) {
      host.querySelectorAll('.calc2-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var jump = btn.getAttribute('data-jump');
          for (var i = 0; i < flow.length; i++) {
            if (flow[i].id === jump) { goTo(i); return; }
          }
        });
      });
      var applyOv = host.querySelector('#calc2ApplyOverrides');
      if (applyOv) {
        applyOv.addEventListener('click', function () {
          host.querySelectorAll('[data-soft-override]').forEach(function (input) {
            var id = input.getAttribute('data-soft-override');
            var raw = String(input.value || '').trim();
            if (!raw) StateApi.setSoftCostOverride(state, id, null);
            else StateApi.setSoftCostOverride(state, id, Number(raw));
          });
          StateApi.touch(state);
          renderReview();
        });
      }
      host.querySelectorAll('[data-res-na]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          StateApi.setCostResolution(state, btn.getAttribute('data-res-na'), { mode: 'na' });
          renderReview();
        });
      });
      host.querySelectorAll('[data-res-unknown]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          StateApi.setCostResolution(state, btn.getAttribute('data-res-unknown'), { mode: 'unknown' });
          renderReview();
        });
      });
      host.querySelectorAll('[data-res-apply]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-res-apply');
          var card = btn.closest('.calc2-resolve-card');
          var amtEl = card && card.querySelector('[data-res-amount="' + id + '"]');
          var pctEl = card && card.querySelector('[data-res-pct="' + id + '"]');
          var pct = pctEl && pctEl.value !== '' ? Number(pctEl.value) : null;
          var amt = amtEl && amtEl.value !== '' ? Number(amtEl.value) : null;
          if (pct != null && isFinite(pct)) {
            StateApi.setCostResolution(state, id, { mode: 'percent', percent: pct });
          } else if (amt != null && isFinite(amt)) {
            StateApi.setCostResolution(state, id, { mode: 'amount', amount: amt });
          }
          renderReview();
        });
      });
      var restart = host.querySelector('#calc2Restart');
      if (restart) {
        restart.addEventListener('click', function () {
          state = StateApi.createState();
          flowIndex = 0;
          flow = Questions.buildFlow(state);
          pendingReviewAnimation = false;
          render();
        });
      }
      var closeDone = host.querySelector('#calc2CloseDone');
      if (closeDone) closeDone.addEventListener('click', closeCalculator2);
      var toFin = host.querySelector('#calc2ToFinance');
      if (toFin) {
        toFin.addEventListener('click', function () {
          if (project && project.investorReadiness && !project.investorReadiness.allowed) {
            var panel = host.querySelector('#calc2ResolvePanel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          next();
        });
      }
      bindReportCapture(host, project, null);
    }

    function renderReview() {
      var project = null;
      if (ProjectEngine) {
        try { project = ProjectEngine.calculateProject(state); } catch (err) {
          console.warn('[ELYAN Calc2] project engine failed', err);
        }
      }

      host.innerHTML =
        '<div class="calc2-screen calc2-review">' +
          '<h2 class="calc2-title">Je renovatieproject</h2>' +
          '<p class="calc2-hint">All-in projectbudget: renovatiewerken, projectkosten en reserve. Bedragen excl. btw.</p>' +
          renderProjectResultBlock(project) +
        '</div>';

      bindReviewInteractions(project);
    }

    function fp() {
      return StateApi.ensureFinanceProfile(state);
    }

    function numOrNull(el) {
      if (!el) return null;
      var raw = String(el.value || '').trim();
      if (!raw) return null;
      var n = Number(raw);
      return isFinite(n) ? n : null;
    }

    function renderFinancePurchase() {
      var f = fp();
      if (f.purchasePrice == null && state.propertyProfile.intendedPurchasePrice) {
        f.purchasePrice = state.propertyProfile.intendedPurchasePrice;
      }
      host.innerHTML = screenShell(
        'Aankoopprijs',
        'Regionale aankoopkosten volgen uit provincie. Investor-default: geen verlaagd eigenaars-tarief.',
        '<label class="calc2-field"><span>Beoogde / huidige aankoopprijs (€)</span>' +
          '<input type="number" id="finPurchase" min="1" step="1000" value="' +
            (f.purchasePrice != null ? escapeHtml(f.purchasePrice) : '') + '"></label>' +
        '<p class="calc2-hint">Provincie: <strong>' + escapeHtml(Property.provinceLabel(state.propertyProfile.province)) +
          '</strong> — registratie volgens regio (niet één nationaal %). Eigendom: ' +
          escapeHtml(state.propertyProfile.ownershipStatus === 'owned' ? 'reeds gekocht' : 'nog niet / in overweging') + '.</p>',
        { showNext: true, nextDisabled: false }
      );
      bindNext(function () {
        var n = numOrNull(host.querySelector('#finPurchase'));
        if (n == null || n <= 0) return;
        f.purchasePrice = n;
        state.propertyProfile.intendedPurchasePrice = n;
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceBuyer() {
      var f = fp();
      host.innerHTML = screenShell(
        'Koper & gebruik',
        'Beïnvloedt welk registratietarief we als default tonen. Bij twijfel: markeer als investering/flip.',
        '<div class="calc2-choice-grid">' +
          [
            { v: 'natural', l: 'Natuurlijk persoon', d: 'Privé-aankoop' },
            { v: 'company', l: 'Vennootschap', d: 'Meestal standaard registratietarief' }
          ].map(function (o) {
            return '<button type="button" class="calc2-choice' + (f.buyerType === o.v ? ' is-selected' : '') +
              '" data-buyer="' + o.v + '"><strong>' + o.l + '</strong><span>' + o.d + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="calc2-choice-grid" style="margin-top:12px">' +
          [
            { v: 'flip', l: 'Kopen-renoveren-verkopen', d: 'Investor-default (standaard registratie)' },
            { v: 'owner_occupier', l: 'Enige eigen woning', d: 'Alleen als je écht voldoet aan verlaagd tarief' },
            { v: 'unknown', l: 'Weet ik nog niet', d: 'We blijven bij investor-default' }
          ].map(function (o) {
            return '<button type="button" class="calc2-choice' + (f.intendedUse === o.v ? ' is-selected' : '') +
              '" data-use="' + o.v + '"><strong>' + o.l + '</strong><span>' + o.d + '</span></button>';
          }).join('') +
        '</div>',
        { showNext: true, nextDisabled: !f.buyerType || !f.intendedUse }
      );
      host.querySelectorAll('[data-buyer]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          f.buyerType = btn.getAttribute('data-buyer');
          if (f.buyerType === 'company') f.ownerOccupierOnlyHome = false;
          StateApi.touch(state);
          render();
        });
      });
      host.querySelectorAll('[data-use]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          f.intendedUse = btn.getAttribute('data-use');
          f.ownerOccupierOnlyHome = f.intendedUse === 'owner_occupier' && f.buyerType === 'natural';
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () { if (f.buyerType && f.intendedUse) next(); });
    }

    function renderFinanceFunding() {
      var f = fp();
      var fin = f.financing;
      host.innerHTML = screenShell(
        'Financiering',
        'Eenvoudig holding-model: rente ≈ lening × rente% × (maanden/12). Geen complex aflossingsschema.',
        '<div class="calc2-choice-grid">' +
          [
            { v: 'own_funds', l: 'Enkel eigen middelen', d: 'Geen rente' },
            { v: 'mortgage', l: 'Hypotheek / lening', d: 'Rente tijdens holding' },
            { v: 'mixed', l: 'Gemengd', d: 'Deels eigen, deels lening' },
            { v: 'unknown', l: 'Weet ik nog niet', d: 'Verlaagt financial confidence' }
          ].map(function (o) {
            return '<button type="button" class="calc2-choice' + (fin.mode === o.v ? ' is-selected' : '') +
              '" data-fin="' + o.v + '"><strong>' + o.l + '</strong><span>' + o.d + '</span></button>';
          }).join('') +
        '</div>' +
        ((fin.mode === 'mortgage' || fin.mode === 'mixed')
          ? '<div class="calc2-field-grid">' +
              '<label class="calc2-field"><span>Leenbedrag (€)</span><input type="number" id="finLoan" min="0" step="1000" value="' +
                (fin.loanAmount != null ? escapeHtml(fin.loanAmount) : '') + '"></label>' +
              '<label class="calc2-field"><span>Rente (% / jaar)</span><input type="number" id="finRate" min="0" step="0.1" value="' +
                (fin.interestRate != null ? escapeHtml(fin.interestRate) : '') + '"></label>' +
              '<label class="calc2-field"><span>Holdingperiode (maanden)</span><input type="number" id="finMonths" min="1" step="1" value="' +
                (fin.holdingMonths != null ? escapeHtml(fin.holdingMonths) : '6') + '"></label>' +
              '<label class="calc2-field"><span>Eenmalige bankkosten (€)</span><input type="number" id="finOne" min="0" step="50" value="' +
                (fin.oneTimeCosts != null ? escapeHtml(fin.oneTimeCosts) : '0') + '"></label>' +
            '</div>'
          : '<label class="calc2-field"><span>Verwachte holdingperiode (maanden)</span>' +
              '<input type="number" id="finMonths" min="1" step="1" value="' +
              (fin.holdingMonths != null ? escapeHtml(fin.holdingMonths) : '6') + '"></label>'),
        { showNext: true, nextDisabled: !fin.mode }
      );
      host.querySelectorAll('[data-fin]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          fin.mode = btn.getAttribute('data-fin');
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () {
        fin.holdingMonths = numOrNull(host.querySelector('#finMonths')) || 6;
        if (fin.mode === 'mortgage' || fin.mode === 'mixed') {
          fin.loanAmount = numOrNull(host.querySelector('#finLoan'));
          fin.interestRate = numOrNull(host.querySelector('#finRate'));
          fin.oneTimeCosts = numOrNull(host.querySelector('#finOne')) || 0;
        }
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceHolding() {
      var f = fp();
      var h = f.holding;
      host.innerHTML = screenShell(
        'Holdingkosten',
        'Geen universeel Belgisch maandbedrag. Vul in wat je verwacht (onroerende voorheffing, verzekering, nuts, leegstand).',
        '<label class="calc2-field"><span>Totale maandelijkse holdingkosten (€)</span>' +
          '<input type="number" id="finHoldM" min="0" step="10" placeholder="bv. 250" value="' +
            (h.monthlyTotal != null ? escapeHtml(h.monthlyTotal) : '') + '"></label>' +
        '<button type="button" class="btn btn-ghost" id="finHoldZero">Ik reken €0 holding (bewust)</button>' +
        '<p class="calc2-hint">Leeg laten zonder “€0” verlaagt confidence — we modelleren dan €0 zonder claim dat het klopt.</p>',
        { showNext: true, nextDisabled: false }
      );
      host.querySelector('#finHoldZero').addEventListener('click', function () {
        h.monthlyTotal = 0;
        h.explicitZero = true;
        StateApi.touch(state);
        next();
      });
      bindNext(function () {
        var n = numOrNull(host.querySelector('#finHoldM'));
        if (n != null) {
          h.monthlyTotal = n;
          h.explicitZero = n === 0;
        }
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceSelling() {
      var f = fp();
      var s = f.selling;
      host.innerHTML = screenShell(
        'Hoe wil je verkopen?',
        'Makelaarscommissie is vrij onderhandelbaar (BIV: geen vast tarief). Marktband ca. 2–4% excl. 21% btw.',
        '<div class="calc2-choice-grid">' +
          [
            { v: 'self', l: 'Zelf verkopen', d: 'Geen makelaarscommissie in model' },
            { v: 'agent', l: 'Via vastgoedmakelaar', d: 'Default 3% excl. btw + 21% btw' },
            { v: 'unknown', l: 'Nog onbekend', d: 'Geen commissie; lagere confidence' }
          ].map(function (o) {
            return '<button type="button" class="calc2-choice' + (s.mode === o.v ? ' is-selected' : '') +
              '" data-sell="' + o.v + '"><strong>' + o.l + '</strong><span>' + o.d + '</span></button>';
          }).join('') +
        '</div>' +
        (s.mode === 'agent'
          ? '<label class="calc2-field"><span>Commissie % excl. btw (optioneel)</span>' +
              '<input type="number" id="finAgentPct" min="0" max="10" step="0.1" placeholder="3" value="' +
              (s.agentRateExVat != null ? escapeHtml(s.agentRateExVat * 100) : '') + '"></label>'
          : '') +
        '<label class="calc2-field"><span>Andere verkoopkosten (€)</span>' +
          '<input type="number" id="finSellOther" min="0" step="50" value="' +
          (s.otherSellingCosts || 0) + '"></label>',
        { showNext: true, nextDisabled: !s.mode }
      );
      host.querySelectorAll('[data-sell]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          s.mode = btn.getAttribute('data-sell');
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () {
        var pct = numOrNull(host.querySelector('#finAgentPct'));
        if (pct != null) s.agentRateExVat = pct / 100;
        s.otherSellingCosts = numOrNull(host.querySelector('#finSellOther')) || 0;
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceVat() {
      var f = fp();
      var v = f.vat;
      host.innerHTML = screenShell(
        'BTW op renovatie (cash)',
        'Calc2-bedragen zijn excl. btw. Voor flips is 21% op werken de veilige default tot je 6%-voorwaarden bevestigt (FOD: woning ≥10j, hoofdzakelijk privé, eindgebruiker). Soft/procurement blijven 21%.',
        '<div class="calc2-choice-grid">' +
          [
            { v: 'indicative_mixed', l: 'Indicatief mixed (default)', d: 'Werken 21% tot bevestiging; soft/proc 21%' },
            { v: 'six_confirmed', l: 'Ik bevestig 6% op werken', d: 'Woning ≥10j + privé-eindgebruik — jouw verantwoordelijkheid' },
            { v: 'user_confirmed', l: 'Ik ken het btw-bedrag', d: 'Eigen totaal btw-cashout' },
            { v: 'excl_cash', l: 'Rekenen excl. btw', d: 'Alleen als btw buiten scope / terugvorderbaar' }
          ].map(function (o) {
            var selected = v.mode === o.v || (o.v === 'six_confirmed' && v.worksSixPercentConfirmed && v.mode === 'indicative_mixed');
            return '<button type="button" class="calc2-choice' + (selected ? ' is-selected' : '') +
              '" data-vat="' + o.v + '"><strong>' + o.l + '</strong><span>' + o.d + '</span></button>';
          }).join('') +
        '</div>' +
        (v.mode === 'user_confirmed'
          ? '<label class="calc2-field"><span>Totaal btw-cashout renovatie (€)</span>' +
              '<input type="number" id="finVatAmt" min="0" step="50" value="' +
              (v.userVatAmount != null ? escapeHtml(v.userVatAmount) : '') + '"></label>'
          : '<p class="calc2-hint">Presentatie: INDICATIVE_MIXED_VAT / USER_CONFIRMED_VAT / EXCL_VAT. Geen juridisch advies.</p>'),
        { showNext: true, nextDisabled: !v.mode }
      );
      host.querySelectorAll('[data-vat]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-vat');
          if (mode === 'six_confirmed') {
            v.mode = 'indicative_mixed';
            v.worksSixPercentConfirmed = true;
            v.worksVatRate = 0.06;
          } else {
            v.mode = mode;
            v.worksSixPercentConfirmed = false;
            if (mode === 'indicative_mixed') v.worksVatRate = 0.21;
          }
          StateApi.touch(state);
          render();
        });
      });
      bindNext(function () {
        if (v.mode === 'user_confirmed') v.userVatAmount = numOrNull(host.querySelector('#finVatAmt'));
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceResale() {
      var f = fp();
      var r = f.resale;
      host.innerHTML = screenShell(
        'Wat denk je dat de woning na renovatie kan verkopen?',
        'Alleen jouw aannames — ELYAN doet geen geautomatiseerde waardebepaling (geen AVM, geen €/m²-scrape).',
        '<div class="calc2-field-grid">' +
          '<label class="calc2-field"><span>Conservatief (€)</span><input type="number" id="finResC" min="1" step="1000" value="' +
            (r.conservative != null ? escapeHtml(r.conservative) : '') + '"></label>' +
          '<label class="calc2-field"><span>Verwacht (€)</span><input type="number" id="finResE" min="1" step="1000" value="' +
            (r.expected != null ? escapeHtml(r.expected) : '') + '"></label>' +
          '<label class="calc2-field"><span>Sterk (€)</span><input type="number" id="finResS" min="1" step="1000" value="' +
            (r.strong != null ? escapeHtml(r.strong) : '') + '"></label>' +
        '</div>' +
        '<p class="calc2-hint">Eén waarde volstaat (vul “Verwacht”). Ontbrekende scenario’s vullen we optioneel aan met ±5% rond jouw verwachte waarde — duidelijk als modelaanname.</p>',
        { showNext: true, nextDisabled: false }
      );
      bindNext(function () {
        r.conservative = numOrNull(host.querySelector('#finResC'));
        r.expected = numOrNull(host.querySelector('#finResE'));
        r.strong = numOrNull(host.querySelector('#finResS'));
        if (!(r.expected > 0 || r.conservative > 0 || r.strong > 0)) return;
        if (!r.expected && r.conservative) r.expected = r.conservative;
        StateApi.touch(state);
        next();
      });
    }

    function renderFinanceTarget() {
      var f = fp();
      host.innerHTML = screenShell(
        'Doelrendement (project-ROI)',
        'Gebruikt voor maximale aankoopprijs. Project-ROI = potentiële projectwinst / totale projectinvestering (niet equity-ROI).',
        '<label class="calc2-field"><span>Doel project-ROI (%)</span>' +
          '<input type="number" id="finTarget" min="0" max="100" step="1" value="' +
          (f.targetRoiPercent != null ? escapeHtml(f.targetRoiPercent) : '15') + '"></label>',
        { showNext: true, nextDisabled: false, nextLabel: 'Bereken analyse' }
      );
      bindNext(function () {
        f.targetRoiPercent = numOrNull(host.querySelector('#finTarget'));
        if (f.targetRoiPercent == null) f.targetRoiPercent = 15;
        StateApi.touch(state);
        next();
      });
    }

    function paintFinanceResult() {
      var project = ProjectEngine ? ProjectEngine.calculateProject(state) : null;
      var analysis = null;
      if (FinanceEngine && project) {
        analysis = FinanceEngine.analyse(project, fp(), state);
      }

      if (UiResults && UiResults.buildInvestorResultHtml) {
        host.innerHTML = UiResults.buildInvestorResultHtml(uiCtx(project, analysis));
      } else if (!analysis || analysis.blocked) {
        host.innerHTML =
          '<div class="calc2-screen calc2-review"><p class="calc2-review-note">Investeringsanalyse niet beschikbaar.</p></div>';
      } else {
        host.innerHTML = '<div class="calc2-screen calc2-review"><p class="calc2-review-note">Resultatenmodule niet geladen.</p></div>';
      }

      var backReview = host.querySelector('#finBackReview');
      if (backReview) {
        backReview.addEventListener('click', function () {
          for (var i = 0; i < flow.length; i++) {
            if (flow[i].id === 'review') { goTo(i); return; }
          }
        });
      }
      var backEdit = host.querySelector('#finBackEdit');
      if (backEdit) {
        backEdit.addEventListener('click', function () {
          for (var i = 0; i < flow.length; i++) {
            if (flow[i].id === 'financePurchase') { goTo(i); return; }
          }
        });
      }
      host.querySelectorAll('.calc2-edit[data-jump="review"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          for (var j = 0; j < flow.length; j++) {
            if (flow[j].id === 'review') { goTo(j); return; }
          }
        });
      });
      var closeDone = host.querySelector('#calc2CloseDone');
      if (closeDone) closeDone.addEventListener('click', closeCalculator2);
      bindReportCapture(host, project, analysis);
    }

    function renderFinanceResult() {
      showAnalysisLoading(FINANCE_ANALYSIS_MESSAGES, paintFinanceResult);
    }

    function renderInvestorPrice() {
      var p = state.propertyProfile;
      host.innerHTML = screenShell(
        'Beoogde aankoopprijs (optioneel)',
        'Nog geen financiering, ROI of winstberekening — enkel context voor later.',
        '<label class="calc2-field"><span>Indicatieve aankoopprijs (€)</span>' +
          '<input type="number" id="calc2Offer" min="0" step="1000" inputmode="numeric" placeholder="bv. 285000" value="' +
            (p.intendedPurchasePrice != null ? escapeHtml(p.intendedPurchasePrice) : '') + '">' +
        '</label>' +
        chipOptions([
          { value: 'skip', label: 'Overslaan' }
        ], p.intendedPurchasePrice == null && p._priceSkipped ? 'skip' : null, 'Overslaan'),
        { showNext: true, nextDisabled: false, nextLabel: 'Verder' }
      );
      var input = host.querySelector('#calc2Offer');
      input.addEventListener('change', function () {
        var n = Number(input.value);
        if (n > 0) {
          p.intendedPurchasePrice = n;
          p._priceSkipped = false;
        }
        StateApi.touch(state);
      });
      host.querySelectorAll('.calc2-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          p.intendedPurchasePrice = null;
          p._priceSkipped = true;
          StateApi.touch(state);
          next();
        });
      });
      bindNext(function () { next(); });
    }

    function bindNext(fn) {
      var btn = host.querySelector('.calc2-next');
      if (btn) btn.addEventListener('click', fn);
    }

    function render() {
      updateChrome();
      var node = currentNode();
      var id = node.id;
      if (id === 'goal') return renderGoal();
      if (id === 'location') return renderLocation();
      if (id === 'propertyType') {
        return renderSimpleChoice(
          'Welk type woning is het?',
          'Kies het type dat het dichtst aanleunt.',
          Property.PROPERTY_TYPES,
          function () { return state.propertyProfile.propertyType; },
          function (v) { state.propertyProfile.propertyType = v; }
        );
      }
      if (id === 'yearBuilt') {
        return renderSimpleChoice(
          'Wanneer is de woning ongeveer gebouwd?',
          'Een periode volstaat — exact bouwjaar is niet nodig.',
          Property.YEAR_BUCKETS,
          function () { return state.propertyProfile.yearBuilt; },
          function (v) { state.propertyProfile.yearBuilt = v; }
        );
      }
      if (id === 'areaFloors') return renderAreaFloors();
      if (id === 'condition') {
        return renderSimpleChoice(
          'Hoe is de algemene staat van de woning?',
          'Geen technische diagnose — jouw inschatting als eigenaar of koper.',
          Property.CONDITIONS,
          function () { return state.propertyProfile.condition; },
          function (v) { state.propertyProfile.condition = v; }
        );
      }
      if (id === 'epc') {
        var epcSelected = state.propertyProfile.epc;
        host.innerHTML = screenShell(
          'Ken je het EPC / energielabel?',
          '“Weet ik niet” is helemaal oké.',
          chipOptions(Property.EPC_OPTIONS, epcSelected, 'EPC'),
          { showNext: true, nextDisabled: !epcSelected }
        );
        host.querySelectorAll('.calc2-chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            state.propertyProfile.epc = btn.getAttribute('data-value');
            StateApi.touch(state);
            render();
          });
        });
        bindNext(function () { if (state.propertyProfile.epc) next(); });
        return;
      }
      if (id === 'occupied') {
        return renderSimpleChoice(
          'Blijft de woning bewoond tijdens de renovatie?',
          'Dit beïnvloedt later planning en werforganisatie — nog geen prijs.',
          [
            { value: 'ja', label: 'Ja, bewoond', desc: 'Werken met bewoners aanwezig.' },
            { value: 'nee', label: 'Nee, leeg', desc: 'Woning is of wordt leeggezet.' },
            { value: 'weet_niet', label: 'Weet ik niet', desc: 'Nog niet beslist.' }
          ],
          function () { return state.propertyProfile.occupiedDuringWorks; },
          function (v) { state.propertyProfile.occupiedDuringWorks = v; }
        );
      }
      if (id === 'ownership') {
        return renderSimpleChoice(
          state.goal === 'investor'
            ? 'Heb je het pand al gekocht?'
            : 'Is de woning al van jou?',
          state.goal === 'investor'
            ? 'We vragen later pas naar financiële details.'
            : 'Helpt om het traject juist te kaderen.',
          [
            { value: 'owned', label: 'Ja, reeds gekocht', desc: 'Eigendom is rond.' },
            { value: 'considering', label: 'Nog in overweging', desc: 'Aankoop of renovatiebeslissing loopt.' }
          ],
          function () { return state.propertyProfile.ownershipStatus; },
          function (v) { state.propertyProfile.ownershipStatus = v; }
        );
      }
      if (id === 'investorPriceOptional') return renderInvestorPrice();
      if (id === 'scope') return renderScope();
      if (id.indexOf('detail:') === 0) return renderDetail(node);
      if (id === 'finish') return renderFinish();
      if (id === 'procurement') {
        return renderSimpleChoice(
          'Hoe wil je de renovatie organiseren?',
          'Dit bepaalt coördinatiekosten — we kiezen niets standaard voor jou.',
          StateApi.PROCUREMENT,
          function () { return state.procurementModel; },
          function (v) { state.procurementModel = v; }
        );
      }
      if (id === 'structuralRisk') {
        return renderSimpleChoice(
          'Verwacht je structurele ingrepen?',
          'Denk aan dragende muren, grote openingen of structureel risico. Beïnvloedt architect/ingenieur — nog geen ROI.',
          StateApi.STRUCTURAL_RISK,
          function () { return state.structuralRisk; },
          function (v) { state.structuralRisk = v; }
        );
      }
      if (id === 'review') {
        if (pendingReviewAnimation && UiResults) {
          pendingReviewAnimation = false;
          showAnalysisThenReview();
          return;
        }
        return renderReview();
      }
      if (id === 'financePurchase') return renderFinancePurchase();
      if (id === 'financeBuyer') return renderFinanceBuyer();
      if (id === 'financeFunding') return renderFinanceFunding();
      if (id === 'financeHolding') return renderFinanceHolding();
      if (id === 'financeSelling') return renderFinanceSelling();
      if (id === 'financeVat') return renderFinanceVat();
      if (id === 'financeResale') return renderFinanceResale();
      if (id === 'financeTarget') return renderFinanceTarget();
      if (id === 'financeResult') return renderFinanceResult();
      host.innerHTML = '<p>Onbekende stap.</p>';
    }

    /* ---------- events ---------- */

    document.querySelectorAll('[data-action="start-calculator-2"]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openCalculator2();
      });
    });

    document.querySelectorAll('[data-action="close-calc2"]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        closeCalculator2();
      });
    });

    if (backBtn) backBtn.addEventListener('click', prev);

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') closeCalculator2();
    });

    // Expose for debugging / later phases (read-only snapshot)
    window.ElyanCalc2 = {
      getState: function () { return JSON.parse(StateApi.serialize(state)); },
      pricePackages: function () {
        if (!PackageEngine) return null;
        return PackageEngine.priceActivePackages(state, { includeRawSum: true });
      },
      calculateProject: function () {
        if (!ProjectEngine) return null;
        return ProjectEngine.calculateProject(state);
      },
      analyseFinance: function () {
        if (!FinanceEngine || !ProjectEngine) return null;
        return FinanceEngine.analyse(ProjectEngine.calculateProject(state), StateApi.ensureFinanceProfile(state), state);
      },
      open: openCalculator2,
      close: closeCalculator2
    };
  });
})();
