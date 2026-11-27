"""Calls the real Twilio Verify service from the project's .env. None of these send a text.

Run with:  TWILIO_LIVE_TESTS=1 pytest tests/test_twilio_verify_live.py
The full flow with a real text is checked by hand (see README).
"""
import os
from pathlib import Path

import pytest

from app.config import Settings, settings

pytestmark = pytest.mark.twilio_live

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
NEVER_SENT_TO = "+14695550199"


@pytest.fixture(autouse=True)
def real_twilio(monkeypatch):
    if os.getenv("TWILIO_LIVE_TESTS") != "1":
        pytest.skip("set TWILIO_LIVE_TESTS=1 to call the real Twilio account")
    live = Settings(_env_file=ENV_FILE)
    for name in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_VERIFY_SERVICE_SID"):
        if not getattr(live, name):
            pytest.skip(f"{name} is not set in {ENV_FILE}")
        monkeypatch.setattr(settings, name, getattr(live, name))
    monkeypatch.setattr(settings, "SMS_PROVIDER", "twilio")


def test_checking_a_code_that_was_never_sent_asks_for_a_new_one():
    from app.adapters.twilio_verify import VerifyError, check

    with pytest.raises(VerifyError) as error:
        check(NEVER_SENT_TO, "123456")
    assert error.value.status_code == 400
    assert "expired or was already used" in error.value.message


def test_an_invalid_number_is_rejected_without_a_text():
    from app.adapters.twilio_verify import VerifyError, start

    with pytest.raises(VerifyError) as error:
        start("+1000")
    assert error.value.status_code == 400
    assert "isn't valid" in error.value.message


def test_registration_checks_the_code_with_twilio(client):
    res = client.post("/api/auth/register/verify",
                      json={"name": "Vera Verify", "phone": NEVER_SENT_TO, "code": "123456"})
    assert res.status_code == 400
    assert "expired or was already used" in res.json()["detail"]
