/**
 * Optional production deploy prep.
 * Prefer vercel.json redirect of /internal/* for production safety on this static site.
 * Run manually when a custom Vercel build command is configured:
 *   node scripts/prepare-production-deploy.js
 *
 * Removing internal/ only when VERCEL_ENV=production.
 */
var fs = require('fs');
var path = require('path');

var env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
var root = path.join(__dirname, '..');
var internalDir = path.join(root, 'internal');

if (env === 'production') {
  if (fs.existsSync(internalDir)) {
    fs.rmSync(internalDir, { recursive: true, force: true });
    console.log('[prepare-deploy] Removed internal/ for production quarantine');
  } else {
    console.log('[prepare-deploy] internal/ already absent');
  }
} else {
  console.log('[prepare-deploy] Keeping internal/ (env=' + env + ')');
}
