import os
from typing import List
from typing import Optional
from sqlalchemy import String
from sqlalchemy import select
from sqlalchemy import create_engine
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Session
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship


dbloc = "sqlite:///" #os.getenv("DATABASE_URL", "sqlite:///")
globengine = None

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "user_acc"

    id: Mapped[int] = mapped_column(primary_key = True)
    name: Mapped[str] = mapped_column(String(50))
    login: Mapped[Optional[str]]
    email_login: Mapped[bool] = mapped_column(default = False)
    
    manages: Mapped[List["Event"]] = relationship()

#This needs a few more fields. Check my test_create_event_validation.py in my branch for what I used. -Trinity
class Event(Base):
    __tablename__ = "events"
    
    eventid: Mapped[int] = mapped_column(primary_key = True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("user_acc.id"))
    name: Mapped[str] = mapped_column(String(50))
    description: Mapped[str]
    location: Mapped[str]

#I don't know if I'm doing this right but these were the databases I needed, so please check over -Trinity
#List of users who cannot see x event
class DisbarredEvent(Base):
    __tablename__ = "disbarred_from_event"

    eId: Mapped[int] = mapped_column(primary_key = True)
    uID: Mapped[int] = mapped_column(ForeignKey("user_acc.id"))

#Block list
#wait is this part of the reqs -reese
class BlockedUsers(Base):
    __tablename__ = "users_blocked"

    blockerID: Mapped[int] = mapped_column(primary_key = True)
    blockedID: Mapped[int] = mapped_column(ForeignKey("user_acc.id"))

def newSession():
    global globengine
    
    if globengine == None:
        globengine = create_engine(dbloc, echo = True)
        Base.metadata.create_all(globengine)
    
    return Session(globengine)


def newSelection(cel: select):
    return [x for x in newSession().scalars(cel)]
