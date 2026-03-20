import { api } from '../../lib/apiClient';

export interface CoachChatRequest {
  conversationId?: string | null;
  message: string;
  mode?: string | null;
}

export interface CoachChatResponse {
  conversation_id: string;
  message: { role: string; content: string; ts: string };
  draft_plan: any | null;
  recommended_actions: any | null;
  phase: string | null;
  plan_id?: string | null;
}

export interface CoachConversationSummary {
  id: string;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface CoachConversationDetail {
  id: string;
  title: string;
  mode: string;
  messages: Array<{ role: string; content: string; ts: string }>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const coachApi = {
  sendMessage: (data: CoachChatRequest) =>
    api.post<CoachChatResponse>('/coach/chat', {
      conversation_id: data.conversationId,
      message: data.message,
      mode: data.mode,
    }),

  listConversations: (skip = 0, limit = 20) =>
    api.get<CoachConversationSummary[]>(`/coach/conversations?skip=${skip}&limit=${limit}`),

  createConversation: () =>
    api.post<CoachConversationDetail>('/coach/conversations'),

  getConversation: (id: string) =>
    api.get<CoachConversationDetail>(`/coach/conversations/${id}`),

  deleteConversation: (id: string) =>
    api.del(`/coach/conversations/${id}`),
};

export interface ChecklistCreateRequest {
  title: string;
  actions: Array<{
    action_id: string;
    name: { zh: string; en: string };
    block_type: string;
    level: string;
    reason: string;
  }>;
}

export interface ChecklistOut {
  id: string;
  title: string;
  actions_json: any[];
  source: string;
  created_at: string;
}

export const checklistApi = {
  save: (data: ChecklistCreateRequest) =>
    api.post<ChecklistOut>('/action-checklists', data),

  listMine: () =>
    api.get<ChecklistOut[]>('/action-checklists/me'),

  remove: (id: string) =>
    api.del(`/action-checklists/${id}`),
};
