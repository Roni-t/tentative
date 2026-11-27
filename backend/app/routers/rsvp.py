from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_optional
from app.models.user import User

from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.schemas.rsvp import RsvpPage, RsvpSubmitPayload
from app.services.rsvp_service import rsvp_service

router = APIRouter(tags=["RSVP"])


@router.get("/api/events/{event_id}/my-rsvp")
def my_rsvp(event_id: int, token: Optional[str] = Query(None, max_length=64),
            current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    """Which RSVP link belongs to this viewer, for the event page's "Submit RSVP" card. None for hosts and strangers."""
    return {"token": rsvp_service.my_token(event_id, token, current_user, db)}


@router.get("/api/rsvp/{token}", response_model=RsvpPage)
def get_rsvp(token: str, db: Session = Depends(get_db)):
    """The event and the invitee's current answer, for their RSVP link."""
    return rsvp_service.get_page(token, db)


@router.post("/api/rsvp/{token}", response_model=RsvpPage, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def submit_rsvp(token: str, payload: RsvpSubmitPayload, db: Session = Depends(get_db)):
    """Going, maybe or not going. Open after the host picks a time, until the event starts."""
    return rsvp_service.submit(token, payload.status, db)
