from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, Query, Response
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user_optional
from app.database import get_db
from app.models.availability import Availability
from app.models.user import User
from app.schemas.availability import (
    AvailabilitySubmitPayload,
    AvailabilitySubmitResponse,
    HeatmapResponse,
    TimeSlot,
)
from app.services.availability_service import availability_service
from app.services.heatmap_service import heatmap_service
from app.services.calendar_import_service import free_slots
from app.models.event import Event
from fastapi import HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/api/events/{event_id}", tags=["Availability & Heatmap"])


@router.post("/availability", response_model=AvailabilitySubmitResponse)
def submit_availability(
    event_id: int,
    payload: AvailabilitySubmitPayload,
    response: Response,
    current_user: Optional[User] = Depends(get_current_user_optional),
    tentative_edit_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Submit availability for participant. Works for both anonymous invitees and logged in hosts."""
    # If client didn't supply edit_token in payload, check cookie if same participant
    if not payload.edit_token and tentative_edit_token:
        existing = db.query(Availability).filter(
            Availability.event_id == event_id,
            Availability.edit_token == tentative_edit_token
        ).first()
        if existing and existing.participant_name.strip().lower() == payload.participant_name.strip().lower():
            payload.edit_token = tentative_edit_token

    result = availability_service.submit_availability(
        event_id=event_id,
        payload=payload,
        current_user=current_user,
        db=db
    )

    # Set private edit_token in cookie for seamless return
    response.set_cookie(
        key="tentative_edit_token",
        value=result.edit_token,
        max_age=60 * 60 * 24 * 30,  # 30 days
        samesite="lax",
        secure=False
    )

    return result


@router.get("/availability/me", response_model=List[TimeSlot])
def get_my_availability(
    event_id: int,
    edit_token: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    tentative_edit_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Retrieve saved availability slots for this edit_token or the logged-in account."""
    token = edit_token or tentative_edit_token
    return availability_service.get_participant_slots(event_id, token, current_user, db)


@router.get("/heatmap", response_model=HeatmapResponse)
def get_availability_heatmap(
    event_id: int,
    refresh: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get the aggregated availability heatmap with overlap counts and best-fit recommendations."""
    return heatmap_service.calculate_heatmap(event_id=event_id, db=db, force_refresh=refresh)


# NF-10 Import events from an external calendar (Reese)
class CalendarImportPayload(BaseModel):
    ics_text: str


class CalendarImportResult(BaseModel):
    busy_events_found: int
    total_slots: int
    free_slots: List[TimeSlot]


@router.post("/availability/import-ics", response_model=CalendarImportResult)
def import_calendar(event_id: int, payload: CalendarImportPayload, db: Session = Depends(get_db)):
    """Read a .ics calendar file and return the event's slots that don't clash with it. Saves nothing."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.status == "canceled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event has been canceled.")
    return free_slots(event, payload.ics_text)
