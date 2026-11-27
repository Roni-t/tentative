// Helpers for showing and building times in an event's time zone.
// Event dates and daily windows (like "12:00") are wall-clock times in the event's zone,
// so they have to be converted to real instants before they are sent to the server.

const partsCache: Record<string, Intl.DateTimeFormat> = {};

const getFormatter = (tz: string) => {
  if (!partsCache[tz]) {
    partsCache[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  return partsCache[tz];
};

// How far ahead of UTC the zone is at this moment, in milliseconds
const zoneOffsetMs = (timestamp: number, tz: string): number => {
  const parts: Record<string, number> = {};
  for (const p of getFormatter(tz).formatToParts(new Date(timestamp))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
};

// "2026-12-02" at 12:00 in America/Chicago -> the matching UTC instant
export const zonedWallTimeToUtc = (dateStr: string, hour: number, minute: number, tz: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  // Apply the offset twice so times near a daylight saving change still come out right
  const first = guess - zoneOffsetMs(guess, tz);
  return new Date(guess - zoneOffsetMs(first, tz));
};

// The calendar date (YYYY-MM-DD) of an instant, as seen in the zone
export const dateKeyInZone = (iso: string, tz: string): string => {
  const parts: Record<string, string> = {};
  for (const p of getFormatter(tz).formatToParts(new Date(iso))) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const timeInZone = (iso: string, tz: string): string =>
  new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });

export const timeRangeInZone = (startIso: string, endIso: string, tz: string): string =>
  `${timeInZone(startIso, tz)} – ${timeInZone(endIso, tz)}`;

// "Wednesday, Sep 16"
export const shortDateInZone = (iso: string, tz: string): string =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'short', day: 'numeric' });

// "Wednesday, September 16, 2026"
export const longDateInZone = (iso: string, tz: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
