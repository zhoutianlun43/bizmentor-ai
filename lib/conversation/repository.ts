/**
 * ConversationRepository（V0.6.1）。
 * Local 优先（localStorage/内存）；Supabase 预留（未来 conversations 表）。
 */
import type { Conversation, ConversationMessage } from "./types";

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  get(id: string): Promise<Conversation | undefined>;
  list(userId: string): Promise<Conversation[]>;
  remove(id: string): Promise<boolean>;
  appendMessage(id: string, message: ConversationMessage): Promise<Conversation | undefined>;
}