(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanProShell;
  var root = EP.$('#profRoot');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  EP.requireSessionOrRedirect().then(async function (session) {
    if (!session || session.noMembership) {
      root.innerHTML = '<p class="prof-status is-error">Log in via je uitnodigingslink.</p>';
      return;
    }
    var partnerId = session.memberships[0].partnerId || session.memberships[0].partner.id;
    var body = Shell.mountShell({
      host: root,
      active: 'profiel',
      title: 'Mijn profiel',
      subtitle: 'Zo verschijnt je bedrijf op ELYAN.'
    });
    body.innerHTML = '<p class="prof-status is-info">Profiel laden…</p>';
    try {
      var res = await EP.apiFetch('partner-profile-summary', {
        method: 'GET',
        query: { partnerId: partnerId }
      });
      if (!res.ok || !res.body.ok) throw new Error('Kon profiel niet laden.');
      var p = res.body.composedProfile || {};
      var issues = (res.body.issues || []).map(function (i) { return '<li>' + esc(i.message) + '</li>'; }).join('');
      body.innerHTML =
        '<div class="prof-card">' +
        '<h2>Preview</h2>' +
        (p.introduction ? '<p><strong>' + esc(p.introduction) + '</strong></p>' : '') +
        (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
        (p.workAreaCopy ? '<p class="lab-hint">Werkgebied: ' + esc(p.workAreaCopy) + '</p>' : '') +
        (issues ? '<ul class="prof-issues">' + issues + '</ul>' : '') +
        '<div class="prof-actions">' +
        '<a class="btn btn-primary" href="/professionals/onboarding">Gegevens aanpassen</a>' +
        '</div></div>';
    } catch (e) {
      body.innerHTML = '<p class="prof-status is-error">' + esc(e.message) + '</p>';
    }
  });
})();
