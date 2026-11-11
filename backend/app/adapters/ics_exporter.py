import urllib.parse
from datetime import datetime, timezone


def format_ics_datetime(dt: datetime) -> str:
    """Format datetime as iCalendar UTC string (e.g. 20260916T190000Z)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def escape_ics_text(text: str) -> str:
    """Escape special characters for iCalendar format."""
    if not text:
        return ""
    text = text.replace("\\", "\\\\")
    text = text.replace(";", "\\;")
    text = text.replace(",", "\\,")
    text = text.replace("\n", "\\n")
    return text


def generate_ics(
    event_id: int,
    title: str,
    description: str,
    location: str,
    start_time: datetime,
    end_time: datetime,
    organizer_name: str = "Tentative App"
) -> str:
    """Generate RFC 5545 compliant iCalendar string."""
    dtstamp = format_ics_datetime(datetime.now(timezone.utc))
    dtstart = format_ics_datetime(start_time)
    dtend = format_ics_datetime(end_time)
    uid = f"tentative-event-{event_id}-{int(start_time.timestamp())}@tentative.space"
    
    clean_title = escape_ics_text(title)
    clean_desc = escape_ics_text(description or "")
    clean_loc = escape_ics_text(location or "")
    
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tentative//Group Scheduling App//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:{clean_title}",
        f"DESCRIPTION:{clean_desc}",
        f"LOCATION:{clean_loc}",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    return "\r\n".join(ics_lines) + "\r\n"


def generate_google_calendar_url(
    title: str,
    description: str,
    location: str,
    start_time: datetime,
    end_time: datetime
) -> str:
    """Generate Add to Google Calendar direct link."""
    dtstart = format_ics_datetime(start_time)
    dtend = format_ics_datetime(end_time)
    dates = f"{dtstart}/{dtend}"
    
    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": dates,
        "details": description or "Scheduled with Tentative",
        "location": location or ""
    }
    return f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"
