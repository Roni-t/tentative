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
            {"start_time": "2026-11-25T14:00:00Z", "end_time": "2026-11-25T14:30:00Z"},
            {"start_time": "2026-11-25T14:30:00Z", "end_time": "2026-11-25T15:00:00Z"}
        ]
    })

    # Invitee 2 submits: 14:30 - 15:30
    client.cookies.clear()
    client.post(f"/api/events/{event_id}/availability", json={
        "participant_name": "Bob",
        "slots": [
            {"start_time": "2026-11-25T14:30:00Z", "end_time": "2026-11-25T15:00:00Z"},
            {"start_time": "2026-11-25T15:00:00Z", "end_time": "2026-11-25T15:30:00Z"}
        ]
    })

    # Invitee 3 submits: 14:30 - 15:00
    client.cookies.clear()
    client.post(f"/api/events/{event_id}/availability", json={
        "participant_name": "Charlie",
        "slots": [
            {"start_time": "2026-11-25T14:30:00Z", "end_time": "2026-11-25T15:00:00Z"}
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
