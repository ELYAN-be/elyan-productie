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

  function wantsControl(next) {
    return String(next || '').indexOf('/professionals/control') === 0;
  }

  async function continueAfterAuth(sessionBody) {
    var next = nextUrl();
    var memberships = sessionBody && sessionBody.memberships ? sessionBody.memberships : [];

    if (memberships.length) {
      var partnerId = memberships[0].partnerId || memberships[0].partner.id;
      // Prefer an explicit Control next over partner home when staff opens Control login.
      if (wantsControl(next)) {
        var staffGate = await EP.controlFetch('session');
        if (staffGate.ok) {
          location.replace(next);
          return;
        }
      }
      var dest = await EP.resolveProfessionalsHome(partnerId, next);
      location.replace(dest);
      return;
    }

    // Staff-only accounts have no partner membership — allow Control without inventing one.
    var controlSession = await EP.controlFetch('session');
    if (controlSession.ok) {
      location.replace(wantsControl(next) ? next : '/professionals/control');
      return;
    }

    EP.setStatus(
      status,
      'Je bent aangemeld, maar er is nog geen actief partnerlidmaatschap. Gebruik je uitnodigingslink om te activeren.',
      'error'
    );
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    EP.setStatus(status, '', '');
    submitBtn.disabled = true;
    try {
      if (EP.redirectIfPasswordRecoveryPending()) return;
      var sb = await EP.getSupabase();
      if (EP.redirectIfPasswordRecoveryPending()) return;
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
      await continueAfterAuth(sessionRes.body);
    } catch (err) {
      EP.setStatus(status, 'Er ging iets mis. Probeer later opnieuw.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  EP.getSupabase()
    .then(function (sb) {
      if (EP.redirectIfPasswordRecoveryPending()) return null;
      return sb.auth.getSession();
    })
    .then(function (res) {
      if (!res || !res.data || !res.data.session) return;
      if (EP.redirectIfPasswordRecoveryPending()) return;
      return EP.apiFetch('session').then(function (s) {
        if (!s.ok) return;
        return continueAfterAuth(s.body);
      });
    })
    .catch(function () { /* ignore */ });
})();
