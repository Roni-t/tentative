from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RequestCodePayload(BaseModel):
    phone: str = Field(..., description="Phone number, e.g. +19725550142 or (972) 555-0142")
    name: Optional[str] = Field(None, description="Host full name for account creation")


class VerifyCodePayload(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    phone_masked: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserOut
    dev_code: Optional[str] = None


class DevSmsNotice(BaseModel):
    phone_masked: str
    code: str
    expires_at: datetime
    remaining_seconds: int
