export interface User {
  id: number;
  name: string;
  phone_masked: string;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  expires_at: string;
  user: User;
}

export interface CodeSentResponse {
  message: string;
  phone_masked: string;
  expires_in_seconds: number;
  dev_code?: string | null;
}

export interface DevSmsNotice {
  phone_masked: string;
  code: string;
  expires_at: string;
  remaining_seconds: number;
}

export interface Event {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  timezone: string;
  candidate_dates: string[];
  daily_start_time: string;
  daily_end_time: string;
  slot_duration_minutes: number;
  deadline?: string | null;
  capacity_limit?: number | null;
  is_hidden_details: boolean;
  status: 'collecting' | 'finalized' | 'canceled';
  finalized_start_time?: string | null;
  finalized_end_time?: string | null;
  created_by_id: number;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  active_token?: string | null;
  expires_at?: string | null;
  is_host: boolean;
  is_cohost: boolean;
  respondents_count: number;
  co_hosts: string[];
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface HeatmapSlot {
  start_time: string;
  end_time: string;
  count: number;
  total_participants: number;
  ratio: number;
  available_participants: string[];
  unavailable_participants: string[];
}

export interface HeatmapResponse {
  event_id: number;
  total_respondents: number;
  respondent_names: string[];
  slots: HeatmapSlot[];
  best_slots: HeatmapSlot[];
  cached_at: string;
}

export type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'waitlisted';

export interface Rsvp {
  id: number;
  event_id: number;
  participant_name: string;
  participant_phone?: string | null;
  status: RsvpStatus;
  waitlist_position?: number | null;
  edit_token: string;
  updated_at: string;
}

export interface RsvpSummary {
  event_id: number;
  total_invitees: number;
  count_going: number;
  count_maybe: number;
  count_not_going: number;
  count_waitlisted: number;
  count_no_response: number;
  capacity_limit?: number | null;
  current_status?: RsvpStatus | null;
  current_waitlist_position?: number | null;
  rsvps: Rsvp[];
}

export interface CommentReply {
  id: number;
  author_name: string;
  is_host_reply: boolean;
  content: string;
  created_at: string;
}

export interface Comment {
  id: number;
  event_id: number;
  author_name: string;
  is_question: boolean;
  content: string;
  parent_id?: number | null;
  created_at: string;
  replies: CommentReply[];
}

export interface ChangeLog {
  id: number;
  action: string;
  details: string;
  user_name?: string | null;
  timestamp: string;
}

export interface SystemStatus {
  status: 'online' | 'maintenance';
  active_connections: number;
  total_users: number;
  total_events: number;
  total_rsvps: number;
  db_path: string;
  server_time: string;
  uptime_since: string;
}

export interface AdminUser {
  id: number;
  name: string;
  phone_masked: string;
  is_admin: boolean;
  events_count: number;
  created_at: string;
}

export interface AdminEvent {
  id: number;
  title: string;
  status: string;
  creator_name: string;
  created_at: string;
  respondents_count: number;
}

export interface BugReport {
  id: number;
  user_name?: string | null;
  contact?: string | null;
  page_url?: string | null;
  description: string;
  status: string;
  created_at: string;
}

export interface Invitee {
  id: number;
  name: string;
  responded_at?: string | null;
  reminder_sent_at?: string | null;
  joined_via_link: boolean;
  can_text: boolean;
  sms_opted_out: boolean;
  response_token: string;
  link: string;
}

// UC-11 Recurring events (FR-1, Aaron)
export interface RecurrenceInfo {
  event_id: number;
  is_recurring: boolean;
  frequency: 'weekly' | 'biweekly' | null;
  days_of_week: string[];
  end_date: string | null;
  occurrences: string[];
}

// FR-24 Group share links (Daniel)
export interface GroupEvent {
  id: number;
  title: string;
  status: string;
  location?: string | null;
  candidate_dates: string[];
  finalized_start_time?: string | null;
  share_token?: string | null;
}

export interface GroupInfo {
  id: number;
  name: string;
  share_token: string | null;
  share_url: string | null;
  events: GroupEvent[];
}
