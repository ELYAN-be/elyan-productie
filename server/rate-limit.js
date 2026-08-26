/**
 * Best-effort in-memory rate limiter for serverless instances.
 *
 * Phase 1 role: secondary burst damping only. Buckets live in process memory,
 * reset on cold start, and do not sync across Vercel instances. This is NOT a
 * globally distributed limiter. Edge/WAF protection is configured separately
 * (outside this application code).
 */
var buckets = Object.create(null);

function rateLimit(key, limit, windowMs) {
  var now = Date.now();
  var safeKey = String(key == null ? 'unknown' : key);
  var b = buckets[safeKey];
  if (!b || now > b.resetAt) {
    buckets[safeKey] = { count: 1, resetAt: now + windowMs };
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  return { ok: true, remaining: limit - b.count };
}

/**
 * Normalize a header value that may be a string or string[].
 * Never prefer untrusted left-most XFF hops for client identity.
 */
function headerString(value) {
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] === 'string' && value[i].trim()) return value[i].trim();
    }
    return '';
  }
  if (typeof value === 'string') return value.trim();
  return '';
}

/**
 * Resolve client IP for rate-limit / audit keys.
 * Precedence: x-vercel-forwarded-for → x-real-ip → rightmost x-forwarded-for.
 * Clients can prepend spoofed addresses to XFF; never trust the left-most hop.
 */
function clientIp(req) {
  var h = (req && req.headers) || {};
  var vercel = headerString(h['x-vercel-forwarded-for']);
  if (vercel) {
    return vercel.split(',')[0].trim() || 'unknown';
  }
  var real = headerString(h['x-real-ip']);
  if (real) {
    return real.split(',')[0].trim() || 'unknown';
  }
  var xff = headerString(h['x-forwarded-for']);
  if (xff) {
    var parts = xff
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

function clientKey(req, suffix) {
  return clientIp(req) + ':' + String(suffix == null ? '' : suffix);
}

module.exports = { rateLimit, clientKey, clientIp };
