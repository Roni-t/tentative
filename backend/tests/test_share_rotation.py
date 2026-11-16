from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers.share_router import router as share_router

test_app = FastAPI()
test_app.include_router(share_router)
client = TestClient(test_app)


def test_token_rotation_success_and_invalidation():
    # 1. Verify initial token works
    resp_initial = client.get("/api/share/events/initial_secure_token_abc")
    assert resp_initial.status_code == 200

    # 2. Rotate token as Host
    resp_rotate = client.post("/api/share/rotate", json={
        "event_id": "evt_12345",
        "requester_role": "HOST"
    })
    assert resp_rotate.status_code == 200
    new_token = resp_rotate.json()["new_active_token"]

    # 3. Verify old token now returns 404 Not Found
    resp_old = client.get("/api/share/events/initial_secure_token_abc")
    assert resp_old.status_code == 404

    # 4. Verify new token successfully resolves the event
    resp_new = client.get(f"/api/share/events/{new_token}")
    assert resp_new.status_code == 200
    assert resp_new.json()["event"]["id"] == "evt_12345"


def test_token_rotation_unauthorized_role():
    resp = client.post("/api/share/rotate", json={
        "event_id": "evt_12345",
        "requester_role": "INVITEE"
    })
    assert resp.status_code == 403
