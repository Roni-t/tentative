from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.adapters.sms_adapter import get_latest_dev_code
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.encryption import decrypt_phone, mask_phone
from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, DevSmsNotice, RequestCodePayload, UserOut, VerifyCodePayload
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/request-code", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def request_code(payload: RequestCodePayload, db: Session = Depends(get_db)):
    """Request a 6-digit SMS verification code for login or account creation."""
    return auth_service.request_verification_code(phone=payload.phone, name=payload.name, db=db)


@router.post("/verify-code", response_model=AuthResponse, dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60))])
def verify_code(payload: VerifyCodePayload, response: Response, db: Session = Depends(get_db)):
    """Verify code, set session cookie, and return bearer token with user profile."""
    user, token = auth_service.verify_code(
        phone=payload.phone,
        code=payload.code,
        name=payload.name,
        db=db
    )

    # Set httpOnly session cookie
    response.set_cookie(
        key="tentative_session",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax",
        secure=False  # allow localhost in local/docker dev
    )

    plain_phone = decrypt_phone(user.phone_number_encrypted)
    user_out = UserOut(
        id=user.id,
        name=user.name,
        phone_masked=mask_phone(plain_phone) if plain_phone else "••••",
        is_admin=user.is_admin,
        created_at=user.created_at
    )

    return AuthResponse(token=token, user=user_out)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged in host account."""
    plain_phone = decrypt_phone(current_user.phone_number_encrypted)
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        phone_masked=mask_phone(plain_phone) if plain_phone else "••••",
        is_admin=current_user.is_admin,
        created_at=current_user.created_at
    )


@router.post("/logout")
def logout(response: Response):
    """Log out and remove session cookie."""
    response.delete_cookie(key="tentative_session")
    return {"message": "Successfully logged out."}


@router.get("/dev-banner-code", response_model=Optional[DevSmsNotice])
def get_dev_banner_code(phone: Optional[str] = None):
    """Dev-only helper returning the active SMS verification code for the floating banner."""
    latest = get_latest_dev_code(phone)
    if not latest:
        return None

    now = datetime.now(timezone.utc)
    created_at = latest["created_at"]
    remaining = int(300 - (now - created_at).total_seconds())
    if remaining <= 0:
        return None

    return DevSmsNotice(
        phone_masked=mask_phone(latest["phone"]),
        code=latest["code"],
        expires_at=created_at,
        remaining_seconds=max(0, remaining)
    )
