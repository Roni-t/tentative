from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.encryption import hash_phone, normalize_phone
from app.core.timefmt import is_valid_timezone, to_utc
from app.models.event import BlockedUser, Event, EventCoHost, Group
from app.models.changelog import ChangeLogEntry
from app.models.shareable_url import ShareableURL
from app.models.user import User
from app.schemas.event import EventCreatePayload, EventUpdatePayload
from app.services.share_link_service import share_link_service


class EventService:
    def create_event(self, payload: EventCreatePayload, creator: User, db: Session) -> Event:
        now = datetime.now(timezone.utc)
        if not is_valid_timezone(payload.timezone):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown timezone '{payload.timezone}'.")
        
        group_id = None
        if payload.group_name and payload.group_name.strip():
            group = Group(name=payload.group_name.strip(), created_by_id=creator.id, created_at=now)
            db.add(group)
            db.commit()
            db.refresh(group)
            group_id = group.id

        event = Event(
            title=payload.title,
            description=payload.description,
            location=payload.location,
            timezone=payload.timezone,
            candidate_dates=payload.candidate_dates,
            daily_start_time=payload.daily_start_time,
            daily_end_time=payload.daily_end_time,
            slot_duration_minutes=payload.slot_duration_minutes,
            deadline=to_utc(payload.deadline) if payload.deadline else None,
            capacity_limit=payload.capacity_limit,
            is_hidden_details=payload.is_hidden_details,
            status="collecting",
            created_by_id=creator.id,
            group_id=group_id,
            created_at=now,
            updated_at=now
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Generate shareable URL
        share_link_service.create_event_url(
            event_id=event.id,
            expiry_option=payload.expiry_option,
            custom_expiry_date=payload.custom_expiry_date,
            db=db
        )

        # Log creation
        self.log_change(event.id, creator.id, "created", f"Event '{event.title}' scheduled.", db)

        return event

    def get_event(self, event_id: int, current_user: Optional[User], db: Session) -> Event:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        return event

    def is_host_or_cohost(self, event: Event, user: Optional[User], db: Session) -> bool:
        if not user:
            return False
        if event.created_by_id == user.id or user.is_admin:
            return True
        cohost = db.query(EventCoHost).filter(
            EventCoHost.event_id == event.id,
            EventCoHost.user_id == user.id
        ).first()
        return cohost is not None

    def update_event(self, event_id: int, payload: EventUpdatePayload, user: User, db: Session) -> Event:
        event = self.get_event(event_id, user, db)
        if not self.is_host_or_cohost(event, user, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        changes = []
        if payload.title is not None and payload.title != event.title:
            changes.append(f"Title changed to '{payload.title}'")
            event.title = payload.title
        if payload.description is not None and payload.description != event.description:
            changes.append("Description updated")
            event.description = payload.description
        if payload.location is not None and payload.location != event.location:
            changes.append(f"Location changed to '{payload.location}'")
            event.location = payload.location
        if payload.deadline is not None:
            changes.append(f"Deadline updated")
            event.deadline = to_utc(payload.deadline)
        if payload.capacity_limit is not None:
            changes.append(f"Capacity limit updated to {payload.capacity_limit}")
            event.capacity_limit = payload.capacity_limit
        if payload.is_hidden_details is not None:
            event.is_hidden_details = payload.is_hidden_details

        event.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(event)

        if changes:
            self.log_change(event.id, user.id, "updated", "; ".join(changes), db)

        return event

    def finalize_event(self, event_id: int, start_time: datetime, end_time: datetime, user: User, db: Session) -> Event:
        event = self.get_event(event_id, user, db)
        if not self.is_host_or_cohost(event, user, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only host or co-host can finalize.")

        # UC-15 (Divyam): validate the chosen meeting time before locking it in.
        self._validate_finalize_time(event, start_time, end_time)

        event.status = "finalized"
        event.finalized_start_time = start_time
        event.finalized_end_time = end_time
        event.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(event)

        self.log_change(
            event.id,
            user.id,
            "finalized",
            f"Event finalized for {start_time.isoformat()} to {end_time.isoformat()}.",
            db
        )
        return event

    @staticmethod
    def _validate_finalize_time(event: Event, start_time: datetime, end_time: datetime) -> None:
        """UC-15 (Divyam): reject finalize requests that are invalid for this event.

        Rules:
          1. A canceled event cannot be finalized.
          2. The end time must be after the start time.
          3. The time must fall on one of the event's candidate dates and
             inside its daily window (times are stored and compared in UTC).
        """
        if event.status == "canceled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot finalize a canceled event.")

        # Treat timezone-less datetimes as UTC so comparisons are consistent.
        st = start_time.replace(tzinfo=timezone.utc) if start_time.tzinfo is None else start_time.astimezone(timezone.utc)
        et = end_time.replace(tzinfo=timezone.utc) if end_time.tzinfo is None else end_time.astimezone(timezone.utc)

        if et <= st:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time.")

        if st.strftime("%Y-%m-%d") not in (event.candidate_dates or []) or st.date() != et.date():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected time must be on one of the event's candidate dates.")

        window_start = event.daily_start_time or "00:00"
        window_end = event.daily_end_time or "23:59"
        if st.strftime("%H:%M") < window_start or et.strftime("%H:%M") > window_end:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected time must be within the event's daily time window.")

    def cancel_event(self, event_id: int, user: User, db: Session) -> Event:
        event = self.get_event(event_id, user, db)
        if not self.is_host_or_cohost(event, user, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        event.status = "canceled"
        event.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(event)

        self.log_change(event.id, user.id, "canceled", "Event was canceled by organizer.", db)
        return event

    def delete_event(self, event_id: int, user: User, db: Session) -> None:
        event = self.get_event(event_id, user, db)
        # Only the creator (or super admin) can delete permanently
        if event.created_by_id != user.id and not user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the event creator can permanently delete this event."
            )
        db.delete(event)
        db.commit()

    def add_cohost(self, event_id: int, identifier: str, user: User, db: Session) -> User:
        event = self.get_event(event_id, user, db)
        if event.created_by_id != user.id and not user.is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can add co-hosts.")

        # Find target user by phone or name
        target_user = None
        clean_id = identifier.strip()
        try:
            norm = normalize_phone(clean_id)
            target_user = db.query(User).filter(User.phone_hash == hash_phone(norm)).first()
        except Exception:
            pass

        if not target_user:
            target_user = db.query(User).filter(User.name.ilike(clean_id)).first()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{clean_id}' not found. Invite them to create an account first."
            )

        existing = db.query(EventCoHost).filter(
            EventCoHost.event_id == event.id,
            EventCoHost.user_id == target_user.id
        ).first()

        if not existing:
            cohost = EventCoHost(event_id=event.id, user_id=target_user.id)
            db.add(cohost)
            db.commit()
            self.log_change(event.id, user.id, "cohost_added", f"Added {target_user.name} as co-host.", db)

        return target_user

    def block_user(self, event_id: int, identifier: str, user: User, db: Session) -> None:
        event = self.get_event(event_id, user, db)
        if not self.is_host_or_cohost(event, user, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        blocked = BlockedUser(event_id=event.id, identifier=identifier.strip())
        db.add(blocked)
        db.commit()

    def is_user_blocked(self, event_id: int, identifier: str, db: Session) -> bool:
        if not identifier:
            return False
        clean = identifier.strip().lower()
        blocked = db.query(BlockedUser).filter(
            BlockedUser.event_id == event_id,
            BlockedUser.identifier.ilike(clean)
        ).first()
        return blocked is not None

    def log_change(self, event_id: int, user_id: Optional[int], action: str, details: str, db: Session):
        entry = ChangeLogEntry(
            event_id=event_id,
            user_id=user_id,
            action=action,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(entry)
        db.commit()


event_service = EventService()
