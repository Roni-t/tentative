from fastapi import FastAPI
import app.database as db
from sqlalchemy import select
from pydantic import BaseModel

app = FastAPI()

@app.get("/api/health")
async def hp():
    return {"message": "hp: 1225/1225"}


class UserCreate(BaseModel):
    name: str
    login: str
    email_login: bool = False

class EventCreate(BaseModel):
    name: str
    manager: int
    description: str = "default description"
    location: str = "Online"

class TimespanAdd(BaseModel):
    eventid: int
    timestart: int
    timeend: int


@app.post("/api/user/new")
def newUser(user: UserCreate):
    with db.newSession() as session:
        foo = db.User(id = None, name = user.name, login = user.login, email_login = user.email_login)
        session.add_all([foo])
        session.commit()
    
    return user

@app.get("/api/user/id/{uid}")
def userID(uid: int):
    cell = select(db.User).where(db.User.id == uid)
    return db.newSelection(cell)

@app.get("/api/user/list")
def userList():
    cell = select(db.User)
    return db.newSelection(cell)



@app.post("/api/event/new")
def newEvent(event: EventCreate):
    foo = db.Event(manager_id = event.manager, name = event.name, description = event.description, location = event.location)
    with db.newSession() as session:
        session.add_all([foo])
        session.commit()
    
    return foo

@app.get("/api/event/id/{eid}")
def eventID(eid: int):
    cell = select(db.Event).where(db.Event.id == uid)
    return db.newSelection(cell)

@app.get("/api/event/list")
def eventList():
    cell = select(db.Event)
    return db.newSelection(cell)


@app.post("/api/event/tspan_add")
def addTimespan(ts: TimespanAdd):
    foo = db.Timespan(event = ts.eventid, start_time = ts.timestart, end_time = ts.timeend)
    with db.newSession() as session:
        session.add_all([foo])
        session.commit()
    
    return foo


@app.get("/api/test")
def test():
    newUser(UserCreate(name = "foo", login = "example@example.org"))
    newEvent(EventCreate(manager = 1, name = "silly event"))
    return eventList()
