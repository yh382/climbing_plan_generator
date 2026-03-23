import { create } from "zustand";
import type { ChatMessage, CoachConversation, CoachMode, CoachPhase, CoachState, PlanSummary, RecommendedActions } from "../types";
import { coachApi } from "../api";

function uid(prefix: string) {
  return `${Date.now()}-${prefix}-${Math.random().toString(16).slice(2)}`;
}

const SEED_MESSAGE: ChatMessage = {
  id: "seed-1",
  role: "assistant",
  text: "Hi, I'm Paddi 🦍 What would you like to do: plan / actions / training summary — or just chat about anything climbing-related?",
  ts: Date.now(),
};

function createLocalConversation(): CoachConversation {
  const now = new Date().toISOString();
  return {
    id: uid("conv"),
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    phase: "collect",
    mode: "none",
    messages: [{ ...SEED_MESSAGE, id: uid("seed"), ts: Date.now() }],
    draftPlan: null,
  };
}

function seedState(): CoachState {
  const conv = createLocalConversation();
  return {
    phase: conv.phase,
    mode: conv.mode,
    messages: conv.messages,
    draftPlan: null,
    generatedPlanId: null,
    planSummary: null,
    recommendedActions: null,
    taskBarVisible: true,
    isBusy: false,
    streamingMsgId: null,
    conversations: [conv],
    currentConversationId: conv.id,
    overlayOpen: false,
  };
}

/** Sync top-level state fields from a conversation */
function syncFromConversation(state: CoachState, conv: CoachConversation): CoachState {
  // Show taskbar only if conversation has no user messages yet
  const hasUserMessages = conv.messages.some((m) => m.role === "user");
  return {
    ...state,
    phase: conv.phase,
    mode: conv.mode,
    messages: conv.messages,
    draftPlan: conv.draftPlan,
    generatedPlanId: null,
    planSummary: null,
    recommendedActions: null,
    taskBarVisible: !hasUserMessages,
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

/** Map backend message {content, ts(iso)} to frontend ChatMessage {text, ts(number)} */
function mapBackendMessage(msg: { role: string; content: string; ts: string }): ChatMessage {
  return {
    id: uid("msg"),
    role: msg.role as "user" | "assistant",
    text: msg.content,
    ts: new Date(msg.ts).getTime(),
  };
}

type CoachChatStore = {
  state: CoachState;
  resetCurrentConversation: () => void;
  sendFromDock: (text: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  switchConversation: (id: string) => void;
  loadConversations: () => void;
  setOverlayOpen: (open: boolean) => void;
  setMode: (mode: CoachMode) => void;
  clearStreaming: () => void;
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
      mode: "none",
      messages: freshMessages,
      draftPlan: null,
      updatedAt: now,
    });

    set({
      state: {
        ...prev,
        phase: "collect",
        mode: "none",
        messages: freshMessages,
        draftPlan: null,
        generatedPlanId: null,
        planSummary: null,
        recommendedActions: null,
        taskBarVisible: true,
        isBusy: false,
        streamingMsgId: null,
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

    // Optimistic: add user message immediately
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
        taskBarVisible: false,
        messages: newMessages,
        conversations,
      },
    });

    // Map frontend mode to backend mode
    const modeMap: Record<string, string> = {
      none: "general",
      plan: "plan",
      actions: "actions",
      analysis: "analysis",
    };

    // Local IDs (from uid()) are not valid UUIDs — send null so backend creates one
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convId);

    coachApi
      .sendMessage({
        conversationId: isUuid ? convId : null,
        message: t,
        mode: modeMap[prev.mode] || "general",
      })
      .then((res) => {
        const cur = get().state;
        const assistantMsg = mapBackendMessage(res.message);
        const replyNow = new Date().toISOString();

        const updatedMessages = [...cur.messages, assistantMsg];
        const actualConvId = res.conversation_id;

        // Process phase update from backend
        const newPhase = (res.phase as CoachPhase) || cur.phase;

        // Process draft_plan from backend (snake_case → camelCase)
        let newDraftPlan = cur.draftPlan;
        if (res.draft_plan) {
          newDraftPlan = {
            title: res.draft_plan.title || "",
            subtitle: res.draft_plan.subtitle || "",
            weekCount: res.draft_plan.week_count || res.draft_plan.weeks || 0,
            sessionsPerWeek: res.draft_plan.sessions_per_week || 0,
            bullets: res.draft_plan.bullets || [],
          };
        }

        // Process plan_id and plan_summary from backend
        let newPlanId = cur.generatedPlanId;
        let newPlanSummary: PlanSummary | null = cur.planSummary;
        const resPlanId = res.plan_id || (res.draft_plan?.plan_id);
        if (resPlanId) {
          newPlanId = resPlanId;
          const dp = res.draft_plan;
          if (dp) {
            newPlanSummary = {
              planId: resPlanId,
              title: dp.title || "",
              weeks: dp.weeks || dp.week_count || 0,
              sessionsPerWeek: dp.sessions_per_week || 0,
              climbSessions: dp.climb_sessions || 0,
              trainSessions: dp.train_sessions || 0,
              totalExercises: dp.total_exercises || 0,
              sessions: (dp.sessions || []).map((s: any) => ({
                type: s.type,
                exercises: (s.exercises || []).map((e: any) => ({
                  name: e.name || { zh: e.action_id, en: e.action_id },
                  blockType: e.block_type || "",
                })),
              })),
              weekFocuses: (dp.week_focuses || []).map((wf: any) => ({
                week: wf.week,
                focus: wf.focus,
              })),
            };
          }
        }

        // Process recommended_actions from backend (actions mode)
        let newRecommendedActions: RecommendedActions | null = cur.recommendedActions;
        if (res.recommended_actions) {
          newRecommendedActions = {
            focus: res.recommended_actions.focus || "",
            actions: (res.recommended_actions.actions || []).map((a: any) => ({
              actionId: a.action_id,
              name: a.name || { zh: a.action_id, en: a.action_id },
              blockType: a.block_type || "",
              level: a.level || "",
              durationMin: a.duration_min ?? null,
              equipment: a.equipment || [],
              reason: a.reason || "",
            })),
          };
        }

        const convPatch = {
          messages: updatedMessages,
          updatedAt: replyNow,
          phase: newPhase,
          draftPlan: newDraftPlan,
        };

        // If message has content, enable streaming (typewriter) which will call clearStreaming when done.
        // If empty, skip streaming to avoid isBusy getting stuck forever.
        const hasContent = !!assistantMsg.text?.trim();
        const busyState = hasContent;
        const streamId = hasContent ? assistantMsg.id : null;

        const commonPatch = {
          isBusy: busyState,
          streamingMsgId: streamId,
          messages: updatedMessages,
          phase: newPhase,
          draftPlan: newDraftPlan,
          generatedPlanId: newPlanId,
          planSummary: newPlanSummary,
          recommendedActions: newRecommendedActions,
        };

        if (actualConvId !== convId) {
          // Backend created a new conversation — update the ID
          const updatedConversations = cur.conversations.map((c) =>
            c.id === convId ? { ...c, id: actualConvId, ...convPatch } : c,
          );
          set({
            state: {
              ...cur,
              ...commonPatch,
              currentConversationId: actualConvId,
              conversations: updatedConversations,
            },
          });
        } else {
          const updatedConversations = updateConversationInList(cur.conversations, convId, convPatch);
          set({
            state: {
              ...cur,
              ...commonPatch,
              conversations: updatedConversations,
            },
          });
        }
      })
      .catch((err) => {
        const cur = get().state;
        const errorMsg: ChatMessage = {
          id: uid("err"),
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
          ts: Date.now(),
        };
        const updatedMessages = [...cur.messages, errorMsg];
        const updatedConversations = updateConversationInList(cur.conversations, convId, {
          messages: updatedMessages,
        });

        set({
          state: {
            ...cur,
            isBusy: false,
            streamingMsgId: null,
            messages: updatedMessages,
            conversations: updatedConversations,
          },
        });
        console.error("[CoachChat] sendMessage error:", err);
      });
  },

  createConversation: () => {
    const prev = get().state;

    // Optimistic: create local conversation immediately
    const localConv = createLocalConversation();
    set({
      state: syncFromConversation(
        { ...prev, isBusy: false, streamingMsgId: null, conversations: [...prev.conversations, localConv] },
        localConv,
      ),
    });

    // Sync with backend
    coachApi
      .createConversation()
      .then((res) => {
        const cur = get().state;
        const updatedConversations = cur.conversations.map((c) =>
          c.id === localConv.id
            ? { ...c, id: res.id, title: res.title, createdAt: res.created_at, updatedAt: res.updated_at }
            : c,
        );
        const newCurrentId = cur.currentConversationId === localConv.id ? res.id : cur.currentConversationId;

        set({
          state: { ...cur, currentConversationId: newCurrentId, conversations: updatedConversations },
        });
      })
      .catch((err) => {
        console.error("[CoachChat] createConversation error:", err);
      });
  },

  deleteConversation: (id: string) => {
    const prev = get().state;
    const remaining = prev.conversations.filter((c) => c.id !== id);

    if (prev.currentConversationId === id) {
      if (remaining.length > 0) {
        const sorted = [...remaining].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        set({ state: syncFromConversation({ ...prev, isBusy: false, streamingMsgId: null, conversations: remaining }, sorted[0]) });
      } else {
        const fresh = createLocalConversation();
        set({ state: syncFromConversation({ ...prev, isBusy: false, streamingMsgId: null, conversations: [fresh] }, fresh) });
      }
    } else {
      set({ state: { ...prev, conversations: remaining } });
    }

    // Delete on backend (only if it's a real UUID, not a local-only conversation)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      coachApi.deleteConversation(id).catch((err) => {
        console.error("[CoachChat] deleteConversation error:", err);
      });
    }
  },

  switchConversation: (id: string) => {
    const prev = get().state;
    const target = prev.conversations.find((c) => c.id === id);
    if (!target) return;

    // Switch locally immediately
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Local-only conversation (non-UUID) — just switch, no backend fetch
    if (!isUuid) {
      set({ state: syncFromConversation({ ...prev, isBusy: false, streamingMsgId: null }, target) });
      return;
    }

    // Backend conversation — fetch full messages
    set({ state: syncFromConversation({ ...prev, isBusy: true, streamingMsgId: null }, target) });

    coachApi
      .getConversation(id)
      .then((res) => {
        const cur = get().state;
        const messages: ChatMessage[] = res.messages.map(mapBackendMessage);
        const finalMessages = messages.length > 0 ? messages : target.messages;

        const updatedConv: CoachConversation = {
          ...target,
          id: res.id,
          title: res.title,
          messages: finalMessages,
          updatedAt: res.updated_at,
        };

        const updatedConversations = cur.conversations.map((c) => (c.id === id ? updatedConv : c));

        const hasUserMessages = finalMessages.some((m) => m.role === "user");
        set({
          state: { ...cur, isBusy: false, streamingMsgId: null, taskBarVisible: !hasUserMessages, messages: finalMessages, conversations: updatedConversations },
        });
      })
      .catch((err) => {
        console.error("[CoachChat] getConversation error:", err);
        const cur = get().state;
        set({ state: { ...cur, isBusy: false, streamingMsgId: null } });
      });
  },

  loadConversations: () => {
    coachApi
      .listConversations()
      .then((list) => {
        if (list.length === 0) return;

        const cur = get().state;
        const backendConvs: CoachConversation[] = list.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          phase: "collect" as const,
          mode: (c.mode === "general" ? "none" : c.mode) as CoachConversation["mode"],
          messages: [],
          draftPlan: null,
        }));

        // Merge: keep existing conversations that match, add new backend ones
        const currentId = cur.currentConversationId;
        const merged = backendConvs.map((bc) => {
          const existing = cur.conversations.find((c) => c.id === bc.id);
          return existing || bc;
        });

        // Keep current conversation if not in backend list
        if (currentId && !merged.find((c) => c.id === currentId)) {
          const current = cur.conversations.find((c) => c.id === currentId);
          if (current) merged.unshift(current);
        }

        set({ state: { ...cur, conversations: merged } });
      })
      .catch((err) => {
        console.error("[CoachChat] loadConversations error:", err);
      });
  },

  setOverlayOpen: (open: boolean) => {
    const prev = get().state;
    set({ state: { ...prev, overlayOpen: open } });
  },

  setMode: (mode: CoachMode) => {
    const prev = get().state;
    const convId = prev.currentConversationId;

    const conversations = convId
      ? updateConversationInList(prev.conversations, convId, { mode })
      : prev.conversations;

    // Hide taskbar when a mode is selected (mode !== "none")
    const taskBarVisible = mode === "none" ? prev.taskBarVisible : false;

    set({ state: { ...prev, mode, taskBarVisible, conversations } });
  },

  clearStreaming: () => {
    const prev = get().state;
    set({ state: { ...prev, isBusy: false, streamingMsgId: null } });
  },
}));
