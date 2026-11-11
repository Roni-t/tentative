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


async def start_scheduler_task():
    """Background periodic loop running every 60 seconds."""
    while True:
        try:
            run_cleanup_job()
        except Exception as e:
            logger.error(f"Scheduler loop encountered error: {e}")
        await asyncio.sleep(60)
