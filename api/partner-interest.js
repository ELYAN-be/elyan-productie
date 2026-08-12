/* ============================================================
   ELYAN — /api/partner-interest
   Ontvangt Founding Partner-interesse en mailt intern via Resend.
   Geen account, geen login, geen betaling.
   ============================================================ */

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  var companyName = clean(body.companyName, 120);
  var contactName = clean(body.contactName, 80);
  var email = clean(body.email, 120);
  var phone = clean(body.phone, 40);
  var website = clean(body.website, 160);
  var specialty = clean(body.specialty, 80);
  var region = clean(body.region, 80);
  var message = clean(body.message, 800);
  var consent = !!body.consent;

  if (!companyName || !contactName || !specialty || !region || !consent) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt — partner interest gelogd');
    console.log('[partner-interest]', JSON.stringify({
      companyName: companyName,
      contactName: contactName,
      email: email,
      phone: phone,
      website: website,
      specialty: specialty,
      region: region,
      message: message
    }));
    // Accept so the UX confirmation can proceed in local/dev.
    return res.status(200).json({ ok: true, queued: false });
  }

  var html = '' +
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Nieuwe Founding Partner-interesse</h1>' +
    '<table style="border-collapse:collapse;width:100%;max-width:560px;font-size:14px;">' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Bedrijf</td><td style="padding:6px 0;"><strong>' + escapeHtml(companyName) + '</strong></td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Contact</td><td style="padding:6px 0;">' + escapeHtml(contactName) + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">E-mail</td><td style="padding:6px 0;"><a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + '</a></td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Telefoon</td><td style="padding:6px 0;">' + escapeHtml(phone || '—') + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Website</td><td style="padding:6px 0;">' + escapeHtml(website || '—') + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Specialisatie</td><td style="padding:6px 0;">' + escapeHtml(specialty) + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#6E7062;">Werkgebied</td><td style="padding:6px 0;">' + escapeHtml(region) + '</td></tr>' +
    '</table>' +
    (message
      ? '<p style="margin:16px 0 6px;color:#6E7062;">Bericht</p><p style="margin:0;white-space:pre-wrap;">' + escapeHtml(message) + '</p>'
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
        reply_to: email,
        subject: 'Founding Partner-interesse: ' + companyName,
        html: html
      })
    });

    if (!resp.ok) {
      var errText = await resp.text();
      console.error('Resend partner-interest error', resp.status, errText);
      return res.status(502).json({ error: 'email_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('partner-interest exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
