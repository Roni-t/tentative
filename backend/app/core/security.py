import secrets
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config import settings


def generate_verification_code():
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_secure_token(nbytes=16):
    return secrets.token_urlsafe(nbytes)


def create_access_token(data, expires_delta=None):
    now = datetime.now(timezone.utc)
    expires_delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {**data, "exp": now + expires_delta, "iat": now}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def ensure_utc(dt):
    """SQLite gives back naive datetimes, so treat those as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
