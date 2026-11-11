# 🪐 Tentative — Group Scheduling Web App

> **"Find the time. Anywhere in the galaxy."**
> A modern group scheduling platform designed with deep-space aesthetics and Apple-smooth micro-interactions.

---

## 📋 Overview

Tentative solves the coordination challenge of scheduling meetings across conflicting calendars. A host schedules an event with candidate dates, slot lengths, and daily windows. Invitees open a shared, unguessable cryptographic link and paint their availability without needing an account. The platform aggregates all responses into an instant, color-coded overlap heatmap that highlights optimal meeting slots. The host then finalizes the time, exports standard `.ics` / Google Calendar invites, and notifies participants.

Based on the **UT Dallas CS 3354 Fall 2026 Software Engineering Specification** by Asher, Dhaliwal, Hines, Hunt, Nguyen, Pundir, and Ribakoff.

---

## 🏗️ Architecture & Layered Design

Tentative strictly adheres to the 4-tier layered architecture specified in the engineering document:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Layer 1: Web Client (React 18 + TS)                  │
│   LandingPage · AuthPages · EventDashboard · AvailabilityGrid ·        │
│   HeatmapGrid · FinalizePage · RsvpReview · Discussion · AdminConsole │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Layer 2: API Layer (FastAPI Routers)                  │
│   /api/auth · /api/events · /api/share · /api/rsvp · /api/comments ·   │
│   RateLimiter · SessionMiddleware · AdminGuard · OpenAPI docs          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 Layer 3: Services (Business Logic)                     │
│   AuthService · EventService · HeatmapService · RsvpService ·          │
│   NotificationService · ShareLinkService · RecurrenceService           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               Layer 4: Infrastructure & Adapters                       │
│   SQLAlchemy 2.x Repositories · Fernet PhoneEncryptor ·                 │
│   Console / Twilio SMS Adapter · RFC 5545 IcsExporter · Scheduler Job  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

Run the entire stack in one command using Docker Compose:

```bash
docker compose up --build
```

The web application is exposed at **[http://localhost:8080](http://localhost:8080)**.
- **Frontend App**: `http://localhost:8080`
- **Backend API & Swagger Docs**: `http://localhost:8080/api/docs`

---

## 🔑 Environment Variables

The project includes ready-to-run defaults in `docker-compose.yml` and `.env.example`.

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:////app/data/tentative.db` | SQLite database file persisted on Docker volume |
| `SECRET_KEY` | `tentative-celestial-production-secret-key-2026` | Key for signing JWT session tokens |
| `FERNET_KEY` | `dGVudGF0aXZlLWZlcm5ldC1zZWNyZXQtMzItYnl0ZXMh` | 32 url-safe base64 bytes for encrypting phone numbers at rest |
| `PHONE_HASH_SALT` | `tentative_space_salt_2026` | Salt for deterministic phone lookup hashes |
| `SMS_PROVIDER` | `console` | `console` logs codes & surfaces dev banner; `twilio` sends live SMS |
| `TWILIO_ACCOUNT_SID` | `""` | Twilio Account SID (when `SMS_PROVIDER=twilio`) |
| `TWILIO_AUTH_TOKEN` | `""` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | `""` | Twilio From Phone Number |
| `DEFAULT_SEMESTER_END_DATE` | `2026-12-18` | Default link expiration date for fall semester |
| `ADMIN_NAME` | `Admin Commander` | Pre-seeded administrator account name |
| `ADMIN_PHONE` | `+19725550100` | Pre-seeded administrator phone number |
| `SEED_ON_STARTUP` | `true` | Pre-populates 8 participants and demo event |

---

## 🚀 2-Minute Demo Script

Follow these steps to experience all 15 use cases in 2 minutes:

### 1. View the Landing Page & Celestial Hero
1. Navigate to `http://localhost:8080`.
2. Notice the dark celestial starfield, ambient drifting nebula glow, the central 3D-styled animated planet with tilted orbital rings, and floating frosted-glass chips (`7 of 8 responded`, `Best overlap: Wed 2–3 PM`).

### 2. Explore the Pre-Seeded Heatmap (UC-14)
1. Click **"View Demo Heatmap"** on the hero (or click "Demo Heatmap" in the nav).
2. The page loads the "Software Engineering Team Meeting" with **8 seeded participants** (Alex Morgan, Jamie Chen, Priya Shah, Daniel Kim, Sofia Patel, Marcus Lee, Emma Wilson, Noah Davis).
3. Hover/click over **Wednesday Sep 16, 2:00 PM – 3:00 PM**:
   - The cell radiates in intense cosmic purple/cyan glow.
   - The sidebar displays **7 of 8 participants available**: Alex, Jamie, Priya, Daniel, Sofia, Marcus, Emma.
   - Notice the unresponded/busy attendee: Noah Davis.
4. Toggle to the **"Ranked List"** view to verify screen-reader accessible alternatives.

### 3. Passwordless SMS Host Login (UC-1, UC-2)
1. In the top-right nav, click **"Sign in"**.
2. Enter the host demo phone: `+1 (972) 555-0142` and submit.
3. Observe the **Dev SMS Dispatch floating banner** in the bottom-left corner with the generated 6-digit code.
4. Click **"Use code"** to auto-fill the code and enter the orbit as **Kaelan Nguyen**.

### 4. Review RSVP & FIFO Waitlist Auto-Promotion (UC-5, UC-9, UC-10)
1. Go to **"RSVP List"** for the meeting.
2. Notice the counter: **3 Going**, **2 Maybe**, **1 Not Going**, **1 Waitlisted** (Capacity Limit is set to 3).
   - Alex, Jamie, Priya are **Going**.
   - Emma Wilson is **Waitlisted (Rank #1)**.
3. Test FIFO promotion:
   - In the RSVP form, select **"Alex Morgan"** and change status from **Going** to **Not Going**.
   - Spot opens up! Immediately, **Emma Wilson is auto-promoted** to **Going**, and a notification is dispatched!
4. Click **"Export CSV"** to download `tentative-rsvps-1.csv`.

### 5. Finalize the Meeting & Calendar Sync (UC-8, UC-15)
1. Click **"Heatmap"**, select the top recommended slot (Wed 2:00–3:00 PM), and click **"Lock In & Finalize This Time"**.
2. Review the confirmation panel, leave "Notify all participants via SMS alert" checked, and click **"Confirm & Finalize Orbit"**.
3. The event status updates to **Finalized**.
4. Test calendar integration:
   - Click **"Export .ics"** to download RFC 5545 calendar file.
   - Click **"Google Calendar"** to see pre-filled event link.

### 6. Share Link Rotation & Expiration (UC-7)
1. Click **"Share & Expiry Link"**.
2. Click **"Rotate Token"**. Notice the share token changes immediately and the old link dies.
3. Visiting an expired token routes to the friendly **"This orbit has ended"** page.

### 7. Event Discussion & Inquiries (UC-13)
1. Click **"Discussion & Inquiries"**.
2. See existing attendee questions and host answers.
3. Post a new question ("Is attendance mandatory?") and reply to it in real-time.

### 8. Admin Console (UC-6)
1. Log in with admin phone `+19725550100` (code in dev banner).
2. Visit **"Admin"** in the nav.
3. View server uptime telemetry, database path, active events, and account management tools.

---

## 🧪 Running Automated Tests

To execute the backend test suite covering verification codes, URL rotation, heatmap overlap algorithms, and FIFO waitlist promotions:

```bash
# Inside docker
docker compose exec backend pytest

# Or locally (with backend dependencies installed)
cd backend && pytest
```

---

## 📂 Project Structure

```
tentative/
├── docker-compose.yml          # Container orchestration (port 8080)
├── .env.example                # Sample environment configuration
├── Makefile                    # Developer shortcuts
├── README.md                   # Documentation & demo script
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── config.py           # Settings & Pydantic config
│   │   ├── database.py         # SQLAlchemy engine & SQLite session
│   │   ├── main.py             # FastAPI entrypoint, CORS, lifespan
│   │   ├── seed.py             # 8-participant demo seed
│   │   ├── core/
│   │   │   ├── encryption.py   # Fernet cipher & phone hashing
│   │   │   ├── security.py     # JWT & cryptographically secure tokens
│   │   │   ├── rate_limiter.py # Sliding-window rate limiter
│   │   │   └── dependencies.py # Auth and admin route guards
│   │   ├── models/             # User, Event, Availability, RSVP, etc.
│   │   ├── schemas/            # Pydantic input/output contracts
│   │   ├── adapters/
│   │   │   ├── sms_adapter.py  # Console & Twilio SMS adapters
│   │   │   ├── ics_exporter.py # RFC 5545 iCalendar & Google links
│   │   │   └── scheduler.py    # Background cleanup for expired URLs
│   │   ├── services/           # Core domain logic
│   │   └── routers/            # Clean REST API endpoints
│   └── tests/                  # Pytest test suite
└── frontend/
    ├── Dockerfile              # Multi-stage build (Node 20 -> Nginx)
    ├── nginx.conf              # SPA routing + API reverse proxy
    ├── package.json
    ├── tailwind.config.js      # Deep space theme & glow shadows
    └── src/
        ├── App.tsx             # React router & global shell
        ├── components/         # HeroPlanet, HeatmapGrid, StarField, etc.
        ├── context/            # AuthContext & ToastContext
        ├── pages/              # 16 complete responsive views
        └── utils/              # Timezone & date formatters
```
