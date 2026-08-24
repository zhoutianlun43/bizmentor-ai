"use client";

/**
 * useOpportunities（V0.4.1 Phase 3 Task 3A）。
 * 异步加载/创建/更新/删除商机，替代 UI 直接读 localStorage。
 * 默认使用 Repository Provider 返回的仓库（开发=Local，配置 Supabase 后=Supabase）。
 */
import { useCallback, useEffect, useState } from "react";
import { getOpportunityRepository } from "../../repository/provider";
import type { Opportunity, OpportunityInput } from "../../types";
import type { OpportunityRepository } from "../repository";

export interface UseOpportunitiesResult {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  list: () => Promise<void>;
  create: (input: OpportunityInput) => Promise<Opportunity | undefined>;
  update: (
    id: string,
    patch: Partial<Omit<Opportunity, "id" | "createdAt">>,
  ) => Promise<Opportunity | undefined>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 200) : "操作失败";
}

export function useOpportunities(
  repository: OpportunityRepository = getOpportunityRepository(),
): UseOpportunitiesResult {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  // 初始加载中（避免在 effect 内同步 setState，见下）
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 手动/事件触发的加载（refresh / create / update / remove 内部使用） */
  const list = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOpportunities(await repository.listOpportunities());
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
      .listOpportunities()
      .then((data) => {
        if (!cancelled) setOpportunities(data);
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

  const create = useCallback(
    async (input: OpportunityInput) => {
      try {
        const created = await repository.createOpportunity(input);
        await list();
        return created;
      } catch (e) {
        setError(messageOf(e));
        return undefined;
      }
    },
    [repository, list],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<Opportunity, "id" | "createdAt">>) => {
      try {
        const updated = await repository.updateOpportunity(id, patch);
        await list();
        return updated;
      } catch (e) {
        setError(messageOf(e));
        return undefined;
      }
    },
    [repository, list],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const ok = await repository.deleteOpportunity(id);
        await list();
        return ok;
      } catch (e) {
        setError(messageOf(e));
        return false;
      }
    },
    [repository, list],
  );

  const refresh = useCallback(() => list(), [list]);

  return { opportunities, loading, error, list, create, update, remove, refresh };
}
