import { format } from 'date-fns';
import {
  formatInstant,
  getTimeZoneAbbreviation,
  getUserTimezone,
  parseUtc,
} from './timezone';

export function formatSlotTime(isoString: string, timeZone?: string): string {
  try {
    return formatInstant(isoString, timeZone, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export function formatSlotTimeWithZone(isoString: string, timeZone?: string): string {
  const zone = timeZone || getUserTimezone();
  const suffix = getTimeZoneAbbreviation(parseUtc(isoString), zone);
  const time = formatSlotTime(isoString, zone);
  return suffix ? `${time} ${suffix}` : time;
}

export function formatSlotRange(startIso: string, endIso: string, timeZone?: string): string {
  try {
    return `${formatSlotTimeWithZone(startIso, timeZone)} – ${formatSlotTimeWithZone(endIso, timeZone)}`;
  } catch {
    return `${startIso} - ${endIso}`;
  }
}

export function formatDateHeading(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return format(d, 'EEE, MMM d');
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDayName(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return format(d, 'EEEE');
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDateSub(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return format(d, 'MMM d');
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDateInZone(isoString: string, timeZone?: string, long = false): string {
  try {
    return formatInstant(
      isoString,
      timeZone,
      long
        ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        : { weekday: 'long', month: 'short', day: 'numeric' }
    );
  } catch {
    return isoString;
  }
}

export function formatDateTimeLong(isoString?: string | null, timeZone?: string): string {
  if (!isoString) return 'Not finalized';
  try {
    return `${formatDateInZone(isoString, timeZone, true)} · ${formatSlotTime(isoString, timeZone)}`;
  } catch {
    return isoString;
  }
}
