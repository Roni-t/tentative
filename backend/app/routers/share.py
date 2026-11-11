from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventOut, ExpiryUpdatePayload, ShareableURLOut
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


@router.post("/api/events/{event_id}/share/rotate", response_model=ShareableURLOut)
def rotate_event_url(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rotate the shareable URL. The previous link expires immediately. Creator only."""
    event = event_service.get_event(event_id, current_user, db)
    new_url = share_link_service.rotate_url(event=event, user_id=current_user.id, db=db)
    
    event_service.log_change(
        event_id=event.id,
        user_id=current_user.id,
        action="url_rotated",
        details="Shareable URL rotated to a new token.",
        db=db
    )

    return ShareableURLOut(
        token=new_url.token,
        share_url=f"/share/{new_url.token}",
        expires_at=new_url.expires_at,
        is_active=new_url.is_active,
        created_at=new_url.created_at
    )


@router.post("/api/events/{event_id}/share/expiry", response_model=ShareableURLOut)
def update_url_expiry(
    event_id: int,
    payload: ExpiryUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extend, customize, or immediately expire the link."""
    event = event_service.get_event(event_id, current_user, db)
    url_rec = share_link_service.update_expiry(
        event=event,
        user_id=current_user.id,
        option=payload.expiry_option,
        custom_date=payload.custom_expiry_date,
        db=db
    )

    event_service.log_change(
        event_id=event.id,
        user_id=current_user.id,
        action="expiry_updated",
        details=f"Link expiry set to {url_rec.expires_at.isoformat()}.",
        db=db
    )

    return ShareableURLOut(
        token=url_rec.token,
        share_url=f"/share/{url_rec.token}",
        expires_at=url_rec.expires_at,
        is_active=url_rec.is_active,
        created_at=url_rec.created_at
    )
