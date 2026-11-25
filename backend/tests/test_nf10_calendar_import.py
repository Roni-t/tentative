"""NF-10 Import events from an external calendar (owner: Reese). Tests written by Divyam.

Event: 2026-12-02 and 2026-12-03, 14:00-16:00 UTC, 60-minute slots -> 4 slots.
"""
from tests.helpers import create_event, register_user

HOST = "+19725550341"
EVENT = {"timezone": "UTC", "candidate_dates": ["2026-12-02", "2026-12-03"],
         "daily_start_time": "14:00", "daily_end_time": "16:00", "slot_duration_minutes": 60}


def ics(*events: str) -> str:
    return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" + "".join(events) + "END:VCALENDAR\r\n"


def vevent(lines: str) -> str:
    return "BEGIN:VEVENT\r\n" + lines + "END:VEVENT\r\n"


def import_ics(client, event_id, text):
    return client.post(f"/api/events/{event_id}/availability/import-ics", json={"ics_text": text})


def test_nf10_01_busy_meeting_removes_its_slot(client, db_session):
    """A 14:00-15:00 meeting on Dec 2 leaves the other 3 slots free."""
    event = create_event(client, register_user(client, HOST, "Host"), **EVENT)
    text = ics(vevent("DTSTART:20261202T140000Z\r\nDTEND:20261202T150000Z\r\nSUMMARY:Class\r\n"))

    res = import_ics(client, event["id"], text)

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["busy_events_found"] == 1 and body["total_slots"] == 4
    assert [s["start_time"] for s in body["free_slots"]] == [
        "2026-12-02T15:00:00Z", "2026-12-03T14:00:00Z", "2026-12-03T15:00:00Z"]


def test_nf10_02_timezones_all_day_and_folded_lines(client, db_session):
    """TZID times convert correctly (08:00 Chicago = 14:00 UTC), all-day events block the whole day,
    folded lines are read, and canceled or 'free' (transparent) entries are ignored."""
    event = create_event(client, register_user(client, HOST, "Host"), **EVENT)
    text = ics(
        vevent("DTSTART;TZID=America/Chicago:20261202T080000\r\nDTEND;TZID=America/Chicago:20261202T090000\r\nSUMMARY:Long\r\n  folded title\r\n"),
        vevent("DTSTART;VALUE=DATE:20261203\r\nDTEND;VALUE=DATE:20261204\r\n"),
        vevent("DTSTART:20261202T150000Z\r\nDTEND:20261202T160000Z\r\nSTATUS:CANCELLED\r\n"),
        vevent("DTSTART:20261202T150000Z\r\nDTEND:20261202T160000Z\r\nTRANSP:TRANSPARENT\r\n"),
    )

    body = import_ics(client, event["id"], text).json()

    assert body["busy_events_found"] == 2
    assert [s["start_time"] for s in body["free_slots"]] == ["2026-12-02T15:00:00Z"]


def test_nf10_03_invalid_files_rejected(client, db_session):
    """Invalid input: a non-calendar file and an unreadable date get 400 with a clear message."""
    event = create_event(client, register_user(client, HOST, "Host"), **EVENT)

    not_cal = import_ics(client, event["id"], "hello, this is a text file")
    bad_date = import_ics(client, event["id"], ics(vevent("DTSTART:notadate\r\n")))

    assert not_cal.status_code == 400
    assert not_cal.json()["detail"] == "That file is not a calendar (.ics) file."
    assert bad_date.status_code == 400
    assert bad_date.json()["detail"] == "The calendar file has a date this app can't read."


def test_nf10_04_import_saves_nothing(client, db_session):
    """Importing only suggests slots; the heatmap has no respondents until the person saves."""
    event = create_event(client, register_user(client, HOST, "Host"), **EVENT)
    import_ics(client, event["id"], ics())

    assert client.get(f"/api/events/{event['id']}/heatmap").json()["total_respondents"] == 0
