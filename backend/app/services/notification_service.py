from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.adapters.sms_adapter import get_sms_adapter
from app.core.encryption import decrypt_phone, mask_phone
from app.models.event import Event
from app.models.notification import Notification
from app.models.rsvp import RSVP
from app.models.user import User


class NotificationService:
    def notify_host(self, event: Event, message: str, notification_type: str, db: Session):
        host = db.query(User).filter(User.id == event.created_by_id).first()
        if not host:
            return

        plain_phone = decrypt_phone(host.phone_number_encrypted)
        
        # Save notification to DB
        notif = Notification(
            user_id=host.id,
            event_id=event.id,
            recipient=f"{host.name} ({mask_phone(plain_phone)})" if plain_phone else host.name,
            message=message,
            notification_type=notification_type,
            sent_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        db.commit()

        # Send via SMS adapter
        if plain_phone:
            sms = get_sms_adapter()
            sms.send_notification(plain_phone, message)

    def notify_participant(self, recipient: str, event: Event, message: str, notification_type: str, db: Session):
        is_phone = recipient.startswith("+") or recipient.replace("-", "").isdigit()
        notif = Notification(
            event_id=event.id,
            recipient=mask_phone(recipient) if is_phone else recipient,
            message=message,
            notification_type=notification_type,
            sent_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        db.commit()

        if recipient.startswith("+") or recipient.replace("-", "").isdigit():
            sms = get_sms_adapter()
            sms.send_notification(recipient, message)

    def notify_all_invitees(self, event: Event, message: str, notification_type: str, db: Session):
        rsvps = db.query(RSVP).filter(RSVP.event_id == event.id).all()
        for r in rsvps:
            recip = r.participant_email_or_phone or r.participant_name
            self.notify_participant(recip, event, message, notification_type, db)


notification_service = NotificationService()
