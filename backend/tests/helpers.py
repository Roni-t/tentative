"""Shared helpers for tests that need an authenticated host."""


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
