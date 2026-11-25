"""Invitees and the texts we send them.

Invitees are added by name and get a personal link. We only text people who
verified their own phone number. Opt-outs (STOP) are honored everywhere.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.adapters.sms_adapter import get_sms_adapter
from app.config import settings
from app.core.encryption import decrypt_phone, encrypt_phone, hash_phone, validate_name, validate_phone
from app.core.security import generate_secure_token
from app.core.timefmt import format_local, is_valid_timezone, to_utc
from app.models.availability import Availability
from app.models.event import Event
from app.models.invitee import Invitee, SmsOptOut
from app.models.notification import Notification
from app.models.user import User
from app.services.auth_service import auth_service
from app.services.event_service import event_service
from app.services.notification_service import notification_service


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class InviteeService:
    # ------------------------------------------------------------ helpers

    def _require_host(self, event_id: int, user: User, db: Session) -> Event:
        event = event_service.get_event(event_id, user, db)
        if not event_service.is_host_or_cohost(event, user, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host or a co-host can do this.")
        return event

    def respond_link(self, event: Event, invitee: Invitee) -> str:
        return f"{settings.PUBLIC_APP_URL}/events/{event.id}/respond?invite={invitee.response_token}"

    def finalize_link(self, event: Event) -> str:
        return f"{settings.PUBLIC_APP_URL}/events/{event.id}/finalize"

    def _tz(self, event: Event, invitee: Invitee) -> str:
        return invitee.timezone or event.timezone

    def is_opted_out(self, phone_hash: str, db: Session) -> bool:
        return db.query(SmsOptOut).filter(SmsOptOut.phone_hash == phone_hash).first() is not None

    def _text(self, event: Event, invitee: Invitee, message: str, notification_type: str, db: Session) -> bool:
        """Text one invitee. Does nothing if they have no verified number or opted out."""
        if not invitee.phone_hash or self.is_opted_out(invitee.phone_hash, db):
            return False
        phone = decrypt_phone(invitee.phone_encrypted)
        if not phone:
            return False
        db.add(Notification(
            event_id=event.id,
            recipient=invitee.name,
            message=message,
            notification_type=notification_type,
            sent_at=datetime.now(timezone.utc),
        ))
        db.commit()
        return get_sms_adapter().send_notification(phone, message)

    def _host_name(self, event: Event) -> str:
        return event.creator.name if event.creator else "Your host"

    # ------------------------------------------------------------ invitees

    def add_invitee(self, event_id: int, name: str, user: User, db: Session) -> Invitee:
        event = self._require_host(event_id, user, db)
        if event.status != "collecting":
            raise _bad_request("Invitees can only be added while the event is collecting responses.")
        # The host types a label like "Alex", so this is looser than an account name
        clean_name = " ".join((name or "").split())
        if not clean_name or len(clean_name) > 128 or any(ord(ch) < 32 for ch in clean_name):
            raise _bad_request("Enter the invitee's name (up to 128 characters).")

        invitee = Invitee(
            event_id=event.id,
            name=clean_name,
            response_token=generate_secure_token(24),
            created_at=datetime.now(timezone.utc),
        )
        db.add(invitee)
        db.commit()
        db.refresh(invitee)
        return invitee

    def list_invitees(self, event_id: int, user: User, db: Session) -> List[Dict]:
        event = self._require_host(event_id, user, db)
        rows = db.query(Invitee).filter(Invitee.event_id == event_id).order_by(Invitee.created_at, Invitee.id).all()
        return [self.to_out(event, inv, db) for inv in rows]

    def to_out(self, event: Event, inv: Invitee, db: Session) -> Dict:
        # Phone numbers are never returned, only whether we can text this person
        opted_out = bool(inv.phone_hash) and self.is_opted_out(inv.phone_hash, db)
        return {
            "id": inv.id,
            "name": inv.name,
            "responded_at": inv.responded_at,
            "reminder_sent_at": inv.reminder_sent_at,
            "joined_via_link": inv.joined_via_link,
            "can_text": bool(inv.phone_hash) and not opted_out,
            "sms_opted_out": opted_out,
            "response_token": inv.response_token,
            "link": self.respond_link(event, inv),
        }

    def regenerate_link(self, event_id: int, invitee_id: int, user: User, db: Session) -> Dict:
        event = self._require_host(event_id, user, db)
        invitee = db.query(Invitee).filter(Invitee.id == invitee_id, Invitee.event_id == event_id).first()
        if not invitee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitee not found.")
        old_token = invitee.response_token
        invitee.response_token = generate_secure_token(24)
        # Keep their saved availability attached to the new link
        db.query(Availability).filter(
            Availability.event_id == event_id, Availability.edit_token == old_token
        ).update({"edit_token": invitee.response_token})
        db.commit()
        return self.to_out(event, invitee, db)

    # ------------------------------------------------------------ invitee adds their own phone

    def _find_by_token(self, token: str, db: Session) -> Invitee:
        invitee = db.query(Invitee).filter(Invitee.response_token == token).first()
        if not invitee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This link is not valid.")
        return invitee

    def request_phone_code(self, token: str, phone: str, db: Session) -> Dict:
        self._find_by_token(token, db)
        try:
            normalized = validate_phone(phone)
        except ValueError as e:
            raise _bad_request(str(e))
        return auth_service.send_code(normalized, db)

    def verify_phone(self, token: str, phone: str, code: str, tz: Optional[str], db: Session):
        """Check the code, save the number on the invitee, and create or link their account."""
        invitee = self._find_by_token(token, db)
        try:
            normalized = validate_phone(phone)
        except ValueError as e:
            raise _bad_request(str(e))
        if tz and not is_valid_timezone(tz):
            raise _bad_request(f"Unknown timezone '{tz}'.")
        auth_service.consume_code(normalized, code, db)

        phone_hash = hash_phone(normalized)
        taken = db.query(Invitee).filter(
            Invitee.event_id == invitee.event_id, Invitee.phone_hash == phone_hash, Invitee.id != invitee.id
        ).first()
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That number is already on this event.")
        invitee.phone_encrypted = encrypt_phone(normalized)
        invitee.phone_hash = phone_hash
        invitee.timezone = tz or invitee.timezone

        user = db.query(User).filter(User.phone_hash == phone_hash).first()
        created = user is None
        if created:
            try:
                account_name = validate_name(invitee.name)
            except ValueError:
                account_name = "Tentative User"
            user = User(name=account_name, phone_number_encrypted=invitee.phone_encrypted, phone_hash=phone_hash,
                        created_at=datetime.now(timezone.utc))
            db.add(user)
            db.flush()
        # Their response now belongs to the account
        db.query(Availability).filter(
            Availability.event_id == invitee.event_id, Availability.edit_token == token
        ).update({"user_id": user.id})
        db.commit()

        session_token, _ = auth_service.start_session(user, keep_signed_in=True, db=db)
        return {"message": "Done. Log in with this number anytime to see all your events.",
                "account_created": created, "token": session_token}

    def opt_out(self, phone: str, db: Session) -> None:
        try:
            normalized = validate_phone(phone)
        except ValueError as e:
            raise _bad_request(str(e))
        p_hash = hash_phone(normalized)
        if not self.is_opted_out(p_hash, db):
            db.add(SmsOptOut(phone_hash=p_hash, created_at=datetime.now(timezone.utc)))
            db.commit()

    # ------------------------------------------------------------ FR-20

    def all_responded(self, event: Event, db: Session) -> bool:
        invitees = db.query(Invitee).filter(Invitee.event_id == event.id).all()
        return bool(invitees) and all(i.responded_at is not None for i in invitees)

    def record_response(self, event: Event, edit_token: str, name: str, user: Optional[User], db: Session) -> None:
        """Called after availability is saved. Marks the invitee as responded.

        Someone who answers through the general link is added to the list as "joined via link".
        Once everyone has responded, the host gets a text.
        """
        invitee = db.query(Invitee).filter(Invitee.event_id == event.id, Invitee.response_token == edit_token).first()
        if not invitee:
            if user and event_service.is_host_or_cohost(event, user, db):
                return
            invitee = Invitee(event_id=event.id, name=user.name if user else name.strip(), joined_via_link=True,
                              response_token=edit_token, created_at=datetime.now(timezone.utc))
            if user:
                invitee.phone_encrypted = user.phone_number_encrypted
                invitee.phone_hash = user.phone_hash
            db.add(invitee)
        elif invitee.responded_at is not None:
            return
        invitee.responded_at = datetime.now(timezone.utc)
        db.commit()

        if event.status != "collecting" or not self.all_responded(event, db):
            return
        already = db.query(Notification).filter(
            Notification.event_id == event.id, Notification.notification_type == "ready_to_finalize"
        ).first()
        if already:
            return
        count = db.query(Invitee).filter(Invitee.event_id == event.id).count()
        notification_service.notify_host(
            event,
            f'Tentative: All {count} invitees have responded to "{event.title}". Pick a time: {self.finalize_link(event)}',
            "ready_to_finalize",
            db,
        )

    # ------------------------------------------------------------ FR-18

    def send_deadline_reminders(self, db: Session, now: Optional[datetime] = None) -> int:
        """Text each invitee who hasn't responded, once, when the deadline is within REMINDER_LEAD_HOURS."""
        now = to_utc(now or datetime.now(timezone.utc))
        lead = timedelta(hours=settings.REMINDER_LEAD_HOURS)
        sent = 0
        events = db.query(Event).filter(Event.status == "collecting", Event.deadline.isnot(None)).all()
        for event in events:
            deadline = to_utc(event.deadline)
            if not (deadline - lead <= now < deadline):
                continue
            pending = db.query(Invitee).filter(
                Invitee.event_id == event.id, Invitee.responded_at.is_(None), Invitee.reminder_sent_at.is_(None)
            ).all()
            for invitee in pending:
                message = (f'Tentative: {self._host_name(event)} is waiting on your availability for "{event.title}". '
                           f"Respond by {format_local(deadline, self._tz(event, invitee))}: "
                           f"{self.respond_link(event, invitee)} Reply STOP to opt out.")
                if self._text(event, invitee, message, "deadline_reminder", db):
                    invitee.reminder_sent_at = now
                    db.commit()
                    sent += 1
        return sent

    # ------------------------------------------------------------ FR-19

    def host_update(self, event_id: int, message: str, preview: bool, user: User, db: Session) -> Dict:
        event = self._require_host(event_id, user, db)
        body = " ".join((message or "").split())
        if not body:
            raise _bad_request("Write an update to send.")
        if len(body) > settings.HOST_UPDATE_MAX_LENGTH:
            raise _bad_request(f"Updates must be {settings.HOST_UPDATE_MAX_LENGTH} characters or fewer.")

        text = f"Tentative – {event.title} update from {user.name}: {body}"
        invitees = db.query(Invitee).filter(Invitee.event_id == event.id).all()
        opted_out = [i for i in invitees if i.phone_hash and self.is_opted_out(i.phone_hash, db)]
        recipients = [i for i in invitees if i.phone_hash and i not in opted_out]

        def plural(n: int) -> str:
            return f"{n} invitee" + ("" if n == 1 else "s")

        confirm = f"Text this update to {plural(len(recipients))}?"
        if opted_out:
            confirm += f" {len(opted_out)} {'has' if len(opted_out) == 1 else 'have'} turned off texts."
        result = {"preview": text, "recipients_count": len(recipients), "opted_out_count": len(opted_out),
                  "confirm_text": confirm}
        if preview:
            return {**result, "sent_count": 0, "message": "Preview only; nothing was sent."}

        sent = sum(1 for i in recipients if self._text(event, i, text, "host_update", db))
        # Activity feed (change history) is visible to everyone on the event page, opted out or not
        event_service.log_change(event.id, user.id, "host_update", f"Update from {user.name}: {body}", db)
        return {**result, "sent_count": sent, "message": f"Update sent to {plural(sent)}."}

    # ------------------------------------------------------------ FR-22

    def notify_finalized(self, event: Event, db: Session) -> int:
        start = event.finalized_start_time
        where = f" at {event.location}" if event.location else ""
        sent = 0
        for invitee in db.query(Invitee).filter(Invitee.event_id == event.id).all():
            message = (f'Tentative: "{event.title}" is set for {format_local(start, self._tz(event, invitee))}{where}. '
                       f"Details: {settings.PUBLIC_APP_URL}/events/{event.id}")
            if self._text(event, invitee, message, "finalized", db):
                sent += 1
        return sent


invitee_service = InviteeService()
