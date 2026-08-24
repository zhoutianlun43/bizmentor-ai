"use client";

/**
 * useResearchRuns（V0.4.1 Phase 3 Task 3B）。
 * 异步读取/保存研究运行，替代 UI 直接读 localStorage（readResearchRunSync）。
 * 默认使用 Repository Provider 返回的仓库（开发=Local，配置 Supabase 后=Supabase）。
 */
import { useCallback, useEffect, useState } from "react";
import { getResearchRepository } from "../../repository/provider";
import type { ResearchRepository } from "../repository";
import type { ResearchRun } from "../types";

export interface UseResearchRunsResult {
  runs: ResearchRun[];
  loading: boolean;
  error: string | null;
  listRuns: () => Promise<void>;
  getRun: (opportunityId: string) => Promise<ResearchRun | undefined>;
  saveRun: (run: ResearchRun) => Promise<void>;
  refresh: () => Promise<void>;
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 200) : "操作失败";
}

export function useResearchRuns(
  repository: ResearchRepository = getResearchRepository(),
): UseResearchRunsResult {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 手动/事件触发的加载 */
  const listRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRuns(await repository.listRuns());
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [repository]);

  // 初始加载：setState 只在 promise 回调（异步）中执行，避免 react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    repository
      .listRuns()
      .then((data) => {
        if (!cancelled) setRuns(data);
      })
      .catch((e) => {
        if (!cancelled) setError(messageOf(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const getRun = useCallback(
    async (opportunityId: string) => repository.getRun(opportunityId),
    [repository],
  );

  const saveRun = useCallback(
    async (run: ResearchRun) => {
      try {
        await repository.saveRun(run);
        await listRuns();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [repository, listRuns],
  );

  const refresh = useCallback(() => listRuns(), [listRuns]);

  // 监听 localStorage 写入（storage 事件）：Local 仓库保存后自动刷新（事件处理器中 setState 合规）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void refresh();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  return { runs, loading, error, listRuns, getRun, saveRun, refresh };
}
