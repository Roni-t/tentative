from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class AaronBase(DeclarativeBase):
    pass


class AaronEvent(AaronBase):
    __tablename__ = "aaron_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_event_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[str] = mapped_column(String(10))
    window_start: Mapped[str] = mapped_column(String(5))
    window_end: Mapped[str] = mapped_column(String(5))
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    owner_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    recurrence: Mapped[Optional["AaronRecurrence"]] = relationship(
        back_populates="event", cascade="all, delete-orphan", uselist=False
    )
    cohosts: Mapped[list["AaronCoHost"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    participants: Mapped[list["AaronParticipant"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    polls: Mapped[list["AaronPoll"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class AaronRecurrence(AaronBase):
    __tablename__ = "aaron_recurrences"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("aaron_events.id", ondelete="CASCADE"), unique=True)
    frequency: Mapped[str] = mapped_column(String(16))
    interval: Mapped[int] = mapped_column(Integer, default=1)
    days_of_week: Mapped[list[str]] = mapped_column(JSON, default=list)
    end_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    event: Mapped[AaronEvent] = relationship(back_populates="recurrence")


class AaronCoHost(AaronBase):
    __tablename__ = "aaron_cohosts"
    __table_args__ = (UniqueConstraint("event_id", "name", name="uq_aaron_cohost_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("aaron_events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event: Mapped[AaronEvent] = relationship(back_populates="cohosts")


class AaronParticipant(AaronBase):
    __tablename__ = "aaron_participants"
    __table_args__ = (UniqueConstraint("event_id", "name", name="uq_aaron_participant_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("aaron_events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    response: Mapped[str] = mapped_column(String(16))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    event: Mapped[AaronEvent] = relationship(back_populates="participants")


class AaronPoll(AaronBase):
    __tablename__ = "aaron_polls"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("aaron_events.id", ondelete="CASCADE"), index=True)
    question: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(100), default="General")
    options: Mapped[list[str]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event: Mapped[AaronEvent] = relationship(back_populates="polls")
    votes: Mapped[list["AaronPollVote"]] = relationship(
        back_populates="poll", cascade="all, delete-orphan"
    )


class AaronPollVote(AaronBase):
    __tablename__ = "aaron_poll_votes"
    __table_args__ = (UniqueConstraint("poll_id", "voter_key", name="uq_aaron_poll_voter"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    poll_id: Mapped[int] = mapped_column(ForeignKey("aaron_polls.id", ondelete="CASCADE"), index=True)
    voter_key: Mapped[str] = mapped_column(String(64))
    option: Mapped[str] = mapped_column(String(200))

    poll: Mapped[AaronPoll] = relationship(back_populates="votes")
