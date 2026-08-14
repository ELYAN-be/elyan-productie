(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var form = EP.$('#forgotForm');
  var status = EP.$('#forgotStatus');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    EP.setStatus(status, '', '');
    try {
      var sb = await EP.getSupabase();
      var email = EP.$('#email').value.trim().toLowerCase();
      var redirectTo = location.origin + '/professionals/reset-password';
      var { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
      if (error) {
        EP.setStatus(status, 'Reset e-mail kon niet worden verzonden. Probeer later opnieuw.', 'error');
        return;
      }
      EP.setStatus(status, 'Als dit e-mailadres bekend is, ontvang je instructies om je wachtwoord te resetten.', 'ok');
    } catch (err) {
      EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
    }
  });
})();
