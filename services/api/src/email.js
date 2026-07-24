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

// A short confirmation receipt to the submitter. No essay, no PDF — just proof
// of receipt + reference ID. `toEmail` is a validated address (the format check
// disallows whitespace, so it is safe in the header).
export async function sendReceiptEmail(mailer, cfg, { awardId, submissionId, toEmail }) {
  const award = AWARDS[awardId];
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111">
  <h2 style="color:#002366;margin:0 0 8px">Submission received</h2>
  <p>Thank you — your <strong>${escapeHtml(award.label)}</strong> submission has been received by the GPSA league president.</p>
  <p style="margin:14px 0"><span style="color:#555">Reference</span> &nbsp;<strong>${escapeHtml(submissionId)}</strong></p>
  <p>Entries are reviewed by the sponsoring families, and winners are announced at the Championship (City) Meet. There is nothing further you need to do.</p>
  <p style="color:#888;font-size:12px;margin-top:20px">Greater Peninsula Swimming Association</p>
</div>`;
  await mailer.sendMail({
    from: cfg.mailFrom,
    to: toEmail,
    subject: `GPSA ${award.label} — submission received (${submissionId})`,
    html,
  });
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
