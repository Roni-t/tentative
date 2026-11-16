from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InviteeCreatePayload(BaseModel):
    name: str = Field(..., max_length=512)
    phone: str = Field(..., max_length=64)
    timezone: Optional[str] = Field(None, max_length=64, description="IANA timezone; defaults to the event's")


class InviteeOut(BaseModel):
    id: int
    name: str
    phone_masked: str
    timezone: Optional[str] = None
    responded_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    sms_opted_out: bool = False
    response_token: Optional[str] = None  # only returned to the host when the invitee is created


class HostUpdatePayload(BaseModel):
    message: str = Field(..., max_length=2000)


class HostUpdateOut(BaseModel):
    preview: str
    recipients_count: int
    opted_out_count: int
    confirm_text: str
    sent_count: int
    message: str


class OptOutPayload(BaseModel):
    phone: str = Field(..., max_length=64)
