/**
 * Send partner invite email via existing Resend infrastructure.
 */
var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

async function sendPartnerInviteEmail(opts) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt, invite e-mail niet verzonden');
    return { ok: false, queued: false, reason: 'missing_resend' };
  }

  var to = opts.to;
  var partnerName = opts.partnerName || 'ELYAN';
  var activateUrl = opts.activateUrl;
  var authActionLink = opts.authActionLink || null;

  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Uitnodiging voor ELYAN for Professionals</h1>' +
    '<p>Je bent uitgenodigd voor <strong>' + escapeHtml(partnerName) + '</strong>.</p>' +
    (authActionLink
      ? '<p><a href="' + escapeHtml(authActionLink) + '">Account activeren / wachtwoord instellen</a></p>' +
        '<p style="color:#6E7062;font-size:13px;">Nieuwe gebruikers: gebruik eerst de activatielink hierboven. Daarna kun je je lidmaatschap bevestigen.</p>'
      : '') +
    '<p><a href="' + escapeHtml(activateUrl) + '">Lidmaatschap bevestigen</a></p>' +
    '<p style="color:#6E7062;font-size:13px;">Heb je al een ELYAN-account? Log in met dit e-mailadres en open de bevestigingslink.</p>' +
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

module.exports = { sendPartnerInviteEmail };
