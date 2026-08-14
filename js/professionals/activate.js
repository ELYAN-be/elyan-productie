(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var status = EP.$('#activateStatus');
  var previewBox = EP.$('#activatePreview');
  var claimBtn = EP.$('#claimBtn');
  var loginLink = EP.$('#loginLink');

  function tokenFromUrl() {
    return new URLSearchParams(location.search).get('token') || '';
  }

  async function loadPreview() {
    var token = tokenFromUrl();
    if (!token) {
      EP.setStatus(status, 'Deze uitnodigingslink is ongeldig.', 'error');
      return null;
    }
    var res = await fetch('/api/professionals-activate?token=' + encodeURIComponent(token));
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok || !body.ok) {
      EP.setStatus(status, body.message || 'Deze uitnodiging is niet geldig.', 'error');
      EP.showEl(previewBox, false);
      return null;
    }
    EP.$('#partnerName').textContent = body.partner.displayName;
    EP.$('#inviteEmail').textContent = body.email;
    EP.$('#inviteRole').textContent = body.role;
    EP.showEl(previewBox, true);
    EP.setStatus(status, '', '');
    return body;
  }

  claimBtn.addEventListener('click', async function () {
    claimBtn.disabled = true;
    EP.setStatus(status, 'Bezig met activeren…', 'info');
    try {
      var sb = await EP.getSupabase();
      var { data } = await sb.auth.getSession();
      if (!data || !data.session) {
        var next = encodeURIComponent(location.pathname + location.search);
        location.href = '/professionals/login?next=' + next;
        return;
      }
      var res = await EP.apiFetch('/api/professionals-activate', {
        method: 'POST',
        body: { token: tokenFromUrl() }
      });
      if (!res.ok) {
        EP.setStatus(status, (res.body && res.body.message) || 'Activeren mislukt.', 'error');
        return;
      }
      EP.setStatus(status, 'Lidmaatschap geactiveerd. Je wordt doorgestuurd…', 'ok');
      location.replace('/professionals/dashboard');
    } catch (err) {
      EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
    } finally {
      claimBtn.disabled = false;
    }
  });

  loginLink.href = '/professionals/login?next=' + encodeURIComponent(location.pathname + location.search);

  loadPreview().catch(function (err) {
    EP.setStatus(status, err.message || 'Kon uitnodiging niet laden.', 'error');
  });
})();
