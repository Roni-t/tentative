import logging
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger("tentative.sms")

# Latest verification code sent to each phone, used by the dev banner in the UI
dev_sms_cache = {}


class ConsoleSMSAdapter:
    """Prints texts to the log instead of sending them (local development)."""

    def send_verification_code(self, phone, code):
        remember_dev_code(phone, code)
        logger.info(f"Code for {phone}: {code}")
        return True

    def send_notification(self, phone, message):
        logger.info(f"Text to {phone}: {message}")
        return True


class TwilioSMSAdapter:
    """Sends real texts through Twilio. Falls back to the console if Twilio isn't set up."""

    def __init__(self):
        self.from_phone = settings.TWILIO_PHONE_NUMBER
        self.client = None
        try:
            from twilio.rest import Client
            self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        except Exception as e:
            logger.warning(f"Could not start Twilio client: {e}")

    def send_verification_code(self, phone, code):
        if settings.dev_sms_enabled:
            remember_dev_code(phone, code)
        return self._send(phone, f"Your Tentative verification code is: {code}. Valid for 5 minutes.")

    def send_notification(self, phone, message):
        return self._send(phone, f"[Tentative] {message}")

    def _send(self, phone, body):
        if not (self.client and self.from_phone):
            logger.info(f"Twilio not configured. Text to {phone}: {body}")
            return True
        try:
            self.client.messages.create(to=phone, from_=self.from_phone, body=body)
            return True
        except Exception as e:
            logger.error(f"Twilio send failed: {e}")
            return False


def remember_dev_code(phone, code):
    dev_sms_cache[phone] = {"code": code, "created_at": datetime.now(timezone.utc), "phone": phone}


def get_sms_adapter():
    if settings.SMS_PROVIDER.lower() == "twilio" and settings.TWILIO_ACCOUNT_SID:
        return TwilioSMSAdapter()
    return ConsoleSMSAdapter()


def get_latest_dev_code(phone):
    return dev_sms_cache.get(phone)
