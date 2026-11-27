"""Group link expiry is automatic (DEV-172): the response deadline if set, otherwise 30 days.

Copying an expired group link (no deadline) makes a new one. There is no manual rotation or expiry setting.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.shareable_url import ShareableURL
from tests.helpers import add_invitee, create_event, login_user, register_user

START, END = "2026-12-02T23:00:00Z", "2026-12-03T00:00:00Z"


def naive(dt):
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


@pytest.fixture
def host(client):
    headers = register_user(client, phone="+19725550142", name="Test Host")
    client.cookies.clear()
    return headers


def group_link(client, event, host):
    return client.post(f"/api/events/{event['id']}/group-link", headers=host)


def age_link(db_session, token, days):
    link = db_session.query(ShareableURL).filter(ShareableURL.token == token).first()
    link.created_at = naive(datetime.now(timezone.utc) - timedelta(days=days))
    db_session.commit()


def test_new_event_has_a_working_group_link(client, host):
    event = create_event(client, host)
    assert client.get(f"/api/share/{event['active_token']}").json()["id"] == event["id"]


def test_group_link_lasts_30_days_without_a_deadline(client, host, db_session):
    event = create_event(client, host)
    res = group_link(client, event, host).json()
    expires = datetime.fromisoformat(res["expires_at"].replace("Z", "+00:00"))
    expires = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
    assert abs(expires - (datetime.now(timezone.utc) + timedelta(days=30))) < timedelta(minutes=1)
    age_link(db_session, event["active_token"], 29)
    assert client.get(f"/api/share/{event['active_token']}").status_code == 200
    age_link(db_session, event["active_token"], 31)
    assert client.get(f"/api/share/{event['active_token']}").status_code == 410


def test_group_link_expires_at_the_response_deadline(client, host, db_session):
    deadline = datetime.now(timezone.utc) + timedelta(days=3)
    event = create_event(client, host, deadline=deadline.isoformat())
    res = group_link(client, event, host).json()
    assert res["expires_at"].startswith(naive(deadline).isoformat()[:16])
    age_link(db_session, event["active_token"], 31)  # the deadline wins over 30 days
    assert client.get(f"/api/share/{event['active_token']}").status_code == 200


def test_moving_the_deadline_moves_the_link_expiry(client, host, db_session):
    from app.models.event import Event
    event = create_event(client, host, deadline=(datetime.now(timezone.utc) + timedelta(days=3)).isoformat())
    row = db_session.query(Event).get(event["id"])
    row.deadline = naive(datetime.now(timezone.utc) - timedelta(hours=1))
    db_session.commit()
    assert client.get(f"/api/share/{event['active_token']}").status_code == 410


def test_copying_returns_the_same_link_while_it_works(client, host):
    event = create_event(client, host)
    res = group_link(client, event, host)
    assert res.status_code == 200 and res.json()["token"] == event["active_token"]


def test_copying_an_expired_link_makes_a_new_one(client, host, db_session):
    event = create_event(client, host)
    age_link(db_session, event["active_token"], 31)
    res = group_link(client, event, host).json()
    assert res["token"] != event["active_token"]
    assert client.get(f"/api/share/{res['token']}").status_code == 200
    assert client.get(f"/api/share/{event['active_token']}").status_code == 410
    fetched = client.get(f"/api/events/{event['id']}", headers=host).json()
    assert fetched["active_token"] == res["token"]


def test_no_new_link_after_the_response_deadline(client, host, db_session):
    from app.models.event import Event
    event = create_event(client, host, deadline=(datetime.now(timezone.utc) + timedelta(days=3)).isoformat())
    row = db_session.query(Event).get(event["id"])
    row.deadline = naive(datetime.now(timezone.utc) - timedelta(hours=1))
    db_session.commit()
    res = group_link(client, event, host)
    assert res.status_code == 400 and "deadline" in res.json()["detail"].lower()


def test_only_hosts_can_get_the_group_link(client, host):
    event = create_event(client, host)
    other = register_user(client, phone="+14695550151", name="Omar Other")
    assert group_link(client, event, other).status_code == 403
    client.cookies.clear()
    assert client.post(f"/api/events/{event['id']}/group-link").status_code == 401


def test_manual_rotate_and_expiry_endpoints_are_gone(client, host):
    event = create_event(client, host)
    assert client.post(f"/api/events/{event['id']}/share/rotate", headers=host).status_code in (404, 405)
    assert client.post(f"/api/events/{event['id']}/share/expiry", headers=host,
                       json={"expiry_option": "1_week"}).status_code in (404, 405)


# ------------------------------------------------------------------ "Submit RSVP" card: whose RSVP link

def finalize(client, event, host):
    client.post(f"/api/events/{event['id']}/finalize",
                json={"start_time": START, "end_time": END, "notify_participants": False}, headers=host)


def my_rsvp(client, event, token=None, headers=None):
    params = {"token": token} if token else {}
    return client.get(f"/api/events/{event['id']}/my-rsvp", params=params, headers=headers or {})


def test_my_rsvp_finds_the_invitee_from_their_saved_token(client, host):
    event = create_event(client, host)
    sam = add_invitee(client, host, event["id"], "Sam")
    finalize(client, event, host)
    client.cookies.clear()
    assert my_rsvp(client, event, token=sam["response_token"]).json()["token"] == sam["response_token"]


def test_my_rsvp_finds_a_logged_in_invitee(client, host):
    event = create_event(client, host)
    sam = add_invitee(client, host, event["id"], "Sam", phone="+14695550166")
    # verifying the number on the invite made the account, so log in with it
    member = {"Authorization": f"Bearer {login_user(client, phone="+14695550166")["token"]}"}
    client.cookies.clear()
    assert my_rsvp(client, event, headers=member).json()["token"] == sam["response_token"]


def test_my_rsvp_ignores_a_token_from_another_event(client, host):
    event, other = create_event(client, host), create_event(client, host)
    sam = add_invitee(client, host, other["id"], "Sam")
    client.cookies.clear()
    assert my_rsvp(client, event, token=sam["response_token"]).json()["token"] is None


def test_my_rsvp_is_empty_for_the_host(client, host):
    event = create_event(client, host)
    assert my_rsvp(client, event, headers=host).json()["token"] is None
