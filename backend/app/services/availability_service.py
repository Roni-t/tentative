from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import ensure_utc, generate_secure_token
from app.models.availability import Availability
from app.models.event import Event
from app.models.invitee import Invitee
from app.models.user import User
from app.schemas.availability import AvailabilitySubmitPayload, AvailabilitySubmitResponse, TimeSlot
from app.services.event_service import event_service


class AvailabilityService:
    def _find_response_token(self, event_id: int, requested: Optional[str], user: Optional[User],
                             db: Session) -> Optional[str]:
        """Token of this person's response on this event, or None if they have not answered.

        A personal link wins, then the logged-in account, then the token saved in the browser.
        """
        invitee = None
        if requested:
            invitee = db.query(Invitee).filter(
                Invitee.event_id == event_id, Invitee.response_token == requested
            ).first()
            if invitee and not invitee.joined_via_link:
                return requested

        if user:
            own = db.query(Invitee).filter(
                Invitee.event_id == event_id, Invitee.phone_hash == user.phone_hash
            ).first()
            if own:
                return own.response_token
            # Hosts are not on the invitee list. Skip answers they entered through someone's personal link.
            invitee_tokens = db.query(Invitee.response_token).filter(Invitee.event_id == event_id)
            row = db.query(Availability).filter(
                Availability.event_id == event_id,
                Availability.user_id == user.id,
                Availability.edit_token.notin_(invitee_tokens)
            ).order_by(Availability.id.desc()).first()
            if row:
                return row.edit_token

        if requested:
            has_slots = db.query(Availability.id).filter(
                Availability.event_id == event_id, Availability.edit_token == requested
            ).first()
            if invitee or has_slots:
                return requested
        return None

    def _token_is_used(self, token: str, db: Session) -> bool:
        return bool(
            db.query(Invitee.id).filter(Invitee.response_token == token).first()
            or db.query(Availability.id).filter(Availability.edit_token == token).first()
        )

    def submit_availability(
        self,
        event_id: int,
        payload: AvailabilitySubmitPayload,
        current_user: Optional[User],
        db: Session
    ) -> AvailabilitySubmitResponse:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        if event.status == "canceled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event has been canceled.")
        if event.status == "finalized":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="This event's time has been finalized; availability is locked.")

        # Check deadline
        if event.deadline and datetime.now(timezone.utc) > ensure_utc(event.deadline):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Response deadline has passed.")

        # Check blocked
        if event_service.is_user_blocked(event_id, payload.participant_name, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are blocked from responding to this event.")

        # Update their existing response if there is one. A token already used on another event
        # can't be used here too, so they get a new one.
        requested = payload.edit_token.strip() if payload.edit_token else None
        edit_token = self._find_response_token(event_id, requested, current_user, db)
        if not edit_token:
            edit_token = requested if requested and not self._token_is_used(requested, db) else generate_secure_token(16)

        # Clear existing slots for this edit_token on this event
        db.query(Availability).filter(
            Availability.event_id == event_id,
            Availability.edit_token == edit_token
        ).delete()

        # Insert new slots
        user_id = current_user.id if current_user else None
        now = datetime.now(timezone.utc)
        
        for slot in payload.slots:
            st = slot.start_time.replace(tzinfo=timezone.utc) if slot.start_time.tzinfo is None else slot.start_time.astimezone(timezone.utc)
            et = slot.end_time.replace(tzinfo=timezone.utc) if slot.end_time.tzinfo is None else slot.end_time.astimezone(timezone.utc)
            avail = Availability(
                event_id=event_id,
                user_id=user_id,
                participant_name=payload.participant_name.strip(),
                edit_token=edit_token,
                start_time=st,
                end_time=et,
                created_at=now
            )
            db.add(avail)

        db.commit()

        # Invalidate heatmap cache
        from app.services.heatmap_service import heatmap_service
        heatmap_service.invalidate_cache(event_id)

        # Update the invitee list (personal link or general link)
        from app.services.invitee_service import invitee_service
        invitee_service.record_response(event, edit_token, payload.participant_name, current_user, db)

        return AvailabilitySubmitResponse(
            message="Availability successfully saved.",
            edit_token=edit_token,
            participant_name=payload.participant_name.strip(),
            slots_count=len(payload.slots)
        )

    def get_participant_slots(
        self,
        event_id: int,
        edit_token: Optional[str],
        current_user: Optional[User],
        db: Session
    ) -> List[TimeSlot]:
        edit_token = self._find_response_token(event_id, edit_token, current_user, db)
        if not edit_token:
            return []
        records = db.query(Availability).filter(
            Availability.event_id == event_id,
            Availability.edit_token == edit_token
        ).all()
        return [TimeSlot(start_time=ensure_utc(r.start_time), end_time=ensure_utc(r.end_time)) for r in records]


availability_service = AvailabilityService()
