/**
 * Vercel Blob adapter for partner portfolio assets.
 *
 * Two-store model:
 * - Private store (BLOB_PRIVATE_READ_WRITE_TOKEN): draft originals (access: private)
 * - Public store (BLOB_READ_WRITE_TOKEN): published Marketplace derivatives only
 *
 * Tokens stay server-side. Never expose private URLs or tokens to browsers.
 *
 * METADATA NOTE (Block 2C): public derivatives are decoded with sharp, auto-oriented
 * via autoOrient(), and re-encoded with metadata stripped (EXIF/GPS/XMP/IPTC/comments
 * are not preserved on output). Private originals may retain EXIF because they are
 * access-controlled.
 *
 * CACHE NOTE: Vercel Blob public deletions may take up to ~60s to propagate.
 * Production smoke acceptance window for stale public URLs: max 90 seconds.
 */
var crypto = require('crypto');

var ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

var MAX_BYTES = 8 * 1024 * 1024;
var MAX_ASSETS = 12;
var MAX_INPUT_PIXELS = 40 * 1000 * 1000;

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
    var claim = String(claimedMime).toLowerCase();
    if (ALLOWED_MIME[claim] && claim !== mime) {
      return { ok: false, code: 'invalid_mime', message: 'Bestandstype komt niet overeen.' };
    }
  }
  return { ok: true, contentType: mime, ext: ALLOWED_MIME[mime], byteSize: buf.length };
}

/** Random non-identifying private draft key (no partner/org/user ids). */
function buildPrivateStorageKey(assetId, ext) {
  var salt = crypto.randomBytes(12).toString('hex');
  return 'elyan/drafts/' + String(assetId) + '-' + salt + '.' + ext;
}

/** Random non-identifying public derivative key. */
function buildPublicStorageKey(assetId, ext) {
  var salt = crypto.randomBytes(12).toString('hex');
  return 'elyan/live/' + String(assetId) + '-' + salt + '.' + ext;
}

/** @deprecated legacy key shape — kept for tests that still call buildStorageKey */
function buildStorageKey(partnerId, assetId, ext) {
  return buildPrivateStorageKey(assetId, ext);
}

function getPublicToken() {
  var t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    var err = new Error('missing_env:BLOB_READ_WRITE_TOKEN');
    err.code = 'missing_env';
    throw err;
  }
  return t;
}

function getPrivateToken() {
  var t = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  if (!t) {
    var err = new Error('missing_env:BLOB_PRIVATE_READ_WRITE_TOKEN');
    err.code = 'missing_env';
    throw err;
  }
  return t;
}

/**
 * Decode → auto-orient → re-encode without metadata for public Marketplace derivatives.
 * Fail closed on decode/bomb/format errors. Never preserves EXIF/GPS/XMP/IPTC/comments.
 */
async function encodePublicDerivative(buf, contentType) {
  var checked = validateImageBuffer(buf, contentType);
  if (!checked.ok) return checked;

  var sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp_unavailable', e && e.code ? e.code : 'require_failed');
    return { ok: false, code: 'upload_failed', message: 'Afbeelding kon niet worden verwerkt.' };
  }

  try {
    var pipeline = sharp(buf, {
      failOn: 'warning',
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true
    }).autoOrient();

    var outBuf;
    var outType = checked.contentType;
    if (outType === 'image/jpeg') {
      outBuf = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    } else if (outType === 'image/png') {
      outBuf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    } else if (outType === 'image/webp') {
      outBuf = await pipeline.webp({ quality: 85 }).toBuffer();
    } else {
      return { ok: false, code: 'invalid_mime', message: 'Alleen JPEG, PNG of WebP.' };
    }

    if (!outBuf || !outBuf.length) {
      return { ok: false, code: 'invalid_file', message: 'Afbeelding kon niet worden verwerkt.' };
    }
    if (outBuf.length > MAX_BYTES) {
      return { ok: false, code: 'file_too_large', message: 'Foto mag max. 8 MB zijn.' };
    }

    var outMime = detectMime(outBuf);
    if (outMime !== outType) {
      return { ok: false, code: 'invalid_file', message: 'Afbeelding kon niet worden verwerkt.' };
    }

    return {
      ok: true,
      buffer: outBuf,
      contentType: outType,
      ext: ALLOWED_MIME[outType],
      byteSize: outBuf.length
    };
  } catch (e) {
    var msg = String((e && e.message) || '');
    var code = 'invalid_file';
    if (/limitInputPixels|input image exceeds pixel limit|memory limit/i.test(msg)) {
      code = 'file_too_large';
    }
    console.error('public_derivative_encode_failed', code);
    return {
      ok: false,
      code: code,
      message:
        code === 'file_too_large'
          ? 'Afbeelding is te groot om te verwerken.'
          : 'Afbeelding kon niet worden verwerkt.'
    };
  }
}

async function putPrivateObject(storageKey, buf, contentType) {
  var { put } = require('@vercel/blob');
  var result = await put(storageKey, buf, {
    access: 'private',
    contentType: contentType,
    token: getPrivateToken(),
    addRandomSuffix: false
  });
  return {
    storageKey: result.pathname || storageKey,
    url: result.url || null
  };
}

async function putPublicObject(storageKey, buf, contentType) {
  var { put } = require('@vercel/blob');
  var result = await put(storageKey, buf, {
    access: 'public',
    contentType: contentType,
    token: getPublicToken(),
    addRandomSuffix: false
  });
  return {
    storageKey: result.pathname || storageKey,
    publicUrl: result.url
  };
}

/**
 * Read private blob bytes (server-side only).
 */
async function getPrivateBuffer(storageKeyOrUrl) {
  if (!storageKeyOrUrl) return { ok: false, code: 'not_found' };
  var { get } = require('@vercel/blob');
  var result = await get(storageKeyOrUrl, {
    access: 'private',
    token: getPrivateToken()
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { ok: false, code: 'not_found' };
  }
  var chunks = [];
  for await (var chunk of result.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  var buf = Buffer.concat(chunks);
  return {
    ok: true,
    buffer: buf,
    contentType: (result.blob && result.blob.contentType) || 'application/octet-stream'
  };
}

async function deletePrivateObject(storageKeyOrUrl) {
  if (!storageKeyOrUrl) return { ok: true };
  var { del } = require('@vercel/blob');
  try {
    await del(storageKeyOrUrl, { token: getPrivateToken() });
    return { ok: true };
  } catch (e) {
    console.error('blob_private_delete_failed', e && e.message);
    return { ok: false, error: e };
  }
}

async function deletePublicObject(storageKeyOrUrl) {
  if (!storageKeyOrUrl) return { ok: true };
  var { del } = require('@vercel/blob');
  try {
    await del(storageKeyOrUrl, { token: getPublicToken() });
    return { ok: true };
  } catch (e) {
    console.error('blob_public_delete_failed', e && e.message);
    return { ok: false, error: e };
  }
}

/** @deprecated use putPrivateObject — kept for transitional callers/tests */
async function putObject(storageKey, buf, contentType) {
  var uploaded = await putPrivateObject(storageKey, buf, contentType);
  return { storageKey: uploaded.storageKey, publicUrl: null };
}

/** @deprecated use deletePrivateObject / deletePublicObject */
async function deleteObject(storageKeyOrUrl) {
  return deletePrivateObject(storageKeyOrUrl);
}

function getBlobToken() {
  return getPublicToken();
}

module.exports = {
  ALLOWED_MIME,
  MAX_BYTES,
  MAX_ASSETS,
  MAX_INPUT_PIXELS,
  detectMime,
  validateImageBuffer,
  encodePublicDerivative,
  buildStorageKey,
  buildPrivateStorageKey,
  buildPublicStorageKey,
  putPrivateObject,
  putPublicObject,
  getPrivateBuffer,
  deletePrivateObject,
  deletePublicObject,
  putObject,
  deleteObject,
  getBlobToken,
  getPublicToken,
  getPrivateToken
};
