from fastapi import FastAPI
import app.database as db
from app.routers.aaron_router import router as aaron_router
from sqlalchemy import select

app = FastAPI()
app.include_router(aaron_router)

@app.get("/api/health")
async def hp():
    return {"message": "hp: 1225/1225"}



@app.get("/api/user/new")
def newUser():
    with db.newSession() as session:
        foo = db.User(id = None, name = "foo bar", login = "example@example.com", email_login = True)
        session.add_all([foo])
        session.commit()

@app.get("/api/user/id/{uid}")
def userID(uid: int):
    pass

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
