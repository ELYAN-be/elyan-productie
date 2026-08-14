/**
 * Best-effort in-memory rate limiter for serverless instances.
 * Not a global distributed limiter — still blocks burst abuse per instance.
 */
var buckets = Object.create(null);

function rateLimit(key, limit, windowMs) {
  var now = Date.now();
  var b = buckets[key];
  if (!b || now > b.resetAt) {
    buckets[key] = { count: 1, resetAt: now + windowMs };
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  return { ok: true, remaining: limit - b.count };
}

function clientKey(req, suffix) {
  var ip =
    (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
    'unknown';
  if (typeof ip === 'string' && ip.indexOf(',') >= 0) ip = ip.split(',')[0].trim();
  return String(ip) + ':' + suffix;
}

module.exports = { rateLimit, clientKey };
