import { api } from '../../../lib/apiClient';
import type { EventOut } from './types';

export const eventApi = {
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
