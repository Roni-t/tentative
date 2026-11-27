"""RSVP through each invitee's RSVP link, after the host picks a time.

The link carries the invitee's personal token, so it identifies them on any device without a login.
The answer is stored on the invitee row; no phone number is involved.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import ensure_utc
from app.models.event import Event
from app.models.invitee import Invitee
from app.models.user import User
from app.schemas.rsvp import RsvpPage
from app.services.event_service import event_service
from app.services.notification_service import notification_service

STATUSES = ("going", "maybe", "not_going")


class RsvpService:
    def _find(self, token: str, db: Session) -> Invitee:
        invitee = db.query(Invitee).filter(Invitee.response_token == token).first()
        if not invitee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This link is not valid.")
        return invitee

    def _closed_reason(self, event: Event) -> Optional[str]:
        if event.status == "canceled":
            return "This event was canceled."
        if event.status != "finalized" or not event.finalized_start_time:
            return "You can RSVP once the host picks a time."
        if ensure_utc(event.finalized_start_time) <= datetime.now(timezone.utc):
            return "This event has already started."
        return None

    def _going_count(self, event_id: int, db: Session) -> int:
        return db.query(Invitee).filter(Invitee.event_id == event_id, Invitee.rsvp_status == "going").count()

    def get_page(self, token: str, db: Session) -> RsvpPage:
        invitee = self._find(token, db)
        event = invitee.event
        reason = self._closed_reason(event)
        spots_left = None
        if event.capacity_limit is not None:
            spots_left = max(0, event.capacity_limit - self._going_count(event.id, db))
        return RsvpPage(
            event_id=event.id,
            title=event.title,
            location=event.location,
            timezone=event.timezone,
            finalized_start_time=event.finalized_start_time,
            finalized_end_time=event.finalized_end_time,
            name=invitee.name,
            rsvp_status=invitee.rsvp_status,
            open=reason is None,
            closed_reason=reason,
            capacity_limit=event.capacity_limit,
            spots_left=spots_left,
        )

    def submit(self, token: str, new_status: str, db: Session) -> RsvpPage:
        invitee = self._find(token, db)
        event = invitee.event
        new_status = (new_status or "").strip().lower()
        if new_status not in STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose going, maybe or not going.")

        reason = self._closed_reason(event)
        if reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

        if event_service.is_user_blocked(event.id, invitee.name, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are blocked from this event.")

        # Capacity limit, no waitlist: once full, nobody else can say they're going.
        # Someone already going keeps their spot when they answer again.
        if (new_status == "going" and invitee.rsvp_status != "going" and event.capacity_limit is not None
                and self._going_count(event.id, db) >= event.capacity_limit):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This event is full.")

        changed = invitee.rsvp_status != new_status
        invitee.rsvp_status = new_status
        invitee.rsvp_updated_at = datetime.now(timezone.utc)
        db.commit()

        if changed:
            label = {"going": "going", "maybe": "maybe", "not_going": "not going"}[new_status]
            notification_service.notify_host(
                event=event, message=f'{invitee.name} RSVPed "{label}" for "{event.title}".',
                notification_type="rsvp_update", db=db,
            )
        return self.get_page(token, db)


    def my_token(self, event_id: int, token: Optional[str], user: Optional[User], db: Session) -> Optional[str]:
        """The viewer's RSVP token on this event: the personal token saved in their browser, or their account's invitee row."""
        if token:
            mine = db.query(Invitee).filter(Invitee.event_id == event_id, Invitee.response_token == token).first()
            if mine:
                return mine.response_token
        if user:
            mine = db.query(Invitee).filter(Invitee.event_id == event_id, Invitee.phone_hash == user.phone_hash).first()
            if mine:
                return mine.response_token
        return None


rsvp_service = RsvpService()
