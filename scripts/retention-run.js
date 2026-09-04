#!/usr/bin/env node
/**
 * ELYAN retention maintenance CLI.
 * Default: dry-run (no deletes).
 *
 *   node scripts/retention-run.js
 *   node scripts/retention-run.js --apply   # requires RETENTION_APPLY=true and CONFIRM_RETENTION_APPLY=YES
 *
 * Service role env required for live DB. Never deletes active records.
 */
'use strict';

var { createAdminClient } = require('../server/supabase');
var { runRetention } = require('../server/retention');

async function main() {
  var args = process.argv.slice(2);
  var wantApply = args.indexOf('--apply') >= 0;
  var dryRun = true;

  if (wantApply) {
    var flag = String(process.env.RETENTION_APPLY || '').toLowerCase();
    var confirm = String(process.env.CONFIRM_RETENTION_APPLY || '');
    if (!(flag === '1' || flag === 'true' || flag === 'yes') || confirm !== 'YES') {
      console.error(
        'Refusing --apply. Set RETENTION_APPLY=true and CONFIRM_RETENTION_APPLY=YES'
      );
      process.exit(2);
    }
    dryRun = false;
  }

  var admin = createAdminClient();
  var result = await runRetention(admin, { dryRun: dryRun });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  console.log(
    dryRun
      ? '\nDRY-RUN only. No production rows deleted.'
      : '\nAPPLY complete. Review results above.'
  );
}

main().catch(function (e) {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
