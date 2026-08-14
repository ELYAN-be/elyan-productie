/* ELYAN for Professionals — browser helpers (Phase A) */
(function (global) {
  'use strict';

  var cfgPromise = null;
  var supabaseClient = null;

  function $(sel, root) { return (root || document).querySelector(sel); }

  function showEl(el, on) {
    if (!el) return;
    el.hidden = !on;
  }

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'prof-status' + (kind ? ' is-' + kind : '');
    el.hidden = !message;
  }

  function apiUrl(path) {
    return path;
  }

  async function loadConfig() {
    if (cfgPromise) return cfgPromise;
    cfgPromise = fetch(apiUrl('/api/professionals-public-config'), { credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.body || !res.body.ok) {
          var err = new Error((res.body && res.body.message) || 'Configuratie ontbreekt');
          err.code = (res.body && res.body.error) || 'missing_env';
          throw err;
        }
        return res.body;
      });
    return cfgPromise;
  }

  async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (!global.supabase || !global.supabase.createClient) {
      throw new Error('Supabase client niet geladen');
    }
    var cfg = await loadConfig();
    supabaseClient = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    return supabaseClient;
  }

  async function getAccessToken() {
    var sb = await getSupabase();
    var { data } = await sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  }

  async function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.auth !== false) {
      var token = await getAccessToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    var res = await fetch(apiUrl(path), {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin'
    });
    var body = null;
    try { body = await res.json(); } catch (e) { body = {}; }
    return { ok: res.ok, status: res.status, body: body };
  }

  async function requireSessionOrRedirect() {
    var sb = await getSupabase();
    var { data } = await sb.auth.getSession();
    if (!data || !data.session) {
      var next = encodeURIComponent(location.pathname + location.search);
      location.replace('/professionals/login?next=' + next);
      return null;
    }
    var sessionRes = await apiFetch('/api/professionals-session');
    if (sessionRes.status === 401) {
      await sb.auth.signOut();
      location.replace('/professionals/login?next=' + encodeURIComponent(location.pathname));
      return null;
    }
    if (!sessionRes.ok) {
      return { error: sessionRes.body };
    }
    if (!sessionRes.body.memberships || !sessionRes.body.memberships.length) {
      return { user: sessionRes.body.user, memberships: [], noMembership: true };
    }
    return sessionRes.body;
  }

  async function logout() {
    try { await apiFetch('/api/professionals-logout', { method: 'POST', body: {} }); } catch (e) { /* ignore */ }
    try {
      var sb = await getSupabase();
      await sb.auth.signOut();
    } catch (e2) { /* ignore */ }
    location.replace('/professionals/login');
  }

  global.ElyanProfessionals = {
    $,
    showEl,
    setStatus,
    loadConfig,
    getSupabase,
    getAccessToken,
    apiFetch,
    requireSessionOrRedirect,
    logout
  };
})(window);
