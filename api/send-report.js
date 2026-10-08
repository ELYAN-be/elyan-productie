/* ============================================================
   ELYAN. /api/send-report
   Ontvangt calculator-antwoorden, herberekent server-side,
   genereert premium PDF en verstuurt via Resend.
   ============================================================ */

var pricing = require('./lib/pricing');
var questions = require('./lib/questions');
var buildReportPdf = require('./lib/pdf-report').buildReportPdf;
var featureFlags = require('../shared/feature-flags');
var { rateLimit, clientKey } = require('../server/rate-limit');
var { incrementAnalyticsEvent } = require('../server/analytics');

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

  return '' +
'<!DOCTYPE html><html lang="nl-BE"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ELYAN renovatierapport</title></head>' +
'<body style="margin:0;padding:0;background-color:#F7F5EF;font-family:Georgia,\'Times New Roman\',serif;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5EF;padding:40px 16px;">' +
'<tr><td align="center">' +
'<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border:1px solid #E8E4D8;">' +

  '<tr><td style="padding:40px 40px 0;">' +
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:12px;letter-spacing:0.14em;color:#14150F;">ELYAN</p>' +
  '</td></tr>' +

  '<tr><td style="padding:28px 40px 0;">' +
    '<h1 style="margin:0;font-family:Georgia,\'Times New Roman\',serif;font-size:24px;line-height:1.3;font-weight:normal;color:#14150F;">Jouw persoonlijk renovatierapport is klaar</h1>' +
    '<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#5B5D4F;">We hebben je projectgegevens verwerkt tot een persoonlijke renovatieanalyse voor jouw ' +
      escapeHtml(cat.resultNoun) + ' in ' + escapeHtml(prov.label) + '.</p>' +
  '</td></tr>' +

  '<tr><td style="padding:28px 40px 0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8E4D8;border-bottom:1px solid #E8E4D8;">' +
      '<tr><td style="padding:22px 0 8px;">' +
        '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;color:#6E7062;">Indicatieve investering</p>' +
        '<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.35;color:#14150F;">' +
          pricing.fmtEUR(r.low) + ' – ' + pricing.fmtEUR(r.high) + '</p>' +
      '</td></tr>' +
      '<tr><td style="padding:8px 0;">' +
        '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;color:#6E7062;">Richtprijs</p>' +
        '<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;line-height:1.3;color:#14150F;">' +
          pricing.fmtEUR(r.price) + ' excl. btw</p>' +
      '</td></tr>' +
      '<tr><td style="padding:8px 0 22px;">' +
        '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;color:#6E7062;">Indicatieve uitvoeringsduur</p>' +
        '<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.35;color:#14150F;">' +
          r.weeksLow + '–' + r.weeksHigh + ' weken</p>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  '<tr><td style="padding:28px 40px 0;">' +
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#5B5D4F;">Je volledige analyse vind je in de PDF-bijlage <strong style="color:#14150F;">ELYAN-renovatierapport.pdf</strong>.</p>' +
  '</td></tr>' +

  '<tr><td style="padding:32px 40px 40px;">' +
    '<div style="height:1px;background-color:#E8E4D8;line-height:1px;font-size:1px;">&nbsp;</div>' +
    '<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6E7062;">Vragen over je rapport?</p>' +
    '<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6E7062;">Antwoord op deze e-mail of mail <a href="mailto:elyan.info@gmail.com" style="color:#2C3423;text-decoration:underline;">elyan.info@gmail.com</a>.</p>' +
  '</td></tr>' +

'</table></td></tr></table></body></html>';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  /* Launch: PDF report generation/email disabled — code retained for later. */
  if (!featureFlags.PUBLIC_PDF_REPORTS_ENABLED) {
    return res.status(503).json({ error: 'report_disabled' });
  }

  var rl = rateLimit(clientKey(req, 'send_report'), 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return res.status(429).json({ error: 'rate_limited' });
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
        subject: 'ELYAN | Jouw persoonlijk renovatierapport is klaar',
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
      console.error('send_report_failed', { action: 'send-report', code: 'send_failed', status: resendRes.status });
      return res.status(502).json({ error: 'send_failed' });
    }

    incrementAnalyticsEvent({ event: 'report_requested', calculator: 'calc1' });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send_report_failed', { action: 'send-report', code: 'server_error', message: err && err.message ? err.message : 'error' });
    return res.status(500).json({ error: 'server_error' });
  }
};

module.exports.buildEmailHtml = buildEmailHtml;
