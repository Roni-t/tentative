"""
Module: backend/app/routers/aaron_router.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Description: FastAPI router endpoints for FR-1, FR-2, FR-3, FR-4, NF-6, and NF-8.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.aaron_service import AaronSchedulingAndPollService

router = APIRouter(prefix="/api/aaron", tags=["Aaron Requirements (FR-1..4, NF-6, NF-8)"])


class RecurrenceRequest(BaseModel):
    start_date_str: str
    frequency: str
    occurrences: int


class CoHostAlterationRequest(BaseModel):
    role: str
    window_start: str
    window_end: str
    capacity: Optional[int] = None


class InquiryRequest(BaseModel):
    author: str
    content: str
    is_host_reply: bool = False


class EventPollRequest(BaseModel):
    question: str
    options: list[str]
    category: str = "General"


class EventBackupRequest(BaseModel):
    event_data: dict


class AccessibilityCheckRequest(BaseModel):
    component: dict


@router.post("/recurrence/expand")
def expand_recurrence(payload: RecurrenceRequest):
    try:
        dates = AaronSchedulingAndPollService.expand_recurring_dates(
            payload.start_date_str, payload.frequency, payload.occurrences
        )
        return {"dates": dates}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/events/cohost-alteration")
def alter_event_as_cohost(payload: CoHostAlterationRequest):
    try:
        return AaronSchedulingAndPollService.validate_cohost_alteration(
            payload.role, payload.window_start, payload.window_end, payload.capacity
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/inquiries/format")
def post_event_inquiry(payload: InquiryRequest):
    try:
        return AaronSchedulingAndPollService.format_event_inquiry(
            payload.author, payload.content, payload.is_host_reply
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/polls/create")
def create_poll(payload: EventPollRequest):
    try:
        return AaronSchedulingAndPollService.create_event_poll(
            payload.question, payload.options, payload.category
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/backups/create")
def create_backup(payload: EventBackupRequest):
    try:
        return AaronSchedulingAndPollService.create_event_backup(payload.event_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/accessibility/validate")
def validate_accessibility(payload: AccessibilityCheckRequest):
    try:
        return AaronSchedulingAndPollService.validate_wcag_aa_and_screen_reader(payload.component)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
