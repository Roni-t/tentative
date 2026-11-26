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

test('window end uses the pre-transition offset for nonexistent times', () => {
  assert.equal(typeof timezone.zonedTimeToUtcWindowEnd, 'function');
  assert.equal(
    timezone
      .zonedTimeToUtcWindowEnd(2026, 3, 8, 2, 0, 'America/New_York')
      ?.toISOString(),
    '2026-03-08T07:00:00.000Z'
  );
});

test('grid omits a slot whose end passes the window end', () => {
  assert.equal(typeof timezone.getWallClockSlots, 'function');
  const slots = timezone.getWallClockSlots(
    2026,
    3,
    8,
    1,
    30,
    2,
    0,
    60,
    'America/New_York'
  );
  assert.deepEqual(slots, []);
});

test('grid keeps repeated slots that fit inside the window', () => {
  const starts = timezone
    .getWallClockSlots(2026, 11, 1, 1, 0, 2, 30, 30, 'America/New_York')
    .map((slot) => slot.start.toISOString());
  assert.deepEqual(starts, [
    '2026-11-01T05:00:00.000Z',
    '2026-11-01T05:30:00.000Z',
    '2026-11-01T06:00:00.000Z',
  ]);
});

test('invalid custom time is rejected instead of falling back to a default', () => {
  assert.equal(typeof timezone.getWallClockDateTimeError, 'function');
  assert.equal(
    timezone.getWallClockDateTimeError('2026-03-08T02:30', 'America/New_York'),
    'Choose a valid date and time in America/New_York.'
  );
  assert.ok(timezone.getWallClockDateTimeError('not-a-date', 'UTC'));
  assert.equal(
    timezone.getWallClockDateTimeError('2026-03-08T01:30', 'America/New_York'),
    null
  );
});
