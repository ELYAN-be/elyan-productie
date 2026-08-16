'use strict';
/**
 * Phase B Sprint 6 — P5 Verhaal + P6 Portfolio offline checks.
 * Run: node scripts/phase-b-sprint6-check.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try {
    var ret = fn();
    if (ret && typeof ret.then === 'function') {
      return ret.then(function () { ok(name); }).catch(function (e) { fail(name, e); });
    }
    ok(name);
    return Promise.resolve();
  } catch (e) {
    fail(name, e);
    return Promise.resolve();
  }
}

var Draft = require('../js/professionals/onboarding-draft');
var Portfolio = require('../js/professionals/onboarding-portfolio');
var model = require('../server/onboarding-model');
var Shell = require('../js/professionals/onboarding-shell');
var blob = require('../server/blob-storage');
var assetsMod = require('../server/assets');

// Minimal JPEG (1x1)
var JPEG_BUF = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFRUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EAD0QAAIBAgQDBgQFAwQDAAAAAAECAwQRBSESMUFRBhNhcYEikaGxFDKxwQcjQtHwFVJykuEz/8QAGQEAAwEBAQAAAAAAAAAAAAAAAAECAwQF/8QAJBEAAgICAgMAAwEBAAAAAAAAAAECEQMhEjEEQVFhEyIUcf/aAAwDAQACEQMRAD8A9oREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREB//Z',
  'base64'
);

function tinyPng() {
  // 1x1 PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

function createMemoryDb() {
  var store = {
    partner_onboarding: {},
    partner_profiles: {},
    partner_profile_assets: {},
    partner_review_items: {},
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
      order: function () { return api; },
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
            .map(function (k) { return store[name][k]; })
            .filter(function (r) { return matchFilters(r, filters); });
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
            var base =
              name === 'partner_onboarding'
                ? {
                    partner_id: key,
                    onboarding_status: 'not_started',
                    current_step_id: 'start',
                    draft: {},
                    version: 1,
                    started_at: null,
                    submitted_at: null
                  }
                : name === 'partner_profiles'
                  ? {
                      partner_id: key,
                      profile_status: 'not_created',
                      cover_asset_id: null
                    }
                  : {};
            store[name][key] = Object.assign(base, payload);
          } else {
            store[name][key] = Object.assign({}, store[name][key], payload);
          }
          return { data: Object.assign({}, store[name][key]), error: null };
        }
        if (mode === 'update') {
          var rows = Object.keys(store[name])
            .map(function (k) { return store[name][k]; })
            .filter(function (r) { return matchFilters(r, filters); });
          rows.forEach(function (r) {
            Object.keys(payload).forEach(function (k) {
              r[k] = payload[k];
            });
          });
          return { data: rows.length === 1 ? Object.assign({}, rows[0]) : rows.map(function (r) { return Object.assign({}, r); }), error: null };
        }
        var selected = Object.keys(store[name])
          .map(function (k) { return Object.assign({}, store[name][k]); })
          .filter(function (r) { return matchFilters(r, filters); });
        return { data: selected, error: null };
      }
    };
    return api;
  }

  return {
    store: store,
    from: function (name) { return tableApi(name); }
  };
}

async function withAssetHarness(fn) {
  var db = createMemoryDb();
  var supabasePath = require.resolve('../server/supabase');
  var auditPath = require.resolve('../server/audit');
  var blobPath = require.resolve('../server/blob-storage');
  var assetsPath = require.resolve('../server/assets');
  var onboardingPath = require.resolve('../server/onboarding');

  var realSupabase = require.cache[supabasePath];
  var realAudit = require.cache[auditPath];
  var realBlob = require.cache[blobPath];

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
      writeAudit: async function (opts) { db.store.audit_logs.push(opts); }
    }
  };
  require.cache[blobPath] = {
    id: blobPath,
    filename: blobPath,
    loaded: true,
    exports: Object.assign({}, realBlob.exports, {
      putObject: async function (storageKey, buf, contentType) {
        var url = 'https://blob.test/' + storageKey;
        db.store.blobs[storageKey] = { buf: buf, contentType: contentType, url: url };
        return { storageKey: storageKey, publicUrl: url };
      },
      deleteObject: async function (ref) {
        Object.keys(db.store.blobs).forEach(function (k) {
          if (k === ref || db.store.blobs[k].url === ref) delete db.store.blobs[k];
        });
        return { ok: true };
      },
      getBlobToken: function () { return 'test-token'; }
    })
  };

  delete require.cache[assetsPath];
  delete require.cache[onboardingPath];

  try {
    var assets = require('../server/assets');
    var onboarding = require('../server/onboarding');
    await fn(assets, onboarding, db);
  } finally {
    if (realSupabase) require.cache[supabasePath] = realSupabase;
    else delete require.cache[supabasePath];
    if (realAudit) require.cache[auditPath] = realAudit;
    else delete require.cache[auditPath];
    if (realBlob) require.cache[blobPath] = realBlob;
    else delete require.cache[blobPath];
    delete require.cache[assetsPath];
    delete require.cache[onboardingPath];
    require('../server/assets');
    require('../server/onboarding');
  }
}

function completeStory(overrides) {
  var s = Draft.emptyStory();
  s.years_active = '3-5';
  s.strength = 'Sterk in hellende daken en details.';
  s.prefer = 'Liever wel totaalrenovaties bij gezinnen.';
  s.show_years_public = true;
  s.show_team_public = false;
  return Object.assign(s, overrides || {});
}

async function run() {
  await test('P5 required/optional validation matches V2', function () {
    assert.ok(!Draft.validateP5Complete({ story: Draft.emptyStory() }).ok);
    assert.ok(!Draft.validateP5Complete({ story: completeStory({ strength: 'kort' }) }).ok);
    assert.ok(!Draft.validateP5Complete({ story: completeStory({ prefer: 'kort' }) }).ok);
    assert.ok(Draft.validateP5Complete({ story: completeStory() }).ok);

    var optional = completeStory({
      team_size: '2-3',
      avoid: 'Geen spoed zonder opmeting.',
      care: 'Nette werf en planning.',
      why_choose: 'Duidelijke communicatie.',
      materials: 'EPDM en keramische pannen.',
      must_know: 'We werken met vaste ploegen.',
      guarantee_line: '2 jaar op plaatsing'
    });
    assert.ok(Draft.validateP5Complete({ story: optional }).ok);

    var badTeam = Draft.sanitizeStory({ team_size: '99' });
    assert.ok(!badTeam.ok);
    var badYears = Draft.sanitizeStory({ years_active: 'forever' });
    assert.ok(!badYears.ok);
    var unknown = Draft.sanitizeStory({ essay: 'nope' });
    assert.ok(!unknown.ok);
  });

  await test('P5 autosave sanitize + resume pickStory', function () {
    var patch = model.validateDraftStructure({
      story: {
        years_active: '6-10',
        strength: 'Sterk in complexe dakdetails en renovatie.',
        prefer: 'Liever wel gezinswoningen in Vlaanderen.',
        show_years_public: true,
        show_team_public: false
      }
    });
    assert.ok(patch.ok, patch.message || patch.code);
    var merged = model.mergeDraft({}, patch.draft);
    var picked = Draft.pickStory(merged.story);
    assert.strictEqual(picked.years_active, '6-10');
    assert.strictEqual(picked.show_years_public, true);
    assert.strictEqual(picked.show_team_public, false);
  });

  await test('P5 defaults for public toggles', function () {
    var empty = Draft.pickStory({});
    assert.strictEqual(empty.show_years_public, true);
    assert.strictEqual(empty.show_team_public, false);
  });

  await test('0 photos soft nudge not blocking', function () {
    var soft = Draft.validateP6Soft([]);
    assert.ok(soft.ok);
    assert.ok(soft.softNudge);
    assert.ok(soft.message.indexOf('Foto') >= 0);
    assert.ok(!Draft.validateP6Soft([{ id: 'a' }]).softNudge);
  });

  await test('MIME magic + size validation', function () {
    assert.ok(blob.validateImageBuffer(JPEG_BUF, 'image/jpeg').ok);
    assert.ok(blob.validateImageBuffer(tinyPng(), 'image/png').ok);
    assert.strictEqual(blob.validateImageBuffer(Buffer.from('not-an-image'), 'image/jpeg').code, 'invalid_mime');
    var huge = Buffer.concat([JPEG_BUF, Buffer.alloc(9 * 1024 * 1024)]);
    // corrupt size check before magic on length
    assert.strictEqual(blob.validateImageBuffer(huge).code, 'file_too_large');
    assert.ok(Portfolio.validateSourceFile({ type: 'image/gif', size: 10 }).code === 'invalid_mime');
    assert.ok(Portfolio.validateSourceFile({ type: 'image/jpeg', size: 9 * 1024 * 1024 }).code === 'file_too_large');
  });

  await test('storage keys are partner-scoped and unique', function () {
    var k1 = blob.buildStorageKey('partner-a', 'asset-1', 'jpg');
    var k2 = blob.buildStorageKey('partner-a', 'asset-1', 'jpg');
    assert.ok(k1.indexOf('partners/partner-a/') >= 0);
    assert.notStrictEqual(k1, k2);
  });

  await test('upload valid JPEG auto-cover; change cover; reorder; delete cover rule', async function () {
    await withAssetHarness(async function (assets, onboarding, db) {
      var partnerId = 'p-sprint6';
      var otherId = 'p-other';
      db.store.partner_profiles[partnerId] = {
        partner_id: partnerId,
        profile_status: 'draft',
        cover_asset_id: null
      };
      db.store.partner_profiles[otherId] = {
        partner_id: otherId,
        profile_status: 'draft',
        cover_asset_id: null
      };
      db.store.partner_onboarding[partnerId] = {
        partner_id: partnerId,
        onboarding_status: 'in_progress',
        current_step_id: 'portfolio',
        draft: { story: completeStory() },
        version: 2,
        started_at: new Date().toISOString()
      };

      var up1 = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg',
        title: 'Werf A'
      });
      assert.ok(up1.ok, up1.code || up1.message);
      assert.strictEqual(up1.assets.length, 1);
      assert.ok(up1.assets[0].isCover);
      assert.strictEqual(up1.coverAssetId, up1.assets[0].id);
      assert.strictEqual(db.store.partner_profiles[partnerId].cover_asset_id, up1.assets[0].id);
      var firstId = up1.assets[0].id;

      var up2 = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: tinyPng(),
        contentType: 'image/png',
        title: 'Werf B'
      });
      assert.ok(up2.ok);
      assert.strictEqual(up2.assets.length, 2);
      assert.strictEqual(up2.coverAssetId, firstId);

      var secondId = up2.assets.filter(function (a) { return a.id !== firstId; })[0].id;
      var coverChange = await assets.updateAsset({
        partnerId: partnerId,
        role: 'admin',
        userId: 'u1',
        assetId: secondId,
        setCover: true
      });
      assert.ok(coverChange.ok);
      assert.strictEqual(coverChange.coverAssetId, secondId);
      assert.strictEqual(coverChange.assets.filter(function (a) { return a.isCover; }).length, 1);

      var reordered = await assets.reorderAssets({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        orderedIds: [firstId, secondId]
      });
      assert.ok(reordered.ok);
      assert.strictEqual(reordered.assets[0].id, firstId);
      assert.strictEqual(reordered.assets[0].sortOrder, 0);
      assert.strictEqual(reordered.assets[1].sortOrder, 1);

      // delete cover → promote next by sort order
      var delCover = await assets.deleteAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        assetId: secondId
      });
      assert.ok(delCover.ok);
      assert.strictEqual(delCover.assets.length, 1);
      assert.strictEqual(delCover.coverAssetId, firstId);
      assert.ok(delCover.assets[0].isCover);

      var delLast = await assets.deleteAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        assetId: firstId
      });
      assert.ok(delLast.ok);
      assert.strictEqual(delLast.assets.length, 0);
      assert.strictEqual(delLast.coverAssetId, null);

      // cross-partner blocked
      var foreign = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.ok(foreign.ok);
      var steal = await assets.updateAsset({
        partnerId: otherId,
        role: 'owner',
        userId: 'u2',
        assetId: foreign.uploadedAssetId,
        setCover: true
      });
      assert.strictEqual(steal.code, 'forbidden');

      var stealDel = await assets.deleteAsset({
        partnerId: otherId,
        role: 'owner',
        userId: 'u2',
        assetId: foreign.uploadedAssetId
      });
      assert.strictEqual(stealDel.code, 'forbidden');

      // member read-only
      var memberUp = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'member',
        userId: 'u3',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.strictEqual(memberUp.code, 'forbidden');
      var memberRead = await assets.getAssets({
        partnerId: partnerId,
        role: 'member',
        userId: 'u3'
      });
      assert.ok(memberRead.ok);

      // max 12
      for (var i = 0; i < 12; i++) {
        db.store.partner_profile_assets['seed-' + i] = {
          id: 'seed-' + i,
          partner_id: partnerId,
          storage_key: 'k' + i,
          public_url: 'https://blob.test/k' + i,
          title: '',
          content_type: 'image/jpeg',
          byte_size: 10,
          asset_status: 'draft',
          is_cover: i === 0,
          sort_order: i,
          created_at: new Date(Date.now() + i).toISOString()
        };
      }
      db.store.partner_profiles[partnerId].cover_asset_id = 'seed-0';
      var over = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      assert.strictEqual(over.code, 'max_assets');

      // adversarial partner-id / asset-id / storage-key
      var bogus = await assets.updateAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        assetId: '../../../etc/passwd',
        title: 'x'
      });
      assert.ok(bogus.code === 'not_found' || bogus.code === 'forbidden' || bogus.code === 'invalid_asset');
    });
  });

  await test('multi upload + failure codes (invalid mime)', async function () {
    await withAssetHarness(async function (assets, onboarding, db) {
      var partnerId = 'p-multi';
      db.store.partner_profiles[partnerId] = {
        partner_id: partnerId,
        profile_status: 'draft',
        cover_asset_id: null
      };
      var bad = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: Buffer.from('GIF89a'),
        contentType: 'image/gif'
      });
      assert.strictEqual(bad.code, 'invalid_mime');

      var a = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      var b = await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: tinyPng(),
        contentType: 'image/png'
      });
      assert.ok(a.ok && b.ok);
      assert.strictEqual(b.assets.length, 2);
    });
  });

  await test('onboarding GET includes assets; story save via draft', async function () {
    await withAssetHarness(async function (assets, onboarding, db) {
      var partnerId = 'p-get';
      db.store.partner_profiles[partnerId] = {
        partner_id: partnerId,
        profile_status: 'draft',
        cover_asset_id: null
      };
      db.store.partner_onboarding[partnerId] = {
        partner_id: partnerId,
        onboarding_status: 'in_progress',
        current_step_id: 'verhaal',
        draft: {},
        version: 1,
        started_at: new Date().toISOString()
      };
      var saved = await onboarding.saveOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        expectedVersion: 1,
        currentStepId: 'verhaal',
        draft: { story: completeStory() }
      });
      assert.ok(saved.ok, saved.code || saved.message);
      assert.ok(saved.draft.story);
      assert.ok(Array.isArray(saved.assets));

      await assets.uploadAsset({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1',
        buffer: JPEG_BUF,
        contentType: 'image/jpeg'
      });
      var got = await onboarding.getOnboarding({
        partnerId: partnerId,
        role: 'owner',
        userId: 'u1'
      });
      assert.ok(got.ok);
      assert.strictEqual(got.assets.length, 1);
      assert.ok(got.coverAssetId);
    });
  });

  await test('HTML/JS wires P5+P6; no Google; no service_role leak', function () {
    var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
    assert.ok(html.indexOf('id="p5Form"') >= 0);
    assert.ok(html.indexOf('id="portfolioFileInput"') >= 0);
    assert.ok(html.indexOf('type="file"') >= 0);
    assert.ok(html.indexOf('f_strength') >= 0);
    assert.ok(html.indexOf('f_guarantee_line') >= 0);
    assert.ok(html.indexOf('google_intent') < 0);
    assert.ok(html.indexOf('onboarding-portfolio.js') >= 0);
    // no free-form company essay
    assert.ok(html.toLowerCase().indexOf('beschrijf je bedrijf') < 0);

    var src = fs.readFileSync(path.join(root, 'js/professionals/onboarding.js'), 'utf8');
    assert.ok(src.indexOf('collectP5Draft') >= 0);
    assert.ok(src.indexOf('validateP5Complete') >= 0);
    assert.ok(src.indexOf('onboarding-asset-upload') >= 0);
    assert.ok(src.indexOf('handleIncomingFiles') >= 0);

    ['onboarding.js', 'onboarding-draft.js', 'onboarding-portfolio.js', 'core.js'].forEach(function (f) {
      var t = fs.readFileSync(path.join(root, 'js/professionals', f), 'utf8');
      assert.ok(t.indexOf('SERVICE_ROLE') < 0, f);
      assert.ok(t.indexOf('service_role') < 0, f);
      assert.ok(t.indexOf('BLOB_READ_WRITE_TOKEN') < 0, f);
    });
  });

  await test('API routes Sprint 6 actions + cover delete rule documented', function () {
    var api = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
    [
      'onboarding-assets',
      'onboarding-asset-upload',
      'onboarding-asset-update',
      'onboarding-asset-delete',
      'onboarding-assets-reorder'
    ].forEach(function (a) {
      assert.ok(api.indexOf(a) >= 0, a);
    });
    assert.ok(assetsMod.COVER_DELETE_RULE.indexOf('promote next') >= 0);
    var mig = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260816_phase_b_sprint6_assets.sql'),
      'utf8'
    );
    assert.ok(mig.indexOf('DELETE ON TABLE public.partner_profile_assets') >= 0);
  });

  await test('shell routing verhaal ↔ portfolio; draft rejects cover_asset_id', function () {
    assert.strictEqual(Shell.nextStepId('aanbod'), 'verhaal');
    assert.strictEqual(Shell.nextStepId('verhaal'), 'portfolio');
    assert.strictEqual(Shell.nextStepId('portfolio'), 'controle');
    var bad = model.validateDraftStructure({ cover_asset_id: 'x' });
    assert.ok(!bad.ok);
  });

  await test('mobile/desktop upload affordances present', function () {
    var html = fs.readFileSync(path.join(root, 'professionals/onboarding.html'), 'utf8');
    assert.ok(html.indexOf('capture="environment"') >= 0);
    assert.ok(html.indexOf('portfolioDropzone') >= 0);
    assert.ok(html.indexOf('accept="image/jpeg,image/png,image/webp"') >= 0);
    var css = fs.readFileSync(path.join(root, 'css/professionals.css'), 'utf8');
    assert.ok(css.indexOf('prof-dropzone') >= 0);
    assert.ok(css.indexOf('prof-portfolio-grid') >= 0);
  });

  console.log('');
  if (failed) {
    console.error(failed + ' Phase B Sprint 6 check(s) failed');
    process.exit(1);
  }
  console.log('All Phase B Sprint 6 offline checks passed');
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
