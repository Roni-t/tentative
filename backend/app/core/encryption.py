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
