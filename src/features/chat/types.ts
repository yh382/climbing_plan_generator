export interface ChatConversationOut {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  other_user_id: string;
  other_user_name?: string;
  other_user_avatar?: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  created_at: string;
}

export interface ChatMessageOut {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string;
  created_at: string;
}
