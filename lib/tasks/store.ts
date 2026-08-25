/**
 * 任务持久化 Store（V1.4）：文件存储（服务器 .data/，零数据库迁移，跨重启存活）。
 * 单用户阶段（local-user）；未来 Auth/多机可平滑切到 Supabase tasks 表。
 */
import fs from "node:fs";
import path from "node:path";
import { uid } from "../store/storage";
import type { AgentExecutionLog, Task } from "./types";

function dataDir(): string {
  const base = process.env.AI_USAGE_FILE ? path.dirname(process.env.AI_USAGE_FILE) : ".data";
  return base;
}

const TASKS_FILE = () => path.join(dataDir(), "tasks.json");
const LOGS_FILE = () => path.join(dataDir(), "agent-logs.jsonl");

function ensureDir(): void {
  fs.mkdirSync(dataDir(), { recursive: true });
}

export class TaskStore {
  private tasks = new Map<string, Task>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      ensureDir();
      if (fs.existsSync(TASKS_FILE())) {
        const raw = fs.readFileSync(TASKS_FILE(), "utf8");
        const list = JSON.parse(raw) as Task[];
        for (const t of list) this.tasks.set(t.id, t);
      }
    } catch {
      // 读取失败：从空开始（不崩溃）
    }
  }

  private persist(): void {
    try {
      ensureDir();
      const list = Array.from(this.tasks.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      fs.writeFileSync(TASKS_FILE(), JSON.stringify(list, null, 2), "utf8");
    } catch {
      // 写失败不崩溃
    }
  }

  get(id: string): Task | undefined {
    this.load();
    return this.tasks.get(id);
  }

  list(): Task[] {
    this.load();
    return Array.from(this.tasks.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  /** 按类型 + 商机查找最近任务 */
  latest(type: string, projectId?: string): Task | undefined {
    this.load();
    return this.list().find((t) => t.taskType === type && (!projectId || t.projectId === projectId));
  }

  save(task: Task): void {
    this.load();
    this.tasks.set(task.id, task);
    this.persist();
  }

  addLog(log: Omit<AgentExecutionLog, "id" | "timestamp">): void {
    try {
      ensureDir();
      const entry: AgentExecutionLog = { ...log, id: uid(), timestamp: new Date().toISOString() };
      fs.appendFileSync(LOGS_FILE(), JSON.stringify(entry) + "\n", "utf8");
    } catch {
      // 日志失败不崩溃
    }
  }

  logsFor(taskId: string): AgentExecutionLog[] {
    try {
      if (!fs.existsSync(LOGS_FILE())) return [];
      const lines = fs.readFileSync(LOGS_FILE(), "utf8").split("\n").filter(Boolean);
      return lines
        .map((l) => {
          try { return JSON.parse(l) as AgentExecutionLog; } catch { return null; }
        })
        .filter((l): l is AgentExecutionLog => Boolean(l && l.taskId === taskId));
    } catch {
      return [];
    }
  }
}

export const taskStore = new TaskStore();
