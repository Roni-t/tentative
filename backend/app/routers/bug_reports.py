from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import require_admin
from app.database import get_db
from app.models.bug_report import BugReport
from app.models.user import User
from app.schemas.bug_report import BugReportCreatePayload, BugReportOut

router = APIRouter(prefix="/api/bug-reports", tags=["Bug Reports"])


@router.post("", response_model=BugReportOut)
def create_bug_report(
    payload: BugReportCreatePayload,
    db: Session = Depends(get_db)
):
    """File a bug report or platform feedback."""
    report = BugReport(
        user_name=payload.user_name,
        email_or_phone=payload.email_or_phone,
        page_url=payload.page_url,
        description=payload.description
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return BugReportOut.model_validate(report)


@router.get("", response_model=List[BugReportOut])
def list_bug_reports(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all filed bug reports (admin only)."""
    reports = db.query(BugReport).order_by(BugReport.created_at.desc()).all()
    return [BugReportOut.model_validate(r) for r in reports]
