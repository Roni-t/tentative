from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.recurrence import RecurrenceRule


class RecurrenceService:
    def set_recurrence(
        self,
        event_id: int,
        frequency: str,
        interval: int,
        days_of_week: str,
        end_date: Optional[datetime],
        db: Session
    ) -> RecurrenceRule:
        rule = db.query(RecurrenceRule).filter(RecurrenceRule.event_id == event_id).first()
        now = datetime.now(timezone.utc)
        if not rule:
            rule = RecurrenceRule(
                event_id=event_id,
                frequency=frequency,
                interval=interval,
                days_of_week=days_of_week,
                end_date=end_date,
                created_at=now
            )
            db.add(rule)
        else:
            rule.frequency = frequency
            rule.interval = interval
            rule.days_of_week = days_of_week
            rule.end_date = end_date

        db.commit()
        db.refresh(rule)
        return rule

    def preview_occurrences(
        self,
        event: Event,
        rule: Optional[RecurrenceRule],
        count: int = 6
    ) -> List[Dict]:
        """Generate list of future occurrences based on recurrence parameters."""
        occurrences = []
        base_time = event.finalized_start_time or datetime.now(timezone.utc)
        time_str = event.daily_start_time

        step_days = 7 if not rule or rule.frequency == "weekly" else 14
        
        current_date = base_time
        for i in range(count):
            occurrences.append({
                "index": i + 1,
                "date": current_date.strftime("%a, %b %d, %Y"),
                "time": time_str,
                "iso": current_date.isoformat()
            })
            current_date += timedelta(days=step_days)
            if rule and rule.end_date and current_date > rule.end_date.replace(tzinfo=timezone.utc):
                break

        return occurrences


recurrence_service = RecurrenceService()
