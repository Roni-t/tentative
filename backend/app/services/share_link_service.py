from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.core.security import ensure_utc, generate_secure_token
from app.models.event import Event
from app.models.shareable_url import ShareableURL


class ShareLinkService:
    def compute_expiry(self, option: str, custom_date: Optional[datetime] = None) -> datetime:
        now = datetime.now(timezone.utc)
        if option == "1_week":
            return now + timedelta(days=7)
        elif option == "1_month":
            return now + timedelta(days=30)
        elif option == "custom" and custom_date:
            if custom_date.tzinfo is None:
                return custom_date.replace(tzinfo=timezone.utc)
            return custom_date
        else:
            # Default: End of Semester (configurable)
            try:
                parts = [int(p) for p in settings.DEFAULT_SEMESTER_END_DATE.split("-")]
                sem_date = datetime(parts[0], parts[1], parts[2], 23, 59, 59, tzinfo=timezone.utc)
                if sem_date > now:
                    return sem_date
            except Exception:
                pass
            return now + timedelta(days=90)

    def create_event_url(
        self,
        event_id: int,
        expiry_option: str = "semester",
        custom_expiry_date: Optional[datetime] = None,
        db: Session = None
    ) -> ShareableURL:
        expires_at = self.compute_expiry(expiry_option, custom_expiry_date)
        token = generate_secure_token(16)
        
        share_url = ShareableURL(
            token=token,
            event_id=event_id,
            expires_at=expires_at,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(share_url)
        db.commit()
        db.refresh(share_url)
        return share_url

    def rotate_url(self, event: Event, user_id: int, db: Session) -> ShareableURL:
        """Rotate shareable URL. Old link dies immediately. Only creator can rotate."""
        if event.created_by_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the event creator can rotate the shareable URL."
            )

        # Deactivate all current URLs for this event
        existing = db.query(ShareableURL).filter(
            ShareableURL.event_id == event.id,
            ShareableURL.is_active == True
        ).all()

        last_expiry = None
        for u in existing:
            u_exp = ensure_utc(u.expires_at)
            if not last_expiry or (u_exp and u_exp > last_expiry):
                last_expiry = u_exp
            u.is_active = False

        now = datetime.now(timezone.utc)
        new_expiry = last_expiry if last_expiry and last_expiry > now else self.compute_expiry("semester")
        new_token = generate_secure_token(16)

        new_url = ShareableURL(
            token=new_token,
            event_id=event.id,
            expires_at=new_expiry,
            is_active=True,
            created_at=now
        )
        db.add(new_url)
        db.commit()
        db.refresh(new_url)
        return new_url

    def update_expiry(
        self,
        event: Event,
        user_id: int,
        option: str,
        custom_date: Optional[datetime],
        db: Session
    ) -> ShareableURL:
        if event.created_by_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the event creator can modify link expiry."
            )

        active_url = db.query(ShareableURL).filter(
            ShareableURL.event_id == event.id,
            ShareableURL.is_active == True
        ).first()

        if not active_url:
            return self.create_event_url(event.id, option, custom_date, db)

        if option == "expire_now":
            active_url.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            active_url.is_active = False
        else:
            active_url.expires_at = self.compute_expiry(option, custom_date)
            active_url.is_active = True

        db.commit()
        db.refresh(active_url)
        return active_url

    def resolve_token(self, token: str, db: Session) -> ShareableURL:
        """Resolve a token, raising 404 if not found and 410 if expired."""
        record = db.query(ShareableURL).filter(ShareableURL.token == token).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Orbit link not found."
            )

        now = datetime.now(timezone.utc)
        if not record.is_active or (record.expires_at and ensure_utc(record.expires_at) < now):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This orbit has ended. The shareable link has expired."
            )

        return record


share_link_service = ShareLinkService()
