"use client";

/**
 * useDecisionData（V0.4.1 Phase 3 Task 3C）。
 * 异步读取/保存决策数据，替代 UI 直接读 localStorage（readDecisionDataSync）。
 * 维护与旧 DecisionData 相同形状的 data（decisions/reviews/plans/results/events/updates），
 * 便于 UI 派生逻辑不变。
 */
import { useCallback, useEffect, useState } from "react";
import { getDecisionRepository } from "../../repository/provider";
import type { DecisionRepository, DecisionData } from "../repository";
import type {
  LearningEvent,
  ScoreUpdate,
  UserDecision,
  UserDecisionReview,
  ValidationPlan,
  ValidationResult,
} from "../types";

export interface UseDecisionDataResult {
  data: DecisionData;
  loading: boolean;
  error: string | null;
  getDecision: (id: string) => Promise<UserDecision | undefined>;
  saveDecision: (d: UserDecision) => Promise<void>;
  getReview: (decisionId: string) => Promise<UserDecisionReview | undefined>;
  saveReview: (r: UserDecisionReview) => Promise<void>;
  getPlans: () => Promise<ValidationPlan[]>;
  savePlan: (p: ValidationPlan) => Promise<void>;
  getResults: (planId: string) => Promise<ValidationResult[]>;
  saveResult: (r: ValidationResult) => Promise<void>;
  listEvents: (opportunityId?: string) => Promise<LearningEvent[]>;
  refresh: () => Promise<void>;
}

const EMPTY_DATA: DecisionData = { decisions: [], reviews: [], plans: [], results: [], events: [], updates: [] };

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 200) : "操作失败";
}

async function loadAll(repository: DecisionRepository, opportunityId: string): Promise<DecisionData> {
  const decisions = await repository.listDecisions(opportunityId);
  const reviews: UserDecisionReview[] = [];
  const updates: ScoreUpdate[] = [];
  for (const d of decisions) {
    const r = await repository.getReview(d.id);
    if (r) reviews.push(r);
    const us = await repository.listScoreUpdates(d.id);
    updates.push(...us);
  }
  const plans = (await repository.listPlans()).filter((p) =>
    decisions.some((d) => d.id === p.decisionId),
  );
  const results: ValidationResult[] = [];
  for (const p of plans) {
    const rs = await repository.listResults(p.id);
    results.push(...rs);
  }
  const events = await repository.listEvents(opportunityId);
  return { decisions, reviews, plans, results, events, updates };
}

export function useDecisionData(
  opportunityId: string,
  repository: DecisionRepository = getDecisionRepository(),
): UseDecisionDataResult {
  const [data, setData] = useState<DecisionData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 手动/事件触发的加载 */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadAll(repository, opportunityId));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [repository, opportunityId]);

  // 初始加载：setState 只在异步回调中执行，避免 react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    loadAll(repository, opportunityId)
      .then((d) => {
        if (!cancelled) setData(d);
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
  }, [repository, opportunityId]);

  // 监听 localStorage 写入（storage 事件）：Local 保存后自动刷新
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void load();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [load]);

  const getDecision = useCallback(
    async (id: string) => repository.getDecision(id),
    [repository],
  );
  const saveDecision = useCallback(
    async (d: UserDecision) => {
      try {
        await repository.saveDecision(d);
        await load();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [repository, load],
  );
  const getReview = useCallback(
    async (decisionId: string) => repository.getReview(decisionId),
    [repository],
  );
  const saveReview = useCallback(
    async (r: UserDecisionReview) => {
      try {
        await repository.saveReview(r);
        await load();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [repository, load],
  );
  const getPlans = useCallback(async () => repository.listPlans(), [repository]);
  const savePlan = useCallback(
    async (p: ValidationPlan) => {
      try {
        await repository.savePlan(p);
        await load();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [repository, load],
  );
  const getResults = useCallback(
    async (planId: string) => repository.listResults(planId),
    [repository],
  );
  const saveResult = useCallback(
    async (r: ValidationResult) => {
      try {
        await repository.saveResult(r);
        await load();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [repository, load],
  );
  const listEvents = useCallback(
    async (id?: string) => repository.listEvents(id),
    [repository],
  );

  const refresh = useCallback(() => load(), [load]);

  return {
    data,
    loading,
    error,
    getDecision,
    saveDecision,
    getReview,
    saveReview,
    getPlans,
    savePlan,
    getResults,
    saveResult,
    listEvents,
    refresh,
  };
}
