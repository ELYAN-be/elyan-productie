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
      var { error } = await sb.auth.signInWithPassword({ email: email, password: password });
      if (error) {
        EP.setStatus(status, 'Aanmelden mislukt. Controleer e-mail en wachtwoord.', 'error');
        return;
      }
      try {
        await EP.apiFetch('login-audit', { method: 'POST', body: {} });
      } catch (e2) { /* non-blocking */ }
      var sessionRes = await EP.apiFetch('session');
      if (!sessionRes.ok) {
        EP.setStatus(status, (sessionRes.body && sessionRes.body.message) || 'Sessie kon niet worden geladen.', 'error');
        await sb.auth.signOut();
        return;
      }
      if (!sessionRes.body.memberships || !sessionRes.body.memberships.length) {
        EP.setStatus(status, 'Je bent aangemeld, maar er is nog geen actief partnerlidmaatschap. Gebruik je uitnodigingslink om te activeren.', 'error');
        return;
      }
      var partnerId = sessionRes.body.memberships[0].partnerId || sessionRes.body.memberships[0].partner.id;
      var dest = await EP.resolveProfessionalsHome(partnerId, nextUrl());
      location.replace(dest);
    } catch (err) {
      EP.setStatus(status, 'Er ging iets mis. Probeer later opnieuw.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  EP.getSupabase().then(function (sb) {
    return sb.auth.getSession();
  }).then(function (res) {
    if (res && res.data && res.data.session) {
      return EP.apiFetch('session').then(async function (s) {
        if (s.ok && s.body.memberships && s.body.memberships.length) {
          var partnerId = s.body.memberships[0].partnerId || s.body.memberships[0].partner.id;
          var dest = await EP.resolveProfessionalsHome(partnerId, nextUrl());
          location.replace(dest);
        }
      });
    }
  }).catch(function () { /* ignore */ });
})();
