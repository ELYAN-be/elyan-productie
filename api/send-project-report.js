/* ============================================================
   ELYAN. /api/send-project-report
   Calculator 2 project dossier, separate from /api/send-report
   Client sends state only; server recomputes all totals.
   ============================================================ */
'use strict';

var ProjectEngine = require('../shared/calc2/project-engine');
var FinanceEngine = require('../shared/calc2/investor/finance-engine');
var Acq = require('../shared/calc2/investor/acquisition-costs');
var buildProjectReportPdf = require('./lib/pdf-project-report').buildProjectReportPdf;
var { rateLimit, clientKey } = require('../server/rate-limit');

var FROM_ADDRESS = 'ELYAN <rapport@elyan.be>';
var REPLY_TO = 'elyan.info@gmail.com';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function fmtEUR(n) {
  if (n == null || !isFinite(Number(n))) return '-';
  var v = Math.round(Number(n));
  var neg = v < 0;
  var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + '€ ' + s;
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'invalid_state' };
  var goal = raw.goal;
  if (goal !== 'homeowner' && goal !== 'investor') return { error: 'invalid_goal' };
  var profile = raw.propertyProfile && typeof raw.propertyProfile === 'object' ? raw.propertyProfile : {};
  if (!profile.province || typeof profile.province !== 'string') return { error: 'invalid_province' };
  var KNOWN_PROVINCES = {
    antwerpen: 1, 'oost-vlaanderen': 1, 'west-vlaanderen': 1, 'vlaams-brabant': 1, limburg: 1,
    brussel: 1, brussels: 1,
    'waals-brabant': 1, henegouwen: 1, luik: 1, namen: 1, luxemburg: 1
  };
  if (!KNOWN_PROVINCES[profile.province]) return { error: 'invalid_province' };
  var region = Acq.regionFromProvince(profile.province);
  if (!region) return { error: 'invalid_province' };

  var state = {
    goal: goal,
    propertyProfile: profile,
    scope: raw.scope && typeof raw.scope === 'object' ? raw.scope : {},
    packageDetails: raw.packageDetails && typeof raw.packageDetails === 'object' ? raw.packageDetails : {},
    finishProfile: raw.finishProfile || null,
    procurementModel: raw.procurementModel || null,
    structuralRisk: raw.structuralRisk || null,
    softCostOverrides: raw.softCostOverrides && typeof raw.softCostOverrides === 'object' ? raw.softCostOverrides : {},
    costResolutions: raw.costResolutions && typeof raw.costResolutions === 'object' ? raw.costResolutions : {},
    financeProfile: raw.financeProfile && typeof raw.financeProfile === 'object' ? raw.financeProfile : null
  };
  return { state: state };
}

function validateFinanceProfile(fp) {
  if (!fp) return { error: 'missing_finance_profile' };
  var p = Number(fp.purchasePrice);
  if (!isFinite(p) || p <= 0) return { error: 'invalid_purchase' };
  var r = fp.resale || {};
  var has = [r.expected, r.conservative, r.strong].some(function (v) {
    return isFinite(Number(v)) && Number(v) > 0;
  });
  if (!has) return { error: 'invalid_resale' };
  if (fp.selling && fp.selling.agentRateExVat != null) {
    var ar = Number(fp.selling.agentRateExVat);
    if (!isFinite(ar) || ar < 0 || ar > 0.15) return { error: 'invalid_agent_rate' };
  }
  if (fp.targetRoiPercent != null) {
    var t = Number(fp.targetRoiPercent);
    if (!isFinite(t) || t < 0 || t > 200) return { error: 'invalid_target_roi' };
  }
  return { ok: true };
}

function buildEmailHtml(payload) {
  var isInvestor = payload.isInvestor;
  var budget = payload.project.budget || {};
  var title = isInvestor ? 'Je ELYAN renovatie- & investeringsanalyse is klaar' : 'Je ELYAN renovatieanalyse is klaar';
  var range = fmtEUR(budget.low) + ' – ' + fmtEUR(budget.high);

  return '' +
'<!DOCTYPE html><html lang="nl-BE"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + escapeHtml(title) + '</title></head>' +
'<body style="margin:0;padding:0;background-color:#F6F4EC;font-family:Arial,Helvetica,sans-serif;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F4EC;padding:32px 16px;">' +
'<tr><td align="center">' +
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">' +
  '<tr><td style="padding:32px 32px 0;"><span style="font-weight:bold;font-size:20px;color:#14150F;">ELYAN</span></td></tr>' +
  '<tr><td style="padding:20px 32px 0;">' +
    '<h1 style="margin:0;font-size:20px;line-height:1.3;color:#14150F;">' + escapeHtml(title) + '</h1>' +
    '<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#5B5D4F;">Je volledige projectdossier staat in de bijlage. Het is een indicatieve raming op basis van jouw projectgegevens, geen offerte en geen beleggingsadvies.</p>' +
  '</td></tr>' +
  '<tr><td style="padding:24px 32px 0;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#3F4A32;border-radius:14px;">' +
      '<tr><td align="center" style="padding:24px 20px;">' +
        '<p style="margin:0 0 4px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#E7E3D3;">Aanbevolen projectbudget (geselecteerde werken)</p>' +
        '<p style="margin:0;font-family:monospace;font-size:22px;font-weight:bold;color:#FFFFFF;">' + escapeHtml(fmtEUR(budget.recommendedExpected)) + '</p>' +
        '<p style="margin:8px 0 0;font-size:13px;color:#EEEADA;">Range ' + escapeHtml(range) + '</p>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +
  '<tr><td style="padding:20px 32px 0;">' +
    '<p style="margin:0;font-size:13px;line-height:1.6;color:#5B5D4F;">Open de bijlage <strong>ELYAN-projectanalyse.pdf</strong> voor het volledige dossier.</p>' +
  '</td></tr>' +
  '<tr><td style="padding:24px 32px 28px;border-top:1px solid #E7E3D3;">' +
    '<p style="margin:0;font-size:12px;color:#6E7062;">Vragen? Antwoord op deze e-mail of mail <a href="mailto:elyan.info@gmail.com" style="color:#3F4A32;">elyan.info@gmail.com</a>.</p>' +
  '</td></tr>' +
'</table></td></tr></table></body></html>';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  var rl = rateLimit(clientKey(req, 'send_project_report'), 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  var body = req.body;
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString('utf8') || '{}'); } catch (e) { body = {}; }
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  var email = (body.email || '').trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  var sanitized = sanitizeState(body.state);
  if (sanitized.error) {
    console.error('Calc2 send-project-report validation:', sanitized.error);
    return res.status(400).json({ error: sanitized.error });
  }
  var state = sanitized.state;

  var project;
  try {
    project = ProjectEngine.calculateProject(state);
  } catch (err) {
    console.error('Calc2 project recompute failed', err);
    return res.status(500).json({ error: 'project_compute_failed' });
  }

  if (!project || project.status === 'EMPTY' || !(project.budget && project.budget.worksExpected > 0) && project.allInStatus === 'INSUFFICIENT_INFORMATION') {
    return res.status(400).json({ error: 'insufficient_project' });
  }

  var finance = null;
  var isInvestor = state.goal === 'investor';
  if (isInvestor) {
    var ir = project.investorReadiness || {};
    if (!ir.allowed) {
      return res.status(400).json({ error: 'investor_not_ready' });
    }
    var fv = validateFinanceProfile(state.financeProfile);
    if (fv.error) {
      return res.status(400).json({ error: fv.error });
    }
    try {
      finance = FinanceEngine.analyse(project, state.financeProfile, state);
    } catch (err2) {
      console.error('Calc2 finance recompute failed', err2);
      return res.status(500).json({ error: 'finance_compute_failed' });
    }
    if (!finance || finance.blocked || !finance.ran) {
      return res.status(400).json({ error: 'finance_blocked' });
    }
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt');
    return res.status(500).json({ error: 'email_not_configured' });
  }

  var reportData = {
    email: email,
    state: state,
    project: project,
    finance: finance
  };

  var pdfBuffer;
  try {
    pdfBuffer = await buildProjectReportPdf(reportData);
  } catch (err) {
    console.error('Calc2 PDF generation error:', err);
    return res.status(500).json({ error: 'pdf_generation_failed' });
  }

  var subject = isInvestor
    ? 'Je ELYAN renovatie- & investeringsanalyse'
    : 'Je ELYAN renovatieanalyse';

  try {
    var resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        reply_to: REPLY_TO,
        subject: subject,
        html: buildEmailHtml({ project: project, isInvestor: isInvestor }),
        attachments: [
          {
            filename: 'ELYAN-projectanalyse.pdf',
            content: pdfBuffer.toString('base64')
          }
        ]
      })
    });

    if (!resendRes.ok) {
      var errText = await resendRes.text();
      console.error('Resend error:', resendRes.status, errText);
      return res.status(502).json({ error: 'send_failed' });
    }

    return res.status(200).json({
      ok: true,
      totals: {
        recommendedExpected: project.budget.recommendedExpected,
        low: project.budget.low,
        high: project.budget.high,
        totalInvestment: finance ? finance.totalInvestment : null,
        potentialProfit: finance ? finance.potentialProfit : null,
        projectRoiPercent: finance ? finance.projectRoiPercent : null,
        breakEvenResalePrice: finance ? finance.breakEvenResalePrice : null,
        maxPurchasePrice: finance ? finance.maxPurchasePrice : null
      }
    });
  } catch (err) {
    console.error('send-project-report error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
