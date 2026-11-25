# UI and time zone notes

This file explains the design choices and fixes in the `Ronit-Dev` branch so the team knows why things look and work the way they do.

## Look and feel

- **Theme:** black space background with a star field. Everything is black, white and gray. The only color is a little green or red for status.
- **Fonts:** Instrument Sans for text, IBM Plex Mono for small labels and times, Instrument Serif (italic) for big section headings on the landing page.
- **Surfaces:** cards and panels (`glass-panel`, `glass-card` in `index.css`) are plain dark raised surfaces with a thin border. They do not use blur.
- **Top bar:** it slides away when you scroll down and comes back when you scroll up, with a dark fade behind it, so it does not sit on top of page content.
- **Liquid glass:** only the top bar uses it (`glass-pill-nav` in `index.css`). It has a translucent fill, a heavy blur, bright edges, and a shine that follows the cursor. The shine is set by `useGlassShine` in `App.tsx`.
- **Buttons:** `pill pill-light` (white) and `pill pill-dark` (dark outline) are the two button styles for the landing page. Other pages keep their own Tailwind button classes.
- **Reveal on scroll:** the `Reveal` component fades content in once. The landing page planet drifts up and fades as you scroll.
- **Reduced motion:** animations are turned down for people who ask for it in their system settings.

## Cursor comet

`CometTrail.tsx` draws a faint streak behind the cursor. It is only shown on the landing page and is drawn behind all page content (it is rendered in `App.tsx` next to the star field). It is skipped on touch screens and when reduced motion is on. The old glow around the cursor was removed.

## Intro

`IntroSplash.tsx` plays when the main page loads: the planet starts zoomed in on a black screen, then zooms out into its place in the hero while the black fades away. The hero text appears after it. It plays whenever the page is loaded or refreshed while on the main page, and not when you click back to the main page from another page. It is skipped for reduced motion. It is drawn on the document body so it covers the top bar.

## Rocket launch

When a host finalizes an event, `RocketLaunch.tsx` plays a countdown, a plain white rocket lifts off with a flame and smoke, then the finalized time is shown. The finalize page waits `ROCKET_LAUNCH_MS` (5.2 seconds) before going back to the event page.

## Demo

The demo event (share link `demo-orbit-2026`) belongs to a seeded host, so a normal finalize would be rejected for everyone else. In the demo, the heatmap shows the finalize buttons to everyone, and the finalize page (`/share/demo-orbit-2026/finalize`) plays the rocket without calling the server. A note on the page says nothing is saved. The token is in `utils/demo.ts`.

## Heatmap layout

Columns are narrower (`min-w-[5.5rem]`) so a five-day event fits next to the inspector. The inspector moves below the grid on screens narrower than the `xl` breakpoint. Cells with no responses are left blank instead of showing 0/0.

## Time zones

Event dates and the daily window (for example 12:00 to 17:00) are wall-clock times in the event's own time zone. They used to be treated as UTC, which made the heatmap show the wrong hours and could move columns to the wrong day for some viewers.

- **Backend:** `heatmap_service.py` and the finalize check in `event_service.py` convert each day's window from the event's time zone to UTC.
- **Frontend:** `utils/zoned.ts` converts a date and time in the event's zone to a real instant (used by the availability grid when saving) and shows times in the event's zone (used by the heatmap, finalize page and event page). A viewer in another time zone sees the same hours and the same days.
- **Tests:** older tests that used UTC window times now set `"timezone": "UTC"` on their events. `test_fr16_22.py` has new tests for the Chicago window.

## Fixes

- **Stars after resizing:** the star field was built once for the starting window size. It now refits when the window changes size and keeps the same density.
- **Page widths:** page wrappers use `mx-auto` inside a flex column, which shrank each page to its content. `.route-view > *` in `index.css` makes them fill their max width.
- **Events page redirect:** `/events` sent logged-in users to the login page on a fresh load, because it checked for a user before the login check finished. It now waits.
- **Blank screen when clicking between pages:** the route change used to fade the old page out before fading the new one in, so the screen was close to blank for about 0.7 seconds on every click, and clicking fast made it worse. The new page now replaces the old one immediately and fades in (`AnimatedRoutes` in `App.tsx`).
- **Finalized time shown in the wrong hour:** the server sent finalized times without a UTC marker (like `2026-11-29T20:30:00`), so the browser read them as its own local time. Event times from `routers/events.py` are now marked as UTC (they end in Z).
- **Recurrence preview:** it showed hard-coded September dates. It now starts from the event's finalized day (or first candidate day) and follows the chosen days and frequency.
- **Default dates:** the create page now starts with the current week, Monday through Sunday.
- **Reply button:** it used `bg-cosmic-purple` with white text, but that color is white in this theme, so the text could not be seen. It is now a white button with black text.
- **Landing page after leaving a long page:** the scroll reset on every route change was a smooth scroll, and the landing hero fades out based on scroll position, so the hero could look missing while it scrolled. The reset is now instant and runs when the route changes. The logo only scrolls smoothly when you are already on the landing page.
- **Availability grid:** empty cells are now visible and the day columns fill the width.
- **Local database:** there are no migrations. After pulling model changes, run `docker compose down -v` to reset the local database.
