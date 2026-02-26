import { create } from "zustand";
import type { ChatMessage, CoachConversation, CoachState } from "../types";
import { coachReply } from "../utils/mockCoachEngine";

function uid(prefix: string) {
  return `${Date.now()}-${prefix}-${Math.random().toString(16).slice(2)}`;
}

const SEED_MESSAGE: ChatMessage = {
  id: "seed-1",
  role: "assistant",
  text: "Hi — I'm your AI Coach. Tell me your climbing level (V grade or YDS), your goal (strength/endurance/technique), and how many days per week you can train.",
  ts: Date.now(),
};

function createNewConversation(): CoachConversation {
  const now = new Date().toISOString();
  return {
    id: uid("conv"),
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    phase: "collect",
    messages: [{ ...SEED_MESSAGE, id: uid("seed"), ts: Date.now() }],
    draftPlan: null,
  };
}

function seedState(): CoachState {
  const conv = createNewConversation();
  return {
    phase: conv.phase,
    messages: conv.messages,
    draftPlan: null,
    isBusy: false,
    conversations: [conv],
    currentConversationId: conv.id,
    overlayOpen: false,
  };
}

/** Sync top-level state fields from a conversation */
function syncFromConversation(state: CoachState, conv: CoachConversation): CoachState {
  return {
    ...state,
    phase: conv.phase,
    messages: conv.messages,
    draftPlan: conv.draftPlan,
    currentConversationId: conv.id,
  };
}

function updateConversationInList(
  conversations: CoachConversation[],
  id: string,
  patch: Partial<CoachConversation>,
): CoachConversation[] {
  return conversations.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

type CoachChatStore = {
  state: CoachState;
  resetCurrentConversation: () => void;
  sendFromDock: (text: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  switchConversation: (id: string) => void;
  setOverlayOpen: (open: boolean) => void;
};

export const useCoachChatStore = create<CoachChatStore>((set, get) => ({
  state: seedState(),

  resetCurrentConversation: () => {
    const prev = get().state;
    const convId = prev.currentConversationId;
    if (!convId) return;

    const freshMessages: ChatMessage[] = [{ ...SEED_MESSAGE, id: uid("seed"), ts: Date.now() }];
    const now = new Date().toISOString();

    const conversations = updateConversationInList(prev.conversations, convId, {
      phase: "collect",
      messages: freshMessages,
      draftPlan: null,
      updatedAt: now,
    });

    set({
      state: {
        ...prev,
        phase: "collect",
        messages: freshMessages,
        draftPlan: null,
        isBusy: false,
        conversations,
      },
    });
  },

  sendFromDock: (text: string) => {
    const t = text.trim();
    if (!t) return;

    const prev = get().state;
    if (prev.isBusy) return;
    const convId = prev.currentConversationId;
    if (!convId) return;

    const userMsg: ChatMessage = { id: uid("u"), role: "user", text: t, ts: Date.now() };
    const newMessages = [...prev.messages, userMsg];
    const now = new Date().toISOString();

    const conversations = updateConversationInList(prev.conversations, convId, {
      messages: newMessages,
      updatedAt: now,
    });

    set({
      state: {
        ...prev,
        isBusy: true,
        messages: newMessages,
        conversations,
      },
    });

    // mock async AI reply
    setTimeout(() => {
      const cur = get().state;
      const { phase, draftPlan, assistantMessage } = coachReply(cur, t);
      const replyNow = new Date().toISOString();

      const updatedMessages = [...cur.messages, assistantMessage];
      const updatedConversations = updateConversationInList(cur.conversations, convId, {
        messages: updatedMessages,
        phase,
        draftPlan,
        updatedAt: replyNow,
      });

      set({
        state: {
          ...cur,
          phase,
          draftPlan,
          isBusy: false,
          messages: updatedMessages,
          conversations: updatedConversations,
        },
      });
    }, 350);
  },

  createConversation: () => {
    const prev = get().state;
    const conv = createNewConversation();

    set({
      state: syncFromConversation(
        { ...prev, isBusy: false, conversations: [...prev.conversations, conv] },
        conv,
      ),
    });
  },

  deleteConversation: (id: string) => {
    const prev = get().state;
    const remaining = prev.conversations.filter((c) => c.id !== id);

    if (prev.currentConversationId === id) {
      if (remaining.length > 0) {
        // Switch to most recently updated
        const sorted = [...remaining].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        set({ state: syncFromConversation({ ...prev, isBusy: false, conversations: remaining }, sorted[0]) });
      } else {
        // No conversations left — create a new one
        const fresh = createNewConversation();
        set({ state: syncFromConversation({ ...prev, isBusy: false, conversations: [fresh] }, fresh) });
      }
    } else {
      set({ state: { ...prev, conversations: remaining } });
    }
  },

  switchConversation: (id: string) => {
    const prev = get().state;
    const target = prev.conversations.find((c) => c.id === id);
    if (!target) return;

    set({ state: syncFromConversation({ ...prev, isBusy: false }, target) });
  },

  setOverlayOpen: (open: boolean) => {
    const prev = get().state;
    set({ state: { ...prev, overlayOpen: open } });
  },
}));
