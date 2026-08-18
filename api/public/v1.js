/**
 * GET /api/public/v1/* — Marketplace public API (Design Freeze V3).
 * No auth. Fail closed. No private debug in production responses.
 *
 * Non-Next Vercel does not support multi-segment catch-all filesystem routes.
 * Nested paths are rewritten in vercel.json to this function with ?path=.
 */
'use strict';

var {
  listCategories,
  listProblems,
  getProfessionalBySlug,
  searchProfessionals
} = require('../../server/marketplace-public');
var { methodNotAllowed } = require('../../server/http');
var { rateLimit, clientKey } = require('../../server/rate-limit');

function statusForCode(code) {
  if (code === 'not_found') return 404;
  if (code === 'rate_limited') return 429;
  if (code === 'missing_env') return 503;
  if (code === 'server_error') return 500;
  if (code === 'category_required') return 400;
  if (code === 'location_invalid') return 400;
  if (code === 'validation_error') return 400;
  if (code === 'method_not_allowed') return 405;
  return 400;
}

function userMessage(code) {
  var map = {
    not_found: 'Niet gevonden.',
    category_required: 'Kies een categorie.',
    location_invalid: 'Ongeldige locatie.',
    validation_error: 'Ongeldige parameters.',
    rate_limited: 'Te veel verzoeken. Probeer later opnieuw.',
    server_error: 'Er ging iets mis.',
    missing_env: 'Dienst tijdelijk niet beschikbaar.'
  };
  return map[code] || 'Verzoek mislukt.';
}

function normalizePathValue(raw) {
  if (raw == null || raw === '') return '';
  if (Array.isArray(raw)) {
    return raw
      .map(String)
      .filter(Boolean)
      .join('/')
      .replace(/^\/+|\/+$/g, '');
  }
  return String(raw).replace(/^\/+|\/+$/g, '');
}

function parsePath(req) {
  if (req.query && req.query.path != null && req.query.path !== '') {
    return normalizePathValue(req.query.path);
  }
  try {
    var u = new URL(req.url, 'http://localhost');
    var p = u.pathname || '';
    var idx = p.indexOf('/api/public/v1');
    if (idx >= 0) {
      return p
        .slice(idx + '/api/public/v1'.length)
        .replace(/^\/+|\/+$/g, '');
    }
  } catch (e) { /* ignore */ }
  return '';
}

function queryObject(req) {
  var out = {};
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(function (k) {
      if (k === 'path') return;
      out[k] = req.query[k];
    });
  }
  try {
    var u = new URL(req.url, 'http://localhost');
    u.searchParams.forEach(function (v, k) {
      if (k === 'path') return;
      out[k] = v;
    });
  } catch (e) { /* ignore */ }
  return out;
}

function sendJson(res, status, body, cacheKind) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (cacheKind === 'profile') {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  } else if (cacheKind === 'search') {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  } else if (cacheKind === 'meta') {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.end(JSON.stringify(body));
}

function sendError(res, status, code) {
  return sendJson(res, status, { error: code, message: userMessage(code) }, null);
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return methodNotAllowed(res, 'GET, HEAD');
  }

  var rl = rateLimit('public_v1:' + clientKey(req, 'public'), 120, 60 * 1000);
  if (!rl.ok) {
    return sendError(res, 429, 'rate_limited');
  }

  var path = parsePath(req);
  var q = queryObject(req);

  try {
    if (path === 'categories') {
      return sendJson(res, 200, { ok: true, categories: listCategories() }, 'meta');
    }

    if (path === 'problems') {
      return sendJson(res, 200, { ok: true, problems: listProblems() }, 'meta');
    }

    if (path === 'search') {
      var result = await searchProfessionals(q);
      if (!result.ok) {
        return sendError(res, statusForCode(result.code), result.code);
      }
      return sendJson(res, 200, result, 'search');
    }

    var profMatch = path.match(/^professionals\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (profMatch) {
      var got = await getProfessionalBySlug(profMatch[1]);
      if (!got.ok) {
        return sendError(res, statusForCode(got.code), got.code);
      }
      return sendJson(res, 200, { ok: true, professional: got.professional }, 'profile');
    }

    return sendError(res, 404, 'not_found');
  } catch (e) {
    console.error('public_v1_handler_failed', e && e.message ? e.message : e);
    return sendError(res, 500, 'server_error');
  }
};
