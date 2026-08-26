/**
 * GET /api/professionals/asset-preview?assetId=&partnerId=
 * Streams a private draft original after membership or staff authZ.
 * Same-origin <img> requests send session cookies.
 */
var { requireUser, requirePartnerContext, isStaff } = require('../../server/tenancy');
var { loadPrivatePreviewBuffer } = require('../../server/assets');
var { rateLimit, clientKey } = require('../../server/rate-limit');

function queryParam(req, name) {
  if (req.query && req.query[name] != null) return String(req.query[name]).trim();
  if (req.url) {
    try {
      var u = new URL(req.url, 'http://localhost');
      return (u.searchParams.get(name) || '').trim();
    } catch (e) {
      return '';
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  var rl = rateLimit(clientKey(req, 'asset_preview'), 120, 60 * 1000);
  if (!rl.ok) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'rate_limited' }));
    return;
  }

  var assetId = queryParam(req, 'assetId');
  var partnerId = queryParam(req, 'partnerId');
  if (!assetId || !partnerId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'missing_fields' }));
    return;
  }

  var auth = await requireUser(req);
  if (!auth.ok) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: auth.code || 'missing_token' }));
    return;
  }

  var staffInfo = await isStaff(auth.user.id);
  var staff = !!(staffInfo && staffInfo.staff);

  if (!staff) {
    var ctx = await requirePartnerContext(req, partnerId);
    if (!ctx.ok) {
      res.statusCode = ctx.code === 'forbidden' || ctx.code === 'no_membership' ? 403 : 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: ctx.code || 'forbidden' }));
      return;
    }
  }

  var preview = await loadPrivatePreviewBuffer({
    partnerId: partnerId,
    assetId: assetId
  });

  if (!preview.ok) {
    if (preview.code === 'legacy_public_only' && preview.publicUrl) {
      res.statusCode = 302;
      res.setHeader('Location', preview.publicUrl);
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }
    var status =
      preview.code === 'forbidden'
        ? 403
        : preview.code === 'missing_env'
          ? 503
          : preview.code === 'not_found'
            ? 404
            : 400;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: preview.code || 'not_found' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', preview.contentType || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(preview.buffer);
};
