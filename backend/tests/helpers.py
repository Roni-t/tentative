"""Helpers for tests that need a logged-in host, events, and invitees."""


def register_user(client, phone: str = "+19725550142", name: str = "Test Host") -> dict:
    """Run the full UC-1 account creation flow and return Authorization headers."""
    req = client.post("/api/auth/register/request-code", json={"phone": phone, "name": name})
    assert req.status_code == 200, req.text
    code = req.json()["dev_code"]
    verify = client.post("/api/auth/register/verify", json={"phone": phone, "name": name, "code": code})
    assert verify.status_code == 201, verify.text
    return {"Authorization": f"Bearer {verify.json()['token']}"}


def login_user(client, phone: str, keep_signed_in: bool = True) -> dict:
    """Run the full UC-2 login flow and return the verify response JSON."""
    req = client.post("/api/auth/login/request-code", json={"phone": phone})
    assert req.status_code == 200, req.text
    code = req.json()["dev_code"]
    verify = client.post(
        "/api/auth/login/verify",
        json={"phone": phone, "code": code, "keep_signed_in": keep_signed_in},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()


def create_event(client, headers: dict, **overrides) -> dict:
    """Create an event as the host and return its JSON."""
    payload = {
        "title": "Team Dinner",
        "location": "ECSS 2.410",
        "timezone": "America/Chicago",
        "candidate_dates": ["2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"],
        "daily_start_time": "17:00",
        "daily_end_time": "22:00",
        "slot_duration_minutes": 60,
    }
    payload.update(overrides)
    res = client.post("/api/events", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def add_invitee(client, headers: dict, event_id: int, name: str, phone: str = None, timezone: str = None) -> dict:
    """Add an invitee by name. If a phone is given, the invitee also verifies it through their link."""
    res = client.post(f"/api/events/{event_id}/invitees", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    invitee = res.json()
    if phone:
        token = invitee["response_token"]
        req = client.post(f"/api/invite/{token}/phone/request-code", json={"phone": phone})
        assert req.status_code == 200, req.text
        body = {"phone": phone, "code": req.json()["dev_code"]}
        if timezone:
            body["timezone"] = timezone
        verify = client.post(f"/api/invite/{token}/phone/verify", json=body)
        assert verify.status_code == 200, verify.text
        invitee = next(i for i in client.get(f"/api/events/{event_id}/invitees", headers=headers).json()
                       if i["id"] == invitee["id"])
    return invitee


def submit_availability(client, event_id: int, name: str, slots: list, token: str = None) -> dict:
    """Submit availability as an invitee (token = their personal response token)."""
    body = {"participant_name": name, "slots": slots}
    if token:
        body["edit_token"] = token
    res = client.post(f"/api/events/{event_id}/availability", json=body)
    assert res.status_code == 200, res.text
    return res.json()
