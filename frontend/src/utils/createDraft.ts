import { safeNext } from './authRedirect';
// Keeps the answers from the create event survey, so they are not lost if the page is refreshed or
// the person has to sign in before creating the event. It lives in sessionStorage, so it goes away
// when the tab is closed.

const KEY = 'tentative_create_draft';

export interface CreateDraft {
  step: number;
  title: string;
  description: string;
  location: string;
  timezone: string;
  candidateDates: string[];
  dailyStartTime: string;
  dailyEndTime: string;
  slotDuration: number;
  deadline: string;
  capacityLimit: string;
  isHiddenDetails: boolean;
}

export const loadDraft = (): CreateDraft | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CreateDraft) : null;
  } catch {
    return null;
  }
};

// Nothing is saved until the person has typed something, so just opening the page leaves no draft
export const saveDraft = (draft: CreateDraft) => {
  const hasContent = draft.title.trim() || draft.description.trim() || draft.location.trim();
  try {
    if (hasContent) sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage can be full or blocked. The survey still works without a draft.
  }
};

export const clearDraft = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

// Where to go after signing in or creating an account: the page that asked for it,
// then the survey if there is a draft in it, then the dashboard
export const afterAuthPath = (next?: string | null) => safeNext(next) ?? (loadDraft() ? '/create' : '/events');
