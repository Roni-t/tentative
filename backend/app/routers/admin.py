from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.admin import AdminEventOut, AdminUserOut, PowerTogglePayload, SystemStatusOut
from app.services.admin_service import admin_service

router = APIRouter(prefix="/api/admin", tags=["Admin Console"])


@router.get("/status", response_model=SystemStatusOut)
def get_system_status(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieve system diagnostics, user counts, and server status."""
    return admin_service.get_system_status(db)


@router.post("/power")
def toggle_power(
    payload: PowerTogglePayload,
    admin: User = Depends(require_admin)
):
    """Toggle maintenance mode on/off."""
    status_str = admin_service.set_system_power(payload.power_on)
    return {"status": status_str, "message": f"System status changed to {status_str}."}


@router.get("/users", response_model=List[AdminUserOut])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all accounts for system administration."""
    return admin_service.list_users(db)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove user account."""
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete current admin account.")
    deleted = admin_service.delete_user(user_id, db)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"message": "User deleted successfully."}


@router.get("/events", response_model=List[AdminEventOut])
def list_events(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all system events."""
    return admin_service.list_events(db)


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove event from the system."""
    deleted = admin_service.delete_event(event_id, db)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return {"message": "Event deleted successfully."}
