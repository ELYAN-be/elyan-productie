/**
 * Partner portfolio assets — BFF service (service_role after membership authZ).
 *
 * Private drafts → authorized preview → publish creates public derivatives only.
 *
 * COVER DELETE RULE (deterministic, client + server):
 * When the cover asset is deleted:
 *   1. Remaining assets sorted by sort_order ASC, created_at ASC, id ASC
 *   2. If any remain → promote remaining[0] as sole cover; sync partner_profiles.cover_asset_id
 *   3. Else → clear cover_asset_id; no is_cover rows
 */
var crypto = require('crypto');
var { createAdminClient } = require('./supabase');
var { writeAudit } = require('./audit');
var { canEditRole, canReadRole } = require('./onboarding-model');
var blob = require('./blob-storage');

async function loadOnboardingStatus(admin, partnerId) {
  var { data, error } = await admin
    .from('partner_onboarding')
    .select('onboarding_status')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error) {
    console.error('assets_onboarding_status_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, status: data ? data.onboarding_status : 'not_started' };
}

function canMutateAssets(status) {
  return (
    status === 'in_progress' ||
    status === 'changes_requested' ||
    status === 'submitted' ||
    status === 'not_started'
  );
}

function privateKeyOf(row) {
  if (!row) return null;
  return row.private_storage_key || null;
}

function publicKeyOf(row) {
  if (!row) return null;
  return row.public_storage_key || null;
}

/**
 * Client-safe asset projection.
 * Never exposes private Blob URLs, private pathnames, or storage credentials.
 */
function mapAsset(row) {
  if (!row) return null;
  var hasPrivate = !!privateKeyOf(row);
  var publicUrl = row.public_url || null;
  var previewUrl = null;
  if (hasPrivate || (!publicUrl && row.storage_key && !row.public_url)) {
    // Prefer authenticated preview for private originals.
    if (hasPrivate) {
      previewUrl =
        '/api/professionals/asset-preview?assetId=' +
        encodeURIComponent(row.id) +
        '&partnerId=' +
        encodeURIComponent(row.partner_id);
    }
  }
  // Legacy public-only assets (no private key): preview via public URL until republished.
  if (!previewUrl && publicUrl) previewUrl = publicUrl;

  return {
    id: row.id,
    partnerId: row.partner_id,
    previewUrl: previewUrl,
    publicUrl: publicUrl,
    title: row.title || '',
    contentType: row.content_type || null,
    byteSize: row.byte_size == null ? null : row.byte_size,
    assetStatus: row.asset_status,
    isCover: !!row.is_cover,
    sortOrder: row.sort_order == null ? 0 : row.sort_order,
    hasPrivateOriginal: hasPrivate,
    hasPublicDerivative: !!(publicUrl || publicKeyOf(row)),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function sortAssets(rows) {
  return (rows || []).slice().sort(function (a, b) {
    var so = (a.sort_order || 0) - (b.sort_order || 0);
    if (so !== 0) return so;
    var ca = String(a.created_at || '');
    var cb = String(b.created_at || '');
    if (ca < cb) return -1;
    if (ca > cb) return 1;
    return String(a.id).localeCompare(String(b.id));
  });
}

async function listAssets(admin, partnerId) {
  var { data, error } = await admin
    .from('partner_profile_assets')
    .select('*')
    .eq('partner_id', partnerId);
  if (error) {
    console.error('assets_list_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, assets: sortAssets(data || []).map(mapAsset), rows: sortAssets(data || []) };
}

async function getProfile(admin, partnerId) {
  var { data, error } = await admin
    .from('partner_profiles')
    .select('*')
    .eq('partner_id', partnerId)
    .maybeSingle();
  if (error || !data) {
    console.error('assets_profile_load_failed', error && error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true, profile: data };
}

async function syncCover(admin, partnerId, coverAssetId) {
  var { error } = await admin
    .from('partner_profiles')
    .update({ cover_asset_id: coverAssetId || null })
    .eq('partner_id', partnerId);
  if (error) {
    console.error('cover_sync_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true };
}

async function clearAllCovers(admin, partnerId) {
  var { error } = await admin
    .from('partner_profile_assets')
    .update({ is_cover: false })
    .eq('partner_id', partnerId)
    .eq('is_cover', true);
  if (error) {
    console.error('clear_covers_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  return { ok: true };
}

async function setSoleCover(admin, partnerId, assetId) {
  var cleared = await clearAllCovers(admin, partnerId);
  if (!cleared.ok) return cleared;
  var { data, error } = await admin
    .from('partner_profile_assets')
    .update({ is_cover: true })
    .eq('partner_id', partnerId)
    .eq('id', assetId)
    .select('*')
    .maybeSingle();
  if (error || !data) {
    console.error('set_cover_failed', error && error.message);
    return { ok: false, code: 'server_error' };
  }
  var synced = await syncCover(admin, partnerId, assetId);
  if (!synced.ok) return synced;
  return { ok: true, asset: data };
}

async function promoteNextCover(admin, partnerId) {
  var listed = await listAssets(admin, partnerId);
  if (!listed.ok) return listed;
  if (!listed.assets.length) {
    await clearAllCovers(admin, partnerId);
    return syncCover(admin, partnerId, null);
  }
  return setSoleCover(admin, partnerId, listed.assets[0].id);
}

async function getAssets(opts) {
  if (!canReadRole(opts.role)) return { ok: false, code: 'forbidden' };
  var admin = createAdminClient();
  var listed = await listAssets(admin, opts.partnerId);
  if (!listed.ok) return listed;
  var profile = await getProfile(admin, opts.partnerId);
  if (!profile.ok) return profile;
  return {
    ok: true,
    partnerId: opts.partnerId,
    role: opts.role,
    coverAssetId: profile.profile.cover_asset_id || null,
    assets: listed.assets,
    maxAssets: blob.MAX_ASSETS,
    maxBytes: blob.MAX_BYTES
  };
}

function decodeBase64Payload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  var s = raw;
  var comma = s.indexOf(',');
  if (s.indexOf('data:') === 0 && comma >= 0) s = s.slice(comma + 1);
  try {
    return Buffer.from(s, 'base64');
  } catch (e) {
    return null;
  }
}

async function uploadAsset(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };

  var admin = createAdminClient();
  var statusLoad = await loadOnboardingStatus(admin, opts.partnerId);
  if (!statusLoad.ok) return statusLoad;
  if (!canMutateAssets(statusLoad.status)) {
    return { ok: false, code: 'section_locked' };
  }

  var listed = await listAssets(admin, opts.partnerId);
  if (!listed.ok) return listed;
  if (listed.assets.length >= blob.MAX_ASSETS) {
    return { ok: false, code: 'max_assets', message: 'Maximaal 12 projectfoto’s.' };
  }

  var buf = opts.buffer;
  if (!buf && opts.dataBase64) buf = decodeBase64Payload(opts.dataBase64);
  var checked = blob.validateImageBuffer(buf, opts.contentType);
  if (!checked.ok) return checked;

  var assetId = crypto.randomUUID();
  var privateKey = blob.buildPrivateStorageKey(assetId, checked.ext);
  var uploaded;
  try {
    uploaded = await blob.putPrivateObject(privateKey, buf, checked.contentType);
  } catch (e) {
    if (e && e.code === 'missing_env') return { ok: false, code: 'missing_env' };
    console.error('blob_private_put_failed', e && e.message);
    return { ok: false, code: 'upload_failed', message: 'Upload mislukt. Probeer opnieuw.' };
  }

  var nextSort =
    listed.assets.length === 0
      ? 0
      : Math.max.apply(
          null,
          listed.assets.map(function (a) {
            return a.sortOrder;
          })
        ) + 1;

  var profile = await getProfile(admin, opts.partnerId);
  if (!profile.ok) {
    await blob.deletePrivateObject(uploaded.storageKey);
    return profile;
  }

  var makeCover = !profile.profile.cover_asset_id && listed.assets.length === 0;
  var title = opts.title != null ? String(opts.title).trim().slice(0, 60) : '';

  var row = {
    id: assetId,
    partner_id: opts.partnerId,
    storage_key: uploaded.storageKey,
    private_storage_key: uploaded.storageKey,
    public_storage_key: null,
    public_url: null,
    title: title,
    content_type: checked.contentType,
    byte_size: checked.byteSize,
    asset_status: 'draft',
    is_cover: !!makeCover,
    sort_order: nextSort,
    created_by: opts.userId
  };

  var { data: inserted, error: iErr } = await admin
    .from('partner_profile_assets')
    .insert(row)
    .select('*')
    .maybeSingle();

  if (iErr || !inserted) {
    console.error('asset_insert_failed', iErr && iErr.message);
    await blob.deletePrivateObject(uploaded.storageKey);
    return { ok: false, code: 'server_error' };
  }

  if (makeCover) {
    var synced = await syncCover(admin, opts.partnerId, assetId);
    if (!synced.ok) return synced;
  } else if (opts.setCover) {
    var set = await setSoleCover(admin, opts.partnerId, assetId);
    if (!set.ok) return set;
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'portfolio_asset_uploaded',
    meta: { assetId: assetId, bytes: checked.byteSize, private: true }
  });

  var refreshed = await getAssets(opts);
  if (!refreshed.ok) return refreshed;
  refreshed.uploadedAssetId = assetId;
  return refreshed;
}

async function loadOwnedAsset(admin, partnerId, assetId) {
  if (!assetId || typeof assetId !== 'string') {
    return { ok: false, code: 'invalid_asset' };
  }
  var { data, error } = await admin
    .from('partner_profile_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();
  if (error) {
    console.error('asset_load_failed', error.message);
    return { ok: false, code: 'server_error' };
  }
  if (!data) return { ok: false, code: 'not_found' };
  if (data.partner_id !== partnerId) {
    return { ok: false, code: 'forbidden' };
  }
  return { ok: true, asset: data };
}

/**
 * Authorized private preview — owning membership or staff.
 */
async function loadPrivatePreviewBuffer(opts) {
  var admin = createAdminClient();
  var owned = await loadOwnedAsset(admin, opts.partnerId, opts.assetId);
  if (!owned.ok) return owned;
  var key = privateKeyOf(owned.asset);
  if (!key) {
    // Legacy public-only: no private original to stream
    if (owned.asset.public_url) {
      return { ok: false, code: 'legacy_public_only', publicUrl: owned.asset.public_url };
    }
    return { ok: false, code: 'not_found' };
  }
  try {
    var got = await blob.getPrivateBuffer(key);
    if (!got.ok) return { ok: false, code: 'not_found' };
    return {
      ok: true,
      buffer: got.buffer,
      contentType: got.contentType || owned.asset.content_type || 'application/octet-stream'
    };
  } catch (e) {
    if (e && e.code === 'missing_env') return { ok: false, code: 'missing_env' };
    console.error('asset_preview_failed', e && e.message);
    return { ok: false, code: 'server_error' };
  }
}

async function updateAsset(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };
  var admin = createAdminClient();
  var statusLoad = await loadOnboardingStatus(admin, opts.partnerId);
  if (!statusLoad.ok) return statusLoad;
  if (!canMutateAssets(statusLoad.status)) {
    return { ok: false, code: 'section_locked' };
  }
  var owned = await loadOwnedAsset(admin, opts.partnerId, opts.assetId);
  if (!owned.ok) return owned;

  var patch = {};
  if (Object.prototype.hasOwnProperty.call(opts, 'title')) {
    patch.title = opts.title == null ? '' : String(opts.title).trim().slice(0, 60);
  }

  if (Object.keys(patch).length) {
    var { error: uErr } = await admin
      .from('partner_profile_assets')
      .update(patch)
      .eq('id', opts.assetId)
      .eq('partner_id', opts.partnerId);
    if (uErr) {
      console.error('asset_update_failed', uErr.message);
      return { ok: false, code: 'server_error' };
    }
  }

  if (opts.setCover === true) {
    var set = await setSoleCover(admin, opts.partnerId, opts.assetId);
    if (!set.ok) return set;
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'portfolio_asset_updated',
    meta: { assetId: opts.assetId, setCover: !!opts.setCover }
  });

  return getAssets(opts);
}

async function reorderAssets(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };
  if (!Array.isArray(opts.orderedIds) || !opts.orderedIds.length) {
    return { ok: false, code: 'invalid_draft', message: 'Volgorde ontbreekt.' };
  }

  var admin = createAdminClient();
  var statusLoad = await loadOnboardingStatus(admin, opts.partnerId);
  if (!statusLoad.ok) return statusLoad;
  if (!canMutateAssets(statusLoad.status)) {
    return { ok: false, code: 'section_locked' };
  }
  var listed = await listAssets(admin, opts.partnerId);
  if (!listed.ok) return listed;

  var existing = {};
  listed.assets.forEach(function (a) {
    existing[a.id] = a;
  });

  if (opts.orderedIds.length !== listed.assets.length) {
    return { ok: false, code: 'invalid_draft', message: 'Volgorde komt niet overeen.' };
  }

  var seen = {};
  for (var i = 0; i < opts.orderedIds.length; i++) {
    var id = String(opts.orderedIds[i]);
    if (!existing[id] || seen[id]) {
      return { ok: false, code: 'forbidden', message: 'Ongeldige asset-volgorde.' };
    }
    seen[id] = true;
  }

  for (var j = 0; j < opts.orderedIds.length; j++) {
    var aid = String(opts.orderedIds[j]);
    var { error } = await admin
      .from('partner_profile_assets')
      .update({ sort_order: j })
      .eq('id', aid)
      .eq('partner_id', opts.partnerId);
    if (error) {
      console.error('asset_reorder_failed', error.message);
      return { ok: false, code: 'server_error' };
    }
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'portfolio_assets_reordered',
    meta: { count: opts.orderedIds.length }
  });

  return getAssets(opts);
}

async function deleteAsset(opts) {
  if (!canEditRole(opts.role)) return { ok: false, code: 'forbidden' };
  var admin = createAdminClient();
  var statusLoad = await loadOnboardingStatus(admin, opts.partnerId);
  if (!statusLoad.ok) return statusLoad;
  if (!canMutateAssets(statusLoad.status)) {
    return { ok: false, code: 'section_locked' };
  }
  var owned = await loadOwnedAsset(admin, opts.partnerId, opts.assetId);
  if (!owned.ok) return owned;

  var wasCover = !!owned.asset.is_cover;
  var priv = privateKeyOf(owned.asset);
  var pubKey = publicKeyOf(owned.asset);
  var pubUrl = owned.asset.public_url || null;

  var { error: dErr } = await admin
    .from('partner_profile_assets')
    .delete()
    .eq('id', opts.assetId)
    .eq('partner_id', opts.partnerId);

  if (dErr) {
    console.error('asset_delete_failed', dErr.message);
    return { ok: false, code: 'server_error' };
  }

  if (priv) await blob.deletePrivateObject(priv);
  if (pubKey || pubUrl) await blob.deletePublicObject(pubUrl || pubKey);
  // Legacy: storage_key without private_storage_key may still point at public store
  if (!priv && owned.asset.storage_key && owned.asset.public_url) {
    await blob.deletePublicObject(owned.asset.public_url || owned.asset.storage_key);
  }

  if (wasCover) {
    var promoted = await promoteNextCover(admin, opts.partnerId);
    if (!promoted.ok) return promoted;
  } else {
    var profile = await getProfile(admin, opts.partnerId);
    if (profile.ok && profile.profile.cover_asset_id === opts.assetId) {
      await promoteNextCover(admin, opts.partnerId);
    }
  }

  await writeAudit({
    req: opts.req,
    actorUserId: opts.userId,
    actorType: 'user',
    partnerId: opts.partnerId,
    action: 'portfolio_asset_deleted',
    meta: { assetId: opts.assetId, wasCover: wasCover }
  });

  return getAssets(opts);
}

/**
 * Create/refresh public derivatives from private originals.
 * Idempotent: skips assets that already have public_url + public_storage_key
 * unless opts.forceRefresh.
 * Fail-closed: Blob puts complete before any DB write; on failure delete all
 * newly created public objects and leave profile unpublished / unrestored.
 */
async function promoteAssetsToPublic(opts) {
  var admin = opts.admin || createAdminClient();
  var partnerId = opts.partnerId;
  var listed = await listAssets(admin, partnerId);
  if (!listed.ok) return listed;

  var pending = [];
  var rows = listed.rows || [];

  try {
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var priv = privateKeyOf(row);
      if (!priv) {
        // Legacy public-only: keep existing public_url for snapshot; do not invent private.
        continue;
      }
      if (row.public_url && row.public_storage_key && !opts.forceRefresh) {
        continue;
      }

      if (opts.forceRefresh && (row.public_url || row.public_storage_key)) {
        await blob.deletePublicObject(row.public_url || row.public_storage_key);
      }

      var got = await blob.getPrivateBuffer(priv);
      if (!got.ok) {
        throw Object.assign(new Error('private_read_failed'), { code: 'upload_failed' });
      }
      var encoded = await blob.encodePublicDerivative(
        got.buffer,
        got.contentType || row.content_type
      );
      if (!encoded.ok) {
        throw Object.assign(new Error('public_encode_failed'), {
          code: encoded.code || 'upload_failed'
        });
      }
      var pubKey = blob.buildPublicStorageKey(row.id, encoded.ext);
      var put = await blob.putPublicObject(pubKey, encoded.buffer, encoded.contentType);
      pending.push({
        id: row.id,
        storageKey: put.storageKey,
        publicUrl: put.publicUrl,
        priv: priv
      });
    }

    for (var u = 0; u < pending.length; u++) {
      var item = pending[u];
      var { error: uErr } = await admin
        .from('partner_profile_assets')
        .update({
          public_storage_key: item.storageKey,
          public_url: item.publicUrl,
          storage_key: item.priv
        })
        .eq('id', item.id)
        .eq('partner_id', partnerId);
      if (uErr) {
        throw Object.assign(new Error('public_meta_update_failed'), { code: 'server_error' });
      }
    }
  } catch (e) {
    for (var j = 0; j < pending.length; j++) {
      await blob.deletePublicObject(pending[j].publicUrl || pending[j].storageKey);
      // Clear any DB rows updated before the failure (fail closed; no dangling public refs).
      try {
        await admin
          .from('partner_profile_assets')
          .update({ public_storage_key: null, public_url: null })
          .eq('id', pending[j].id)
          .eq('partner_id', partnerId);
      } catch (clearErr) {
        console.error('promote_rollback_meta_failed', clearErr && clearErr.message);
      }
    }
    if (e && e.code === 'missing_env') return { ok: false, code: 'missing_env' };
    console.error('promote_assets_failed', e && e.message);
    return { ok: false, code: e && e.code ? e.code : 'upload_failed' };
  }

  var refreshed = await listAssets(admin, partnerId);
  if (!refreshed.ok) return refreshed;
  return { ok: true, assets: refreshed.rows, mapped: refreshed.assets };
}

/**
 * Revoke public derivatives while preserving private originals.
 * Legacy assets without private_storage_key: leave Blob object; clear only if private exists.
 */
async function revokePublicDerivatives(opts) {
  var admin = opts.admin || createAdminClient();
  var partnerId = opts.partnerId;
  var listed = await listAssets(admin, partnerId);
  if (!listed.ok) return listed;
  var rows = listed.rows || [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var priv = privateKeyOf(row);
    var pubKey = publicKeyOf(row);
    var pubUrl = row.public_url || null;
    if (!pubKey && !pubUrl) continue;

    if (priv) {
      await blob.deletePublicObject(pubUrl || pubKey);
      var { error } = await admin
        .from('partner_profile_assets')
        .update({ public_storage_key: null, public_url: null })
        .eq('id', row.id)
        .eq('partner_id', partnerId);
      if (error) {
        console.error('revoke_public_meta_failed', error.message);
        return { ok: false, code: 'server_error' };
      }
    }
    // Legacy without private: keep blob (restore/compat); Marketplace fail-closed via profile status.
  }

  return { ok: true };
}

module.exports = {
  mapAsset,
  sortAssets,
  getAssets,
  uploadAsset,
  updateAsset,
  reorderAssets,
  deleteAsset,
  setSoleCover,
  promoteNextCover,
  loadOwnedAsset,
  loadPrivatePreviewBuffer,
  promoteAssetsToPublic,
  revokePublicDerivatives,
  listAssets,
  COVER_DELETE_RULE:
    'When cover deleted: promote next by sort_order ASC, created_at ASC, id ASC; else clear cover_asset_id.'
};
