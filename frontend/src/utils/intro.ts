// Keeps track of the main page intro. It plays when the page is loaded or refreshed on the main page,
// and not when you click back to the main page from somewhere else.

export const INTRO_DONE_EVENT = 'tentative:intro-done';

// Decided once, when the page loads
let pending =
  window.location.pathname === '/' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const introIsPending = () => pending;

// Call when the intro has ended, or when the main page was left before it ended
export const markIntroDone = () => {
  if (!pending) return;
  pending = false;
  window.dispatchEvent(new Event(INTRO_DONE_EVENT));
};
