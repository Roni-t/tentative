from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilitySubmitPayload(BaseModel):
    participant_name: str = Field(..., min_length=1, max_length=128)
    edit_token: Optional[str] = None
    slots: List[TimeSlot] = Field(default_factory=list)


class AvailabilitySubmitResponse(BaseModel):
    message: str
    edit_token: str
    participant_name: str
    slots_count: int


class ParticipantResponseOut(BaseModel):
    participant_name: str
    edit_token: str
    is_user: bool = False
    slots: List[TimeSlot] = []


class HeatmapSlotOut(BaseModel):
    start_time: datetime
    end_time: datetime
    count: int
    total_participants: int
    ratio: float
    available_participants: List[str] = []
    unavailable_participants: List[str] = []


class HeatmapResponse(BaseModel):
    event_id: int
    total_respondents: int
    respondent_names: List[str]
    slots: List[HeatmapSlotOut]
    best_slots: List[HeatmapSlotOut]
    cached_at: datetime
