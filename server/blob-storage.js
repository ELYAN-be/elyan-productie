/**
 * Vercel Blob storage adapter for partner portfolio assets.
 * Token stays server-side only (BLOB_READ_WRITE_TOKEN).
 */
var crypto = require('crypto');

var ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

var MAX_BYTES = 8 * 1024 * 1024;
var MAX_ASSETS = 12;

function detectMime(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function validateImageBuffer(buf, claimedMime) {
  if (!Buffer.isBuffer(buf)) {
    return { ok: false, code: 'invalid_file', message: 'Ongeldig bestand.' };
  }
  if (buf.length === 0) {
    return { ok: false, code: 'invalid_file', message: 'Leeg bestand.' };
  }
  if (buf.length > MAX_BYTES) {
    return { ok: false, code: 'file_too_large', message: 'Foto mag max. 8 MB zijn.' };
  }
  var mime = detectMime(buf);
  if (!mime || !ALLOWED_MIME[mime]) {
    return { ok: false, code: 'invalid_mime', message: 'Alleen JPEG, PNG of WebP.' };
  }
  if (claimedMime && String(claimedMime).toLowerCase() !== mime) {
    // Trust magic bytes; reject only if claim is a known other image type mismatch
    var claim = String(claimedMime).toLowerCase();
    if (ALLOWED_MIME[claim] && claim !== mime) {
      return { ok: false, code: 'invalid_mime', message: 'Bestandstype komt niet overeen.' };
    }
  }
  return { ok: true, contentType: mime, ext: ALLOWED_MIME[mime], byteSize: buf.length };
}

/**
 * Opaque storage key — partner UUID + asset UUID + random suffix.
 * Access control is authZ on asset id / partner membership, not path secrecy alone.
 */
function buildStorageKey(partnerId, assetId, ext) {
  var salt = crypto.randomBytes(8).toString('hex');
  return (
    'elyan/partners/' +
    String(partnerId) +
    '/assets/' +
    String(assetId) +
    '-' +
    salt +
    '.' +
    ext
  );
}

function getBlobToken() {
  var t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    var err = new Error('missing_env:BLOB_READ_WRITE_TOKEN');
    err.code = 'missing_env';
    throw err;
  }
  return t;
}

async function putObject(storageKey, buf, contentType) {
  var { put } = require('@vercel/blob');
  var result = await put(storageKey, buf, {
    access: 'public',
    contentType: contentType,
    token: getBlobToken(),
    addRandomSuffix: false
  });
  return {
    storageKey: result.pathname || storageKey,
    publicUrl: result.url
  };
}

async function deleteObject(storageKeyOrUrl) {
  if (!storageKeyOrUrl) return { ok: true };
  var { del } = require('@vercel/blob');
  try {
    await del(storageKeyOrUrl, { token: getBlobToken() });
    return { ok: true };
  } catch (e) {
    console.error('blob_delete_failed', e && e.message);
    return { ok: false, error: e };
  }
}

module.exports = {
  ALLOWED_MIME,
  MAX_BYTES,
  MAX_ASSETS,
  detectMime,
  validateImageBuffer,
  buildStorageKey,
  putObject,
  deleteObject,
  getBlobToken
};
