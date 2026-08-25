/**
 * Project Memory Store（V1.5）：文件持久化（.data/project-memory.json），跨重启存活。
 */
import fs from "node:fs";
import path from "node:path";
import { emptyMemory } from "./types";
import type { ProjectMemory } from "./types";

function filePath(): string {
  const base = process.env.AI_USAGE_FILE ? path.dirname(process.env.AI_USAGE_FILE) : ".data";
  return path.join(base, "project-memory.json");
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
        for (const m of raw) this.data.set(m.projectId, m);
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
    this.data.set(memory.projectId, memory);
    this.persist();
  }
}

export const projectMemoryStore = new ProjectMemoryStore();
