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
  email: 'parent@example.org',
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

test('missing email fails', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, email: '' });
  assert.equal(r.ok, false);
  assert.match(r.error, /required/i);
});

test('malformed email fails', () => {
  const r = validateSubmission('lamberson', { ...goodLamberson, email: 'not-an-email' });
  assert.equal(r.ok, false);
  assert.match(r.error, /valid email/i);
});

test('unknown award is rejected', () => {
  const r = validateSubmission('nope', {});
  assert.equal(r.ok, false);
});

const goodHurdle = {
  applicantName: 'Jane Doe',
  streetAddress: '123 Main St',
  city: 'Newport News',
  state: 'VA',
  zip: '23601',
  telephone: '(757) 555-1212',
  email: 'jane@example.org',
  dateOfBirth: '2008-05-01',
  pool: 'Marlbank',
  yearsInGPSA: '10',
  schoolToAttend: 'State U',
  alreadyAccepted: 'Yes',
  essay: essay(300),
};

test('valid hurdle submission passes', () => {
  const r = validateSubmission('hurdle', goodHurdle);
  assert.equal(r.ok, true);
});

test('hurdle missing city fails', () => {
  const r = validateSubmission('hurdle', { ...goodHurdle, city: '' });
  assert.equal(r.ok, false);
  assert.match(r.error, /City is required/i);
});

test('hurdle invalid state option is rejected', () => {
  const r = validateSubmission('hurdle', { ...goodHurdle, state: 'ZZ' });
  assert.equal(r.ok, false);
});

test('hurdle malformed zip fails the pattern', () => {
  const r = validateSubmission('hurdle', { ...goodHurdle, zip: 'ABCDE' });
  assert.equal(r.ok, false);
  assert.match(r.error, /format/i);
});

test('hurdle accepts zip+4', () => {
  const r = validateSubmission('hurdle', { ...goodHurdle, zip: '23601-1234' });
  assert.equal(r.ok, true);
});
