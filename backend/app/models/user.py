from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    phone_number_encrypted = Column(String(512), nullable=False)
    phone_hash = Column(String(64), unique=True, index=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    events_created = relationship("Event", back_populates="creator", cascade="all, delete-orphan")
    availabilities = relationship("Availability", back_populates="user")
    rsvps = relationship("RSVP", back_populates="user")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    changelog_entries = relationship("ChangeLogEntry", back_populates="user")
