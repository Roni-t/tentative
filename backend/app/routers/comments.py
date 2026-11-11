from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user_optional
from app.core.rate_limiter import rate_limit
from app.database import get_db
from app.models.user import User
from app.schemas.comment import CommentCreatePayload, CommentOut
from app.services.comment_service import comment_service

router = APIRouter(prefix="/api/events/{event_id}/comments", tags=["Event Discussion"])


@router.get("", response_model=List[CommentOut])
def get_comments(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve discussion thread and inquiries for an event."""
    return comment_service.get_comments(event_id=event_id, db=db)


@router.post(
    "",
    response_model=CommentOut,
    dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))]
)
def add_comment(
    event_id: int,
    payload: CommentCreatePayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Post an inquiry or public comment."""
    created = comment_service.add_comment(
        event_id=event_id,
        payload=payload,
        current_user=current_user,
        db=db
    )
    return CommentOut(
        id=created.id,
        event_id=created.event_id,
        author_name=created.author_name,
        is_question=created.is_question,
        content=created.content,
        parent_id=created.parent_id,
        created_at=created.created_at,
        replies=[]
    )
