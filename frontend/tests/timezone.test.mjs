import assert from 'node:assert/strict';
import { test } from 'node:test';

const timezone = await import('../dist-test/timezone.js');

test('repeated local time in fall-back maps to both UTC instants', () => {
  assert.equal(typeof timezone.zonedTimeToUtcOccurrences, 'function');
  const starts = timezone
    .zonedTimeToUtcOccurrences(2026, 11, 1, 1, 30, 'America/New_York')
    .map((date) => date.toISOString());

  assert.deepEqual(starts, [
    '2026-11-01T05:30:00.000Z',
    '2026-11-01T06:30:00.000Z',
  ]);
});

test('nonexistent local time in spring-forward is rejected', () => {
  assert.deepEqual(
    timezone.zonedTimeToUtcOccurrences(2026, 3, 8, 2, 30, 'America/New_York'),
    []
  );
  assert.equal(
    timezone.zonedTimeToUtc(2026, 3, 8, 2, 30, 'America/New_York'),
    null
  );
});

test('valid wall-clock time still maps to one UTC instant', () => {
  assert.deepEqual(
    timezone
      .zonedTimeToUtcOccurrences(2026, 7, 1, 9, 0, 'America/New_York')
      .map((date) => date.toISOString()),
    ['2026-07-01T13:00:00.000Z']
  );
});
