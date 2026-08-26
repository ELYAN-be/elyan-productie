/**
 * Audit logging — never store raw tokens or secrets in meta.
 */
var { createAdminClient } = require('./supabase');
var { clientIp } = require('./rate-limit');

var SENSITIVE_KEYS = {
  token: true,
  raw_token: true,
  password: true,
  access_token: true,
  refresh_token: true,
  service_role: true,
  authorization: true,
  token_hash: true
};

function scrubMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  var out = {};
  Object.keys(meta).forEach(function (k) {
    if (SENSITIVE_KEYS[k.toLowerCase()]) return;
    var v = meta[k];
    if (typeof v === 'string' && v.length > 500) v = v.slice(0, 500);
    out[k] = v;
  });
  return out;
}

function clientMeta(req) {
  var ip = clientIp(req);
  if (ip === 'unknown') {
    ip =
      (req.socket && req.socket.remoteAddress) ||
      null;
  }
  var ua = (req.headers && req.headers['user-agent']) || null;
  return { ip: ip, user_agent: ua ? String(ua).slice(0, 300) : null };
}

async function writeAudit(opts) {
  var admin = createAdminClient();
  var cm = opts.req ? clientMeta(opts.req) : {};
  var row = {
    actor_user_id: opts.actorUserId || null,
    actor_type: opts.actorType || 'system',
    partner_id: opts.partnerId || null,
    action: opts.action,
    meta: scrubMeta(opts.meta || {}),
    ip: cm.ip || null,
    user_agent: cm.user_agent || null
  };
  var { error } = await admin.from('audit_logs').insert(row);
  if (error) {
    console.error('audit_log_write_failed', error.message);
  }
}

module.exports = { writeAudit, scrubMeta, clientMeta };
