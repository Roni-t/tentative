const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('tentative_token');
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('tentative_token', token);
    } else {
      localStorage.removeItem('tentative_token');
    }
  }

  getEditToken(): string | null {
    return localStorage.getItem('tentative_edit_token');
  }

  setEditToken(token: string | null) {
    if (token) {
      localStorage.setItem('tentative_edit_token', token);
    } else {
      localStorage.removeItem('tentative_edit_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

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
      return res.json();
    }
    return res.text() as unknown as T;
  }

  // Auth
  async requestCode(phone: string, name?: string) {
    return this.request<{ message: string; phone_masked: string; is_existing_account: boolean; dev_code?: string; expires_in_seconds: number }>(
      '/auth/request-code',
      { method: 'POST', body: JSON.stringify({ phone, name }) }
    );
  }

  async verifyCode(phone: string, code: string, name?: string) {
    const data = await this.request<any>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    this.setToken(null);
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getDevBannerCode(phone?: string) {
    return this.request<any>(phone ? `/auth/dev-banner-code?phone=${encodeURIComponent(phone)}` : '/auth/dev-banner-code');
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

  async getGoogleCalendarUrl(id: number | string) {
    return this.request<{ url: string }>(`/events/${id}/google-calendar-url`);
  }

  // Share
  async resolveShareToken(token: string) {
    return this.request<any>(`/share/${token}`);
  }

  async rotateShareUrl(eventId: number | string) {
    return this.request<any>(`/events/${eventId}/share/rotate`, { method: 'POST' });
  }

  async updateShareExpiry(eventId: number | string, option: string, customDate?: string) {
    return this.request<any>(`/events/${eventId}/share/expiry`, {
      method: 'POST',
      body: JSON.stringify({ expiry_option: option, custom_expiry_date: customDate }),
    });
  }

  // Availability & Heatmap
  async submitAvailability(eventId: number | string, participantName: string, slots: { start_time: string; end_time: string }[], editToken?: string) {
    const data = await this.request<any>(`/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ participant_name: participantName, edit_token: editToken || this.getEditToken(), slots }),
    });
    if (data.edit_token) {
      this.setEditToken(data.edit_token);
    }
    return data;
  }

  async getMyAvailability(eventId: number | string, editToken?: string) {
    const token = editToken || this.getEditToken();
    return this.request<{ start_time: string; end_time: string }[]>(`/events/${eventId}/availability/me${token ? `?edit_token=${token}` : ''}`);
  }

  async getHeatmap(eventId: number | string, refresh: boolean = false) {
    return this.request<any>(`/events/${eventId}/heatmap${refresh ? '?refresh=true' : ''}`);
  }

  // RSVP
  async submitRsvp(eventId: number | string, participantName: string, status: string, contact?: string, editToken?: string) {
    const data = await this.request<any>(`/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({
        participant_name: participantName,
        participant_email_or_phone: contact,
        edit_token: editToken || this.getEditToken(),
        status,
      }),
    });
    if (data.edit_token) {
      this.setEditToken(data.edit_token);
    }
    return data;
  }

  async getRsvpSummary(eventId: number | string, editToken?: string) {
    const token = editToken || this.getEditToken();
    return this.request<any>(`/events/${eventId}/rsvp${token ? `?edit_token=${token}` : ''}`);
  }

  // Comments
  async getComments(eventId: number | string) {
    return this.request<any[]>(`/events/${eventId}/comments`);
  }

  async addComment(eventId: number | string, authorName: string, content: string, isQuestion: boolean = false, parentId?: number) {
    return this.request<any>(`/events/${eventId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ author_name: authorName, content, is_question: isQuestion, parent_id: parentId }),
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

  // Bug Reports
  async submitBugReport(userName: string, emailOrPhone: string, pageUrl: string, description: string) {
    return this.request<any>('/bug-reports', {
      method: 'POST',
      body: JSON.stringify({ user_name: userName, email_or_phone: emailOrPhone, page_url: pageUrl, description }),
    });
  }

  async listBugReports() {
    return this.request<any[]>('/bug-reports');
  }
}

export const api = new ApiClient();
