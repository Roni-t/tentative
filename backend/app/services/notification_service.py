from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.adapters.sms_adapter import get_sms_adapter
from app.core.encryption import decrypt_phone, mask_phone
from app.models.event import Event
from app.models.invitee import Invitee, SmsOptOut
from app.models.notification import Notification
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

    # FR-7 (Reese): tell participants when a finalized meeting starts
    START_WINDOW = timedelta(minutes=30)  # a meeting that started up to 30 min ago still gets the alert

    def send_start_notifications(self, db: Session, now: Optional[datetime] = None) -> int:
        """Notify the host and everyone going or maybe, once per event, when the meeting starts."""
        now = now or datetime.now(timezone.utc)
        events = db.query(Event).filter(Event.status == "finalized", Event.finalized_start_time.isnot(None)).all()
        sent_events = 0
        for event in events:
            start = event.finalized_start_time
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if not (start <= now < start + self.START_WINDOW):
                continue
            already = db.query(Notification).filter(
                Notification.event_id == event.id, Notification.notification_type == "meeting_starting"
            ).first()
            if already:
                continue
            where = f" at {event.location}" if event.location else ""
            message = f'Tentative: "{event.title}" is starting now{where}.'
            self.notify_host(event, message, "meeting_starting", db)
            attendees = db.query(Invitee).filter(
                Invitee.event_id == event.id, Invitee.rsvp_status.in_(["going", "maybe"])
            ).all()
            for invitee in attendees:
                opted_out = bool(invitee.phone_hash) and (
                    db.query(SmsOptOut).filter(SmsOptOut.phone_hash == invitee.phone_hash).first() is not None
                )
                if opted_out:
                    continue
                db.add(Notification(
                    event_id=event.id,
                    recipient=invitee.name,
                    message=message,
                    notification_type="meeting_starting",
                    sent_at=datetime.now(timezone.utc),
                ))
                db.commit()
                if invitee.phone_encrypted:
                    plain_phone = decrypt_phone(invitee.phone_encrypted)
                    if plain_phone:
                        get_sms_adapter().send_notification(plain_phone, message)
            sent_events += 1
        return sent_events

notification_service = NotificationService()
