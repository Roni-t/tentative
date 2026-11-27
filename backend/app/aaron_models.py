"""Aaron-owned persistence tables for event polls.

The tables share the application's SQLAlchemy metadata and database, while the
poll API and business rules remain isolated under ``/api/aaron``.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.event import Event as _Event  # Register the FK target before mapping the poll table.


class AaronPoll(Base):
    __tablename__ = "aaron_event_polls"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    question = Column(String(300), nullable=False)
    category = Column(String(100), nullable=False, default="General")
    options = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    votes = relationship("AaronPollVote", back_populates="poll", cascade="all, delete-orphan")


class AaronPollVote(Base):
    __tablename__ = "aaron_event_poll_votes"
    __table_args__ = (UniqueConstraint("poll_id", "voter_key", name="uq_aaron_poll_voter"),)

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("aaron_event_polls.id", ondelete="CASCADE"), nullable=False, index=True)
    voter_key = Column(String(64), nullable=False)
    option = Column(String(200), nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    poll = relationship("AaronPoll", back_populates="votes")
