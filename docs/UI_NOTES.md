# UI and time zone notes

This file explains the design choices and fixes in the `Ronit-Dev` branch so the team knows why things look and work the way they do.

## Look and feel

- **Theme:** black space background with a star field. Everything is black, white and gray. The only color is a little green or red for status.
- **Fonts:** Instrument Sans for text, IBM Plex Mono for small labels and times, Instrument Serif (italic) for big section headings on the landing page.
- **Surfaces:** cards and panels (`glass-panel`, `glass-card` in `index.css`) are plain dark raised surfaces with a thin border. They do not use blur.
- **Liquid glass:** only the top bar uses it (`glass-pill-nav` in `index.css`). It has a translucent fill, a heavy blur, bright edges, and a shine that follows the cursor. The shine is set by `useGlassShine` in `App.tsx`.
- **Buttons:** `pill pill-light` (white) and `pill pill-dark` (dark outline) are the two button styles for the landing page. Other pages keep their own Tailwind button classes.
- **Reveal on scroll:** the `Reveal` component fades content in once. The landing page planet drifts up and fades as you scroll.
- **Reduced motion:** animations are turned down for people who ask for it in their system settings.

## Cursor comet

`CometTrail.tsx` draws a streak behind the cursor. It is only used on the landing page. It is skipped on touch screens and when reduced motion is on. The old glow around the cursor was removed.

## Rocket launch

When a host finalizes an event, `RocketLaunch.tsx` plays a countdown, a rocket lifts off with a flame and smoke, then the finalized time is shown. The finalize page waits `ROCKET_LAUNCH_MS` (5.2 seconds) before going back to the event page.

## Time zones

Event dates and the daily window (for example 12:00 to 17:00) are wall-clock times in the event's own time zone. They used to be treated as UTC, which made the heatmap show the wrong hours and could move columns to the wrong day for some viewers.

- **Backend:** `heatmap_service.py` and the finalize check in `event_service.py` convert each day's window from the event's time zone to UTC.
- **Frontend:** `utils/zoned.ts` converts a date and time in the event's zone to a real instant (used by the availability grid when saving) and shows times in the event's zone (used by the heatmap, finalize page and event page). A viewer in another time zone sees the same hours and the same days.
- **Tests:** older tests that used UTC window times now set `"timezone": "UTC"` on their events. `test_fr16_22.py` has new tests for the Chicago window.

## Fixes

- **Stars after resizing:** the star field was built once for the starting window size. It now refits when the window changes size and keeps the same density.
- **Page widths:** page wrappers use `mx-auto` inside a flex column, which shrank each page to its content. `.route-view > *` in `index.css` makes them fill their max width.
- **Events page redirect:** `/events` sent logged-in users to the login page on a fresh load, because it checked for a user before the login check finished. It now waits.
- **Landing page after leaving a long page:** the scroll reset on every route change was a smooth scroll, and the landing hero fades out based on scroll position, so the hero could look missing while it scrolled. The reset is now instant and runs after the old page has left (`onExitComplete` in `App.tsx`). The logo only scrolls smoothly when you are already on the landing page.
- **Availability grid:** empty cells are now visible and the day columns fill the width.
- **Local database:** there are no migrations. After pulling model changes, run `docker compose down -v` to reset the local database.
