/**
 * Phase B Sprint 6 — client portfolio helpers (compress + file checks).
 * Browser script tag + Node require for offline tests.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanOnboardingPortfolio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ALLOWED = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true
  };
  var MAX_SOURCE = 8 * 1024 * 1024;
  var TARGET_BYTES = Math.floor(1.5 * 1024 * 1024);
  var MAX_EDGE = 1920;

  function validateSourceFile(file) {
    if (!file) return { ok: false, code: 'invalid_file', message: 'Geen bestand.' };
    var type = String(file.type || '').toLowerCase();
    if (!ALLOWED[type]) {
      return { ok: false, code: 'invalid_mime', message: 'Alleen JPEG, PNG of WebP.' };
    }
    if (file.size > MAX_SOURCE) {
      return { ok: false, code: 'file_too_large', message: 'Foto mag max. 8 MB zijn.' };
    }
    return { ok: true, contentType: type };
  }

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('read_failed')); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image_decode_failed')); };
      img.src = src;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) { resolve(blob); }, type, quality);
        return;
      }
      var dataUrl = canvas.toDataURL(type, quality);
      var bin = atob(dataUrl.split(',')[1] || '');
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type: type }));
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(new Error('encode_failed')); };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Compress when safe/useful. Falls back to original if canvas unavailable
   * or result would be larger than source (and source already under target).
   */
  async function compressImageFile(file, onProgress) {
    var checked = validateSourceFile(file);
    if (!checked.ok) return checked;
    if (typeof onProgress === 'function') onProgress(0.05);

    if (typeof document === 'undefined' || !document.createElement) {
      var b64Fallback = await blobToBase64(file);
      return {
        ok: true,
        dataBase64: b64Fallback,
        contentType: checked.contentType,
        byteSize: file.size,
        compressed: false
      };
    }

    try {
      var dataUrl = await readAsDataURL(file);
      if (typeof onProgress === 'function') onProgress(0.2);
      var img = await loadImage(dataUrl);
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      var tw = Math.max(1, Math.round(w * scale));
      var th = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      var ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no_canvas');
      ctx.drawImage(img, 0, 0, tw, th);
      if (typeof onProgress === 'function') onProgress(0.45);

      var outType = checked.contentType === 'image/png' ? 'image/png' : 'image/jpeg';
      var quality = 0.86;
      var blob = await canvasToBlob(canvas, outType, quality);
      while (blob && blob.size > TARGET_BYTES && quality > 0.55 && outType === 'image/jpeg') {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, outType, quality);
      }
      if (typeof onProgress === 'function') onProgress(0.7);

      if (!blob || (blob.size >= file.size && file.size <= TARGET_BYTES)) {
        var rawB64 = await blobToBase64(file);
        if (typeof onProgress === 'function') onProgress(1);
        return {
          ok: true,
          dataBase64: rawB64,
          contentType: checked.contentType,
          byteSize: file.size,
          compressed: false
        };
      }

      var b64 = await blobToBase64(blob);
      if (typeof onProgress === 'function') onProgress(1);
      return {
        ok: true,
        dataBase64: b64,
        contentType: outType,
        byteSize: blob.size,
        compressed: true
      };
    } catch (e) {
      var raw = await blobToBase64(file);
      return {
        ok: true,
        dataBase64: raw,
        contentType: checked.contentType,
        byteSize: file.size,
        compressed: false
      };
    }
  }

  return {
    ALLOWED: ALLOWED,
    MAX_SOURCE: MAX_SOURCE,
    TARGET_BYTES: TARGET_BYTES,
    validateSourceFile: validateSourceFile,
    compressImageFile: compressImageFile,
    blobToBase64: blobToBase64
  };
});
