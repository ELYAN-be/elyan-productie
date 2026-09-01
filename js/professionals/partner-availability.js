(function () {
  'use strict';
  var EP = window.ElyanProfessionals;
  var Shell = window.ElyanProShell;
  var OPTIONS = [
    { id: 'nu', label: 'Nu' },
    { id: 'binnen_1_maand', label: 'Binnen 1 maand' },
    { id: 'binnen_2_3_maanden', label: 'Binnen 2–3 maanden' },
    { id: 'later', label: 'Later' },
    { id: 'tijdelijk_volzet', label: 'Tijdelijk volzet' }
  ];

  var root = EP.$('#profRoot');
  var partnerId = null;
  var selected = '';

  function render() {
    var body = Shell.mountShell({
      host: root,
      active: 'beschikbaarheid',
      title: 'Beschikbaarheid',
      subtitle: 'Laat weten wanneer je nieuwe projecten kan opnemen.'
    });
    body.innerHTML =
      '<div class="prof-card">' +
      '<div class="lab-choice-grid">' +
      OPTIONS.map(function (o) {
        return '<button type="button" class="lab-choice btn-block' + (selected === o.id ? ' is-selected' : '') +
          '" data-capacity="' + o.id + '">' + o.label + '</button>';
      }).join('') +
      '</div>' +
      '<p id="availStatus" class="prof-status" hidden></p>' +
      '</div>';

    body.querySelectorAll('[data-capacity]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        selected = btn.getAttribute('data-capacity');
        render();
        try {
          var res = await EP.apiFetch('partner-availability-save', {
            method: 'POST',
            query: { partnerId: partnerId },
            body: { capacity: selected }
          });
          if (!res.ok || !res.body.ok) throw new Error('Opslaan mislukt.');
          EP.setStatus(EP.$('#availStatus'), 'Beschikbaarheid opgeslagen.', 'success');
        } catch (e) {
          EP.setStatus(EP.$('#availStatus'), e.message || 'Er ging iets mis.', 'error');
        }
      });
    });
  }

  EP.requireSessionOrRedirect().then(async function (session) {
    if (!session || session.noMembership) {
      root.innerHTML = '<p class="prof-status is-error">Log in via je uitnodigingslink.</p>';
      return;
    }
    partnerId = session.memberships[0].partnerId || session.memberships[0].partner.id;
    try {
      var cur = await EP.apiFetch('onboarding', { method: 'GET', query: { partnerId: partnerId } });
      if (cur.ok && cur.body && cur.body.draft && cur.body.draft.offer) {
        selected = cur.body.draft.offer.capacity || '';
      }
    } catch (e) { /* ignore */ }
    render();
  });
})();
