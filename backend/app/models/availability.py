from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base, UTCDateTime


class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    participant_name = Column(String(128), nullable=False)
    edit_token = Column(String(64), index=True, nullable=False)
    
    # Time slot in UTC
    start_time = Column(UTCDateTime, nullable=False, index=True)
    end_time = Column(UTCDateTime, nullable=False, index=True)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="availabilities")
    user = relationship("User", back_populates="availabilities")
