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
 *
 * Opaque path with ONLY the Elyan invite token (no Supabase OTP / hashed_token).
 * Password is set server-side via service role so:
 * - email link scanners cannot consume a one-time Auth OTP
 * - opening the form does not invalidate the link
 * - submit succeeds iff the backend password update succeeds
 *
 * Shape: /professionals/set-password/<elyan_invite_token>
 *
 * Legacy (still decoded by the page): base64url(token_hash + "\\n" + invite_token)
 */
function encodePasswordSetupPayload(elyanInviteToken) {
  // Token is already base64url from generateRawToken(); path-safe as-is.
  return String(elyanInviteToken || '');
}

function decodePasswordSetupPayload(encoded) {
  var seg = String(encoded || '');
  if (!seg) return null;

  // New format: segment is the raw Elyan invite token.
  if (/^[A-Za-z0-9_-]+$/.test(seg) && seg.indexOf('.') < 0) {
    // Heuristic: legacy payloads are longer base64 blobs that decode to hash\ninvite.
    // Try legacy decode first when segment looks like padded base64 of two parts.
    try {
      var s = seg.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var raw;
      if (typeof Buffer !== 'undefined') {
        raw = Buffer.from(s, 'base64').toString('utf8');
      } else if (typeof atob === 'function') {
        raw = decodeURIComponent(escape(atob(s)));
      } else {
        raw = '';
      }
      var i = raw.indexOf('\n');
      if (i >= 1) {
        var tokenHash = raw.slice(0, i);
        var inviteToken = raw.slice(i + 1);
        if (tokenHash && inviteToken && /^[A-Za-z0-9_-]+$/.test(inviteToken)) {
          return {
            tokenHash: tokenHash,
            inviteToken: inviteToken,
            type: 'invite',
            legacy: true
          };
        }
      }
    } catch (e) {
      /* fall through to new format */
    }
  }

  if (!/^[A-Za-z0-9_-]+$/.test(seg) || seg.length < 16) return null;
  return { tokenHash: '', inviteToken: seg, type: 'invite', legacy: false };
}

function buildPasswordSetupUrl(appUrl, elyanInviteToken) {
  var base = String(appUrl || '').replace(/\/$/, '');
  var payload = encodePasswordSetupPayload(elyanInviteToken);
  return base + '/professionals/set-password/' + payload;
}

function isPasswordSetupUrl(url) {
  try {
    var u = new URL(String(url || ''));
    if (String(url).indexOf('/professionals/activate') >= 0) return false;
    if (/^\/professionals\/set-password\/[A-Za-z0-9_-]+$/.test(u.pathname)) {
      return !!decodePasswordSetupPayload(u.pathname.split('/').pop());
    }
    // Legacy query form still accepted by the page for old emails in flight.
    if (u.pathname === '/professionals/reset-password') {
      if (u.searchParams.get('invite_token')) return true;
      if (!u.searchParams.get('token_hash')) return false;
      if (u.searchParams.get('type') !== 'invite') return false;
      if (!u.searchParams.get('invite_token') && !u.searchParams.get('next')) return false;
      if ((u.searchParams.get('next') || '').indexOf('/professionals/activate') >= 0) return false;
      return true;
    }
    return false;
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
    '<p style="color:#6E7062;font-size:13px;">Nieuwe gebruikers: open eerst alleen “Wachtwoord instellen”. Daarna bevestig je je lidmaatschap.</p>' +
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
 * Password must already be persisted server-side / updateUser before calling.
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
    return next;
  }
  return '/professionals/login';
}

module.exports = {
  escapeHtml,
  buildActivateUrl,
  buildPasswordSetupUrl,
  encodePasswordSetupPayload,
  decodePasswordSetupPayload,
  isPasswordSetupUrl,
  isActivateUrl,
  buildInviteEmailHtml,
  extractInviteEmailHrefs,
  resolvePasswordSetupRedirect
};
