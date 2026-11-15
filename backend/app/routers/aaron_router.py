"""
Module: backend/app/routers/aaron_router.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Description: FastAPI router endpoints for UC-03, UC-04, UC-13, and UC-14.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.aaron_service import AaronSchedulingAndPollService

router = APIRouter(prefix="/api/aaron", tags=["Aaron Use Cases (UC-03, UC-04, UC-13, UC-14)"])


class RecurrenceRequest(BaseModel):
    start_date_str: str
    frequency: str
    occurrences: int


class CoHostAlterationRequest(BaseModel):
    role: str
    window_start: str
    window_end: str
    capacity: Optional[int] = None


class PollHeatmapRequest(BaseModel):
    all_participants: list[str]
    submissions: dict[str, list[str]]


class InquiryRequest(BaseModel):
    author: str
    content: str
    is_host_reply: bool = False


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


@router.post("/polls/heatmap")
def generate_poll_heatmap(payload: PollHeatmapRequest):
    return AaronSchedulingAndPollService.compute_poll_heatmap(
        payload.all_participants, payload.submissions
    )


@router.post("/inquiries/format")
def post_event_inquiry(payload: InquiryRequest):
    try:
        return AaronSchedulingAndPollService.format_event_inquiry(
            payload.author, payload.content, payload.is_host_reply
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
