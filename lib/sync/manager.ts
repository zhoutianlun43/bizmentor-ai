/**
 * SyncManager（V0.4.2 Phase 9B-5-D）。
 * - push：local → remote（本地 updatedAt >= 远端 → 覆盖远端）
 * - pull：remote → local（远端 updatedAt > 本地 → 覆盖本地）
 * - sync：push + pull
 * 冲突策略：updated_at Last-Write-Wins（LWW）。
 */
import type { SyncEntity, SyncSource, SyncSummary } from "./types";

/** LWW 判定：返回应保留的 updatedAt 更大的那一侧 */
export function lwwWins(local: SyncEntity, remote: SyncEntity): "local" | "remote" | "equal" {
  const l = Date.parse(local.updatedAt);
  const r = Date.parse(remote.updatedAt);
  if (Number.isNaN(l) || Number.isNaN(r)) return "equal";
  if (l > r) return "local";
  if (r > l) return "remote";
  return "equal";
}

export class SyncManager {
  private readonly local: SyncSource;
  private readonly remote: SyncSource;

  constructor(local: SyncSource, remote: SyncSource) {
    this.local = local;
    this.remote = remote;
  }

  /** local → remote（LWW：本地较新才覆盖远端） */
  async push(): Promise<SyncSummary> {
    const locals = await this.local.list();
    const remotes = await this.remote.list();
    const remoteById = new Map(remotes.map((r) => [r.id, r]));
    let pushed = 0;
    let skipped = 0;
    for (const local of locals) {
      const remote = remoteById.get(local.id);
      if (!remote || lwwWins(local, remote) === "local") {
        await this.remote.upsert(local);
        pushed++;
      } else {
        skipped++;
      }
    }
    return { pushed, pulled: 0, skipped };
  }

  /** remote → local（LWW：远端较新才覆盖本地） */
  async pull(): Promise<SyncSummary> {
    const locals = await this.local.list();
    const remotes = await this.remote.list();
    const localById = new Map(locals.map((l) => [l.id, l]));
    let pulled = 0;
    let skipped = 0;
    for (const remote of remotes) {
      const local = localById.get(remote.id);
      if (!local || lwwWins(local, remote) === "remote") {
        await this.local.upsert(remote);
        pulled++;
      } else {
        skipped++;
      }
    }
    return { pushed: 0, pulled, skipped };
  }

  /** push + pull */
  async sync(): Promise<{ push: SyncSummary; pull: SyncSummary }> {
    const push = await this.push();
    const pull = await this.pull();
    return { push, pull };
  }
}