from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RsvpSubmitPayload(BaseModel):
    participant_name: str = Field(..., min_length=1, max_length=128)
    participant_email_or_phone: Optional[str] = None
    edit_token: Optional[str] = None
    status: str = Field(..., description="'going', 'maybe', 'not_going'")


class RsvpOut(BaseModel):
    id: int
    event_id: int
    participant_name: str
    participant_email_or_phone: Optional[str] = None
    status: str
    waitlist_position: Optional[int] = None
    edit_token: str
    updated_at: datetime

    class Config:
        from_attributes = True


class RsvpSummary(BaseModel):
    event_id: int
    total_invitees: int
    count_going: int
    count_maybe: int
    count_not_going: int
    count_waitlisted: int
    count_no_response: int
    capacity_limit: Optional[int] = None
    current_status: Optional[str] = None  # if caller provided edit_token
    current_waitlist_position: Optional[int] = None
    rsvps: List[RsvpOut] = []
