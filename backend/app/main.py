from fastapi import FastAPI
import app.database as db
from sqlalchemy import select
from pydantic import BaseModel

app = FastAPI()

@app.get("/api/health")
async def hp():
    return {"message": "hp: 1225/1225"}


class UserCreate(BaseModel):
    id: int = 0
    name: str
    login: str
    email_login: bool = False

@app.post("/api/user/new")
def newUser(user: UserCreate):
    with db.newSession() as session:
        foo = db.User(id = user.id, name = user.name, login = user.login, email_login = user.email_login)
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



@app.get("/api/event/new")
def newEvent():
    foo = db.Event(manager_id = 1, name = "silly meeting", description = "the silly", location = "Online")
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


@app.get("/api/test")
def test():
    t = UserCreate(name = "foo", login = "example@example.org")
    newUser(t)
    newEvent()
    return eventList()
