from datetime import datetime, timedelta, timezone
from app.models.auth import VerificationCode
from app.core.encryption import hash_phone, normalize_phone


def test_request_and_verify_code(client, db_session):
    phone = "+19725550142"
    name = "Kaelan Nguyen"

    # 1. Request code
    req_resp = client.post("/api/auth/request-code", json={"phone": phone, "name": name})
    assert req_resp.status_code == 200
    data = req_resp.json()
    assert "phone_masked" in data
    code = data.get("dev_code")
    assert code is not None and len(code) == 6

    # 2. Verify code
    verify_resp = client.post("/api/auth/verify-code", json={"phone": phone, "code": code, "name": name})
    assert verify_resp.status_code == 200
    auth_data = verify_resp.json()
    assert "token" in auth_data
    assert auth_data["user"]["name"] == name
    assert auth_data["user"]["is_admin"] is False


def test_verification_code_max_attempts(client, db_session):
    phone = "+19725559999"
    req_resp = client.post("/api/auth/request-code", json={"phone": phone})
    assert req_resp.status_code == 200

    # Submit wrong code 3 times
    for i in range(3):
        res = client.post("/api/auth/verify-code", json={"phone": phone, "code": "000000"})
        if i < 2:
            assert res.status_code == 400
        else:
            # 3rd failure or 4th is locked out
            assert res.status_code in [400, 429]


def test_verification_code_expiry(client, db_session):
    phone = "+19725558888"
    client.post("/api/auth/request-code", json={"phone": phone})
    
    # Manually expire the code in DB
    p_hash = hash_phone(normalize_phone(phone))
    c = db_session.query(VerificationCode).filter(VerificationCode.phone_hash == p_hash).first()
    assert c is not None
    c.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    res = client.post("/api/auth/verify-code", json={"phone": phone, "code": c.code})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()
