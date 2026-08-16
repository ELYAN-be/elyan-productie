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
    if (!t || !/^[A-Za-z0-9_-]+$/.test(t) || t.length < 16) return null;
    return t;
  }

  function decodeLegacyPasswordSetupPayload(encoded) {
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
    var inviteToken = safeInviteToken(raw.slice(i + 1));
    if (!tokenHash || !inviteToken) return null;
    return { tokenHash: tokenHash, inviteToken: inviteToken };
  }

  /**
   * Invite credentials for server-side password setup.
   * Canonical: /professionals/set-password/<elyan_invite_token>
   * Legacy: base64(hash\\ninvite) path segment, or ?invite_token= / ?token_hash=
   */
  function resolveInviteCredentials() {
    var path = location.pathname || '';
    var m = path.match(/^\/professionals\/set-password\/([A-Za-z0-9_-]+)$/);
    if (m) {
      var seg = m[1];
      var legacy = decodeLegacyPasswordSetupPayload(seg);
      if (legacy) {
        return { inviteToken: legacy.inviteToken, next: null };
      }
      var direct = safeInviteToken(seg);
      if (direct) return { inviteToken: direct, next: null };
    }
    var params = new URLSearchParams(location.search);
    var inviteToken = safeInviteToken(params.get('invite_token'));
    var next = safeNextPathFrom(params.get('next') || '');
    if (inviteToken) return { inviteToken: inviteToken, next: next };
    // Legacy emails that only had token_hash cannot be completed without invite_token;
    // surface a clear error on submit instead of attempting a client-side OTP exchange.
    if (params.get('token_hash') && params.get('type') === 'invite') {
      return { inviteToken: null, next: next, legacyHashOnly: true };
    }
    return { inviteToken: null, next: next };
  }

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

  /**
   * Recovery session from Supabase email link (?code= PKCE or #access_token=).
   * detectSessionInUrl must be enabled (see core.js).
   */
  async function ensureRecoverySession(sb) {
    var { data } = await sb.auth.getSession();
    if (data && data.session) return data.session;

    // Explicit PKCE exchange if library left a code in the URL.
    var params = new URLSearchParams(location.search);
    var code = params.get('code');
    if (code && typeof sb.auth.exchangeCodeForSession === 'function') {
      var exchanged = await sb.auth.exchangeCodeForSession(code);
      if (exchanged.error) {
        console.error('recovery_code_exchange_failed', exchanged.error);
        return null;
      }
      return exchanged.data && exchanged.data.session;
    }
    return null;
  }

  var submitting = false;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitting) return;
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
    submitting = true;
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    var redirecting = false;
    try {
      var creds = resolveInviteCredentials();
      var inviteToken = creds.inviteToken || null;
      var next = creds.next || null;

      // Invite password setup — server-side, no client OTP.
      if (inviteToken || creds.legacyHashOnly) {
        if (!inviteToken) {
          EP.setStatus(
            status,
            'Deze oude activatielink wordt niet meer ondersteund. Vraag een nieuwe uitnodiging aan.',
            'error'
          );
          return;
        }

        var setupRes = await EP.apiFetch('setup-password', {
          method: 'POST',
          auth: false,
          body: { token: inviteToken, password: p1 }
        });
        if (!setupRes.ok) {
          console.error('invite_setup_password_failed', setupRes.status, setupRes.body && setupRes.body.error);
          EP.setStatus(
            status,
            (setupRes.body && setupRes.body.message) ||
              'Wachtwoord instellen mislukt. Vraag een nieuwe uitnodiging aan.',
            'error'
          );
          return;
        }

        var email = setupRes.body && setupRes.body.email;
        if (!email) {
          EP.setStatus(status, 'Wachtwoord is gezet, maar aanmelden mislukte. Ga naar login.', 'error');
          return;
        }

        var sb = await EP.getSupabase();
        var signIn = await sb.auth.signInWithPassword({ email: email, password: p1 });
        if (signIn.error) {
          console.error('invite_setup_signin_failed', signIn.error);
          EP.setStatus(
            status,
            'Wachtwoord is opgeslagen. Log nu in met dit e-mailadres en wachtwoord.',
            'ok'
          );
          redirecting = true;
          setTimeout(function () {
            location.replace('/professionals/login?next=' + encodeURIComponent(
              '/professionals/activate?token=' + inviteToken
            ));
          }, 1500);
          return;
        }

        EP.setStatus(status, 'Wachtwoord ingesteld. Je wordt doorgestuurd…', 'ok');
        redirecting = true;
        setTimeout(function () {
          redirectAfterPasswordUpdate(inviteToken, next);
        }, 800);
        return;
      }

      // Recovery / forgot-password flow (session from email callback).
      var sbRecovery = await EP.getSupabase();
      var session = await ensureRecoverySession(sbRecovery);
      if (!session) {
        EP.setStatus(status, 'Je herstelsessie is verlopen. Vraag opnieuw een resetlink aan.', 'error');
        return;
      }
      var { error } = await sbRecovery.auth.updateUser({ password: p1 });
      if (error) {
        console.error('recovery_update_password_failed', error);
        EP.setStatus(status, 'Wachtwoord resetten mislukt. Probeer opnieuw via “Wachtwoord vergeten”.', 'error');
        return;
      }
      EP.setStatus(status, 'Wachtwoord bijgewerkt. Je kunt nu inloggen.', 'ok');
      redirecting = true;
      setTimeout(function () {
        redirectAfterPasswordUpdate(null, next);
      }, 1200);
    } catch (err) {
      console.error('reset_password_exception', err);
      EP.setStatus(status, 'Er ging iets mis. Probeer het later opnieuw.', 'error');
    } finally {
      if (!redirecting) {
        submitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    }
  });
})();
