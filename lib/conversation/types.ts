/**
 * Conversation（V0.6.1 Product Usability）。
 * 聊天历史持久化：Local 优先，Supabase 预留。多设备就绪。
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}