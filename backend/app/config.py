import base64
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Tentative API"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tentative.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tentative-super-secret-celestial-key-2026-orbits")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Phone number encryption & hashing
    # Must be 32 url-safe base64-encoded bytes for Fernet
    FERNET_KEY: str = os.getenv(
        "FERNET_KEY",
        base64.urlsafe_b64encode(b"tentative-fernet-secret-32-bytes").decode("utf-8")
    )
    PHONE_HASH_SALT: str = os.getenv("PHONE_HASH_SALT", "tentative_space_salt_2026")
    
    # SMS Adapter
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "console")  # 'console' or 'twilio'
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")  # sends reminders and other texts
    TWILIO_VERIFY_SERVICE_SID: str = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")  # sends and checks sign-in codes

    # Seed Admin Credentials
    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Admin Commander")
    ADMIN_PHONE: str = os.getenv("ADMIN_PHONE", "+19725550100")
    
    # Seeding
    SEED_ON_STARTUP: bool = os.getenv("SEED_ON_STARTUP", "true").lower() in ("true", "1", "yes")
    
    # Rate Limiting
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_INVITES_PER_MINUTE: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "http://frontend:80",
    ]

    # Links in outgoing texts point here
    PUBLIC_APP_URL: str = os.getenv("PUBLIC_APP_URL", "http://localhost:8080")

    # FR-18: remind non-responders this many hours before the response deadline
    REMINDER_LEAD_HOURS: int = 24
    HOST_UPDATE_MAX_LENGTH: int = 320

    # Verification codes & sessions (UC-1 / UC-2)
    VERIFICATION_CODE_TTL_SECONDS: int = 300
    VERIFICATION_MAX_ATTEMPTS: int = 3
    SESSION_TTL_KEEP_SIGNED_IN_HOURS: int = 24 * 7
    SESSION_TTL_DEFAULT_HOURS: int = 12

    @property
    def dev_sms_enabled(self) -> bool:
        """Expose verification codes to the client only when no real SMS is sent, or in development."""
        return self.SMS_PROVIDER.lower() == "console" or self.ENVIRONMENT == "development"

    @property
    def uses_twilio_verify(self) -> bool:
        return self.SMS_PROVIDER.lower() == "twilio"

    def require_sms_settings(self) -> None:
        """Stop startup if Twilio is chosen but not fully set up, instead of quietly sending nothing."""
        if not self.uses_twilio_verify:
            return
        names = ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_VERIFY_SERVICE_SID")
        missing = [name for name in names if not getattr(self, name).strip()]
        if missing:
            raise RuntimeError(f"SMS_PROVIDER=twilio but these are not set: {', '.join(missing)}")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
