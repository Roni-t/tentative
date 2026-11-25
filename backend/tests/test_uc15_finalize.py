"""UC-15 Finalize Meeting Time — tests (author: Divyam).

Covers the main flow, the co-host alternate flow, the permission exception,
and each invalid-input rule added in EventService._validate_finalize_time.
Test IDs match the test case tables in the SE Document.
"""

from tests.helpers import register_user

EVENT = {
    "title": "Sprint Review",
    "candidate_dates": ["2026-11-25"],
    "timezone": "UTC",
    "daily_start_time": "14:00",
    "daily_end_time": "16:00",
    "slot_duration_minutes": 30,
}
VALID_SLOT = {"start_time": "2026-11-25T14:30:00Z", "end_time": "2026-11-25T15:00:00Z"}


def login(client, phone, name):
    """Create an account and return auth headers."""
    return register_user(client, phone=phone, name=name)


def create_event(client, headers):
    return client.post("/api/events", json=EVENT, headers=headers).json()["id"]


def finalize(client, event_id, headers, start, end):
    return client.post(
        f"/api/events/{event_id}/finalize",
        json={"start_time": start, "end_time": end, "notify_participants": False},
        headers=headers,
    )


def test_tc15_01_host_finalizes_valid_slot(client, db_session):
    """TC-15-01: host locks in a valid slot -> 200, status 'finalized', times saved."""
    host = login(client, "+19725550111", "Host")
    event_id = create_event(client, host)

    res = finalize(client, event_id, host, VALID_SLOT["start_time"], VALID_SLOT["end_time"])

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "finalized"
    assert body["finalized_start_time"].startswith("2026-11-25T14:30")
    assert body["finalized_end_time"].startswith("2026-11-25T15:00")


def test_tc15_02_cohost_can_finalize(client, db_session):
    """TC-15-02 (alternate flow): a co-host can finalize the event."""
    cohost = login(client, "+19725550122", "Cohost Carla")
    host = login(client, "+19725550121", "Host")
    event_id = create_event(client, host)
    client.post(f"/api/events/{event_id}/cohosts", json={"identifier": "+19725550122"}, headers=host)

    res = finalize(client, event_id, cohost, VALID_SLOT["start_time"], VALID_SLOT["end_time"])

    assert res.status_code == 200
    assert res.json()["status"] == "finalized"


def test_tc15_03_non_host_is_forbidden(client, db_session):
    """TC-15-03 (exception): a user who is not host/co-host gets 403."""
    host = login(client, "+19725550131", "Host")
    event_id = create_event(client, host)
    stranger = login(client, "+19725550132", "Stranger")

    res = finalize(client, event_id, stranger, VALID_SLOT["start_time"], VALID_SLOT["end_time"])

    assert res.status_code == 403
    assert res.json()["detail"] == "Only host or co-host can finalize."


def test_tc15_04_end_before_start_rejected(client, db_session):
    """TC-15-04 (invalid input): end time earlier than start -> 400."""
    host = login(client, "+19725550141", "Host")
    event_id = create_event(client, host)

    res = finalize(client, event_id, host, "2026-11-25T15:00:00Z", "2026-11-25T14:30:00Z")

    assert res.status_code == 400
    assert res.json()["detail"] == "End time must be after start time."


def test_tc15_05_date_not_candidate_rejected(client, db_session):
    """TC-15-05 (invalid input): date is not one of the candidate dates -> 400."""
    host = login(client, "+19725550151", "Host")
    event_id = create_event(client, host)

    res = finalize(client, event_id, host, "2026-11-26T14:30:00Z", "2026-11-26T15:00:00Z")

    assert res.status_code == 400
    assert res.json()["detail"] == "Selected time must be on one of the event's candidate dates."


def test_tc15_06_outside_daily_window_rejected(client, db_session):
    """TC-15-06 (invalid input): time outside the 14:00-16:00 window -> 400."""
    host = login(client, "+19725550161", "Host")
    event_id = create_event(client, host)

    res = finalize(client, event_id, host, "2026-11-25T13:00:00Z", "2026-11-25T13:30:00Z")

    assert res.status_code == 400
    assert res.json()["detail"] == "Selected time must be within the event's daily time window."


def test_tc15_07_canceled_event_rejected(client, db_session):
    """TC-15-07 (exceptional condition): a canceled event cannot be finalized."""
    host = login(client, "+19725550171", "Host")
    event_id = create_event(client, host)
    client.post(f"/api/events/{event_id}/cancel", headers=host)

    res = finalize(client, event_id, host, VALID_SLOT["start_time"], VALID_SLOT["end_time"])

    assert res.status_code == 400
    assert res.json()["detail"] == "Cannot finalize a canceled event."
