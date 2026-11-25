import base64
import hashlib
import re
from cryptography.fernet import Fernet
from app.config import settings


def make_fernet():
    key = settings.FERNET_KEY.strip()
    try:
        return Fernet(key.encode("utf-8"))
    except Exception:
        # Not a valid Fernet key, so derive one from the text
        digest = hashlib.sha256(key.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))


_fernet = make_fernet()


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+"):
        return cleaned
    if len(cleaned) == 10:
        return f"+1{cleaned}"
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"
    return f"+{cleaned}"


_E164 = re.compile(r"\+[1-9]\d{9,14}")
# Names start with a letter and can have spaces, apostrophes, hyphens and periods
_NAME = re.compile(r"[^\W\d_](?:[^\W\d_]|[ '.\-])*")
NAME_MAX_LENGTH = 128


def validate_phone(phone: str) -> str:
    if not phone or re.search(r"[^\d+()\-.\s]", phone):
        raise ValueError("Enter a valid phone number, e.g. (972) 555-0142.")
    normalized = normalize_phone(phone)
    if not _E164.fullmatch(normalized) or (normalized.startswith("+1") and len(normalized) != 12):
        raise ValueError("Enter a valid phone number, e.g. (972) 555-0142.")
    return normalized


def validate_name(name: str) -> str:
    cleaned = " ".join((name or "").split())
    if not cleaned:
        raise ValueError("Enter your full name.")
    if len(cleaned) > NAME_MAX_LENGTH:
        raise ValueError(f"Name must be {NAME_MAX_LENGTH} characters or fewer.")
    if not _NAME.fullmatch(cleaned):
        raise ValueError("Name can only contain letters, spaces, apostrophes, hyphens and periods.")
    return cleaned


def hash_phone(phone: str) -> str:
    # Same number always gives the same hash, so we can look it up without storing it
    normalized = normalize_phone(phone)
    salted = f"{settings.PHONE_HASH_SALT}:{normalized}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


def encrypt_phone(phone: str) -> str:
    normalized = normalize_phone(phone)
    return _fernet.encrypt(normalized.encode("utf-8")).decode("utf-8")


def decrypt_phone(encrypted_phone: str) -> str:
    try:
        return _fernet.decrypt(encrypted_phone.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""


def mask_phone(phone: str) -> str:
    normalized = normalize_phone(phone)
    if len(normalized) >= 4:
        return f"{normalized[:6]}****{normalized[-2:]}"
    return "****"
