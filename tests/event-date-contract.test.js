const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVENT_DATE = '2026-10-03';
const EVENT_COPY = 'Saturday, October 3, 2026';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('next event date is really a Saturday', function () {
  assert.equal(new Date(EVENT_DATE + 'T12:00:00Z').getUTCDay(), 6);
});

test('landing metadata, schema, hero, and countdown share the locked event date', function () {
  const index = read('index.html');
  const main = read('js/main.js');
  assert.match(index, new RegExp(EVENT_COPY));
  assert.match(index, /"startDate": "2026-10-03"/);
  assert.match(index, /class="event-dy">3<\/span>/, 'the split, large visual day must match the event');
  assert.match(main, /new Date\('2026-10-03T00:00:00'\)/);
  assert.doesNotMatch(index, /Global 100K Day(?:&nbsp;|\s)*#\d+/i);
});

test('active event surfaces contain no stale June date or unsupported event number', function () {
  [
    'index.html',
    'tiers.html',
    'sun.html',
    'leaderboard.html',
    'js/main.js',
    'css/style.css',
    'CLAUDE.md'
  ].forEach(function (file) {
    const source = read(file);
    assert.doesNotMatch(source, /June 28|2026-06-28|September 2[68]|2026-09-2[68]/i, file);
    assert.doesNotMatch(source, /Global 100K Day(?:&nbsp;|\s)*#\d+/i, file);
  });
});
