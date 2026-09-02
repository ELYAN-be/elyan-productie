/**
 * Marketplace Interest Intake — server logic.
 * Targeted request: customer PII is shared with the one chosen published partner.
 */
'use strict';

var crypto = require('crypto');
var { createAdminClient } = require('./supabase');
var { getProfessionalBySlug } = require('./marketplace-public');
var { isPartnerAtCapacity } = require('./public-snapshot');
var { createRequestFromInterest, ensureRequestForIntakeId } = require('./customer-requests');
var { incrementAnalyticsEvent } = require('./analytics');

var DEDUPE_WINDOW_MS = 5 * 60 * 1000;
var MAX = {
  name: 120,
  email: 160,
  phone: 40,
  location: 160,
  description: 2000
};

function clean(str, max) {
  return String(str == null ? '' : str)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max || 200);
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /interest_intakes/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    console.error('interest_intake_migration_needed', 'interest_intakes');
    return 'missing_env';
  }
  return null;
}

function hashValue(raw) {
  return crypto.createHash('sha256').update(String(raw || ''), 'utf8').digest('hex');
}

function buildDedupeKey(email, partnerId) {
  return hashValue(String(email).toLowerCase() + '|' + String(partnerId));
}

/**
 * Validate client payload. Pure — no I/O.
 * @returns {{ ok: true, data } | { ok: false, code: string }}
 */
function validateInterestPayload(body) {
  body = body || {};

  // Honeypot: bots fill hidden website/company fields.
  var honeypot = clean(body.website || body.company || body.url, 200);
  if (honeypot) {
    return { ok: true, data: { spam: true } };
  }

  var partnerSlug = clean(body.partnerSlug || body.slug, 80).toLowerCase();
  var name = clean(body.name, MAX.name);
  var email = clean(body.email, MAX.email).toLowerCase();
  var phone = clean(body.phone, MAX.phone);
  var locationText = clean(
    body.location || body.locationText || body.postcodeGemeente || body.postcode,
    MAX.location
  );
  var description = clean(body.description || body.message || body.project, MAX.description);
  if (!partnerSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(partnerSlug)) {
    return { ok: false, code: 'not_found' };
  }
  if (!name || !email || !locationText || !description) {
    return { ok: false, code: 'missing_fields' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, code: 'invalid_email' };
  }
  if (description.length < 10) {
    return { ok: false, code: 'validation_error' };
  }

  return {
    ok: true,
    data: {
      spam: false,
      partnerSlug: partnerSlug,
      name: name,
      email: email,
      phone: phone || null,
      locationText: locationText,
      description: description,
      consent: true
    }
  };
}

/**
 * Resolve published partner for intake. Fail closed for unpublished/paused/hidden.
 */
async function resolvePublicPartner(slug) {
  var got = await getProfessionalBySlug(slug);
  if (!got.ok) return got;

  var snap = got.professional;
  var admin = createAdminClient();
  var { data: profile, error } = await admin
    .from('partner_profiles')
    .select('partner_id, slug, profile_status, public_snapshot')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    var schemaCode = schemaFailureCode(error);
    if (schemaCode) return { ok: false, code: schemaCode };
    console.error('interest_partner_resolve_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!profile || !profile.partner_id) {
    return { ok: false, code: 'not_found' };
  }

  if (isPartnerAtCapacity(snap)) {
    return { ok: false, code: 'partner_unavailable' };
  }

  return {
    ok: true,
    partnerId: profile.partner_id,
    slug: profile.slug || slug,
    categoryId: (snap && snap.primaryCategoryId) || null,
    professional: snap
  };
}

async function findRecentDuplicate(admin, dedupeKey) {
  var since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  var { data, error } = await admin
    .from('interest_intakes')
    .select('id, created_at')
    .eq('dedupe_key', dedupeKey)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    var schemaCode = schemaFailureCode(error);
    if (schemaCode) return { ok: false, code: schemaCode };
    console.error('interest_dedupe_lookup_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (data && data.length) {
    return { ok: true, duplicate: true, id: data[0].id };
  }
  return { ok: true, duplicate: false };
}

/**
 * Submit interest intake.
 * @param {object} body
 * @param {{ ip?: string, userAgent?: string }} meta
 */
async function submitInterest(body, meta) {
  meta = meta || {};
  var validated = validateInterestPayload(body);
  if (!validated.ok) return validated;

  // Silent success for honeypot spam — no DB write, no partner notify.
  if (validated.data.spam) {
    return { ok: true, spam: true };
  }

  var data = validated.data;
  var resolved = await resolvePublicPartner(data.partnerSlug);
  if (!resolved.ok) return resolved;

  var admin = createAdminClient();
  var dedupeKey = buildDedupeKey(data.email, resolved.partnerId);
  var dup = await findRecentDuplicate(admin, dedupeKey);
  if (!dup.ok) return dup;
  if (dup.duplicate) {
    // Partial-failure recovery: intake may exist without customer_request.
    // Never return customer-facing success until the canonical request is ensured.
    var ensured = await ensureRequestForIntakeId(dup.id);
    if (!ensured.ok) {
      console.error('interest_duplicate_ensure_failed', ensured.code);
      return { ok: false, code: ensured.code || 'server_error' };
    }
    return { ok: true, duplicate: true, id: dup.id };
  }

  var ipHash = meta.ip ? hashValue(meta.ip) : null;
  var ua = meta.userAgent ? clean(meta.userAgent, 240) : null;

  var row = {
    partner_id: resolved.partnerId,
    partner_slug: resolved.slug,
    category_id: resolved.categoryId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    location_text: data.locationText,
    description: data.description,
    consent_at: new Date().toISOString(),
    dedupe_key: dedupeKey,
    ip_hash: ipHash,
    user_agent: ua,
    status: 'received'
  };

  var { data: inserted, error } = await admin
    .from('interest_intakes')
    .insert(row)
    .select('id, partner_id, partner_slug, category_id, name, email, phone, location_text, description, consent_at, created_at')
    .maybeSingle();

  if (error) {
    var schemaCode = schemaFailureCode(error);
    if (schemaCode) return { ok: false, code: schemaCode };
    console.error('interest_insert_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  if (!inserted || !inserted.id) {
    return { ok: false, code: 'server_error' };
  }

  // One internal Control request per successful intake (dedupe path never reaches here).
  var reqCreated = await createRequestFromInterest(inserted);
  if (!reqCreated.ok) {
    // Intake exists; request create failed — surface as server error so ops notice.
    // Unique race still returns ok from createRequestFromInterest.
    console.error('interest_request_create_failed', { action: 'submitInterest', code: reqCreated.code });
    return { ok: false, code: reqCreated.code || 'server_error' };
  }

  incrementAnalyticsEvent({
    event: 'request_submitted',
    category: resolved.categoryId || 'all'
  });

  return {
    ok: true,
    id: inserted.id,
    requestId: reqCreated.request && reqCreated.request.id ? reqCreated.request.id : null
  };
}

module.exports = {
  DEDUPE_WINDOW_MS: DEDUPE_WINDOW_MS,
  validateInterestPayload: validateInterestPayload,
  submitInterest: submitInterest,
  buildDedupeKey: buildDedupeKey,
  isValidEmail: isValidEmail,
  clean: clean
};
