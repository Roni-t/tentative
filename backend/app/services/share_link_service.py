"""The event's group link (FR-24/25). Its expiry is automatic, not a host setting (DEV-172):
it stops working at the response deadline if the event has one, otherwise 30 days after it was made.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import ensure_utc, generate_secure_token
from app.models.event import Event
from app.models.shareable_url import ShareableURL

LINK_LIFETIME = timedelta(days=30)


class ShareLinkService:
    def expiry_for(self, link: ShareableURL, event: Optional[Event]) -> datetime:
        """Worked out each time, so moving the response deadline moves the link's expiry with it."""
        if event is not None and event.deadline:
            return ensure_utc(event.deadline)
        if event is None and link.expires_at:  # group links (several events) keep their stored expiry
            return ensure_utc(link.expires_at)
        return ensure_utc(link.created_at) + LINK_LIFETIME

    def is_expired(self, link: ShareableURL, event: Optional[Event], now: Optional[datetime] = None) -> bool:
        now = now or datetime.now(timezone.utc)
        return not link.is_active or self.expiry_for(link, event) <= now

    def create_event_url(self, event: Event, db: Session) -> ShareableURL:
        now = datetime.now(timezone.utc)
        link = ShareableURL(token=generate_secure_token(16), event_id=event.id, is_active=True, created_at=now,
                            expires_at=ensure_utc(event.deadline) if event.deadline else now + LINK_LIFETIME)
        db.add(link)
        db.commit()
        db.refresh(link)
        return link

    def active_link(self, event: Event, db: Session) -> Optional[ShareableURL]:
        return (db.query(ShareableURL)
                .filter(ShareableURL.event_id == event.id, ShareableURL.is_active == True)  # noqa: E712
                .order_by(ShareableURL.created_at.desc()).first())

    def current_group_link(self, event: Event, db: Session) -> ShareableURL:
        """The link for "Copy group link". An expired one is replaced, unless the response deadline has passed."""
        link = self.active_link(event, db)
        if link and not self.is_expired(link, event):
            return link
        if event.deadline and ensure_utc(event.deadline) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="The response deadline has passed, so the group link no longer works.")
        if link:
            link.is_active = False
        return self.create_event_url(event, db)

    def resolve_token(self, token: str, db: Session) -> ShareableURL:
        """Resolve a token, raising 404 if not found and 410 if expired."""
        record = db.query(ShareableURL).filter(ShareableURL.token == token).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orbit link not found.")
        if self.is_expired(record, record.event):
            raise HTTPException(status_code=status.HTTP_410_GONE,
                                detail="This orbit has ended. The shareable link has expired.")
        return record


share_link_service = ShareLinkService()
