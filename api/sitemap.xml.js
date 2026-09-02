'use strict';

var { listCategories, listPublishedProfileSlugs } = require('../server/marketplace-public');

var BASE = 'https://www.elyan.be';

var STATIC_URLS = [
  { loc: BASE + '/', priority: '1.0', changefreq: 'weekly' },
  { loc: BASE + '/vakmannen', priority: '0.9', changefreq: 'weekly' },
  { loc: BASE + '/prijs-berekenen', priority: '0.8', changefreq: 'monthly' },
  { loc: BASE + '/partners', priority: '0.7', changefreq: 'monthly' },
  { loc: BASE + '/over-ons', priority: '0.6', changefreq: 'monthly' },
  { loc: BASE + '/contact', priority: '0.5', changefreq: 'monthly' },
  { loc: BASE + '/privacybeleid', priority: '0.3', changefreq: 'yearly' },
  { loc: BASE + '/cookiebeleid', priority: '0.3', changefreq: 'yearly' },
  { loc: BASE + '/voorwaarden', priority: '0.3', changefreq: 'yearly' },
  { loc: BASE + '/voorwaarden-vakbedrijven', priority: '0.3', changefreq: 'yearly' }
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(entry) {
  return '' +
    '  <url>\n' +
    '    <loc>' + xmlEscape(entry.loc) + '</loc>\n' +
    '    <changefreq>' + entry.changefreq + '</changefreq>\n' +
    '    <priority>' + entry.priority + '</priority>\n' +
    '  </url>\n';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }

  var urls = STATIC_URLS.slice();

  var cats = listCategories();
  cats.forEach(function (c) {
    urls.push({
      loc: BASE + '/vakmannen/' + c.id,
      priority: '0.8',
      changefreq: 'weekly'
    });
  });

  try {
    var profiles = await listPublishedProfileSlugs();
    if (profiles.ok && profiles.slugs) {
      profiles.slugs.forEach(function (slug) {
        urls.push({
          loc: BASE + '/vakmannen/' + slug,
          priority: '0.7',
          changefreq: 'weekly'
        });
      });
    }
  } catch (e) {
    console.error('sitemap_profiles_fetch_failed', { action: 'sitemap', code: e && e.message ? e.message : 'error' });
  }

  var body = '' +
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(urlEntry).join('') +
    '</urlset>\n';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  if (req.method === 'HEAD') return res.end();
  res.end(body);
};
