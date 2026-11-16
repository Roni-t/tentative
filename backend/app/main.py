import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.adapters.scheduler import start_scheduler_task
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import (
    admin_router,
    auth_router,
    availability_router,
    bug_reports_router,
    comments_router,
    events_router,
    invitees_router,
    rsvp_router,
    share_router,
)
from app.seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tentative")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed data if enabled
    if settings.SEED_ON_STARTUP:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()

    # Launch background scheduler task
    scheduler_task = asyncio.create_task(start_scheduler_task())
    logger.info("Tentative backend initialized and celestial orbits aligned.")

    yield

    # Shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    logger.info("Tentative backend shutting down.")


app = FastAPI(
    title="Tentative API",
    description="Deep space group scheduling engine - finding time anywhere in the galaxy.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(share_router)
app.include_router(availability_router)
app.include_router(rsvp_router)
app.include_router(comments_router)
app.include_router(admin_router)
app.include_router(bug_reports_router)
app.include_router(invitees_router)


@app.get("/api/health")
def healthcheck():
    return {"status": "ok", "app": "Tentative", "version": "1.0.0"}
