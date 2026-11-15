"""
Module: backend/tests/test_aaron_use_cases.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Description: Automated unit and router tests for UC-11, UC-12, and UC-13.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.services.aaron_service import AaronSchedulingAndPollService
from app.routers.aaron_router import router as aaron_router

test_app = FastAPI()
test_app.include_router(aaron_router)
client = TestClient(test_app)


def test_uc11_recurring_event_expansion_and_invalid_bounds():
    weekly = AaronSchedulingAndPollService.expand_recurring_dates("2026-09-16", "WEEKLY", 4)
    assert weekly == ["2026-09-16", "2026-09-23", "2026-09-30", "2026-10-07"]

    with pytest.raises(ValueError, match="between 1 and 52"):
        AaronSchedulingAndPollService.expand_recurring_dates("2026-09-16", "WEEKLY", 0)

    resp = client.post("/api/aaron/recurrence/expand", json={
        "start_date_str": "2026-09-16",
        "frequency": "BIWEEKLY",
        "occurrences": 2
    })
    assert resp.status_code == 200
    assert resp.json()["dates"] == ["2026-09-16", "2026-09-30"]


def test_uc12_cohost_event_alteration_permissions_and_validation():
    updated = AaronSchedulingAndPollService.validate_cohost_alteration(
        role="CO_HOST", window_start="14:00", window_end="17:00", capacity=3
    )
    assert updated["status"] == "updated"
    assert updated["capacity"] == 3

    with pytest.raises(PermissionError, match="Only Host or Co-Host"):
        AaronSchedulingAndPollService.validate_cohost_alteration(
            role="INVITEE", window_start="14:00", window_end="17:00", capacity=3
        )

    resp_forbidden = client.patch("/api/aaron/events/cohost-alteration", json={
        "role": "INVITEE",
        "window_start": "14:00",
        "window_end": "17:00",
        "capacity": 5
    })
    assert resp_forbidden.status_code == 403


def test_uc13_invitee_inquiry_and_host_reply_validation():
    inquiry = AaronSchedulingAndPollService.format_event_inquiry(
        author="Emma Wilson", content="  Is attendance mandatory?  ", is_host_reply=False
    )
    assert inquiry == {
        "author": "Emma Wilson",
        "content": "Is attendance mandatory?",
        "badge": "INVITEE",
    }

    resp_reply = client.post("/api/aaron/inquiries/format", json={
        "author": "Kaelan Nguyen",
        "content": "Yes, we are finalizing the time.",
        "is_host_reply": True
    })
    assert resp_reply.status_code == 200
    assert resp_reply.json()["badge"] == "HOST"

    resp_bad = client.post("/api/aaron/inquiries/format", json={
        "author": "Emma",
        "content": "   ",
        "is_host_reply": False
    })
    assert resp_bad.status_code == 400
