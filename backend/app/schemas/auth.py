from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Field formats are validated in AuthService so errors come back as plain-English
# 400 messages the UI can show directly, rather than 422 validation arrays.


class RegisterRequestCodePayload(BaseModel):
    """UC-1 step 1: submit name and phone number."""
    name: str = Field(..., max_length=512, description="Full name")
    phone: str = Field(..., max_length=64, description="Phone number, e.g. +19725550142 or (972) 555-0142")


class RegisterVerifyPayload(BaseModel):
    """UC-1 step 2: submit the texted code to create the account."""
    name: str = Field(..., max_length=512)
    phone: str = Field(..., max_length=64)
    code: str = Field(..., max_length=16)


class LoginRequestCodePayload(BaseModel):
    """UC-2 step 1: submit phone number."""
    phone: str = Field(..., max_length=64)


class LoginVerifyPayload(BaseModel):
    """UC-2 step 2: submit the texted code to sign in."""
    phone: str = Field(..., max_length=64)
    code: str = Field(..., max_length=16)
    keep_signed_in: bool = True


class CodeSentResponse(BaseModel):
    message: str
    phone_masked: str
    expires_in_seconds: int
    dev_code: Optional[str] = None


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
    expires_at: datetime
    user: UserOut


class DevSmsNotice(BaseModel):
    phone_masked: str
    code: str
    expires_at: datetime
    remaining_seconds: int
