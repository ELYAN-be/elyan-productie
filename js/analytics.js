/* ELYAN — privacy-first aggregate analytics (no cookies, no IDs) */
(function (global) {
  'use strict';

  var fired = Object.create(null);

  function once(key) {
    if (fired[key]) return false;
    fired[key] = true;
    return true;
  }

  function track(event, payload) {
    payload = payload || {};
    var body = { event: event };
    if (payload.surface) body.surface = payload.surface;
    if (payload.calculator) body.calculator = payload.calculator;
    if (payload.category) body.category = payload.category;

    try {
      fetch('/api/analytics', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () { /* best effort */ });
    } catch (e) { /* ignore */ }
  }

  function trackOnce(key, event, payload) {
    if (!once(key)) return;
    track(event, payload);
  }

  global.ElyanAnalytics = {
    track: track,
    trackOnce: trackOnce
  };
})(window);
