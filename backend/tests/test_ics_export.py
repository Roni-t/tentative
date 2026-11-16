from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers.event_export_router import router as export_router

test_app = FastAPI()
test_app.include_router(export_router)
client = TestClient(test_app)


def test_ics_file_export_format():
    resp = client.get("/api/events/12345/export.ics")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/calendar; charset=utf-8"
    
    body = resp.text
    assert "BEGIN:VCALENDAR" in body
    assert "VERSION:2.0" in body
    assert "BEGIN:VEVENT" in body
    assert "SUMMARY:Project Milestone Review" in body
    assert "LOCATION:Virtual Room A" in body
    assert "END:VCALENDAR" in body


def test_ics_export_not_found():
    resp = client.get("/api/events/99999/export.ics")
    assert resp.status_code == 404
