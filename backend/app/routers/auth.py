from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.adapters.sms_adapter import get_latest_dev_code
from app.config import settings
from app.core.dependencies import SESSION_COOKIE, get_active_session, get_current_user
from app.core.encryption import decrypt_phone, mask_phone, validate_phone
from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.models.auth import Session as DbSession
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    CodeSentResponse,
    DevSmsNotice,
    LoginRequestCodePayload,
    LoginVerifyPayload,
    RegisterRequestCodePayload,
    RegisterVerifyPayload,
    UserOut,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Sending a code costs an SMS, so it is limited more tightly than verifying one.
send_limit = Depends(rate_limit(max_requests=settings.RATE_LIMIT_AUTH_PER_MINUTE, window_seconds=60))
verify_limit = Depends(rate_limit(max_requests=15, window_seconds=60))


def _user_out(user: User) -> UserOut:
    plain_phone = decrypt_phone(user.phone_number_encrypted)
    return UserOut(
        id=user.id,
        name=user.name,
        phone_masked=mask_phone(plain_phone) if plain_phone else "****",
        is_admin=user.is_admin,
        created_at=user.created_at,
    )


def _signed_in(response: Response, user: User, token: str, expires_at: datetime, persistent: bool) -> AuthResponse:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # local/docker dev is served over plain http
        # Without max_age the cookie ends with the browser session ("keep me signed in" unchecked).
        max_age=int((expires_at - datetime.now(timezone.utc)).total_seconds()) if persistent else None,
    )
    return AuthResponse(token=token, expires_at=expires_at, user=_user_out(user))


# ---------------------------------------------------------------- UC-1: Account creation

@router.post("/register/request-code", response_model=CodeSentResponse, dependencies=[send_limit])
def register_request_code(payload: RegisterRequestCodePayload, db: Session = Depends(get_db)):
    """Validate name and phone, ensure the phone is not registered, and text a verification code."""
    return auth_service.request_registration_code(phone=payload.phone, name=payload.name, db=db)


@router.post("/register/verify", response_model=AuthResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[verify_limit])
def register_verify(payload: RegisterVerifyPayload, response: Response, db: Session = Depends(get_db)):
    """Verify the code, then encrypt the phone number, store the account, and sign the user in."""
    user, token, expires_at = auth_service.complete_registration(
        phone=payload.phone, name=payload.name, code=payload.code, db=db
    )
    return _signed_in(response, user, token, expires_at, persistent=True)


# ---------------------------------------------------------------- UC-2: Login

@router.post("/login/request-code", response_model=CodeSentResponse, dependencies=[send_limit])
def login_request_code(payload: LoginRequestCodePayload, db: Session = Depends(get_db)):
    """Look up the phone number; text a code if the account exists, otherwise 404 (prompt to register)."""
    return auth_service.request_login_code(phone=payload.phone, db=db)


@router.post("/login/verify", response_model=AuthResponse, dependencies=[verify_limit])
def login_verify(payload: LoginVerifyPayload, response: Response, db: Session = Depends(get_db)):
    """Verify the code and start a session."""
    user, token, expires_at = auth_service.complete_login(
        phone=payload.phone, code=payload.code, keep_signed_in=payload.keep_signed_in, db=db
    )
    return _signed_in(response, user, token, expires_at, persistent=payload.keep_signed_in)


# ---------------------------------------------------------------- Session

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the signed-in account."""
    return _user_out(current_user)


@router.post("/logout")
def logout(
    response: Response,
    db_sess: Optional[DbSession] = Depends(get_active_session),
    db: Session = Depends(get_db),
):
    """Revoke the current session server-side and clear the session cookie."""
    auth_service.revoke_session(db_sess.session_token if db_sess else None, db)
    response.delete_cookie(key=SESSION_COOKIE)
    return {"message": "Successfully logged out."}


@router.get("/dev-banner-code", response_model=Optional[DevSmsNotice])
def get_dev_banner_code(phone: str = Query(..., max_length=64)):
    """Dev-only: return the pending code for one phone number so the UI can show it without real SMS."""
    if not settings.dev_sms_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    try:
        normalized = validate_phone(phone)
    except ValueError:
        return None

    latest = get_latest_dev_code(normalized)
    if not latest:
        return None

    elapsed = (datetime.now(timezone.utc) - latest["created_at"]).total_seconds()
    remaining = int(settings.VERIFICATION_CODE_TTL_SECONDS - elapsed)
    if remaining <= 0:
        return None

    return DevSmsNotice(
        phone_masked=mask_phone(latest["phone"]),
        code=latest["code"],
        expires_at=latest["created_at"],
        remaining_seconds=remaining,
    )
