(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var status = EP.$('#dashStatus');
  var shell = EP.$('#dashShell');
  var partnerEl = EP.$('#partnerLabel');
  var emailEl = EP.$('#userEmail');
  var roleEl = EP.$('#userRole');

  EP.$('#logoutBtn').addEventListener('click', function () {
    EP.logout();
  });

  EP.requireSessionOrRedirect().then(function (session) {
    if (!session) return;
    if (session.noMembership) {
      EP.showEl(shell, false);
      EP.setStatus(status, 'Geen actief partnerlidmaatschap. Open je uitnodigingslink om te activeren.', 'error');
      return;
    }
    if (session.error) {
      EP.setStatus(status, (session.error && session.error.message) || 'Kon dashboard niet laden.', 'error');
      return;
    }
    var m = session.memberships[0];
    partnerEl.textContent = m.partner.displayName;
    emailEl.textContent = session.user.email;
    roleEl.textContent = m.role;
    EP.showEl(shell, true);
    EP.setStatus(status, '', '');
  }).catch(function (err) {
    EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
  });
})();
