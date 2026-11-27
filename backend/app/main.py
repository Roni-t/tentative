import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.adapters.scheduler import start_scheduler_task
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.database_migrations import upgrade_legacy_schema
from app.routers import (
    admin_router,
    aaron_router,
    auth_router,
    availability_router,
    bug_reports_router,
    comments_router,
    events_router,
    groups_router,
    invitees_router,
    rsvp_router,
    share_router,
)
from app.seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tentative")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.require_sms_settings()
    logger.info("Creating database tables")
    Base.metadata.create_all(bind=engine)
    upgrade_legacy_schema(engine)

    if settings.SEED_ON_STARTUP:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()

    # Background job for cleanup and reminders
    scheduler_task = asyncio.create_task(start_scheduler_task())
    logger.info("Tentative backend started.")

    yield

    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    logger.info("Tentative backend shutting down.")


app = FastAPI(
    title="Tentative API",
    description="Group scheduling: collect availability and pick the best time.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(share_router)
app.include_router(availability_router)
app.include_router(rsvp_router)
app.include_router(comments_router)
app.include_router(admin_router)
app.include_router(bug_reports_router)
app.include_router(invitees_router)
app.include_router(groups_router)
app.include_router(aaron_router)


@app.get("/api/health")
def healthcheck():
    return {"status": "ok", "app": "Tentative", "version": "1.0.0"}
