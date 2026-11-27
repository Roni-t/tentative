"""Account creation (UC-1) and login (UC-2) via SMS verification codes.

UC-1: validate name + phone -> reject if phone already registered -> send code ->
      verify code -> encrypt phone, store account -> start session.
UC-2: look up phone -> if not found, prompt to create an account (no SMS sent) ->
      send code -> verify code -> start session.
"""
import hmac
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.adapters.sms_adapter import get_sms_adapter
from app.config import settings
from app.core.encryption import encrypt_phone, hash_phone, mask_phone, normalize_phone, validate_name, validate_phone
from app.core.security import create_access_token, ensure_utc, generate_secure_token, generate_verification_code
from app.models.auth import Session as DbSession, VerificationCode
from app.models.user import User

PHONE_ALREADY_REGISTERED = "This number already has an account. Log in instead, or use a different number."
NO_ACCOUNT_FOUND = "We couldn't find an account for that number. Create an account to start scheduling."


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _parse_phone(phone: str) -> str:
    try:
        return validate_phone(phone)
    except ValueError as e:
        raise _bad_request(str(e))


def _parse_name(name: str) -> str:
    try:
        return validate_name(name)
    except ValueError as e:
        raise _bad_request(str(e))


class AuthService:
    # ------------------------------------------------------------------ helpers

    def _find_user(self, phone_hash: str, db: Session) -> Optional[User]:
        return db.query(User).filter(User.phone_hash == phone_hash).first()

    def send_code(self, normalized: str, db: Session) -> Dict:
        """Replace any pending code for this phone with a fresh one and text it."""
        p_hash = hash_phone(normalized)
        now = datetime.now(timezone.utc)

        db.query(VerificationCode).filter(VerificationCode.phone_hash == p_hash).delete()
        code = generate_verification_code()
        db.add(VerificationCode(
            phone_hash=p_hash,
            code=code,
            attempts=0,
            expires_at=now + timedelta(seconds=settings.VERIFICATION_CODE_TTL_SECONDS),
            created_at=now,
        ))
        db.commit()

        if not get_sms_adapter().send_verification_code(normalized, code):
            db.query(VerificationCode).filter(VerificationCode.phone_hash == p_hash).delete()
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="We couldn't send a text to that number. Please try again.",
            )

        return {
            "message": "Verification code sent.",
            "phone_masked": mask_phone(normalized),
            "expires_in_seconds": settings.VERIFICATION_CODE_TTL_SECONDS,
            "dev_code": code if settings.dev_sms_enabled else None,
        }

    def consume_code(self, normalized: str, code: str, db: Session) -> None:
        """Check the code matches and is not expired; consume it on success. Raises on failure."""
        code = (code or "").strip()
        if not (len(code) == 6 and code.isdigit()):
            raise _bad_request("Enter the 6-digit code we texted you.")

        p_hash = hash_phone(normalized)
        db_code = db.query(VerificationCode).filter(VerificationCode.phone_hash == p_hash).first()
        if not db_code:
            raise _bad_request("No pending verification code for this number. Please request a new code.")

        if ensure_utc(db_code.expires_at) < datetime.now(timezone.utc):
            db.delete(db_code)
            db.commit()
            raise _bad_request("That code has expired. Please request a new code.")

        if db_code.attempts >= settings.VERIFICATION_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect attempts. Please request a new code.",
            )

        if not hmac.compare_digest(db_code.code, code):
            db_code.attempts += 1
            db.commit()
            remaining = settings.VERIFICATION_MAX_ATTEMPTS - db_code.attempts
            raise _bad_request(f"That code didn't work. {remaining} attempt(s) remaining.")

        db.delete(db_code)
        db.commit()

    def start_session(self, user: User, keep_signed_in: bool, db: Session) -> Tuple[str, datetime]:
        """Create a revocable server-side session and a signed token that references it."""
        now = datetime.now(timezone.utc)
        hours = settings.SESSION_TTL_KEEP_SIGNED_IN_HOURS if keep_signed_in else settings.SESSION_TTL_DEFAULT_HOURS
        expires_at = now + timedelta(hours=hours)
        session_id = generate_secure_token(32)
        db.add(DbSession(session_token=session_id, user_id=user.id, expires_at=expires_at, created_at=now))
        db.commit()
        token = create_access_token({"sub": str(user.id), "sid": session_id}, expires_delta=expires_at - now)
        return token, expires_at

    # --------------------------------------------------------------- UC-1

    def request_registration_code(self, phone: str, name: str, db: Session) -> Dict:
        _parse_name(name)
        normalized = _parse_phone(phone)
        if self._find_user(hash_phone(normalized), db):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PHONE_ALREADY_REGISTERED)
        return self.send_code(normalized, db)

    def complete_registration(self, phone: str, name: str, code: str, db: Session) -> Tuple[User, str, datetime]:
        clean_name = _parse_name(name)
        normalized = _parse_phone(phone)
        p_hash = hash_phone(normalized)
        if self._find_user(p_hash, db):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PHONE_ALREADY_REGISTERED)

        self.consume_code(normalized, code, db)

        user = User(
            name=clean_name,
            phone_number_encrypted=encrypt_phone(normalized),
            phone_hash=p_hash,
            is_admin=(normalized == normalize_phone(settings.ADMIN_PHONE)),
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:  # registered concurrently between the check and the insert
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PHONE_ALREADY_REGISTERED)
        db.refresh(user)

        token, expires_at = self.start_session(user, keep_signed_in=True, db=db)
        return user, token, expires_at

    # --------------------------------------------------------------- UC-2

    def request_login_code(self, phone: str, db: Session) -> Dict:
        normalized = _parse_phone(phone)
        if not self._find_user(hash_phone(normalized), db):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NO_ACCOUNT_FOUND)
        return self.send_code(normalized, db)

    def complete_login(self, phone: str, code: str, keep_signed_in: bool, db: Session) -> Tuple[User, str, datetime]:
        normalized = _parse_phone(phone)
        user = self._find_user(hash_phone(normalized), db)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NO_ACCOUNT_FOUND)

        self.consume_code(normalized, code, db)
        token, expires_at = self.start_session(user, keep_signed_in=keep_signed_in, db=db)
        return user, token, expires_at

    # ------------------------------------------------------------- logout

    def revoke_session(self, session_id: Optional[str], db: Session) -> None:
        if session_id:
            db.query(DbSession).filter(DbSession.session_token == session_id).delete()
            db.commit()


auth_service = AuthService()
