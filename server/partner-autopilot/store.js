'use strict';

var crypto = require('crypto');
var { createAdminClient } = require('../supabase');
var { writeAudit } = require('../audit');

var memoryStore = null;

function useMemoryStore() {
  return process.env.PARTNER_AUTOPILOT_MEMORY === '1';
}

function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = { candidates: new Map(), events: [] };
  }
  return memoryStore;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildDedupeKey(email) {
  return crypto.createHash('sha256').update('partner_interest|' + normalizeEmail(email), 'utf8').digest('hex');
}

function mapCandidateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    dedupeKey: row.dedupe_key,
    emailNormalized: row.email_normalized,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    specialty: row.specialty,
    region: row.region,
    message: row.message,
    consentAt: row.consent_at,
    categoryId: row.category_id,
    autopilotStatus: row.autopilot_status,
    screeningResult: row.screening_result || {},
    partnerId: row.partner_id,
    inviteId: row.invite_id,
    inviteSentAt: row.invite_sent_at,
    publishedAt: row.published_at,
    publicationSource: row.publication_source,
    profileComposedMeta: row.profile_composed_meta || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function schemaFailureCode(error) {
  var msg = error && error.message ? String(error.message) : '';
  if (
    /partner_interest_candidates/i.test(msg) &&
    /(does not exist|Could not find the|schema cache)/i.test(msg)
  ) {
    return 'migration_needed';
  }
  return null;
}

async function findCandidateById(candidateId) {
  if (!candidateId) return { ok: true, candidate: null };
  if (useMemoryStore()) {
    var row = getMemoryStore().candidates.get(candidateId);
    return { ok: true, candidate: mapCandidateRow(row) };
  }
  var admin = createAdminClient();
  var { data, error } = await admin
    .from('partner_interest_candidates')
    .select('*')
    .eq('id', candidateId)
    .maybeSingle();
  if (error) {
    var code = schemaFailureCode(error);
    if (code) return { ok: false, code: code };
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, candidate: mapCandidateRow(data) };
}

async function findCandidateByEmail(email) {
  var normalized = normalizeEmail(email);
  if (useMemoryStore()) {
    var store = getMemoryStore();
    for (var entry of store.candidates.values()) {
      if (entry.email_normalized === normalized) return { ok: true, candidate: mapCandidateRow(entry) };
    }
    return { ok: true, candidate: null };
  }
  var admin = createAdminClient();
  var { data, error } = await admin
    .from('partner_interest_candidates')
    .select('*')
    .eq('email_normalized', normalized)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    var code = schemaFailureCode(error);
    if (code) return { ok: false, code: code };
    console.error('partner_interest_find_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, candidate: mapCandidateRow(data) };
}

async function upsertInterestCandidate(input) {
  var normalized = normalizeEmail(input.email);
  var dedupeKey = buildDedupeKey(normalized);
  var now = new Date().toISOString();
  var row = {
    dedupe_key: dedupeKey,
    email_normalized: normalized,
    company_name: String(input.companyName || '').trim(),
    contact_name: String(input.contactName || '').trim(),
    email: normalized,
    phone: input.phone || null,
    website: input.website || null,
    specialty: String(input.specialty || '').trim(),
    region: String(input.region || '').trim(),
    message: input.message || null,
    consent_at: input.consentAt || now,
    category_id: input.categoryId || null,
    autopilot_status: input.autopilotStatus || 'interest_received',
    screening_result: input.screeningResult || {},
    updated_at: now
  };

  if (useMemoryStore()) {
    var store = getMemoryStore();
    var existing = null;
    for (var entry of store.candidates.values()) {
      if (entry.dedupe_key === dedupeKey) {
        existing = entry;
        break;
      }
    }
    if (existing) {
      var merged = Object.assign({}, existing, row, { id: existing.id, created_at: existing.created_at });
      store.candidates.set(existing.id, merged);
      return { ok: true, candidate: mapCandidateRow(merged), created: false };
    }
    var id = crypto.randomUUID();
    var created = Object.assign({ id: id, created_at: now }, row);
    store.candidates.set(id, created);
    return { ok: true, candidate: mapCandidateRow(created), created: true };
  }

  var admin = createAdminClient();
  var found = await findCandidateByEmail(normalized);
  if (!found.ok) return found;
  if (found.candidate) {
    var { data: updated, error: uErr } = await admin
      .from('partner_interest_candidates')
      .update(row)
      .eq('id', found.candidate.id)
      .select('*')
      .single();
    if (uErr) {
      console.error('partner_interest_update_failed', uErr.message);
      return { ok: false, code: 'server_error' };
    }
    return { ok: true, candidate: mapCandidateRow(updated), created: false };
  }

  row.created_at = now;
  var { data: inserted, error: iErr } = await admin
    .from('partner_interest_candidates')
    .insert(row)
    .select('*')
    .single();
  if (iErr) {
    if (iErr.code === '23505') {
      var again = await findCandidateByEmail(normalized);
      if (again.ok && again.candidate) {
        return { ok: true, candidate: again.candidate, created: false };
      }
    }
    var failCode = schemaFailureCode(iErr);
    if (failCode) return { ok: false, code: failCode };
    console.error('partner_interest_insert_failed', iErr.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, candidate: mapCandidateRow(inserted), created: true };
}

async function updateCandidateStatus(candidateId, patch) {
  patch = patch || {};
  patch.updated_at = new Date().toISOString();

  if (useMemoryStore()) {
    var store = getMemoryStore();
    var row = store.candidates.get(candidateId);
    if (!row) return { ok: false, code: 'not_found' };
    var next = Object.assign({}, row, patch);
    store.candidates.set(candidateId, next);
    return { ok: true, candidate: mapCandidateRow(next) };
  }

  var admin = createAdminClient();
  var { data, error } = await admin
    .from('partner_interest_candidates')
    .update(patch)
    .eq('id', candidateId)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('partner_interest_status_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!data) return { ok: false, code: 'not_found' };
  return { ok: true, candidate: mapCandidateRow(data) };
}

async function recordAutopilotEvent(opts) {
  var row = {
    candidate_id: opts.candidateId || null,
    partner_id: opts.partnerId || null,
    event_type: opts.eventType,
    payload: opts.payload || {},
    actor_type: opts.actorType || 'system',
    actor_user_id: opts.actorUserId || null
  };

  if (useMemoryStore()) {
    getMemoryStore().events.push(row);
    return { ok: true };
  }

  var admin = createAdminClient();
  var { error } = await admin.from('partner_autopilot_events').insert(row);
  if (error) {
    console.error('partner_autopilot_event_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  await writeAudit({
    req: opts.req,
    actorUserId: opts.actorUserId,
    actorType: opts.actorType || 'system',
    partnerId: opts.partnerId,
    action: 'partner_autopilot_' + opts.eventType,
    meta: opts.payload || {}
  });
  return { ok: true };
}

async function listAutopilotCandidates(filter) {
  if (useMemoryStore()) {
    var items = [];
    getMemoryStore().candidates.forEach(function (row) {
      if (!filter || filter === 'all' || row.autopilot_status === filter) {
        items.push(mapCandidateRow(row));
      }
    });
    return { ok: true, items: items };
  }
  var admin = createAdminClient();
  var q = admin.from('partner_interest_candidates').select('*').order('created_at', { ascending: false });
  if (filter && filter !== 'all') q = q.eq('autopilot_status', filter);
  var { data, error } = await q.limit(200);
  if (error) {
    var code = schemaFailureCode(error);
    if (code) return { ok: false, code: code };
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, items: (data || []).map(mapCandidateRow) };
}

function resetMemoryStoreForTests() {
  memoryStore = null;
}

module.exports = {
  normalizeEmail: normalizeEmail,
  buildDedupeKey: buildDedupeKey,
  findCandidateByEmail: findCandidateByEmail,
  findCandidateById: findCandidateById,
  upsertInterestCandidate: upsertInterestCandidate,
  updateCandidateStatus: updateCandidateStatus,
  recordAutopilotEvent: recordAutopilotEvent,
  listAutopilotCandidates: listAutopilotCandidates,
  mapCandidateRow: mapCandidateRow,
  resetMemoryStoreForTests: resetMemoryStoreForTests
};
