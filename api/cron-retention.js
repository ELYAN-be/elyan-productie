/**
 * ELYAN retention cron — service-side only.
 * Vercel Cron GET with Authorization: Bearer $CRON_SECRET.
 * Defaults to dry-run. Set RETENTION_APPLY=true to apply deletes.
 *
 * Path: /api/cron-retention (top-level api file so Vercel bundles ../server/*).
 */
'use strict';

var { createAdminClient } = require('../server/supabase');
var { runRetention } = require('../server/retention');

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
}

function forbid(res) {
  res.statusCode = 405;
  res.setHeader('Allow', 'GET, POST');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
}

function readBearer(req) {
  var h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h || typeof h !== 'string') return null;
  var m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return forbid(res);
  }

  var secret = process.env.CRON_SECRET;
  if (!secret) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'missing_env', env: 'CRON_SECRET' }));
  }

  var token = readBearer(req);
  if (!token || token !== secret) {
    return unauthorized(res);
  }

  var applyFlag = String(process.env.RETENTION_APPLY || '').toLowerCase();
  var dryRun = !(applyFlag === '1' || applyFlag === 'true' || applyFlag === 'yes');

  var admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'missing_env' }));
  }

  var result = await runRetention(admin, { dryRun: dryRun });
  res.statusCode = result.ok ? 200 : 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: result.ok,
      dryRun: dryRun,
      summary: result.plan && result.plan.summary,
      planned: result.plan && result.plan.actions ? result.plan.actions.length : 0,
      applied: result.apply && result.apply.applied,
      notes: result.plan && result.plan.notes,
      error: result.error || result.code || null
    })
  );
};
