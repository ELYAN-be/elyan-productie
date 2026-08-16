(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var status = EP.$('#activateStatus');
  var previewBox = EP.$('#activatePreview');
  var claimBtn = EP.$('#claimBtn');
  var loginLink = EP.$('#loginLink');
  var claiming = false;

  function tokenFromUrl() {
    return new URLSearchParams(location.search).get('token') || '';
  }

  async function loadPreview() {
    var token = tokenFromUrl();
    if (!token) {
      EP.setStatus(status, 'Deze uitnodigingslink is ongeldig.', 'error');
      return null;
    }
    var res = await fetch(EP.apiProfessionals('activate', { query: { token: token } }));
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok || !body.ok) {
      // Invite already used — if the user is signed in with membership, go to dashboard.
      if (body && (body.error === 'invite_used' || body.error === 'invite_invalid')) {
        var sessionRes = await EP.apiFetch('session');
        if (sessionRes.ok && sessionRes.body.memberships && sessionRes.body.memberships.length) {
          location.replace('/professionals/dashboard');
          return null;
        }
      }
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

  async function claimMembership() {
    if (claiming) return;
    claiming = true;
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
      var res = await EP.apiFetch('activate', {
        method: 'POST',
        body: { token: tokenFromUrl() }
      });
      if (!res.ok) {
        // Already claimed on this account — treat as success when session has membership.
        if (res.body && (res.body.error === 'invite_used' || res.body.error === 'invite_invalid')) {
          var sessionRes = await EP.apiFetch('session');
          if (sessionRes.ok && sessionRes.body.memberships && sessionRes.body.memberships.length) {
            EP.setStatus(status, 'Lidmaatschap al geactiveerd. Je wordt doorgestuurd…', 'ok');
            location.replace('/professionals/dashboard');
            return;
          }
        }
        EP.setStatus(status, (res.body && res.body.message) || 'Activeren mislukt.', 'error');
        return;
      }
      EP.setStatus(status, 'Lidmaatschap geactiveerd. Je wordt doorgestuurd…', 'ok');
      location.replace('/professionals/dashboard');
    } catch (err) {
      EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
    } finally {
      claiming = false;
      claimBtn.disabled = false;
    }
  }

  claimBtn.addEventListener('click', function () {
    claimMembership();
  });

  loginLink.href = '/professionals/login?next=' + encodeURIComponent(location.pathname + location.search);

  loadPreview()
    .then(async function (preview) {
      if (!preview) return;
      // Auto-claim when the user is already signed in (post password-setup path).
      var sb = await EP.getSupabase();
      var { data } = await sb.auth.getSession();
      if (data && data.session) {
        await claimMembership();
      }
    })
    .catch(function (err) {
      EP.setStatus(status, err.message || 'Kon uitnodiging niet laden.', 'error');
    });
})();
