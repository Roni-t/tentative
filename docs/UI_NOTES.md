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

## Cursor smoke

`FluidTrail.tsx` is a small fluid simulation that runs on the GPU (WebGL2). Moving the cursor pushes the fluid and adds a little dye, which swirls and slowly fades, so the cursor leaves a soft inky trail. The idea comes from the smoke effect on kuljitaujla.com, but this one is much fainter and uses cool blue and violet instead of a rainbow.

- It is only shown on the landing page and is drawn behind all page content (it is rendered in `App.tsx` next to the star field).
- The values at the top of the file control the look: `DYE_STRENGTH` (how bright), `DYE_FADE` (how fast it fades), `SWIRL` (how much it curls), `SPLAT_RADIUS` (how wide), `SPLAT_FORCE` (how hard the cursor pushes).
- Dye is scaled by how fast the cursor moves, so slow movement does not pile up into a blob.
- The simulation stops after 5 seconds without cursor movement and starts again when the cursor moves.
- The canvas is half the window size, because the smoke is soft anyway. It is rebuilt when the window is resized.
- If the browser cannot run it (no WebGL2 or float textures), `CursorTrail` falls back to `CometTrail.tsx`, a thin 2D streak. Nothing is shown on touch screens or when reduced motion is on.

## Intro

`IntroSplash.tsx` plays when the main page loads: the planet starts zoomed in on a black screen, then zooms out into its place in the hero. It takes about 2.4 seconds. Clicking, tapping, or pressing any key skips it (it fades out quickly). It plays whenever the page is loaded or refreshed while on the main page, and not when you click back to the main page from another page (`utils/intro.ts` keeps track of this). It is skipped for reduced motion.

How it stays smooth (an earlier version flashed black):
- The intro is drawn on the document body, so it covers the top bar too.
- The black screen fades out while the planet settles, so the real page (stars, top bar) is visible behind it.
- When the planet is almost in place, the real hero planet and text start fading in underneath. The intro's planet stays fully visible until the real one is fully there in exactly the same spot, and is then removed. Fading both at once made the planet dim in the middle.
- `scrollbar-gutter: stable` keeps the page from shifting sideways when scrolling is turned off during the intro.
- The cursor smoke only starts after the intro ends, so setting up WebGL does not cause a stutter.

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
- **Saved availability coming back at the wrong time:** reopening the paint page showed 3 PM to 5 PM selected instead of what was saved, because the server sends times without a `Z` (SQLite drops it) and the browser read them as local time. `api/client.ts` now adds the `Z` to every date-time string from the server (`markUtc`), which also fixed comment times and every other timestamp. The availability endpoint also returns UTC times now.
- **Finalized time shown in the wrong hour:** the server sent finalized times without a UTC marker (like `2026-11-29T20:30:00`), so the browser read them as its own local time. Event times from `routers/events.py` are now marked as UTC (they end in Z).
- **Recurrence preview:** it showed hard-coded September dates. It now starts from the event's finalized day (or first candidate day) and follows the chosen days and frequency.
- **Default dates:** the create page now starts with the current week, Monday through Sunday.
- **Reply button:** it used `bg-cosmic-purple` with white text, but that color is white in this theme, so the text could not be seen. It is now a white button with black text.
- **Landing page after leaving a long page:** the scroll reset on every route change was a smooth scroll, and the landing hero fades out based on scroll position, so the hero could look missing while it scrolled. The reset is now instant and runs when the route changes. The logo only scrolls smoothly when you are already on the landing page.
- **Availability grid:** painted cells just say "Available", centered. empty cells are now visible and the day columns fill the width.
- **Local database:** there are no migrations. After pulling model changes, run `docker compose down -v` to reset the local database.

## General cleanup

- **Plain wording:** space jargon in the interface was replaced with plain words, for example "New Orbit" is now "New event", "Manage Orbit" is "Manage event", "Rotate Token" is "Make new link", "Lost in Deep Space" is "Page not found", and "Consensus Blocks" is "Best times". The space look stays, and the main page tagline is still "Group scheduling in perfect orbit".
- **Next steps for hosts:** the event page shows a short three-step guide (add invitees, wait for responses, pick the best time) while an event is collecting responses.
- **Main page:** a short welcoming line under the tagline explains what the app does and that guests do not need an account.
- **Readability:** the smallest text (`text-xs`) is 13px instead of 12px, and form fields are a little bigger (`index.css`).
- **Small things:** "1 day" and "1 participant" use the singular.
- **Calendar export is back:** the finalized banner on the event page has Download .ics and Google Calendar buttons (see the README). The first version was removed earlier. This one only works for finalized events, because the old one made an entry for "now" when an event had no final time.

## Create event survey

- **One step at a time:** creating an event is now a five screen survey (Details, Dates, Times, Options, Review) instead of one long form. Each screen slides in from the right when you continue and from the left when you go back, with a progress bar on top. Pressing Enter also continues.
- **Checks per step:** the title is required, at least one date has to be picked, and the latest time has to be after the earliest. A short message explains what is missing and the screen does not move on.
- **Dates:** a tap-to-select month calendar with "This week", "Next week" and "Clear" shortcuts. The current week (Monday to Sunday) is still selected by default.
- **Options:** the reply deadline, capacity limit, link expiry and surprise mode live on their own screen, which can be skipped.
- **Review:** a summary of every answer with an Edit link that jumps back to that screen.
- **Phones:** inputs are 16px below 640px wide so iOS does not zoom in when one is focused, and the buttons are large enough to tap.
