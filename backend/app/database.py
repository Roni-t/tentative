import os
from typing import Optional
from sqlalchemy import String
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column


dbloc = os.getenv("DATABASE_URL", "sqlite:///")
globengine = None

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "user_acc"

    id: Mapped[int] = mapped_column(primary_key = True)
    name: Mapped[str] = mapped_column(String(50))
    login: Mapped[Optional[str]]
    email_login: Mapped[bool] = mapped_column(default = False)


def newSession():
    if globengine == None:
        engine = create_engine(dbloc, echo = True)
        Base.metadata.create_all(engine)
    
    return Session(engine)
