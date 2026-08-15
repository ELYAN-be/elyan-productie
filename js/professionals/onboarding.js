(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var status = EP.$('#onboardStatus');
  EP.$('#logoutBtn').addEventListener('click', function () { EP.logout(); });

  EP.requireSessionOrRedirect().then(function (session) {
    if (!session) return;
    if (session.noMembership) {
      EP.setStatus(status, 'Geen actief partnerlidmaatschap gevonden.', 'error');
      return;
    }
    EP.$('#partnerLabel').textContent = session.memberships[0].partner.displayName;
  }).catch(function (err) {
    EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
  });
})();
