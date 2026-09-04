#!/usr/bin/env node
/**
 * Production retention dry-run report helper.
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env (never prints them).
 * Always dry-run. Writes JSON report path from REPORT_PATH or stdout summary only.
 */
'use strict';

var fs = require('fs');
var { createAdminClient } = require('../server/supabase');
var { planRetention, applyRetention } = require('../server/retention');

function group(actions, cat) {
  var items = (actions || []).filter(function (a) {
    return a.category === cat;
  });
  var dates = items
    .map(function (a) {
      return a.closedAt || a.updatedAt || a.lastActivityAt || a.createdAt || a.beforeDate || null;
    })
    .filter(Boolean)
    .sort();
  var reasons = [];
  items.forEach(function (a) {
    var r = a.detail || a.action;
    if (reasons.indexOf(r) < 0) reasons.push(r);
  });
  return {
    count: items.length,
    oldest: dates.length ? dates[0] : null,
    reasonEligible: reasons
  };
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('missing_supabase_env');
    process.exit(2);
  }
  var admin = createAdminClient();
  var plan = await planRetention(admin, { now: new Date() });
  if (!plan.ok) {
    console.error(JSON.stringify({ ok: false, code: plan.code, error: plan.error }));
    process.exit(1);
  }
  var applied = await applyRetention(admin, plan, { dryRun: true });
  var actions = plan.actions || [];
  var partnerDeletes = actions.filter(function (a) {
    return a.action === 'delete_partner';
  });
  var report = {
    ok: !!(plan.ok && applied.ok),
    dryRun: true,
    appliedCount: applied.applied,
    plannedTotal: actions.length,
    groups: {
      customer_requests: group(actions, 'closed_customer_requests'),
      interest_candidates: group(actions, 'interest_candidates_non_continue'),
      incomplete_onboarding: group(actions, 'incomplete_onboarding'),
      closed_partners: group(actions, 'closed_partners'),
      portfolio_assets: {
        count: partnerDeletes.length,
        oldest: group(actions, 'closed_partners').oldest || group(actions, 'incomplete_onboarding').oldest,
        reasonEligible: [
          'Assets would be deleted only together with final partner purge (within 30 days of account/profile deletion)'
        ]
      },
      audit_control_history: group(actions, 'control_audit_history'),
      analytics_daily_counts: group(actions, 'analytics_daily_counts')
    },
    notes: plan.notes || {},
    summary: plan.summary || {}
  };
  if (process.env.REPORT_PATH) {
    fs.writeFileSync(process.env.REPORT_PATH, JSON.stringify(report, null, 2));
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(function (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
