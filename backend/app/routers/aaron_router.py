"""Aaron-owned event poll and backup endpoints."""

import json
import secrets

from fastapi import APIRouter, Cookie, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services import aaron_service

router = APIRouter(prefix="/api/aaron", tags=["Aaron requirements"])


class PollCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    options: list[str] = Field(min_length=2, max_length=10)
    category: str = Field(default="General", max_length=100)


class PollVoteRequest(BaseModel):
    option: str = Field(min_length=1, max_length=200)


@router.get("/events/{event_id}/polls")
def list_polls(event_id: int, db: Session = Depends(get_db)):
    return aaron_service.list_polls(event_id, db)


@router.post("/events/{event_id}/polls", status_code=201)
def create_poll(
    event_id: int,
    payload: PollCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return aaron_service.create_poll(
        event_id, current_user, payload.question, payload.options, payload.category, db
    )


@router.post("/events/{event_id}/polls/{poll_id}/votes")
def vote_in_poll(
    event_id: int,
    poll_id: int,
    payload: PollVoteRequest,
    request: Request,
    response: Response,
    voter_token: str | None = Cookie(None, alias="tentative_poll_voter"),
    db: Session = Depends(get_db),
):
    if not voter_token or not voter_token.strip():
        voter_token = secrets.token_urlsafe(32)
        response.set_cookie(
            key="tentative_poll_voter",
            value=voter_token,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="lax",
            max_age=60 * 60 * 24 * 365,
        )
    return aaron_service.vote_in_poll(event_id, poll_id, voter_token, payload.option, db)


@router.get("/events/{event_id}/backup.json")
def download_event_backup(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    backup = aaron_service.create_event_backup(event_id, current_user, db)
    return Response(
        content=json.dumps(backup, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="tentative-event-{event_id}-backup.json"'},
    )
