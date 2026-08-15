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

  function safeInviteToken(raw) {
    var t = String(raw || '');
    if (!t || !/^[A-Za-z0-9_-]+$/.test(t)) return null;
    return t;
  }

  function decodePasswordSetupPayload(encoded) {
    var s = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var raw;
    try {
      raw = decodeURIComponent(escape(atob(s)));
    } catch (e) {
      return null;
    }
    var i = raw.indexOf('\n');
    if (i < 1) return null;
    var tokenHash = raw.slice(0, i);
    var inviteToken = raw.slice(i + 1);
    if (!tokenHash || !safeInviteToken(inviteToken)) return null;
    return { tokenHash: tokenHash, inviteToken: inviteToken, type: 'invite' };
  }

  /**
   * Resolve invite credentials from:
   * 1) /professionals/set-password/<payload>  (canonical email CTA)
   * 2) ?token_hash=&type=invite&invite_token= (legacy)
   * Never reads activate URLs; never navigates on parse.
   */
  function resolveInviteCredentials() {
    var path = location.pathname || '';
    var m = path.match(/^\/professionals\/set-password\/([A-Za-z0-9_-]+)$/);
    if (m) {
      var decoded = decodePasswordSetupPayload(m[1]);
      if (decoded) return decoded;
    }
    var params = new URLSearchParams(location.search);
    var tokenHash = params.get('token_hash') || '';
    var type = params.get('type') || '';
    var inviteToken = safeInviteToken(params.get('invite_token'));
    if (tokenHash || type) {
      return {
        tokenHash: tokenHash,
        type: type,
        inviteToken: inviteToken,
        next: safeNextPathFrom(params.get('next') || '')
      };
    }
    return {
      tokenHash: '',
      type: '',
      inviteToken: null,
      next: safeNextPathFrom(params.get('next') || '')
    };
  }

  /**
   * Only after successful password update. verifyOtp must never call this.
   */
  function redirectAfterPasswordUpdate(inviteToken, next) {
    if (inviteToken) {
      location.replace('/professionals/activate?token=' + encodeURIComponent(inviteToken));
      return;
    }
    if (next) {
      location.replace(next);
      return;
    }
    location.replace('/professionals/login');
  }

  function stripInviteAuthParamsFromUrl() {
    var path = location.pathname || '';
    if (/^\/professionals\/set-password\//.test(path)) {
      // Stay on a stable path without the one-time payload after verify.
      history.replaceState({}, '', '/professionals/reset-password');
      return;
    }
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
      var creds = resolveInviteCredentials();
      var tokenHash = creds.tokenHash || '';
      var type = creds.type || (tokenHash ? 'invite' : '');
      var inviteToken = creds.inviteToken || null;
      var next = creds.next || null;

      if (tokenHash || type) {
        if (type !== 'invite' || !tokenHash) {
          EP.setStatus(status, 'Deze activatielink is ongeldig.', 'error');
          return;
        }
        if (!inviteToken && !next) {
          EP.setStatus(status, 'Deze activatielink is ongeldig.', 'error');
          return;
        }

        var verify = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
        if (verify.error || !verify.data || !verify.data.session) {
          console.error('invite_verify_otp_failed', verify.error);
          EP.setStatus(status, 'Activatielink is ongeldig of verlopen. Vraag een nieuwe uitnodiging aan.', 'error');
          return;
        }
        // verifyOtp succeeded — stay on reset-password. Do NOT navigate to next/activate.
        stripInviteAuthParamsFromUrl();

        var inviteUpdate = await sb.auth.updateUser({ password: p1 });
        if (inviteUpdate.error) {
          console.error('invite_update_password_failed', inviteUpdate.error);
          EP.setStatus(status, 'Wachtwoord instellen mislukt. Probeer het opnieuw.', 'error');
          return;
        }
        EP.setStatus(status, 'Wachtwoord ingesteld. Je wordt doorgestuurd…', 'ok');
        setTimeout(function () {
          redirectAfterPasswordUpdate(inviteToken, next);
        }, 1200);
        return;
      }

      // Existing recovery / forgot-password flow (no invite token_hash).
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
      EP.setStatus(status, 'Wachtwoord bijgewerkt. Je kunt nu inloggen.', 'ok');
      setTimeout(function () {
        redirectAfterPasswordUpdate(null, next);
      }, 1200);
    } catch (err) {
      console.error('reset_password_exception', err);
      EP.setStatus(status, 'Er ging iets mis. Probeer het later opnieuw.', 'error');
    }
  });
})();
