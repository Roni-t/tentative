import hashlib
import re
from cryptography.fernet import Fernet
from app.config import settings

# Initialize Fernet cipher
_fernet = Fernet(settings.FERNET_KEY.encode("utf-8"))


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
