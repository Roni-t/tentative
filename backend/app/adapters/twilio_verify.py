"""Sends and checks sign-in codes with Twilio Verify, so the codes are never stored by this app."""
import logging

from app.config import settings

logger = logging.getLogger("tentative.sms")

# Twilio Verify's default; the service settings in the Twilio console decide the real value
CODE_TTL_SECONDS = 600

# Twilio error codes we can explain to the person, as (HTTP status, message)
KNOWN_ERRORS = {
    20404: (400, "That code has expired or was already used. Please request a new code."),
    21211: (400, "That phone number isn't valid."),
    60200: (400, "That phone number isn't valid."),
    60202: (429, "Too many incorrect attempts. Please request a new code."),
    60203: (429, "Too many codes sent to this number. Please wait a few minutes and try again."),
    60205: (400, "That number can't receive texts. Please use a mobile number."),
    60410: (400, "We can't send texts to that number."),
    60605: (400, "We can't send texts to numbers in that country."),
}


class VerifyError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _service():
    # Created per call, so the app and tests run without Twilio credentials in console mode
    from twilio.rest import Client
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).verify.v2.services(
        settings.TWILIO_VERIFY_SERVICE_SID
    )


def _error(e: Exception, fallback: str) -> VerifyError:
    code = getattr(e, "code", None)
    if code in KNOWN_ERRORS:
        return VerifyError(*KNOWN_ERRORS[code])
    logger.error(f"Twilio Verify failed: {e}")
    return VerifyError(502, fallback)


def start(phone: str) -> None:
    """Text a new code to the phone. Raises VerifyError if Twilio refuses."""
    try:
        _service().verifications.create(to=phone, channel="sms")
    except Exception as e:
        raise _error(e, "We couldn't send a text to that number. Please try again.")


def check(phone: str, code: str) -> bool:
    """True only if Twilio approves the code. Raises VerifyError if there is no code to check."""
    try:
        result = _service().verification_checks.create(to=phone, code=code)
    except Exception as e:
        raise _error(e, "We couldn't check that code. Please try again.")
    return result.status == "approved"
