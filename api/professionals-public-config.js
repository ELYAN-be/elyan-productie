/**
 * GET /api/professionals/public-config
 * Public Supabase URL + anon key only (never service role).
 */
var { json, methodNotAllowed, errorJson } = require('./lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  var url = process.env.SUPABASE_URL;
  var anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return errorJson(res, 503, 'missing_env');
  return json(res, 200, {
    ok: true,
    supabaseUrl: url,
    supabaseAnonKey: anon,
    appUrl: (process.env.PROFESSIONALS_APP_URL || '').replace(/\/$/, '')
  });
};
