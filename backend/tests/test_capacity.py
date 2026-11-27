"""Capacity limit without a waitlist (DEV-170): once full, nobody else can RSVP going."""
import pytest

from tests.helpers import register_user


@pytest.fixture
def event_id(client):
    headers = register_user(client, phone="+19725550142", name="Test Host")
    res = client.post("/api/events", json={"title": "Small Room", "candidate_dates": ["2026-12-05"], "capacity_limit": 2},
                      headers=headers)
    client.cookies.clear()
    return res.json()["id"]


def rsvp(client, event_id, name, status, token=None):
    client.cookies.clear()
    body = {"participant_name": name, "status": status}
    if token:
        body["edit_token"] = token
    return client.post(f"/api/events/{event_id}/rsvp", json=body)


def fill(client, event_id):
    return [rsvp(client, event_id, name, "going").json()["edit_token"] for name in ("Sarah", "John")]


def test_going_is_refused_once_the_event_is_full(client, event_id):
    fill(client, event_id)
    res = rsvp(client, event_id, "Kyle", "going")
    assert res.status_code == 409
    assert "full" in res.json()["detail"].lower()


def test_refused_rsvp_is_not_saved(client, event_id):
    fill(client, event_id)
    rsvp(client, event_id, "Kyle", "going")
    names = [r["participant_name"] for r in client.get(f"/api/events/{event_id}/rsvp").json()["rsvps"]]
    assert "Kyle" not in names


def test_maybe_and_not_going_still_work_when_full(client, event_id):
    fill(client, event_id)
    assert rsvp(client, event_id, "Kyle", "maybe").json()["status"] == "maybe"
    assert rsvp(client, event_id, "Miles", "not_going").json()["status"] == "not_going"


def test_someone_already_going_can_resubmit_when_full(client, event_id):
    sarah, _ = fill(client, event_id)
    assert rsvp(client, event_id, "Sarah", "going", token=sarah).status_code == 200


def test_a_spot_opens_when_someone_stops_going(client, event_id):
    sarah, _ = fill(client, event_id)
    rsvp(client, event_id, "Sarah", "not_going", token=sarah)
    assert rsvp(client, event_id, "Kyle", "going").json()["status"] == "going"


def test_waitlisted_is_not_a_status(client, event_id):
    assert rsvp(client, event_id, "Kyle", "waitlisted").status_code == 400


def test_summary_and_rsvps_have_no_waitlist_fields(client, event_id):
    fill(client, event_id)
    summary = client.get(f"/api/events/{event_id}/rsvp").json()
    assert "count_waitlisted" not in summary and "current_waitlist_position" not in summary
    assert all("waitlist_position" not in r for r in summary["rsvps"])
    assert summary["count_going"] == 2 and summary["capacity_limit"] == 2


def test_csv_export_has_no_waitlist_column(client, event_id):
    fill(client, event_id)
    header = client.get(f"/api/events/{event_id}/rsvp/export.csv").text.splitlines()[0]
    assert "Waitlist" not in header
