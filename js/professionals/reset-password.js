(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var form = EP.$('#resetForm');
  var status = EP.$('#resetStatus');

  /** Only same-origin relative paths starting with a single "/". */
  function safeNextPathFrom(raw) {
    var n = raw || '';
    if (!n || n.charAt(0) !== '/' || n.charAt(1) === '/') return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(n) || n.indexOf('\\') >= 0) return null;
    return n;
  }

  function safeNextPath() {
    return safeNextPathFrom(new URLSearchParams(location.search).get('next') || '');
  }

  function stripInviteAuthParamsFromUrl() {
    var url = new URL(location.href);
    url.searchParams.delete('token_hash');
    url.searchParams.delete('type');
    var qs = url.searchParams.toString();
    history.replaceState({}, '', url.pathname + (qs ? '?' + qs : '') + url.hash);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    EP.setStatus(status, '', '');
    var p1 = EP.$('#password').value;
    var p2 = EP.$('#password2').value;
    if (p1.length < 8) {
      EP.setStatus(status, 'Kies een wachtwoord van minstens 8 tekens.', 'error');
      return;
    }
    if (p1 !== p2) {
      EP.setStatus(status, 'Wachtwoorden komen niet overeen.', 'error');
      return;
    }
    try {
      var sb = await EP.getSupabase();
      var params = new URLSearchParams(location.search);
      var tokenHash = params.get('token_hash') || '';
      var type = params.get('type') || '';
      var rawNext = params.get('next');
      var next = safeNextPathFrom(rawNext || '');

      if (tokenHash || type) {
        if (type !== 'invite' || !tokenHash) {
          EP.setStatus(status, 'Deze activatielink is ongeldig.', 'error');
          return;
        }
        if (rawNext != null && rawNext !== '' && !next) {
          EP.setStatus(status, 'Deze activatielink is ongeldig.', 'error');
          return;
        }

        var verify = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
        if (verify.error || !verify.data || !verify.data.session) {
          console.error('invite_verify_otp_failed', verify.error);
          EP.setStatus(status, 'Activatielink is ongeldig of verlopen. Vraag een nieuwe uitnodiging aan.', 'error');
          return;
        }
        stripInviteAuthParamsFromUrl();

        var inviteUpdate = await sb.auth.updateUser({ password: p1 });
        if (inviteUpdate.error) {
          console.error('invite_update_password_failed', inviteUpdate.error);
          EP.setStatus(status, 'Wachtwoord instellen mislukt. Probeer het opnieuw.', 'error');
          return;
        }
        if (next) {
          EP.setStatus(status, 'Wachtwoord ingesteld. Je wordt doorgestuurd…', 'ok');
          setTimeout(function () { location.replace(next); }, 1200);
          return;
        }
        EP.setStatus(status, 'Wachtwoord bijgewerkt. Je kunt nu inloggen.', 'ok');
        setTimeout(function () { location.replace('/professionals/login'); }, 1200);
        return;
      }

      // Existing recovery / forgot-password flow (no invite token).
      var { data } = await sb.auth.getSession();
      if (!data || !data.session) {
        EP.setStatus(status, 'Je herstelsessie is verlopen. Vraag opnieuw een resetlink aan.', 'error');
        return;
      }
      var { error } = await sb.auth.updateUser({ password: p1 });
      if (error) {
        console.error('recovery_update_password_failed', error);
        EP.setStatus(status, 'Wachtwoord resetten mislukt. Probeer opnieuw via “Wachtwoord vergeten”.', 'error');
        return;
      }
      next = safeNextPath();
      if (next) {
        EP.setStatus(status, 'Wachtwoord ingesteld. Je wordt doorgestuurd…', 'ok');
        setTimeout(function () { location.replace(next); }, 1200);
        return;
      }
      EP.setStatus(status, 'Wachtwoord bijgewerkt. Je kunt nu inloggen.', 'ok');
      setTimeout(function () { location.replace('/professionals/login'); }, 1200);
    } catch (err) {
      console.error('reset_password_exception', err);
      EP.setStatus(status, 'Er ging iets mis. Probeer het later opnieuw.', 'error');
    }
  });
})();
