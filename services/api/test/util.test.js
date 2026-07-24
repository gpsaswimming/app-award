import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, countWords, makeSubmissionId } from '../src/util.js';

test('escapeHtml escapes all specials', () => {
  assert.equal(
    escapeHtml(`<a href="x">'&'</a>`),
    '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
  );
});

test('countWords collapses whitespace and handles empties', () => {
  assert.equal(countWords('  hello   world '), 2);
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords('one\ntwo\tthree'), 3);
});

test('makeSubmissionId formats award-YYYYMMDD-HHmm in the given zone', () => {
  const id = makeSubmissionId('hurdle', new Date('2026-07-27T18:32:00Z'), 'UTC');
  assert.equal(id, 'hurdle-20260727-1832');
});
