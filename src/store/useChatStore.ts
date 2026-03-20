import { create } from 'zustand';
import { chatApi } from '../features/chat/api';
import type { ChatConversationOut, ChatMessageOut } from '../features/chat/types';

interface ChatState {
  conversations: ChatConversationOut[];
  currentConversationId: string | null;
  messages: ChatMessageOut[];
  loading: boolean;
  totalUnread: number;

  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => void;
  fetchMessages: (conversationId: string, since?: string) => Promise<void>;
  sendMessage: (content: string, myUserId: string) => Promise<void>;
  startConversation: (targetUserId: string) => Promise<string>;
  markRead: (conversationId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;

  _pollTimer: ReturnType<typeof setInterval> | null;
  startPolling: (conversationId: string) => void;
  stopPolling: () => void;

  _unreadPollTimer: ReturnType<typeof setInterval> | null;
  startUnreadPolling: () => void;
  stopUnreadPolling: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  loading: false,
  totalUnread: 0,
  _pollTimer: null,
  _unreadPollTimer: null,

  fetchConversations: async () => {
    set({ loading: true });
    try {
      const convs = await chatApi.getConversations();
      set({ conversations: convs });
    } finally {
      set({ loading: false });
    }
  },

  selectConversation: (id) => {
    set({ currentConversationId: id, messages: [] });
  },

  fetchMessages: async (conversationId, since) => {
    const msgs = await chatApi.getMessages(conversationId, since);
    if (since) {
      set((s) => ({
        messages: [
          ...s.messages,
          ...msgs.filter((m) => !s.messages.find((e) => e.id === m.id)),
        ],
      }));
    } else {
      set({ messages: msgs });
    }
  },

  sendMessage: async (content, myUserId) => {
    const { currentConversationId, messages } = get();
    if (!currentConversationId) return;

    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessageOut = {
      id: tempId,
      conversation_id: currentConversationId,
      sender_id: myUserId,
      content,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...messages, tempMsg] });

    try {
      const real = await chatApi.sendMessage(currentConversationId, content);
      set((s) => ({
        messages: s.messages.map((m) => (m.id === tempId ? real : m)),
      }));
    } catch {
      // Remove temp message on failure
      set((s) => ({ messages: s.messages.filter((m) => m.id !== tempId) }));
    }
  },

  startConversation: async (targetUserId) => {
    const conv = await chatApi.startConversation(targetUserId);
    set((s) => ({
      conversations: [conv, ...s.conversations.filter((c) => c.id !== conv.id)],
      currentConversationId: conv.id,
    }));
    return conv.id;
  },

  markRead: async (conversationId) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    const prevUnread = conv?.unread_count ?? 0;
    await chatApi.markRead(conversationId);
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c,
      ),
      totalUnread: Math.max(0, s.totalUnread - prevUnread),
    }));
  },

  startPolling: (conversationId) => {
    const { stopPolling } = get();
    stopPolling();

    const timer = setInterval(async () => {
      const { messages: currentMsgs } = get();
      const lastMsg = currentMsgs[currentMsgs.length - 1];
      const since = lastMsg?.created_at;
      try {
        await get().fetchMessages(conversationId, since);
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const { _pollTimer } = get();
    if (_pollTimer) {
      clearInterval(_pollTimer);
      set({ _pollTimer: null });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await chatApi.getUnreadCount();
      set({ totalUnread: res.unread_count ?? 0 });
    } catch {
      // silently ignore
    }
  },

  startUnreadPolling: () => {
    get().stopUnreadPolling();
    get().fetchUnreadCount();
    const timer = setInterval(() => {
      get().fetchUnreadCount();
    }, 30_000);
    set({ _unreadPollTimer: timer });
  },

  stopUnreadPolling: () => {
    const { _unreadPollTimer } = get();
    if (_unreadPollTimer) {
      clearInterval(_unreadPollTimer);
      set({ _unreadPollTimer: null });
    }
  },
}));
