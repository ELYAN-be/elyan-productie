'use strict';

var { validateAnalyticsPayload, incrementAnalyticsEvent } = require('../server/analytics');
var { rateLimit, clientKey } = require('../server/rate-limit');
var { readJson, methodNotAllowed } = require('../server/http');

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return methodNotAllowed(res, 'POST');
  }

  var rl = rateLimit(clientKey(req, 'analytics'), 120, 60 * 1000);
  if (!rl.ok) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  var body;
  try {
    body = await readJson(req);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'validation_error' });
  }

  if (body && typeof body === 'object' && JSON.stringify(body).length > 512) {
    return res.status(400).json({ ok: false, error: 'validation_error' });
  }

  var validated = validateAnalyticsPayload(body);
  if (!validated.ok) {
    return res.status(400).json({ ok: false, error: validated.code });
  }

  var result = await incrementAnalyticsEvent(body, { strict: true });
  if (!result.ok && result.code === 'missing_env') {
    return res.status(503).json({ ok: false, error: 'missing_env' });
  }

  // Best effort: always return ok to client unless validation failed.
  return res.status(200).json({ ok: true });
};
