/**
 * ELYAN Professionals — Supabase server clients (Phase A)
 * Service role NEVER imported by browser bundles.
 */
var { createClient } = require('@supabase/supabase-js');

function requireEnv(name) {
  var v = process.env[name];
  if (!v) {
    var err = new Error('missing_env:' + name);
    err.code = 'missing_env';
    err.env = name;
    throw err;
  }
  return v;
}

function getUrl() {
  return requireEnv('SUPABASE_URL');
}

function getAnonKey() {
  return requireEnv('SUPABASE_ANON_KEY');
}

function getServiceKey() {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function createAdminClient() {
  return createClient(getUrl(), getServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function createAnonClient() {
  return createClient(getUrl(), getAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Validate caller identity via Supabase Auth (official getUser).
 * @param {string} accessToken
 */
async function getUserFromAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    return { user: null, error: 'missing_token' };
  }
  var client = createAnonClient();
  var { data, error } = await client.auth.getUser(accessToken);
  if (error || !data || !data.user) {
    return { user: null, error: error ? error.message : 'invalid_token' };
  }
  return { user: data.user, error: null };
}

function extractBearer(req) {
  var h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h || typeof h !== 'string') return null;
  var m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

module.exports = {
  createAdminClient,
  createAnonClient,
  getUserFromAccessToken,
  extractBearer,
  requireEnv,
  getUrl,
  getAnonKey
};
