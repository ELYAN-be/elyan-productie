/**
 * Interest Intake — /vakmannen/p/{slug}/aanvraag
 * Partner Lab look. No wizard. No demo data. No partner contact leak.
 */
(function () {
  'use strict';

  var UI = window.ElyanMarketplaceUi;
  if (!UI) return;

  var esc = UI.escapeHtml;
  var app = document.getElementById('vk-aanvraag-app');
  var submitting = false;
  var submitted = false;
  var profileData = null;

  function isTemporarilyFull(p) {
    if (!p) return false;
    var avail = p.availability || {};
    if (avail.capacityId === 'full') return true;
    var label = String(avail.capacityLabel || '').toLowerCase();
    return label.indexOf('volzet') >= 0;
  }

  function go404() {
    window.location.replace('/404');
  }

  function profileHref(slug) {
    return '/vakmannen/' + encodeURIComponent(slug);
  }

  function categoryLabel(id) {
    return (UI.labelFor && UI.labelFor(id)) || id || '';
  }

  function setPageMeta(p) {
    var name = (p && p.displayName) || 'Vakbedrijf';
    var title = 'Vraag via ELYAN aan · ' + name + ' | ELYAN';
    document.title = title;
    var can = document.querySelector('link[rel="canonical"]');
    if (can && p && p.slug) {
      can.setAttribute('href', UI.SITE_ORIGIN + UI.buildAanvraagPath(p.slug));
    }
  }

  function partnerContextHtml(p) {
    var cover = UI.safeHttpsUrl(p.coverUrl);
    var cat = categoryLabel(p.primaryCategoryId);
    var media = cover
      ? '<img src="' + esc(cover) + '" alt="">'
      : '<span class="lab-intake-ph" aria-hidden="true">ELYAN</span>';
    return (
      '<div class="lab-intake-partner">' +
      '<div class="lab-intake-partner-media">' +
      media +
      '</div>' +
      '<div class="lab-intake-partner-copy">' +
      '<p class="lab-kicker">Offerteaanvraag via ELYAN</p>' +
      '<strong>' +
      esc(p.displayName || 'Vakbedrijf') +
      '</strong>' +
      (cat ? '<span>' + esc(cat) + '</span>' : '') +
      '</div></div>'
    );
  }

  function fieldError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
  }

  function clearErrors() {
    [
      'err-name',
      'err-email',
      'err-location',
      'err-description',
      'err-consent',
      'err-form'
    ].forEach(function (id) {
      fieldError(id, '');
    });
  }

  function setLoading(on) {
    var btn = document.getElementById('intakeSubmit');
    if (!btn) return;
    btn.disabled = on || submitted;
    btn.classList.toggle('is-loading', on);
    btn.textContent = on ? 'Bezig…' : 'Aanvraag versturen';
  }

  function renderSuccess(slug, companyName) {
    if (!app) return;
    var name = companyName || 'Het vakbedrijf';
    app.innerHTML =
      '<div class="lab-quote-shell">' +
      '<div class="lab-success">' +
      '<div class="mark"><svg class="icon"><use href="#i-check"></use></svg></div>' +
      '<p class="lab-kicker">Aanvraag verzonden</p>' +
      '<h1>Je aanvraag is verzonden via ELYAN.</h1>' +
      '<p class="lab-hint"><strong>' + esc(name) + '</strong> kan je project nu bekijken.</p>' +
      '<ol class="lab-success-steps">' +
      '<li>Het vakbedrijf bekijkt je aanvraag.</li>' +
      '<li>Het vakbedrijf kan aangeven of het geïnteresseerd is.</li>' +
      '<li>Verdere afspraken over offerte en uitvoering maak je met het vakbedrijf.</li>' +
      '</ol>' +
      '<div class="lab-quote-actions" style="justify-content:center;">' +
      '<a class="btn btn-primary" href="' +
      esc(profileHref(slug)) +
      '">Terug naar profiel</a>' +
      '<a class="btn btn-ghost" href="/vakmannen">Verder ontdekken</a>' +
      '</div></div></div>';
  }

  function renderUnavailable(p) {
    if (!app) return;
    app.innerHTML =
      '<div class="lab-quote-shell"><div class="lab-quote-card">' +
      '<h1>Tijdelijk volzet</h1>' +
      '<p class="step-lead">' + esc(p.displayName || 'Dit vakbedrijf') +
      ' kan momenteel geen nieuwe aanvragen ontvangen.</p>' +
      '<a class="btn btn-primary" href="' + esc(profileHref(p.slug)) + '">Terug naar profiel</a>' +
      '<a class="btn btn-ghost" href="/vakmannen">Naar vakmannen</a>' +
      '</div></div>';
  }

  function renderMissing() {
    if (!app) return;
    app.innerHTML =
      '<div class="lab-quote-shell"><div class="lab-quote-card">' +
      '<h1>Vakman niet gevonden</h1>' +
      '<p class="step-lead">Dit profiel bestaat niet of is niet beschikbaar voor aanvragen.</p>' +
      '<a class="btn btn-primary" href="/vakmannen">Naar vakmannen</a>' +
      '</div></div>';
  }

  function renderForm(p) {
    var slug = p.slug;
    setPageMeta(p);
    app.innerHTML =
      '<div class="lab-quote-shell">' +
      '<a class="lab-link" href="' +
      esc(profileHref(slug)) +
      '" style="margin-bottom:14px;">← Terug naar profiel</a>' +
      partnerContextHtml(p) +
      '<div class="lab-quote-card">' +
      '<h1>Vraag via ELYAN aan</h1>' +
      '<p class="step-lead">Kort en duidelijk. Je aanvraag gaat naar dit vakbedrijf via ELYAN.</p>' +
      '<form id="interestForm" novalidate>' +
      '<input type="hidden" name="partnerSlug" value="' +
      esc(slug) +
      '">' +
      '<div class="lab-hp" aria-hidden="true">' +
      '<label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
      '</div>' +
      '<label class="lab-field">Naam' +
      '<input name="name" type="text" autocomplete="name" required maxlength="120" placeholder="Voor- en achternaam">' +
      '<span class="lab-field-error" id="err-name" hidden></span></label>' +
      '<label class="lab-field">E-mail' +
      '<input name="email" type="email" autocomplete="email" required maxlength="160" placeholder="naam@email.be">' +
      '<span class="lab-field-error" id="err-email" hidden></span></label>' +
      '<label class="lab-field">Telefoon <span class="lab-opt">(optioneel)</span>' +
      '<input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="+32 …">' +
      '</label>' +
      '<label class="lab-field">Postcode / gemeente' +
      '<input name="location" type="text" autocomplete="postal-code" required maxlength="160" placeholder="bv. 9000 Gent">' +
      '<span class="lab-field-error" id="err-location" hidden></span></label>' +
      '<label class="lab-field">Korte projectbeschrijving' +
      '<textarea name="description" required maxlength="2000" rows="4" placeholder="Wat wil je laten uitvoeren?"></textarea>' +
      '<span class="lab-field-error" id="err-description" hidden></span></label>' +
      '<label class="lab-consent">' +
      '<input type="checkbox" name="consent" required>' +
      '<span>Ik ga akkoord dat ELYAN mijn gegevens gebruikt om deze aanvraag te behandelen. ' +
      '<a href="/privacybeleid.html" target="_blank" rel="noopener noreferrer">Privacybeleid</a>.</span></label>' +
      '<span class="lab-field-error" id="err-consent" hidden></span>' +
      '<p class="lab-form-error" id="err-form" hidden></p>' +
      '<p class="lab-hint lab-intake-privacy">Je gegevens gaan naar ELYAN — niet rechtstreeks naar het vakbedrijf.</p>' +
      '<div class="lab-quote-actions">' +
      '<button type="submit" class="btn btn-primary btn-block" id="intakeSubmit">Aanvraag versturen</button>' +
      '</div></form></div></div>';

    var form = document.getElementById('interestForm');
    if (form) form.addEventListener('submit', onSubmit);
  }

  function validateClient(form) {
    clearErrors();
    var name = (form.name.value || '').trim();
    var email = (form.email.value || '').trim();
    var location = (form.location.value || '').trim();
    var description = (form.description.value || '').trim();
    var consent = form.consent.checked;
    var ok = true;

    if (!name) {
      fieldError('err-name', 'Vul je naam in.');
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldError('err-email', 'Geef een geldig e-mailadres op.');
      ok = false;
    }
    if (!location) {
      fieldError('err-location', 'Vul postcode of gemeente in.');
      ok = false;
    }
    if (!description || description.length < 10) {
      fieldError('err-description', 'Beschrijf je project kort (min. 10 tekens).');
      ok = false;
    }
    if (!consent) {
      fieldError('err-consent', 'Bevestig het privacy-akkoord.');
      ok = false;
    }
    return ok;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting || submitted) return;
    var form = e.target;
    if (!validateClient(form)) return;

    var payload = {
      partnerSlug: (form.partnerSlug.value || '').trim(),
      name: (form.name.value || '').trim(),
      email: (form.email.value || '').trim(),
      phone: (form.phone.value || '').trim(),
      location: (form.location.value || '').trim(),
      description: (form.description.value || '').trim(),
      consent: true,
      website: (form.website && form.website.value) || ''
    };

    submitting = true;
    setLoading(true);
    fieldError('err-form', '');

    fetch('/api/public/v1/interest', {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data || {} };
        }).catch(function () {
          return { status: res.status, data: {} };
        });
      })
      .then(function (out) {
        if (out.status === 429) {
          fieldError('err-form', 'Te veel verzoeken. Probeer later opnieuw.');
          return;
        }
        if (out.status === 404) {
          renderMissing();
          return;
        }
        if (out.status === 409 || (out.data && out.data.error === 'partner_unavailable')) {
          if (profileData) renderUnavailable(profileData);
          else fieldError('err-form', 'Dit vakbedrijf is tijdelijk volzet en kan geen nieuwe aanvragen ontvangen.');
          return;
        }
        if (out.status === 400) {
          var code = out.data.error;
          if (code === 'consent_required') fieldError('err-consent', out.data.message || 'Bevestig het privacy-akkoord.');
          else if (code === 'invalid_email') fieldError('err-email', out.data.message || 'Ongeldig e-mailadres.');
          else if (code === 'missing_fields') fieldError('err-form', out.data.message || 'Vul alle verplichte velden in.');
          else fieldError('err-form', (out.data && out.data.message) || 'Controleer je gegevens.');
          return;
        }
        if (out.status >= 500 || !out.data.ok) {
          fieldError('err-form', (out.data && out.data.message) || 'Er ging iets mis. Probeer later opnieuw.');
          return;
        }
        submitted = true;
        renderSuccess(payload.partnerSlug, profileData && profileData.displayName);
      })
      .catch(function () {
        fieldError('err-form', 'Verbinding mislukt. Probeer opnieuw.');
      })
      .finally(function () {
        submitting = false;
        setLoading(false);
      });
  }

  function init() {
    var route = UI.parseAanvraagRoute(window.location.pathname);
    if (!route.ok) {
      go404();
      return;
    }
    fetch('/api/public/v1/professionals/' + encodeURIComponent(route.slug), {
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (res.status === 404) return { ok: false, code: 'not_found' };
        if (!res.ok) throw new Error('http_' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok || !data.professional) {
          renderMissing();
          return;
        }
        profileData = data.professional;
        if (isTemporarilyFull(profileData)) {
          renderUnavailable(profileData);
          return;
        }
        renderForm(profileData);
      })
      .catch(function () {
        if (!app) return;
        app.innerHTML =
          '<div class="lab-quote-shell"><div class="lab-quote-card" role="alert">' +
          '<p>Formulier kon niet geladen worden.</p>' +
          '<button type="button" class="btn btn-primary btn-sm" id="aanvraagRetry">Opnieuw proberen</button>' +
          '</div></div>';
        var retry = document.getElementById('aanvraagRetry');
        if (retry) retry.addEventListener('click', init);
      });
  }

  init();
})();
