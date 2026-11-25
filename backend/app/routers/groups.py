"""FR-24 Shareable URLs for groups of events (owner: Daniel; implemented by Divyam).

A host bundles several of their events into a group and gets one link for all of them.
Group links follow the same rules as event links (FR-25): random token, creator-only
rotation, and 410 once expired.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import generate_secure_token
from app.database import get_db
from app.models.event import Event, Group
from app.models.shareable_url import ShareableURL
from app.models.user import User
from app.services.event_service import event_service
from app.services.share_link_service import share_link_service

router = APIRouter(tags=["Groups"])


class GroupCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    event_ids: List[int] = Field(..., min_length=1)


class GroupEventOut(BaseModel):
    id: int
    title: str
    status: str
    location: Optional[str] = None
    candidate_dates: List[str] = []
    finalized_start_time: Optional[datetime] = None
    share_token: Optional[str] = None


class GroupOut(BaseModel):
    id: int
    name: str
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    events: List[GroupEventOut]


def _active_token(db: Session, *, event_id: Optional[int] = None, group_id: Optional[int] = None) -> Optional[str]:
    q = db.query(ShareableURL).filter(ShareableURL.is_active == True)  # noqa: E712
    q = q.filter(ShareableURL.event_id == event_id) if event_id else q.filter(ShareableURL.group_id == group_id)
    record = q.order_by(ShareableURL.created_at.desc()).first()
    return record.token if record else None


def _group_out(group: Group, db: Session) -> GroupOut:
    token = _active_token(db, group_id=group.id)
    events = sorted(group.events, key=lambda e: e.id)
    return GroupOut(
        id=group.id,
        name=group.name,
        share_token=token,
        share_url=f"/groups/{token}" if token else None,
        events=[
            GroupEventOut(
                id=e.id, title=e.title, status=e.status, location=e.location,
                candidate_dates=e.candidate_dates or [], finalized_start_time=e.finalized_start_time,
                share_token=_active_token(db, event_id=e.id),
            )
            for e in events if e.status != "canceled"
        ],
    )


def _new_group_link(group_id: int, db: Session) -> ShareableURL:
    link = ShareableURL(
        token=generate_secure_token(16),
        group_id=group_id,
        expires_at=share_link_service.compute_expiry("semester"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(link)
    return link


@router.post("/api/groups", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreatePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Bundle events you host or co-host into one shareable group link."""
    events = db.query(Event).filter(Event.id.in_(payload.event_ids)).all()
    if len(events) != len(set(payload.event_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more events were not found.")
    if any(not event_service.is_host_or_cohost(e, current_user, db) for e in events):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only group events you host or co-host.")

    group = Group(name=payload.name.strip(), created_by_id=current_user.id)
    db.add(group)
    db.flush()
    for e in events:
        e.group_id = group.id
    _new_group_link(group.id, db)
    db.commit()
    db.refresh(group)
    return _group_out(group, db)


@router.get("/api/groups", response_model=List[GroupOut])
def list_my_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    groups = db.query(Group).filter(Group.created_by_id == current_user.id).order_by(Group.id.desc()).all()
    return [_group_out(g, db) for g in groups]


@router.post("/api/groups/{group_id}/share/rotate", response_model=GroupOut)
def rotate_group_link(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """FR-25 for groups: replace the group link; the old one stops working right away. Creator only."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    if group.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group creator can rotate the shareable URL.")
    for link in db.query(ShareableURL).filter(ShareableURL.group_id == group.id, ShareableURL.is_active == True).all():  # noqa: E712
        link.is_active = False
    _new_group_link(group.id, db)
    db.commit()
    return _group_out(group, db)


@router.get("/api/share/group/{token}", response_model=GroupOut)
def open_group_link(token: str, db: Session = Depends(get_db)):
    """Public: open a group link (no account needed). 404 if unknown, 410 if expired or rotated."""
    record = share_link_service.resolve_token(token, db)
    if not record.group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This link is not a group link.")
    group = db.query(Group).filter(Group.id == record.group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    return _group_out(group, db)
