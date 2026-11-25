"""UC-1 (Account Creation) and UC-2 (Login) tests."""
from datetime import datetime, timedelta, timezone

from app.core.encryption import decrypt_phone, hash_phone
from app.core.security import ensure_utc
from app.models.auth import Session as DbSession, VerificationCode
from app.models.user import User
from tests.helpers import login_user, register_user

PHONE = "+19725550142"
NAME = "Kaelan Nguyen"


def _code_row(db_session, phone=PHONE):
    return db_session.query(VerificationCode).filter(VerificationCode.phone_hash == hash_phone(phone)).first()


# ---------------------------------------------------------------- UC-1

def test_register_happy_path_stores_encrypted_phone(client, db_session):
    req = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME})
    assert req.status_code == 200
    body = req.json()
    assert body["phone_masked"].endswith("42") and "555" not in body["phone_masked"]
    assert len(body["dev_code"]) == 6

    # Account is not created until the code is verified
    assert db_session.query(User).count() == 0

    verify = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": body["dev_code"]})
    assert verify.status_code == 201
    data = verify.json()
    assert data["user"]["name"] == NAME
    assert data["user"]["is_admin"] is False

    user = db_session.query(User).one()
    assert PHONE not in user.phone_number_encrypted
    assert decrypt_phone(user.phone_number_encrypted) == PHONE

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200
    assert me.json()["name"] == NAME


def test_register_accepts_formatted_us_number(client, db_session):
    register_user(client, phone="(972) 555-0142", name=NAME)
    user = db_session.query(User).one()
    assert decrypt_phone(user.phone_number_encrypted) == PHONE


def test_register_rejects_invalid_name(client, db_session):
    for bad in ["", "   ", "1234", "<script>", "a" * 129]:
        res = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": bad})
        assert res.status_code == 400, bad
        assert "name" in res.json()["detail"].lower()
    assert _code_row(db_session) is None


def test_register_rejects_invalid_phone(client, db_session):
    for bad in ["", "12345", "555-0142", "+1 972 555 01420", "abcdefghij", "+0123456789"]:
        res = client.post("/api/auth/register/request-code", json={"phone": bad, "name": NAME})
        assert res.status_code == 400, bad
        assert "phone" in res.json()["detail"].lower()


def test_register_rejects_already_registered_phone(client, db_session):
    register_user(client, phone=PHONE, name=NAME)
    db_session.query(VerificationCode).delete()
    db_session.commit()

    res = client.post("/api/auth/register/request-code", json={"phone": "972-555-0142", "name": "Someone Else"})
    assert res.status_code == 409
    assert "already has an account" in res.json()["detail"]
    assert _code_row(db_session) is None  # no SMS sent
    assert db_session.query(User).count() == 1


def test_register_verify_rejects_if_registered_meanwhile(client, db_session):
    first = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME}).json()["dev_code"]
    # A second tab completes registration with a fresh code first
    second = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME}).json()["dev_code"]
    assert client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": second}).status_code == 201

    # Requesting again for the now-registered phone fails, and the stale code is gone
    res = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": first})
    assert res.status_code in (400, 409)
    assert db_session.query(User).count() == 1


def test_register_wrong_code_then_lockout(client, db_session):
    client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME})
    real = _code_row(db_session).code
    wrong = "000000" if real != "000000" else "111111"

    for remaining in (2, 1, 0):
        res = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": wrong})
        assert res.status_code == 400
        assert f"{remaining} attempt" in res.json()["detail"]

    # Even the correct code is now refused; a new code is required
    res = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": real})
    assert res.status_code == 429
    assert db_session.query(User).count() == 0


def test_register_expired_code(client, db_session):
    client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME})
    row = _code_row(db_session)
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    res = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": row.code})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()
    assert db_session.query(User).count() == 0


def test_verify_without_requesting_code(client, db_session):
    res = client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": "123456"})
    assert res.status_code == 400
    assert "request a new code" in res.json()["detail"].lower()


def test_new_code_replaces_old_code(client, db_session):
    old = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME}).json()["dev_code"]
    new = client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME}).json()["dev_code"]
    assert db_session.query(VerificationCode).count() == 1
    if old != new:
        assert client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": old}).status_code == 400
    assert client.post("/api/auth/register/verify", json={"phone": PHONE, "name": NAME, "code": new}).status_code == 201


# ---------------------------------------------------------------- UC-2

def test_login_unknown_phone_prompts_registration(client, db_session):
    res = client.post("/api/auth/login/request-code", json={"phone": "+14695550199"})
    assert res.status_code == 404
    assert "create an account" in res.json()["detail"].lower()
    assert db_session.query(VerificationCode).count() == 0  # no SMS sent


def test_login_happy_path(client, db_session):
    register_user(client, phone=PHONE, name=NAME)
    data = login_user(client, phone="(972) 555-0142")
    assert data["user"]["name"] == NAME
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200


def test_login_does_not_create_accounts(client, db_session):
    # A code obtained for an unregistered phone can never be turned into a login
    client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME})
    code = _code_row(db_session).code
    res = client.post("/api/auth/login/verify", json={"phone": PHONE, "code": code})
    assert res.status_code == 404
    assert db_session.query(User).count() == 0


def test_login_wrong_code_then_request_new_code(client, db_session):
    register_user(client, phone=PHONE, name=NAME)
    client.post("/api/auth/login/request-code", json={"phone": PHONE})
    real = _code_row(db_session).code
    wrong = "000000" if real != "000000" else "111111"
    res = client.post("/api/auth/login/verify", json={"phone": PHONE, "code": wrong})
    assert res.status_code == 400
    assert "token" not in res.json()

    login_user(client, phone=PHONE)  # requesting a new code recovers


def test_login_rejects_malformed_code(client, db_session):
    register_user(client, phone=PHONE, name=NAME)
    client.post("/api/auth/login/request-code", json={"phone": PHONE})
    res = client.post("/api/auth/login/verify", json={"phone": PHONE, "code": "12ab"})
    assert res.status_code == 400
    assert "6-digit" in res.json()["detail"]


def test_keep_signed_in_controls_session_length(client, db_session):
    register_user(client, phone=PHONE, name=NAME)
    db_session.query(DbSession).delete()
    db_session.commit()

    login_user(client, phone=PHONE, keep_signed_in=False)
    short = ensure_utc(db_session.query(DbSession).one().expires_at)
    assert short - datetime.now(timezone.utc) < timedelta(hours=13)

    db_session.query(DbSession).delete()
    db_session.commit()
    login_user(client, phone=PHONE, keep_signed_in=True)
    long = ensure_utc(db_session.query(DbSession).one().expires_at)
    assert long - datetime.now(timezone.utc) > timedelta(days=6)


def test_logout_revokes_session(client, db_session):
    headers = register_user(client, phone=PHONE, name=NAME)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_expired_session_rejected(client, db_session):
    headers = register_user(client, phone=PHONE, name=NAME)
    sess = db_session.query(DbSession).one()
    sess.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_garbage_token_rejected(client, db_session):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_dev_banner_requires_phone(client, db_session):
    client.post("/api/auth/register/request-code", json={"phone": PHONE, "name": NAME})
    assert client.get("/api/auth/dev-banner-code").status_code == 422
    other = client.get("/api/auth/dev-banner-code", params={"phone": "+14695550199"})
    assert other.status_code == 200 and other.json() is None
    mine = client.get("/api/auth/dev-banner-code", params={"phone": "(972) 555-0142"})
    assert mine.json()["code"] == _code_row(db_session).code
