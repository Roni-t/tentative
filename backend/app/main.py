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
    return [x for x in db.newSession().scalars(cell)]

@app.get("/api/user/list")
def userList():
    cell = select(db.User)
    return [x for x in db.newSession().scalars(cell)]



@app.post("/api/event/new")
def newEvent():
    pass

@app.get("/api/event/id/{eid}")
def eventID(eid: int):
    pass
