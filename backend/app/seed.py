import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.core.encryption import encrypt_phone, hash_phone, normalize_phone
from app.core.security import generate_secure_token
from app.models.auth import Session as DbSession
from app.models.availability import Availability
from app.models.changelog import ChangeLogEntry
from app.models.comment import Comment
from app.models.event import BlockedUser, Event, EventCoHost, Group
from app.models.recurrence import RecurrenceRule
from app.models.rsvp import RSVP
from app.models.shareable_url import ShareableURL
from app.models.user import User

logger = logging.getLogger("tentative.seed")


def seed_database(db: Session) -> None:
    """Populates the database with initial demo data matching the specification and wireframes."""
    # Check if database already seeded
    existing_event = db.query(Event).filter(Event.title == "Software Engineering Team Meeting").first()
    if existing_event:
        logger.info("Database already seeded with demo event.")
        return

    now = datetime.now(timezone.utc)

    # 1. Admin Account
    admin_norm = normalize_phone(settings.ADMIN_PHONE)
    admin_hash = hash_phone(admin_norm)
    admin = db.query(User).filter(User.phone_hash == admin_hash).first()
    if not admin:
        admin = User(
            name=settings.ADMIN_NAME,
            phone_number_encrypted=encrypt_phone(admin_norm),
            phone_hash=admin_hash,
            is_admin=True,
            created_at=now - timedelta(days=10)
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # 2. Host Account (Kaelan Nguyen from Wireframe p. 41-43)
    host_phone = "+19725550142"
    host_norm = normalize_phone(host_phone)
    host_hash = hash_phone(host_norm)
    host = db.query(User).filter(User.phone_hash == host_hash).first()
    if not host:
        host = User(
            name="Kaelan Nguyen",
            phone_number_encrypted=encrypt_phone(host_norm),
            phone_hash=host_hash,
            is_admin=False,
            created_at=now - timedelta(days=5)
        )
        db.add(host)
        db.commit()
        db.refresh(host)

    # 3. Create Demo Event (Software Engineering Team Meeting)
    candidate_dates = [
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
        "2026-09-19",
        "2026-09-20"
    ]

    event = Event(
        title="Software Engineering Team Meeting",
        description="CS 3354 Project Planning & Architecture Alignment. Let's compare schedules and finalize our weekly meeting orbit.",
        location="ECSS 2.410 / Teams link",
        timezone="America/Chicago",
        candidate_dates=candidate_dates,
        daily_start_time="09:00",
        daily_end_time="18:00",
        slot_duration_minutes=30,
        deadline=now + timedelta(days=5),
        capacity_limit=3,  # capacity limit set to 3 to trigger waitlist demo!
        is_hidden_details=False,
        status="collecting",
        created_by_id=host.id,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=1)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 4. Shareable URL with fixed token 'demo-orbit-2026'
    share_url = ShareableURL(
        token="demo-orbit-2026",
        event_id=event.id,
        expires_at=now + timedelta(days=60),
        is_active=True,
        created_at=now - timedelta(days=2)
    )
    db.add(share_url)
    db.commit()

    # 5. Participants & Availability
    # Participants matching wireframe p. 47 & 51:
    participants = [
        ("Alex Morgan", "alex.morgan@acme.com", "token-alex-01"),
        ("Jamie Chen", "jamie.chen@acme.com", "token-jamie-02"),
        ("Priya Shah", "priya.shah@acme.com", "token-priya-03"),
        ("Daniel Kim", "daniel.kim@acme.com", "token-daniel-04"),
        ("Sofia Patel", "sofia.patel@acme.com", "token-sofia-05"),
        ("Marcus Lee", "marcus.lee@acme.com", "token-marcus-06"),
        ("Emma Wilson", "emma.wilson@acme.com", "token-emma-07"),
        ("Noah Davis", "noah.davis@acme.com", "token-noah-08")
    ]

    # Pre-populate availability slots so Wednesday Sep 16, 2:00 PM - 3:00 PM (14:00 - 15:00 UTC) has 7 of 8 available!
    wed_date = "2026-09-16"
    y, m, d = 2026, 9, 16

    for name, email, edit_tok in participants:
        # Everyone except Noah is available Wed 14:00 - 15:00 (7 of 8)
        if name != "Noah Davis":
            # 14:00 to 14:30
            db.add(Availability(
                event_id=event.id,
                participant_name=name,
                edit_token=edit_tok,
                start_time=datetime(y, m, d, 14, 0, tzinfo=timezone.utc),
                end_time=datetime(y, m, d, 14, 30, tzinfo=timezone.utc),
                created_at=now - timedelta(hours=20)
            ))
            # 14:30 to 15:00
            db.add(Availability(
                event_id=event.id,
                participant_name=name,
                edit_token=edit_tok,
                start_time=datetime(y, m, d, 14, 30, tzinfo=timezone.utc),
                end_time=datetime(y, m, d, 15, 0, tzinfo=timezone.utc),
                created_at=now - timedelta(hours=20)
            ))

        # Additional varied slots to make heatmap visual gradient look rich:
        if name in ["Alex Morgan", "Jamie Chen", "Daniel Kim", "Sofia Patel"]:
            # Tuesday 15:00 - 16:00
            db.add(Availability(
                event_id=event.id,
                participant_name=name,
                edit_token=edit_tok,
                start_time=datetime(2026, 9, 15, 15, 0, tzinfo=timezone.utc),
                end_time=datetime(2026, 9, 15, 16, 0, tzinfo=timezone.utc),
                created_at=now - timedelta(hours=18)
            ))
        if name in ["Priya Shah", "Marcus Lee", "Emma Wilson"]:
            # Thursday 10:00 - 11:00
            db.add(Availability(
                event_id=event.id,
                participant_name=name,
                edit_token=edit_tok,
                start_time=datetime(2026, 9, 17, 10, 0, tzinfo=timezone.utc),
                end_time=datetime(2026, 9, 17, 11, 0, tzinfo=timezone.utc),
                created_at=now - timedelta(hours=16)
            ))

    db.commit()

    # 6. RSVPs with FIFO Waitlist (matches wireframe p. 47)
    # Capacity limit is 3:
    # 3 Going: Alex Morgan, Jamie Chen, Priya Shah
    # 2 Maybe: Daniel Kim, Sofia Patel
    # 1 Not Going: Marcus Lee
    # 1 Waitlisted: Emma Wilson (rank 1)
    # 1 No Response: Noah Davis (availability entered, but no RSVP)
    rsvp_data = [
        ("Alex Morgan", "alex.morgan@acme.com", "token-alex-01", "going", None),
        ("Jamie Chen", "jamie.chen@acme.com", "token-jamie-02", "going", None),
        ("Priya Shah", "priya.shah@acme.com", "token-priya-03", "going", None),
        ("Daniel Kim", "daniel.kim@acme.com", "token-daniel-04", "maybe", None),
        ("Sofia Patel", "sofia.patel@acme.com", "token-sofia-05", "maybe", None),
        ("Marcus Lee", "marcus.lee@acme.com", "token-marcus-06", "not_going", None),
        ("Emma Wilson", "emma.wilson@acme.com", "token-emma-07", "waitlisted", 1),
    ]

    for name, email, tok, stat, rank in rsvp_data:
        db.add(RSVP(
            event_id=event.id,
            participant_name=name,
            participant_email_or_phone=email,
            edit_token=tok,
            status=stat,
            waitlist_position=rank,
            created_at=now - timedelta(hours=12),
            updated_at=now - timedelta(hours=10)
        ))
    db.commit()

    # 7. Discussion Comments (matches wireframe p. 49)
    q1 = Comment(
        event_id=event.id,
        author_name="Invite 1",
        is_question=True,
        content="Will a virtual meeting link be shared before the event?",
        created_at=now - timedelta(hours=15)
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    r1 = Comment(
        event_id=event.id,
        user_id=host.id,
        author_name=host.name,
        is_question=False,
        content="Yes. The meeting link will appear on the event page after the time is finalized.",
        parent_id=q1.id,
        created_at=now - timedelta(hours=14)
    )
    db.add(r1)

    c2 = Comment(
        event_id=event.id,
        author_name="Invite 2",
        is_question=False,
        content="Tuesday afternoon works best for me",
        created_at=now - timedelta(hours=8)
    )
    db.add(c2)

    # 8. Recurrence Rule (UC-11)
    rec_rule = RecurrenceRule(
        event_id=event.id,
        frequency="weekly",
        interval=1,
        days_of_week="WE",
        end_date=datetime(2026, 12, 16, 23, 59, 59, tzinfo=timezone.utc),
        created_at=now - timedelta(days=2)
    )
    db.add(rec_rule)

    # 9. ChangeLog entries
    db.add(ChangeLogEntry(
        event_id=event.id,
        user_id=host.id,
        action="created",
        details="Event 'Software Engineering Team Meeting' scheduled.",
        timestamp=now - timedelta(days=2)
    ))
    db.add(ChangeLogEntry(
        event_id=event.id,
        user_id=host.id,
        action="updated",
        details="Capacity limit set to 3 participants.",
        timestamp=now - timedelta(days=1)
    ))

    db.commit()
    logger.info("Successfully seeded database with full demo event and 8 participants!")
