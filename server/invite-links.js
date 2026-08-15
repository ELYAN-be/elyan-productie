/**
 * Pure invite URL + email HTML builders (testable, no I/O).
 */
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function buildActivateUrl(appUrl, elyanInviteToken) {
  var base = String(appUrl || '').replace(/\/$/, '');
  return base + '/professionals/activate?token=' + encodeURIComponent(elyanInviteToken);
}

/**
 * Password-setup URL for NEW users.
 * IMPORTANT: do NOT embed /professionals/activate in `next=` — email clients and
 * link scanners often collapse that nested path and open activate instead.
 * Use opaque invite_token; the reset-password page builds the activate URL after
 * a successful updateUser({ password }).
 */
function buildPasswordSetupUrl(appUrl, hashedToken, elyanInviteToken) {
  var base = String(appUrl || '').replace(/\/$/, '');
  var setup = new URL(base + '/professionals/reset-password');
  setup.searchParams.set('token_hash', String(hashedToken || ''));
  setup.searchParams.set('type', 'invite');
  setup.searchParams.set('invite_token', String(elyanInviteToken || ''));
  return setup.toString();
}

function isPasswordSetupUrl(url) {
  try {
    var u = new URL(String(url || ''));
    if (u.pathname !== '/professionals/reset-password') return false;
    if (!u.searchParams.get('token_hash')) return false;
    if (u.searchParams.get('type') !== 'invite') return false;
    if (!u.searchParams.get('invite_token')) return false;
    // Must not look like an activate deep-link in the path.
    if (u.pathname.indexOf('/professionals/activate') >= 0) return false;
    // Reject legacy next=activate embeddings that email clients mis-follow.
    var next = u.searchParams.get('next') || '';
    if (next.indexOf('/professionals/activate') >= 0) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function isActivateUrl(url) {
  try {
    var u = new URL(String(url || ''));
    return u.pathname === '/professionals/activate' && !!u.searchParams.get('token');
  } catch (e) {
    return false;
  }
}

function buildInviteEmailHtml(opts) {
  var partnerName = opts.partnerName || 'ELYAN';
  var passwordSetupUrl = opts.passwordSetupUrl;
  var activateUrl = opts.activateUrl;
  if (!isPasswordSetupUrl(passwordSetupUrl)) {
    var err = new Error('invalid_password_setup_url');
    err.code = 'invalid_password_setup_url';
    throw err;
  }
  if (!isActivateUrl(activateUrl)) {
    var err2 = new Error('invalid_activate_url');
    err2.code = 'invalid_activate_url';
    throw err2;
  }
  return (
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,Helvetica,sans-serif;color:#14150F;">' +
    '<h1 style="font-size:18px;">Uitnodiging voor ELYAN for Professionals</h1>' +
    '<p>Je bent uitgenodigd voor <strong>' + escapeHtml(partnerName) + '</strong>.</p>' +
    '<p><a id="cta-password" href="' + escapeHtml(passwordSetupUrl) + '">Wachtwoord instellen</a></p>' +
    '<p style="color:#6E7062;font-size:13px;">Nieuwe gebruikers: stel eerst je wachtwoord in via de link hierboven. Daarna bevestig je je lidmaatschap.</p>' +
    '<p><a id="cta-membership" href="' + escapeHtml(activateUrl) + '">Lidmaatschap bevestigen</a></p>' +
    '<p style="color:#6E7062;font-size:13px;">Heb je al een ELYAN-account? Log in met dit e-mailadres en open de bevestigingslink.</p>' +
    '</body></html>'
  );
}

function extractInviteEmailHrefs(html) {
  var password = null;
  var membership = null;
  var m1 = String(html || '').match(/id="cta-password"\s+href="([^"]+)"/);
  var m2 = String(html || '').match(/id="cta-membership"\s+href="([^"]+)"/);
  if (m1) password = m1[1].replace(/&amp;/g, '&');
  if (m2) membership = m2[1].replace(/&amp;/g, '&');
  return { passwordSetupUrl: password, activateUrl: membership };
}

/**
 * Post-password redirect resolution for reset-password page.
 * verifyOtp must NEVER navigate; only successful password update may.
 */
function resolvePasswordSetupRedirect(opts) {
  if (!opts || !opts.passwordUpdated) return null;
  var inviteToken = opts.inviteToken || '';
  if (inviteToken && /^[A-Za-z0-9_-]+$/.test(inviteToken)) {
    return '/professionals/activate?token=' + encodeURIComponent(inviteToken);
  }
  var next = opts.next || '';
  if (next && next.charAt(0) === '/' && next.charAt(1) !== '/') {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next) || next.indexOf('\\') >= 0) return null;
    // Never auto-follow legacy next=activate from URL without passwordUpdated (already gated).
    return next;
  }
  return '/professionals/login';
}

module.exports = {
  escapeHtml,
  buildActivateUrl,
  buildPasswordSetupUrl,
  isPasswordSetupUrl,
  isActivateUrl,
  buildInviteEmailHtml,
  extractInviteEmailHrefs,
  resolvePasswordSetupRedirect
};
