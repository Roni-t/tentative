from app.routers.auth import router as auth_router
from app.routers.events import router as events_router
from app.routers.share import router as share_router
from app.routers.availability import router as availability_router
from app.routers.rsvp import router as rsvp_router
from app.routers.admin import router as admin_router
from app.routers.bug_reports import router as bug_reports_router
from app.routers.invitees import router as invitees_router
from app.routers.groups import router as groups_router
from app.routers.aaron_router import router as aaron_router

__all__ = [
    "auth_router",
    "events_router",
    "share_router",
    "availability_router",
    "rsvp_router",
    "admin_router",
    "bug_reports_router",
    "invitees_router",
    "groups_router",
    "aaron_router",
]
