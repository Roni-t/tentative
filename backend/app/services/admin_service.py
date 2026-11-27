from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from app.config import settings
from app.core.encryption import mask_phone, decrypt_phone
from app.models.event import Event
from app.models.invitee import Invitee
from app.models.user import User
from app.schemas.admin import AdminEventOut, AdminUserOut, SystemStatusOut

_system_start_time = datetime.now(timezone.utc)
_is_maintenance_mode = False


class AdminService:
    def get_system_status(self, db: Session) -> SystemStatusOut:
        total_users = db.query(User).count()
        total_events = db.query(Event).count()
        total_rsvps = db.query(Invitee).filter(Invitee.rsvp_status.isnot(None)).count()

        return SystemStatusOut(
            status="maintenance" if _is_maintenance_mode else "online",
            active_connections=1,
            total_users=total_users,
            total_events=total_events,
            total_rsvps=total_rsvps,
            db_path=settings.DATABASE_URL,
            server_time=datetime.now(timezone.utc),
            uptime_since=_system_start_time
        )

    def set_system_power(self, power_on: bool) -> str:
        global _is_maintenance_mode
        _is_maintenance_mode = not power_on
        return "online" if not _is_maintenance_mode else "maintenance"

    def list_users(self, db: Session) -> List[AdminUserOut]:
        users = db.query(User).order_by(User.created_at.desc()).all()
        result = []
        for u in users:
            phone_plain = decrypt_phone(u.phone_number_encrypted)
            events_count = len(u.events_created)
            result.append(AdminUserOut(
                id=u.id,
                name=u.name,
                phone_masked=mask_phone(phone_plain) if phone_plain else "****",
                is_admin=u.is_admin,
                events_count=events_count,
                created_at=u.created_at
            ))
        return result

    def delete_user(self, user_id: int, db: Session) -> bool:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False

    def list_events(self, db: Session) -> List[AdminEventOut]:
        events = db.query(Event).order_by(Event.created_at.desc()).all()
        result = []
        for e in events:
            creator_name = e.creator.name if e.creator else "Unknown"
            result.append(AdminEventOut(
                id=e.id,
                title=e.title,
                status=e.status,
                creator_name=creator_name,
                created_at=e.created_at,
                respondents_count=len(e.availabilities)
            ))
        return result

    def delete_event(self, event_id: int, db: Session) -> bool:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            db.delete(event)
            db.commit()
            return True
        return False


admin_service = AdminService()
