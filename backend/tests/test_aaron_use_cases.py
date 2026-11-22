"""
Module: backend/tests/test_aaron_use_cases.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Description: Automated unit tests for FR-1, FR-2, FR-4, NF-6, and NF-8.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.aaron_models import AaronBase
from app.services.aaron_service import AaronSchedulingAndPollService


def test_fr1_uc11_recurring_event_expansion_and_invalid_bounds():
    weekly = AaronSchedulingAndPollService.expand_recurring_dates("2026-09-16", "WEEKLY", 4)
    assert weekly == ["2026-09-16", "2026-09-23", "2026-09-30", "2026-10-07"]

    with pytest.raises(ValueError, match="between 1 and 52"):
        AaronSchedulingAndPollService.expand_recurring_dates("2026-09-16", "WEEKLY", 0)

    selected_days = AaronSchedulingAndPollService.expand_weekly_recurrence(
        "2026-11-23", "WEEKLY", 2, ["WE"], 3
    )
    assert selected_days == ["2026-11-25", "2026-12-09", "2026-12-23"]


def test_fr2_uc12_cohost_event_alteration_permissions_and_validation():
    updated = AaronSchedulingAndPollService.validate_cohost_alteration(
        role="CO_HOST", window_start="14:00", window_end="17:00", capacity=3
    )
    assert updated["status"] == "updated"
    assert updated["capacity"] == 3

    with pytest.raises(PermissionError, match="Only Host or Co-Host"):
        AaronSchedulingAndPollService.validate_cohost_alteration(
            role="INVITEE", window_start="14:00", window_end="17:00", capacity=3
        )


def test_fr4_event_poll_and_category_creation():
    poll = AaronSchedulingAndPollService.create_event_poll(
        question="  Which room works best for Friday? ",
        options=["ECSS 2.410", "ECSS 4.619"],
        category="Study Session"
    )
    assert poll == {
        "question": "Which room works best for Friday?",
        "category": "Study Session",
        "tally": {"ECSS 2.410": 0, "ECSS 4.619": 0},
    }


def test_nf6_event_and_participant_backup():
    active_event = {
        "event_id": "evt_cs3354_01",
        "title": "Software Engineering Team Meeting",
        "participants": [
            {"name": "Aaron Hines", "status": "GOING"},
            {"name": "Ronit Dhaliwal", "status": "GOING"}
        ]
    }
    backup = AaronSchedulingAndPollService.create_event_backup(active_event)
    assert backup["status"] == "BACKUP_CREATED"
    assert backup["participant_count"] == 2
    assert backup["payload"] == active_event


def test_nf8_wcag_aa_accessibility_and_screen_reader():
    ui_element = {
        "id": "btn_save_recurrence",
        "role": "button",
        "aria_label": "Save weekly event recurrence schedule",
        "contrast_ratio": 7.2
    }
    res = AaronSchedulingAndPollService.validate_wcag_aa_and_screen_reader(ui_element)
    assert res["wcag_level"] == "AA_COMPLIANT"
    assert res["screen_reader_ready"] is True


def test_aaron_tools_attach_to_an_existing_shared_event_id():
    engine = create_engine("sqlite:///:memory:")
    AaronBase.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    initialized = AaronSchedulingAndPollService.initialize_shared_event(
        source_event_id=71,
        title="Existing team event",
        start_date="2026-11-23",
        window_start="14:00",
        window_end="16:00",
        capacity=8,
        db=session,
    )

    assert initialized["event"]["id"] == 71
    assert initialized["access_token"]
    assert AaronSchedulingAndPollService.get_event(71, session)["title"] == "Existing team event"
    repeated = AaronSchedulingAndPollService.initialize_shared_event(
        source_event_id=71,
        title="Existing team event",
        start_date="2026-11-23",
        window_start="14:00",
        window_end="16:00",
        capacity=8,
        db=session,
    )
    assert repeated["access_token"] is None
    session.close()
    engine.dispose()
