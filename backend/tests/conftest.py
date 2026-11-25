import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.rate_limiter import rate_limiter
from app.database import Base, get_db
from app.main import app

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Each test starts with a clean rate-limit counter; otherwise login limits
    # (10/min per IP) accumulate across tests and later tests get 429s.
    rate_limiter._requests.clear()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    """Rate-limiter windows and the dev SMS cache are module-global; isolate tests."""
    from app.adapters.sms_adapter import dev_sms_cache
    from app.core.rate_limiter import rate_limiter
    rate_limiter._requests.clear()
    dev_sms_cache.clear()
    yield


@pytest.fixture
def sms_outbox(monkeypatch):
    """Capture every SMS the app sends as {"kind", "phone", "message"} dicts, in send order."""
    from app.adapters import sms_adapter

    sent = []
    real_send_code = sms_adapter.ConsoleSMSAdapter.send_verification_code

    def capture_code(self, phone, code):
        sent.append({"kind": "verification", "phone": phone, "message": code})
        return real_send_code(self, phone, code)

    def capture_notification(self, phone, message):
        sent.append({"kind": "notification", "phone": phone, "message": message})
        return True

    monkeypatch.setattr(sms_adapter.ConsoleSMSAdapter, "send_verification_code", capture_code)
    monkeypatch.setattr(sms_adapter.ConsoleSMSAdapter, "send_notification", capture_notification)
    return sent
