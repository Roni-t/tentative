import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.shareable_url import ShareableURL
from app.models.auth import VerificationCode

logger = logging.getLogger("tentative.scheduler")


def run_cleanup_job():
    """Soft-deactivate and clean expired resources."""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Deactivate expired shareable URLs
        expired_urls = db.query(ShareableURL).filter(
            ShareableURL.expires_at <= now,
            ShareableURL.is_active == True
        ).all()
        for u in expired_urls:
            u.is_active = False
            logger.info(f"Deactivated expired URL token: {u.token}")

        # 2. Purge verification codes older than 30 minutes
        expired_codes = db.query(VerificationCode).filter(
            VerificationCode.expires_at <= now - timedelta(minutes=30)
        ).all()
        for c in expired_codes:
            db.delete(c)

        db.commit()
    except Exception as e:
        logger.error(f"Error in background cleanup job: {e}")
        db.rollback()
    finally:
        db.close()


def run_reminder_job():
    """FR-18: text invitees who haven't responded when the deadline is close."""
    from app.services.invitee_service import invitee_service
    db: Session = SessionLocal()
    try:
        sent = invitee_service.send_deadline_reminders(db)
        if sent:
            logger.info(f"Sent {sent} deadline reminder(s).")
    finally:
        db.close()


def run_meeting_start_job():
    """FR-7 (Reese): notify participants when a finalized meeting starts."""
    from app.services.notification_service import notification_service
    db: Session = SessionLocal()
    try:
        sent = notification_service.send_start_notifications(db)
        if sent:
            logger.info(f"Sent meeting-start notifications for {sent} event(s).")
    finally:
        db.close()


async def start_scheduler_task():
    """Background periodic loop running every 60 seconds."""
    while True:
        try:
            run_cleanup_job()
        except Exception as e:
            logger.error(f"Scheduler loop encountered error: {e}")
        try:
            run_reminder_job()
        except Exception as e:
            logger.error(f"Reminder job encountered error: {e}")
        try:
            run_meeting_start_job()
        except Exception as e:
            logger.error(f"Meeting start job encountered error: {e}")
        await asyncio.sleep(60)
