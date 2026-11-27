# Tentative

A group scheduling web app. A host creates an event with candidate dates, then sends each invitee a personal link. Invitees paint when they are free, and the app shows a heatmap of the best times. The host picks a time and finalizes it.

Built for UT Dallas CS 3354 (Fall 2026).

## How invites work

- The host adds invitees by name. Each invitee gets their own unique link.
- The host sends the link from their own phone with the Share button (phone share sheet) or the Copy button (copies the message and link).
- A general group link also exists. Anyone who opens it types their name and shows up on the list as "joined via link".
- Invitees do not need an account. Their link lets them respond and edit later.
- After responding, an invitee can enter a phone number to get texts. We text a code to check the number, then create their account. Only verified numbers get reminders and the final time.
- The invitee list shows whether each person responded and whether we can text them. It never shows phone numbers.

## Calendar export

Once an event is finalized, the event page shows two buttons for everyone who opens it:

- **Download .ics** gives a calendar file that works in Apple Calendar, Google Calendar and Outlook (`GET /api/events/{id}/export.ics`).
- **Google Calendar** opens Google Calendar with the event filled in (`GET /api/events/{id}/google-calendar-url`).

Both return an error until the event has a final time. The code is in `backend/app/adapters/calendar_export.py`.

## Run it

You need Docker.

```bash
cp .env.example .env
docker compose up --build
```

- App: http://localhost:8080
- API docs: http://localhost:8080/api/docs

Set `SMS_PROVIDER=console` in `.env` to skip Twilio. Codes then show up in the dev banner and the backend log.

The project has no database migrations. If the tables change (for example after pulling new models), reset the local database with `docker compose down -v` and start again. This deletes the local demo data.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite database path |
| `SECRET_KEY` | Signs login tokens |
| `FERNET_KEY` | Encrypts phone numbers in the database |
| `PHONE_HASH_SALT` | Salt for the phone lookup hash |
| `SMS_PROVIDER` | `console` (log only) or `twilio` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Twilio settings, only needed when `SMS_PROVIDER=twilio` |
| `PUBLIC_APP_URL` | Base URL used in links inside texts |
| `SEED_ON_STARTUP` | Adds demo data when `true` |
| `ADMIN_NAME`, `ADMIN_PHONE` | Admin account created at startup |

## Quick tour

1. Open the home page and click "View demo heatmap" to see seeded data with 8 participants.
2. Click "Get started" and log in with a phone number. In console mode the code appears in the dev banner.
3. Create an event, open it, and add invitees in the Invitees section. Use Share or Copy to send each link.
4. Open an invitee link in a private window, paint availability, and save. You will be asked if you want a text when the time is set.
5. Back on the event page, the list shows that invitee as responded.
6. Open the heatmap, pick the best slot, and finalize. Invitees with verified numbers get a text.

## Tests

```bash
cd backend
pip install -r requirements.txt pytest
pytest
```

Some older UC-14 and UC-15 tests and one FR-22 test fail because teammates' branches were merged with different login and finalize rules. They are not related to the invite flow.

## Project layout

```
backend/app/
  main.py          app setup
  config.py        settings from .env
  database.py      database connection
  models/          database tables
  schemas/         request and response shapes
  routers/         API routes
  services/        main logic
  adapters/        SMS sending and the cleanup job
  core/            security, phone encryption, rate limiting
backend/tests/     pytest tests
frontend/src/
  pages/           one file per page
  components/      shared pieces (heatmap, grid, invitee list)
  context/         login and toast state
  api/client.ts    all API calls
```
