"""UC-14 View Availability Heatmap — tests (author: Divyam).

The existing test_heatmap.py covers the main flow (best slot + speed).
These tests cover the empty, error, and caching conditions.
Test IDs match the test case tables in the SE Document.
"""

EVENT = {
    "title": "Study Group",
    "candidate_dates": ["2026-11-25"],
    "daily_start_time": "14:00",
    "daily_end_time": "16:00",
    "slot_duration_minutes": 30,
}


def login(client, phone, name):
    """Log in through the passwordless SMS flow and return auth headers."""
    client.post("/api/auth/request-code", json={"phone": phone, "name": name})
    code = client.get("/api/auth/dev-banner-code", params={"phone": phone}).json()["code"]
    token = client.post("/api/auth/verify-code", json={"phone": phone, "code": code}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def submit(client, event_id, name, start, end):
    """Submit availability as an anonymous participant (no account)."""
    client.cookies.clear()
    return client.post(
        f"/api/events/{event_id}/availability",
        json={"participant_name": name, "slots": [{"start_time": start, "end_time": end}]},
    )


def test_tc14_02_no_responses_shows_empty_grid(client, db_session):
    """TC-14-02 (alternate flow): no one has responded -> grid exists, all counts 0, no best slots."""
    host = login(client, "+19725550211", "Host")
    event_id = client.post("/api/events", json=EVENT, headers=host).json()["id"]

    res = client.get(f"/api/events/{event_id}/heatmap")

    assert res.status_code == 200
    data = res.json()
    assert data["total_respondents"] == 0
    assert len(data["slots"]) == 4  # 14:00-16:00 in 30-minute slots
    assert all(s["count"] == 0 for s in data["slots"])
    assert data["best_slots"] == []


def test_tc14_03_nonexistent_event_returns_404(client, db_session):
    """TC-14-03 (exception): heatmap for an event that does not exist -> 404."""
    res = client.get("/api/events/99999/heatmap")

    assert res.status_code == 404
    assert res.json()["detail"] == "Event not found"


def test_tc14_04_new_response_updates_heatmap(client, db_session):
    """TC-14-04: a new submission refreshes the cached heatmap immediately."""
    host = login(client, "+19725550231", "Host")
    event_id = client.post("/api/events", json=EVENT, headers=host).json()["id"]
    submit(client, event_id, "Alice", "2026-11-25T14:00:00Z", "2026-11-25T14:30:00Z")
    assert client.get(f"/api/events/{event_id}/heatmap").json()["total_respondents"] == 1

    submit(client, event_id, "Bob", "2026-11-25T14:00:00Z", "2026-11-25T14:30:00Z")
    data = client.get(f"/api/events/{event_id}/heatmap").json()

    assert data["total_respondents"] == 2
    assert data["best_slots"][0]["count"] == 2


def test_tc14_05_deleted_event_not_served_from_cache(client, db_session):
    """TC-14-05 (regression): after deletion, the heatmap is 404 and a new event
    that reuses the same ID does not show the old event's participants."""
    host = login(client, "+19725550241", "Host")
    old_id = client.post("/api/events", json=EVENT, headers=host).json()["id"]
    submit(client, old_id, "Alice", "2026-11-25T14:00:00Z", "2026-11-25T14:30:00Z")
    client.get(f"/api/events/{old_id}/heatmap")  # caches the heatmap

    client.delete(f"/api/events/{old_id}", headers=host)
    assert client.get(f"/api/events/{old_id}/heatmap").status_code == 404

    new_id = client.post("/api/events", json=EVENT, headers=host).json()["id"]
    data = client.get(f"/api/events/{new_id}/heatmap").json()
    assert data["total_respondents"] == 0
    assert "Alice" not in data["respondent_names"]
