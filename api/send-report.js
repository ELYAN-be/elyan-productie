/* ============================================================
   ELYAN — /api/send-report
   Ontvangt calculator-antwoorden, herberekent server-side,
   genereert premium PDF en verstuurt via Resend.
   ============================================================ */

var pricing = require('./lib/pricing');
var questions = require('./lib/questions');
var buildReportPdf = require('./lib/pdf-report').buildReportPdf;

var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';
var REPLY_TO = 'elyan.info@gmail.com';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function buildEmailHtml(payload) {
  var cat = pricing.CATEGORIES[payload.type];
  var prov = pricing.PROVINCES[payload.province];
  var r = payload.result;
  var drivers = (r.drivers || []).slice(0, 3).map(function (d) {
    return '<li style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#5B5D4F;">' + escapeHtml(d.text) + '</li>';
  }).join('');

  return '' +
'<!DOCTYPE html><html lang="nl-BE"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Jouw ELYAN renovatierapport</title></head>' +
'<body style="margin:0;padding:0;background-color:#F6F4EC;font-family:Arial,Helvetica,sans-serif;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F4EC;padding:32px 16px;">' +
'<tr><td align="center">' +
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">' +

  '<tr><td style="padding:32px 32px 0;">' +
    '<span style="font-weight:bold;font-size:20px;letter-spacing:-0.5px;color:#14150F;">ELYAN</span>' +
  '</td></tr>' +

  '<tr><td style="padding:20px 32px 0;">' +
    '<h1 style="margin:0;font-size:20px;line-height:1.3;color:#14150F;">Jouw persoonlijk renovatierapport is klaar</h1>' +
    '<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#5B5D4F;">Hierbij ontvang je het volledige rapport voor jouw ' + escapeHtml(cat.resultNoun) + ' in ' + escapeHtml(prov.label) + '. Het bevat een realistische prijsvork, kostenuitsplitsing, inzichten op maat van jouw antwoorden, planningstips en concrete vervolgstappen.</p>' +
  '</td></tr>' +

  '<tr><td style="padding:24px 32px 0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#3F4A32;border-radius:14px;">' +
      '<tr><td align="center" style="padding:24px 20px;">' +
        '<p style="margin:0 0 4px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#E7E3D3;">Geschatte prijsvork</p>' +
        '<p style="margin:0;font-family:monospace;font-size:26px;font-weight:bold;color:#FFFFFF;">' + pricing.fmtEUR(r.low) + ' \u2013 ' + pricing.fmtEUR(r.high) + '</p>' +
        '<p style="margin:8px 0 0;font-size:13px;color:#EEEADA;">Richtprijs: ' + pricing.fmtEUR(r.price) + ' \u00b7 ' + r.weeksLow + '\u2013' + r.weeksHigh + ' weken</p>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  (drivers ? '<tr><td style="padding:20px 32px 0;"><p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#14150F;">Wat jouw prijs beïnvloedt</p><ul style="margin:0;padding-left:18px;">' + drivers + '</ul></td></tr>' : '') +

  '<tr><td style="padding:20px 32px 0;">' +
    '<p style="margin:0;font-size:13px;line-height:1.6;color:#5B5D4F;">Open de bijlage <strong>ELYAN-renovatierapport.pdf</strong> voor het volledige premium rapport.</p>' +
  '</td></tr>' +

  '<tr><td style="padding:24px 32px;">' +
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#6E7062;">Niets gezien? Kijk ook in je spamfolder.</p>' +
  '</td></tr>' +

  '<tr><td style="padding:20px 32px 28px;border-top:1px solid #E7E3D3;">' +
    '<p style="margin:0 0 4px;font-size:12px;color:#6E7062;">Je ontvangt deze e-mail omdat je een renovatie-inschatting hebt aangevraagd via ELYAN.</p>' +
    '<p style="margin:0;font-size:12px;color:#6E7062;">Vragen? Antwoord op deze e-mail of mail <a href="mailto:elyan.info@gmail.com" style="color:#3F4A32;">elyan.info@gmail.com</a>.</p>' +
  '</td></tr>' +

'</table></td></tr></table></body></html>';
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

  var email = (body.email || '').trim();
  var type = body.type;
  var province = body.province;
  var answers = body.answers && typeof body.answers === 'object' ? body.answers : null;
  var notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : '';

  // Legacy fallback
  if (!answers) {
    answers = {
      size: body.size,
      level: body.level,
      province: province,
      notes: notes
    };
  } else {
    if (notes && !answers.notes) answers.notes = notes;
    if (!answers.province) answers.province = province;
  }

  if (!pricing.isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!pricing.CATEGORIES[type]) {
    return res.status(400).json({ error: 'invalid_type' });
  }
  if (!pricing.PROVINCES[province]) {
    return res.status(400).json({ error: 'invalid_province' });
  }

  // Ensure core fields
  var size = Number(answers.size);
  var level = answers.level;
  if (!['basis', 'standaard', 'premium'].includes(level)) {
    return res.status(400).json({ error: 'invalid_level' });
  }
  if (!Number.isFinite(size) || size < 1 || size > 999) {
    return res.status(400).json({ error: 'invalid_size' });
  }

  var validation = questions.validateAnswers(type, answers);
  if (!validation.ok) {
    // Soft-fail for partial unknown optionals: still compute if size/level/province ok
    // Only hard-fail clearly invalid enums when present
    if (String(validation.error).indexOf('invalid_size') !== -1 || String(validation.error).indexOf('invalid_level') !== -1) {
      return res.status(400).json({ error: validation.error });
    }
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt');
    return res.status(500).json({ error: 'email_not_configured' });
  }

  var result = pricing.calcEstimate(type, province, answers);
  var cat = pricing.CATEGORIES[type];
  var prov = pricing.PROVINCES[province];
  var reportData = {
    email: email,
    type: type,
    province: province,
    size: size,
    level: level,
    notes: (answers.notes || notes || '').slice(0, 500),
    answers: answers,
    result: result
  };

  var pdfBuffer;
  try {
    pdfBuffer = await buildReportPdf(reportData);
  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: 'pdf_generation_failed' });
  }

  var html = buildEmailHtml(reportData);

  try {
    var resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        reply_to: REPLY_TO,
        subject: 'Jouw ' + cat.resultNoun + ' in ' + prov.label + ' — ' + pricing.fmtEUR(result.low) + '–' + pricing.fmtEUR(result.high),
        html: html,
        attachments: [
          {
            filename: 'ELYAN-renovatierapport.pdf',
            content: pdfBuffer.toString('base64')
          }
        ]
      })
    });

    if (!resendRes.ok) {
      var errText = await resendRes.text();
      console.error('Resend error:', resendRes.status, errText);
      return res.status(502).json({ error: 'send_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-report error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
