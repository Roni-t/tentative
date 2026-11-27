from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RsvpSubmitPayload(BaseModel):
    status: str  # 'going', 'maybe', 'not_going'


class RsvpPage(BaseModel):
    """What the RSVP link shows: the event, the invitee, and whether they can still answer."""
    event_id: int
    title: str
    location: Optional[str] = None
    timezone: str
    finalized_start_time: Optional[datetime] = None
    finalized_end_time: Optional[datetime] = None
    name: str
    rsvp_status: Optional[str] = None
    open: bool
    closed_reason: Optional[str] = None
    capacity_limit: Optional[int] = None
    spots_left: Optional[int] = None
