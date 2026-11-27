"""RSVP through each invitee's RSVP link, after the host finalizes a time (DEV-167)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.event import Event
from tests.helpers import add_invitee, create_event, register_user

START, END = "2026-12-02T23:00:00Z", "2026-12-03T00:00:00Z"  # 5 PM Chicago on a candidate date


@pytest.fixture
def host(client):
    headers = register_user(client, phone="+19725550142", name="Test Host")
    client.cookies.clear()
    return headers


@pytest.fixture
def event(client, host):
    return create_event(client, host, capacity_limit=2)


def finalize(client, event, host, notify=False):
    res = client.post(f"/api/events/{event['id']}/finalize",
                      json={"start_time": START, "end_time": END, "notify_participants": notify}, headers=host)
    assert res.status_code == 200, res.text


def rsvp(client, token, status):
    client.cookies.clear()
    return client.post(f"/api/rsvp/{token}", json={"status": status})


def invitees(client, event, host):
    return {i["name"]: i for i in client.get(f"/api/events/{event['id']}/invitees", headers=host).json()}


# ------------------------------------------------------------------ the link

def test_rsvp_link_is_listed_for_each_invitee(client, host, event):
    sam = add_invitee(client, host, event["id"], "Sam")
    listed = invitees(client, event, host)["Sam"]
    assert listed["rsvp_link"].endswith(f"/rsvp/{sam['response_token']}")
    assert listed["rsvp_status"] is None


def test_rsvp_page_shows_the_event_and_the_invitee(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    client.cookies.clear()
    page = client.get(f"/api/rsvp/{token}").json()
    assert page["name"] == "Sam" and page["title"] == event["title"]
    assert page["finalized_start_time"].startswith("2026-12-02T23:00")
    assert page["open"] is True and page["rsvp_status"] is None


def test_unknown_link_is_404(client):
    assert client.get("/api/rsvp/not-a-real-token").status_code == 404
    assert rsvp(client, "not-a-real-token", "going").status_code == 404


# ------------------------------------------------------------------ answering

def test_rsvp_is_closed_until_a_time_is_finalized(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    assert client.get(f"/api/rsvp/{token}").json()["open"] is False
    res = rsvp(client, token, "going")
    assert res.status_code == 400 and "time" in res.json()["detail"].lower()


def test_rsvp_is_saved_on_the_invitee(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    assert rsvp(client, token, "maybe").json()["rsvp_status"] == "maybe"
    assert invitees(client, event, host)["Sam"]["rsvp_status"] == "maybe"


def test_the_same_link_changes_the_answer_from_any_device(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    rsvp(client, token, "going")
    rsvp(client, token, "not_going")  # cookies cleared: a different device
    assert client.get(f"/api/rsvp/{token}").json()["rsvp_status"] == "not_going"
    assert len(invitees(client, event, host)) == 1


def test_invalid_status_is_rejected(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    assert rsvp(client, token, "waitlisted").status_code == 400


def test_group_link_guest_can_rsvp_through_their_link(client, host, event):
    client.cookies.clear()
    res = client.post(f"/api/events/{event['id']}/availability", json={
        "participant_name": "Gus", "slots": [{"start_time": START, "end_time": END}]})
    finalize(client, event, host)
    guest = invitees(client, event, host)["Gus"]
    assert guest["joined_via_link"] and guest["rsvp_link"].endswith(f"/rsvp/{res.json()['edit_token']}")
    assert rsvp(client, res.json()["edit_token"], "going").status_code == 200


def test_rsvp_closes_when_the_event_starts(client, host, event, db_session):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    row = db_session.query(Event).get(event["id"])
    row.finalized_start_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5)
    db_session.commit()
    assert client.get(f"/api/rsvp/{token}").json()["open"] is False
    assert rsvp(client, token, "going").status_code == 400


def test_rsvp_is_closed_for_a_canceled_event(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    client.post(f"/api/events/{event['id']}/cancel", headers=host)
    res = rsvp(client, token, "going")
    assert res.status_code == 400 and "canceled" in res.json()["detail"].lower()


def test_blocked_invitee_cannot_rsvp(client, host, event):
    token = add_invitee(client, host, event["id"], "Sam")["response_token"]
    finalize(client, event, host)
    client.post(f"/api/events/{event['id']}/block", params={"identifier": "Sam"}, headers=host)
    assert rsvp(client, token, "going").status_code == 403


# ------------------------------------------------------------------ capacity (no waitlist)

def fill(client, host, event):
    tokens = [add_invitee(client, host, event["id"], n)["response_token"] for n in ("Ann", "Bob", "Cat")]
    finalize(client, event, host)
    for t in tokens[:2]:
        assert rsvp(client, t, "going").status_code == 200
    return tokens


def test_going_is_refused_once_full(client, host, event):
    *_, cat = fill(client, host, event)
    res = rsvp(client, cat, "going")
    assert res.status_code == 409 and "full" in res.json()["detail"].lower()
    assert invitees(client, event, host)["Cat"]["rsvp_status"] is None


def test_maybe_still_works_when_full(client, host, event):
    *_, cat = fill(client, host, event)
    assert rsvp(client, cat, "maybe").status_code == 200


def test_someone_going_can_resubmit_when_full(client, host, event):
    ann, *_ = fill(client, host, event)
    assert rsvp(client, ann, "going").status_code == 200


def test_a_spot_opens_when_someone_stops_going(client, host, event):
    ann, _, cat = fill(client, host, event)
    rsvp(client, ann, "not_going")
    assert rsvp(client, cat, "going").status_code == 200


def test_rsvp_page_says_when_full(client, host, event):
    *_, cat = fill(client, host, event)
    page = client.get(f"/api/rsvp/{cat}").json()
    assert page["capacity_limit"] == 2 and page["spots_left"] == 0


# ------------------------------------------------------------------ texts

def test_finalized_text_includes_the_rsvp_link(client, host, event, sms_outbox):
    sam = add_invitee(client, host, event["id"], "Sam", phone="+14695550166")
    sms_outbox.clear()
    finalize(client, event, host, notify=True)
    texts = [m["message"] for m in sms_outbox if m["phone"] == "+14695550166"]
    assert len(texts) == 1 and f"/rsvp/{sam['response_token']}" in texts[0]


def test_cancel_texts_invitees_who_get_texts(client, host, event, sms_outbox):
    add_invitee(client, host, event["id"], "Sam", phone="+14695550166")
    add_invitee(client, host, event["id"], "Nia")
    sms_outbox.clear()
    client.post(f"/api/events/{event['id']}/cancel", headers=host)
    texts = [m for m in sms_outbox if m["kind"] == "notification" and m["phone"] == "+14695550166"]
    assert len(texts) == 1 and "canceled" in texts[0]["message"].lower()


def test_old_rsvp_endpoints_are_gone(client, host, event):
    assert client.get(f"/api/events/{event['id']}/rsvp").status_code == 404
    assert client.get(f"/api/events/{event['id']}/rsvp/export.csv").status_code == 404
