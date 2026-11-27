// Where to send someone after they sign in. "next" comes from the URL, so only same-site paths are allowed.
export const safeNext = (next: string | null | undefined): string | null =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;

export const loginPath = (next: string) => `/login?next=${encodeURIComponent(next)}`;
