import { api } from "../../lib/apiClient";

export interface InboxActor {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface InboxActivityItem {
  id: string;
  kind: string;
  target_id: string | null;
  target_type: string | null;
  actors: InboxActor[];
  actor_count: number;
  latest_at: string;
  earliest_at: string;
  read_all: boolean;
  preview: string | null;
  underlying_notification_ids: string[];
}

export const inboxApi = {
  getActivity: (limit = 50, offset = 0, unreadOnly = false) =>
    api.get<InboxActivityItem[]>(
      `/notifications/activity?limit=${limit}&offset=${offset}&unread_only=${unreadOnly}`,
    ),

  markRead: (ids: string[]) =>
    api.post<{ updated: number }>("/notifications/read_batch", { ids }),

  getUnreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
};
