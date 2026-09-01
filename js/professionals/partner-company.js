(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanProShell;
  var root = EP.$('#profRoot');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function row(label, value, tag) {
    return '<div class="prof-meta"><div><span>' + esc(label) + '</span><strong>' +
      esc(value || '—') + (tag ? ' <em class="prof-tag">' + esc(tag) + '</em>' : '') + '</strong></div></div>';
  }

  EP.requireSessionOrRedirect().then(async function (session) {
    if (!session || session.noMembership) {
      root.innerHTML = '<p class="prof-status is-error">Log in via je uitnodigingslink.</p>';
      return;
    }
    var partnerId = session.memberships[0].partnerId || session.memberships[0].partner.id;
    var body = Shell.mountShell({
      host: root,
      active: 'bedrijf',
      title: 'Mijn bedrijf',
      subtitle: 'Account- en bedrijfsgegevens.'
    });
    try {
      var res = await EP.apiFetch('onboarding', { method: 'GET', query: { partnerId: partnerId } });
      if (!res.ok || !res.body.ok) throw new Error('Kon gegevens niet laden.');
      var c = (res.body.draft && res.body.draft.company) || {};
      body.innerHTML =
        '<div class="prof-card">' +
        row('Bedrijfsnaam', c.display_name || c.legal_name, 'Publiek') +
        row('Contactpersoon', c.contact_name, 'Alleen voor ELYAN') +
        row('E-mail', c.email, 'Alleen voor ELYAN') +
        row('Telefoon', c.phone, 'Alleen voor ELYAN') +
        row('Ondernemingsnummer', c.kbo, 'Alleen voor ELYAN') +
        '<div class="prof-actions"><a class="btn btn-primary" href="/professionals/onboarding">Gegevens wijzigen</a></div>' +
        '</div>';
    } catch (e) {
      body.innerHTML = '<p class="prof-status is-error">' + esc(e.message) + '</p>';
    }
  });
})();
