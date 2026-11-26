from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.adapters.ics_exporter import generate_google_calendar_url, generate_ics
from app.core.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.event import Event, EventCoHost
from app.models.shareable_url import ShareableURL
from app.models.user import User
from app.schemas.event import (
    ChangeLogOut,
    CoHostAddPayload,
    EventCreatePayload,
    EventOut,
    EventUpdatePayload,
    FinalizeEventPayload,
)
from app.services.event_service import event_service
from app.services.invitee_service import invitee_service
from app.services.notification_service import notification_service
from app.core.timefmt import format_local

router = APIRouter(prefix="/api/events", tags=["Events"])


def _format_event_out(event: Event, current_user: Optional[User], db: Session) -> EventOut:
    active_url = db.query(ShareableURL).filter(
        ShareableURL.event_id == event.id,
        ShareableURL.is_active == True
    ).first()

    is_host = current_user is not None and event.created_by_id == current_user.id
    is_cohost = False
    if current_user and not is_host:
        ch = db.query(EventCoHost).filter(
            EventCoHost.event_id == event.id,
            EventCoHost.user_id == current_user.id
        ).first()
        is_cohost = ch is not None

    cohost_names = [ch.user.name for ch in event.co_hosts if ch.user]
    unique_respondents = len({a.participant_name for a in event.availabilities})

    # "Surprise party" feature: if details hidden and event not finalized and user is neither host nor cohost
    description = event.description
    location = event.location
    if event.is_hidden_details and event.status != "finalized" and not (is_host or is_cohost):
        description = "Surprise Event! Full details will be revealed once the time is finalized."
        location = "Location will be revealed upon finalization."

    return EventOut(
        id=event.id,
        title=event.title,
        description=description,
        location=location,
        timezone=event.timezone,
        candidate_dates=event.candidate_dates,
        daily_start_time=event.daily_start_time,
        daily_end_time=event.daily_end_time,
        slot_duration_minutes=event.slot_duration_minutes,
        deadline=event.deadline,
        deadline_display=format_local(event.deadline, event.timezone) if event.deadline else None,
        capacity_limit=event.capacity_limit,
        is_hidden_details=event.is_hidden_details,
        status=event.status,
        finalized_start_time=event.finalized_start_time,
        finalized_end_time=event.finalized_end_time,
        created_by_id=event.created_by_id,
        creator_name=event.creator.name if event.creator else "Unknown",
        created_at=event.created_at,
        updated_at=event.updated_at,
        active_token=active_url.token if active_url else None,
        expires_at=active_url.expires_at if active_url else None,
        is_host=is_host,
        is_cohost=is_cohost,
        respondents_count=unique_respondents,
        co_hosts=cohost_names,
        ready_to_finalize=event.status == "collecting" and invitee_service.all_responded(event, db),
    )


@router.post("", response_model=EventOut)
def create_event(
    payload: EventCreatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new event with candidate dates, slot settings, and auto-generated expiring URL."""
    event = event_service.create_event(payload=payload, creator=current_user, db=db)
    return _format_event_out(event, current_user, db)


@router.get("", response_model=List[EventOut])
def list_my_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List events created by current host or where host is a co-host."""
    cohosted_ids = [ch.event_id for ch in db.query(EventCoHost).filter(EventCoHost.user_id == current_user.id).all()]
    events = db.query(Event).filter(
        (Event.created_by_id == current_user.id) | (Event.id.in_(cohosted_ids))
    ).order_by(Event.created_at.desc()).all()

    return [_format_event_out(e, current_user, db) for e in events]


@router.get("/{event_id}", response_model=EventOut)
def get_event_by_id(
    event_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get single event details."""
    event = event_service.get_event(event_id, current_user, db)
    return _format_event_out(event, current_user, db)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update event properties (host or co-host)."""
    event = event_service.update_event(event_id, payload, current_user, db)
    return _format_event_out(event, current_user, db)


@router.post("/{event_id}/finalize", response_model=EventOut)
def finalize_event(
    event_id: int,
    payload: FinalizeEventPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lock in final event time and optionally notify all participants."""
    event = event_service.finalize_event(
        event_id=event_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        user=current_user,
        db=db
    )

    if payload.notify_participants:
        notification_service.notify_all_invitees(
            event=event,
            message=f"Event '{event.title}' is finalized for {format_local(event.finalized_start_time, event.timezone)}.",
            notification_type="finalized",
            db=db
        )
        invitee_service.notify_finalized(event, db)  # FR-22: texted in each invitee's timezone

    return _format_event_out(event, current_user, db)


@router.post("/{event_id}/cancel", response_model=EventOut)
def cancel_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel event and alert participants."""
    event = event_service.cancel_event(event_id=event_id, user=current_user, db=db)
    notification_service.notify_all_invitees(
        event=event,
        message=f"Event '{event.title}' was canceled by the host.",
        notification_type="canceled",
        db=db
    )
    return _format_event_out(event, current_user, db)


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete event (creator only)."""
    event_service.delete_event(event_id=event_id, user=current_user, db=db)
    return {"message": "Event permanently deleted."}


@router.post("/{event_id}/cohosts")
def add_cohost(
    event_id: int,
    payload: CoHostAddPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a co-host to the event."""
    added = event_service.add_cohost(event_id, payload.identifier, current_user, db)
    return {"message": f"Added {added.name} as co-host.", "user_id": added.id}


@router.post("/{event_id}/block")
def block_user(
    event_id: int,
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Block a user from RSVP or submitting availability."""
    event_service.block_user(event_id, identifier, current_user, db)
    return {"message": f"Blocked user '{identifier}'."}


@router.get("/{event_id}/changelog", response_model=List[ChangeLogOut])
def get_changelog(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get audit change history for this event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    entries = event.changelog_entries
    result = []
    for en in sorted(entries, key=lambda x: x.timestamp, reverse=True):
        result.append(ChangeLogOut(
            id=en.id,
            action=en.action,
            details=en.details,
            user_name=en.user.name if en.user else "System",
            timestamp=en.timestamp
        ))
    return result


@router.get("/{event_id}/export.ics")
def export_ics(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Download standard RFC 5545 iCalendar (.ics) file."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    st = event.finalized_start_time or datetime.now(timezone.utc)
    et = event.finalized_end_time or st

    ics_content = generate_ics(
        event_id=event.id,
        title=event.title,
        description=event.description or "",
        location=event.location or "",
        start_time=st,
        end_time=et
    )

    filename = f"tentative-{event.id}.ics"
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{event_id}/google-calendar-url")
def get_google_calendar_url(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Return quick web URL for 'Add to Google Calendar'."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    st = event.finalized_start_time or datetime.now(timezone.utc)
    et = event.finalized_end_time or st

    url = generate_google_calendar_url(
        title=event.title,
        description=event.description or "",
        location=event.location or "",
        start_time=st,
        end_time=et
    )
    return {"url": url}
