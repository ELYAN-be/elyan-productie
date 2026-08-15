(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var form = EP.$('#resetForm');
  var status = EP.$('#resetStatus');

  /** Only same-origin relative paths starting with a single "/". */
  function safeNextPath() {
    var n = new URLSearchParams(location.search).get('next') || '';
    if (!n || n.charAt(0) !== '/' || n.charAt(1) === '/') return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(n) || n.indexOf('\\') >= 0) return null;
    return n;
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
      var { data } = await sb.auth.getSession();
      if (!data || !data.session) {
        EP.setStatus(status, 'Je herstelsessie is verlopen. Vraag opnieuw een resetlink aan.', 'error');
        return;
      }
      var { error } = await sb.auth.updateUser({ password: p1 });
      if (error) {
        EP.setStatus(status, 'Wachtwoord resetten mislukt. Probeer opnieuw via “Wachtwoord vergeten”.', 'error');
        return;
      }
      var next = safeNextPath();
      if (next) {
        EP.setStatus(status, 'Wachtwoord ingesteld. Je wordt doorgestuurd…', 'ok');
        setTimeout(function () { location.replace(next); }, 1200);
        return;
      }
      EP.setStatus(status, 'Wachtwoord bijgewerkt. Je kunt nu inloggen.', 'ok');
      setTimeout(function () { location.replace('/professionals/login'); }, 1200);
    } catch (err) {
      EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
    }
  });
})();
