import csv
import io
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import generate_secure_token
from app.models.availability import Availability
from app.models.event import Event
from app.models.rsvp import RSVP
from app.models.user import User
from app.schemas.rsvp import RsvpOut, RsvpSubmitPayload, RsvpSummary
from app.services.event_service import event_service
from app.services.notification_service import notification_service


class RsvpService:
    def submit_rsvp(
        self,
        event_id: int,
        payload: RsvpSubmitPayload,
        current_user: Optional[User],
        db: Session
    ) -> RSVP:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        if event.status == "canceled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event has been canceled.")

        # Check if event has already started
        now = datetime.now(timezone.utc)
        if event.finalized_start_time and now > event.finalized_start_time.replace(tzinfo=timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot alter RSVP after event has started.")

        if event_service.is_user_blocked(event_id, payload.participant_name, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are blocked from this event.")

        edit_token = payload.edit_token.strip() if payload.edit_token else generate_secure_token(16)
        
        # Look for existing RSVP
        existing = db.query(RSVP).filter(
            RSVP.event_id == event_id,
            RSVP.edit_token == edit_token
        ).first()

        prev_status = existing.status if existing else None
        target_status = payload.status.lower()

        if target_status not in ["going", "maybe", "not_going"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid RSVP status")

        # Capacity limit: once full, nobody else can say they're going. People already going keep their spot.
        if target_status == "going" and event.capacity_limit is not None and prev_status != "going":
            going_count = db.query(RSVP).filter(RSVP.event_id == event_id, RSVP.status == "going").count()
            if going_count >= event.capacity_limit:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This event is full.")

        if existing:
            existing.participant_name = payload.participant_name.strip()
            if payload.participant_phone:
                existing.participant_phone = payload.participant_phone.strip()
            existing.status = target_status
            existing.updated_at = now
            rsvp_record = existing
        else:
            rsvp_record = RSVP(
                event_id=event_id,
                user_id=current_user.id if current_user else None,
                participant_name=payload.participant_name.strip(),
                participant_phone=payload.participant_phone.strip() if payload.participant_phone else None,
                edit_token=edit_token,
                status=target_status,
                created_at=now,
                updated_at=now
            )
            db.add(rsvp_record)

        db.commit()
        db.refresh(rsvp_record)

        # Notify host of RSVP change
        notification_service.notify_host(
            event=event,
            message=f"{rsvp_record.participant_name} changed RSVP status to '{target_status}'.",
            notification_type="rsvp_update",
            db=db
        )

        return rsvp_record

    def get_rsvp_summary(self, event_id: int, edit_token: Optional[str], db: Session) -> RsvpSummary:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        rsvps = db.query(RSVP).filter(RSVP.event_id == event_id).order_by(RSVP.updated_at.desc()).all()
        
        # Also find any respondents who filled availability but haven't explicitly set RSVP
        availability_names = {a.participant_name for a in db.query(Availability).filter(Availability.event_id == event_id).all()}
        rsvp_names = {r.participant_name for r in rsvps}
        no_response_count = max(0, len(availability_names - rsvp_names))

        count_going = sum(1 for r in rsvps if r.status == "going")
        count_maybe = sum(1 for r in rsvps if r.status == "maybe")
        count_not_going = sum(1 for r in rsvps if r.status == "not_going")

        current_status = None
        if edit_token:
            for r in rsvps:
                if r.edit_token == edit_token:
                    current_status = r.status
                    break

        return RsvpSummary(
            event_id=event_id,
            total_invitees=len(rsvps) + no_response_count,
            count_going=count_going,
            count_maybe=count_maybe,
            count_not_going=count_not_going,
            count_no_response=no_response_count,
            capacity_limit=event.capacity_limit,
            current_status=current_status,
            rsvps=[RsvpOut.model_validate(r) for r in rsvps]
        )

    def export_csv(self, event_id: int, db: Session) -> str:
        summary = self.get_rsvp_summary(event_id, None, db)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Name", "Status", "Last Updated (UTC)"])
        for r in summary.rsvps:
            writer.writerow([
                r.participant_name,
                r.status.upper(),
                r.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
        return output.getvalue()


rsvp_service = RsvpService()
