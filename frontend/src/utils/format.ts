import { format, parseISO } from 'date-fns';

export function formatSlotTime(isoString: string): string {
  try {
    const d = parseISO(isoString);
    return format(d, 'h:mm a');
  } catch {
    return isoString;
  }
}

export function formatSlotRange(startIso: string, endIso: string): string {
  try {
    const s = parseISO(startIso);
    const e = parseISO(endIso);
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
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

export function formatDateTimeLong(isoString?: string | null): string {
  if (!isoString) return 'Not finalized';
  try {
    const d = parseISO(isoString);
    return format(d, 'EEEE, MMMM d, yyyy · h:mm a');
  } catch {
    return isoString;
  }
}
