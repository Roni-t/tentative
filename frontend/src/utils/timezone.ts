export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'UTC',
];

const ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Parse an API datetime. The backend stores UTC; naive strings are UTC, not browser-local. */
export function parseUtc(isoString: string): Date {
  return new Date(ZONE_SUFFIX.test(isoString) ? isoString : `${isoString}Z`);
}

/** Offset (in ms) of a timezone at a given instant: local wall-clock minus UTC. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second')
  );
  return asUtc - date.getTime();
}

/** Convert a wall-clock date/time in an IANA timezone to the matching UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const guess = new Date(utcGuess);
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  let result = new Date(utcGuess - offset);
  const adjustedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (adjustedOffset !== offset) {
    result = new Date(utcGuess - adjustedOffset);
  }
  return result;
}

/** Convert a `<input type="datetime-local">` value (wall clock in `timeZone`) to a UTC ISO string. */
export function wallClockToUtcIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return zonedTimeToUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi), timeZone).toISOString();
}

/** YYYY-MM-DD key for the calendar day an instant falls on in a timezone. */
export function getDateKeyInTimeZone(isoString: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parseUtc(isoString));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Format an instant in a specific timezone (falls back to the browser timezone). */
export function formatInstant(
  isoString: string,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(parseUtc(isoString));
}
