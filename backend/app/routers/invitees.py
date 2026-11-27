from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.models.user import User
from app.schemas.invitee import (
    HostUpdateOut,
    HostUpdatePayload,
    InviteeCreatePayload,
    InviteeOut,
    InviteePhonePayload,
    InviteePhoneVerifyOut,
    InviteePhoneVerifyPayload,
    OptOutPayload,
)
from app.services.event_service import event_service
from app.services.invitee_service import invitee_service

router = APIRouter(tags=["Invitees & SMS"])


@router.post("/api/events/{event_id}/invitees", response_model=InviteeOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def add_invitee(event_id: int, payload: InviteeCreatePayload, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Host adds an invitee by name. The response has their personal link."""
    event = event_service.get_event(event_id, current_user, db)
    invitee = invitee_service.add_invitee(event_id, payload.name, current_user, db)
    return invitee_service.to_out(event, invitee, db)


@router.get("/api/events/{event_id}/invitees", response_model=List[InviteeOut])
def list_invitees(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Host view of the invitee list. Shows who responded and who can be texted, never phone numbers."""
    return invitee_service.list_invitees(event_id, current_user, db)


@router.post("/api/events/{event_id}/invitees/{invitee_id}/new-link", response_model=InviteeOut)
def new_invitee_link(event_id: int, invitee_id: int, current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Replace one invitee's link. The old link stops working."""
    return invitee_service.regenerate_link(event_id, invitee_id, current_user, db)


@router.post("/api/invite/{token}/phone/request-code",
             dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def request_phone_code(token: str, payload: InviteePhonePayload, db: Session = Depends(get_db)):
    """Invitee asks for a text when the time is set. We send a code to check the number is theirs."""
    return invitee_service.request_phone_code(token, payload.phone, db)


@router.post("/api/invite/{token}/phone/verify", response_model=InviteePhoneVerifyOut,
             dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def verify_phone(token: str, payload: InviteePhoneVerifyPayload, db: Session = Depends(get_db)):
    """Check the code, then create (or link) the invitee's account."""
    return invitee_service.verify_phone(token, payload.phone, payload.code, payload.timezone, db)


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
