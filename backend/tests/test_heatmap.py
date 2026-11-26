from datetime import datetime, timezone

from tests.helpers import register_user
import time


def test_heatmap_calculation_and_caching(client, db_session):
    # Setup host & event
    phone = "+19725550142"
    headers = register_user(client, phone=phone, name="Host")

    create_resp = client.post("/api/events", json={
        "title": "Quantum Orbit Meeting",
        "candidate_dates": ["2026-11-25"],
        "daily_start_time": "14:00",
        "daily_end_time": "16:00",
        "slot_duration_minutes": 30
    }, headers=headers)
    event_id = create_resp.json()["id"]

    # Invitee 1 submits: 14:00 - 15:00
    client.cookies.clear()
    client.post(f"/api/events/{event_id}/availability", json={
        "participant_name": "Alice",
        "slots": [
            {"start_time": "2026-11-25T20:00:00Z", "end_time": "2026-11-25T20:30:00Z"},
            {"start_time": "2026-11-25T20:30:00Z", "end_time": "2026-11-25T21:00:00Z"}
        ]
    })

    # Invitee 2 submits: 14:30 - 15:30
    client.cookies.clear()
    client.post(f"/api/events/{event_id}/availability", json={
        "participant_name": "Bob",
        "slots": [
            {"start_time": "2026-11-25T20:30:00Z", "end_time": "2026-11-25T21:00:00Z"},
            {"start_time": "2026-11-25T21:00:00Z", "end_time": "2026-11-25T21:30:00Z"}
        ]
    })

    # Invitee 3 submits: 14:30 - 15:00
    client.cookies.clear()
    client.post(f"/api/events/{event_id}/availability", json={
        "participant_name": "Charlie",
        "slots": [
            {"start_time": "2026-11-25T20:30:00Z", "end_time": "2026-11-25T21:00:00Z"}
        ]
    })

    # Fetch Heatmap
    t0 = time.time()
    hm_res = client.get(f"/api/events/{event_id}/heatmap")
    duration = time.time() - t0
    assert duration < 2.0  # Fast under 2 seconds!
    assert hm_res.status_code == 200
    hm_data = hm_res.json()

    assert hm_data["total_respondents"] == 3
    assert "Alice" in hm_data["respondent_names"]
    assert "Bob" in hm_data["respondent_names"]
    assert "Charlie" in hm_data["respondent_names"]

    # 14:30 - 15:00 has all 3 available!
    best_slot = hm_data["best_slots"][0]
    assert best_slot["count"] == 3
    assert set(best_slot["available_participants"]) == {"Alice", "Bob", "Charlie"}


def test_heatmap_keeps_repeated_hour_at_fall_back(client, db_session):
    headers = register_user(client, phone="+19725550143", name="Host")

    create_resp = client.post("/api/events", json={
        "title": "Fall Back Heatmap",
        "timezone": "America/New_York",
        "candidate_dates": ["2026-11-01"],
        "daily_start_time": "01:00",
        "daily_end_time": "01:30",
        "slot_duration_minutes": 30
    }, headers=headers)
    assert create_resp.status_code == 200

    event_id = create_resp.json()["id"]
    heatmap_resp = client.get(f"/api/events/{event_id}/heatmap")
    assert heatmap_resp.status_code == 200

    starts = [
        datetime.fromisoformat(slot["start_time"].replace("Z", "+00:00"))
        for slot in heatmap_resp.json()["slots"]
    ]
    assert starts == [
        datetime(2026, 11, 1, 5, 0, tzinfo=timezone.utc),
        datetime(2026, 11, 1, 5, 30, tzinfo=timezone.utc),
        datetime(2026, 11, 1, 6, 0, tzinfo=timezone.utc),
    ]


def test_heatmap_slots_stay_inside_fall_back_local_window(client, db_session):
    headers = register_user(client, phone="+19725550144", name="Host")

    create_resp = client.post("/api/events", json={
        "title": "Fall Back Window Bound",
        "timezone": "America/New_York",
        "candidate_dates": ["2026-11-01"],
        "daily_start_time": "01:30",
        "daily_end_time": "02:30",
        "slot_duration_minutes": 30
    }, headers=headers)
    assert create_resp.status_code == 200

    event_id = create_resp.json()["id"]
    heatmap_resp = client.get(f"/api/events/{event_id}/heatmap")
    assert heatmap_resp.status_code == 200

    starts = [
        datetime.fromisoformat(slot["start_time"].replace("Z", "+00:00"))
        for slot in heatmap_resp.json()["slots"]
    ]
    assert starts == [
        datetime(2026, 11, 1, 5, 30, tzinfo=timezone.utc),
        datetime(2026, 11, 1, 6, 30, tzinfo=timezone.utc),
        datetime(2026, 11, 1, 7, 0, tzinfo=timezone.utc),
    ]
