"""FR-7 Notify participants when the meeting starts (owner: Reese). Tests written by Divyam."""
from datetime import datetime, timedelta, timezone

from app.models.notification import Notification
from app.services.notification_service import notification_service
from tests.helpers import create_event, register_user

HOST = "+19725550351"
EVENT = {"timezone": "UTC", "candidate_dates": ["2026-12-02"], "daily_start_time": "14:00", "daily_end_time": "16:00"}
SLOT = {"start_time": "2026-12-02T14:00:00Z", "end_time": "2026-12-02T15:00:00Z", "notify_participants": False}
START = datetime(2026, 12, 2, 14, 0, tzinfo=timezone.utc)


def setup_meeting(client):
    host = register_user(client, HOST, "Host")
    event = create_event(client, host, **EVENT)
    for name, status in [("Alice", "going"), ("Bob", "maybe"), ("Cara", "declined")]:
        client.cookies.clear()
        client.post(f"/api/events/{event['id']}/rsvp", json={"participant_name": name, "status": status})
    client.post(f"/api/events/{event['id']}/finalize", json=SLOT, headers=host)
    return event, host


def start_alerts(db_session, event_id):
    return db_session.query(Notification).filter(
        Notification.event_id == event_id, Notification.notification_type == "meeting_starting").all()


def test_fr7_01_going_and_maybe_notified_once_at_start(client, db_session):
    """At start time the host, Alice (going) and Bob (maybe) get one alert each; Cara (declined) doesn't.
    Running the job again sends nothing new."""
    event, _ = setup_meeting(client)

    assert notification_service.send_start_notifications(db_session, now=START + timedelta(minutes=1)) == 1
    assert notification_service.send_start_notifications(db_session, now=START + timedelta(minutes=2)) == 0

    recipients = [n.recipient for n in start_alerts(db_session, event["id"])]
    assert len(recipients) == 3
    assert "Alice" in recipients and "Bob" in recipients and "Cara" not in recipients


def test_fr7_02_no_alert_before_start_or_long_after(client, db_session):
    """Nothing is sent 5 minutes early or 45 minutes late (outside the 30-minute window)."""
    event, _ = setup_meeting(client)

    assert notification_service.send_start_notifications(db_session, now=START - timedelta(minutes=5)) == 0
    assert notification_service.send_start_notifications(db_session, now=START + timedelta(minutes=45)) == 0
    assert start_alerts(db_session, event["id"]) == []


def test_fr7_03_canceled_meeting_gets_no_alert(client, db_session):
    """A finalized meeting that was then canceled never sends a start alert."""
    event, host = setup_meeting(client)
    client.post(f"/api/events/{event['id']}/cancel", headers=host)

    assert notification_service.send_start_notifications(db_session, now=START + timedelta(minutes=1)) == 0
