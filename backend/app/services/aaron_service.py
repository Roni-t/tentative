"""
Module: backend/app/services/aaron_service.py
Project: Tentative — Group Scheduling Web App (CS 3354 Fall 2026)
Author / Contributor: Aaron (ahines214)
Selected Use Cases Implemented:
    - UC-03: Host Recurring Event Schedule Expansion
    - UC-04: Co-Host Event Window & Capacity Alterations
    - UC-13: Invitee Event Inquiries & Host Reply Badging
    - UC-14: Host Event Poll Aggregation & Overlap Heatmap Calculation
"""

from datetime import datetime, timedelta
from collections import defaultdict
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
    def compute_poll_heatmap(all_participants: list[str], submissions: dict[str, list[str]]) -> dict:
        total_count = len(all_participants)
        slot_tally = defaultdict(list)

        for participant, slots in submissions.items():
            for slot in set(slots):
                slot_tally[slot].append(participant)

        cells = []
        for slot_iso, avail_list in sorted(slot_tally.items()):
            avail_sorted = sorted(avail_list)
            busy_sorted = sorted([p for p in all_participants if p not in avail_sorted])
            cells.append({
                "slot_iso": slot_iso,
                "available_count": len(avail_sorted),
                "total_participants": total_count,
                "intensity": round(len(avail_sorted) / total_count, 4) if total_count else 0.0,
                "available_participants": avail_sorted,
                "busy_participants": busy_sorted,
            })

        ranked = sorted(cells, key=lambda c: (-c["available_count"], c["slot_iso"]))
        return {
            "total_responded": len(submissions),
            "best_slot": ranked[0] if ranked else None,
            "ranked_slots": ranked,
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
