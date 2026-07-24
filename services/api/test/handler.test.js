import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { renderPdf, pdfBodyFields } from '../src/pdf.js';

const baseCfg = {
  turnstileSecret: 'secret',
  smtp: {},
  mailFrom: 'awards@gpsaswimming.org',
  presidentEmail: 'president@example.org',
  notifyEmail: '',
  season: '2026',
  timeZone: 'UTC',
  deadlines: { hurdle: new Date('2999-01-01'), lamberson: new Date('2999-01-01') },
  prompts: {},
};

const essay = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

function fakeMailer() {
  const sent = [];
  return { sent, sendMail: async (m) => (sent.push(m), { messageId: 'x' }) };
}

const validBody = (over = {}) => ({
  award: 'lamberson',
  'cf-turnstile-response': 'tok',
  coachName: 'Coach A',
  pool: 'Marlbank',
  essayWriterName: 'Parent B',
  relationshipToCoach: 'Parent',
  telephone: '757-555-1212',
  essay: essay(300),
  ...over,
});

function withTurnstile(success, fn) {
  return async () => {
    const orig = global.fetch;
    global.fetch = async () => ({ json: async () => ({ success }) });
    try { await fn(); } finally { global.fetch = orig; }
  };
}

test('happy path returns id and emails a PDF attachment', withTurnstile(true, async () => {
  const mailer = fakeMailer();
  const app = buildApp({ cfg: baseCfg, mailer, logger: false, now: () => new Date('2026-07-27T12:00:00Z') });
  const res = await app.inject({ method: 'POST', url: '/api/submit', payload: validBody() });
  assert.equal(res.statusCode, 200);
  const out = res.json();
  assert.equal(out.ok, true);
  assert.equal(out.id, 'lamberson-20260727-1200');
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'president@example.org');
  assert.equal(mailer.sent[0].attachments[0].filename, 'lamberson-20260727-1200.pdf');
  assert.ok(Buffer.isBuffer(mailer.sent[0].attachments[0].content));
  await app.close();
}));

test('failed bot check is rejected 400', withTurnstile(false, async () => {
  const mailer = fakeMailer();
  const app = buildApp({ cfg: baseCfg, mailer, logger: false });
  const res = await app.inject({ method: 'POST', url: '/api/submit', payload: validBody() });
  assert.equal(res.statusCode, 400);
  assert.equal(mailer.sent.length, 0);
  await app.close();
}));

test('closed deadline is rejected 403', withTurnstile(true, async () => {
  const cfg = { ...baseCfg, deadlines: { hurdle: new Date('2000-01-01'), lamberson: new Date('2000-01-01') } };
  const mailer = fakeMailer();
  const app = buildApp({ cfg, mailer, logger: false });
  const res = await app.inject({ method: 'POST', url: '/api/submit', payload: validBody() });
  assert.equal(res.statusCode, 403);
  assert.equal(mailer.sent.length, 0);
  await app.close();
}));

test('invalid submission is rejected 422', withTurnstile(true, async () => {
  const mailer = fakeMailer();
  const app = buildApp({ cfg: baseCfg, mailer, logger: false });
  const res = await app.inject({ method: 'POST', url: '/api/submit', payload: validBody({ essay: 'short' }) });
  assert.equal(res.statusCode, 422);
  assert.equal(mailer.sent.length, 0);
  await app.close();
}));

test('blinding: Hurdle PDF carries no identity fields, Lamberson carries all', () => {
  // Hurdle is blinded — identity fields are never selected for the PDF.
  const hurdle = pdfBodyFields('hurdle', {
    applicantName: 'Jane Doe', telephone: '757-555-1212', pool: 'Marlbank', essay: essay(300),
  });
  assert.deepEqual(hurdle, []);

  // Lamberson is not blinded — its fields flow into the PDF.
  const lamberson = pdfBodyFields('lamberson', {
    coachName: 'Coach A', pool: 'Marlbank', essayWriterName: 'Parent B',
    relationshipToCoach: 'Parent', telephone: '757-555-1212',
  });
  assert.ok(lamberson.some((f) => f.value === 'Coach A'), 'coach name must be in the Lamberson PDF fields');
  assert.equal(lamberson.length, 5);
});

test('renderPdf produces a non-empty PDF buffer for both awards', async () => {
  for (const awardId of ['hurdle', 'lamberson']) {
    const pdf = await renderPdf({
      awardId, submissionId: `${awardId}-x`,
      data: { coachName: 'C', applicantName: 'A', essay: essay(300) }, words: 300, season: '2026',
    });
    assert.ok(Buffer.isBuffer(pdf) && pdf.length > 500);
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  }
});
