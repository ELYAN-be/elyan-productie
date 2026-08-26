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

  function apiProfessionals(action, options) {
    options = options || {};
    var q = '?action=' + encodeURIComponent(action);
    if (options.query) {
      Object.keys(options.query).forEach(function (k) {
        q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(options.query[k]);
      });
    }
    return '/api/professionals' + q;
  }

  function apiControl(action, options) {
    options = options || {};
    var q = '?action=' + encodeURIComponent(action);
    if (options.query) {
      Object.keys(options.query).forEach(function (k) {
        q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(options.query[k]);
      });
    }
    return '/api/control' + q;
  }

  async function loadConfig() {
    if (cfgPromise) return cfgPromise;
    cfgPromise = fetch(apiProfessionals('public-config'), { credentials: 'same-origin' })
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
    // detectSessionInUrl MUST stay true so forgot-password recovery links
    // (?code= PKCE / #access_token=) establish a session. Invite password
    // setup no longer embeds Supabase OTP in the URL, so auto-detect is safe.
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

  async function apiFetch(action, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.auth !== false) {
      var token = await getAccessToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    var method = options.method || 'GET';
    var body = options.body ? Object.assign({ action: action }, options.body) : null;
    var url = apiProfessionals(action, { query: options.query });
    var res = await fetch(url, {
      method: method,
      headers: headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body || { action: action }),
      credentials: 'same-origin'
    });
    var parsed = null;
    try { parsed = await res.json(); } catch (e) { parsed = {}; }
    return { ok: res.ok, status: res.status, body: parsed };
  }

  async function controlFetch(action, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.auth !== false) {
      var token = await getAccessToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    var method = options.method || 'GET';
    var body = options.body ? Object.assign({ action: action }, options.body) : null;
    var url = apiControl(action, { query: options.query });
    var res = await fetch(url, {
      method: method,
      headers: headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body || { action: action }),
      credentials: 'same-origin'
    });
    var parsed = null;
    try { parsed = await res.json(); } catch (e) { parsed = {}; }
    return { ok: res.ok, status: res.status, body: parsed };
  }

  async function requireStaffOrRedirect() {
    var nextPath = location.pathname + location.search;
    if (nextPath.indexOf('/professionals/') !== 0) nextPath = '/professionals/control';
    var sb = await getSupabase();
    var { data } = await sb.auth.getSession();
    if (!data || !data.session) {
      location.replace('/professionals/login?next=' + encodeURIComponent(nextPath));
      return null;
    }
    var sessionRes = await controlFetch('session');
    if (sessionRes.status === 401) {
      await sb.auth.signOut();
      location.replace('/professionals/login?next=' + encodeURIComponent(nextPath));
      return null;
    }
    if (sessionRes.status === 403 || !sessionRes.ok) {
      return { error: sessionRes.body, notStaff: true };
    }
    return sessionRes.body;
  }

  async function requireSessionOrRedirect() {
    var sb = await getSupabase();
    var { data } = await sb.auth.getSession();
    if (!data || !data.session) {
      var next = encodeURIComponent(location.pathname + location.search);
      location.replace('/professionals/login?next=' + next);
      return null;
    }
    var sessionRes = await apiFetch('session');
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
    try { await apiFetch('logout', { method: 'POST', body: {} }); } catch (e) { /* ignore */ }
    try {
      var sb = await getSupabase();
      await sb.auth.signOut();
    } catch (e2) { /* ignore */ }
    location.replace('/professionals/login');
  }

  /** Cache of object URLs for authorized private draft previews (Bearer cannot ride on <img src>). */
  var previewObjectUrls = {};

  function isPrivatePreviewPath(url) {
    return typeof url === 'string' && url.indexOf('/api/professionals/asset-preview') === 0;
  }

  /**
   * Resolve a media URL for display. Public CDN URLs pass through.
   * Private preview routes are fetched with Authorization and returned as blob: URLs.
   */
  async function resolveMediaUrl(url) {
    if (!url) return '';
    if (!isPrivatePreviewPath(url)) return url;
    if (previewObjectUrls[url]) return previewObjectUrls[url];
    var token = await getAccessToken();
    if (!token) return '';
    var res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!res.ok) return '';
    var blob = await res.blob();
    var obj = URL.createObjectURL(blob);
    previewObjectUrls[url] = obj;
    return obj;
  }

  function revokePreviewMediaCache() {
    Object.keys(previewObjectUrls).forEach(function (k) {
      try {
        URL.revokeObjectURL(previewObjectUrls[k]);
      } catch (e) { /* ignore */ }
    });
    previewObjectUrls = {};
  }

  global.ElyanProfessionals = {
    $,
    showEl,
    setStatus,
    loadConfig,
    getSupabase,
    getAccessToken,
    apiFetch,
    controlFetch,
    apiProfessionals,
    apiControl,
    requireSessionOrRedirect,
    requireStaffOrRedirect,
    logout,
    resolveMediaUrl,
    revokePreviewMediaCache,
    isPrivatePreviewPath
  };
})(window);
