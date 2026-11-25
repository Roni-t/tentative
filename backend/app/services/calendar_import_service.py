"""NF-10 Import events from an external calendar (owner: Reese; implemented by Divyam).

A participant uploads a .ics file exported from Google, Apple or Outlook calendar. Every event in it
counts as busy time; the slots of this Tentative event that don't overlap any busy time are returned
as free, so the availability grid can be pre-filled. Nothing is saved until the participant clicks Save.
Only start and end times are read; titles and other calendar details are never stored (NFR-5).
"""
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

from app.models.event import Event

MAX_ICS_BYTES = 1_000_000
Busy = Tuple[datetime, datetime]


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _unfold(text: str) -> List[str]:
    """ICS lines may be folded: a line starting with a space or tab continues the previous one."""
    lines: List[str] = []
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if raw[:1] in (" ", "\t") and lines:
            lines[-1] += raw[1:]
        elif raw:
            lines.append(raw)
    return lines


def _parse_time(prop: str, value: str, default_tz: ZoneInfo) -> Tuple[datetime, bool]:
    """Return (UTC datetime, is_all_day) for a DTSTART/DTEND line."""
    params = {}
    for part in prop.split(";")[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            params[k.upper()] = v
    value = value.strip()
    if params.get("VALUE", "").upper() == "DATE" or (len(value) == 8 and value.isdigit()):
        d = datetime.strptime(value, "%Y%m%d")
        return d.replace(tzinfo=default_tz).astimezone(timezone.utc), True
    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc), False
    try:
        tz = ZoneInfo(params["TZID"]) if "TZID" in params else default_tz
    except Exception:
        tz = default_tz
    return datetime.strptime(value[:15], "%Y%m%dT%H%M%S").replace(tzinfo=tz).astimezone(timezone.utc), False


def parse_busy_times(ics_text: str, default_tz: ZoneInfo) -> List[Busy]:
    if len(ics_text.encode("utf-8")) > MAX_ICS_BYTES:
        raise _bad_request("Calendar file is too large (limit 1 MB).")
    if "BEGIN:VCALENDAR" not in ics_text.upper():
        raise _bad_request("That file is not a calendar (.ics) file.")

    busy: List[Busy] = []
    current: Optional[dict] = None
    for line in _unfold(ics_text):
        if ":" not in line:
            continue
        prop, value = line.split(":", 1)
        name = prop.split(";")[0].upper()
        if name == "BEGIN" and value.strip().upper() == "VEVENT":
            current = {}
        elif name == "END" and value.strip().upper() == "VEVENT" and current is not None:
            if "start" in current and current.get("status") != "CANCELLED" and current.get("transp") != "TRANSPARENT":
                start, all_day = current["start"]
                if "end" in current:
                    end = current["end"][0]
                else:
                    end = start + (timedelta(days=1) if all_day else timedelta(hours=1))
                if end > start:
                    busy.append((start, end))
            current = None
        elif current is not None:
            try:
                if name == "DTSTART":
                    current["start"] = _parse_time(prop, value, default_tz)
                elif name == "DTEND":
                    current["end"] = _parse_time(prop, value, default_tz)
            except ValueError:
                raise _bad_request("The calendar file has a date this app can't read.")
            if name == "STATUS":
                current["status"] = value.strip().upper()
            elif name == "TRANSP":
                current["transp"] = value.strip().upper()
    return busy


def event_slots(event: Event) -> List[Busy]:
    """Every slot of the event's grid, in UTC (same slots the availability grid and heatmap use)."""
    tz = ZoneInfo(event.timezone or "UTC")
    sh, sm = map(int, (event.daily_start_time or "09:00").split(":"))
    eh, em = map(int, (event.daily_end_time or "21:00").split(":"))
    step = timedelta(minutes=max(15, event.slot_duration_minutes or 30))
    slots: List[Busy] = []
    for day in sorted(event.candidate_dates or []):
        d = date.fromisoformat(day)
        cur = datetime(d.year, d.month, d.day, sh, sm, tzinfo=tz).astimezone(timezone.utc)
        day_end = datetime(d.year, d.month, d.day, eh, em, tzinfo=tz).astimezone(timezone.utc)
        while cur + step <= day_end:
            slots.append((cur, cur + step))
            cur += step
    return slots


def free_slots(event: Event, ics_text: str) -> dict:
    busy = parse_busy_times(ics_text, ZoneInfo(event.timezone or "UTC"))
    all_slots = event_slots(event)
    free = [s for s in all_slots if not any(b_start < s[1] and b_end > s[0] for b_start, b_end in busy)]
    iso = lambda dt: dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "busy_events_found": len(busy),
        "total_slots": len(all_slots),
        "free_slots": [{"start_time": iso(s), "end_time": iso(e)} for s, e in free],
    }
