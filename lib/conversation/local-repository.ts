/** LocalConversationRepository（localStorage/内存，缓存/离线） */
import { readJSON, writeJSON } from "../store/storage";
import type { Conversation, ConversationMessage } from "./types";
import type { ConversationRepository } from "./repository";

const CONVERSATION_KEY = "conversations";

export interface ConversationStorage {
  load(): Conversation[];
  save(conversations: Conversation[]): void;
}

export function createBrowserConversationStorage(): ConversationStorage {
  return {
    load: () => readJSON<Conversation[]>(CONVERSATION_KEY, []),
    save: (c) => writeJSON(CONVERSATION_KEY, c),
  };
}

export function createMemoryConversationStorage(): ConversationStorage {
  let conversations: Conversation[] = [];
  return {
    load: () => conversations,
    save: (next) => {
      conversations = next;
    },
  };
}

export class LocalConversationRepository implements ConversationRepository {
  private readonly storage: ConversationStorage;

  constructor(storage?: ConversationStorage) {
    this.storage = storage ?? createBrowserConversationStorage();
  }

  async save(conversation: Conversation): Promise<void> {
    const list = this.storage.load();
    const i = list.findIndex((c) => c.id === conversation.id);
    if (i >= 0) list[i] = conversation;
    else list.unshift(conversation);
    this.storage.save(list);
  }

  async get(id: string): Promise<Conversation | undefined> {
    return this.storage.load().find((c) => c.id === id);
  }

  async list(userId: string): Promise<Conversation[]> {
    return this.storage
      .load()
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async remove(id: string): Promise<boolean> {
    const list = this.storage.load();
    const next = list.filter((c) => c.id !== id);
    if (next.length === list.length) return false;
    this.storage.save(next);
    return true;
  }

  async appendMessage(id: string, message: ConversationMessage): Promise<Conversation | undefined> {
    const list = this.storage.load();
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) return undefined;
    const c = list[i];
    c.messages = [...c.messages, message];
    c.updatedAt = message.createdAt;
    this.storage.save(list);
    return c;
  }
}