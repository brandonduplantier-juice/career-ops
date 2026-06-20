#!/usr/bin/env node
// morning_brief.mjs
// Reads data/morning_brief.json written by ats_scan.mjs (v2 attainability model),
// builds HTML email, and sends via Gmail SMTP (port 587 STARTTLS).
// Requires: CAREER_OPS_GMAIL_APP_PW env var (or .env file)

import { createTransport } from 'nodemailer';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, 'data');
const BRIEF_PATH = join(DATA, 'morning_brief.json');

// ── 1. Load and validate brief ────────────────────────────────────────────────

if (!existsSync(BRIEF_PATH)) {
  console.error('ERROR: data/morning_brief.json not found. Did the scan complete?');
  process.exit(1);
}

let brief;
try {
  const raw = readFileSync(BRIEF_PATH, 'utf8').replace(/^﻿/, '');
  brief = JSON.parse(raw);
} catch (err) {
  console.error(`ERROR: Failed to parse data/morning_brief.json: ${err.message}`);
  process.exit(1);
}

const { scan_date, ai_review = false, honest_count_line = null } = brief;
const applyList    = Array.isArray(brief.apply_list) ? brief.apply_list : [];
const strongList   = Array.isArray(brief.strong)     ? brief.strong     : [];
const considerList = Array.isArray(brief.consider)   ? brief.consider   : [];
const awarenessList = Array.isArray(brief.awareness) ? brief.awareness  : [];
const applyTotal   = typeof brief.apply_total === 'number' ? brief.apply_total : applyList.length;

if (!scan_date) {
  console.error('ERROR: morning_brief.json has no scan_date.');
  process.exit(1);
}

const totalRoles = applyList.length + strongList.length + considerList.length + awarenessList.length;
if (totalRoles === 0) {
  console.log('No roles in morning_brief.json. Nothing to send.');
  process.exit(0);
}

console.log(`Morning brief: ${scan_date}, ${applyList.length} apply, ${strongList.length} strong, ${considerList.length} consider, ${awarenessList.length} awareness`);

// ── 2. Style helpers ──────────────────────────────────────────────────────────

function scoreColor(score) {
  const s = Number(score);
  if (isNaN(s)) return '#6b7280';
  if (s >= 4.5) return '#14532d';
  if (s >= 4.0) return '#166534';
  if (s >= 3.5) return '#1e40af';
  if (s >= 3.0) return '#92400e';
  return '#6b7280';
}

function scoreBg(score) {
  const s = Number(score);
  if (isNaN(s)) return '#f3f4f6';
  if (s >= 4.0) return '#dcfce7';
  if (s >= 3.5) return '#dbeafe';
  if (s >= 3.0) return '#fef3c7';
  return '#f3f4f6';
}

function attainBadge(attain) {
  if (attain === 'high')   return { bg: '#dcfce7', fg: '#166534', label: 'HIGH' };
  if (attain === 'medium') return { bg: '#fef3c7', fg: '#92400e', label: 'MED' };
  if (attain === 'low')    return { bg: '#fee2e2', fg: '#991b1b', label: 'LOW' };
  return { bg: '#f3f4f6', fg: '#6b7280', label: '-' };
}

// ── 3. Row builders ───────────────────────────────────────────────────────────

function applyRow(r, i) {
  const sc  = scoreColor(r.score);
  const sb  = scoreBg(r.score);
  const ab  = attainBadge(r.ai_attainability);
  const bg  = i % 2 === 0 ? '#ffffff' : '#f9fafb';
  const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
  const roleLabel  = r.is_new ? `${r.title} <span style="font-size:10px;color:#2563eb;font-weight:700">(NEW)</span>` : (r.title || '-');
  const missing    = Array.isArray(r.ai_missing) && r.ai_missing.length > 0 ? r.ai_missing[0] : '';
  const reason     = r.ai_reason || r.reason || '';

  return `
      <tr style="background:${bg}">
        <td style="padding:10px 8px;font-size:12px;color:#6b7280;font-weight:600">${r.rank}</td>
        <td style="padding:10px 8px">
          <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${sb};color:${sc}">${scoreLabel}</span>
        </td>
        <td style="padding:10px 8px">
          <span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;background:${ab.bg};color:${ab.fg}">${ab.label}</span>
        </td>
        <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#111827">${r.company || '-'}</td>
        <td style="padding:10px 8px;font-size:13px">
          <a href="${r.url}" style="color:#2563eb;text-decoration:underline;font-weight:600">${roleLabel}</a>
          ${reason ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${reason}</div>` : ''}
        </td>
        <td style="padding:10px 8px;font-size:12px;color:#374151">${r.pay || '-'}</td>
        <td style="padding:10px 8px;font-size:12px;color:#374151">${r.location || '-'}</td>
        <td style="padding:10px 8px;font-size:12px;color:#374151">${r.employer_size || '-'}</td>
        <td style="padding:10px 8px;font-size:12px;color:#374151">${r.screen || '-'}</td>
        <td style="padding:10px 8px;font-size:12px;color:#6b7280;max-width:160px;word-break:break-word">${r.warm_path || '-'}</td>
        <td style="padding:10px 8px;font-size:11px;color:#9ca3af">${missing}</td>
      </tr>`;
}

function strongRow(r, i) {
  const sc  = scoreColor(r.score);
  const sb  = scoreBg(r.score);
  const bg  = i % 2 === 0 ? '#f0fdf4' : '#dcfce7';
  const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
  const roleLabel  = r.is_new ? `${r.title} <span style="font-size:10px;color:#2563eb;font-weight:700">(NEW)</span>` : (r.title || '-');
  const note       = r.ai_reason || r.reason || '';

  return `
      <tr style="background:${bg}">
        <td style="padding:8px;font-size:12px;color:#6b7280;font-weight:600">${r.rank}</td>
        <td style="padding:8px">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${sb};color:${sc}">${scoreLabel}</span>
        </td>
        <td style="padding:8px;font-size:12px;font-weight:600;color:#374151">${r.company || '-'}</td>
        <td style="padding:8px;font-size:13px">
          <a href="${r.url}" style="color:#2563eb;text-decoration:underline">${roleLabel}</a>
        </td>
        <td style="padding:8px;font-size:11px;color:#166534">${note}</td>
      </tr>`;
}

function considerRow(r, i) {
  const sc  = scoreColor(r.score);
  const sb  = scoreBg(r.score);
  const bg  = i % 2 === 0 ? '#fffbeb' : '#fef9e7';
  const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
  const roleLabel  = r.is_new ? `${r.title} <span style="font-size:10px;color:#2563eb;font-weight:700">(NEW)</span>` : (r.title || '-');
  const missing    = Array.isArray(r.ai_missing) && r.ai_missing.length > 0 ? r.ai_missing[0] : 'unspecified item';

  return `
      <tr style="background:${bg}">
        <td style="padding:8px;font-size:12px;color:#6b7280;font-weight:600">${r.rank}</td>
        <td style="padding:8px">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${sb};color:${sc}">${scoreLabel}</span>
        </td>
        <td style="padding:8px;font-size:12px;font-weight:600;color:#374151">${r.company || '-'}</td>
        <td style="padding:8px;font-size:13px">
          <a href="${r.url}" style="color:#2563eb;text-decoration:underline">${roleLabel}</a>
        </td>
        <td style="padding:8px;font-size:11px;color:#92400e;font-weight:600">${missing}</td>
      </tr>`;
}

function awarenessRow(r, i) {
  const bg  = i % 2 === 0 ? '#f9fafb' : '#f3f4f6';
  const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
  const roleLabel  = r.is_new ? `${r.title} (NEW)` : (r.title || '-');
  const note       = r.ai_blocking_reason || r.ai_reason || '';

  return `
      <tr style="background:${bg}">
        <td style="padding:6px 8px;font-size:11px;color:#9ca3af">${r.rank}</td>
        <td style="padding:6px 8px">
          <span style="font-size:11px;color:#9ca3af">${scoreLabel}</span>
        </td>
        <td style="padding:6px 8px;font-size:12px;color:#6b7280">${r.company || '-'}</td>
        <td style="padding:6px 8px;font-size:12px">
          <a href="${r.url}" style="color:#9ca3af;text-decoration:none">${roleLabel}</a>
        </td>
        <td style="padding:6px 8px;font-size:11px;color:#9ca3af">${note}</td>
      </tr>`;
}

// ── 4. Section builders ───────────────────────────────────────────────────────

function buildApplySection() {
  const header = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0">
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">#</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Score</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Attain.</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Company</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Role</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Pay</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Location</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Size</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Screen</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Warm Path</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:700">Missing</th>
          </tr>
        </thead>
        <tbody>${applyList.map((r, i) => applyRow(r, i)).join('')}</tbody>
      </table>
    </div>`;

  if (applyList.length === 0) {
    return '<p style="color:#6b7280;font-size:14px">No roles cleared the attainability bar this scan.</p>';
  }
  return header;
}

function buildHonestCountLine() {
  if (!honest_count_line) return '';
  return `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;font-style:italic">${honest_count_line}</p>`;
}

function buildStrongSection() {
  if (strongList.length === 0) return '';
  return `
    <h2 style="margin:28px 0 10px;font-size:14px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.5px">Strong - worth reviewing before next scan</h2>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f0fdf4;border-bottom:1px solid #86efac">
            <th style="padding:8px;text-align:left;font-size:11px;color:#166534;font-weight:700">#</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#166534;font-weight:700">Score</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#166534;font-weight:700">Company</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#166534;font-weight:700">Role</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#166534;font-weight:700">Note</th>
          </tr>
        </thead>
        <tbody>${strongList.map((r, i) => strongRow(r, i)).join('')}</tbody>
      </table>
    </div>`;
}

function buildConsiderSection() {
  if (considerList.length === 0) return '';
  return `
    <h2 style="margin:28px 0 10px;font-size:14px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px">Consider - confirm one item before applying</h2>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#fffbeb;border-bottom:1px solid #fcd34d">
            <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;font-weight:700">#</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;font-weight:700">Score</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;font-weight:700">Company</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;font-weight:700">Role</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#92400e;font-weight:700">Confirm</th>
          </tr>
        </thead>
        <tbody>${considerList.map((r, i) => considerRow(r, i)).join('')}</tbody>
      </table>
    </div>`;
}

function buildAwarenessSection() {
  if (awarenessList.length === 0) return '';
  return `
    <h2 style="margin:28px 0 10px;font-size:14px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Awareness</h2>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f3f4f6;border-bottom:1px solid #e5e7eb">
            <th style="padding:6px 8px;text-align:left;font-size:10px;color:#9ca3af;font-weight:700">#</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;color:#9ca3af;font-weight:700">Score</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;color:#9ca3af;font-weight:700">Company</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;color:#9ca3af;font-weight:700">Role</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;color:#9ca3af;font-weight:700">Note</th>
          </tr>
        </thead>
        <tbody>${awarenessList.map((r, i) => awarenessRow(r, i)).join('')}</tbody>
      </table>
    </div>`;
}

function buildCopyPasteAppendix() {
  const lines = [];
  for (const r of applyList) {
    const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
    const attain = r.ai_attainability || 'unreviewed';
    lines.push(`${r.rank} [${scoreLabel} ${attain}] ${r.company || '-'} - ${r.title || '-'} - ${r.url || '-'}`);
  }
  if (strongList.length > 0) {
    lines.push('');
    lines.push('--- STRONG ---');
    for (const r of strongList) {
      const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
      lines.push(`${r.rank} [${scoreLabel}] ${r.company || '-'} - ${r.title || '-'} - ${r.url || '-'}`);
    }
  }
  if (considerList.length > 0) {
    lines.push('');
    lines.push('--- CONSIDER ---');
    for (const r of considerList) {
      const scoreLabel = typeof r.score === 'number' ? r.score.toFixed(1) : '-';
      const missing = Array.isArray(r.ai_missing) && r.ai_missing.length > 0 ? r.ai_missing[0] : '';
      lines.push(`${r.rank} [${scoreLabel}] ${r.company || '-'} - ${r.title || '-'}${missing ? ' | confirm: ' + missing : ''} - ${r.url || '-'}`);
    }
  }
  return lines.join('\n');
}

// ── 5. Build full HTML ────────────────────────────────────────────────────────

const aiReviewLabel = ai_review ? 'AI review: on (v2)' : 'AI review: off';
const appendix = buildCopyPasteAppendix();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Morning Brief ${scan_date}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:1020px;margin:24px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.12)">

    <div style="background:#1d4ed8;padding:28px 36px">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-.3px">Morning Brief</h1>
      <p style="margin:4px 0 0;color:#93c5fd;font-size:15px">${scan_date} - ${applyList.length} apply / ${strongList.length} strong / ${considerList.length} consider / ${awarenessList.length} awareness - ${aiReviewLabel}</p>
    </div>

    <div style="padding:28px 36px">

      <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827">Apply List (${applyList.length} of ${applyTotal >= 10 ? '10+' : applyTotal})</h2>
      ${buildApplySection()}
      ${buildHonestCountLine()}

      ${buildStrongSection()}

      ${buildConsiderSection()}

      ${buildAwarenessSection()}

      ${appendix ? `
      <h2 style="margin:28px 0 10px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px">Copy-paste summary</h2>
      <pre style="font-family:monospace;font-size:12px;line-height:1.7;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;white-space:pre;overflow-x:auto;margin:0;color:#111827;word-break:normal">${appendix}</pre>
      ` : ''}

    </div>

    <div style="background:#f8fafc;padding:14px 36px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        career-ops v2 - juice6121@gmail.com - generated ${new Date().toISOString()}
      </p>
    </div>

  </div>
</body>
</html>`;

// ── 6. Write preview HTML ─────────────────────────────────────────────────────

writeFileSync(join(DATA, 'morning_brief.html'), html, 'utf8');
console.log('Wrote preview: data/morning_brief.html');

// ── 7. Send email ─────────────────────────────────────────────────────────────

const appPassword = process.env.CAREER_OPS_GMAIL_APP_PW;

if (!appPassword) {
  console.error('ERROR: CAREER_OPS_GMAIL_APP_PW env var not set.');
  console.error('Create a .env file with: CAREER_OPS_GMAIL_APP_PW=your_gmail_app_password');
  process.exit(1);
}

const transporter = createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: 'juice6121@gmail.com',
    pass: appPassword
  }
});

const subject = `Morning Brief ${scan_date} - ${applyList.length} apply / ${strongList.length} strong / ${considerList.length} consider`;

try {
  const info = await transporter.sendMail({
    from:    '"career-ops" <juice6121@gmail.com>',
    to:      'juice6121@gmail.com',
    subject,
    html
  });
  console.log(`Email sent: ${info.messageId}`);
} catch (err) {
  console.error(`Email failed: ${err.message}`);
  process.exit(1);
}
