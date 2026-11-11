from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.comment import Comment
from app.models.event import Event
from app.models.user import User
from app.schemas.comment import CommentCreatePayload, CommentOut, CommentReplyOut
from app.services.event_service import event_service
from app.services.notification_service import notification_service


class CommentService:
    def add_comment(
        self,
        event_id: int,
        payload: CommentCreatePayload,
        current_user: Optional[User],
        db: Session
    ) -> Comment:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        if event_service.is_user_blocked(event_id, payload.author_name, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are blocked from this event.")

        comment = Comment(
            event_id=event_id,
            user_id=current_user.id if current_user else None,
            author_name=payload.author_name.strip(),
            is_question=payload.is_question,
            content=payload.content.strip(),
            parent_id=payload.parent_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)

        # Notify host if it is a new question/comment from invitee
        is_creator = current_user and current_user.id == event.created_by_id
        if not is_creator:
            kind = "question" if payload.is_question else "comment"
            notification_service.notify_host(
                event=event,
                message=f"New {kind} from {comment.author_name}: '{comment.content[:60]}...'",
                notification_type=f"new_{kind}",
                db=db
            )

        return comment

    def get_comments(self, event_id: int, db: Session) -> List[CommentOut]:
        root_comments = db.query(Comment).filter(
            Comment.event_id == event_id,
            Comment.parent_id == None
        ).order_by(Comment.created_at.asc()).all()

        event = db.query(Event).filter(Event.id == event_id).first()
        host_user_id = event.created_by_id if event else None

        result = []
        for r in root_comments:
            # Fetch replies
            replies = db.query(Comment).filter(
                Comment.parent_id == r.id
            ).order_by(Comment.created_at.asc()).all()

            reply_outs = [
                CommentReplyOut(
                    id=rep.id,
                    author_name=rep.author_name,
                    is_host_reply=(rep.user_id == host_user_id if host_user_id else False),
                    content=rep.content,
                    created_at=rep.created_at
                )
                for rep in replies
            ]

            result.append(CommentOut(
                id=r.id,
                event_id=r.event_id,
                author_name=r.author_name,
                is_question=r.is_question,
                content=r.content,
                parent_id=r.parent_id,
                created_at=r.created_at,
                replies=reply_outs
            ))

        return result


comment_service = CommentService()
