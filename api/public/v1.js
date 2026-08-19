/**
 * GET|POST /api/public/v1/* — Marketplace public API (Design Freeze V3).
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
var { submitInterest } = require('../../server/interest-intake');
var { methodNotAllowed, readJson } = require('../../server/http');
var { rateLimit, clientKey } = require('../../server/rate-limit');

function statusForCode(code) {
  if (code === 'not_found') return 404;
  if (code === 'rate_limited') return 429;
  if (code === 'missing_env') return 503;
  if (code === 'server_error') return 500;
  if (code === 'category_required') return 400;
  if (code === 'location_invalid') return 400;
  if (code === 'validation_error') return 400;
  if (code === 'missing_fields') return 400;
  if (code === 'invalid_email') return 400;
  if (code === 'consent_required') return 400;
  if (code === 'method_not_allowed') return 405;
  return 400;
}

function userMessage(code) {
  var map = {
    not_found: 'Niet gevonden.',
    category_required: 'Kies een categorie.',
    location_invalid: 'Ongeldige locatie.',
    validation_error: 'Ongeldige parameters.',
    missing_fields: 'Vul alle verplichte velden in.',
    invalid_email: 'Ongeldig e-mailadres.',
    consent_required: 'Bevestig het privacy-akkoord om verder te gaan.',
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

function clientIp(req) {
  var ip =
    (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
    '';
  if (typeof ip === 'string' && ip.indexOf(',') >= 0) ip = ip.split(',')[0].trim();
  return String(ip || '').trim();
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

async function handleInterestPost(req, res) {
  var rl = rateLimit('public_interest:' + clientKey(req, 'interest'), 8, 10 * 60 * 1000);
  if (!rl.ok) {
    return sendError(res, 429, 'rate_limited');
  }

  var body = await readJson(req);
  var result = await submitInterest(body, {
    ip: clientIp(req),
    userAgent: req.headers && req.headers['user-agent']
  });

  if (!result.ok) {
    return sendError(res, statusForCode(result.code), result.code);
  }

  // Never expose PII or internal ids in the public response.
  var payload = { ok: true };
  if (result.duplicate) payload.duplicate = true;
  return sendJson(res, 200, payload, null);
}

async function handleGet(req, res) {
  var rl = rateLimit('public_v1:' + clientKey(req, 'public'), 120, 60 * 1000);
  if (!rl.ok) {
    return sendError(res, 429, 'rate_limited');
  }

  var path = parsePath(req);
  var q = queryObject(req);

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
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  var path = parsePath(req);

  if (req.method === 'POST') {
    if (path === 'interest') {
      try {
        return await handleInterestPost(req, res);
      } catch (e) {
        console.error('public_v1_interest_failed', e && e.message ? e.message : e);
        return sendError(res, 500, 'server_error');
      }
    }
    return methodNotAllowed(res, 'GET, HEAD');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return methodNotAllowed(res, 'GET, HEAD, POST');
  }

  try {
    return await handleGet(req, res);
  } catch (e) {
    console.error('public_v1_handler_failed', e && e.message ? e.message : e);
    return sendError(res, 500, 'server_error');
  }
};
