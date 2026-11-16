from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.security import generate_secure_token

router = APIRouter(prefix="/api/share", tags=["Shareable Links"])

# Mock database store for demonstration (replace with SQLAlchemy session query)
_EVENT_STORE = {
    "evt_12345": {
        "id": "evt_12345",
        "title": "Project Milestone Review",
        "active_token": "initial_secure_token_abc"
    }
}
_TOKEN_STORE = {"initial_secure_token_abc": "evt_12345"}


class TokenRotationRequest(BaseModel):
    event_id: str
    requester_role: str


@router.post("/rotate")
def rotate_share_link(payload: TokenRotationRequest):
    # 1. Authorize role (Host or Admin only)
    if payload.requester_role not in ("HOST", "ADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized: Only Host or Admin can rotate shareable tokens.")
    
    event = _EVENT_STORE.get(payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    old_token = event["active_token"]
    
    # 2. Generate new cryptographic token using core security utility
    new_token = generate_secure_token(nbytes=24)
    
    # 3. Invalidate old token mapping and bind new token
    if old_token in _TOKEN_STORE:
        del _TOKEN_STORE[old_token]
    
    _TOKEN_STORE[new_token] = payload.event_id
    event["active_token"] = new_token

    return {
        "event_id": payload.event_id,
        "old_token_invalidated": old_token,
        "new_active_token": new_token,
        "share_url": f"/api/share/events/{new_token}"
    }


@router.get("/events/{token}")
def access_shared_event(token: str):
    event_id = _TOKEN_STORE.get(token)
    if not event_id:
        raise HTTPException(status_code=404, detail="Invalid or expired cryptographic link.")
    
    return {"status": "success", "event": _EVENT_STORE.get(event_id)}
