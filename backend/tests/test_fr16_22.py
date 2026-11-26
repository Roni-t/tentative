"""Functional test cases F-16 .. F-22 (FR-16 .. FR-22) from the Testing section of the design doc.

Each test is named after its test case ID. Dates are relative to "now" wherever the app compares
against the real clock (deadlines, reminders) so the suite keeps passing after the semester ends.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import ensure_utc
from app.core.timefmt import format_local
from app.models.event import Event
from app.models.invitee import Invitee
from app.models.notification import Notification
from app.services.invitee_service import invitee_service
from tests.helpers import add_invitee, create_event, register_user, submit_availability

HOST_PHONE = "+19725550142"
HOST_NAME = "Kaelan Nguyen"
INVITEES = [  # (name, phone, timezone)
    ("Invitee1", "+14695550101", "America/Chicago"),
    ("Invitee2", "+14695550102", "America/Chicago"),
    ("Invitee3", "+13105550103", "America/Los_Angeles"),
]
SLOT = [{"start_time": "2026-12-05T01:00:00Z", "end_time": "2026-12-05T03:00:00Z"}]  # Dec 4, 7-9 PM CST


def _texts_to(outbox, phone):
    return [m["message"] for m in outbox if m["kind"] == "notification" and m["phone"] == phone]


@pytest.fixture
def host(client):
    return register_user(client, phone=HOST_PHONE, name=HOST_NAME)


@pytest.fixture
def event_with_invitees(client, host):
    """Team Dinner with three opted-in invitees; returns (event, [invitee JSON...])."""
    deadline = (datetime.now(timezone.utc) + timedelta(days=10)).replace(microsecond=0)
    event = create_event(client, host, deadline=deadline.isoformat())
    invitees = [add_invitee(client, host, event["id"], n, p, tz) for n, p, tz in INVITEES]
    return event, invitees


# ------------------------------------------------------------------ F-16 / FR-16

def test_f16_deadline_saved_in_utc_and_shown_in_each_timezone(client, db_session, host, sms_outbox):
    event = create_event(client, host, deadline="2026-11-25T17:00:00-06:00")
    assert event["status"] == "collecting"

    # DB stores the instant in UTC: events.response_deadline = 2026-11-25T23:00:00Z
    stored = db_session.query(Event).get(event["id"]).deadline
    assert ensure_utc(stored) == datetime(2026, 11, 25, 23, 0, tzinfo=timezone.utc)

    # Host page shows the deadline in the event's timezone
    fetched = client.get(f"/api/events/{event['id']}", headers=host).json()
    assert ensure_utc(datetime.fromisoformat(fetched["deadline"].replace("Z", "+00:00"))) == datetime(
        2026, 11, 25, 23, 0, tzinfo=timezone.utc
    )
    assert fetched["deadline_display"] == "Wed, Nov 25, 5:00 PM CST"

    # Each invite SMS carries the deadline in that invitee's own timezone
    add_invitee(client, host, event["id"], "Invitee1", "+14695550101", "America/Chicago")
    add_invitee(client, host, event["id"], "Invitee2", "+13105550102", "America/Los_Angeles")
    (invite1,) = _texts_to(sms_outbox, "+14695550101")
    (invite2,) = _texts_to(sms_outbox, "+13105550102")
    assert "Respond by Wed, Nov 25, 5:00 PM CST" in invite1
    assert "Respond by Wed, Nov 25, 3:00 PM PST" in invite2


def test_f16_deadline_update_is_normalized_to_utc(client, db_session, host):
    event = create_event(client, host)
    res = client.patch(f"/api/events/{event['id']}", json={"deadline": "2026-11-25T15:00:00-08:00"}, headers=host)
    assert res.status_code == 200
    stored = db_session.query(Event).get(event["id"]).deadline
    assert ensure_utc(stored) == datetime(2026, 11, 25, 23, 0, tzinfo=timezone.utc)


def test_f16_responses_rejected_after_deadline(client, host):
    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    event = create_event(client, host, deadline=past)
    res = client.post(f"/api/events/{event['id']}/availability", json={"participant_name": "Late", "slots": SLOT})
    assert res.status_code == 400
    assert "deadline" in res.json()["detail"].lower()


def test_f16_invalid_timezone_rejected(client, host):
    res = client.post("/api/events", json={"title": "X", "candidate_dates": ["2026-12-02"], "timezone": "Mars/Base"},
                      headers=host)
    assert res.status_code == 400
    assert "timezone" in res.json()["detail"].lower()


def test_f16_deadline_format():
    instant = datetime(2026, 11, 25, 23, 0, tzinfo=timezone.utc)
    assert format_local(instant, "America/Chicago") == "Wed, Nov 25, 5:00 PM CST"
    assert format_local(instant, "America/Los_Angeles") == "Wed, Nov 25, 3:00 PM PST"


# ------------------------------------------------------------------ F-17 / FR-17

@pytest.mark.xfail(strict=True, reason="FR-17 Google/Outlook calendar connect is not implemented yet")
def test_f17_connect_google_calendar_requests_readonly_freebusy(client, host):
    res = client.get("/api/calendar/google/connect", headers=host)
    assert res.status_code == 200
    assert res.json()["scopes"] == ["https://www.googleapis.com/auth/calendar.freebusy"]


@pytest.mark.xfail(strict=True, reason="FR-17 calendar auto-fill is not implemented yet")
def test_f17_autofill_marks_busy_blocks_unavailable_without_saving(client, event_with_invitees):
    event, invitees = event_with_invitees
    res = client.post(f"/api/events/{event['id']}/availability/autofill",
                      json={"provider": "google", "edit_token": invitees[0]["response_token"]})
    assert res.status_code == 200
    assert res.json()["banner"] == "Filled from Google Calendar. Review and tap Submit."


# ------------------------------------------------------------------ F-18 / FR-18

def test_f18_reminder_targets_exactly_the_non_responders(client, db_session, host, event_with_invitees, sms_outbox):
    event, invitees = event_with_invitees
    deadline = ensure_utc(db_session.query(Event).get(event["id"]).deadline)
    submit_availability(client, event["id"], "Invitee1", SLOT, token=invitees[0]["response_token"])
    sms_outbox.clear()

    sent = invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=24))
    assert sent == 2

    # Invitee1 (responded) and the host get nothing; Invitee2 and Invitee3 get exactly one text each
    assert _texts_to(sms_outbox, INVITEES[0][1]) == []
    assert _texts_to(sms_outbox, HOST_PHONE) == []
    (text2,) = _texts_to(sms_outbox, INVITEES[1][1])
    (text3,) = _texts_to(sms_outbox, INVITEES[2][1])
    assert text2.startswith(f'Tentative: {HOST_NAME} is waiting on your availability for "Team Dinner". ')
    assert f"Respond by {format_local(deadline, 'America/Chicago')}:" in text2
    assert f"Respond by {format_local(deadline, 'America/Los_Angeles')}:" in text3  # Invitee3 sees PST
    assert text2.endswith("Reply STOP to opt out.")
    assert f"/events/{event['id']}/respond?invite=" in text2

    # RSVP/invitee list shows "Reminder sent" next to Invitee2 and Invitee3 only
    listed = {i["name"]: i for i in client.get(f"/api/events/{event['id']}/invitees", headers=host).json()}
    assert listed["Invitee1"]["reminder_sent_at"] is None
    assert listed["Invitee2"]["reminder_sent_at"] is not None
    assert listed["Invitee3"]["reminder_sent_at"] is not None


def test_f18_reminder_sent_only_once_and_only_inside_window(client, db_session, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    deadline = ensure_utc(db_session.query(Event).get(event["id"]).deadline)
    sms_outbox.clear()

    assert invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=25)) == 0
    assert invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=24)) == 3
    assert invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=1)) == 0
    assert invitee_service.send_deadline_reminders(db_session, now=deadline + timedelta(minutes=1)) == 0
    assert len(sms_outbox) == 3


def test_f18_reminder_skips_opted_out_finalized_and_canceled(client, db_session, host, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    deadline = ensure_utc(db_session.query(Event).get(event["id"]).deadline)
    assert client.post("/api/sms/opt-out", json={"phone": INVITEES[1][1]}).status_code == 200
    sms_outbox.clear()

    assert invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=24)) == 2
    assert _texts_to(sms_outbox, INVITEES[1][1]) == []

    other = create_event(client, host, title="Canceled Dinner", deadline=deadline.isoformat())
    add_invitee(client, host, other["id"], "X", "+14695550199")
    client.post(f"/api/events/{other['id']}/cancel", headers=host)
    sms_outbox.clear()
    assert invitee_service.send_deadline_reminders(db_session, now=deadline - timedelta(hours=24)) == 0


# ------------------------------------------------------------------ F-19 / FR-19

def test_f19_host_broadcasts_update_to_opted_in_invitees(client, host, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    add_invitee(client, host, event["id"], "Invitee4", "+14695550104")
    client.post("/api/sms/opt-out", json={"phone": "+14695550104"})
    sms_outbox.clear()
    body = {"message": "Location changed to ECSS 4.619"}

    preview = client.post(f"/api/events/{event['id']}/updates?preview=true", json=body, headers=host)
    assert preview.status_code == 200
    p = preview.json()
    assert p["preview"] == f"Tentative – Team Dinner update from {HOST_NAME}: Location changed to ECSS 4.619"
    assert p["confirm_text"] == "Text this update to 3 invitees? 1 has turned off texts."
    assert sms_outbox == []  # preview never sends

    sent = client.post(f"/api/events/{event['id']}/updates", json=body, headers=host)
    assert sent.status_code == 200
    assert sent.json()["message"] == "Update sent to 3 invitees."
    for _, phone, _ in INVITEES:
        assert _texts_to(sms_outbox, phone) == [p["preview"]]
    assert _texts_to(sms_outbox, "+14695550104") == []

    # Update appears in the event's activity feed for everyone, including the opted-out Invitee4 (no auth)
    feed = client.get(f"/api/events/{event['id']}/changelog").json()
    assert any("Location changed to ECSS 4.619" in e["details"] for e in feed)


def test_f19_only_host_or_cohost_can_send_updates(client, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    stranger = register_user(client, phone="+12145550177", name="Not The Host")
    sms_outbox.clear()
    res = client.post(f"/api/events/{event['id']}/updates", json={"message": "hi"}, headers=stranger)
    assert res.status_code == 403
    client.cookies.clear()  # drop the stranger's session cookie to send a truly anonymous request
    assert client.post(f"/api/events/{event['id']}/updates", json={"message": "hi"}).status_code == 401
    assert [m for m in sms_outbox if m["kind"] == "notification"] == []


def test_f19_rejects_blank_or_overlong_update(client, host, event_with_invitees):
    event, _ = event_with_invitees
    for msg in ["", "   ", "x" * 321]:
        res = client.post(f"/api/events/{event['id']}/updates", json={"message": msg}, headers=host)
        assert res.status_code in (400, 422), msg


# ------------------------------------------------------------------ F-20 / FR-20

def test_f20_host_texted_once_when_last_invitee_responds(client, host, event_with_invitees, sms_outbox):
    event, invitees = event_with_invitees
    sms_outbox.clear()

    submit_availability(client, event["id"], "Invitee1", SLOT, token=invitees[0]["response_token"])
    submit_availability(client, event["id"], "Invitee2", SLOT, token=invitees[1]["response_token"])
    submit_availability(client, event["id"], "Walk-in", SLOT)  # not on the invite list: doesn't count
    assert _texts_to(sms_outbox, HOST_PHONE) == []
    assert client.get(f"/api/events/{event['id']}", headers=host).json()["ready_to_finalize"] is False

    submit_availability(client, event["id"], "Invitee3", SLOT, token=invitees[2]["response_token"])
    (text,) = _texts_to(sms_outbox, HOST_PHONE)
    assert text.startswith('Tentative: All 3 invitees have responded to "Team Dinner". Pick a time: ')
    assert text.endswith(f"/events/{event['id']}/finalize")
    assert client.get(f"/api/events/{event['id']}", headers=host).json()["ready_to_finalize"] is True

    # Editing a response afterwards does not re-text the host
    submit_availability(client, event["id"], "Invitee3", SLOT, token=invitees[2]["response_token"])
    assert len(_texts_to(sms_outbox, HOST_PHONE)) == 1


def test_f20_no_text_without_invitees(client, host, sms_outbox):
    event = create_event(client, host)
    sms_outbox.clear()
    submit_availability(client, event["id"], "Walk-in", SLOT)
    assert _texts_to(sms_outbox, HOST_PHONE) == []


# ------------------------------------------------------------------ F-21 / FR-21

# The heatmap lays out the 17:00-22:00 America/Chicago window in local time, i.e. 23:00Z-04:00Z.
# Dec 4 7:00-9:00 PM CST == Dec 5 01:00-03:00 UTC.
HEATMAP_SLOT = [{"start_time": "2026-12-05T01:00:00Z", "end_time": "2026-12-05T03:00:00Z"}]


def test_f21_host_finalizes_slot_everyone_is_free(client, db_session, host, event_with_invitees, sms_outbox):
    event, invitees = event_with_invitees
    for inv, (name, _, _) in zip(invitees, INVITEES):
        submit_availability(client, event["id"], name, HEATMAP_SLOT, token=inv["response_token"])
    submit_availability(client, event["id"], HOST_NAME, HEATMAP_SLOT)

    heatmap = client.get(f"/api/events/{event['id']}/heatmap?refresh=true").json()
    best = heatmap["best_slots"][0]
    assert best["count"] == best["total_participants"] == 4

    assert best["start_time"].startswith("2026-12-05T01:00")
    res = client.post(f"/api/events/{event['id']}/finalize",
                      json={"start_time": best["start_time"], "end_time": "2026-12-05T03:00:00Z"}, headers=host)
    assert res.status_code == 200
    page = client.get(f"/api/events/{event['id']}", headers=host).json()
    assert page["status"] == "finalized"
    assert ensure_utc(datetime.fromisoformat(page["finalized_start_time"].replace("Z", "+00:00"))) == datetime(
        2026, 12, 5, 1, 0, tzinfo=timezone.utc
    )

    # Availability grid is locked for all invitees
    locked = client.post(f"/api/events/{event['id']}/availability",
                         json={"participant_name": "Invitee1", "slots": SLOT,
                               "edit_token": invitees[0]["response_token"]})
    assert locked.status_code == 400
    assert "finalized" in locked.json()["detail"].lower()

    # FR-22 notifications triggered
    assert db_session.query(Notification).filter(Notification.notification_type == "finalized").count() == 3


def test_f21_non_host_cannot_finalize(client, event_with_invitees):
    event, _ = event_with_invitees
    stranger = register_user(client, phone="+12145550177", name="Not The Host")
    res = client.post(f"/api/events/{event['id']}/finalize",
                      json={"start_time": SLOT[0]["start_time"], "end_time": SLOT[0]["end_time"]}, headers=stranger)
    assert res.status_code == 403


# ------------------------------------------------------------------ FR-22

def test_fr22_invitees_notified_in_their_timezone_on_finalization(client, host, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    client.post("/api/sms/opt-out", json={"phone": INVITEES[1][1]})
    sms_outbox.clear()

    client.post(f"/api/events/{event['id']}/finalize",
                json={"start_time": SLOT[0]["start_time"], "end_time": SLOT[0]["end_time"]}, headers=host)

    (central,) = _texts_to(sms_outbox, INVITEES[0][1])
    (pacific,) = _texts_to(sms_outbox, INVITEES[2][1])
    assert '"Team Dinner" is set for Fri, Dec 4, 7:00 PM CST' in central
    assert '"Team Dinner" is set for Fri, Dec 4, 5:00 PM PST' in pacific
    assert "ECSS 2.410" in central
    assert _texts_to(sms_outbox, INVITEES[1][1]) == []  # opted out


def test_fr22_host_can_finalize_without_notifying(client, host, event_with_invitees, sms_outbox):
    event, _ = event_with_invitees
    sms_outbox.clear()
    client.post(f"/api/events/{event['id']}/finalize",
                json={"start_time": SLOT[0]["start_time"], "end_time": SLOT[0]["end_time"],
                      "notify_participants": False}, headers=host)
    assert [m for m in sms_outbox if m["kind"] == "notification"] == []


# ------------------------------------------------------------------ Invitee management (supports FR-18..22)

def test_invitee_management_rules(client, db_session, host, event_with_invitees):
    event, invitees = event_with_invitees
    # Duplicate phone on the same event is rejected; invalid phones are rejected
    dup = client.post(f"/api/events/{event['id']}/invitees", json={"name": "Again", "phone": "(469) 555-0101"},
                      headers=host)
    assert dup.status_code == 409
    bad = client.post(f"/api/events/{event['id']}/invitees", json={"name": "Bad", "phone": "555"}, headers=host)
    assert bad.status_code == 400
    # Only host/co-host can add or list invitees
    stranger = register_user(client, phone="+12145550177", name="Not The Host")
    assert client.get(f"/api/events/{event['id']}/invitees", headers=stranger).status_code == 403
    # Phone numbers are masked in API output and encrypted at rest
    listed = client.get(f"/api/events/{event['id']}/invitees", headers=host).json()
    assert all("555" not in i["phone_masked"] for i in listed)
    row = db_session.query(Invitee).first()
    assert "4695550101" not in row.phone_encrypted
