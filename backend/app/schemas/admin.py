from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SystemStatusOut(BaseModel):
    status: str  # 'online' or 'maintenance'
    active_connections: int
    total_users: int
    total_events: int
    total_rsvps: int
    db_path: str
    server_time: datetime
    uptime_since: datetime


class AdminUserOut(BaseModel):
    id: int
    name: str
    phone_masked: str
    is_admin: bool
    events_count: int
    created_at: datetime


class AdminEventOut(BaseModel):
    id: int
    title: str
    status: str
    creator_name: str
    created_at: datetime
    respondents_count: int


class PowerTogglePayload(BaseModel):
    power_on: bool
