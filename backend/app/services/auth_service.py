from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.adapters.sms_adapter import get_sms_adapter
from app.config import settings
from app.core.encryption import encrypt_phone, hash_phone, mask_phone, normalize_phone
from app.core.security import create_access_token, ensure_utc, generate_secure_token, generate_verification_code
from app.models.auth import Session as DbSession, VerificationCode
from app.models.user import User


class AuthService:
    def request_verification_code(self, phone: str, name: Optional[str], db: Session) -> Dict:
        """Send a 6-digit SMS verification code, valid for 5 minutes, max 3 attempts."""
        normalized = normalize_phone(phone)
        p_hash = hash_phone(normalized)
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=5)

        # Invalidate any active code for this phone
        existing_codes = db.query(VerificationCode).filter(
            VerificationCode.phone_hash == p_hash
        ).all()
        for c in existing_codes:
            db.delete(c)

        code = generate_verification_code()
        db_code = VerificationCode(
            phone_hash=p_hash,
            code=code,
            attempts=0,
            expires_at=expires_at,
            created_at=now
        )
        db.add(db_code)
        db.commit()

        # Dispatch via SMS adapter
        sms = get_sms_adapter()
        sms.send_verification_code(normalized, code)

        existing_user = db.query(User).filter(User.phone_hash == p_hash).first()

        return {
            "message": "Verification code dispatched.",
            "phone_masked": mask_phone(normalized),
            "is_existing_account": existing_user is not None,
            "expires_in_seconds": 300,
            # In development/console mode, return code to ease manual and automated testing
            "dev_code": code if settings.SMS_PROVIDER.lower() == "console" or settings.ENVIRONMENT == "development" else None
        }

    def verify_code(self, phone: str, code: str, name: Optional[str], db: Session) -> Tuple[User, str]:
        """Verify the 6-digit code, create/load user, and issue session."""
        normalized = normalize_phone(phone)
        p_hash = hash_phone(normalized)
        now = datetime.now(timezone.utc)

        db_code = db.query(VerificationCode).filter(
            VerificationCode.phone_hash == p_hash
        ).order_by(VerificationCode.created_at.desc()).first()

        if not db_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending verification code found. Please request a new code."
            )

        if ensure_utc(db_code.expires_at) < now:
            db.delete(db_code)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )

        if db_code.attempts >= 3:
            db.delete(db_code)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect attempts. Please request a new code."
            )

        if db_code.code != code.strip():
            db_code.attempts += 1
            db.commit()
            remaining = 3 - db_code.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining."
            )

        # Code is valid, remove it
        db.delete(db_code)

        # Find or create User
        user = db.query(User).filter(User.phone_hash == p_hash).first()
        if not user:
            if not name or not name.strip():
                # Provide a clean default name if user only provided phone
                name = f"Host {normalized[-4:]}"
            encrypted = encrypt_phone(normalized)
            is_admin = (normalized == normalize_phone(settings.ADMIN_PHONE))
            user = User(
                name=name.strip(),
                phone_number_encrypted=encrypted,
                phone_hash=p_hash,
                is_admin=is_admin,
                created_at=now
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if name and name.strip() and user.name.startswith("Host "):
                user.name = name.strip()
                db.commit()

        # Create session token
        session_token = generate_secure_token(32)
        session_expiry = now + timedelta(days=7)
        db_sess = DbSession(
            session_token=session_token,
            user_id=user.id,
            expires_at=session_expiry,
            created_at=now
        )
        db.add(db_sess)
        db.commit()

        # Create JWT access token
        jwt_token = create_access_token({"sub": str(user.id), "phone_hash": p_hash})

        return user, jwt_token


auth_service = AuthService()
