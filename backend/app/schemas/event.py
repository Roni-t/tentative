from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EventCreatePayload(BaseModel):
    title: str = Field(..., max_length=256)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=512)
    timezone: str = "America/Chicago"
    candidate_dates: List[str] = Field(..., min_length=1, description="List of YYYY-MM-DD dates")
    daily_start_time: str = Field("09:00", pattern=r"^\d{2}:\d{2}$")
    daily_end_time: str = Field("21:00", pattern=r"^\d{2}:\d{2}$")
    slot_duration_minutes: int = Field(30, description="15, 30, or 60")
    deadline: Optional[datetime] = None
    capacity_limit: Optional[int] = Field(None, ge=1)
    is_hidden_details: bool = False

    group_name: Optional[str] = None


class EventUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    deadline: Optional[datetime] = None
    capacity_limit: Optional[int] = None
    is_hidden_details: Optional[bool] = None


class ShareableURLOut(BaseModel):
    token: str
    share_url: str
    expires_at: datetime
    is_active: bool
    created_at: datetime


class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    timezone: str
    candidate_dates: List[str]
    daily_start_time: str
    daily_end_time: str
    slot_duration_minutes: int
    deadline: Optional[datetime] = None
    capacity_limit: Optional[int] = None
    is_hidden_details: bool
    status: str
    finalized_start_time: Optional[datetime] = None
    finalized_end_time: Optional[datetime] = None
    created_by_id: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Link & Access flags
    active_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_host: bool = False
    is_cohost: bool = False
    respondents_count: int = 0
    co_hosts: List[str] = []
    deadline_display: Optional[str] = None  # deadline in the event's timezone, e.g. "Wed, Nov 25, 5:00 PM CST"
    ready_to_finalize: bool = False  # every invitee has responded (FR-20)

    class Config:
        from_attributes = True


class FinalizeEventPayload(BaseModel):
    start_time: datetime
    end_time: datetime
    notify_participants: bool = True


class CoHostAddPayload(BaseModel):
    identifier: str = Field(..., description="Phone number or user name")


class ChangeLogOut(BaseModel):
    id: int
    action: str
    details: str
    user_name: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# UC-11 Recurring events (FR-1, Aaron)
class RecurrencePayload(BaseModel):
    frequency: str  # "weekly" or "biweekly"
    days_of_week: List[str]  # e.g. ["MO", "WE"]
    end_date: date


class RecurrenceOut(BaseModel):
    event_id: int
    is_recurring: bool
    frequency: Optional[str] = None
    days_of_week: List[str] = []
    end_date: Optional[str] = None
    occurrences: List[str] = []
