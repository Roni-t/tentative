from datetime import datetime
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
    
    # Expiry settings
    expiry_option: str = Field("semester", description="'1_week', '1_month', 'semester', 'custom'")
    custom_expiry_date: Optional[datetime] = None
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

    class Config:
        from_attributes = True


class FinalizeEventPayload(BaseModel):
    start_time: datetime
    end_time: datetime
    notify_participants: bool = True


class CoHostAddPayload(BaseModel):
    identifier: str = Field(..., description="Phone number or user name")


class ExpiryUpdatePayload(BaseModel):
    expiry_option: str  # '1_week', '1_month', 'semester', 'custom', 'expire_now'
    custom_expiry_date: Optional[datetime] = None


class ChangeLogOut(BaseModel):
    id: int
    action: str
    details: str
    user_name: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
