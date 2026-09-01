'use strict';

var { mapSpecialtyToCategory, isSupportedCategory } = require('./categories');

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

/** Belgian enterprise number format check only — NOT official KBO verification. */
function validateKboFormat(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return { ok: false, code: 'missing' };
  if (digits.length === 9) digits = '0' + digits;
  if (digits.length !== 10) return { ok: false, code: 'invalid_format' };
  var base = parseInt(digits.slice(0, 8), 10);
  var check = parseInt(digits.slice(8, 10), 10);
  if (97 - (base % 97) !== check) return { ok: false, code: 'invalid_checksum' };
  return { ok: true, normalized: digits };
}

/**
 * Deterministic screening — no AI trust decisions.
 * @returns {{ verdict: 'READY'|'REVIEW_REQUIRED'|'BLOCKED', issues: Array }}
 */
function runScreening(input, opts) {
  opts = opts || {};
  var issues = [];
  var companyName = String(input.companyName || '').trim();
  var contactName = String(input.contactName || '').trim();
  var email = String(input.email || '').trim().toLowerCase();
  var phone = String(input.phone || '').trim();
  var specialty = String(input.specialty || '').trim();
  var region = String(input.region || '').trim();
  var consent = !!input.consent;
  var kbo = input.enterpriseNumber || input.kbo || input.companyNumber || null;
  var categoryId = input.categoryId || mapSpecialtyToCategory(specialty);

  if (!companyName) {
    issues.push({ level: 'blocking', code: 'missing_company_name', message: 'Bedrijfsnaam ontbreekt.' });
  }
  if (!contactName) {
    issues.push({ level: 'blocking', code: 'missing_contact', message: 'Contactpersoon ontbreekt.' });
  }
  if (!email || !isValidEmail(email)) {
    issues.push({ level: 'blocking', code: 'invalid_email', message: 'Ongeldig e-mailadres.' });
  }
  if (!phone) {
    issues.push({ level: 'review', code: 'missing_phone', message: 'Telefoonnummer ontbreekt.' });
  }
  if (!region) {
    issues.push({ level: 'blocking', code: 'missing_region', message: 'Werkgebied ontbreekt.' });
  }
  if (!consent) {
    issues.push({ level: 'blocking', code: 'missing_consent', message: 'Toestemming ontbreekt.' });
  }
  if (!specialty) {
    issues.push({ level: 'blocking', code: 'missing_specialty', message: 'Specialisatie ontbreekt.' });
  } else if (!categoryId || !isSupportedCategory(categoryId)) {
    if (specialty === 'algemeen' || specialty === 'andere') {
      issues.push({
        level: 'review',
        code: 'unsupported_category',
        message: 'Categorie vereist handmatige beoordeling.'
      });
    } else {
      issues.push({
        level: 'blocking',
        code: 'unsupported_category',
        message: 'Categorie wordt niet ondersteund door ELYAN.'
      });
    }
  }
  if (kbo) {
    var kboCheck = validateKboFormat(kbo);
    if (!kboCheck.ok) {
      issues.push({
        level: 'blocking',
        code: 'invalid_company_number',
        message: 'Ondernemingsnummer heeft een ongeldig formaat.'
      });
    }
  } else {
    issues.push({
      level: 'review',
      code: 'company_verification_required',
      message: 'Bedrijfscontrole vereist — geen ondernemingsnummer.'
    });
  }

  if (!opts.skipDuplicateCheck && opts.duplicateCandidate) {
    issues.push({
      level: 'review',
      code: 'possible_duplicate',
      message: 'Mogelijk duplicaat van bestaande partnerkandidaat.'
    });
  }

  var blocking = issues.filter(function (i) { return i.level === 'blocking'; });
  var review = issues.filter(function (i) { return i.level === 'review'; });

  var verdict = 'READY';
  if (blocking.length) verdict = 'BLOCKED';
  else if (review.length) verdict = 'REVIEW_REQUIRED';

  return {
    verdict: verdict,
    issues: issues,
    categoryId: categoryId || null
  };
}

function statusFromVerdict(verdict) {
  if (verdict === 'BLOCKED') return 'blocked';
  if (verdict === 'REVIEW_REQUIRED') return 'review_required';
  return 'invited';
}

module.exports = {
  runScreening: runScreening,
  statusFromVerdict: statusFromVerdict,
  validateKboFormat: validateKboFormat,
  isValidEmail: isValidEmail
};
