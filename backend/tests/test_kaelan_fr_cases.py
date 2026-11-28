"""Functional requirement test cases for Kaelan's completed, merged Linear issues.

    F-19  FR-19  DEV-120  host texts an update (write, preview, confirm, send)
    F-25  FR-25  DEV-172  group link expires on its own (response deadline, else 30 days); copying an
                          expired link makes a new one; no manual rotation or expiry settings
    F-29  FR-29  DEV-170  capacity limit without a waitlist ("This event is full.")
    F-30  FR-30  DEV-167, DEV-169  invitees RSVP and change their answer through their own RSVP link after the
                          host picks a time; the host sees each answer in the invitee list

Linear is the source of truth for these (the design doc's waitlist, CSV export and link rotation were removed).
Dates are relative to "now" so the suite keeps passing after the semester.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.config import settings
from app.core.security import ensure_utc
from app.models.event import Event
from app.models.notification import Notification
from app.models.shareable_url import ShareableURL
from tests.helpers import add_invitee, create_event, register_user

HOST_PHONE, HOST_NAME = "+19725550142", "Kaelan Nguyen"
INVITEES = [  # (name, phone, timezone): each verifies their number for texts
    ("Invitee1", "+14695550101", "America/Chicago"),
    ("Invitee2", "+14695550102", "America/Chicago"),
    ("Invitee3", "+13105550103", "America/Los_Angeles"),
]
FINAL_START, FINAL_END = "2026-12-05T01:00:00Z", "2026-12-05T03:00:00Z"  # Fri, Dec 4, 7-9 PM CST


def utc(value: str) -> datetime:
    return ensure_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def naive_utc(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def texts_to(outbox, phone):
    return [m["message"] for m in outbox if m["kind"] == "notification" and m["phone"] == phone]


@pytest.fixture
def host(client):
    return register_user(client, phone=HOST_PHONE, name=HOST_NAME)


def team_dinner(client, host, invitees=INVITEES, **event_fields):
    """Team Dinner (Chicago time) with the given invitees, each with a verified phone number."""
    event = create_event(client, host, title="Team Dinner", **event_fields)
    people = [add_invitee(client, host, event["id"], name, phone, tz) for name, phone, tz in invitees]
    client.cookies.clear()
    return event, people


def finalize(client, event, host, notify=False):
    res = client.post(f"/api/events/{event['id']}/finalize",
                      json={"start_time": FINAL_START, "end_time": FINAL_END, "notify_participants": notify},
                      headers=host)
    assert res.status_code == 200, res.text


def rsvp(client, token, answer):
    client.cookies.clear()  # the RSVP link alone identifies the invitee, on any device
    return client.post(f"/api/rsvp/{token}", json={"status": answer})


# ------------------------------------------------------------------ F-19 / FR-19 / DEV-120


def test_f19_host_texts_an_update(client, host, sms_outbox):
    """F-19 (Kaelan, DEV-120). Host can send updates via SMS.

    Preconditions: Team Dinner has Invitee1, Invitee2, Invitee3 (texts on) and Invitee4 (replied STOP).
    Input: event page "Text an update" card: "Location changed to ECSS 2.410", Preview, then Send.
    System conditions: database, SMS service (console) and frontend running.
    Expected: preview "Tentative – Team Dinner update from Kaelan Nguyen: Location changed to ECSS 2.410";
    confirm "Text this update to 3 invitees? 1 has turned off texts."; the preview sends nothing. After Send:
    "Update sent to 3 invitees." Invitee1-3 get the text, Invitee4 does not, and the update appears in the
    event's change history, which everyone can see.
    """
    event, _ = team_dinner(client, host, invitees=INVITEES + [("Invitee4", "+14695550104", "America/Chicago")])
    assert client.post("/api/sms/opt-out", json={"phone": "+14695550104"}).status_code == 200
    body = {"message": "Location changed to ECSS 2.410"}
    sms_outbox.clear()

    preview = client.post(f"/api/events/{event['id']}/updates?preview=true", json=body, headers=host).json()
    assert preview["preview"] == "Tentative – Team Dinner update from Kaelan Nguyen: Location changed to ECSS 2.410"
    assert preview["confirm_text"] == "Text this update to 3 invitees? 1 has turned off texts."
    assert [m for m in sms_outbox if m["kind"] == "notification"] == []

    sent = client.post(f"/api/events/{event['id']}/updates", json=body, headers=host).json()
    assert sent["message"] == "Update sent to 3 invitees." and sent["sent_count"] == 3
    for _, phone, _ in INVITEES:
        assert texts_to(sms_outbox, phone) == [preview["preview"]]
    assert texts_to(sms_outbox, "+14695550104") == []

    client.cookies.clear()  # change history is public, so Invitee4 sees the update too
    history = client.get(f"/api/events/{event['id']}/changelog").json()
    assert any(h["action"] == "host_update" and "Location changed to ECSS 2.410" in h["details"] for h in history)


# ------------------------------------------------------------------ F-25 / FR-25 / DEV-172


def test_f25_group_link_expires_on_its_own(client, db_session, host):
    """F-25 (Kaelan, DEV-172). Group link expiry is automatic.

    Preconditions: host logged in; Event A has no response deadline; Event B's deadline is 3 days away.
    Input: "Copy group link" on each event; then Event A's link turns 31 days old and Event B's deadline passes.
    System conditions: database and backend running.
    Expected: Event A's link works for 30 days, then copying it makes and returns a new link while the old one
    shows "This orbit has ended." (410). Event B's link expires at its deadline, follows the deadline if it moves,
    and after the deadline copying is refused with "The response deadline has passed, so the group link no
    longer works." Only the host can get the link, and the old manual rotate/expiry options are gone.
    """
    event_a = create_event(client, host)
    first = client.post(f"/api/events/{event_a['id']}/group-link", headers=host).json()
    assert first["token"] == event_a["active_token"]
    assert abs(utc(first["expires_at"]) - (datetime.now(timezone.utc) + timedelta(days=30))) < timedelta(minutes=1)

    link = db_session.query(ShareableURL).filter(ShareableURL.token == first["token"]).first()
    link.created_at = naive_utc(datetime.now(timezone.utc) - timedelta(days=31))
    db_session.commit()
    gone = client.get(f"/api/share/{first['token']}")
    assert gone.status_code == 410 and gone.json()["detail"] == "This orbit has ended. The shareable link has expired."
    second = client.post(f"/api/events/{event_a['id']}/group-link", headers=host).json()
    assert second["token"] != first["token"]
    assert client.get(f"/api/share/{second['token']}").json()["id"] == event_a["id"]

    deadline = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(days=3)
    event_b = create_event(client, host, deadline=deadline.isoformat())
    assert utc(client.post(f"/api/events/{event_b['id']}/group-link", headers=host).json()["expires_at"]) == deadline
    row = db_session.query(Event).get(event_b["id"])
    row.deadline = naive_utc(datetime.now(timezone.utc) - timedelta(hours=1))  # the deadline moves into the past
    db_session.commit()
    assert client.get(f"/api/share/{event_b['active_token']}").status_code == 410
    refused = client.post(f"/api/events/{event_b['id']}/group-link", headers=host)
    assert refused.status_code == 400
    assert refused.json()["detail"] == "The response deadline has passed, so the group link no longer works."

    other = register_user(client, phone="+14695550151", name="Omar Other")
    assert client.post(f"/api/events/{event_a['id']}/group-link", headers=other).status_code == 403
    assert client.post(f"/api/events/{event_a['id']}/share/rotate", headers=host).status_code in (404, 405)


# ------------------------------------------------------------------ F-29 / FR-29 / DEV-170


def test_f29_capacity_limit_without_a_waitlist(client, host):
    """F-29 (Kaelan, DEV-170). Capacity limit the host sets; no waitlist.

    Preconditions: Team Dinner with a limit of 2 people, finalized; Invitee1, Invitee2, Invitee3 invited.
    Input: Invitee1 and Invitee2 RSVP "Going"; Invitee3 tries "Going", then "Maybe"; Invitee1 changes to
    "Not going"; Invitee3 tries "Going" again.
    System conditions: database and backend running.
    Expected: the RSVP page shows "2 of 2 spots left" at first. Invitee3's "Going" is refused with
    "This event is full." and nothing is saved; "Maybe" is saved. Once Invitee1 stops going, Invitee3 can go.
    "waitlisted" is not an answer anyone can give.
    """
    event, (inv1, inv2, inv3) = team_dinner(client, host, capacity_limit=2)
    finalize(client, event, host)
    page = client.get(f"/api/rsvp/{inv3['response_token']}").json()
    assert page["capacity_limit"] == 2 and page["spots_left"] == 2

    assert rsvp(client, inv1["response_token"], "going").status_code == 200
    assert rsvp(client, inv2["response_token"], "going").status_code == 200
    full = rsvp(client, inv3["response_token"], "going")
    assert full.status_code == 409 and full.json()["detail"] == "This event is full."
    assert client.get(f"/api/rsvp/{inv3['response_token']}").json()["rsvp_status"] is None
    assert rsvp(client, inv3["response_token"], "maybe").json()["rsvp_status"] == "maybe"

    assert rsvp(client, inv1["response_token"], "not_going").status_code == 200
    assert rsvp(client, inv3["response_token"], "going").json()["rsvp_status"] == "going"
    assert rsvp(client, inv2["response_token"], "waitlisted").status_code == 400


# ------------------------------------------------------------------ F-30 / FR-30 / DEV-167, DEV-169


def test_f30_invitee_changes_rsvp_through_their_link(client, db_session, host, sms_outbox):
    """F-30 (Kaelan, DEV-167 + DEV-169). Invitees RSVP and change their answer any time before the event.

    Preconditions: Team Dinner with Invitee1 (texts on); no time picked yet.
    Input: Invitee1 opens their RSVP link before and after the host finalizes; answers "Going" on a laptop,
    then "Maybe" on a phone (no login, same link); the event then starts.
    System conditions: database, SMS service (console) and frontend running.
    Expected: before a time is picked the link says "You can RSVP once the host picks a time." When the host
    finalizes, Invitee1's text ends with "Are you coming? <their RSVP link>". Each answer is saved on Invitee1
    (one entry, no duplicate) and the host is notified; the host's invitee list shows the latest answer and the
    RSVP link. Once the event starts, answers are refused with "This event has already started."
    """
    event, (inv1,) = team_dinner(client, host, invitees=INVITEES[:1])
    token = inv1["response_token"]
    closed = rsvp(client, token, "going")
    assert closed.status_code == 400 and closed.json()["detail"] == "You can RSVP once the host picks a time."

    sms_outbox.clear()
    finalize(client, event, host, notify=True)
    (text,) = texts_to(sms_outbox, INVITEES[0][1])
    assert text.endswith(f"Are you coming? {settings.PUBLIC_APP_URL}/rsvp/{token}")

    assert rsvp(client, token, "going").json()["rsvp_status"] == "going"      # laptop
    assert rsvp(client, token, "maybe").json()["rsvp_status"] == "maybe"      # phone, same link, no login
    listed = client.get(f"/api/events/{event['id']}/invitees", headers=host).json()
    assert [(i["name"], i["rsvp_status"]) for i in listed] == [("Invitee1", "maybe")]
    assert listed[0]["rsvp_link"] == f"{settings.PUBLIC_APP_URL}/rsvp/{token}"
    notices = db_session.query(Notification).filter(Notification.notification_type == "rsvp_update").all()
    assert [n.message for n in notices] == ['Invitee1 RSVPed "going" for "Team Dinner".',
                                           'Invitee1 RSVPed "maybe" for "Team Dinner".']

    row = db_session.query(Event).get(event["id"])
    row.finalized_start_time = naive_utc(datetime.now(timezone.utc) - timedelta(minutes=5))  # the event starts
    db_session.commit()
    late = rsvp(client, token, "not_going")
    assert late.status_code == 400 and late.json()["detail"] == "This event has already started."
