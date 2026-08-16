(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanOnboardingShell;
  var status = EP.$('#dashStatus');
  var shell = EP.$('#dashShell');
  var partnerEl = EP.$('#partnerLabel');
  var emailEl = EP.$('#userEmail');
  var roleEl = EP.$('#userRole');
  var ctaEl = EP.$('#onboardingCta');
  var ctaHint = EP.$('#onboardingCtaHint');

  EP.$('#logoutBtn').addEventListener('click', function () {
    EP.logout();
  });

  function applyCta(onboardingStatus) {
    if (!Shell || !ctaEl) return;
    var cta = Shell.dashboardCta({ onboardingStatus: onboardingStatus || 'not_started' });
    ctaEl.href = cta.href;
    ctaEl.textContent = cta.label;
    ctaEl.setAttribute('data-cta-kind', cta.kind);
    if (ctaHint) ctaHint.textContent = cta.hint || 'Beheer je bedrijfsprofiel en onboarding.';
    if (cta.kind === 'wait_for_review' || cta.kind === 'approved') {
      ctaEl.className = 'btn';
    } else {
      ctaEl.className = 'btn btn-primary';
    }
  }

  EP.requireSessionOrRedirect().then(async function (session) {
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

    var partnerId = m.partnerId || m.partner.id;
    applyCta('not_started');
    try {
      var res = await EP.apiFetch('onboarding-status', {
        method: 'GET',
        query: { partnerId: partnerId }
      });
      if (res.ok && res.body && res.body.ok) {
        applyCta(res.body.onboardingStatus);
      }
    } catch (e) {
      /* keep default CTA */
    }
  }).catch(function (err) {
    EP.setStatus(status, err.message || 'Er ging iets mis.', 'error');
  });
})();
