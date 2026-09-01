/**
 * Phase B Sprint 8 — ELYAN Control service (staff-only via requireStaff).
 * BFF uses service_role after staff authZ. Partners never call these functions.
 */
var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');
var {
  mapOnboardingRow,
  mapProfileRow,
  mapReviewItem,
  draftHelpers
} = require('./onboarding-model');
var { mapAsset, sortAssets, promoteAssetsToPublic, revokePublicDerivatives } = require('./assets');
var {
  isListFilter,
  canApproveOnboarding,
  canRequestChanges,
  canProfileAction,
  hasOpenReviewItems,
  buildSlugCandidate,
  buildPublishedSnapshot,
  evaluatePublicationGate,
  buildMarketplacePreview,
  validateReviewItemInput
} = require('./control-model');
var { buildPublicSnapshotV1 } = require('./public-snapshot');
var { isAutoPublishPartners } = require('./partner-autopilot/config');
var { sendProfilePublishedEmail } = require('./partner-autopilot-emails');

async function loadPartnerBundle(admin, partnerId) {
  var { data: partner, error: pErr } = await admin
    .from('partners')
    .select('id, legal_name, display_name, account_status')
    .eq('id', partnerId)
    .maybeSingle();
  if (pErr) {
    console.error('control_partner_load_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!partner) return { ok: false, code: 'not_found' };

  var { data: onboarding, error: oErr } = await admin
    .from('partner_onboarding')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (oErr) {
    console.error('control_onboarding_load_failed', oErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!onboarding) return { ok: false, code: 'not_found' };

  var { data: profile, error: prErr } = await admin
    .from('partner_profiles')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (prErr) {
    console.error('control_profile_load_failed', prErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!profile) return { ok: false, code: 'not_found' };

  var { data: reviewItems, error: rErr } = await admin
    .from('partner_review_items')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true });
  if (rErr) {
    console.error('control_review_items_load_failed', rErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: assets, error: aErr } = await admin
    .from('partner_profile_assets')
    .select('*')
    .eq('partner_id', partnerId);
  if (aErr) {
    console.error('control_assets_load_failed', aErr.message);
    return { ok: false, code: 'server_error' };
  }

  return {
    ok: true,
    partner: partner,
    onboarding: onboarding,
    profile: profile,
    reviewItems: reviewItems || [],
    assets: sortAssets(assets || [])
  };
}

function matchesFilter(filter, onboardingStatus, profileStatus) {
  if (!filter || filter === 'all') return true;
  if (filter === 'submitted') {
    return onboardingStatus === 'submitted' && profileStatus === 'under_review';
  }
  if (filter === 'changes_requested') {
    return onboardingStatus === 'changes_requested';
  }
  if (filter === 'ready') {
    return onboardingStatus === 'approved' && profileStatus === 'ready';
  }
  if (filter === 'published' || filter === 'paused' || filter === 'hidden') {
    return profileStatus === filter;
  }
  return false;
}

function listRowFromJoin(row) {
  var onboarding = row.partner_onboarding || row.onboarding || {};
  var profile = row.partner_profiles || row.profile || {};
  return {
    partnerId: row.id,
    legalName: row.legal_name,
    displayName: row.display_name,
    accountStatus: row.account_status,
    onboardingStatus: onboarding.onboarding_status || null,
    profileStatus: profile.profile_status || null,
    submittedAt: onboarding.submitted_at || null,
    changesRequestedAt: onboarding.changes_requested_at || null,
    approvedAt: onboarding.approved_at || null,
    readyAt: profile.ready_at || null,
    publishedAt: profile.published_at || null,
    pausedAt: profile.paused_at || null,
    hiddenAt: profile.hidden_at || null,
    slug: profile.slug || null,
    primaryCategoryId: profile.primary_category_id || null,
    specialtyLine: profile.specialty_line || null
  };
}

async function listReviews(opts) {
  var filter = opts.filter ? String(opts.filter) : 'submitted';
  if (filter !== 'all' && !isListFilter(filter)) {
    return { ok: false, code: 'invalid_filter' };
  }

  var admin = createAdminClient();
  var { data: partners, error } = await admin
    .from('partners')
    .select('id, legal_name, display_name, account_status')
    .eq('account_status', 'active')
    .order('display_name', { ascending: true });

  if (error) {
    console.error('control_list_failed', error.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: onboardings, error: oErr } = await admin
    .from('partner_onboarding')
    .select('partner_id, onboarding_status, submitted_at, changes_requested_at, approved_at');
  if (oErr) {
    console.error('control_list_onboarding_failed', oErr.message);
    return { ok: false, code: 'server_error' };
  }

  var { data: profiles, error: pErr } = await admin
    .from('partner_profiles')
    .select(
      'partner_id, profile_status, slug, primary_category_id, specialty_line, ready_at, published_at, paused_at, hidden_at'
    );
  if (pErr) {
    console.error('control_list_profiles_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }

  var onboardingByPartner = {};
  (onboardings || []).forEach(function (row) {
    onboardingByPartner[row.partner_id] = row;
  });
  var profileByPartner = {};
  (profiles || []).forEach(function (row) {
    profileByPartner[row.partner_id] = row;
  });

  var items = (partners || [])
    .map(function (row) {
      return listRowFromJoin({
        id: row.id,
        legal_name: row.legal_name,
        display_name: row.display_name,
        account_status: row.account_status,
        partner_onboarding: onboardingByPartner[row.id] || {},
        partner_profiles: profileByPartner[row.id] || {}
      });
    })
    .filter(function (row) {
      if (!row.onboardingStatus || !row.profileStatus) return false;
      var inQueue =
        row.onboardingStatus === 'submitted' ||
        row.onboardingStatus === 'changes_requested' ||
        row.onboardingStatus === 'approved' ||
        row.profileStatus === 'published' ||
        row.profileStatus === 'paused' ||
        row.profileStatus === 'hidden';
      if (!inQueue) return false;
      return matchesFilter(filter, row.onboardingStatus, row.profileStatus);
    });

  return { ok: true, filter: filter, items: items, count: items.length };
}

function buildReviewPayload(bundle) {
  var onboarding = mapOnboardingRow(bundle.onboarding);
  var profile = mapProfileRow(bundle.profile);
  var assets = (bundle.assets || []).map(mapAsset);
  var draft = onboarding.draft || {};
  var sections = draftHelpers.buildControleSections
    ? draftHelpers.buildControleSections(draft, assets)
    : [];
  var preview = buildMarketplacePreview({
    partnerId: bundle.partner.id,
    draft: draft,
    assets: bundle.assets,
    coverAssetId: bundle.profile.cover_asset_id,
    displayName: bundle.partner.display_name,
    legalName: bundle.partner.legal_name,
    specialtyLine: bundle.profile.specialty_line,
    primaryCategoryId: bundle.profile.primary_category_id,
    slug: bundle.profile.slug,
    profileStatus: bundle.profile.profile_status,
    publishedAt: bundle.profile.published_at
  });

  var openCount = (bundle.reviewItems || []).filter(function (r) {
    return r.item_status === 'open';
  }).length;

  return {
    ok: true,
    partner: {
      id: bundle.partner.id,
      legalName: bundle.partner.legal_name,
      displayName: bundle.partner.display_name,
      accountStatus: bundle.partner.account_status
    },
    onboarding: onboarding,
    profile: profile,
    draft: draft,
    assets: assets,
    reviewItems: (bundle.reviewItems || []).map(mapReviewItem),
    openReviewCount: openCount,
    sections: sections,
    marketplacePreview: preview,
    actions: {
      canRequestChanges: canRequestChanges(onboarding.onboardingStatus),
      canApprove:
        canApproveOnboarding(onboarding.onboardingStatus) && openCount === 0,
      canPublish: canProfileAction('publish', profile.profileStatus),
      canPause: canProfileAction('pause', profile.profileStatus),
      canHide: canProfileAction('hide', profile.profileStatus),
      canRestore: canProfileAction('restore', profile.profileStatus)
    }
  };
}

async function getReview(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };
  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;
  return buildReviewPayload(bundle);
}

async function requestChanges(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var rawItems = Array.isArray(opts.items) ? opts.items : [];
  if (!rawItems.length) return { ok: false, code: 'invalid_review_item' };

  var validated = [];
  for (var i = 0; i < rawItems.length; i += 1) {
    var v = validateReviewItemInput(rawItems[i]);
    if (!v.ok) return v;
    validated.push(v.item);
  }

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  if (!canRequestChanges(bundle.onboarding.onboarding_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var now = new Date().toISOString();
  var insertRows = validated.map(function (item) {
    return {
      partner_id: partnerId,
      step_id: item.step_id,
      field_key: item.field_key,
      message: item.message,
      item_status: 'open',
      created_by_staff: opts.staffUserId
    };
  });

  var { data: inserted, error: iErr } = await admin
    .from('partner_review_items')
    .insert(insertRows)
    .select('*');
  if (iErr) {
    console.error('control_request_changes_insert_failed', iErr.message);
    return { ok: false, code: 'server_error' };
  }
  // Normalize single-row insert APIs that return one object
  if (inserted && !Array.isArray(inserted)) inserted = [inserted];
  if (!inserted || !inserted.length) {
    // Memory harness / some clients: insert without returning rows — re-read
    var { data: reloaded } = await admin
      .from('partner_review_items')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('item_status', 'open');
    inserted = reloaded || [];
  }

  var { error: oErr } = await admin
    .from('partner_onboarding')
    .update({
      onboarding_status: 'changes_requested',
      changes_requested_at: now,
      changes_requested_by: opts.staffUserId,
      current_step_id: 'review_hub',
      version: bundle.onboarding.version + 1
    })
    .eq('partner_id', partnerId)
    .in('onboarding_status', ['submitted', 'changes_requested']);
  if (oErr) {
    console.error('control_request_changes_status_failed', oErr.message);
    return { ok: false, code: 'server_error' };
  }

  // Keep profile under_review while changes are outstanding
  if (bundle.profile.profile_status !== 'under_review') {
    await admin
      .from('partner_profiles')
      .update({ profile_status: 'under_review' })
      .eq('partner_id', partnerId)
      .in('profile_status', ['draft', 'ready', 'under_review']);
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.staffUserId,
    actorType: 'staff',
    partnerId: partnerId,
    action: 'control_request_changes',
    meta: {
      itemCount: insertRows.length,
      itemIds: (inserted || []).map(function (r) { return r.id; })
    }
  });

  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function approvePartner(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  // Idempotent: already approved + ready
  if (
    bundle.onboarding.onboarding_status === 'approved' &&
    bundle.profile.profile_status === 'ready'
  ) {
    return buildReviewPayload(bundle);
  }

  if (!canApproveOnboarding(bundle.onboarding.onboarding_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  if (hasOpenReviewItems(bundle.reviewItems)) {
    return { ok: false, code: 'open_review_items' };
  }

  if (bundle.partner.account_status !== 'active') {
    return { ok: false, code: 'partner_suspended' };
  }

  var now = new Date().toISOString();
  var draft = bundle.onboarding.draft || {};
  var craft = draft.craft || {};
  var specialty =
    typeof draft.specialty_line === 'string'
      ? draft.specialty_line.slice(0, 160)
      : bundle.profile.specialty_line;

  var { data: updatedOnboarding, error: oErr } = await admin
    .from('partner_onboarding')
    .update({
      onboarding_status: 'approved',
      approved_at: now,
      current_step_id: 'review_hub',
      version: bundle.onboarding.version + 1
    })
    .eq('partner_id', partnerId)
    .eq('onboarding_status', 'submitted')
    .select('*')
    .maybeSingle();

  if (oErr) {
    console.error('control_approve_onboarding_failed', oErr.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updatedOnboarding) {
    var again = await loadPartnerBundle(admin, partnerId);
    if (
      again.ok &&
      again.onboarding.onboarding_status === 'approved' &&
      again.profile.profile_status === 'ready'
    ) {
      return buildReviewPayload(again);
    }
    return { ok: false, code: 'invalid_status_transition' };
  }

  var { error: pErr } = await admin
    .from('partner_profiles')
    .update({
      profile_status: 'ready',
      ready_at: now,
      primary_category_id: craft.primary_category_id
        ? String(craft.primary_category_id)
        : bundle.profile.primary_category_id,
      specialty_line: specialty || null
    })
    .eq('partner_id', partnerId)
    .eq('profile_status', 'under_review');
  if (pErr) {
    console.error('control_approve_profile_failed', pErr.message);
    return { ok: false, code: 'server_error' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.staffUserId,
    actorType: 'staff',
    partnerId: partnerId,
    action: 'control_approve',
    meta: { approvedAt: now }
  });

  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function allocateSlug(admin, partnerId, base) {
  var candidate = base;
  var n = 0;
  while (n < 50) {
    var { data, error } = await admin
      .from('partner_profiles')
      .select('partner_id')
      .eq('slug', candidate)
      .maybeSingle();
    if (error) {
      console.error('control_slug_lookup_failed', error.message);
      return { ok: false, code: 'server_error' };
    }
    if (!data || data.partner_id === partnerId) {
      return { ok: true, slug: candidate };
    }
    n += 1;
    candidate = base + '-' + (n + 1);
  }
  return { ok: false, code: 'server_error' };
}

async function publishPartner(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  // Idempotent published — ensure PublicSnapshot + public derivatives exist.
  if (bundle.profile.profile_status === 'published' && bundle.profile.slug) {
    var ensured = await promoteAssetsToPublic({ admin: admin, partnerId: partnerId });
    if (!ensured.ok) return ensured;
    var existingPublic = bundle.profile.public_snapshot;
    if (
      existingPublic &&
      typeof existingPublic === 'object' &&
      existingPublic.publicSnapshotVersion
    ) {
      var reloaded = await loadPartnerBundle(admin, partnerId);
      if (!reloaded.ok) return reloaded;
      return buildReviewPayload(reloaded);
    }
    var repaired = await rebuildPublicSnapshot(opts);
    if (!repaired.ok) return repaired;
    return repaired;
  }

  if (!canProfileAction('publish', bundle.profile.profile_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var gate = evaluatePublicationGate({
    partner: bundle.partner,
    onboarding: bundle.onboarding,
    profile: bundle.profile,
    reviewItems: bundle.reviewItems,
    assets: bundle.assets
  });
  if (!gate.ok) {
    return {
      ok: false,
      code: 'publication_gate_failed',
      missing: gate.missing
    };
  }

  // Promote private drafts → public derivatives before any profile status flip.
  var promoted = await promoteAssetsToPublic({ admin: admin, partnerId: partnerId });
  if (!promoted.ok) return promoted;
  bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  var now = new Date().toISOString();
  var existingSlug = bundle.profile.slug;
  var slug = existingSlug;
  if (!slug) {
    var base = buildSlugCandidate({
      draft: bundle.onboarding.draft,
      displayName: bundle.partner.display_name,
      legalName: bundle.partner.legal_name
    });
    var allocated = await allocateSlug(admin, partnerId, base);
    if (!allocated.ok) {
      await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
      return allocated;
    }
    slug = allocated.slug;
  }

  // Internal snapshot (Control/ops) — may contain richer fields; never served publicly.
  var snapshot = buildPublishedSnapshot({
    partnerId: partnerId,
    draft: bundle.onboarding.draft,
    assets: bundle.assets,
    coverAssetId: bundle.profile.cover_asset_id,
    displayName: bundle.partner.display_name,
    legalName: bundle.partner.legal_name,
    specialtyLine: bundle.profile.specialty_line,
    primaryCategoryId: bundle.profile.primary_category_id,
    slug: slug,
    publishedAt: now
  });

  var nextPublicVersion = 1;
  var publicBuilt = buildPublicSnapshotV1({
    draft: bundle.onboarding.draft,
    assets: bundle.assets,
    coverAssetId: bundle.profile.cover_asset_id,
    displayName: bundle.partner.display_name,
    legalName: bundle.partner.legal_name,
    specialtyLine: bundle.profile.specialty_line,
    primaryCategoryId:
      (bundle.onboarding.draft &&
        bundle.onboarding.draft.craft &&
        bundle.onboarding.draft.craft.primary_category_id) ||
      bundle.profile.primary_category_id,
    slug: slug,
    publishedAt: now,
    publicSnapshotVersion: nextPublicVersion
  });
  if (!publicBuilt.ok) {
    // Do not leave a ready profile with a partial/unused public gallery from a failed publish.
    await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
    return {
      ok: false,
      code: 'publication_gate_failed',
      missing: [{ code: publicBuilt.code || 'public_snapshot_invalid', message: 'PublicSnapshot v1 kon niet worden gebouwd.' }]
    };
  }

  var primaryCategoryId =
    publicBuilt.snapshot.primaryCategoryId || bundle.profile.primary_category_id || null;

  var { data: updated, error: pErr } = await admin
    .from('partner_profiles')
    .update({
      profile_status: 'published',
      published_at: now,
      paused_at: null,
      hidden_at: null,
      slug: slug,
      primary_category_id: primaryCategoryId,
      published_snapshot: snapshot,
      public_snapshot: publicBuilt.snapshot,
      public_snapshot_version: nextPublicVersion,
      publication_source: isAutoPublishPartners() ? 'automatic' : 'manual'
    })
    .eq('partner_id', partnerId)
    .eq('profile_status', 'ready')
    .select('*')
    .maybeSingle();

  if (pErr) {
    console.error('control_publish_failed', pErr.message);
    await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    var again = await loadPartnerBundle(admin, partnerId);
    if (again.ok && again.profile.profile_status === 'published') {
      return buildReviewPayload(again);
    }
    await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
    return { ok: false, code: 'invalid_status_transition' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.staffUserId,
    actorType: 'staff',
    partnerId: partnerId,
    action: 'control_publish',
    meta: {
      slug: slug,
      publishedAt: now,
      publicationSource: isAutoPublishPartners() ? 'automatic' : 'manual'
    }
  });

  var appUrl = (process.env.PROFESSIONALS_APP_URL || 'https://www.elyan.be/professionals/dashboard').replace(/\/$/, '');
  var ownerEmail = null;
  if (bundle.onboarding && bundle.onboarding.draft && bundle.onboarding.draft.company) {
    ownerEmail = bundle.onboarding.draft.company.email || null;
  }
  if (ownerEmail) {
    await sendProfilePublishedEmail({
      to: ownerEmail,
      companyName: bundle.partner.display_name || bundle.partner.legal_name,
      dashboardUrl: appUrl + '/dashboard',
      profileUrl: 'https://www.elyan.be/vakmannen/' + encodeURIComponent(slug)
    });
  }

  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function transitionProfile(opts, action, auditAction, patchBuilder) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  var current = bundle.profile.profile_status;
  var target = require('./control-model').nextProfileStatus(action);

  // Idempotent if already in target
  if (current === target) {
    return buildReviewPayload(bundle);
  }

  if (!canProfileAction(action, current)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var now = new Date().toISOString();
  var patch = Object.assign({ profile_status: target }, patchBuilder(now, bundle));

  var { data: updated, error } = await admin
    .from('partner_profiles')
    .update(patch)
    .eq('partner_id', partnerId)
    .eq('profile_status', current)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('control_' + action + '_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) {
    var again = await loadPartnerBundle(admin, partnerId);
    if (again.ok && again.profile.profile_status === target) {
      return buildReviewPayload(again);
    }
    return { ok: false, code: 'invalid_status_transition' };
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.staffUserId,
    actorType: 'staff',
    partnerId: partnerId,
    action: auditAction,
    meta: { from: current, to: target }
  });

  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function rebuildPublicSnapshot(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  if (bundle.profile.profile_status !== 'published' || !bundle.profile.slug) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  var prevVersion = Number(bundle.profile.public_snapshot_version) || 0;
  var nextVersion = prevVersion + 1;
  var publishedAt = bundle.profile.published_at || new Date().toISOString();

  var promoted = await promoteAssetsToPublic({ admin: admin, partnerId: partnerId });
  if (!promoted.ok) return promoted;
  bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;

  // Keep previous public_snapshot intact until this update succeeds (atomic row update).
  var publicBuilt = buildPublicSnapshotV1({
    draft: bundle.onboarding.draft,
    assets: bundle.assets,
    coverAssetId: bundle.profile.cover_asset_id,
    displayName: bundle.partner.display_name,
    legalName: bundle.partner.legal_name,
    specialtyLine: bundle.profile.specialty_line,
    primaryCategoryId:
      (bundle.onboarding.draft &&
        bundle.onboarding.draft.craft &&
        bundle.onboarding.draft.craft.primary_category_id) ||
      bundle.profile.primary_category_id,
    slug: bundle.profile.slug,
    publishedAt: publishedAt,
    publicSnapshotVersion: nextVersion
  });
  if (!publicBuilt.ok) {
    return {
      ok: false,
      code: 'publication_gate_failed',
      missing: [{ code: publicBuilt.code || 'public_snapshot_invalid', message: 'PublicSnapshot v1 rebuild mislukt.' }]
    };
  }

  var internal = buildPublishedSnapshot({
    partnerId: partnerId,
    draft: bundle.onboarding.draft,
    assets: bundle.assets,
    coverAssetId: bundle.profile.cover_asset_id,
    displayName: bundle.partner.display_name,
    legalName: bundle.partner.legal_name,
    specialtyLine: bundle.profile.specialty_line,
    primaryCategoryId: publicBuilt.snapshot.primaryCategoryId,
    slug: bundle.profile.slug,
    publishedAt: publishedAt
  });

  var { data: updated, error } = await admin
    .from('partner_profiles')
    .update({
      published_snapshot: internal,
      public_snapshot: publicBuilt.snapshot,
      public_snapshot_version: nextVersion,
      primary_category_id: publicBuilt.snapshot.primaryCategoryId
    })
    .eq('partner_id', partnerId)
    .eq('profile_status', 'published')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('control_rebuild_public_snapshot_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!updated) return { ok: false, code: 'invalid_status_transition' };

  await writeAudit({
    req: opts.req,
    actorUserId: opts.staffUserId,
    actorType: 'staff',
    partnerId: partnerId,
    action: 'control_rebuild_public_snapshot',
    meta: {
      fromVersion: prevVersion,
      toVersion: nextVersion,
      slug: bundle.profile.slug
    }
  });

  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function pausePartner(opts) {
  var result = await transitionProfile(opts, 'pause', 'control_pause', function (now) {
    return { paused_at: now };
  });
  if (!result.ok) return result;
  var admin = createAdminClient();
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  var revoked = await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
  if (!revoked.ok) return revoked;
  await stripPublicSnapshotAssets(admin, partnerId);
  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function hidePartner(opts) {
  var result = await transitionProfile(opts, 'hide', 'control_hide', function (now) {
    return { hidden_at: now };
  });
  if (!result.ok) return result;
  var admin = createAdminClient();
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  var revoked = await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
  if (!revoked.ok) return revoked;
  await stripPublicSnapshotAssets(admin, partnerId);
  var refreshed = await loadPartnerBundle(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return buildReviewPayload(refreshed);
}

async function restorePartner(opts) {
  var partnerId = opts.partnerId ? String(opts.partnerId).trim() : '';
  if (!partnerId) return { ok: false, code: 'missing_fields' };

  var admin = createAdminClient();
  var bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;
  if (!canProfileAction('restore', bundle.profile.profile_status)) {
    return { ok: false, code: 'invalid_status_transition' };
  }

  // Recreate public derivatives before flipping to published (fail closed).
  var promoted = await promoteAssetsToPublic({ admin: admin, partnerId: partnerId });
  if (!promoted.ok) return promoted;

  var result = await transitionProfile(opts, 'restore', 'control_restore', function () {
    return { paused_at: null, hidden_at: null };
  });
  if (!result.ok) {
    await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
    return result;
  }

  bundle = await loadPartnerBundle(admin, partnerId);
  if (!bundle.ok) return bundle;
  if (bundle.profile.profile_status === 'published' && bundle.profile.slug) {
    var rebuilt = await rebuildPublicSnapshot(opts);
    if (!rebuilt.ok) {
      // Do not leave a published profile with empty/stale PublicSnapshot after failed restore.
      await transitionProfile(opts, 'pause', 'control_restore_rollback', function (now) {
        return { paused_at: now };
      });
      await revokePublicDerivatives({ admin: admin, partnerId: partnerId });
      await stripPublicSnapshotAssets(admin, partnerId);
      return rebuilt;
    }
    return rebuilt;
  }
  return buildReviewPayload(bundle);
}

async function stripPublicSnapshotAssets(admin, partnerId) {
  var { data: profile } = await admin
    .from('partner_profiles')
    .select('public_snapshot, public_snapshot_version')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (!profile || !profile.public_snapshot || typeof profile.public_snapshot !== 'object') {
    return { ok: true };
  }
  var snap = Object.assign({}, profile.public_snapshot);
  snap.assets = [];
  snap.coverUrl = null;
  var { error } = await admin
    .from('partner_profiles')
    .update({ public_snapshot: snap })
    .eq('partner_id', partnerId);
  if (error) {
    console.error('strip_public_snapshot_assets_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true };
}

module.exports = {
  listReviews,
  getReview,
  requestChanges,
  approvePartner,
  publishPartner,
  rebuildPublicSnapshot,
  pausePartner,
  hidePartner,
  restorePartner,
  loadPartnerBundle,
  buildReviewPayload,
  matchesFilter
};
