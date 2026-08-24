/**
 * ContextRepository（V0.5.0 Phase 10A-3，预留接口）。
 * context_state 预留：未来 Supabase business_context_snapshots 作为可选缓存；本阶段不创建真实表。
 */
import type { ContextSnapshot } from "./types";

export interface ContextRepository {
  save(snapshot: ContextSnapshot): Promise<void>;
  get(userId: string): Promise<ContextSnapshot | undefined>;
  clear(userId: string): Promise<void>;
}