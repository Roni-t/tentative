import asyncio
import inspect
from contextlib import asynccontextmanager

import httpx
import pytest
import fastapi.dependencies.utils
import fastapi.routing
import starlette.concurrency
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.rate_limiter import rate_limiter
from app.database import Base, get_db
from app.main import app


async def _run_sync_inline(func, *args, **kwargs):
    """Keep sync endpoint calls on the ASGI loop when AnyIO's worker pool is broken."""
    result = func(*args, **kwargs)
    if inspect.isawaitable(result):
        return await result
    return result


# The provided environment's AnyIO worker portal/thread pool never wakes queued
# work. Tests use SQLite and do not need parallel endpoint execution.
starlette.concurrency.run_in_threadpool = _run_sync_inline
fastapi.routing.run_in_threadpool = _run_sync_inline
fastapi.dependencies.utils.run_in_threadpool = _run_sync_inline


@asynccontextmanager
async def _contextmanager_inline(cm):
    with cm as value:
        yield value


fastapi.dependencies.utils.contextmanager_in_threadpool = _contextmanager_inline


class SyncASGIClient:
    """Small synchronous test client that avoids AnyIO's broken blocking portal.

    HTTPX's ASGI transport does not run lifespan hooks; each test already creates
    and drops the shared test schema through ``db_session``. Skipping production
    startup also prevents scheduler jobs from touching a separate database.
    """

    def __init__(self, application):
        self.application = application
        self.cookies = httpx.Cookies()

    def request(self, method, url, **kwargs):
        async def send():
            transport = httpx.ASGITransport(app=self.application)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
                cookies=self.cookies,
            ) as client:
                response = await client.request(method, url, **kwargs)
                self.cookies.update(client.cookies)
                return response

        return asyncio.run(send())

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def put(self, url, **kwargs):
        return self.request("PUT", url, **kwargs)

    def patch(self, url, **kwargs):
        return self.request("PATCH", url, **kwargs)

    def delete(self, url, **kwargs):
        return self.request("DELETE", url, **kwargs)

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
    yield SyncASGIClient(app)
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
