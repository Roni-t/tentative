import type {
  AuthResponse,
  CodeSentResponse,
  DevSmsNotice,
  GroupInfo,
  HostUpdateResult,
  Invitee,
  RecurrenceInfo,
  RsvpPage,
  RsvpStatus,
  TimeSlot,
  User,
} from '../types';

const API_BASE = '/api';

// The server stores times in UTC but SQLite gives them back without a "Z" (like 2026-11-26T15:00:00).
// A browser reads that as local time, which shifts every time by the viewer's UTC offset.
// Add the "Z" to any date-time string that has no time zone so it is read as UTC.
const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

const markUtc = (value: any): any => {
  if (typeof value === 'string') return NAIVE_DATETIME.test(value) ? value + 'Z' : value;
  if (Array.isArray(value)) return value.map(markUtc);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = markUtc(value[key]);
    return out;
  }
  return value;
};

// Login used to be kept in localStorage, which outlives the browser session. It now lives only in
// the session cookie (which JavaScript can't read), so remove any token left from before.
try {
  localStorage.removeItem('tentative_token');
} catch {
  // storage blocked; nothing to clean up
}

class ApiClient {
  // Called when the server says the session is gone (expired or logged out elsewhere)
  private unauthorizedHandler: (() => void) | null = null;

  onUnauthorized(handler: (() => void) | null) {
    this.unauthorizedHandler = handler;
  }

  // Each event has its own token, so answering one event does not affect another
  getEditToken(eventId: number | string): string | null {
    return localStorage.getItem(`tentative_edit_token_${eventId}`);
  }

  setEditToken(eventId: number | string, token: string | null) {
    if (token) {
      localStorage.setItem(`tentative_edit_token_${eventId}`, token);
    } else {
      localStorage.removeItem(`tentative_edit_token_${eventId}`);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401) {
      this.unauthorizedHandler?.();
    }

    if (res.status === 410) {
      // Orbit expired
      const err = await res.json().catch(() => ({ detail: 'This orbit has ended.' }));
      const error: any = new Error(err.detail || 'Orbit has expired');
      error.status = 410;
      throw error;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}: ${res.statusText}` }));
      const err: any = new Error(errorData.detail || 'Request failed');
      err.status = res.status;
      throw err;
    }

    // Check if response is empty or blob/text
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return markUtc(await res.json());
    }
    return res.text() as unknown as T;
  }

  // Auth — UC-1 (account creation)
  async registerRequestCode(name: string, phone: string) {
    return this.request<CodeSentResponse>('/auth/register/request-code', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    });
  }

  async registerVerify(name: string, phone: string, code: string) {
    const data = await this.request<AuthResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ name, phone, code }),
    });
    return data;
  }

  // Auth — UC-2 (login)
  async loginRequestCode(phone: string) {
    return this.request<CodeSentResponse>('/auth/login/request-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async loginVerify(phone: string, code: string, keepSignedIn: boolean) {
    const data = await this.request<AuthResponse>('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, keep_signed_in: keepSignedIn }),
    });
    return data;
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  async logout() {
    // The server revokes the session and clears the cookie
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getDevBannerCode(phone: string) {
    return this.request<DevSmsNotice | null>(`/auth/dev-banner-code?phone=${encodeURIComponent(phone)}`);
  }

  // Events
  async createEvent(payload: any) {
    return this.request<any>('/events', { method: 'POST', body: JSON.stringify(payload) });
  }

  async listEvents() {
    return this.request<any[]>('/events');
  }

  async getEvent(id: number | string) {
    return this.request<any>(`/events/${id}`);
  }

  async updateEvent(id: number | string, payload: any) {
    return this.request<any>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async finalizeEvent(id: number | string, startTime: string, endTime: string, notify: boolean = true) {
    return this.request<any>(`/events/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ start_time: startTime, end_time: endTime, notify_participants: notify }),
    });
  }

  async cancelEvent(id: number | string) {
    return this.request<any>(`/events/${id}/cancel`, { method: 'POST' });
  }

  async deleteEvent(id: number | string) {
    return this.request<any>(`/events/${id}`, { method: 'DELETE' });
  }

  async addCoHost(id: number | string, identifier: string) {
    return this.request<any>(`/events/${id}/cohosts`, { method: 'POST', body: JSON.stringify({ identifier }) });
  }

  async blockUser(id: number | string, identifier: string) {
    return this.request<any>(`/events/${id}/block`, { method: 'POST', body: JSON.stringify({ identifier }) });
  }

  async getChangelog(id: number | string) {
    return this.request<any[]>(`/events/${id}/changelog`);
  }

  // NF-10 Import availability from an external calendar file (Reese)
  async importCalendar(eventId: number | string, icsText: string) {
    return this.request<{ busy_events_found: number; total_slots: number; free_slots: TimeSlot[] }>(
      `/events/${eventId}/availability/import-ics`,
      { method: 'POST', body: JSON.stringify({ ics_text: icsText }) },
    );
  }

  // FR-24 Group share links (Daniel)
  async listGroups() {
    return this.request<GroupInfo[]>('/groups');
  }

  async createGroup(name: string, eventIds: number[]) {
    return this.request<GroupInfo>('/groups', { method: 'POST', body: JSON.stringify({ name, event_ids: eventIds }) });
  }

  async rotateGroupLink(groupId: number) {
    return this.request<GroupInfo>(`/groups/${groupId}/share/rotate`, { method: 'POST' });
  }

  async openGroupLink(token: string) {
    return this.request<GroupInfo>(`/share/group/${token}`);
  }

  // UC-11 Recurring events (FR-1, Aaron)
  async getRecurrence(id: number | string) {
    return this.request<RecurrenceInfo>(`/events/${id}/recurrence`);
  }

  async setRecurrence(id: number | string, frequency: string, daysOfWeek: string[], endDate: string) {
    return this.request<RecurrenceInfo>(`/events/${id}/recurrence`, {
      method: 'PUT',
      body: JSON.stringify({ frequency, days_of_week: daysOfWeek, end_date: endDate }),
    });
  }

  async removeRecurrence(id: number | string) {
    return this.request<RecurrenceInfo>(`/events/${id}/recurrence`, { method: 'DELETE' });
  }

  async getGoogleCalendarUrl(id: number | string) {
    return this.request<{ url: string }>(`/events/${id}/google-calendar-url`);
  }

  // Share
  async resolveShareToken(token: string) {
    return this.request<any>(`/share/${token}`);
  }

  // The group link for "Copy group link". An expired one is replaced with a new link (DEV-172).
  async getGroupLink(eventId: number | string) {
    return this.request<{ token: string; expires_at: string }>(`/events/${eventId}/group-link`, { method: 'POST' });
  }

  // FR-19: text an update to every invitee who gets texts. With preview, nothing is sent.
  async sendHostUpdate(eventId: number | string, message: string, preview: boolean) {
    return this.request<HostUpdateResult>(`/events/${eventId}/updates${preview ? '?preview=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Which RSVP link is this viewer's, for the event page's "Submit RSVP" card
  async getMyRsvp(eventId: number | string) {
    const token = this.getEditToken(eventId);
    return this.request<{ token: string | null }>(
      `/events/${eventId}/my-rsvp${token ? `?token=${encodeURIComponent(token)}` : ''}`
    );
  }

  // Invitees
  async listInvitees(eventId: number | string) {
    return this.request<Invitee[]>(`/events/${eventId}/invitees`);
  }

  async addInvitee(eventId: number | string, name: string) {
    return this.request<Invitee>(`/events/${eventId}/invitees`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async newInviteeLink(eventId: number | string, inviteeId: number) {
    return this.request<Invitee>(`/events/${eventId}/invitees/${inviteeId}/new-link`, { method: 'POST' });
  }

  async requestInviteePhoneCode(token: string, phone: string) {
    return this.request<CodeSentResponse>(`/invite/${token}/phone/request-code`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyInviteePhone(token: string, phone: string, code: string) {
    return this.request<{ message: string; account_created: boolean }>(`/invite/${token}/phone/verify`, {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  // Availability & Heatmap
  async submitAvailability(eventId: number | string, participantName: string, slots: { start_time: string; end_time: string }[], editToken?: string) {
    const data = await this.request<any>(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ participant_name: participantName, edit_token: editToken || this.getEditToken(eventId), slots }),
    });
    if (data.edit_token) {
      this.setEditToken(eventId, data.edit_token);
    }
    return data;
  }

  async getMyAvailability(eventId: number | string, editToken?: string) {
    const token = editToken || this.getEditToken(eventId);
    return this.request<{ start_time: string; end_time: string }[]>(`/events/${eventId}/availability/me${token ? `?edit_token=${token}` : ''}`);
  }

  async getHeatmap(eventId: number | string, refresh: boolean = false) {
    return this.request<any>(`/events/${eventId}/heatmap${refresh ? '?refresh=true' : ''}`);
  }

  // RSVP through an invitee's RSVP link (DEV-167)
  async getRsvp(token: string) {
    return this.request<RsvpPage>(`/rsvp/${encodeURIComponent(token)}`);
  }

  async submitRsvp(token: string, status: RsvpStatus) {
    return this.request<RsvpPage>(`/rsvp/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Admin
  async getAdminStatus() {
    return this.request<any>('/admin/status');
  }

  async togglePower(powerOn: boolean) {
    return this.request<any>('/admin/power', { method: 'POST', body: JSON.stringify({ power_on: powerOn }) });
  }

  async listAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async deleteAdminUser(id: number) {
    return this.request<any>(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async listAdminEvents() {
    return this.request<any[]>('/admin/events');
  }

  async deleteAdminEvent(id: number) {
    return this.request<any>(`/admin/events/${id}`, { method: 'DELETE' });
  }

  async listAaronPolls(eventId: number | string) {
    return this.request<any[]>(`/aaron/events/${eventId}/polls`);
  }

  async createAaronPoll(eventId: number | string, question: string, category: string, options: string[]) {
    return this.request<any>(`/aaron/events/${eventId}/polls`, {
      method: 'POST', body: JSON.stringify({ question, category, options }),
    });
  }

  async voteAaronPoll(eventId: number | string, pollId: number, option: string) {
    return this.request<any>(`/aaron/events/${eventId}/polls/${pollId}/votes`, {
      method: 'POST', body: JSON.stringify({ option }),
    });
  }

  async downloadAaronBackup(eventId: number | string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/aaron/events/${eventId}/backup.json`, { credentials: 'include' });
    if (res.status === 401) {
      this.unauthorizedHandler?.();
    }
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}: ${res.statusText}` }));
      throw new Error(errorData.detail || 'Could not download event backup');
    }
    return res.blob();
  }

  // Bug Reports
  async submitBugReport(userName: string, pageUrl: string, description: string) {
    return this.request<any>('/bug-reports', {
      method: 'POST',
      body: JSON.stringify({ user_name: userName, page_url: pageUrl, description }),
    });
  }

  async listBugReports() {
    return this.request<any[]>('/bug-reports');
  }
}

export const api = new ApiClient();
