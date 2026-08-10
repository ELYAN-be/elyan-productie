#!/usr/bin/env node
/* One-shot Calc2 live email gate — does not print secrets */
'use strict';

var fs = require('fs');
var path = require('path');

function loadEnvLocal() {
  var p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(function (line) {
    if (!line || line.charAt(0) === '#') return;
    var i = line.indexOf('=');
    if (i < 1) return;
    var k = line.slice(0, i).trim();
    var v = line.slice(i + 1).trim();
    if ((v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') ||
        (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")) {
      v = v.slice(1, -1);
    }
    // Never overwrite a real runtime key with Vercel Sensitive placeholders
    if (v === '[SENSITIVE]' || v === '') return;
    if (!process.env[k]) process.env[k] = v;
  });
}

loadEnvLocal();

if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === '[SENSITIVE]') {
  console.log('GATE: NO_KEY');
  process.exit(2);
}

var Scope = require('../shared/calc2/scope-model');
var ProjectEngine = require('../shared/calc2/project-engine');
var buildProjectReportPdf = require('../api/lib/pdf-project-report').buildProjectReportPdf;

var TO = process.env.ELYAN_TEST_EMAIL || 'elyan.info@gmail.com';

function lightState() {
  var scope = Scope.emptyScope();
  scope.keuken = 'volledig';
  scope.badkamer = 'volledig';
  scope.schilderwerken = 'grondig';
  return {
    goal: 'homeowner',
    finishProfile: 'comfort',
    procurementModel: 'separate',
    structuralRisk: 'nee',
    costResolutions: { permits: { mode: 'na' }, site_temporary: { mode: 'na' } },
    softCostOverrides: {},
    propertyProfile: {
      province: 'antwerpen', yearBuilt: '1991_2005', areaM2: 100,
      floors: '2', condition: 'matig', epc: 'D', propertyType: 'rijwoning'
    },
    scope: scope,
    packageDetails: {
      keuken: { kitchenSize: 10, kitchenLayout: 'ja', kitchenAppliances: 'ja' },
      badkamer: { bathCount: '1', bathMainSize: 5, bathMainIntensity: 'volledig' },
      schilderwerken: { paintScope: 'binnen', paintInteriorSurfaces: 'walls_ceilings', paintAreaMethod: 'estimate' }
    },
    financeProfile: null
  };
}

function fmtEUR(n) {
  if (n == null || !isFinite(Number(n))) return '—';
  var v = Math.round(Number(n));
  var neg = v < 0;
  var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + '€ ' + s;
}

(async function () {
  var state = lightState();
  var project = ProjectEngine.calculateProject(state);
  var budget = project.budget || {};
  var expected = {
    recommendedExpected: budget.recommendedExpected,
    low: budget.low,
    high: budget.high
  };

  var pdfBuffer = await buildProjectReportPdf({
    email: TO,
    state: state,
    project: project,
    finance: null
  });

  if (!pdfBuffer || pdfBuffer.slice(0, 4).toString() !== '%PDF') {
    console.log('PDF_INVALID');
    process.exit(1);
  }

  var outPdf = path.join(__dirname, '..', 'tmp-pdf-qa', 'calc2-live-email-gate.pdf');
  fs.writeFileSync(outPdf, pdfBuffer);

  var subject = 'Je ELYAN renovatieanalyse';
  var range = fmtEUR(budget.low) + ' – ' + fmtEUR(budget.high);
  var html =
    '<!DOCTYPE html><html lang="nl-BE"><body style="font-family:Arial,sans-serif;background:#F6F4EC;padding:24px;">' +
    '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">' +
    '<p style="font-weight:bold;font-size:20px;color:#14150F;">ELYAN</p>' +
    '<h1 style="font-size:20px;color:#14150F;">Je ELYAN renovatieanalyse is klaar</h1>' +
    '<p style="color:#5B5D4F;font-size:14px;">Je volledige projectdossier staat in de bijlage. Het is een indicatieve raming op basis van jouw projectgegevens — geen offerte en geen beleggingsadvies.</p>' +
    '<div style="background:#3F4A32;border-radius:14px;padding:20px;text-align:center;color:#fff;">' +
    '<p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;">AANBEVOLEN PROJECTBUDGET</p>' +
    '<p style="margin:0;font-size:22px;font-weight:bold;">' + fmtEUR(budget.recommendedExpected) + '</p>' +
    '<p style="margin:8px 0 0;font-size:13px;color:#EEEADA;">Range ' + range + '</p>' +
    '</div>' +
    '<p style="font-size:13px;color:#5B5D4F;">Open de bijlage <strong>ELYAN-projectanalyse.pdf</strong>.</p>' +
    '<p style="font-size:11px;color:#6E7062;">LIVE EMAIL GATE — éénmalige QA-test.</p>' +
    '</div></body></html>';

  var resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ELYAN <rapport@elyan.be>',
      to: [TO],
      reply_to: 'elyan.info@gmail.com',
      subject: subject,
      html: html,
      attachments: [
        {
          filename: 'ELYAN-projectanalyse.pdf',
          content: pdfBuffer.toString('base64')
        }
      ]
    })
  });

  var resText = await resendRes.text();
  var resJson = null;
  try { resJson = JSON.parse(resText); } catch (e) {}

  if (!resendRes.ok) {
    console.log('SEND_FAIL status=' + resendRes.status);
    // Do not print full body if it might contain sensitive info; print only error name/message keys
    if (resJson && resJson.message) console.log('SEND_FAIL_MSG=' + String(resJson.message).slice(0, 200));
    if (resJson && resJson.name) console.log('SEND_FAIL_NAME=' + resJson.name);
    process.exit(1);
  }

  var id = resJson && resJson.id ? resJson.id : null;
  console.log('SEND_OK');
  console.log('TO=' + TO);
  console.log('SUBJECT=' + subject);
  console.log('FROM=ELYAN <rapport@elyan.be>');
  console.log('RESEND_ID=' + (id || 'unknown'));
  console.log('PDF_BYTES=' + pdfBuffer.length);
  console.log('PDF_PATH=' + outPdf);
  console.log('TOTALS=' + JSON.stringify(expected));

  if (id) {
    // brief status poll
    await new Promise(function (r) { setTimeout(r, 1500); });
    var st = await fetch('https://api.resend.com/emails/' + id, {
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY }
    });
    var stText = await st.text();
    var stJson = null;
    try { stJson = JSON.parse(stText); } catch (e2) {}
    if (st.ok && stJson) {
      console.log('RESEND_STATUS=' + (stJson.last_event || stJson.status || 'ok'));
      console.log('RESEND_SUBJECT=' + (stJson.subject || ''));
      console.log('RESEND_FROM=' + (stJson.from || ''));
      console.log('RESEND_TO=' + JSON.stringify(stJson.to || []));
    } else {
      console.log('RESEND_STATUS_CHECK=unavailable');
    }
  }
})().catch(function (err) {
  console.log('FATAL=' + (err && err.message ? err.message : 'error'));
  process.exit(1);
});
