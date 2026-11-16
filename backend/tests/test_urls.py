from tests.helpers import register_user
from datetime import datetime, timedelta, timezone
from app.models.shareable_url import ShareableURL


def test_create_and_rotate_url(client, db_session):
    # Log in host
    phone = "+19725550142"
    headers = register_user(client, phone=phone, name="Host Kaelan")

    # Create event
    event_payload = {
        "title": "Cosmic Synch",
        "candidate_dates": ["2026-11-20"],
        "daily_start_time": "10:00",
        "daily_end_time": "14:00",
        "slot_duration_minutes": 30,
        "expiry_option": "semester"
    }
    resp = client.post("/api/events", json=event_payload, headers=headers)
    assert resp.status_code == 200
    ev = resp.json()
    first_token = ev["active_token"]
    assert first_token is not None

    # Test resolving URL
    share_res = client.get(f"/api/share/{first_token}")
    assert share_res.status_code == 200
    assert share_res.json()["id"] == ev["id"]

    # Rotate URL
    rotate_res = client.post(f"/api/events/{ev['id']}/share/rotate", headers=headers)
    assert rotate_res.status_code == 200
    new_token = rotate_res.json()["token"]
    assert new_token != first_token

    # Old token must now fail with 410 Gone
    old_res = client.get(f"/api/share/{first_token}")
    assert old_res.status_code == 410

    # New token resolves cleanly
    new_res = client.get(f"/api/share/{new_token}")
    assert new_res.status_code == 200


def test_expired_url_returns_410(client, db_session):
    # Create event
    phone = "+19725550142"
    headers = register_user(client, phone=phone, name="Test Host")

    resp = client.post("/api/events", json={
        "title": "Expiring Star",
        "candidate_dates": ["2026-11-20"],
        "expiry_option": "1_week"
    }, headers=headers)
    token = resp.json()["active_token"]

    # Manually expire URL in database
    u = db_session.query(ShareableURL).filter(ShareableURL.token == token).first()
    u.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()

    # Accessing expired link
    res = client.get(f"/api/share/{token}")
    assert res.status_code == 410
    assert "orbit has ended" in res.json()["detail"].lower()
