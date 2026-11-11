from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Query, Response
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user_optional
from app.database import get_db
from app.models.rsvp import RSVP
from app.models.user import User
from app.schemas.rsvp import RsvpOut, RsvpSubmitPayload, RsvpSummary
from app.services.rsvp_service import rsvp_service

router = APIRouter(prefix="/api/events/{event_id}/rsvp", tags=["RSVP & Waitlist"])


@router.post("", response_model=RsvpOut)
def submit_rsvp(
    event_id: int,
    payload: RsvpSubmitPayload,
    response: Response,
    current_user: Optional[User] = Depends(get_current_user_optional),
    tentative_edit_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Submit or update RSVP status. Handles FIFO waitlist if capacity limit is reached."""
    if not payload.edit_token and tentative_edit_token:
        existing = db.query(RSVP).filter(
            RSVP.event_id == event_id,
            RSVP.edit_token == tentative_edit_token
        ).first()
        if existing and existing.participant_name.strip().lower() == payload.participant_name.strip().lower():
            payload.edit_token = tentative_edit_token

    rsvp = rsvp_service.submit_rsvp(
        event_id=event_id,
        payload=payload,
        current_user=current_user,
        db=db
    )

    response.set_cookie(
        key="tentative_edit_token",
        value=rsvp.edit_token,
        max_age=60 * 60 * 24 * 30,
        samesite="lax",
        secure=False
    )

    return RsvpOut.model_validate(rsvp)


@router.get("", response_model=RsvpSummary)
def get_rsvp_summary(
    event_id: int,
    edit_token: Optional[str] = Query(None),
    tentative_edit_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get RSVP totals, attendance lists, and waitlist position."""
    token = edit_token or tentative_edit_token
    return rsvp_service.get_rsvp_summary(event_id=event_id, edit_token=token, db=db)


@router.get("/export.csv")
def export_rsvp_csv(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Download attendance roster as CSV."""
    csv_data = rsvp_service.export_csv(event_id=event_id, db=db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="tentative-rsvps-{event_id}.csv"'}
    )
