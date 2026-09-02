'use strict';

var { createAdminClient } = require('./supabase');

var ALLOWED_EVENTS = {
  landing_view: true,
  calculator_selected: true,
  calculator_started: true,
  calculator_completed: true,
  report_requested: true,
  marketplace_search: true,
  profile_opened: true,
  request_started: true,
  request_submitted: true,
  partner_interest_submitted: true
};

var ALLOWED_SURFACES = {
  home: true,
  calculator_chooser: true,
  calc1: true,
  calc2: true,
  marketplace: true,
  partner: true
};

var ALLOWED_CALCULATORS = {
  calc1: true,
  calc2: true
};

var ALLOWED_CATEGORIES = {
  dakwerken: true,
  badkamer: true,
  keuken: true,
  'ramen-deuren': true,
  isolatie: true,
  verwarming: true,
  elektriciteit: true,
  gevel: true,
  vloeren: true,
  schilderwerken: true,
  ventilatie: true,
  zonnepanelen: true
};

var PII_KEY_PATTERN = /^(email|phone|name|postcode|gemeente|description|message|slug|partner|user|session|token|ip|referrer|url|body|text)$/i;

function utcDateString(d) {
  d = d || new Date();
  return d.toISOString().slice(0, 10);
}

function cleanDim(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 64);
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate client/server analytics payload. Pure — no I/O.
 * @returns {{ ok: true, event: string, d1: string, d2: string } | { ok: false, code: string }}
 */
function validateAnalyticsPayload(body) {
  if (!isPlainObject(body)) {
    return { ok: false, code: 'validation_error' };
  }

  var keys = Object.keys(body);
  if (keys.length === 0 || keys.length > 4) {
    return { ok: false, code: 'validation_error' };
  }

  for (var i = 0; i < keys.length; i++) {
    if (PII_KEY_PATTERN.test(keys[i])) {
      return { ok: false, code: 'validation_error' };
    }
  }

  var event = cleanDim(body.event, 64);
  if (!ALLOWED_EVENTS[event]) {
    return { ok: false, code: 'unknown_event' };
  }

  var surface = body.surface != null ? cleanDim(body.surface, 64) : '';
  var calculator = body.calculator != null ? cleanDim(body.calculator, 64) : '';
  var category = body.category != null ? cleanDim(body.category, 64) : '';

  if (surface && !ALLOWED_SURFACES[surface]) {
    return { ok: false, code: 'validation_error' };
  }
  if (calculator && !ALLOWED_CALCULATORS[calculator]) {
    return { ok: false, code: 'validation_error' };
  }
  if (category && category !== 'all' && !ALLOWED_CATEGORIES[category]) {
    return { ok: false, code: 'validation_error' };
  }

  var d1 = '';
  var d2 = '';

  if (event === 'landing_view') {
    if (!surface) return { ok: false, code: 'validation_error' };
    d1 = surface;
  } else if (event === 'calculator_selected' || event === 'calculator_started' ||
      event === 'calculator_completed' || event === 'report_requested') {
    if (!calculator) return { ok: false, code: 'validation_error' };
    d1 = calculator;
    d2 = surface || '';
    if (d2 && !ALLOWED_SURFACES[d2]) return { ok: false, code: 'validation_error' };
  } else if (event === 'marketplace_search' || event === 'profile_opened' ||
      event === 'request_submitted') {
    d1 = category || 'all';
  } else if (event === 'request_started') {
    d1 = surface || 'marketplace';
    if (!ALLOWED_SURFACES[d1]) return { ok: false, code: 'validation_error' };
  } else if (event === 'partner_interest_submitted') {
    d1 = category || 'all';
  }

  return { ok: true, event: event, d1: d1, d2: d2 };
}

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /analytics_daily_counts/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('analytics_migration_needed', 'analytics_daily_counts');
    return 'missing_env';
  }
  return null;
}

/**
 * Increment aggregate counter. Best-effort — never throws.
 * @param {{ event: string, surface?: string, calculator?: string, category?: string }} payload
 */
async function incrementAnalyticsEvent(payload, opts) {
  opts = opts || {};
  payload = payload || {};
  try {
    var validated = validateAnalyticsPayload(payload);
    if (!validated.ok) {
      if (opts.strict) return validated;
      console.error('analytics_increment_rejected', validated.code, payload.event);
      return { ok: false, code: validated.code };
    }

    var admin = createAdminClient();
    var { error } = await admin.rpc('increment_analytics_daily_count', {
      p_event_date: utcDateString(),
      p_event_name: validated.event,
      p_dimension_1: validated.d1,
      p_dimension_2: validated.d2
    });

    if (error) {
      var schemaCode = schemaFailureCode(error);
      if (schemaCode) return { ok: false, code: schemaCode };
      console.error('analytics_increment_failed', {
        action: 'incrementAnalyticsEvent',
        event: validated.event,
        code: error.message
      });
      return { ok: false, code: 'server_error' };
    }

    return { ok: true };
  } catch (e) {
    console.error('analytics_increment_failed', {
      action: 'incrementAnalyticsEvent',
      event: payload && payload.event,
      code: e && e.message ? e.message : 'error'
    });
    return { ok: false, code: 'server_error' };
  }
}

module.exports = {
  ALLOWED_EVENTS: ALLOWED_EVENTS,
  ALLOWED_SURFACES: ALLOWED_SURFACES,
  ALLOWED_CALCULATORS: ALLOWED_CALCULATORS,
  ALLOWED_CATEGORIES: ALLOWED_CATEGORIES,
  validateAnalyticsPayload: validateAnalyticsPayload,
  incrementAnalyticsEvent: incrementAnalyticsEvent,
  utcDateString: utcDateString
};
