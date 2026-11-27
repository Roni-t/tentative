"""UC-11 Host can set recurring events (FR-1, owner: Aaron; implemented by Divyam on main).

A host or co-host saves a weekly or every-other-week pattern (which weekdays, until which date).
The series starts from the event's finalized day, or its first candidate day if not finalized yet.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.recurrence import RecurrenceRule

DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]  # index matches date.weekday()
FREQUENCIES = {"weekly": 1, "biweekly": 2}  # weeks between repeats
MAX_SERIES_DAYS = 366


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class RecurrenceService:
    @staticmethod
    def series_start(event: Event) -> date:
        """First day of the series, in the event's own timezone."""
        if event.finalized_start_time:
            start = event.finalized_start_time
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            try:
                return start.astimezone(ZoneInfo(event.timezone or "UTC")).date()
            except Exception:
                return start.date()
        if event.candidate_dates:
            return date.fromisoformat(sorted(event.candidate_dates)[0])
        raise _bad_request("Add at least one candidate date before setting a recurrence.")

    @staticmethod
    def parse_days(days_of_week: str) -> List[str]:
        codes = [c.strip().upper() for c in (days_of_week or "").split(",") if c.strip()]
        if not codes:
            raise _bad_request("Pick at least one day of the week.")
        unknown = [c for c in codes if c not in DAY_CODES]
        if unknown:
            raise _bad_request(f"Unknown day code: {', '.join(unknown)}. Use MO, TU, WE, TH, FR, SA, SU.")
        # Keep Monday-to-Sunday order and drop duplicates
        return [c for c in DAY_CODES if c in codes]

    def validate(self, event: Event, frequency: str, days_of_week: str, end_date: date) -> List[str]:
        if event.status == "canceled":
            raise _bad_request("Cannot set a recurrence on a canceled event.")
        if frequency not in FREQUENCIES:
            raise _bad_request("Frequency must be 'weekly' or 'biweekly'.")
        days = self.parse_days(days_of_week)
        start = self.series_start(event)
        if end_date <= start:
            raise _bad_request("End date must be after the first meeting date.")
        if (end_date - start).days > MAX_SERIES_DAYS:
            raise _bad_request("A recurring series can last at most one year.")
        return days

    def occurrences(self, event: Event, frequency: str, days: List[str], end_date: date, limit: int = 52) -> List[str]:
        """Dates (YYYY-MM-DD) in the series, starting on the first day and stopping at end_date."""
        start = self.series_start(event)
        week_step = FREQUENCIES[frequency]
        found: List[str] = []
        current = start
        while current <= end_date and len(found) < limit:
            weeks_since_start = (current - start).days // 7
            if weeks_since_start % week_step == 0 and DAY_CODES[current.weekday()] in days:
                found.append(current.isoformat())
            current += timedelta(days=1)
        return found

    def get_rule(self, event_id: int, db: Session) -> Optional[RecurrenceRule]:
        return db.query(RecurrenceRule).filter(RecurrenceRule.event_id == event_id).first()

    def set_recurrence(self, event: Event, frequency: str, days_of_week: str, end_date: date, db: Session) -> RecurrenceRule:
        days = self.validate(event, frequency, days_of_week, end_date)
        rule = self.get_rule(event.id, db)
        end_dt = datetime.combine(end_date, datetime.min.time())
        if not rule:
            rule = RecurrenceRule(event_id=event.id, created_at=datetime.now(timezone.utc))
            db.add(rule)
        rule.frequency = frequency
        rule.interval = FREQUENCIES[frequency]
        rule.days_of_week = ",".join(days)
        rule.end_date = end_dt
        db.commit()
        db.refresh(rule)
        return rule

    def remove(self, event_id: int, db: Session) -> None:
        rule = self.get_rule(event_id, db)
        if rule:
            db.delete(rule)
            db.commit()

    def to_out(self, event: Event, rule: Optional[RecurrenceRule]) -> Dict:
        if not rule:
            return {"event_id": event.id, "is_recurring": False, "frequency": None,
                    "days_of_week": [], "end_date": None, "occurrences": []}
        days = self.parse_days(rule.days_of_week)
        end = rule.end_date.date()
        return {
            "event_id": event.id,
            "is_recurring": True,
            "frequency": rule.frequency,
            "days_of_week": days,
            "end_date": end.isoformat(),
            "occurrences": self.occurrences(event, rule.frequency, days, end),
        }


recurrence_service = RecurrenceService()
