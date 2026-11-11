from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(512), nullable=True)
    timezone = Column(String(64), default="America/Chicago", nullable=False)
    
    # Candidate date ranges stored as JSON list of strings ["2026-09-14", "2026-09-15", ...]
    candidate_dates = Column(JSON, nullable=False)
    daily_start_time = Column(String(8), default="09:00", nullable=False)
    daily_end_time = Column(String(8), default="21:00", nullable=False)
    slot_duration_minutes = Column(Integer, default=30, nullable=False)
    
    # Requirements & Limits
    deadline = Column(DateTime, nullable=True)
    capacity_limit = Column(Integer, nullable=True)
    is_hidden_details = Column(Boolean, default=False, nullable=False)
    
    # Status: 'collecting', 'finalized', 'canceled'
    status = Column(String(32), default="collecting", index=True, nullable=False)
    finalized_start_time = Column(DateTime, nullable=True)
    finalized_end_time = Column(DateTime, nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="events_created")
    group = relationship("Group", back_populates="events")
    availabilities = relationship("Availability", back_populates="event", cascade="all, delete-orphan")
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="event", cascade="all, delete-orphan")
    shareable_urls = relationship("ShareableURL", back_populates="event", cascade="all, delete-orphan")
    changelog_entries = relationship("ChangeLogEntry", back_populates="event", cascade="all, delete-orphan")
    co_hosts = relationship("EventCoHost", back_populates="event", cascade="all, delete-orphan")
    blocked_users = relationship("BlockedUser", back_populates="event", cascade="all, delete-orphan")
    recurrence_rules = relationship("RecurrenceRule", back_populates="event", cascade="all, delete-orphan")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    events = relationship("Event", back_populates="group")
    shareable_urls = relationship("ShareableURL", back_populates="group", cascade="all, delete-orphan")


class EventCoHost(Base):
    __tablename__ = "event_co_hosts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="co_hosts")
    user = relationship("User")


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    identifier = Column(String(128), nullable=False, index=True)  # phone hash or normalized name
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="blocked_users")
