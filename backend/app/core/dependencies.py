from datetime import datetime, timezone
from typing import Optional
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import decode_access_token, ensure_utc
from app.database import get_db
from app.models.auth import Session as DbSession
from app.models.user import User


SESSION_COOKIE = "tentative_session"


def get_active_session(
    authorization: Optional[str] = Header(None),
    tentative_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> Optional[DbSession]:
    """Resolve the bearer token (or httpOnly cookie) to a live server-side session, if any.

    Tokens are signed JWTs carrying `sid`, the id of a row in `sessions`. A token stops
    working as soon as that row is deleted (logout) or expires, even if the JWT is still valid.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif tentative_session:
        token = tentative_session
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or not payload.get("sid") or not payload.get("sub"):
        return None

    db_sess = db.query(DbSession).filter(DbSession.session_token == payload["sid"]).first()
    if not db_sess or str(db_sess.user_id) != str(payload["sub"]):
        return None
    if ensure_utc(db_sess.expires_at) <= datetime.now(timezone.utc):
        return None
    return db_sess


def get_current_user_optional(
    db_sess: Optional[DbSession] = Depends(get_active_session),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve the current user without raising if unauthenticated."""
    if not db_sess:
        return None
    return db.query(User).filter(User.id == db_sess.user_id).first()


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
