"""SMS_PROVIDER=twilio needs every Twilio setting, so a missing one stops startup instead of silently sending nothing."""
import pytest

from app.config import Settings

TWILIO = {
    "SMS_PROVIDER": "twilio",
    "TWILIO_ACCOUNT_SID": "AC00000000000000000000000000000000",
    "TWILIO_AUTH_TOKEN": "token",
    "TWILIO_PHONE_NUMBER": "+14695550100",
    "TWILIO_VERIFY_SERVICE_SID": "VA00000000000000000000000000000000",
}


def make(**values):
    return Settings(_env_file=None, **values)


def test_console_needs_no_twilio_settings():
    make(SMS_PROVIDER="console").require_sms_settings()


def test_complete_twilio_settings_pass():
    make(**TWILIO).require_sms_settings()


def test_missing_verify_service_sid_stops_startup():
    with pytest.raises(RuntimeError, match="TWILIO_VERIFY_SERVICE_SID"):
        make(**{**TWILIO, "TWILIO_VERIFY_SERVICE_SID": ""}).require_sms_settings()


def test_every_missing_twilio_setting_is_named():
    with pytest.raises(RuntimeError) as error:
        make(SMS_PROVIDER="Twilio").require_sms_settings()
    for name in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_VERIFY_SERVICE_SID"):
        assert name in str(error.value)


def test_verify_sends_codes_only_in_twilio_mode():
    assert make(**TWILIO).uses_twilio_verify
    assert not make(SMS_PROVIDER="console").uses_twilio_verify


def test_app_refuses_to_start_with_incomplete_twilio_settings(monkeypatch):
    from fastapi.testclient import TestClient
    from app.config import settings
    from app.main import app

    monkeypatch.setattr(settings, "SMS_PROVIDER", "twilio")
    monkeypatch.setattr(settings, "TWILIO_VERIFY_SERVICE_SID", "")
    with pytest.raises(RuntimeError, match="TWILIO_VERIFY_SERVICE_SID"):
        with TestClient(app):
            pass
