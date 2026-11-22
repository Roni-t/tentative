"""
Module: backend/app/services/aaron_service.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Implemented Requirements:
    - FR-1 (UC-11): Allow host to set recurring events
    - FR-2 (UC-12): Allow a co-host who can add events or alter
    - FR-4 (UC-3): Create an event poll or event category option
    - NF-6: A backup of the event information, participants/responses
    - NF-8: AA accessibility options, screen reader compatible
"""

from datetime import datetime, timedelta
from typing import Optional
import hashlib
import json
from copy import deepcopy


class AaronSchedulingAndPollService:
    @staticmethod
    def expand_recurring_dates(start_date_str: str, frequency: str, occurrences: int) -> list[str]:
        if occurrences < 1 or occurrences > 52:
            raise ValueError("Invalid recurrence count: must be between 1 and 52.")
        if frequency not in ("DAILY", "WEEKLY", "BIWEEKLY"):
            raise ValueError(f"Unsupported recurrence frequency: {frequency}")

        base_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        step_days = 1 if frequency == "DAILY" else (7 if frequency == "WEEKLY" else 14)
        return [
            (base_dt + timedelta(days=i * step_days)).strftime("%Y-%m-%d")
            for i in range(occurrences)
        ]

    @staticmethod
    def validate_cohost_alteration(
        role: str, window_start: str, window_end: str, capacity: Optional[int]
    ) -> dict:
        if role not in ("HOST", "CO_HOST", "ADMIN"):
            raise PermissionError("Unauthorized: Only Host or Co-Host may alter event settings.")
        if window_start >= window_end:
            raise ValueError("Validation Error: window_end must be strictly after window_start.")
        if capacity is not None and capacity < 1:
            raise ValueError("Validation Error: capacity limit must be at least 1.")
        return {
            "status": "updated",
            "window_start": window_start,
            "window_end": window_end,
            "capacity": capacity,
        }

    @staticmethod
    def create_event_poll(question: str, options: list[str], category: str = "General") -> dict:
        cleaned_q = question.strip()
        cleaned_cat = category.strip() or "General"
        cleaned_opts = [opt.strip() for opt in options if opt and opt.strip()]
        if not cleaned_q or len(cleaned_opts) < 2:
            raise ValueError("Poll requires a valid question and at least 2 non-empty options.")
        if len(set(cleaned_opts)) != len(cleaned_opts):
            raise ValueError("Duplicate poll options are not allowed.")
        return {
            "question": cleaned_q,
            "category": cleaned_cat,
            "tally": {opt: 0 for opt in cleaned_opts},
        }

    @staticmethod
    def create_event_backup(event_data: dict) -> dict:
        if not event_data or "event_id" not in event_data or "participants" not in event_data:
            raise ValueError("Missing required event or participant data for backup.")
        snapshot = deepcopy(event_data)
        serialized = json.dumps(snapshot, sort_keys=True).encode("utf-8")
        checksum = hashlib.sha256(serialized).hexdigest()
        return {
            "status": "BACKUP_CREATED",
            "event_id": snapshot["event_id"],
            "participant_count": len(snapshot["participants"]),
            "checksum": checksum,
            "payload": snapshot,
        }

    @staticmethod
    def validate_wcag_aa_and_screen_reader(component: dict) -> dict:
        aria_label = str(component.get("aria_label", "")).strip()
        role = str(component.get("role", "")).strip()
        contrast_ratio = float(component.get("contrast_ratio", 0.0))
        if not aria_label or not role:
            raise ValueError("Missing aria-label or role for screen reader compatibility.")
        if contrast_ratio < 4.5:
            raise ValueError("Contrast ratio below WCAG 2.1 AA minimum (4.5:1).")
        return {
            "component_id": component.get("id"),
            "wcag_level": "AA_COMPLIANT",
            "screen_reader_ready": True,
            "verified_contrast": contrast_ratio,
            "aria_label": aria_label,
        }
