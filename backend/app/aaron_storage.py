import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.aaron_models import AaronBase


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tentative_aaron.db")
_engine_options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **_engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    AaronBase.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
