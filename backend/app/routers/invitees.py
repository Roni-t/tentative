from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.models.user import User
from app.schemas.invitee import HostUpdateOut, HostUpdatePayload, InviteeCreatePayload, InviteeOut, OptOutPayload
from app.services.invitee_service import invitee_service

router = APIRouter(tags=["Invitees & SMS"])


@router.post("/api/events/{event_id}/invitees", response_model=InviteeOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def add_invitee(event_id: int, payload: InviteeCreatePayload, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Host/co-host invites someone by phone; they are texted a personal response link."""
    invitee = invitee_service.add_invitee(event_id, payload.name, payload.phone, payload.timezone, current_user, db)
    return invitee_service.to_out(invitee, db, include_token=True)


@router.get("/api/events/{event_id}/invitees", response_model=List[InviteeOut])
def list_invitees(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Host/co-host view of invitees: responded, reminder sent, and opted-out status."""
    return invitee_service.list_invitees(event_id, current_user, db)


@router.post("/api/events/{event_id}/updates", response_model=HostUpdateOut,
             dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def send_host_update(event_id: int, payload: HostUpdatePayload, preview: bool = Query(False),
                     current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """FR-19: text an update to every opted-in invitee. With ?preview=true, only returns the preview and counts."""
    return invitee_service.host_update(event_id, payload.message, preview, current_user, db)


@router.post("/api/sms/opt-out", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def sms_opt_out(payload: OptOutPayload, db: Session = Depends(get_db)):
    """Record a STOP reply (SMS provider inbound hook). Opted-out numbers get no further texts."""
    invitee_service.opt_out(payload.phone, db)
    return {"message": "You won't receive any more texts from Tentative."}
