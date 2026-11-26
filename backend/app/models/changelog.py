from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base, UTCDateTime


class ChangeLogEntry(Base):
    __tablename__ = "changelog_entries"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action = Column(String(64), nullable=False)  # 'created', 'updated', 'finalized', 'canceled', 'cohost_added'
    details = Column(Text, nullable=False)
    timestamp = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="changelog_entries")
    user = relationship("User", back_populates="changelog_entries")
