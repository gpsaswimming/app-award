import nodemailer from 'nodemailer';
import { AWARDS } from './constants.js';
import { escapeHtml } from './util.js';

export function createMailer(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

// The president's copy: full submission (all fields + essay) in the HTML body.
// Every user value is HTML-escaped; no user value is ever placed in a header.
export function buildEmailHtml({ awardId, submissionId, data, words, season }) {
  const award = AWARDS[awardId];
  const rows = award.fields
    .filter((f) => data[f.key])
    .map((f) =>
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;vertical-align:top">${escapeHtml(f.label)}</td>` +
      `<td style="padding:2px 0">${escapeHtml(data[f.key])}</td></tr>`)
    .join('');

  return `<div style="font-family:Inter,Arial,sans-serif;color:#111">
  <h2 style="color:#002366;margin:0 0 4px">${escapeHtml(award.label)}</h2>
  <p style="color:#555;margin:0 0 16px">${escapeHtml(String(season))} · Submission <strong>${escapeHtml(submissionId)}</strong></p>
  <table style="border-collapse:collapse;font-size:14px">${rows}</table>
  <h3 style="color:#002366;margin:20px 0 6px">Essay (${words} words)</h3>
  <div style="white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(data.essay)}</div>
  <p style="color:#888;font-size:12px;margin-top:20px">Attached: <strong>${escapeHtml(submissionId)}.pdf</strong> — forward-ready copy for the reviewing family.</p>
</div>`;
}

export async function sendSubmissionEmail(mailer, cfg, { awardId, submissionId, data, words, pdf }) {
  const award = AWARDS[awardId];
  const html = buildEmailHtml({ awardId, submissionId, data, words, season: cfg.season });
  await mailer.sendMail({
    from: cfg.mailFrom,
    to: cfg.presidentEmail,
    cc: cfg.notifyEmail || undefined,
    subject: `GPSA ${award.label} submission — ${submissionId}`,
    html,
    attachments: [{ filename: `${submissionId}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}
