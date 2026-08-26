/**
 * Project Memory Store（V1.5）：文件持久化（.data/project-memory.json），跨重启存活。
 * V1.9：加载时自动迁移旧数据（字符串事实 → BusinessFact；决策补 id；新字段补默认）。
 */
import fs from "node:fs";
import path from "node:path";
import { emptyMemory, toBusinessFact } from "./types";
import type { BusinessFact, ProjectDecision, ProjectMemory } from "./types";

function filePath(): string {
  const base = process.env.AI_USAGE_FILE ? path.dirname(process.env.AI_USAGE_FILE) : ".data";
  return path.join(base, "project-memory.json");
}

function migrate(memory: ProjectMemory): ProjectMemory {
  // 兼容旧记忆记录：字符串事实 → BusinessFact；决策补 id；新字段补默认
  memory.facts = (memory.facts ?? []).map((f) => toBusinessFact(f as string | Partial<BusinessFact> & { content?: string }));
  memory.userDecisions ??= [];
  memory.changes ??= [];
  memory.aiJudgments ??= [];
  memory.decisionLog ??= [];
  memory.aiJudgmentChanges ??= [];
  memory.knowledgeBase ??= [];
  memory.reviews ??= [];
  memory.lessonsLearned ??= [];
  memory.decisionLog = (memory.decisionLog as ProjectDecision[]).map((d) => ({ ...d, id: d.id || `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }));
  return memory;
}

export class ProjectMemoryStore {
  private data = new Map<string, ProjectMemory>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(filePath())) {
        const raw = JSON.parse(fs.readFileSync(filePath(), "utf8")) as ProjectMemory[];
        for (const m of raw) this.data.set(m.projectId, migrate(m));
      }
    } catch {
      // 忽略
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(filePath()), { recursive: true });
      const list = Array.from(this.data.values());
      fs.writeFileSync(filePath(), JSON.stringify(list, null, 2), "utf8");
    } catch {
      // 忽略
    }
  }

  get(projectId: string): ProjectMemory {
    this.load();
    return this.data.get(projectId) ?? emptyMemory(projectId);
  }

  save(memory: ProjectMemory): void {
    this.load();
    memory.updatedAt = new Date().toISOString();
    this.data.set(memory.projectId, migrate(memory));
    this.persist();
  }
}

export const projectMemoryStore = new ProjectMemoryStore();
