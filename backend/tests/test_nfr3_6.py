"""Non-functional test cases NFR-3 .. NFR-6 from the Testing section of the design doc."""
import re
import time
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import String, Text, inspect

from app.core.encryption import decrypt_phone
from app.database import Base
from app.models.invitee import Invitee
from app.models.user import User
from app.services.auth_service import auth_service
from tests.helpers import add_invitee, create_event, register_user, submit_availability

SLOT = [{"start_time": "2026-12-05T01:00:00Z", "end_time": "2026-12-05T03:00:00Z"}]


def _national(phone: str) -> str:
    """Last 10 digits: the part of a US number that appears in any formatting of it."""
    return re.sub(r"\D", "", phone)[-10:]


def _digits_only(value: str) -> str:
    return re.sub(r"\D", "", value)


def _scan_db(db_session, needles, skip=()):
    """Return (table, column, row_id) for every text cell containing any needle, ignoring punctuation."""
    hits = []
    for table in Base.metadata.sorted_tables:
        if table.name in skip:
            continue
        text_cols = [c for c in table.columns if isinstance(c.type, (String, Text))]
        if not text_cols:
            continue
        for row in db_session.execute(table.select()).mappings():
            for col in text_cols:
                value = row[col.name]
                if value and any(n in _digits_only(str(value)) for n in needles):
                    hits.append((table.name, col.name, row.get("id")))
    return hits


# ------------------------------------------------------------------ NFR-3

def test_nfr3_server_hands_code_to_sms_provider_within_5s(client, sms_outbox):
    """Server side of NFR-3: the request reaches the SMS provider in < 5 s, once per request, nothing lost."""
    register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    sms_outbox.clear()

    for _ in range(3):  # three back-to-back requests, as in the doc's procedure
        started = time.monotonic()
        res = client.post("/api/auth/login/request-code", json={"phone": "(972) 555-0142"})
        elapsed = time.monotonic() - started
        assert res.status_code == 200
        assert elapsed < 5.0, f"code handed to provider after {elapsed:.2f}s"

    codes = [m for m in sms_outbox if m["kind"] == "verification"]
    assert len(codes) == 3
    assert all(m["phone"] == "+19725550142" for m in codes)


def test_nfr3_provider_failure_is_reported_not_swallowed(client, monkeypatch):
    from app.adapters import sms_adapter
    register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    monkeypatch.setattr(sms_adapter.ConsoleSMSAdapter, "send_verification_code", lambda self, p, c: False)
    res = client.post("/api/auth/login/request-code", json={"phone": "+19725550142"})
    assert res.status_code == 502


@pytest.mark.skip(reason="Manual: needs a live SMS provider and AT&T/Verizon/T-Mobile handsets "
                         "(handset receipt < 30 s, 1 request every 20 s)")
def test_nfr3_handset_receives_code_within_30s():
    pass


# ------------------------------------------------------------------ NFR-4

def test_nfr4_no_plaintext_phone_numbers_in_database(client, db_session, host_with_activity):
    phones = host_with_activity

    # 1,000 generated users through the real registration code path
    for i in range(1000):
        phone = f"+1214{i:07d}"
        name = "Generated " + "".join(chr(97 + int(d)) for d in f"{i:04d}").title()  # e.g. "Generated Abcd"
        code = auth_service.request_registration_code(phone=phone, name=name, db=db_session)["dev_code"]
        auth_service.complete_registration(phone=phone, name=name, code=code, db=db_session)
        phones.append(phone)

    needles = {_national(p) for p in phones}
    hits = _scan_db(db_session, needles)
    assert hits == [], f"plaintext phone numbers found: {hits[:10]}"

    # And the encrypted columns really are ciphertext that decrypts back to the number
    assert db_session.query(User).count() >= 1006
    for user in db_session.query(User).limit(50):
        assert _national(decrypt_phone(user.phone_number_encrypted)) in needles
    for inv in db_session.query(Invitee):
        if inv.phone_encrypted:
            assert _national(decrypt_phone(inv.phone_encrypted)) in needles


def test_nfr4_rsvps_store_no_phone_numbers(client, db_session, host_with_activity):
    # RSVPs live on the invitee row and texts use the invitee's encrypted number (DEV-167)
    assert "rsvps" not in Base.metadata.tables
    invitee = db_session.query(Invitee).filter(Invitee.phone_encrypted.isnot(None)).first()
    client.cookies.clear()
    assert client.post(f"/api/rsvp/{invitee.response_token}", json={"status": "going"}).status_code == 200
    assert _scan_db(db_session, {_national(p) for p in host_with_activity}) == []


@pytest.fixture
def host_with_activity(client):
    """The doc's 6 fixture users plus invitees, invite texts, a reminder, an update and a finalization.

    Returns the list of every phone number that went into the system.
    """
    fixture_users = [
        ("+19725550142", "Kaelan Nguyen"), ("+19725550143", "Trinity Hunt"), ("+19725550144", "Reese Asher"),
        ("+19725550145", "Ronit Dhaliwal"), ("+19725550146", "Aaron Hines"), ("+19725550147", "Daniel Ribakoff"),
    ]
    headers = [register_user(client, phone=p, name=n) for p, n in fixture_users]
    host = headers[0]
    # Each fixture user also logs in once (creates sessions + more verification codes)
    for p, _ in fixture_users:
        code = client.post("/api/auth/login/request-code", json={"phone": p}).json()["dev_code"]
        client.post("/api/auth/login/verify", json={"phone": p, "code": code})

    event = create_event(client, host, deadline=(datetime.now(timezone.utc) + timedelta(days=5)).isoformat())
    invitee_phones = ["+14695550101", "+14695550102", "+13105550103"]
    invitees = [add_invitee(client, host, event["id"], f"Invitee{i}", p) for i, p in enumerate(invitee_phones, 1)]
    client.post("/api/sms/opt-out", json={"phone": invitee_phones[1]})
    for inv in invitees:  # every invitee responds -> host gets the "ready to finalize" text
        submit_availability(client, event["id"], inv["name"], SLOT, token=inv["response_token"])
    client.post(f"/api/events/{event['id']}/updates", json={"message": "Bring snacks"}, headers=host)
    client.post(f"/api/events/{event['id']}/finalize",
                json={"start_time": SLOT[0]["start_time"], "end_time": SLOT[0]["end_time"]}, headers=host)
    return [p for p, _ in fixture_users] + invitee_phones


# ------------------------------------------------------------------ NFR-5

CALENDAR_DETAILS = {"title": "Dentist – Dr. Lee", "summary": "Dentist – Dr. Lee", "location": "123 Main St",
                    "description": "Cleaning appointment"}


def test_nfr5_only_availability_is_stored_or_shown_never_calendar_details(client, db_session):
    host = register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    event = create_event(client, host)
    inv = add_invitee(client, host, event["id"], "Invitee1", "+14695550101")

    # A calendar-assisted submission that (wrongly) includes event details from the invitee's calendar
    body = {"participant_name": "Invitee1", "edit_token": inv["response_token"], **CALENDAR_DETAILS,
            "slots": [{**SLOT[0], **CALENDAR_DETAILS}]}
    assert client.post(f"/api/events/{event['id']}/availability", json=body).status_code == 200

    # The host's views carry only names, availability counts and time slots
    heatmap = client.get(f"/api/events/{event['id']}/heatmap?refresh=true", headers=host).json()
    allowed_slot_keys = {"start_time", "end_time", "count", "total_participants", "ratio",
                         "available_participants", "unavailable_participants"}
    for slot in heatmap["slots"] + heatmap["best_slots"]:
        assert set(slot) <= allowed_slot_keys
    responses = [
        heatmap,
        client.get(f"/api/events/{event['id']}/availability/me?edit_token={inv['response_token']}").json(),
        client.get(f"/api/events/{event['id']}/invitees", headers=host).json(),
        client.get(f"/api/events/{event['id']}", headers=host).json(),
    ]
    blob = str(responses)
    for secret in ("Dentist", "Dr. Lee", "123 Main", "Cleaning appointment"):
        assert secret not in blob

    # Nor are the details persisted anywhere
    for table in Base.metadata.sorted_tables:
        for row in db_session.execute(table.select()).mappings():
            assert "Dentist" not in str(dict(row)) and "123 Main" not in str(dict(row))


# ------------------------------------------------------------------ NFR-6

def _finalized_event(client, host):
    """A finalized event on Dec 4, 7-9 PM Chicago time (Dec 5, 01:00-03:00 UTC)."""
    event = create_event(client, host, title="Team Dinner, Fall; Part 1", description="Bring food")
    res = client.post(f"/api/events/{event['id']}/finalize",
                      json={"start_time": SLOT[0]["start_time"], "end_time": SLOT[0]["end_time"],
                            "notify_participants": False}, headers=host)
    assert res.status_code == 200, res.text
    return event


def test_nfr6_finalized_event_can_be_added_to_google_calendar_via_link(client):
    host = register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    event = _finalized_event(client, host)
    url = client.get(f"/api/events/{event['id']}/google-calendar-url").json()["url"]
    assert url.startswith("https://calendar.google.com/calendar/render?")
    assert "20261205T010000Z%2F20261205T030000Z" in url


def test_nfr6_finalized_event_downloads_as_ics_file(client):
    host = register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    event = _finalized_event(client, host)
    res = client.get(f"/api/events/{event['id']}/export.ics")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/calendar")
    assert "attachment" in res.headers["content-disposition"]
    text = res.text
    assert text.startswith("BEGIN:VCALENDAR") and text.rstrip().endswith("END:VCALENDAR")
    assert "\r\n" in text  # .ics files use Windows line endings
    assert "DTSTART:20261205T010000Z" in text and "DTEND:20261205T030000Z" in text
    assert r"SUMMARY:Team Dinner\, Fall\; Part 1" in text  # commas and semicolons are escaped
    assert "LOCATION:ECSS 2.410" in text


def test_nfr6_calendar_export_needs_a_final_time(client):
    host = register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    event = create_event(client, host)  # still collecting responses
    assert client.get(f"/api/events/{event['id']}/export.ics").status_code == 400
    assert client.get(f"/api/events/{event['id']}/google-calendar-url").status_code == 400
    assert client.get("/api/events/9999/export.ics").status_code == 404


@pytest.mark.xfail(strict=True, reason="NFR-6 direct add to a connected Google/Outlook calendar needs FR-17 OAuth")
def test_nfr6_optionally_add_to_connected_calendar(client):
    host = register_user(client, phone="+19725550142", name="Kaelan Nguyen")
    event = create_event(client, host)
    res = client.post(f"/api/events/{event['id']}/connected-calendar", json={"provider": "google"}, headers=host)
    assert res.status_code == 200
