#!/usr/bin/env node
/**
 * Sprint 8 E2E C — adversarial authZ + status-transition tests.
 * Verifies partner roles cannot Control-act; invalid transitions rejected.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var controlModel = require('../server/control-model');
var http = require('../server/http');

var root = path.join(__dirname, '..');
var failed = 0;

function ok(name) { console.log('OK  ' + name); }
function fail(name, err) {
  failed += 1;
  console.error('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
}
function test(name, fn) {
  try { fn(); ok(name); } catch (e) { fail(name, e); }
}

test('control API always requires staff (no partner membership path)', function () {
  var src = fs.readFileSync(path.join(root, 'api/control.js'), 'utf8');
  assert.ok(src.indexOf('requireStaff') >= 0);
  assert.ok(src.indexOf('requirePartnerContext') < 0);
  assert.ok(src.indexOf('requireActiveMembership') < 0);
  assert.ok(src.indexOf("action === 'approve'") >= 0 || src.indexOf("action === \"approve\"") >= 0);
});

test('professionals API has no Control mutation actions', function () {
  var src = fs.readFileSync(path.join(root, 'api/professionals.js'), 'utf8');
  ['approve', 'publish', 'request-changes', 'pause', 'hide', 'restore'].forEach(function (a) {
    assert.ok(src.indexOf("'" + a + "'") < 0, a);
  });
});

test('invalid approve/publish transitions rejected by model', function () {
  assert.ok(!controlModel.canApproveOnboarding('in_progress'));
  assert.ok(!controlModel.canApproveOnboarding('changes_requested'));
  assert.ok(!controlModel.canApproveOnboarding('approved'));
  assert.ok(!controlModel.canProfileAction('publish', 'under_review'));
  assert.ok(!controlModel.canProfileAction('publish', 'draft'));
  assert.ok(!controlModel.canProfileAction('pause', 'ready'));
  assert.ok(!controlModel.canProfileAction('hide', 'ready'));
  assert.ok(!controlModel.canProfileAction('restore', 'ready'));
});

test('approve open-items rule is explicit and blocking', function () {
  assert.ok(controlModel.hasOpenReviewItems([{ item_status: 'open' }]));
  assert.ok(!controlModel.hasOpenReviewItems([{ item_status: 'resolved' }]));
  assert.ok(!controlModel.hasOpenReviewItems([]));
});

test('user-facing Control error messages exist (no raw codes only)', function () {
  assert.ok(http.userMessage('not_staff').indexOf('Control') >= 0);
  assert.ok(http.userMessage('open_review_items').length > 10);
  assert.ok(http.userMessage('publication_gate_failed').length > 10);
  assert.ok(http.userMessage('invalid_status_transition').length > 10);
});

test('control UI has no demo/placeholder copy in titles', function () {
  var html = fs.readFileSync(path.join(root, 'professionals/control.html'), 'utf8');
  assert.ok(html.indexOf('DEMO') < 0);
  assert.ok(html.indexOf('lorem') < 0);
  assert.ok(html.indexOf('TODO') < 0);
  assert.ok(html.indexOf('ELYAN Control') >= 0);
});

test('Phase A control-invites still staff-gated', function () {
  var src = fs.readFileSync(path.join(root, 'api/control-invites.js'), 'utf8');
  assert.ok(src.indexOf('requireStaff') >= 0);
});

if (failed) {
  console.error(failed + ' Sprint 8 E2E C check(s) failed');
  process.exit(1);
}
console.log('OK  Sprint 8 E2E C adversarial authZ/status');
