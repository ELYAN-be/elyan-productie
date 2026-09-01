(function () {
  'use strict';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function syncMenuLabels(btn, open) {
    var label = $('.hp-menu-label', btn);
    if (label) {
      label.textContent = open
        ? (label.getAttribute('data-label-open') || 'Sluiten')
        : (label.getAttribute('data-label-closed') || 'Menu');
    }
    btn.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function initMobileNav() {
    var btn = $('#hpMenuBtn');
    var panel = $('#hpMobileNav');
    if (!btn || !panel) return;

    function close() {
      syncMenuLabels(btn, false);
      panel.classList.remove('is-open');
      document.body.classList.remove('vk-menu-open');
      btn.focus();
    }

    function open() {
      syncMenuLabels(btn, true);
      panel.classList.add('is-open');
      document.body.classList.add('vk-menu-open');
      var first = panel.querySelector('a, .btn');
      if (first) first.focus();
    }

    syncMenuLabels(btn, false);

    btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-expanded') === 'true') close();
      else open();
    });

    $all('a, .btn', panel).forEach(function (el) {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();
