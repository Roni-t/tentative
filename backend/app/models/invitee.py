from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Invitee(Base):
    # Someone invited to an event. Their personal link token is also their availability edit_token.
    # The phone fields stay empty until the invitee verifies their own number.
    __tablename__ = "invitees"
    __table_args__ = (UniqueConstraint("event_id", "phone_hash", name="uq_invitee_event_phone"),)

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    phone_encrypted = Column(String(512), nullable=True)
    phone_hash = Column(String(64), nullable=True, index=True)
    timezone = Column(String(64), nullable=True)  # falls back to the event's timezone
    response_token = Column(String(64), unique=True, index=True, nullable=False)

    joined_via_link = Column(Boolean, default=False, nullable=False)
    responded_at = Column(DateTime, nullable=True)
    reminder_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event")


class SmsOptOut(Base):
    # Phone numbers that replied STOP, stored as hashes only
    __tablename__ = "sms_opt_outs"

    id = Column(Integer, primary_key=True, index=True)
    phone_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
