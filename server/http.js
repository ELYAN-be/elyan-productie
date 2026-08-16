/**
 * HTTP helpers for Professionals APIs
 */
function setCors(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function json(res, status, body) {
  setCors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string') {
      try { resolve(JSON.parse(req.body)); } catch (e) { resolve({}); }
      return;
    }
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
  });
}

function methodNotAllowed(res, allow) {
  res.setHeader('Allow', allow);
  return json(res, 405, { error: 'method_not_allowed', message: 'Methode niet toegestaan.' });
}

var USER_MESSAGES = {
  missing_token: 'Je bent niet aangemeld. Log opnieuw in.',
  invalid_token: 'Je sessie is verlopen. Log opnieuw in.',
  unauthorized: 'Je bent niet aangemeld. Log opnieuw in.',
  forbidden: 'Je hebt geen toegang tot deze actie.',
  no_membership: 'Er is geen actief partnerlidmaatschap gekoppeld aan dit account.',
  partner_suspended: 'Dit partneraccount is geschorst. Neem contact op met ELYAN.',
  partner_closed: 'Dit partneraccount is afgesloten.',
  member_disabled: 'Je lidmaatschap is uitgeschakeld. Neem contact op met ELYAN.',
  invite_invalid: 'Deze uitnodiging is ongeldig.',
  invite_expired: 'Deze uitnodiging is verlopen.',
  invite_used: 'Deze uitnodiging is al gebruikt.',
  invite_revoked: 'Deze uitnodiging is ingetrokken.',
  invite_email_mismatch: 'Deze uitnodiging hoort bij een ander e-mailadres. Log in met het uitgenodigde adres.',
  invite_partner_inactive: 'Deze partner kan momenteel geen nieuwe leden activeren.',
  rate_limited: 'Te veel pogingen. Probeer het zo opnieuw.',
  missing_fields: 'Vul alle verplichte velden in.',
  invalid_email: 'Ongeldig e-mailadres.',
  password_too_weak: 'Kies een wachtwoord van minstens 8 tekens.',
  server_error: 'Er ging iets mis. Probeer het later opnieuw.',
  missing_env: 'De serveromgeving is nog niet geconfigureerd.',
  not_staff: 'Je hebt geen ELYAN Control-rechten.',
  version_required: 'Versie ontbreekt. Vernieuw de pagina en probeer opnieuw.',
  version_conflict: 'Je gegevens zijn ondertussen gewijzigd. Vernieuw en probeer opnieuw.',
  invalid_draft: 'De opgeslagen gegevens zijn ongeldig.',
  invalid_step: 'Deze onboardingstap is ongeldig.',
  invalid_status_transition: 'Deze actie is niet mogelijk in de huidige status.',
  section_locked: 'Dit onderdeel is vergrendeld tijdens de ELYAN-controle.',
  partner_required: 'Kies een partnercontext om verder te gaan.',
  max_assets: 'Maximaal 12 projectfoto’s.',
  file_too_large: 'Foto mag max. 8 MB zijn.',
  invalid_mime: 'Alleen JPEG, PNG of WebP.',
  invalid_file: 'Ongeldig bestand.',
  invalid_asset: 'Ongeldige foto.',
  not_found: 'Niet gevonden.',
  upload_failed: 'Upload mislukt. Probeer opnieuw.',
  open_review_items: 'Er staan nog open aanpassingspunten. Los die eerst op of vraag wijzigingen.',
  publication_gate_failed: 'Publicatiecriteria zijn niet vervuld.',
  invalid_review_item: 'Voeg minstens één duidelijke feedbacktekst toe.',
  invalid_filter: 'Ongeldige filter.'
};

function userMessage(code) {
  return USER_MESSAGES[code] || USER_MESSAGES.server_error;
}

function errorJson(res, status, code, extra) {
  var body = { error: code, message: userMessage(code) };
  if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
  return json(res, status, body);
}

module.exports = {
  json,
  readJson,
  methodNotAllowed,
  errorJson,
  userMessage,
  setCors
};
