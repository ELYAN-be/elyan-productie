/**
 * Phase B onboarding — status enums, steps, draft helpers, transition rules.
 * Source of truth: Phase B Productspecificatie V2 (frozen).
 */
var draftHelpers = require('../js/professionals/onboarding-draft');

var ONBOARDING_STATUSES = [
  'not_started',
  'in_progress',
  'submitted',
  'changes_requested',
  'approved'
];

var PROFILE_STATUSES = [
  'not_created',
  'draft',
  'under_review',
  'ready',
  'published',
  'paused',
  'hidden'
];

var STEP_IDS = [
  'start',
  'bedrijf_bereik',
  'ambacht',
  'aanbod',
  'verhaal',
  'portfolio',
  'controle',
  'review_hub'
];

var WIZARD_STEPS = STEP_IDS.filter(function (s) {
  return s !== 'review_hub';
});

var EDIT_ROLES = { owner: true, admin: true };
var READ_ROLES = { owner: true, admin: true, member: true };

/** Sections partners may still polish while status=submitted (V2 Review Hub). */
var SUBMITTED_EDITABLE_SECTIONS = ['portfolio', 'verhaal_optional'];

function isOnboardingStatus(v) {
  return ONBOARDING_STATUSES.indexOf(v) >= 0;
}

function isProfileStatus(v) {
  return PROFILE_STATUSES.indexOf(v) >= 0;
}

function isStepId(v) {
  return STEP_IDS.indexOf(v) >= 0;
}

function canEditRole(role) {
  return !!EDIT_ROLES[role];
}

function canReadRole(role) {
  return !!READ_ROLES[role];
}

/**
 * Deep-merge plain objects. Arrays replace (not concat). Non-objects overwrite.
 * `craft` uses mergeCraft so conditionals/extras replace (category-reset safe).
 * `offer` uses mergeOffer; after merge, orphan service_prices are pruned to P3 services.
 * Used for autosave partial draft patches.
 */
function mergeDraft(base, patch) {
  var out = {};
  var src = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  Object.keys(src).forEach(function (k) {
    out[k] = src[k];
  });
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return out;
  Object.keys(patch).forEach(function (k) {
    var pv = patch[k];
    var ov = out[k];
    if (k === 'craft' && isPlainObject(pv)) {
      out[k] = draftHelpers.mergeCraft(ov, pv);
      return;
    }
    if (k === 'offer' && isPlainObject(pv)) {
      out[k] = draftHelpers.mergeOffer(ov, pv);
      return;
    }
    if (
      pv &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      ov &&
      typeof ov === 'object' &&
      !Array.isArray(ov)
    ) {
      out[k] = mergeDraft(ov, pv);
    } else {
      out[k] = pv;
    }
  });
  // P3→P4 orphan rule: prune offer.service_prices not in craft.service_ids
  if (out.offer && out.craft && draftHelpers.pruneOfferToServices) {
    out.offer = draftHelpers.pruneOfferToServices(
      out.offer,
      (out.craft.service_ids || [])
    );
    if (!draftHelpers.showUrgencyJobs(out.craft)) {
      var pruned = draftHelpers.pickOffer(out.offer);
      pruned.urgency_jobs = null;
      out.offer = pruned;
    }
    if (draftHelpers.hasCiProjectMinimum(out.craft.primary_category_id)) {
      var o2 = draftHelpers.pickOffer(out.offer);
      o2.project_minimum = null;
      out.offer = o2;
    }
  }
  return out;
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Structural draft check + Sprint 3–5 P2/P3/P4 CI gates.
 * Autosave allows partial drafts; malformed formats / unknown keys fail.
 */
function validateDraftStructure(draft) {
  if (draft == null) return { ok: true, draft: {} };
  if (!isPlainObject(draft)) {
    return { ok: false, code: 'invalid_draft' };
  }
  if (Object.prototype.hasOwnProperty.call(draft, 'google_intent')) {
    return { ok: false, code: 'invalid_draft', message: 'google_intent is not part of onboarding V2' };
  }
  var sanitized = draftHelpers.sanitizeP2Patch(draft);
  if (!sanitized.ok) {
    return {
      ok: false,
      code: sanitized.code || 'invalid_draft',
      message: sanitized.message || 'Invalid draft'
    };
  }
  return { ok: true, draft: sanitized.draft || draft };
}

function canAutosave(status) {
  return (
    status === 'not_started' ||
    status === 'in_progress' ||
    status === 'changes_requested' ||
    status === 'submitted'
  );
}

function canSubmit(status) {
  return status === 'in_progress';
}

function canResubmit(status) {
  return status === 'changes_requested';
}

/**
 * V2 Review Hub allowlist while under Control review.
 */
function editableSectionsFor(status) {
  // not_started must be editable so owners can click "Profiel starten"
  // (first save transitions → in_progress).
  if (
    status === 'not_started' ||
    status === 'in_progress' ||
    status === 'changes_requested'
  ) {
    return WIZARD_STEPS.slice();
  }
  if (status === 'submitted') {
    return SUBMITTED_EDITABLE_SECTIONS.slice();
  }
  return [];
}

function isReviewHub(status) {
  return status === 'submitted' || status === 'changes_requested' || status === 'approved';
}

/**
 * Cheap completion-oriented signal for GET (not the full Profielsterkte engine).
 * Counts top-level draft domain keys present from the V2 draft shape.
 */
var DRAFT_DOMAIN_KEYS = [
  'company',
  'service_area',
  'craft',
  'offer',
  'story',
  'portfolio',
  'confirmations'
];

function draftCompletion(draft) {
  var d = isPlainObject(draft) ? draft : {};
  var filled = 0;
  DRAFT_DOMAIN_KEYS.forEach(function (k) {
    var v = d[k];
    if (v == null) return;
    if (typeof v === 'string' && !String(v).trim()) return;
    if (Array.isArray(v) && !v.length) return;
    if (isPlainObject(v) && !Object.keys(v).length) return;
    filled += 1;
  });
  return {
    domainsFilled: filled,
    domainsTotal: DRAFT_DOMAIN_KEYS.length,
    ratio: Math.round((filled / DRAFT_DOMAIN_KEYS.length) * 100)
  };
}

function mapOnboardingRow(row) {
  if (!row) return null;
  return {
    partnerId: row.partner_id,
    onboardingStatus: row.onboarding_status,
    currentStepId: row.current_step_id,
    draft: row.draft && typeof row.draft === 'object' ? row.draft : {},
    version: row.version,
    startedAt: row.started_at || null,
    submittedAt: row.submitted_at || null,
    approvedAt: row.approved_at || null,
    lastSavedAt: row.last_saved_at || null,
    lastSavedBy: row.last_saved_by || null,
    submittedBy: row.submitted_by || null,
    changesRequestedAt: row.changes_requested_at || null,
    reviewNotes: row.review_notes || null
  };
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    partnerId: row.partner_id,
    profileStatus: row.profile_status,
    slug: row.slug || null,
    primaryCategoryId: row.primary_category_id || null,
    specialtyLine: row.specialty_line || null,
    coverAssetId: row.cover_asset_id || null,
    publishedAt: row.published_at || null,
    pausedAt: row.paused_at || null,
    hiddenAt: row.hidden_at || null,
    readyAt: row.ready_at || null
  };
}

function mapReviewItem(row) {
  return {
    id: row.id,
    stepId: row.step_id || null,
    fieldKey: row.field_key || null,
    message: row.message,
    status: row.item_status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || null
  };
}

module.exports = {
  ONBOARDING_STATUSES,
  PROFILE_STATUSES,
  STEP_IDS,
  WIZARD_STEPS,
  SUBMITTED_EDITABLE_SECTIONS,
  DRAFT_DOMAIN_KEYS,
  isOnboardingStatus,
  isProfileStatus,
  isStepId,
  canEditRole,
  canReadRole,
  mergeDraft,
  isPlainObject,
  validateDraftStructure,
  canAutosave,
  canSubmit,
  canResubmit,
  editableSectionsFor,
  isReviewHub,
  draftCompletion,
  mapOnboardingRow,
  mapProfileRow,
  mapReviewItem,
  draftHelpers
};
