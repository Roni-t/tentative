"""Aaron-owned API for recurrence, co-host permissions, polls, and event backup."""

from typing import Optional
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.aaron_storage import get_db
from app.services.aaron_service import AaronSchedulingAndPollService as AaronService

router = APIRouter(
    prefix="/api/aaron",
    tags=["Aaron Requirements (FR-1, FR-2, FR-4, NF-6, NF-8)"],
)


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    start_date: str
    window_start: str
    window_end: str
    capacity: Optional[int] = Field(default=None, ge=1)


class SharedEventInitializeRequest(EventCreateRequest):
    source_event_id: int = Field(gt=0)


class EventAlterationRequest(BaseModel):
    window_start: str
    window_end: str
    capacity: Optional[int] = Field(default=None, ge=1)


class CoHostRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class RecurrenceRequest(BaseModel):
    frequency: str
    interval: int = Field(default=1, ge=1, le=52)
    days_of_week: list[str] = Field(min_length=1, max_length=7)
    end_date: Optional[str] = None


class PollCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    options: list[str] = Field(min_length=2, max_length=10)
    category: str = Field(default="General", max_length=100)


class PollVoteRequest(BaseModel):
    voter_name: str = Field(min_length=1, max_length=100)
    option: str = Field(min_length=1, max_length=200)


class ParticipantResponseRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    response: str


class RecurrenceExpandRequest(BaseModel):
    start_date_str: str
    frequency: str
    occurrences: int
    interval: int = Field(default=1, ge=1, le=52)
    days_of_week: list[str] = Field(default_factory=list, max_length=7)


class AccessibilityCheckRequest(BaseModel):
    component: dict


def _call_service(method, *args, **kwargs):
    try:
        return method(*args, **kwargs)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/events", status_code=201)
def create_event(payload: EventCreateRequest, db: Session = Depends(get_db)):
    return _call_service(
        AaronService.create_event,
        payload.title,
        payload.start_date,
        payload.window_start,
        payload.window_end,
        payload.capacity,
        db,
    )


@router.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    return _call_service(AaronService.get_event, event_id, db)


@router.post("/shared-events/initialize")
def initialize_shared_event(payload: SharedEventInitializeRequest, db: Session = Depends(get_db)):
    return _call_service(
        AaronService.initialize_shared_event,
        payload.source_event_id,
        payload.title,
        payload.start_date,
        payload.window_start,
        payload.window_end,
        payload.capacity,
        db,
    )


@router.patch("/events/{event_id}")
def alter_event(
    event_id: int,
    payload: EventAlterationRequest,
    x_aaron_access_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.alter_event,
        event_id,
        x_aaron_access_token or "",
        payload.window_start,
        payload.window_end,
        payload.capacity,
        db,
    )


@router.post("/events/{event_id}/cohosts", status_code=201)
def add_cohost(
    event_id: int,
    payload: CoHostRequest,
    x_aaron_access_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.add_cohost,
        event_id,
        payload.name,
        x_aaron_access_token or "",
        db,
    )


@router.put("/events/{event_id}/recurrence")
def set_recurrence(
    event_id: int,
    payload: RecurrenceRequest,
    x_aaron_access_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.set_recurrence,
        event_id,
        x_aaron_access_token or "",
        payload.frequency,
        payload.interval,
        payload.days_of_week,
        payload.end_date,
        db,
    )


@router.post("/events/{event_id}/polls", status_code=201)
def create_poll(
    event_id: int,
    payload: PollCreateRequest,
    x_aaron_access_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.create_persisted_poll,
        event_id,
        x_aaron_access_token or "",
        payload.question,
        payload.options,
        payload.category,
        db,
    )


@router.post("/events/{event_id}/polls/{poll_id}/votes")
def vote_in_poll(
    event_id: int,
    poll_id: int,
    payload: PollVoteRequest,
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.vote_in_poll,
        event_id,
        poll_id,
        payload.voter_name,
        payload.option,
        db,
    )


@router.post("/events/{event_id}/participants", status_code=201)
def record_participant(
    event_id: int,
    payload: ParticipantResponseRequest,
    db: Session = Depends(get_db),
):
    return _call_service(
        AaronService.record_participant,
        event_id,
        payload.name,
        payload.response,
        db,
    )


@router.get("/events/{event_id}/backup.json")
def download_event_backup(
    event_id: int,
    x_aaron_access_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    backup = _call_service(AaronService.create_persisted_backup, event_id, x_aaron_access_token or "", db)
    return Response(
        content=json.dumps(backup, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="aaron-event-{event_id}-backup.json"'},
    )


@router.post("/recurrence/expand")
def expand_recurrence(payload: RecurrenceExpandRequest):
    if payload.days_of_week:
        return _call_service(
            AaronService.expand_weekly_recurrence,
            payload.start_date_str,
            payload.frequency.upper(),
            payload.interval,
            payload.days_of_week,
            payload.occurrences,
        )
    return _call_service(
        AaronService.expand_recurring_dates,
        payload.start_date_str,
        payload.frequency.upper(),
        payload.occurrences,
    )


@router.post("/accessibility/validate")
def validate_accessibility(payload: AccessibilityCheckRequest):
    return _call_service(AaronService.validate_wcag_aa_and_screen_reader, payload.component)
