from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.schemas.rsvp import RsvpPage, RsvpSubmitPayload
from app.services.rsvp_service import rsvp_service

router = APIRouter(prefix="/api/rsvp", tags=["RSVP"])


@router.get("/{token}", response_model=RsvpPage)
def get_rsvp(token: str, db: Session = Depends(get_db)):
    """The event and the invitee's current answer, for their RSVP link."""
    return rsvp_service.get_page(token, db)


@router.post("/{token}", response_model=RsvpPage, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def submit_rsvp(token: str, payload: RsvpSubmitPayload, db: Session = Depends(get_db)):
    """Going, maybe or not going. Open after the host picks a time, until the event starts."""
    return rsvp_service.submit(token, payload.status, db)
