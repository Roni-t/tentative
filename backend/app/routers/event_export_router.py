from fastapi import APIRouter, HTTPException, Response
from datetime import datetime, timezone
from app.adapters.ics_exporter import generate_ics

router = APIRouter(prefix="/api/events", tags=["Event Export"])

# Mock database store for demonstration (replace with your SQLAlchemy query)
_EVENT_STORE = {
    12345: {
        "event_id": 12345,
        "title": "Project Milestone Review",
        "description": "Review sprint progress with stakeholders.",
        "location": "Virtual Room A",
        "start_time": datetime(2026, 12, 1, 15, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 12, 1, 16, 0, tzinfo=timezone.utc),
        "organizer_name": "Tentative Team"
    }
}


@router.get("/{event_id}/export.ics")
def export_event_ics(event_id: int):
    event = _EVENT_STORE.get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    # Call your pre-existing ics_exporter adapter function
    ics_data = generate_ics(
        event_id=event["event_id"],
        title=event["title"],
        description=event["description"],
        location=event["location"],
        start_time=event["start_time"],
        end_time=event["end_time"],
        organizer_name=event["organizer_name"]
    )
    
    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=event-{event_id}.ics"}
    )
