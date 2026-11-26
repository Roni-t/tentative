from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text
from app.database import Base, UTCDateTime


class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(128), nullable=True)
    email_or_phone = Column(String(128), nullable=True)
    page_url = Column(String(512), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="open", nullable=False)
    created_at = Column(UTCDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
