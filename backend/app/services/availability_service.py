from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import ensure_utc, generate_secure_token
from app.models.availability import Availability
from app.models.event import Event
from app.models.user import User
from app.schemas.availability import AvailabilitySubmitPayload, AvailabilitySubmitResponse, TimeSlot
from app.services.event_service import event_service


class AvailabilityService:
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

        # Determine edit token
        edit_token = payload.edit_token.strip() if payload.edit_token else None
        if not edit_token:
            edit_token = generate_secure_token(16)

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

        # If this is an invited participant (personal link token), mark them responded (FR-20)
        from app.services.invitee_service import invitee_service
        invitee_service.record_response(event, edit_token, db)

        return AvailabilitySubmitResponse(
            message="Availability successfully saved.",
            edit_token=edit_token,
            participant_name=payload.participant_name.strip(),
            slots_count=len(payload.slots)
        )

    def get_participant_slots(
        self,
        event_id: int,
        edit_token: str,
        db: Session
    ) -> List[TimeSlot]:
        records = db.query(Availability).filter(
            Availability.event_id == event_id,
            Availability.edit_token == edit_token
        ).all()
        return [TimeSlot(start_time=r.start_time, end_time=r.end_time) for r in records]


availability_service = AvailabilityService()
