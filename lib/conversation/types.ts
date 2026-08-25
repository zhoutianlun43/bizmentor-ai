/**
 * Conversation（V0.6.1 Product Usability；V0.8.2 多会话）。
 * 聊天历史持久化：Local 优先，Supabase 预留。多设备就绪。
 * 每个会话独立保存 messages/title，互不影响上下文。
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  /** 会话标题（V0.8.2：手动重命名或由首条用户消息自动生成） */
  title?: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}
