/**
 * SupabaseConversationRepository（V0.6.1，预留）。
 * 目标表：conversations（本阶段不建表；接口就绪供未来多设备同步）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserId } from "../identity/resolver";
import { getSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseServerClient } from "../supabase/server";
import { SupabaseRepositoryError } from "../supabase/errors";
import type { Conversation, ConversationMessage } from "./types";
import type { ConversationRepository } from "./repository";

export interface SupabaseConversationRepositoryOptions {
  userId?: string;
}

type Row = Record<string, unknown>;

export class SupabaseConversationRepository implements ConversationRepository {
  private readonly supabase: SupabaseClient;
  private readonly userId: string;

  constructor(supabase?: SupabaseClient, options: SupabaseConversationRepositoryOptions = {}) {
    this.supabase = supabase ?? (typeof window !== "undefined" ? getSupabaseBrowserClient() : getSupabaseServerClient());
    this.userId = options.userId ?? getCurrentUserId();
  }

  async save(conversation: Conversation): Promise<void> {
    const { error } = await this.supabase.from("conversations").upsert(
      { id: conversation.id, user_id: conversation.userId, title: conversation.title ?? null, messages: conversation.messages, created_at: conversation.createdAt, updated_at: conversation.updatedAt },
      { onConflict: "id" },
    );
    if (error) throw new SupabaseRepositoryError("saveConversation", error.message);
  }

  async get(id: string): Promise<Conversation | undefined> {
    const { data, error } = await this.supabase.from("conversations").select("*").eq("id", id).maybeSingle();
    if (error) throw new SupabaseRepositoryError("getConversation", error.message);
    const row = data as Row | null;
    if (!row) return undefined;
    return { id: String(row.id), userId: String(row.user_id), title: row.title ? String(row.title) : undefined, messages: (row.messages as ConversationMessage[]) ?? [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
  }

  async list(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.supabase.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) throw new SupabaseRepositoryError("listConversations", error.message);
    return ((data as Row[] | null) ?? []).map((row) => ({ id: String(row.id), userId: String(row.user_id), title: row.title ? String(row.title) : undefined, messages: (row.messages as ConversationMessage[]) ?? [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("conversations").delete().eq("id", id);
    if (error) throw new SupabaseRepositoryError("removeConversation", error.message);
    return true;
  }

  async appendMessage(id: string, message: ConversationMessage): Promise<Conversation | undefined> {
    const c = await this.get(id);
    if (!c) return undefined;
    const next = { ...c, messages: [...c.messages, message], updatedAt: message.createdAt };
    await this.save(next);
    return next;
  }
}