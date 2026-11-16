from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.availability import Availability
from app.models.event import Event
from app.schemas.availability import HeatmapResponse, HeatmapSlotOut


class HeatmapService:
    def __init__(self):
        # UC-14 (Divyam): each cache entry remembers which event it was built for
        # (its created_at), so a deleted event's heatmap is never served again,
        # even if SQLite reuses the same event ID for a new event.
        self._cache: Dict[int, Tuple[datetime, HeatmapResponse]] = {}

    def invalidate_cache(self, event_id: int):
        self._cache.pop(event_id, None)

    def calculate_heatmap(self, event_id: int, db: Session, force_refresh: bool = False) -> HeatmapResponse:
        # UC-14 (Divyam): always confirm the event still exists before using the cache.
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            self.invalidate_cache(event_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        cached = self._cache.get(event_id)
        if not force_refresh and cached and cached[0] == event.created_at:
            return cached[1]

        # Fetch all availability entries
        availabilities = db.query(Availability).filter(Availability.event_id == event_id).all()

        # Identify distinct respondents
        respondents_map: Dict[str, str] = {}  # edit_token -> participant_name
        participant_slots_map: Dict[str, List[Tuple[datetime, datetime]]] = {}

        for a in availabilities:
            respondents_map[a.edit_token] = a.participant_name
            if a.edit_token not in participant_slots_map:
                participant_slots_map[a.edit_token] = []
            
            # Ensure UTC timezone
            st = a.start_time.replace(tzinfo=timezone.utc) if a.start_time.tzinfo is None else a.start_time.astimezone(timezone.utc)
            et = a.end_time.replace(tzinfo=timezone.utc) if a.end_time.tzinfo is None else a.end_time.astimezone(timezone.utc)
            participant_slots_map[a.edit_token].append((st, et))

        total_respondents = len(respondents_map)
        all_participant_names = sorted(list(set(respondents_map.values())))

        # Parse daily window
        try:
            start_hour, start_min = map(int, event.daily_start_time.split(":"))
            end_hour, end_min = map(int, event.daily_end_time.split(":"))
        except Exception:
            start_hour, start_min = 9, 0
            end_hour, end_min = 21, 0

        slot_delta = timedelta(minutes=max(15, event.slot_duration_minutes or 30))

        # Generate canonical slots across candidate dates
        grid_slots: List[HeatmapSlotOut] = []

        for date_str in (event.candidate_dates or []):
            try:
                y, m, d = map(int, date_str.split("-"))
            except Exception:
                continue

            current_slot_start = datetime(y, m, d, start_hour, start_min, tzinfo=timezone.utc)
            day_slot_end = datetime(y, m, d, end_hour, end_min, tzinfo=timezone.utc)

            while current_slot_start + slot_delta <= day_slot_end:
                current_slot_end = current_slot_start + slot_delta
                
                # Check who is available during this slot
                available_tokens: Set[str] = set()
                for token, ranges in participant_slots_map.items():
                    for r_start, r_end in ranges:
                        # If respondent availability covers or overlaps this slot
                        if r_start <= current_slot_start and r_end >= current_slot_end:
                            available_tokens.add(token)
                            break
                        # Also count if slot midpoint falls within availability
                        midpoint = current_slot_start + (slot_delta / 2)
                        if r_start <= midpoint <= r_end:
                            available_tokens.add(token)
                            break

                avail_names = sorted([respondents_map[t] for t in available_tokens])
                unavail_names = sorted([name for name in all_participant_names if name not in avail_names])

                count = len(avail_names)
                ratio = (count / total_respondents) if total_respondents > 0 else 0.0

                grid_slots.append(HeatmapSlotOut(
                    start_time=current_slot_start,
                    end_time=current_slot_end,
                    count=count,
                    total_participants=total_respondents,
                    ratio=round(ratio, 3),
                    available_participants=avail_names,
                    unavailable_participants=unavail_names
                ))

                current_slot_start = current_slot_end

        # Determine best slots (slots with count > 0, ranked descending by count)
        best_slots = sorted(
            [s for s in grid_slots if s.count > 0],
            key=lambda x: (x.count, -x.start_time.timestamp()),
            reverse=True
        )[:5]

        response = HeatmapResponse(
            event_id=event.id,
            total_respondents=total_respondents,
            respondent_names=all_participant_names,
            slots=grid_slots,
            best_slots=best_slots,
            cached_at=datetime.now(timezone.utc)
        )

        self._cache[event_id] = (event.created_at, response)
        return response


heatmap_service = HeatmapService()
