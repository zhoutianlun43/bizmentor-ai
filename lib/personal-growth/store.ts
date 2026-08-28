/**
 * Personal Growth Store（V1.0）：文件持久化（.data/personal-growth.json），跨重启存活。
 * 与 Project Memory Store 独立；按 userId 隔离（当前单用户 local-user）。
 */
import fs from "node:fs";
import path from "node:path";
import { emptyBrain } from "./types";
import type { PersonalGrowthBrain } from "./types";

function filePath(): string {
  const base = process.env.AI_USAGE_FILE ? path.dirname(process.env.AI_USAGE_FILE) : ".data";
  return path.join(base, "personal-growth.json");
}

export class PersonalGrowthStore {
  private data = new Map<string, PersonalGrowthBrain>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(filePath())) {
        const raw = JSON.parse(fs.readFileSync(filePath(), "utf8")) as PersonalGrowthBrain[];
        for (const b of raw) this.data.set(b.userId, this.normalize(b));
      }
    } catch {
      // 忽略损坏数据，回退空大脑
    }
  }

  private normalize(b: PersonalGrowthBrain): PersonalGrowthBrain {
    b.modeling ??= { started: false, completed: false, currentStage: 0, answers: [] };
    b.personality ??= null;
    b.strategy ??= null;
    b.abilities ??= null;
    b.motivation ??= null;
    b.insights ??= [];
    b.dailyReviews ??= [];
    b.reports ??= [];
    b.knowledge ??= [];
    return b;
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

  get(userId: string): PersonalGrowthBrain {
    this.load();
    return this.data.get(userId) ?? emptyBrain(userId);
  }

  save(brain: PersonalGrowthBrain): void {
    this.load();
    brain.updatedAt = new Date().toISOString();
    this.data.set(brain.userId, this.normalize(brain));
    this.persist();
  }
}

export const personalGrowthStore = new PersonalGrowthStore();
