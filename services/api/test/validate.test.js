import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission } from '../src/validate.js';

const essay = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const goodLamberson = {
  coachName: 'Coach A',
  pool: 'Marlbank',
  essayWriterName: 'Parent B',
  relationshipToCoach: 'Parent',
  telephone: '757-555-1212',
  essay: essay(300),
};

test('valid lamberson submission passes', () => {
  const r = validateSubmission('lamberson', goodLamberson);
  assert.equal(r.ok, true);
  assert.equal(r.words, 300);
});

test('missing required field fails', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, coachName: '' });
  assert.equal(r.ok, false);
  assert.match(r.error, /required/i);
});

test('essay under the band fails', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, essay: 'too short' });
  assert.equal(r.ok, false);
  assert.match(r.error, /words/i);
});

test('essay over the band fails', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, essay: essay(751) });
  assert.equal(r.ok, false);
});

test('invalid pool option is rejected', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, pool: 'Nonexistent Pool' });
  assert.equal(r.ok, false);
});

test('unknown award is rejected', () => {
  const r = validateSubmission('nope', {});
  assert.equal(r.ok, false);
});
