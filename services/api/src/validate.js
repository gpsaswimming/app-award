import { AWARDS } from './constants.js';
import { countWords } from './util.js';

// Server-authoritative validation of a submission for a given award. Returns
// { ok, data, words } on success or { ok:false, error } with a human-readable
// message. Client-side checks are UX only — this is the real gate.
export function validateSubmission(awardId, payload = {}) {
  const award = AWARDS[awardId];
  if (!award) return { ok: false, error: 'Unknown award.' };

  const errors = [];
  const data = {};

  for (const field of award.fields) {
    const value = payload[field.key] == null ? '' : String(payload[field.key]).trim();
    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (value && field.options && !field.options.includes(value)) {
      errors.push(`${field.label} has an invalid value.`);
      continue;
    }
    data[field.key] = value;
  }

  const essay = payload.essay == null ? '' : String(payload.essay).trim();
  const words = countWords(essay);
  if (!essay) {
    errors.push('Essay is required.');
  } else if (words < award.essay.min || words > award.essay.max) {
    errors.push(`Essay must be ${award.essay.min}–${award.essay.max} words (yours is ${words}).`);
  }
  data.essay = essay;

  if (errors.length) return { ok: false, error: errors.join(' '), errors };
  return { ok: true, data, words };
}
