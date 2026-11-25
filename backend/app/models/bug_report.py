from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text
from app.database import Base


class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(128), nullable=True)
    contact = Column(String(128), nullable=True)
    page_url = Column(String(512), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="open", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
