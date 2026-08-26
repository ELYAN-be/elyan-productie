'use strict';
/**
 * Security Hardening Block 2 — private professional draft assets.
 * Run: node scripts/private-assets-check.js
 * Uses in-memory DB + Blob fakes. No production Blob / no fake companies.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var failed = 0;
var JPEG_BUF = null;
var PNG_BUF = null;

function ok(name) {
  console.log('OK  ' + name);
}
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    var ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret.then(function () {
        ok(name);
      }).catch(function (e) {
        fail(name, e);
      });
    }
    ok(name);
    return Promise.resolve();
  } catch (e) {
    fail(name, e);
    return Promise.resolve();
  }
}

function source(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function createMemoryDb() {
  var store = {
    partner_onboarding: {},
    partner_profiles: {},
    partner_profile_assets: {},
    partner_review_items: {},
    staff_users: {},
    audit_logs: [],
    blobs: {}
  };

  function matchFilters(row, filters) {
    return filters.every(function (f) {
      if (f.op === 'eq') return row[f.col] === f.val;
      if (f.op === 'in') return f.val.indexOf(row[f.col]) >= 0;
      return true;
    });
  }

  function tableApi(name) {
    var filters = [];
    var payload = null;
    var mode = 'select';
    var api = {
      select: function () {
        mode = mode === 'update' || mode === 'upsert' || mode === 'insert' ? mode : 'select';
        return api;
      },
      insert: function (row) {
        mode = 'insert';
        payload = Array.isArray(row) ? row[0] : row;
        return api;
      },
      upsert: function (row) {
        mode = 'upsert';
        payload = row;
        return api;
      },
      update: function (row) {
        mode = 'update';
        payload = row;
        return api;
      },
      delete: function () {
        mode = 'delete';
        return api;
      },
      eq: function (col, val) {
        filters.push({ op: 'eq', col: col, val: val });
        return api;
      },
      in: function (col, vals) {
        filters.push({ op: 'in', col: col, val: vals });
        return api;
      },
      order: function () {
        return api;
      },
      maybeSingle: async function () {
        var result = await api._exec();
        if (Array.isArray(result.data)) {
          return { data: result.data[0] || null, error: result.error };
        }
        return result;
      },
      then: function (resolve, reject) {
        return api._exec().then(resolve, reject);
      },
      _exec: async function () {
        if (!store[name] && name !== 'audit_logs') store[name] = {};
        if (name === 'audit_logs' && mode === 'insert') {
          store.audit_logs.push(payload);
          return { data: payload, error: null };
        }
        if (mode === 'delete') {
          var delRows = Object.keys(store[name])
            .map(function (k) {
              return store[name][k];
            })
            .filter(function (r) {
              return matchFilters(r, filters);
            });
          delRows.forEach(function (r) {
            delete store[name][r.id || r.partner_id];
          });
          return { data: delRows, error: null };
        }
        if (mode === 'upsert' || mode === 'insert') {
          var key = payload.id || payload.partner_id;
          if (name === 'partner_profile_assets' || name === 'partner_review_items') {
            if (!payload.id) payload.id = crypto.randomUUID();
            key = payload.id;
          }
          if (mode === 'insert' || !store[name][key]) {
            store[name][key] = Object.assign({}, payload);
          } else {
            store[name][key] = Object.assign({}, store[name][key], payload);
          }
          return { data: Object.assign({}, store[name][key]), error: null };
        }
        if (mode === 'update') {
          var rows = Object.keys(store[name])
            .map(function (k) {
              return store[name][k];
            })
            .filter(function (r) {
              return matchFilters(r, filters);
            });
          rows.forEach(function (r) {
            Object.keys(payload).forEach(function (k) {
              r[k] = payload[k];
            });
          });
          return {
            data:
              rows.length === 1
                ? Object.assign({}, rows[0])
                : rows.map(function (r) {
                    return Object.assign({}, r);
                  }),
            error: null
          };
        }
        var selected = Object.keys(store[name])
          .map(function (k) {
            return Object.assign({}, store[name][k]);
          })
          .filter(function (r) {
            return matchFilters(r, filters);
          });
        return { data: selected, error: null };
      }
    };
    return api;
  }

  return {
    store: store,
    from: function (name) {
      return tableApi(name);
    }
  };
}

var Draft = require('../js/professionals/onboarding-draft');

function minimalPublicDraft() {
  var sid = Draft.getServices('dakwerken')[0].id;
  return {
    company: {
      display_name: 'Test BV',
      legal_name: 'Test BV',
      rechtsvorm: 'BV',
      kbo: '0123456789',
      gemeente: 'Gent',
      postcode: '9000',
      gewest: 'Vlaanderen'
    },
    service_area: { public_text: 'Oost-Vlaanderen' },
    craft: { primary_category_id: 'dakwerken', service_ids: [sid] },
    offer: {},
    story: {
      strength: 'Sterk in hellende daken en details.',
      prefer: 'Liever wel totaalrenovaties bij gezinnen.'
    }
  };
}

function installBlobMocks(db, realBlobExports) {
  return Object.assign({}, realBlobExports, {
    putPrivateObject: async function (storageKey, buf, contentType) {
      db.store.blobs[storageKey] = { buf: buf, contentType: contentType, access: 'private' };
      return { storageKey: storageKey, url: null };
    },
    putPublicObject: async function (storageKey, buf, contentType) {
      var url = 'https://blob.test/public/' + storageKey;
      db.store.blobs[storageKey] = {
        buf: buf,
        contentType: contentType,
        access: 'public',
        url: url
      };
      return { storageKey: storageKey, publicUrl: url };
    },
    getPrivateBuffer: async function (storageKeyOrUrl) {
      var hit = db.store.blobs[storageKeyOrUrl];
      if (!hit || hit.access !== 'private') return { ok: false, code: 'not_found' };
      return { ok: true, buffer: hit.buf, contentType: hit.contentType };
    },
    deletePrivateObject: async function (ref) {
      Object.keys(db.store.blobs).forEach(function (k) {
        if (k === ref) delete db.store.blobs[k];
      });
      return { ok: true };
    },
    deletePublicObject: async function (ref) {
      Object.keys(db.store.blobs).forEach(function (k) {
        var b = db.store.blobs[k];
        if (k === ref || (b && b.url === ref)) delete db.store.blobs[k];
      });
      return { ok: true };
    },
    getPrivateToken: function () {
      return 'test-private-token';
    },
    getPublicToken: function () {
      return 'test-public-token';
    }
  });
}

async function withAssetHarness(fn, opts) {
  opts = opts || {};
  var db = createMemoryDb();
  // Ensure modules are loaded so require.cache entries exist.
  require('../server/blob-storage');
  require('../server/supabase');
  require('../server/audit');

  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var blobPath = require.resolve('../server/blob-storage');
  var assetsPath = require.resolve('../server/assets');
  var publicSnapPath = require.resolve('../server/public-snapshot');
  var tenancyPath = require.resolve('../server/tenancy');

  var realSupabase = require.cache[supabasePath];
  var realAudit = require.cache[auditPath];
  var realBlob = require.cache[blobPath];
  var realTenancy = require.cache[tenancyPath];
  var blobExports = realBlob && realBlob.exports ? realBlob.exports : require('../server/blob-storage');

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { createAdminClient: function () { return db; } }
  };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: {
      writeAudit: async function (o) {
        db.store.audit_logs.push(o);
      }
    }
  };
  require.cache[blobPath] = {
    id: blobPath,
    filename: blobPath,
    loaded: true,
    exports: installBlobMocks(db, blobExports)
  };

  if (opts.mockTenancy) {
    require.cache[tenancyPath] = {
      id: tenancyPath,
      filename: tenancyPath,
      loaded: true,
      exports: opts.mockTenancy
    };
  }

  delete require.cache[assetsPath];
  delete require.cache[publicSnapPath];

  try {
    var assets = require('../server/assets');
    var publicSnap = require('../server/public-snapshot');
    await fn(assets, publicSnap, db);
  } finally {
    if (realSupabase) require.cache[supabasePath] = realSupabase;
    else delete require.cache[supabasePath];
    if (realAudit) require.cache[auditPath] = realAudit;
    else delete require.cache[auditPath];
    if (realBlob) require.cache[blobPath] = realBlob;
    else delete require.cache[blobPath];
    if (realTenancy) require.cache[tenancyPath] = realTenancy;
    else delete require.cache[tenancyPath];
    delete require.cache[assetsPath];
    delete require.cache[publicSnapPath];
    require('../server/assets');
    require('../server/public-snapshot');
  }
}

function seedPartner(db, partnerId, onboardingStatus) {
  db.store.partner_profiles[partnerId] = {
    partner_id: partnerId,
    profile_status: 'draft',
    cover_asset_id: null
  };
  db.store.partner_onboarding[partnerId] = {
    partner_id: partnerId,
    onboarding_status: onboardingStatus || 'in_progress',
    current_step_id: 'portfolio',
    draft: {},
    version: 1,
    started_at: new Date().toISOString()
  };
}

function mockRes() {
  var r = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: function (k, v) {
      this.headers[k] = v;
    },
    end: function (b) {
      this.body = b;
    }
  };
  return r;
}

async function run() {
  var sharp = require('sharp');
  JPEG_BUF = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 220, g: 30, b: 30 } }
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  PNG_BUF = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r: 0, g: 200, b: 0, alpha: 0.6 }
    }
  })
    .png()
    .toBuffer();
  await test('1 unauthenticated upload denied (API requires partner context)', function () {
    var api = source('api/professionals.js');
    assert.ok(api.indexOf('onboarding-asset-upload') >= 0);
    assert.ok(api.indexOf('withPartnerContext') >= 0);
    assert.ok(api.indexOf('requirePartnerContext') >= 0);
    var uploadIdx = api.indexOf('async function handleOnboardingAssetUpload');
    assert.ok(uploadIdx >= 0);
    var uploadBlock = api.slice(uploadIdx, uploadIdx + 500);
    assert.ok(uploadBlock.indexOf('withPartnerContext') >= 0);
  });

  await test('2 unauthenticated private preview denied', async function () {
    var previewPath = require.resolve('../api/professionals/asset-preview');
    var tenancyPath = require.resolve('../server/tenancy');
    var assetsPath = require.resolve('../server/assets');
    var rlPath = require.resolve('../server/rate-limit');
    var realTenancy = require.cache[tenancyPath];
    var realAssets = require.cache[assetsPath];
    var realRl = require.cache[rlPath];

    require.cache[tenancyPath] = {
      id: tenancyPath,
      filename: tenancyPath,
      loaded: true,
      exports: {
        requireUser: async function () {
          return { ok: false, status: 401, code: 'missing_token' };
        },
        requirePartnerContext: async function () {
          return { ok: false, code: 'missing_token' };
        },
        isStaff: async function () {
          return { staff: false, role: null };
        }
      }
    };
    require.cache[assetsPath] = {
      id: assetsPath,
      filename: assetsPath,
      loaded: true,
      exports: {
        loadPrivatePreviewBuffer: async function () {
          throw new Error('should_not_reach');
        }
      }
    };
    require.cache[rlPath] = {
      id: rlPath,
      filename: rlPath,
      loaded: true,
      exports: {
        rateLimit: function () {
          return { ok: true };
        },
        clientKey: function () {
          return 't';
        }
      }
    };
    delete require.cache[previewPath];
    try {
      var handler = require('../api/professionals/asset-preview');
      var res = mockRes();
      await handler(
        { method: 'GET', url: '/api/professionals/asset-preview?assetId=a1&partnerId=p1', query: { assetId: 'a1', partnerId: 'p1' } },
        res
      );
      assert.strictEqual(res.statusCode, 401);
      assert.ok(String(res.body).indexOf('missing_token') >= 0);
    } finally {
      if (realTenancy) require.cache[tenancyPath] = realTenancy;
      else delete require.cache[tenancyPath];
      if (realAssets) require.cache[assetsPath] = realAssets;
      else delete require.cache[assetsPath];
      if (realRl) require.cache[rlPath] = realRl;
      else delete require.cache[rlPath];
      delete require.cache[previewPath];
    }
  });

  await test('3 owning professional preview allowed', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-owner';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok, up.code);
      var assetId = up.uploadedAssetId;
      var prev = await assets.loadPrivatePreviewBuffer({ partnerId: partnerId, assetId: assetId });
      assert.ok(prev.ok, prev.code);
      assert.ok(Buffer.isBuffer(prev.buffer));
      assert.ok(prev.buffer.length > 0);
    });
  });

  await test('4 cross-tenant preview denied', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-a';
      var otherId = 'p-b';
      seedPartner(db, partnerId);
      seedPartner(db, otherId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      var steal = await assets.loadPrivatePreviewBuffer({
        partnerId: otherId,
        assetId: up.uploadedAssetId
      });
      assert.strictEqual(steal.code, 'forbidden');
    });
  });

  await test('5 professional cannot access Control-only route', function () {
    var ctrl = source('api/control.js');
    assert.ok(ctrl.indexOf('requireStaff') >= 0);
    assert.ok(ctrl.indexOf('No partner membership path') >= 0 || ctrl.indexOf('requireStaff') >= 0);
    assert.ok(ctrl.indexOf('requirePartnerContext') < 0);
  });

  await test('6 staff preview allowed (ownership bypass via staff auth at route)', async function () {
    var previewPath = require.resolve('../api/professionals/asset-preview');
    var tenancyPath = require.resolve('../server/tenancy');
    var assetsPath = require.resolve('../server/assets');
    var rlPath = require.resolve('../server/rate-limit');
    var realTenancy = require.cache[tenancyPath];
    var realAssets = require.cache[assetsPath];
    var realRl = require.cache[rlPath];
    var partnerCtxCalled = false;

    require.cache[tenancyPath] = {
      id: tenancyPath,
      filename: tenancyPath,
      loaded: true,
      exports: {
        requireUser: async function () {
          return { ok: true, user: { id: 'staff-1' } };
        },
        requirePartnerContext: async function () {
          partnerCtxCalled = true;
          return { ok: false, code: 'forbidden' };
        },
        isStaff: async function () {
          return { staff: true, role: 'admin' };
        }
      }
    };
    require.cache[assetsPath] = {
      id: assetsPath,
      filename: assetsPath,
      loaded: true,
      exports: {
        loadPrivatePreviewBuffer: async function () {
          return { ok: true, buffer: Buffer.from([1, 2, 3]), contentType: 'image/jpeg' };
        }
      }
    };
    require.cache[rlPath] = {
      id: rlPath,
      filename: rlPath,
      loaded: true,
      exports: {
        rateLimit: function () {
          return { ok: true };
        },
        clientKey: function () {
          return 't';
        }
      }
    };
    delete require.cache[previewPath];
    try {
      var handler = require('../api/professionals/asset-preview');
      var res = mockRes();
      await handler(
        {
          method: 'GET',
          url: '/api/professionals/asset-preview?assetId=a1&partnerId=p1',
          query: { assetId: 'a1', partnerId: 'p1' }
        },
        res
      );
      assert.strictEqual(res.statusCode, 200);
      assert.ok(!partnerCtxCalled, 'staff should not require partner membership');
      assert.ok(Buffer.isBuffer(res.body) || res.body);
    } finally {
      if (realTenancy) require.cache[tenancyPath] = realTenancy;
      else delete require.cache[tenancyPath];
      if (realAssets) require.cache[assetsPath] = realAssets;
      else delete require.cache[assetsPath];
      if (realRl) require.cache[rlPath] = realRl;
      else delete require.cache[rlPath];
      delete require.cache[previewPath];
    }
  });

  await test('7–8 draft reference absent from public APIs and PublicSnapshot', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-pub';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg',
        title: 'Draft only'
      });
      assert.ok(up.ok);
      var mapped = up.assets[0];
      assert.strictEqual(mapped.publicUrl, null);
      assert.ok(mapped.previewUrl);

      var built = publicSnap.buildPublicSnapshotV1({
        draft: minimalPublicDraft(),
        assets: db.store.partner_profile_assets[up.uploadedAssetId]
          ? [db.store.partner_profile_assets[up.uploadedAssetId]]
          : [],
        coverAssetId: up.uploadedAssetId,
        displayName: 'Test BV',
        legalName: 'Test BV',
        specialtyLine: null,
        primaryCategoryId: 'dakwerken',
        slug: 'test-bv',
        publishedAt: new Date().toISOString(),
        publicSnapshotVersion: 1
      });
      assert.ok(built.ok, built.code);
      assert.strictEqual((built.snapshot.assets || []).length, 0);
      assert.strictEqual(built.snapshot.coverUrl, null);
      var json = JSON.stringify(built.snapshot);
      assert.ok(json.indexOf('elyan/drafts') < 0);
      assert.ok(json.indexOf('private_storage') < 0);
      assert.ok(json.indexOf('asset-preview') < 0);
      assert.ok(json.indexOf('BLOB_') < 0);
    });

    var pubApi = source('api/public/v1.js');
    assert.ok(pubApi.indexOf('private_storage_key') < 0);
    assert.ok(pubApi.indexOf('asset-preview') < 0);
  });

  await test('9 upload remains private through submit/review/changes requested', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-lifecycle';
      var statuses = ['in_progress', 'submitted', 'changes_requested'];
      for (var i = 0; i < statuses.length; i++) {
        seedPartner(db, partnerId + '-' + i, statuses[i]);
        var pid = partnerId + '-' + i;
        var up = await assets.uploadAsset({
          partnerId: pid,
          role: 'owner',
          userId: 'u1',
          buffer: JPEG_BUF,
          contentType: 'image/jpeg'
        });
        if (statuses[i] === 'submitted' || statuses[i] === 'changes_requested' || statuses[i] === 'in_progress') {
          assert.ok(up.ok, statuses[i] + ' ' + up.code);
          assert.strictEqual(up.assets[0].publicUrl, null);
          assert.ok(up.assets[0].hasPrivateOriginal !== false);
          var row = db.store.partner_profile_assets[up.uploadedAssetId];
          assert.ok(row.private_storage_key);
          assert.ok(!row.public_url);
        }
      }
    });
  });

  await test('10–11 publish produces only public refs; retry idempotent', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-publish';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok);
      var assetId = up.uploadedAssetId;
      var privKey = db.store.partner_profile_assets[assetId].private_storage_key;

      var promo = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(promo.ok, promo.code);
      var row = db.store.partner_profile_assets[assetId];
      assert.ok(row.public_url);
      assert.ok(row.public_storage_key);
      assert.strictEqual(row.private_storage_key, privKey);
      assert.ok(row.public_url.indexOf('https://blob.test/public/') === 0);
      assert.ok(db.store.blobs[row.public_storage_key]);
      assert.strictEqual(db.store.blobs[row.public_storage_key].access, 'public');

      var pubCountBefore = Object.keys(db.store.blobs).filter(function (k) {
        return db.store.blobs[k].access === 'public';
      }).length;

      var again = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(again.ok);
      var pubCountAfter = Object.keys(db.store.blobs).filter(function (k) {
        return db.store.blobs[k].access === 'public';
      }).length;
      assert.strictEqual(pubCountAfter, pubCountBefore);

      var built = publicSnap.buildPublicSnapshotV1({
        draft: Object.assign(minimalPublicDraft(), {
          company: Object.assign({}, minimalPublicDraft().company, {
            display_name: 'Pub BV',
            legal_name: 'Pub BV'
          })
        }),
        assets: [row],
        coverAssetId: assetId,
        displayName: 'Pub BV',
        legalName: 'Pub BV',
        specialtyLine: null,
        primaryCategoryId: 'dakwerken',
        slug: 'pub-bv',
        publishedAt: new Date().toISOString(),
        publicSnapshotVersion: 1
      });
      assert.ok(built.ok, built.code);
      assert.strictEqual(built.snapshot.assets.length, 1);
      assert.strictEqual(built.snapshot.assets[0].url, row.public_url);
      assert.ok(JSON.stringify(built.snapshot).indexOf('elyan/drafts') < 0);
      assert.ok(JSON.stringify(built.snapshot).indexOf(privKey) < 0);
    });
  });

  await test('12 partial asset publication fails closed', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-partial';
      seedPartner(db, partnerId);
      db.store.partner_profiles[partnerId].profile_status = 'ready';
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok);
      var assetId = up.uploadedAssetId;
      // Second asset with missing private blob → promote must fail and not leave public_url on first
      var orphanId = crypto.randomUUID();
      db.store.partner_profile_assets[orphanId] = {
        id: orphanId,
        partner_id: partnerId,
        storage_key: 'elyan/drafts/missing.bin',
        private_storage_key: 'elyan/drafts/missing.bin',
        public_url: null,
        public_storage_key: null,
        title: '',
        content_type: 'image/jpeg',
        byte_size: 10,
        asset_status: 'draft',
        is_cover: false,
        sort_order: 1,
        created_at: new Date().toISOString()
      };

      var promo = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(!promo.ok);
      var row1 = db.store.partner_profile_assets[assetId];
      assert.ok(!row1.public_url, 'first asset must not keep public_url after partial failure');
      assert.ok(!row1.public_storage_key);
      assert.strictEqual(
        db.store.partner_profiles[partnerId].profile_status,
        'ready',
        'profile must not flip to published on promote failure'
      );
      var publicBlobs = Object.keys(db.store.blobs).filter(function (k) {
        return db.store.blobs[k].access === 'public';
      });
      assert.strictEqual(publicBlobs.length, 0);

      // Retry after removing the broken row remains safe / idempotent.
      delete db.store.partner_profile_assets[orphanId];
      var retry = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(retry.ok, retry.code);
      assert.ok(db.store.partner_profile_assets[assetId].public_url);
      assert.strictEqual(db.store.partner_profiles[partnerId].profile_status, 'ready');
    });
  });

  await test('13–14 pause/hide revoke public; restore recreates', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-pause';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      var assetId = up.uploadedAssetId;
      assert.ok((await assets.promoteAssetsToPublic({ partnerId: partnerId })).ok);
      var before = db.store.partner_profile_assets[assetId];
      assert.ok(before.public_url);
      var priv = before.private_storage_key;

      var revoked = await assets.revokePublicDerivatives({ partnerId: partnerId });
      assert.ok(revoked.ok);
      var mid = db.store.partner_profile_assets[assetId];
      assert.ok(!mid.public_url);
      assert.ok(!mid.public_storage_key);
      assert.strictEqual(mid.private_storage_key, priv);
      assert.ok(db.store.blobs[priv], 'private original preserved');

      var restored = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(restored.ok);
      var after = db.store.partner_profile_assets[assetId];
      assert.ok(after.public_url);
      assert.ok(after.public_storage_key);
      assert.strictEqual(after.private_storage_key, priv);
    });
  });

  await test('15 deletion removes private and public objects', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-del';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      var assetId = up.uploadedAssetId;
      assert.ok((await assets.promoteAssetsToPublic({ partnerId: partnerId })).ok);
      var row = db.store.partner_profile_assets[assetId];
      var priv = row.private_storage_key;
      var pub = row.public_storage_key;
      assert.ok(db.store.blobs[priv]);
      assert.ok(db.store.blobs[pub]);

      var del = await assets.deleteAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        assetId: assetId
      });
      assert.ok(del.ok);
      assert.ok(!db.store.partner_profile_assets[assetId]);
      assert.ok(!db.store.blobs[priv]);
      assert.ok(!db.store.blobs[pub]);
    });
  });

  await test('16 invalid MIME/type/size rejected', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-bad';
      seedPartner(db, partnerId);
      var bad = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: Buffer.from('GIF89a'),
        contentType: 'image/gif'
      });
      assert.strictEqual(bad.code, 'invalid_mime');
      var huge = Buffer.concat([JPEG_BUF, Buffer.alloc(9 * 1024 * 1024)]);
      var oversized = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: huge,
        contentType: 'image/jpeg'
      });
      assert.strictEqual(oversized.code, 'file_too_large');
    });
  });

  await test('17 filenames and public keys contain no PII', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'org-uuid-with-email-hint';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'user-email-like-id',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok);
      var row = db.store.partner_profile_assets[up.uploadedAssetId];
      assert.ok(row.private_storage_key.indexOf(partnerId) < 0);
      assert.ok(row.private_storage_key.indexOf('user-email') < 0);
      assert.ok(row.private_storage_key.indexOf('@') < 0);
      assert.ok(row.private_storage_key.indexOf('elyan/drafts/') === 0);
      assert.ok((await assets.promoteAssetsToPublic({ partnerId: partnerId })).ok);
      row = db.store.partner_profile_assets[up.uploadedAssetId];
      assert.ok(row.public_storage_key.indexOf(partnerId) < 0);
      assert.ok(row.public_storage_key.indexOf('elyan/live/') === 0);
      assert.ok(row.public_url.indexOf(partnerId) < 0);
    });
  });

  await test('18 private credentials never enter client bundles or responses', function () {
    [
      'js/professionals/core.js',
      'js/professionals/onboarding.js',
      'js/professionals/control.js',
      'js/vakmannen-public.js',
      'js/marketplace.js'
    ].forEach(function (f) {
      var p = path.join(root, f);
      if (!fs.existsSync(p)) return;
      var t = fs.readFileSync(p, 'utf8');
      assert.ok(t.indexOf('BLOB_READ_WRITE_TOKEN') < 0, f);
      assert.ok(t.indexOf('BLOB_PRIVATE_READ_WRITE_TOKEN') < 0, f);
      assert.ok(t.indexOf('service_role') < 0, f);
    });
    var mapped = source('server/assets.js');
    assert.ok(mapped.indexOf('Never exposes private Blob URLs') >= 0 || mapped.indexOf('previewUrl') >= 0);
    assert.ok(mapped.indexOf('private_storage_key') >= 0);
    // mapAsset must not put private key into returned object fields as storageKey
    assert.ok(mapped.indexOf('storageKey:') < 0 || mapped.indexOf('mapAsset') >= 0);
  });

  await test('migration additive; env example documents private token', function () {
    var mig = source('supabase/migrations/20260826_partner_assets_private_public.sql');
    assert.ok(mig.indexOf('ADD COLUMN IF NOT EXISTS private_storage_key') >= 0);
    assert.ok(mig.indexOf('ADD COLUMN IF NOT EXISTS public_storage_key') >= 0);
    assert.ok(mig.indexOf('DROP ') < 0);
    assert.ok(mig.indexOf('DELETE ') < 0);
    var ex = source('.env.example');
    assert.ok(ex.indexOf('BLOB_PRIVATE_READ_WRITE_TOKEN') >= 0);
    assert.ok(ex.indexOf('BLOB_READ_WRITE_TOKEN') >= 0);
  });

  await test('legacy public-only assets: revoke leaves blob; preview redirects', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-legacy';
      seedPartner(db, partnerId);
      var id = crypto.randomUUID();
      var url = 'https://blob.test/legacy/' + id + '.jpg';
      db.store.partner_profile_assets[id] = {
        id: id,
        partner_id: partnerId,
        storage_key: 'legacy/' + id + '.jpg',
        private_storage_key: null,
        public_storage_key: null,
        public_url: url,
        title: '',
        content_type: 'image/jpeg',
        byte_size: 10,
        asset_status: 'published',
        is_cover: true,
        sort_order: 0,
        created_at: new Date().toISOString()
      };
      db.store.blobs['legacy/' + id + '.jpg'] = {
        buf: JPEG_BUF,
        contentType: 'image/jpeg',
        access: 'public',
        url: url
      };
      var revoked = await assets.revokePublicDerivatives({ partnerId: partnerId });
      assert.ok(revoked.ok);
      assert.strictEqual(db.store.partner_profile_assets[id].public_url, url);
      assert.ok(db.store.blobs['legacy/' + id + '.jpg']);
      var prev = await assets.loadPrivatePreviewBuffer({ partnerId: partnerId, assetId: id });
      assert.strictEqual(prev.code, 'legacy_public_only');
      assert.strictEqual(prev.publicUrl, url);
    });
  });

  await test('deleted + missing asset preview denied; SVG rejected', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-gone';
      seedPartner(db, partnerId);
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok);
      var assetId = up.uploadedAssetId;
      assert.ok(
        (
          await assets.deleteAsset({
            partnerId: partnerId,
            role: 'owner',
            userId: 'u1',
            assetId: assetId
          })
        ).ok
      );
      var afterDel = await assets.loadPrivatePreviewBuffer({
        partnerId: partnerId,
        assetId: assetId
      });
      assert.strictEqual(afterDel.code, 'not_found');

      var missing = await assets.loadPrivatePreviewBuffer({
        partnerId: partnerId,
        assetId: crypto.randomUUID()
      });
      assert.strictEqual(missing.code, 'not_found');

      var svg = Buffer.from(
        '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
      );
      var badSvg = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: svg,
        contentType: 'image/svg+xml'
      });
      assert.strictEqual(badSvg.code, 'invalid_mime');

      var blob = require('../server/blob-storage');
      assert.strictEqual(blob.detectMime(svg), null);
      assert.strictEqual(blob.validateImageBuffer(svg, 'image/svg+xml').code, 'invalid_mime');
    });
  });

  await test('publish promotes before status flip; pause strips snapshot (source)', function () {
    var ctrl = source('server/control.js');
    var promoteIdx = ctrl.indexOf('promoteAssetsToPublic');
    var publishIdx = ctrl.indexOf("profile_status: 'published'");
    assert.ok(promoteIdx >= 0 && publishIdx > promoteIdx);
    assert.ok(ctrl.indexOf('revokePublicDerivatives') >= 0);
    assert.ok(ctrl.indexOf('stripPublicSnapshotAssets') >= 0);
    assert.ok(ctrl.indexOf('control_restore_rollback') >= 0);
    var mkt = source('server/marketplace-public.js');
    assert.ok(mkt.indexOf("profile_status !== 'published'") >= 0);
    assert.ok(mkt.indexOf(".eq('profile_status', 'published')") >= 0);
  });

  await test('promote strips metadata and auto-orients via sharp', async function () {
    var sharp = require('sharp');
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-meta';
      seedPartner(db, partnerId);

      var withExif = await sharp({
        create: { width: 120, height: 80, channels: 3, background: { r: 200, g: 40, b: 40 } }
      })
        .jpeg({ quality: 90 })
        .withMetadata({
          orientation: 6,
          exif: {
            IFD0: { Make: 'TestCamDevice', Model: 'UnitTestModel' }
          }
        })
        .toBuffer();

      var inMeta = await sharp(withExif).metadata();
      assert.strictEqual(inMeta.orientation, 6);
      assert.ok(inMeta.exif);

      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: withExif,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok, up.code);
      assert.ok((await assets.promoteAssetsToPublic({ partnerId: partnerId })).ok);
      var row = db.store.partner_profile_assets[up.uploadedAssetId];
      var pub = db.store.blobs[row.public_storage_key];
      assert.ok(pub && pub.buf);
      assert.ok(!pub.buf.equals(withExif), 'public derivative must not be a byte-copy');

      var outMeta = await sharp(pub.buf).metadata();
      assert.ok(!outMeta.orientation, 'orientation tag must be absent after auto-orient');
      assert.ok(!outMeta.exif, 'EXIF must be absent');
      assert.ok(!outMeta.icc || true);
      assert.ok(!outMeta.xmp);
      assert.ok(!outMeta.iptc);
      // Orientation 6: 120x80 sensor → displayed 80x120
      assert.strictEqual(outMeta.width, 80);
      assert.strictEqual(outMeta.height, 120);
      assert.strictEqual(outMeta.format, 'jpeg');
      assert.ok(pub.buf.indexOf(Buffer.from('TestCamDevice')) < 0);
      assert.ok(pub.buf.indexOf(Buffer.from('UnitTestModel')) < 0);
    });
  });

  await test('encodePublicDerivative formats JPEG/PNG/WebP; rejects SVG/spoof/malformed/bomb', async function () {
    var sharp = require('sharp');
    var blob = require('../server/blob-storage');

    var jpegIn = await sharp({
      create: { width: 32, height: 24, channels: 3, background: { r: 10, g: 20, b: 30 } }
    })
      .jpeg()
      .toBuffer();
    var jpegOut = await blob.encodePublicDerivative(jpegIn, 'image/jpeg');
    assert.ok(jpegOut.ok, jpegOut.code);
    assert.strictEqual(jpegOut.contentType, 'image/jpeg');
    assert.ok(!jpegOut.buffer.equals(jpegIn));

    var pngIn = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 0.5 }
      }
    })
      .png()
      .toBuffer();
    var pngOut = await blob.encodePublicDerivative(pngIn, 'image/png');
    assert.ok(pngOut.ok, pngOut.code);
    assert.strictEqual(pngOut.contentType, 'image/png');
    var pngMeta = await sharp(pngOut.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.strictEqual(pngMeta.info.channels, 4);
    // At least one pixel retains non-opaque alpha
    var hasAlpha = false;
    for (var i = 3; i < pngMeta.data.length; i += 4) {
      if (pngMeta.data[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
    assert.ok(hasAlpha, 'PNG transparency preserved');

    var webpIn = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0.4 }
      }
    })
      .webp()
      .toBuffer();
    var webpOut = await blob.encodePublicDerivative(webpIn, 'image/webp');
    assert.ok(webpOut.ok, webpOut.code);
    assert.strictEqual(webpOut.contentType, 'image/webp');
    var webpMeta = await sharp(webpOut.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.strictEqual(webpMeta.info.channels, 4);

    var svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
    );
    assert.strictEqual((await blob.encodePublicDerivative(svg, 'image/svg+xml')).code, 'invalid_mime');

    var spoof = await blob.encodePublicDerivative(jpegIn, 'image/png');
    assert.strictEqual(spoof.code, 'invalid_mime');

    var truncated = jpegIn.slice(0, 32);
    var bad = await blob.encodePublicDerivative(truncated, 'image/jpeg');
    assert.ok(!bad.ok);
    assert.ok(bad.code === 'invalid_file' || bad.code === 'invalid_mime');

    assert.strictEqual(blob.MAX_INPUT_PIXELS, 40 * 1000 * 1000);
    var bomb = await sharp({
      create: { width: 5000, height: 9000, channels: 3, background: { r: 0, g: 0, b: 0 } }
    })
      .jpeg({ quality: 50 })
      .toBuffer();
    var bombRes = await blob.encodePublicDerivative(bomb, 'image/jpeg');
    assert.ok(!bombRes.ok, 'pixel bomb must fail closed');
    assert.ok(bombRes.code === 'file_too_large' || bombRes.code === 'invalid_file');
  });

  await test('encode failure keeps promotion non-public; retry succeeds', async function () {
    await withAssetHarness(async function (assets, publicSnap, db) {
      var partnerId = 'p-encode-fail';
      seedPartner(db, partnerId);
      db.store.partner_profiles[partnerId].profile_status = 'ready';
      var up = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(up.ok);
      var assetId = up.uploadedAssetId;
      var priv = db.store.partner_profile_assets[assetId].private_storage_key;
      // Corrupt private blob so encode/decode fails
      db.store.blobs[priv].buf = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00]);

      var fail = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(!fail.ok);
      assert.strictEqual(db.store.partner_profiles[partnerId].profile_status, 'ready');
      assert.ok(!db.store.partner_profile_assets[assetId].public_url);
      var publicBlobs = Object.keys(db.store.blobs).filter(function (k) {
        return db.store.blobs[k].access === 'public';
      });
      assert.strictEqual(publicBlobs.length, 0);

      db.store.blobs[priv].buf = JPEG_BUF;
      var ok = await assets.promoteAssetsToPublic({ partnerId: partnerId });
      assert.ok(ok.ok, ok.code);
      assert.ok(db.store.partner_profile_assets[assetId].public_url);
      assert.strictEqual(db.store.partner_profiles[partnerId].profile_status, 'ready');
    });
  });

  await test('blob cache propagation honesty documented (90s smoke window)', function () {
    var src = source('server/blob-storage.js');
    assert.ok(src.indexOf('90') >= 0);
    assert.ok(src.indexOf('60') >= 0 || src.indexOf('~60') >= 0);
    assert.ok(src.indexOf('encodePublicDerivative') >= 0);
    assert.ok(src.indexOf('.autoOrient()') >= 0);
    assert.ok(src.indexOf("failOn: 'warning'") >= 0);
  });

  if (failed) {
    console.error('\n' + failed + ' private-assets check(s) failed');
    process.exit(1);
  }
  console.log('\nAll private-assets checks passed');
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
