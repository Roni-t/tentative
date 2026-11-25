import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger("tentative.sms")
logger.setLevel(logging.INFO)

# In-memory store of recent dev verification codes for UI banner support
dev_sms_cache: Dict[str, Dict] = {}


class SMSAdapter(ABC):
    @abstractmethod
    def send_verification_code(self, phone: str, code: str) -> bool:
        pass

    @abstractmethod
    def send_notification(self, phone: str, message: str) -> bool:
        pass


class ConsoleSMSAdapter(SMSAdapter):
    def send_verification_code(self, phone: str, code: str) -> bool:
        logger.info(f"==================================================")
        logger.info(f"[SMS CONSOLE DISPATCH] Phone: {phone} | Code: {code}")
        logger.info(f"==================================================")
        dev_sms_cache[phone] = {
            "code": code,
            "created_at": datetime.now(timezone.utc),
            "phone": phone
        }
        return True

    def send_notification(self, phone: str, message: str) -> bool:
        logger.info(f"[SMS NOTIFICATION] Phone: {phone} | Message: {message}")
        return True


class TwilioSMSAdapter(SMSAdapter):
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_phone = settings.TWILIO_PHONE_NUMBER
        self._client = None
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                logger.warning(f"Failed to initialize Twilio client: {e}. Falling back to console.")

    def send_verification_code(self, phone: str, code: str) -> bool:
        # Also store in dev cache so the dev banner works, but never when real codes go out in production
        if settings.dev_sms_enabled:
            dev_sms_cache[phone] = {
                "code": code,
                "created_at": datetime.now(timezone.utc),
                "phone": phone
            }
        if self._client and self.from_phone:
            try:
                self._client.messages.create(
                    to=phone,
                    from_=self.from_phone,
                    body=f"Your Tentative verification code is: {code}. Valid for 5 minutes."
                )
                logger.info(f"Sent Twilio SMS code to {phone}")
                return True
            except Exception as e:
                logger.error(f"Error sending SMS via Twilio: {e}")
                return False
        # Fallback to console
        logger.info(f"[TWILIO FALLBACK TO CONSOLE] Code for {phone}: {code}")
        return True

    def send_notification(self, phone: str, message: str) -> bool:
        if self._client and self.from_phone:
            try:
                self._client.messages.create(
                    to=phone,
                    from_=self.from_phone,
                    body=f"[Tentative] {message}"
                )
                return True
            except Exception as e:
                logger.error(f"Error sending notification via Twilio: {e}")
                return False
        logger.info(f"[TWILIO FALLBACK CONSOLE NOTIF] Phone: {phone} | {message}")
        return True


def get_sms_adapter() -> SMSAdapter:
    if settings.SMS_PROVIDER.lower() == "twilio" and settings.TWILIO_ACCOUNT_SID:
        return TwilioSMSAdapter()
    return ConsoleSMSAdapter()


def get_latest_dev_code(phone: str) -> Optional[Dict]:
    """Retrieve the latest verification code sent to exactly this (normalized) phone, for the dev UI banner."""
    return dev_sms_cache.get(phone)
