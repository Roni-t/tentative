from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CommentCreatePayload(BaseModel):
    author_name: str = Field(..., min_length=1, max_length=128)
    content: str = Field(..., min_length=1)
    is_question: bool = False
    parent_id: Optional[int] = None


class CommentReplyOut(BaseModel):
    id: int
    author_name: str
    is_host_reply: bool = False
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: int
    event_id: int
    author_name: str
    is_question: bool
    content: str
    parent_id: Optional[int] = None
    created_at: datetime
    replies: List[CommentReplyOut] = []

    class Config:
        from_attributes = True
