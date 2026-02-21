import { create } from "zustand";
import type { ChatMessage, CoachState } from "../types";
import { coachReply } from "../utils/mockCoachEngine";

function seed(): CoachState {
  const hello: ChatMessage = {
    id: "seed-1",
    role: "assistant",
    text:
      "Hi — I’m your AI Coach. Tell me your climbing level (V grade or YDS), your goal (strength/endurance/technique), and how many days per week you can train.",
    ts: Date.now(),
  };
  return { step: 1, messages: [hello], draftPlan: null, isBusy: false };
}

function id(prefix: string) {
  return `${Date.now()}-${prefix}-${Math.random().toString(16).slice(2)}`;
}

type CoachChatStore = {
  state: CoachState;
  reset: () => void;
  sendFromDock: (text: string) => void;
};

export const useCoachChatStore = create<CoachChatStore>((set, get) => ({
  state: seed(),

  reset: () => set({ state: seed() }),

  sendFromDock: (text: string) => {
    const t = text.trim();
    if (!t) return;

    const prev = get().state;
    if (prev.isBusy) return;

    const userMsg: ChatMessage = { id: id("u"), role: "user", text: t, ts: Date.now() };

    // 先追加用户消息 + busy
    set({
      state: {
        ...prev,
        isBusy: true,
        messages: [...prev.messages, userMsg],
      },
    });

    // mock async AI reply
    setTimeout(() => {
      const cur = get().state;
      const { step, draftPlan, assistantMessage } = coachReply(cur, t);

      set({
        state: {
          ...cur,
          step,
          draftPlan,
          isBusy: false,
          messages: [...cur.messages, assistantMessage],
        },
      });
    }, 350);
  },
}));
