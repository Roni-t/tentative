import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.aaron_models import AaronBase


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tentative_aaron.db")
_engine_options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **_engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    AaronBase.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("aaron_events")}
    if "source_event_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE aaron_events ADD COLUMN source_event_id INTEGER"))
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_aaron_events_source_event_id "
                "ON aaron_events (source_event_id)"
            ))
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
