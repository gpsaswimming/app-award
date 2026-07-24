import { AWARDS } from './constants.js';
import { verifyTurnstile } from './turnstile.js';
import { validateSubmission } from './validate.js';
import { renderPdf } from './pdf.js';
import { sendSubmissionEmail, sendReceiptEmail } from './email.js';
import { makeSubmissionId } from './util.js';

// POST /api/submit — Turnstile → deadline → validate → PDF → email. Stateless:
// nothing is persisted. `now` and `mailer` are injectable for testing.
export function makeSubmitHandler({ cfg, mailer, now = () => new Date() }) {
  return async function submitHandler(request, reply) {
    const body = request.body || {};
    const awardId = String(body.award || '').trim();
    const award = AWARDS[awardId];
    if (!award) return reply.code(400).send({ ok: false, error: 'Unknown or missing award.' });

    // 1. Bot gate (fail-closed).
    const token = body['cf-turnstile-response'] || body.turnstileToken;
    const ip = request.headers['cf-connecting-ip'] || request.ip;
    const human = await verifyTurnstile(cfg.turnstileSecret, token, ip);
    if (!human) return reply.code(400).send({ ok: false, error: 'Bot check failed. Please try again.' });

    // 2. Deadline (server clock is authoritative).
    if (now() > cfg.deadlines[awardId]) {
      return reply.code(403).send({ ok: false, error: 'Submissions for this award are closed.' });
    }

    // 3. Validate.
    const result = validateSubmission(awardId, body);
    if (!result.ok) return reply.code(422).send({ ok: false, error: result.error });

    // 4. Render + deliver.
    const submissionId = makeSubmissionId(awardId, now(), cfg.timeZone);
    try {
      const pdf = await renderPdf({
        awardId, submissionId, data: result.data, words: result.words, season: cfg.season,
      });
      await sendSubmissionEmail(mailer, cfg, {
        awardId, submissionId, data: result.data, words: result.words, pdf,
      });
    } catch (err) {
      request.log.error({ err }, 'submission processing failed');
      return reply.code(502).send({ ok: false, error: 'Could not deliver your submission. Please try again shortly.' });
    }

    // Best-effort confirmation receipt to the submitter — never fail the
    // submission if only the receipt bounces (the president's copy is what counts).
    if (result.data.email) {
      try {
        await sendReceiptEmail(mailer, cfg, { awardId, submissionId, toEmail: result.data.email });
      } catch (err) {
        request.log.warn({ err }, 'submitter receipt email failed (non-fatal)');
      }
    }

    return reply.send({ ok: true, id: submissionId });
  };
}
