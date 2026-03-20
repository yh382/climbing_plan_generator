import { api } from '../../lib/apiClient';
import type { ChatConversationOut, ChatMessageOut } from './types';

export const chatApi = {
  getConversations: (limit = 50, offset = 0) =>
    api.get<ChatConversationOut[]>(`/chat/conversations?limit=${limit}&offset=${offset}`),

  startConversation: (targetUserId: string) =>
    api.post<ChatConversationOut>('/chat/conversations', { target_user_id: targetUserId }),

  getMessages: (conversationId: string, since?: string, limit = 100) => {
    let url = `/chat/conversations/${conversationId}/messages?limit=${limit}`;
    if (since) url += `&since=${encodeURIComponent(since)}`;
    return api.get<ChatMessageOut[]>(url);
  },

  sendMessage: (conversationId: string, content: string) =>
    api.post<ChatMessageOut>(
      `/chat/conversations/${conversationId}/messages`,
      { content },
    ),

  markRead: (conversationId: string) =>
    api.post<{ marked: number }>(`/chat/conversations/${conversationId}/read`),

  getUnreadCount: () =>
    api.get<{ unread_count: number }>('/chat/unread-count'),
};
