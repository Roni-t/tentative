"""Timezone helpers for showing UTC instants to people in their own local time (FR-6, FR-16)."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def is_valid_timezone(name: str) -> bool:
    try:
        ZoneInfo(name)
        return True
    except (ZoneInfoNotFoundError, ValueError):
        return False


def to_utc(dt: datetime) -> datetime:
    """Interpret naive datetimes as UTC and convert aware ones to UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def format_local(dt: datetime, tz_name: str) -> str:
    """Format an instant like "Wed, Nov 25, 5:00 PM CST" in the given IANA timezone."""
    local = to_utc(dt).astimezone(ZoneInfo(tz_name))
    hour = local.hour % 12 or 12
    return f"{local:%a, %b} {local.day}, {hour}:{local:%M %p %Z}"
