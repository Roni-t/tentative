"""
Module: backend/app/services/aaron_service.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Selected Use Cases Implemented:
    - UC-11: Host can set recurring events (e.g., weekly meetings)
    - UC-12: Allow a Co-Host to add/alter events
    - UC-13: Invitees can comment or inquire
"""

from datetime import datetime, timedelta
from typing import Optional


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
    def format_event_inquiry(author: str, content: str, is_host_reply: bool = False) -> dict:
        cleaned_author = author.strip()
        cleaned_content = content.strip()
        if not cleaned_author or not cleaned_content:
            raise ValueError("Inquiry author and content cannot be empty.")
        if len(cleaned_content) > 1000:
            raise ValueError("Inquiry exceeds 1000 character limit.")
        return {
            "author": cleaned_author,
            "content": cleaned_content,
            "badge": "HOST" if is_host_reply else "INVITEE",
        }
