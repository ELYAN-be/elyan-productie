'use strict';

var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

async function sendResendEmail(opts) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt, e-mail niet verzonden:', opts.subject);
    return { ok: false, queued: false, reason: 'missing_resend' };
  }
  try {
    var resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html
      })
    });
    if (!resp.ok) {
      var errText = await resp.text();
      console.error('Resend error', resp.status, errText);
      return { ok: false, queued: false, reason: 'email_failed' };
    }
    return { ok: true, queued: true };
  } catch (err) {
    console.error('email_exception', err);
    return { ok: false, queued: false, reason: 'server_error' };
  }
}

async function sendInterestReceivedEmail(opts) {
  var companyName = opts.companyName || 'je bedrijf';
  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">We hebben je aanvraag ontvangen</h1>' +
    '<p>We hebben je aanvraag voor <strong>' + escapeHtml(companyName) + '</strong> ontvangen.</p>' +
    '<p>We controleren je gegevens en sturen je per e-mail de volgende stap om je ELYAN-profiel aan te vullen.</p>' +
    '<p style="font-size:13px;color:#6E7062;">Je hoeft nu niets meer te doen.</p>' +
  '</body></html>';
  return sendResendEmail({
    to: opts.to,
    subject: 'ELYAN — aanvraag ontvangen',
    html: html
  });
}

async function sendContinueProfileEmail(opts) {
  var companyName = opts.companyName || 'je bedrijf';
  var ctaUrl = opts.passwordSetupUrl || opts.activateUrl;
  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Vervolledig je ELYAN-profiel</h1>' +
    '<p>Je kunt je bedrijfsprofiel nu verder aanvullen voor <strong>' + escapeHtml(companyName) + '</strong>.</p>' +
    '<p>We begeleiden je stap voor stap door je werkzaamheden, werkgebied, beschikbaarheid en profielinformatie.</p>' +
    '<p style="margin:24px 0;"><a href="' + escapeHtml(ctaUrl) + '" style="display:inline-block;background:#3F4A32;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">Vervolledig je profiel →</a></p>' +
    '<p style="font-size:13px;color:#6E7062;">Deze link is persoonlijk. Deel hem niet met anderen.</p>' +
  '</body></html>';
  return sendResendEmail({
    to: opts.to,
    subject: 'ELYAN — vervolledig je ELYAN-profiel',
    html: html
  });
}

async function sendProfilePublishedEmail(opts) {
  var companyName = opts.companyName || 'je bedrijf';
  var profileUrl = opts.profileUrl || 'https://www.elyan.be/vakmannen';
  var dashboardUrl = opts.dashboardUrl || profileUrl;
  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Je ELYAN-profiel staat live</h1>' +
    '<p>Het profiel van <strong>' + escapeHtml(companyName) + '</strong> staat nu op ELYAN.</p>' +
    '<p style="margin:24px 0;"><a href="' + escapeHtml(profileUrl) + '" style="display:inline-block;background:#3F4A32;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">Bekijk mijn profiel →</a></p>' +
    '<p style="margin:16px 0;"><a href="' + escapeHtml(dashboardUrl) + '" style="color:#3F4A32;">Naar aanvragen →</a></p>' +
  '</body></html>';
  return sendResendEmail({
    to: opts.to,
    subject: 'ELYAN — profiel gepubliceerd',
    html: html
  });
}

async function sendNewRequestEmail(opts) {
  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Nieuwe ELYAN-aanvraag</h1>' +
    '<p>Er staat een nieuwe renovatieaanvraag voor je klaar op ELYAN.</p>' +
    '<p><strong>' + escapeHtml(opts.title || 'Renovatieaanvraag') + '</strong></p>' +
    '<p style="margin:24px 0;"><a href="' + escapeHtml(opts.requestUrl) + '" style="display:inline-block;background:#3F4A32;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">Bekijk aanvraag →</a></p>' +
  '</body></html>';
  return sendResendEmail({
    to: opts.to,
    subject: 'ELYAN — nieuwe aanvraag',
    html: html
  });
}

module.exports = {
  sendInterestReceivedEmail: sendInterestReceivedEmail,
  sendContinueProfileEmail: sendContinueProfileEmail,
  sendProfilePublishedEmail: sendProfilePublishedEmail,
  sendNewRequestEmail: sendNewRequestEmail
};
