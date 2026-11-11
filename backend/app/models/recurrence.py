from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class RecurrenceRule(Base):
    __tablename__ = "recurrence_rules"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Frequency: 'weekly', 'biweekly'
    frequency = Column(String(32), default="weekly", nullable=False)
    interval = Column(Integer, default=1, nullable=False)
    days_of_week = Column(String(64), nullable=False)  # comma separated e.g. "MO,WE,FR" or "TUE"
    end_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("Event", back_populates="recurrence_rules")
