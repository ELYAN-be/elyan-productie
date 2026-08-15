'use strict';
/**
 * Regression: claim must succeed even when partner_members lacks service_role GRANT.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

function test(name, fn) {
  fn();
  console.log('OK ', name);
}

test('foundation migration grants service_role on partner_members', function () {
  var sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260814_phase_a_foundation.sql'),
    'utf8'
  );
  assert.ok(/GRANT SELECT, INSERT, UPDATE ON TABLE public\.partner_members TO service_role/.test(sql));
  assert.ok(/GRANT SELECT, INSERT, UPDATE ON TABLE public\.partner_invites TO service_role/.test(sql));
});

test('service_role grants migration file exists', function () {
  var p = path.join(__dirname, '..', 'supabase', 'migrations', '20260815_service_role_grants.sql');
  assert.ok(fs.existsSync(p));
  var sql = fs.readFileSync(p, 'utf8');
  assert.ok(sql.indexOf('partner_members') >= 0);
  assert.ok(sql.indexOf('service_role') >= 0);
});

test('acceptInviteForUser falls back to Auth app_metadata when table GRANTs missing', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'server', 'invites.js'), 'utf8');
  assert.ok(src.indexOf('claimMembershipInAppMetadata') >= 0);
  assert.ok(src.indexOf('elyan_memberships') >= 0);
  assert.ok(src.indexOf('invitesTableDenied') >= 0);
  assert.ok(src.indexOf('listMembershipsFromAppMetadata') >= 0);
});

test('listActiveMemberships falls back to app_metadata', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'server', 'tenancy.js'), 'utf8');
  assert.ok(src.indexOf("source: 'app_metadata'") >= 0);
  assert.ok(src.indexOf('listMembershipsFromAppMetadata') >= 0);
});

test('requireActiveMembership uses listActiveMemberships (invite-aware)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'server', 'tenancy.js'), 'utf8');
  var idx = src.indexOf('async function requireActiveMembership');
  assert.ok(idx >= 0);
  var body = src.slice(idx, idx + 800);
  assert.ok(body.indexOf('listActiveMemberships') >= 0);
});

console.log('\nAll claim-flow regression checks passed');
