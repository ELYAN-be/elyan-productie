/**
 * ELYAN Professionals V1 — shared shell navigation.
 */
(function (root) {
  'use strict';

  var NAV = [
    { id: 'aanvragen', href: '/professionals/dashboard', label: 'Aanvragen' },
    { id: 'beschikbaarheid', href: '/professionals/beschikbaarheid', label: 'Beschikbaarheid' },
    { id: 'profiel', href: '/professionals/mijn-profiel', label: 'Mijn profiel' },
    { id: 'bedrijf', href: '/professionals/mijn-bedrijf', label: 'Mijn bedrijf' }
  ];

  function renderNav(activeId) {
    return '<nav class="prof-v1-nav" aria-label="Partner navigatie">' +
      NAV.map(function (item) {
        var current = item.id === activeId ? ' aria-current="page"' : '';
        return '<a class="prof-v1-nav-link' + (item.id === activeId ? ' is-active' : '') + '" href="' +
          item.href + '"' + current + '>' + item.label + '</a>';
      }).join('') +
      '</nav>';
  }

  function mountShell(opts) {
    opts = opts || {};
    var host = opts.host;
    if (!host) return;
    host.innerHTML =
      '<div class="prof-v1-shell">' +
      '<header class="prof-v1-head">' +
      '<p class="lab-kicker">ELYAN for Professionals</p>' +
      '<div class="prof-v1-head-row">' +
      '<div><h1 class="prof-v1-title">' + (opts.title || 'Dashboard') + '</h1>' +
      (opts.subtitle ? '<p class="lab-hint">' + opts.subtitle + '</p>' : '') +
      '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="profLogoutBtn">Uitloggen</button>' +
      '</div>' +
      renderNav(opts.active || 'aanvragen') +
      '</header>' +
      '<div id="profV1Body" class="prof-v1-body"></div>' +
      '</div>';
    var logout = document.getElementById('profLogoutBtn');
    if (logout && root.ElyanProfessionals) {
      logout.addEventListener('click', function () {
        root.ElyanProfessionals.logout();
      });
    }
    return document.getElementById('profV1Body');
  }

  root.ElyanProShell = {
    NAV: NAV,
    renderNav: renderNav,
    mountShell: mountShell
  };
})(typeof window !== 'undefined' ? window : global);
