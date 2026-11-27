from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class RSVP(Base):
    __tablename__ = "rsvps"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    participant_name = Column(String(128), nullable=False)
    participant_phone = Column(String(128), nullable=True)
    edit_token = Column(String(64), index=True, nullable=False)
    
    # Status: 'going', 'maybe', 'not_going'
    status = Column(String(32), default="going", nullable=False, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="rsvps")
    user = relationship("User", back_populates="rsvps")
