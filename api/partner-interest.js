/* ============================================================
   ELYAN. /api/partner-interest
   Founding Partner interest → persist + screen + invite pipeline.
   ============================================================ */

var { rateLimit, clientKey } = require('../server/rate-limit');
var {
  upsertInterestCandidate,
  findCandidateByEmail,
  recordAutopilotEvent
} = require('../server/partner-autopilot/store');
var { runScreening } = require('../server/partner-autopilot/screening');
var { mapSpecialtyToCategory } = require('../server/partner-autopilot/categories');
var { processScreeningOutcome, sendInterestReceivedEmail } = require('../server/partner-autopilot/provision');

var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';
var TO_ADDRESS = 'elyan.info@gmail.com';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

function clean(str, max) {
  return String(str || '').trim().slice(0, max || 200);
}

async function sendInternalNotification(payload) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[partner-interest]', JSON.stringify(payload));
    return { ok: false, queued: false };
  }
  var html = '' +
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Nieuwe Founding Partner-interesse</h1>' +
    '<table style="border-collapse:collapse;width:100%;max-width:560px;font-size:14px;">' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Bedrijf</td><td style="padding:6px 0;"><strong>' + escapeHtml(payload.companyName) + '</strong></td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Contact</td><td style="padding:6px 0;">' + escapeHtml(payload.contactName) + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">E-mail</td><td style="padding:6px 0;"><a href="mailto:' + escapeHtml(payload.email) + '">' + escapeHtml(payload.email) + '</a></td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Telefoon</td><td style="padding:6px 0;">' + escapeHtml(payload.phone || '-') + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Website</td><td style="padding:6px 0;">' + escapeHtml(payload.website || '-') + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Specialisatie</td><td style="padding:6px 0;">' + escapeHtml(payload.specialty) + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Werkgebied</td><td style="padding:6px 0;">' + escapeHtml(payload.region) + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Status</td><td style="padding:6px 0;">' + escapeHtml(payload.autopilotStatus || '—') + '</td></tr>' +
    '</table>' +
    (payload.message
      ? '<p style="margin:16px 0 6px;color:#6E7062;">Bericht</p><p style="margin:0;white-space:pre-wrap;">' + escapeHtml(payload.message) + '</p>'
      : '') +
    '</body></html>';

  try {
    var resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        reply_to: payload.email,
        subject: 'Founding Partner-interesse: ' + payload.companyName,
        html: html
      })
    });
    if (!resp.ok) {
      var errText = await resp.text();
      console.error('Resend partner-interest error', resp.status, errText);
      return { ok: false, queued: false };
    }
    return { ok: true, queued: true };
  } catch (err) {
    console.error('partner-interest exception', err && err.message ? err.message : 'error');
    return { ok: false, queued: false };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  var rl = rateLimit(clientKey(req, 'partner_interest'), 8, 10 * 60 * 1000);
  if (!rl.ok) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var honeypot = clean(body.url || body.fax || body.hp_company, 200);
  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  var companyName = clean(body.companyName, 120);
  var contactName = clean(body.contactName, 80);
  var email = clean(body.email, 120).toLowerCase();
  var phone = clean(body.phone, 40);
  var website = clean(body.website, 160);
  var specialty = clean(body.specialty, 80);
  var region = clean(body.region, 80);
  var message = clean(body.message, 800);
  var consent = !!body.consent;
  var enterpriseNumber = clean(body.enterpriseNumber || body.kbo || body.companyNumber, 20);

  if (!companyName || !contactName || !specialty || !region || !consent) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  var existingLookup = await findCandidateByEmail(email);
  if (!existingLookup.ok && existingLookup.code === 'migration_needed') {
    /* continue without DB in dev */
  }

  var duplicateCandidate = !!(existingLookup.ok && existingLookup.candidate);
  var categoryId = mapSpecialtyToCategory(specialty);
  var screening = runScreening({
    companyName: companyName,
    contactName: contactName,
    email: email,
    phone: phone,
    specialty: specialty,
    region: region,
    consent: consent,
    enterpriseNumber: enterpriseNumber,
    categoryId: categoryId
  }, { duplicateCandidate: duplicateCandidate });

  var persisted = null;
  if (existingLookup.ok) {
    persisted = await upsertInterestCandidate({
      companyName: companyName,
      contactName: contactName,
      email: email,
      phone: phone,
      website: website,
      specialty: specialty,
      region: region,
      message: message,
      consentAt: new Date().toISOString(),
      categoryId: screening.categoryId,
      autopilotStatus: 'screening',
      screeningResult: screening
    });
  }

  var pipeline = null;
  if (persisted && persisted.ok && persisted.candidate) {
    await recordAutopilotEvent({
      candidateId: persisted.candidate.id,
      eventType: persisted.created ? 'interest_created' : 'interest_updated',
      payload: { screening: screening },
      req: req
    });
    pipeline = await processScreeningOutcome(persisted.candidate, screening, { req: req });
  }

  await sendInterestReceivedEmail({ to: email, companyName: companyName });
  await sendInternalNotification({
    companyName: companyName,
    contactName: contactName,
    email: email,
    phone: phone,
    website: website,
    specialty: specialty,
    region: region,
    message: message,
    autopilotStatus: pipeline && pipeline.candidate ? pipeline.candidate.autopilotStatus : screening.verdict
  });

  return res.status(200).json({
    ok: true,
    duplicate: !persisted || !persisted.created,
    screening: screening.verdict
  });
};
