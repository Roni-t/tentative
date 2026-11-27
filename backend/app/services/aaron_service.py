"""Business logic for Aaron-owned polls and event backups."""

from __future__ import annotations

from datetime import datetime
import hashlib
import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.invitee import Invitee
from app.models.user import User
from app.aaron_models import AaronPoll, AaronPollVote
from app.services.event_service import event_service


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _event_or_404(event_id: int, db: Session) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event


def _require_event_manager(event_id: int, user: User, db: Session) -> Event:
    event = _event_or_404(event_id, db)
    if not event_service.is_host_or_cohost(event, user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host or a co-host can manage this event.")
    return event


def _poll_out(poll: AaronPoll) -> dict[str, Any]:
    tally = {option: 0 for option in poll.options}
    for vote in poll.votes:
        tally[vote.option] = tally.get(vote.option, 0) + 1
    return {
        "id": poll.id,
        "event_id": poll.event_id,
        "question": poll.question,
        "category": poll.category,
        "options": poll.options,
        "tally": tally,
        "created_at": _iso(poll.created_at),
    }


def create_poll(
    event_id: int,
    user: User,
    question: str,
    options: list[str],
    category: str,
    db: Session,
) -> dict[str, Any]:
    event = _require_event_manager(event_id, user, db)
    if event.status != "collecting":
        raise HTTPException(status_code=400, detail="Polls can only be created while the event is collecting responses.")

    clean_question = question.strip()
    clean_category = category.strip() or "General"
    clean_options = [option.strip() for option in options if option and option.strip()]
    if not clean_question:
        raise HTTPException(status_code=400, detail="Poll question is required.")
    if len(clean_options) < 2:
        raise HTTPException(status_code=400, detail="A poll needs at least two non-empty options.")
    if len({option.casefold() for option in clean_options}) != len(clean_options):
        raise HTTPException(status_code=400, detail="Poll options must be unique.")

    poll = AaronPoll(
        event_id=event.id,
        created_by_user_id=user.id,
        question=clean_question,
        category=clean_category,
        options=clean_options,
    )
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return _poll_out(poll)


def list_polls(event_id: int, db: Session) -> list[dict[str, Any]]:
    _event_or_404(event_id, db)
    polls = (
        db.query(AaronPoll)
        .filter(AaronPoll.event_id == event_id)
        .order_by(AaronPoll.created_at, AaronPoll.id)
        .all()
    )
    return [_poll_out(poll) for poll in polls]


def vote_in_poll(
    event_id: int,
    poll_id: int,
    voter_token: str,
    option: str,
    db: Session,
) -> dict[str, Any]:
    event = _event_or_404(event_id, db)
    if event.status == "canceled":
        raise HTTPException(status_code=400, detail="Polls are closed for canceled events.")

    poll = (
        db.query(AaronPoll)
        .filter(AaronPoll.id == poll_id, AaronPoll.event_id == event_id)
        .first()
    )
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found.")

    if not voter_token:
        raise HTTPException(status_code=400, detail="A voter session is required.")
    if option not in poll.options:
        raise HTTPException(status_code=400, detail="Choose one of the poll options.")

    # Use an unguessable server-issued browser token; display names are not identities.
    voter_key = hashlib.sha256(voter_token.encode("utf-8")).hexdigest()
    vote = (
        db.query(AaronPollVote)
        .filter(AaronPollVote.poll_id == poll.id, AaronPollVote.voter_key == voter_key)
        .first()
    )
    if vote is None:
        db.add(AaronPollVote(poll_id=poll.id, voter_key=voter_key, option=option))
    else:
        vote.option = option
    db.commit()
    db.refresh(poll)
    return _poll_out(poll)


def _event_snapshot(event: Event, db: Session) -> dict[str, Any]:
    invitees = db.query(Invitee).filter(Invitee.event_id == event.id).order_by(Invitee.id).all()
    polls = list_polls(event.id, db)
    participant_names = {
        availability.participant_name for availability in event.availabilities
    } | {rsvp.participant_name for rsvp in event.rsvps} | {invitee.name for invitee in invitees}

    return {
        "schema_version": 1,
        "event": {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "timezone": event.timezone,
            "candidate_dates": event.candidate_dates,
            "daily_start_time": event.daily_start_time,
            "daily_end_time": event.daily_end_time,
            "slot_duration_minutes": event.slot_duration_minutes,
            "deadline": _iso(event.deadline),
            "capacity_limit": event.capacity_limit,
            "is_hidden_details": event.is_hidden_details,
            "status": event.status,
            "finalized_start_time": _iso(event.finalized_start_time),
            "finalized_end_time": _iso(event.finalized_end_time),
            "created_by_id": event.created_by_id,
            "created_at": _iso(event.created_at),
            "updated_at": _iso(event.updated_at),
        },
        "participants": {
            "count": len(participant_names),
            "invitees": [
                {
                    "name": invitee.name,
                    "timezone": invitee.timezone,
                    "joined_via_link": invitee.joined_via_link,
                    "responded_at": _iso(invitee.responded_at),
                    "created_at": _iso(invitee.created_at),
                }
                for invitee in invitees
            ],
            "availability": [
                {
                    "name": item.participant_name,
                    "start_time": _iso(item.start_time),
                    "end_time": _iso(item.end_time),
                    "created_at": _iso(item.created_at),
                }
                for item in event.availabilities
            ],
            "rsvps": [
                {
                    "name": item.participant_name,
                    "status": item.status,
                    "waitlist_position": item.waitlist_position,
                    "created_at": _iso(item.created_at),
                    "updated_at": _iso(item.updated_at),
                }
                for item in event.rsvps
            ],
        },
        "recurrence": [
            {
                "frequency": rule.frequency,
                "interval": rule.interval,
                "days_of_week": rule.days_of_week,
                "end_date": _iso(rule.end_date),
                "created_at": _iso(rule.created_at),
            }
            for rule in event.recurrence_rules
        ],
        "comments": [
            {
                "id": comment.id,
                "author_name": comment.author_name,
                "is_question": comment.is_question,
                "content": comment.content,
                "parent_id": comment.parent_id,
                "created_at": _iso(comment.created_at),
            }
            for comment in event.comments
        ],
        "change_history": [
            {
                "action": entry.action,
                "details": entry.details,
                "timestamp": _iso(entry.timestamp),
            }
            for entry in event.changelog_entries
        ],
        "polls": polls,
        "participant_count": len(participant_names),
    }


def create_event_backup(event_id: int, user: User, db: Session) -> dict[str, Any]:
    event = _require_event_manager(event_id, user, db)
    payload = _event_snapshot(event, db)
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return {
        "status": "BACKUP_CREATED",
        "event_id": event.id,
        "participant_count": payload["participant_count"],
        "checksum": hashlib.sha256(canonical).hexdigest(),
        "payload": payload,
    }
