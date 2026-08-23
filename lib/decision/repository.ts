/**
 * DecisionRepository 抽象：决策/评审/验证计划/结果/学习事件 的存储。
 * - 现在：LocalDecisionRepository（localStorage）
 * - 未来：Supabase 实现，UI/Pipeline 无需改动
 */
import { readJSON, writeJSON } from "../store/storage";
import type { LearningEvent, ScoreUpdate, UserDecision, UserDecisionReview, ValidationPlan, ValidationResult } from "./types";

const DECISION_DATA_KEY = "decisionData";

export interface DecisionData {
  decisions: UserDecision[];
  reviews: UserDecisionReview[];
  plans: ValidationPlan[];
  results: ValidationResult[];
  events: LearningEvent[];
  updates: ScoreUpdate[];
}

/** 同步读取决策数据（浏览器 UI 配合 useLocalData 使用） */
export function readDecisionDataSync(): DecisionData {
  return readJSON<DecisionData>(DECISION_DATA_KEY, { decisions: [], reviews: [], plans: [], results: [], events: [], updates: [] });
}
export interface DecisionRepository {
  saveDecision(d: UserDecision): Promise<void>;
  getDecision(id: string): Promise<UserDecision | undefined>;
  listDecisions(opportunityId: string): Promise<UserDecision[]>;
  saveReview(r: UserDecisionReview): Promise<void>;
  getReview(decisionId: string): Promise<UserDecisionReview | undefined>;
  savePlan(p: ValidationPlan): Promise<void>;
  getPlan(decisionId: string): Promise<ValidationPlan | undefined>;
  listPlans(): Promise<ValidationPlan[]>;
  saveResult(r: ValidationResult): Promise<void>;
  listResults(planId: string): Promise<ValidationResult[]>;
  saveEvents(events: LearningEvent[]): Promise<void>;
  listEvents(opportunityId?: string): Promise<LearningEvent[]>;
  saveScoreUpdate(update: ScoreUpdate): Promise<void>;
  listScoreUpdates(decisionId: string): Promise<ScoreUpdate[]>;
}

export interface DecisionStorage {
  load(): DecisionData;
  save(data: DecisionData): void;
}

export function createBrowserDecisionStorage(): DecisionStorage {
  return {
    load: () => readJSON<DecisionData>(DECISION_DATA_KEY, { decisions: [], reviews: [], plans: [], results: [], events: [], updates: [] }),
    save: (data) => writeJSON(DECISION_DATA_KEY, data),
  };
}

export function createMemoryDecisionStorage(): DecisionStorage {
  let data: DecisionData = { decisions: [], reviews: [], plans: [], results: [], events: [], updates: [] };
  return {
    load: () => data,
    save: (next) => {
      data = next;
    },
  };
}

export class LocalDecisionRepository implements DecisionRepository {
  private readonly storage: DecisionStorage;

  constructor(storage?: DecisionStorage) {
    this.storage = storage ?? createBrowserDecisionStorage();
  }

  async saveDecision(d: UserDecision): Promise<void> {
    const data = this.storage.load();
    const i = data.decisions.findIndex((x) => x.id === d.id);
    if (i >= 0) data.decisions[i] = d;
    else data.decisions.push(d);
    this.storage.save(data);
  }
  async getDecision(id: string) {
    return this.storage.load().decisions.find((d) => d.id === id);
  }
  async listDecisions(opportunityId: string) {
    return this.storage.load().decisions.filter((d) => d.opportunityId === opportunityId);
  }
  async saveReview(r: UserDecisionReview): Promise<void> {
    const data = this.storage.load();
    const i = data.reviews.findIndex((x) => x.id === r.id);
    if (i >= 0) data.reviews[i] = r;
    else data.reviews.push(r);
    this.storage.save(data);
  }
  async getReview(decisionId: string) {
    return this.storage.load().reviews.find((r) => r.decisionId === decisionId);
  }
  async savePlan(p: ValidationPlan): Promise<void> {
    const data = this.storage.load();
    const i = data.plans.findIndex((x) => x.id === p.id);
    if (i >= 0) data.plans[i] = p;
    else data.plans.push(p);
    this.storage.save(data);
  }
  async getPlan(decisionId: string) {
    return this.storage.load().plans.find((p) => p.decisionId === decisionId);
  }
  async listPlans() {
    return this.storage.load().plans;
  }
  async saveResult(r: ValidationResult): Promise<void> {
    const data = this.storage.load();
    const i = data.results.findIndex((x) => x.id === r.id);
    if (i >= 0) data.results[i] = r;
    else data.results.push(r);
    this.storage.save(data);
  }
  async listResults(planId: string) {
    return this.storage.load().results.filter((r) => r.planId === planId);
  }
  async saveEvents(events: LearningEvent[]): Promise<void> {
    const data = this.storage.load();
    data.events.push(...events);
    this.storage.save(data);
  }
  async listEvents(opportunityId?: string) {
    const events = this.storage.load().events;
    return opportunityId ? events.filter((e) => e.opportunityId === opportunityId) : events;
  }
  async saveScoreUpdate(update: ScoreUpdate): Promise<void> {
    const data = this.storage.load();
    data.updates.push(update);
    this.storage.save(data);
  }
  async listScoreUpdates(decisionId: string) {
    return this.storage.load().updates.filter((u) => u.decisionId === decisionId);
  }
}