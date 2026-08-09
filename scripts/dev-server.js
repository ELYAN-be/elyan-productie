#!/usr/bin/env node
/* ============================================================
   ELYAN — Local dev server (zero dependencies)
   Serves the static site from the repo root and mounts the
   serverless functions in /api with Vercel-like req/res helpers,
   so the calculator flow (including /api/send-report) can be
   exercised locally without the Vercel CLI.

   Usage:  node scripts/dev-server.js   (PORT env optional, default 3000)
   ============================================================ */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var ROOT = path.join(__dirname, '..');
var API_DIR = path.join(ROOT, 'api');
var PORT = Number(process.env.PORT) || 3000;

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf'
};

function decorateRes(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise(function (resolve) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', function () { resolve(''); });
  });
}

async function handleApi(req, res, routeName) {
  var handlerPath = path.join(API_DIR, routeName + '.js');
  if (!fs.existsSync(handlerPath)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  var raw = await readBody(req);
  req.body = raw;
  var handler = require(handlerPath);
  try {
    await handler(req, decorateRes(res));
  } catch (err) {
    console.error('[api] handler error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'server_error' });
  }
}

function serveStatic(req, res, pathname) {
  var rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  var filePath = path.normalize(path.join(ROOT, rel));
  if (filePath.indexOf(ROOT) !== 0) {
    res.statusCode = 403; res.end('Forbidden'); return;
  }
  fs.stat(filePath, function (err, stat) {
    if (!err && stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); }
    // Pretty URLs: /contact -> /contact.html
    fs.readFile(filePath, function (readErr, data) {
      if (readErr) {
        fs.readFile(filePath + '.html', function (htmlErr, htmlData) {
          if (htmlErr) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); res.end('404 Not Found'); return; }
          res.setHeader('Content-Type', MIME['.html']);
          res.end(htmlData);
        });
        return;
      }
      var ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(data);
    });
  });
}

var server = http.createServer(function (req, res) {
  var parsed = url.parse(req.url);
  var pathname = parsed.pathname || '/';
  if (pathname.indexOf('/api/') === 0) {
    var routeName = pathname.slice('/api/'.length).replace(/\/+$/, '');
    handleApi(req, res, routeName);
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, function () {
  console.log('ELYAN dev server running at http://localhost:' + PORT);
  if (!process.env.RESEND_API_KEY) {
    console.log('[info] RESEND_API_KEY not set — /api/send-report will return email_not_configured (PDF/pricing still compute).');
  }
});
