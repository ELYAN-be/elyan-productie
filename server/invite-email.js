/**
 * Send partner invite email via existing Resend infrastructure.
 */
var {
  buildInviteEmailHtml,
  isPasswordSetupUrl,
  isActivateUrl
} = require('./invite-links');

var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';

async function sendPartnerInviteEmail(opts) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt, invite e-mail niet verzonden');
    return { ok: false, queued: false, reason: 'missing_resend' };
  }

  var to = opts.to;
  var partnerName = opts.partnerName || 'ELYAN';
  var activateUrl = opts.activateUrl;
  var passwordSetupUrl = opts.passwordSetupUrl || opts.authActionLink || null;

  if (!passwordSetupUrl || !isPasswordSetupUrl(passwordSetupUrl)) {
    console.error('invite_email_invalid_password_setup_url', passwordSetupUrl || null);
    return { ok: false, queued: false, reason: 'invalid_password_setup_url' };
  }
  if (!activateUrl || !isActivateUrl(activateUrl)) {
    console.error('invite_email_missing_activate_url');
    return { ok: false, queued: false, reason: 'missing_activate_url' };
  }

  var html;
  try {
    html = buildInviteEmailHtml({
      partnerName: partnerName,
      passwordSetupUrl: passwordSetupUrl,
      activateUrl: activateUrl
    });
  } catch (e) {
    console.error('invite_email_html_failed', e && e.code);
    return { ok: false, queued: false, reason: e && e.code ? e.code : 'html_failed' };
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
        to: [to],
        subject: 'Uitnodiging: ELYAN for Professionals — ' + partnerName,
        html: html
      })
    });
    if (!resp.ok) {
      var errText = await resp.text();
      console.error('Resend invite error', resp.status, errText);
      return { ok: false, queued: false, reason: 'email_failed' };
    }
    return { ok: true, queued: true };
  } catch (err) {
    console.error('invite_email_exception', err);
    return { ok: false, queued: false, reason: 'server_error' };
  }
}

module.exports = { sendPartnerInviteEmail, isPasswordSetupUrl, isActivateUrl };
