from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BugReportCreatePayload(BaseModel):
    # No phone or contact field: bug reports must not store phone numbers (NFR-4, DEV-57)
    user_name: Optional[str] = Field(None, max_length=128)
    page_url: Optional[str] = Field(None, max_length=512)
    description: str = Field(..., min_length=5)


class BugReportOut(BaseModel):
    id: int
    user_name: Optional[str] = None
    page_url: Optional[str] = None
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
