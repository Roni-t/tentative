import urllib.parse
from datetime import datetime
from app.core.timefmt import to_utc


def calendar_time(dt: datetime) -> str:
    # Calendars want UTC times like 20261205T010000Z
    return to_utc(dt).strftime("%Y%m%dT%H%M%SZ")


def escape_text(text: str) -> str:
    # Characters with a special meaning in .ics files have to be escaped
    text = (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
    return text.replace("\r\n", "\n").replace("\n", "\\n")


def make_ics(event) -> str:
    """Build the text of a .ics file for a finalized event."""
    start = calendar_time(event.finalized_start_time)
    end = calendar_time(event.finalized_end_time or event.finalized_start_time)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tentative//Group Scheduling//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:tentative-event-{event.id}-{start}@tentative",
        f"DTSTAMP:{calendar_time(event.updated_at or event.finalized_start_time)}",
        f"DTSTART:{start}",
        f"DTEND:{end}",
        f"SUMMARY:{escape_text(event.title)}",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    # Only add these lines when the event has them
    if event.location:
        lines.insert(-3, f"LOCATION:{escape_text(event.location)}")
    if event.description:
        lines.insert(-3, f"DESCRIPTION:{escape_text(event.description)}")
    return "\r\n".join(lines) + "\r\n"


def google_calendar_url(event) -> str:
    """Build a link that opens Google Calendar with the event filled in."""
    start = calendar_time(event.finalized_start_time)
    end = calendar_time(event.finalized_end_time or event.finalized_start_time)
    params = {
        "action": "TEMPLATE",
        "text": event.title,
        "dates": f"{start}/{end}",
        "details": event.description or "Scheduled with Tentative",
        "location": event.location or "",
    }
    return "https://calendar.google.com/calendar/render?" + urllib.parse.urlencode(params)
