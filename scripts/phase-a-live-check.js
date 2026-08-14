/**
 * Optional live Phase A checks — runs only when Supabase env vars are set.
 * node scripts/phase-a-live-check.js
 */
var path = require('path');
try {
  require('fs').readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    var k = m[1].trim();
    var v = m[2].trim();
    if (!process.env[k]) process.env[k] = v;
  });
} catch (e) { /* no local .env */ }

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('SKIP live Phase A checks — Supabase env not configured');
  process.exit(0);
}

var assert = require('assert');
var { createClient } = require('@supabase/supabase-js');
var { createAdminClient, createAnonClient } = require('../server/supabase');
var { createInvite, hashToken } = require('../server/invites');

async function main() {
  var admin = createAdminClient();
  var failed = 0;
  function ok(n) { console.log('OK  ' + n); }
  function fail(n, e) { failed++; console.error('FAIL ' + n, e && e.message ? e.message : e); }

  // RLS: anon cannot read partners
  try {
    var anon = createAnonClient();
    var { data, error } = await anon.from('partners').select('id').limit(1);
    if (data && data.length) throw new Error('anon unexpectedly read partners');
    ok('RLS blocks anon partners select (empty or error)');
  } catch (e) { fail('anon partners', e); }

  // Partner cannot insert staff
  try {
    var { error } = await createAnonClient().from('staff_users').insert({
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'elyan_admin'
    });
    if (!error) throw new Error('expected staff insert denial');
    ok('RLS/grants block client staff_users insert');
  } catch (e) { fail('staff insert', e); }

  // Invite hash roundtrip create via service role
  try {
    var email = 'phase-a-check-' + Date.now() + '@example.com';
    var created = await createInvite({
      email: email,
      legalName: 'Phase A Test BV',
      displayName: 'Phase A Test',
      role: 'owner'
    });
    assert.ok(created.ok, created.code);
    assert.ok(created.rawToken);
    var { data: row } = await admin.from('partner_invites').select('token_hash, email').eq('id', created.invite.id).single();
    assert.strictEqual(row.token_hash, hashToken(created.rawToken));
    assert.strictEqual(row.email, email);
    ok('invite create stores hash only');
  } catch (e) { fail('invite create', e); }

  if (failed) {
    console.error(failed + ' live checks failed');
    process.exit(1);
  }
  console.log('Live Phase A checks passed (partial — full auth flows need dashboard config)');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
