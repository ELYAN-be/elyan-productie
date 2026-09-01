/* ============================================================
   ELYAN. Partners interest form (/partners)
   Client-side validation + optional API notify; always confirms.
   ============================================================ */

(function () {
  var form = document.getElementById('partnerInterestForm');
  if (!form) return;

  var submitBtn = document.getElementById('partnerSubmit');
  var errorEl = document.getElementById('partnerFormError');
  var successEl = document.getElementById('partnerFormSuccess');
  var card = document.getElementById('partnerFormCard');

  function showError(msg) {
    if (!errorEl) return;
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.disabled = on;
  }

  function showSuccess() {
    form.hidden = true;
    if (successEl) {
      successEl.hidden = false;
      successEl.setAttribute('tabindex', '-1');
      successEl.focus();
    }
    if (card) card.classList.add('is-success');
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var companyName = (form.companyName.value || '').trim();
    var contactName = (form.contactName.value || '').trim();
    var email = (form.email.value || '').trim();
    var phone = (form.phone.value || '').trim();
    var website = (form.website.value || '').trim();
    var specialty = form.specialty.value || '';
    var region = form.region.value || '';
    var message = (form.message.value || '').trim();
    var consent = form.consent.checked;

    if (!companyName || !contactName || !email || !specialty || !region) {
      showError('Vul alle verplichte velden in.');
      return;
    }
    if (!isValidEmail(email)) {
      showError('Geef een geldig e-mailadres op.');
      return;
    }
    if (!consent) {
      showError('Bevestig dat je informatie over het partnernetwerk wilt ontvangen.');
      return;
    }

    var payload = {
      companyName: companyName,
      contactName: contactName,
      email: email,
      phone: phone,
      website: website,
      specialty: specialty,
      region: region,
      message: message,
      consent: true,
      source: 'partners'
    };

    setLoading(true);

    fetch('/api/partner-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) {
            if (res.status === 429) {
              showError('Te veel pogingen. Probeer later opnieuw.');
            } else if (res.status === 400) {
              showError('Vul alle verplichte velden correct in.');
            } else {
              showError('Je aanvraag kon niet worden verzonden. Probeer opnieuw of mail naar elyan.info@gmail.com.');
            }
            return;
          }
          showSuccess();
        });
      })
      .catch(function (err) {
        console.warn('partner-interest error', err);
        showError('Je aanvraag kon niet worden verzonden. Controleer je verbinding en probeer opnieuw.');
      })
      .finally(function () {
        setLoading(false);
      });
  });
})();
