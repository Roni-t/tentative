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

from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import json
import secrets
from copy import deepcopy

from sqlalchemy.orm import Session

from app.aaron_models import AaronCoHost, AaronEvent, AaronParticipant, AaronPoll, AaronPollVote, AaronRecurrence


class AaronSchedulingAndPollService:
    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _event_or_404(event_id: int, db: Session) -> AaronEvent:
        event = db.query(AaronEvent).filter(AaronEvent.id == event_id).first()
        if event is None:
            raise LookupError("Event not found.")
        return event

    @staticmethod
    def _access_role(event: AaronEvent, token: str, db: Session) -> str:
        if not token:
            raise PermissionError("An event access token is required.")
        token_hash = AaronSchedulingAndPollService._token_hash(token)
        if secrets.compare_digest(token_hash, event.owner_token_hash):
            return "HOST"
        cohost = db.query(AaronCoHost).filter(
            AaronCoHost.event_id == event.id,
            AaronCoHost.token_hash == token_hash,
        ).first()
        if cohost:
            return "CO_HOST"
        raise PermissionError("This access token cannot manage the event.")

    @staticmethod
    def _poll_out(poll: AaronPoll) -> dict:
        tally = {option: 0 for option in poll.options}
        for vote in poll.votes:
            tally[vote.option] = tally.get(vote.option, 0) + 1
        return {
            "id": poll.id,
            "question": poll.question,
            "category": poll.category,
            "options": poll.options,
            "tally": tally,
        }

    @staticmethod
    def event_out(event: AaronEvent) -> dict:
        recurrence = event.recurrence
        return {
            "id": event.id,
            "title": event.title,
            "start_date": event.start_date,
            "window_start": event.window_start,
            "window_end": event.window_end,
            "capacity": event.capacity,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "recurrence": ({
                "frequency": recurrence.frequency,
                "interval": recurrence.interval,
                "days_of_week": recurrence.days_of_week,
                "end_date": recurrence.end_date,
            } if recurrence else None),
            "cohosts": [{"name": cohost.name} for cohost in event.cohosts],
            "participants": [
                {"name": participant.name, "response": participant.response}
                for participant in event.participants
            ],
            "polls": [AaronSchedulingAndPollService._poll_out(poll) for poll in event.polls],
        }

    @staticmethod
    def create_event(
        title: str,
        start_date: str,
        window_start: str,
        window_end: str,
        capacity: Optional[int],
        db: Session,
    ) -> dict:
        clean_title = title.strip()
        if not clean_title:
            raise ValueError("Event title is required.")
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except (TypeError, ValueError) as exc:
            raise ValueError("Start date must use YYYY-MM-DD format.") from exc
        AaronSchedulingAndPollService.validate_cohost_alteration(
            "HOST", window_start, window_end, capacity
        )
        access_token = secrets.token_urlsafe(32)
        event = AaronEvent(
            title=clean_title,
            start_date=start_date,
            window_start=window_start,
            window_end=window_end,
            capacity=capacity,
            owner_token_hash=AaronSchedulingAndPollService._token_hash(access_token),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return {"event": AaronSchedulingAndPollService.event_out(event), "access_token": access_token}

    @staticmethod
    def get_event(event_id: int, db: Session) -> dict:
        return AaronSchedulingAndPollService.event_out(
            AaronSchedulingAndPollService._event_or_404(event_id, db)
        )

    @staticmethod
    def add_cohost(event_id: int, name: str, access_token: str, db: Session) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        role = AaronSchedulingAndPollService._access_role(event, access_token, db)
        if role != "HOST":
            raise PermissionError("Only the host can add a co-host.")
        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Co-host name is required.")
        if db.query(AaronCoHost).filter(
            AaronCoHost.event_id == event.id,
            AaronCoHost.name.ilike(clean_name),
        ).first():
            raise ValueError("This co-host is already assigned to the event.")
        cohost_token = secrets.token_urlsafe(32)
        db.add(AaronCoHost(
            event_id=event.id,
            name=clean_name,
            token_hash=AaronSchedulingAndPollService._token_hash(cohost_token),
        ))
        db.commit()
        return {"name": clean_name, "access_token": cohost_token}

    @staticmethod
    def alter_event(
        event_id: int,
        access_token: str,
        window_start: str,
        window_end: str,
        capacity: Optional[int],
        db: Session,
    ) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        role = AaronSchedulingAndPollService._access_role(event, access_token, db)
        AaronSchedulingAndPollService.validate_cohost_alteration(
            role, window_start, window_end, capacity
        )
        event.window_start = window_start
        event.window_end = window_end
        event.capacity = capacity
        db.commit()
        db.refresh(event)
        return AaronSchedulingAndPollService.event_out(event)

    @staticmethod
    def set_recurrence(
        event_id: int,
        access_token: str,
        frequency: str,
        interval: int,
        days_of_week: list[str],
        end_date: Optional[str],
        db: Session,
    ) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        AaronSchedulingAndPollService._access_role(event, access_token, db)
        clean_frequency = frequency.strip().upper()
        if clean_frequency not in ("WEEKLY", "BIWEEKLY"):
            raise ValueError("Frequency must be WEEKLY or BIWEEKLY.")
        if interval < 1 or interval > 52:
            raise ValueError("Interval must be between 1 and 52.")
        valid_days = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}
        clean_days = sorted({day.upper() for day in days_of_week if day.upper() in valid_days})
        if not clean_days:
            raise ValueError("Select at least one day of the week.")
        if end_date:
            try:
                datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError as exc:
                raise ValueError("End date must use YYYY-MM-DD format.") from exc
            if end_date < event.start_date:
                raise ValueError("End date cannot be before the event start date.")
        rule = event.recurrence
        if rule is None:
            rule = AaronRecurrence(event_id=event.id)
            db.add(rule)
        rule.frequency = clean_frequency
        rule.interval = interval
        rule.days_of_week = clean_days
        rule.end_date = end_date
        db.commit()
        return {
            "frequency": rule.frequency,
            "interval": rule.interval,
            "days_of_week": rule.days_of_week,
            "end_date": rule.end_date,
        }

    @staticmethod
    def create_persisted_poll(
        event_id: int, access_token: str, question: str, options: list[str], category: str, db: Session
    ) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        AaronSchedulingAndPollService._access_role(event, access_token, db)
        draft = AaronSchedulingAndPollService.create_event_poll(question, options, category)
        poll = AaronPoll(
            event_id=event.id,
            question=draft["question"],
            category=draft["category"],
            options=list(draft["tally"].keys()),
        )
        db.add(poll)
        db.commit()
        db.refresh(poll)
        return AaronSchedulingAndPollService._poll_out(poll)

    @staticmethod
    def vote_in_poll(
        event_id: int, poll_id: int, voter_name: str, option: str, db: Session
    ) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        poll = db.query(AaronPoll).filter(
            AaronPoll.id == poll_id, AaronPoll.event_id == event.id
        ).first()
        if poll is None:
            raise LookupError("Poll not found.")
        clean_name = voter_name.strip()
        if not clean_name:
            raise ValueError("Voter name is required.")
        if option not in poll.options:
            raise ValueError("Choose one of the poll's listed options.")
        voter_key = AaronSchedulingAndPollService._token_hash(clean_name.casefold())
        vote = db.query(AaronPollVote).filter(
            AaronPollVote.poll_id == poll.id,
            AaronPollVote.voter_key == voter_key,
        ).first()
        if vote is None:
            vote = AaronPollVote(poll_id=poll.id, voter_key=voter_key, option=option)
            db.add(vote)
        else:
            vote.option = option
        db.commit()
        db.refresh(poll)
        return AaronSchedulingAndPollService._poll_out(poll)

    @staticmethod
    def record_participant(event_id: int, name: str, response: str, db: Session) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        clean_name = name.strip()
        clean_response = response.strip().upper()
        if not clean_name:
            raise ValueError("Participant name is required.")
        if clean_response not in ("GOING", "MAYBE", "NOT_GOING"):
            raise ValueError("Response must be GOING, MAYBE, or NOT_GOING.")
        participant = db.query(AaronParticipant).filter(
            AaronParticipant.event_id == event.id,
            AaronParticipant.name.ilike(clean_name),
        ).first()
        if participant is None:
            participant = AaronParticipant(event_id=event.id, name=clean_name, response=clean_response)
            db.add(participant)
        else:
            participant.response = clean_response
            participant.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"name": participant.name, "response": participant.response}

    @staticmethod
    def create_persisted_backup(event_id: int, access_token: str, db: Session) -> dict:
        event = AaronSchedulingAndPollService._event_or_404(event_id, db)
        AaronSchedulingAndPollService._access_role(event, access_token, db)
        snapshot = AaronSchedulingAndPollService.event_out(event)
        snapshot["event_id"] = snapshot.pop("id")
        return AaronSchedulingAndPollService.create_event_backup(snapshot)

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
    def expand_weekly_recurrence(
        start_date_str: str,
        frequency: str,
        interval: int,
        days_of_week: list[str],
        occurrences: int,
    ) -> list[str]:
        if occurrences < 1 or occurrences > 52:
            raise ValueError("Invalid recurrence count: must be between 1 and 52.")
        if interval < 1 or interval > 52:
            raise ValueError("Interval must be between 1 and 52.")
        clean_frequency = frequency.upper()
        if clean_frequency not in ("WEEKLY", "BIWEEKLY"):
            raise ValueError("Frequency must be WEEKLY or BIWEEKLY.")
        weekday_codes = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
        selected = {weekday_codes[day.upper()] for day in days_of_week if day.upper() in weekday_codes}
        if not selected:
            raise ValueError("Select at least one valid weekday.")
        try:
            start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except (TypeError, ValueError) as exc:
            raise ValueError("Start date must use YYYY-MM-DD format.") from exc
        week_step = interval * (2 if clean_frequency == "BIWEEKLY" else 1)
        dates: list[str] = []
        candidate = start
        while len(dates) < occurrences:
            week_offset = (candidate - start).days // 7
            if week_offset % week_step == 0 and candidate.weekday() in selected:
                dates.append(candidate.isoformat())
            candidate += timedelta(days=1)
        return dates

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
