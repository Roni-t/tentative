from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InviteeCreatePayload(BaseModel):
    name: str = Field(..., max_length=512)


class InviteeOut(BaseModel):
    id: int
    name: str
    responded_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    joined_via_link: bool = False
    can_text: bool = False
    sms_opted_out: bool = False
    response_token: str
    link: str


class InviteePhonePayload(BaseModel):
    phone: str = Field(..., max_length=64)


class InviteePhoneVerifyPayload(BaseModel):
    phone: str = Field(..., max_length=64)
    code: str = Field(..., max_length=16)
    timezone: Optional[str] = Field(None, max_length=64)


class InviteePhoneVerifyOut(BaseModel):
    message: str
    account_created: bool
    token: str


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
