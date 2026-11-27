from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventOut, ShareableURLOut
from app.services.event_service import event_service
from app.services.share_link_service import share_link_service
from app.routers.events import _format_event_out

router = APIRouter(tags=["Shareable URLs"])


@router.get("/api/share/{token}", response_model=EventOut)
def resolve_share_token(
    token: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Open an event via share token. If link expired, returns 410 Gone."""
    url_record = share_link_service.resolve_token(token, db)
    if not url_record.event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No event associated with this token.")

    event = db.query(Event).filter(Event.id == url_record.event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return _format_event_out(event, current_user, db)


@router.post("/api/events/{event_id}/group-link", response_model=ShareableURLOut)
def get_group_link(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """The link for "Copy group link". If it has expired (30 days, no deadline) a new one is made."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if not event_service.is_host_or_cohost(event, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host or a co-host can do this.")
    previous = share_link_service.active_link(event, db)
    link = share_link_service.current_group_link(event, db)
    if previous is None or previous.id != link.id:
        event_service.log_change(event.id, current_user.id, "url_rotated", "Expired group link replaced with a new one.", db)
    return ShareableURLOut(
        token=link.token,
        share_url=f"/share/{link.token}",
        expires_at=share_link_service.expiry_for(link, event),
        is_active=link.is_active,
        created_at=link.created_at,
    )
