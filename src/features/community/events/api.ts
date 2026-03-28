import { api } from '../../../lib/apiClient';
import type { EventOut } from './types';

export type EventCreatePayload = {
  publisher_org_id: string;
  title: string;
  category: string;
  start_at: string; // ISO datetime
  end_at?: string;
  location_text?: string;
  description?: string;
  highlights?: string[];
};

export type MyOrgItem = {
  org_id: string;
  org_name: string;
  role: string;
};

export const eventApi = {
  /** Get user's orgs (for publisher_org_id) */
  getMyOrgs: () =>
    api.get<MyOrgItem[]>('/orgs/me'),

  /** Create a new event (draft) */
  createEvent: (payload: EventCreatePayload) =>
    api.post<EventOut>('/events', payload),

  /** Get published events list */
  getEvents: (limit = 50) =>
    api.get<EventOut[]>(`/events?limit=${limit}`),

  /** Get single event detail */
  getDetail: (eventId: string) =>
    api.get<EventOut>(`/events/${eventId}`),

  /** Get user's registered events */
  getMyRegistrations: () =>
    api.get<EventOut[]>('/events/my-registrations'),

  /** Register for an event */
  register: (eventId: string) =>
    api.post<{ registered: boolean; status: string }>(
      `/events/${eventId}/register`
    ),

  /** Unregister from an event */
  unregister: (eventId: string) =>
    api.del<{ registered: boolean }>(`/events/${eventId}/register`),

  /** Toggle like on event */
  toggleLike: (eventId: string) =>
    api.post<{ liked: boolean; like_count: number }>(
      `/events/${eventId}/like`
    ),

  /** Toggle save on event */
  toggleSave: (eventId: string) =>
    api.post<{ saved: boolean; save_count: number }>(
      `/events/${eventId}/save`
    ),
};
