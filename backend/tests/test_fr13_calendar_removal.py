"""FR-13 Back out / remove event from calendar (owner: Trinity). Tests written by Divyam."""
from tests.helpers import create_event, register_user

HOST = "+19725550321"
UTC_EVENT = {"timezone": "UTC", "candidate_dates": ["2026-12-02"], "daily_start_time": "14:00", "daily_end_time": "16:00"}
SLOT = {"start_time": "2026-12-02T14:00:00Z", "end_time": "2026-12-02T15:00:00Z", "notify_participants": False}


def test_fr13_01_canceled_event_ics_removes_it(client, db_session):
    """After a finalized event is canceled, its .ics link returns a cancellation with the same UID."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host, **UTC_EVENT)
    assert client.post(f"/api/events/{event['id']}/finalize", json=SLOT, headers=host).status_code == 200
    added = client.get(f"/api/events/{event['id']}/export.ics").text

    client.post(f"/api/events/{event['id']}/cancel", headers=host)
    removed = client.get(f"/api/events/{event['id']}/export.ics")

    assert removed.status_code == 200
    assert "METHOD:CANCEL" in removed.text and "STATUS:CANCELLED" in removed.text
    uid = next(line for line in added.splitlines() if line.startswith("UID:"))
    assert uid in removed.text  # same UID, so the calendar removes the event it added
    assert "canceled.ics" in removed.headers["content-disposition"]


def test_fr13_02_finalized_event_ics_still_adds(client, db_session):
    """A finalized (not canceled) event still downloads as a normal, confirmed calendar entry."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host, **UTC_EVENT)
    client.post(f"/api/events/{event['id']}/finalize", json=SLOT, headers=host)

    res = client.get(f"/api/events/{event['id']}/export.ics")

    assert "METHOD:PUBLISH" in res.text and "STATUS:CONFIRMED" in res.text


def test_fr13_03_canceled_before_finalizing_has_no_file(client, db_session):
    """An event canceled before any time was picked was never on a calendar, so there is nothing to remove."""
    host = register_user(client, HOST, "Host")
    event = create_event(client, host, **UTC_EVENT)
    client.post(f"/api/events/{event['id']}/cancel", headers=host)

    res = client.get(f"/api/events/{event['id']}/export.ics")

    assert res.status_code == 400
    assert res.json()["detail"] == "This event has no final time yet."
