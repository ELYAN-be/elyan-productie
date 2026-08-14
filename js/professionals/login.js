(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var form = EP.$('#loginForm');
  var status = EP.$('#loginStatus');
  var submitBtn = EP.$('#loginSubmit');

  function nextUrl() {
    var p = new URLSearchParams(location.search);
    var n = p.get('next') || '/professionals/dashboard';
    if (n.charAt(0) !== '/') n = '/professionals/dashboard';
    return n;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    EP.setStatus(status, '', '');
    submitBtn.disabled = true;
    try {
      var sb = await EP.getSupabase();
      var email = EP.$('#email').value.trim().toLowerCase();
      var password = EP.$('#password').value;
      var { data, error } = await sb.auth.signInWithPassword({ email: email, password: password });
      if (error) {
        EP.setStatus(status, 'Aanmelden mislukt. Controleer e-mail en wachtwoord.', 'error');
        return;
      }
      try {
        await EP.apiFetch('/api/professionals-login-audit', { method: 'POST', body: {} });
      } catch (e2) { /* non-blocking */ }
      var sessionRes = await EP.apiFetch('/api/professionals-session');
      if (!sessionRes.ok) {
        EP.setStatus(status, (sessionRes.body && sessionRes.body.message) || 'Sessie kon niet worden geladen.', 'error');
        await sb.auth.signOut();
        return;
      }
      if (!sessionRes.body.memberships || !sessionRes.body.memberships.length) {
        EP.setStatus(status, 'Je bent aangemeld, maar er is nog geen actief partnerlidmaatschap. Gebruik je uitnodigingslink om te activeren.', 'error');
        return;
      }
      location.replace(nextUrl());
    } catch (err) {
      EP.setStatus(status, err.message || 'Er ging iets mis. Probeer later opnieuw.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // If already logged in with membership → dashboard
  EP.getSupabase().then(function (sb) {
    return sb.auth.getSession();
  }).then(function (res) {
    if (res && res.data && res.data.session) {
      return EP.apiFetch('/api/professionals-session').then(function (s) {
        if (s.ok && s.body.memberships && s.body.memberships.length) {
          location.replace(nextUrl());
        }
      });
    }
  }).catch(function () { /* ignore */ });
})();
