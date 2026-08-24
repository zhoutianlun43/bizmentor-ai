/**
 * LocalDecisionRepository 包装（V0.4.1 Phase 3 Task 3C）。
 * 作为 DecisionRepository 的本地 fallback（localStorage），
 * 供 Repository Provider 在未配置 Supabase 时返回。
 */
import { LocalDecisionRepository, createBrowserDecisionStorage } from "./repository";
import type { DecisionRepository, DecisionStorage } from "./repository";
import type {
  LearningEvent,
  ScoreUpdate,
  UserDecision,
  UserDecisionReview,
  ValidationPlan,
  ValidationResult,
} from "./types";

export class LocalDecisionRepositoryWrapper implements DecisionRepository {
  private readonly inner: LocalDecisionRepository;

  constructor(storage?: DecisionStorage) {
    this.inner = new LocalDecisionRepository(storage ?? createBrowserDecisionStorage());
  }

  async saveDecision(d: UserDecision): Promise<void> {
    return this.inner.saveDecision(d);
  }
  async getDecision(id: string): Promise<UserDecision | undefined> {
    return this.inner.getDecision(id);
  }
  async listDecisions(opportunityId: string): Promise<UserDecision[]> {
    return this.inner.listDecisions(opportunityId);
  }
  async saveReview(r: UserDecisionReview): Promise<void> {
    return this.inner.saveReview(r);
  }
  async getReview(decisionId: string): Promise<UserDecisionReview | undefined> {
    return this.inner.getReview(decisionId);
  }
  async savePlan(p: ValidationPlan): Promise<void> {
    return this.inner.savePlan(p);
  }
  async getPlan(decisionId: string): Promise<ValidationPlan | undefined> {
    return this.inner.getPlan(decisionId);
  }
  async listPlans(): Promise<ValidationPlan[]> {
    return this.inner.listPlans();
  }
  async saveResult(r: ValidationResult): Promise<void> {
    return this.inner.saveResult(r);
  }
  async listResults(planId: string): Promise<ValidationResult[]> {
    return this.inner.listResults(planId);
  }
  async saveEvents(events: LearningEvent[]): Promise<void> {
    return this.inner.saveEvents(events);
  }
  async listEvents(opportunityId?: string): Promise<LearningEvent[]> {
    return this.inner.listEvents(opportunityId);
  }
  async saveScoreUpdate(update: ScoreUpdate): Promise<void> {
    return this.inner.saveScoreUpdate(update);
  }
  async listScoreUpdates(decisionId: string): Promise<ScoreUpdate[]> {
    return this.inner.listScoreUpdates(decisionId);
  }
}
