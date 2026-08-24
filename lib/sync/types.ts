/**
 * 数据同步基础层（V0.4.2 Phase 9B-5-D）。
 * SyncManager：local cache ↔ Supabase。冲突策略：updated_at Last-Write-Wins。
 * 本阶段只实现框架 + 测试，不迁移所有业务数据。
 */
export interface SyncEntity {
  id: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface SyncSource {
  list(): Promise<SyncEntity[]>;
  upsert(entity: SyncEntity): Promise<void>;
}

export interface SyncSummary {
  pushed: number;
  pulled: number;
  skipped: number;
}