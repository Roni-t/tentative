import base64
import hashlib
import re
from cryptography.fernet import Fernet
from app.config import settings


def _get_fernet_instance() -> Fernet:
    """Initialize Fernet cipher, falling back to 32-byte SHA-256 derived key if needed."""
    raw_key = settings.FERNET_KEY.strip()
    try:
        # Check if already a valid 32 url-safe base64-encoded key
        return Fernet(raw_key.encode("utf-8"))
    except Exception:
        # Fall back to deriving exactly 32 bytes from raw_key via SHA-256
        derived_32 = hashlib.sha256(raw_key.encode("utf-8")).digest()
        safe_key = base64.urlsafe_b64encode(derived_32)
        return Fernet(safe_key)


_fernet = _get_fernet_instance()


def normalize_phone(phone: str) -> str:
    """Normalize phone number to international E.164 format (+1XXXXXXXXXX)."""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+"):
        return cleaned
    if len(cleaned) == 10:
        return f"+1{cleaned}"
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"
    return f"+{cleaned}"


_E164 = re.compile(r"\+[1-9]\d{9,14}")
# A name starts with a letter and may contain letters, spaces, apostrophes, hyphens and periods.
_NAME = re.compile(r"[^\W\d_](?:[^\W\d_]|[ '.\-])*")
NAME_MAX_LENGTH = 128


def validate_phone(phone: str) -> str:
    """Return the E.164 form of a phone number, or raise ValueError if it is not a valid number."""
    if not phone or re.search(r"[^\d+()\-.\s]", phone):
        raise ValueError("Enter a valid phone number, e.g. (972) 555-0142.")
    normalized = normalize_phone(phone)
    if not _E164.fullmatch(normalized) or (normalized.startswith("+1") and len(normalized) != 12):
        raise ValueError("Enter a valid phone number, e.g. (972) 555-0142.")
    return normalized


def validate_name(name: str) -> str:
    """Return a cleaned full name, or raise ValueError if it is not a valid name."""
    cleaned = " ".join((name or "").split())
    if not cleaned:
        raise ValueError("Enter your full name.")
    if len(cleaned) > NAME_MAX_LENGTH:
        raise ValueError(f"Name must be {NAME_MAX_LENGTH} characters or fewer.")
    if not _NAME.fullmatch(cleaned):
        raise ValueError("Name can only contain letters, spaces, apostrophes, hyphens and periods.")
    return cleaned


def hash_phone(phone: str) -> str:
    """Deterministic hash used for uniqueness lookup without revealing plain phone."""
    normalized = normalize_phone(phone)
    salted = f"{settings.PHONE_HASH_SALT}:{normalized}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


def encrypt_phone(phone: str) -> str:
    """Encrypt plain phone number for safe storage at rest."""
    normalized = normalize_phone(phone)
    return _fernet.encrypt(normalized.encode("utf-8")).decode("utf-8")


def decrypt_phone(encrypted_phone: str) -> str:
    """Decrypt stored phone number."""
    try:
        return _fernet.decrypt(encrypted_phone.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""


def mask_phone(phone: str) -> str:
    """Mask phone for safe UI display (e.g., +1 (972) ••••42)."""
    normalized = normalize_phone(phone)
    if len(normalized) >= 4:
        return f"{normalized[:6]}••••{normalized[-2:]}"
    return "••••"
