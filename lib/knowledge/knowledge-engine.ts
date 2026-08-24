/**
 * Knowledge Capture Engine（V0.4.2 Phase 9B-4）。
 * - captureFromUserInput：用户直接输入 → 立即确认（confirmed=true）
 * - captureFromDecision / captureFromReview：系统（AI 规则）提取候选 → confirmed=false，等待用户确认
 * 确认前只能作为临时建议，不影响核心决策。
 */
import { uid } from "../store/storage";
import { getCurrentUserId } from "../identity/resolver";
import { LocalKnowledgeRepository } from "./repository";
import type { KnowledgeRepository } from "./repository";
import type { DecisionMemoryRecord } from "../memory/types";
import type { DailyReview } from "../agent/loops/types";
import type { KnowledgeRecord, KnowledgeType, KnowledgeSource, UserKnowledgeInput } from "./types";

export class KnowledgeEngine {
  private readonly repo: KnowledgeRepository;
  private readonly userId: string;

  constructor(repo?: KnowledgeRepository, userId?: string) {
    this.repo = repo ?? new LocalKnowledgeRepository();
    this.userId = userId ?? getCurrentUserId();
  }

  private candidate(type: KnowledgeType, content: string, tags: string[], source: KnowledgeSource): KnowledgeRecord {
    return {
      id: uid(),
      userId: this.userId,
      type,
      content,
      tags,
      source,
      confidence: 0.6,
      confirmed: false,
      createdAt: new Date().toISOString(),
    };
  }

  /** 用户直接输入：立即确认（用户自己说的，不是 AI 幻觉） */
  async captureFromUserInput(input: UserKnowledgeInput): Promise<KnowledgeRecord> {
    const record: KnowledgeRecord = {
      id: uid(),
      userId: input.userId ?? this.userId,
      type: input.type ?? "habit",
      content: input.content,
      tags: input.tags ?? [],
      source: "user_input",
      confidence: 1,
      confirmed: true,
      createdAt: new Date().toISOString(),
    };
    await this.repo.save(record);
    return record;
  }

  /** 从决策记忆提取候选长期经验（confirmed=false，等待确认） */
  async captureFromDecision(memoryRecord: DecisionMemoryRecord): Promise<KnowledgeRecord[]> {
    const candidates: KnowledgeRecord[] = [];
    const judgment = memoryRecord.userPrediction?.coreJudgment ?? "";

    // 判断方式：低客单/快速验证模式
    if (/低客单|低价|快速验证|小批量|轻库存|测款/i.test(judgment)) {
      candidates.push(
        this.candidate("judgment_style", "用户倾向选择低客单快速验证模式", ["低价", "快速验证"], "decision"),
      );
    }
    // 成功案例
    if (memoryRecord.outcome === "confirmed") {
      candidates.push(
        this.candidate(
          "success_case",
          `成功决策：${memoryRecord.opportunityName || "未知商机"}（${memoryRecord.decision}）`,
          ["成功", memoryRecord.domain ?? "ecommerce"],
          "decision",
        ),
      );
    }
    // 失败案例
    if (memoryRecord.outcome === "rejected") {
      candidates.push(
        this.candidate(
          "failure_case",
          `失败决策：${memoryRecord.opportunityName || "未知商机"}（${memoryRecord.decision}）${memoryRecord.lesson ? "，" + memoryRecord.lesson : ""}`,
          ["失败", memoryRecord.domain ?? "ecommerce"],
          "decision",
        ),
      );
    }
    for (const c of candidates) await this.repo.save(c);
    return candidates;
  }

  /** 从每日复盘提取候选经验（confirmed=false） */
  async captureFromReview(review: DailyReview): Promise<KnowledgeRecord[]> {
    const candidates: KnowledgeRecord[] = [];
    for (const lesson of review.lessons) {
      if (/失败|证伪|下降/i.test(lesson)) {
        candidates.push(this.candidate("failure_case", lesson, ["复盘"], "review"));
      } else if (/成功|确认|达标/i.test(lesson)) {
        candidates.push(this.candidate("success_case", lesson, ["复盘"], "review"));
      }
    }
    for (const action of review.tomorrowActions) {
      if (/超期|重排|尽快/i.test(action)) {
        candidates.push(this.candidate("habit", `用户倾向处理超期/堆积任务需提醒：${action.slice(0, 40)}`, ["任务习惯"], "review"));
        break;
      }
    }
    for (const c of candidates) await this.repo.save(c);
    return candidates;
  }

  /** 确认候选 → 进入长期 Knowledge */
  async confirm(id: string): Promise<KnowledgeRecord | undefined> {
    return this.repo.confirm(id);
  }

  async save(record: KnowledgeRecord): Promise<void> {
    await this.repo.save(record);
  }

  /** 全部（可只取已确认） */
  async list(confirmedOnly = false): Promise<KnowledgeRecord[]> {
    const all = await this.repo.list();
    return confirmedOnly ? all.filter((r) => r.confirmed) : all;
  }

  /** 已确认（进入 Agent Context 的长期 Knowledge） */
  async confirmed(): Promise<KnowledgeRecord[]> {
    return this.list(true);
  }

  async findByType(type: KnowledgeType, confirmedOnly = true): Promise<KnowledgeRecord[]> {
    const list = await this.repo.findByType(type);
    return confirmedOnly ? list.filter((r) => r.confirmed) : list;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.remove(id);
  }
}

/** 从已确认知识中提取与某类相关的内容（Skill 使用） */
export async function knowledgeInsights(
  engine: KnowledgeEngine | undefined,
  types: KnowledgeType[] = ["habit", "judgment_style", "industry_experience"],
): Promise<string[]> {
  if (!engine) return [];
  const confirmed = await engine.confirmed();
  return confirmed
    .filter((r) => types.includes(r.type))
    .map((r) => `[${r.type}] ${r.content}`)
    .slice(0, 5);
}