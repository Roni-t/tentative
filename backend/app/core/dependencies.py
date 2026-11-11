from datetime import datetime, timezone
from typing import Optional
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database import get_db
from app.models.auth import Session as DbSession
from app.models.user import User


def get_current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(None),
    tentative_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve current user from Authorization header or httpOnly cookie, without raising if unauthenticated."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif tentative_session:
        token = tentative_session

    if not token:
        return None

    # Try decode JWT
    payload = decode_access_token(token)
    user_id = None
    if payload and "sub" in payload:
        try:
            user_id = int(payload["sub"])
        except (ValueError, TypeError):
            pass

    # Or check database session token
    if not user_id:
        db_sess = db.query(DbSession).filter(
            DbSession.session_token == token,
            DbSession.expires_at > datetime.now(timezone.utc)
        ).first()
        if db_sess:
            user_id = db_sess.user_id

    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforce authentication, raising 401 if missing."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with your phone number."
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Enforce admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )
    return current_user
