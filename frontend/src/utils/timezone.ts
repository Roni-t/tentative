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
const HOUR_MS = 60 * 60 * 1000;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Parse an API datetime. The backend stores UTC; naive strings are UTC, not browser-local. */
export function parseUtc(isoString: string): Date {
  return new Date(ZONE_SUFFIX.test(isoString) ? isoString : `${isoString}Z`);
}

function getZonedParts(date: Date, timeZone: string | undefined): ZonedParts {
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

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

/** Offset (in ms) of a timezone at a given instant: local wall-clock minus UTC. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    ) - date.getTime()
  );
}

function isValidWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): boolean {
  const values = [year, month, day, hour, minute];
  if (!values.every(Number.isInteger)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;

  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day &&
    probe.getUTCHours() === hour &&
    probe.getUTCMinutes() === minute
  );
}

export function zonedTimeToUtcOccurrences(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date[] {
  if (!isValidWallClock(year, month, day, hour, minute)) return [];

  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  let offsets: number[];

  try {
    offsets = Array.from(
      new Set(
        [-48, -24, 0, 24, 48].map((hours) =>
          getTimeZoneOffsetMs(new Date(wallClockUtc + hours * HOUR_MS), timeZone)
        )
      )
    );
  } catch {
    return [];
  }

  const results: Date[] = [];
  const seen = new Set<number>();

  for (const offset of offsets) {
    const candidate = new Date(wallClockUtc - offset);
    const parts = getZonedParts(candidate, timeZone);
    const matches =
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute &&
      getTimeZoneOffsetMs(candidate, timeZone) === offset;

    if (!matches || seen.has(candidate.getTime())) continue;
    seen.add(candidate.getTime());
    results.push(candidate);
  }

  return results.sort((a, b) => a.getTime() - b.getTime());
}

/** Convert a wall-clock date/time in an IANA timezone to its first matching UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date | null {
  return zonedTimeToUtcOccurrences(year, month, day, hour, minute, timeZone)[0] ?? null;
}

export function zonedTimeToUtcWindowEnd(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date | null {
  if (!isValidWallClock(year, month, day, hour, minute)) return null;
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  try {
    return new Date(wallClockUtc - getTimeZoneOffsetMs(new Date(wallClockUtc), timeZone));
  } catch {
    return null;
  }
}

export interface WallClockSlot {
  start: Date;
  end: Date;
  hour: number;
  minute: number;
}

export function getWallClockSlots(
  year: number,
  month: number,
  day: number,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  slotDurationMinutes: number,
  timeZone: string
): WallClockSlot[] {
  const windowEnd = zonedTimeToUtcWindowEnd(year, month, day, endHour, endMinute, timeZone);
  if (!windowEnd) return [];

  const slots: WallClockSlot[] = [];
  let curHour = startHour;
  let curMinute = startMinute;
  const endTotal = endHour * 60 + endMinute;

  while (curHour * 60 + curMinute < endTotal) {
    for (const start of zonedTimeToUtcOccurrences(year, month, day, curHour, curMinute, timeZone)) {
      const end = new Date(start.getTime() + slotDurationMinutes * 60 * 1000);
      if (end.getTime() <= windowEnd.getTime()) {
        slots.push({ start, end, hour: curHour, minute: curMinute });
      }
    }

    curMinute += slotDurationMinutes;
    if (curMinute >= 60) {
      curHour += Math.floor(curMinute / 60);
      curMinute = curMinute % 60;
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Convert a `<input type="datetime-local">` value (wall clock in `timeZone`) to a UTC ISO string. */
export function wallClockToUtcIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/.exec(
    value.trim()
  );
  if (!match) return null;

  const [, y, mo, d, h, mi] = match;
  const instant = zonedTimeToUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi), timeZone);
  return instant ? instant.toISOString() : null;
}

export function getWallClockDateTimeError(value: string, timeZone: string): string | null {
  if (!value) return null;
  return wallClockToUtcIso(value, timeZone)
    ? null
    : `Choose a valid date and time in ${timeZone}.`;
}

/** YYYY-MM-DD key for the calendar day an instant falls on in a timezone. */
export function getDateKeyInTimeZone(isoString: string, timeZone?: string): string {
  try {
    const parts = getZonedParts(parseUtc(isoString), timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/** Format an instant in a specific timezone (falls back to the browser timezone). */
export function formatInstant(
  isoString: string,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(parseUtc(isoString));
  } catch {
    try {
      return new Intl.DateTimeFormat('en-US', options).format(parseUtc(isoString));
    } catch {
      return '';
    }
  }
}

export function getTimeZoneAbbreviation(date: Date, timeZone: string): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}
