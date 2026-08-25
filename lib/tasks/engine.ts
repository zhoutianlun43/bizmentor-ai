/**
 * Task Engine（V1.4）：创建任务 → 后台异步执行 → 持续更新进度 → 完成/失败。
 * 前端只需 POST 创建拿到 taskId，然后轮询状态；关闭页面不影响执行。
 */
import { uid } from "../store/storage";
import { taskStore } from "./store";
import type { CreateTaskInput, Task } from "./types";

export type TaskUpdate = Partial<Pick<Task, "progress" | "currentStage" | "currentStageLabel" | "stages" | "result" | "error" | "status" | "checkpoint" | "completedAt">>;

export type TaskExecutor = (task: Task, update: (patch: TaskUpdate) => void, log: (entry: Omit<Parameters<typeof taskStore.addLog>[0], "taskId">) => void) => Promise<void>;

const REGISTRY = new Map<string, TaskExecutor>();

export function registerTaskExecutor(type: string, executor: TaskExecutor): void {
  REGISTRY.set(type, executor);
}

/** 创建任务并立即后台执行（不阻塞响应） */
export function createAndStartTask(input: CreateTaskInput): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: uid(),
    userId: input.userId ?? "local-user",
    projectId: input.projectId,
    taskType: input.type,
    title: input.title,
    payload: input.payload,
    status: "pending",
    progress: 0,
    stages: [],
    createdAt: now,
    updatedAt: now,
  };
  taskStore.save(task);

  const executor = REGISTRY.get(input.type);
  if (!executor) {
    task.status = "failed";
    task.error = `未知任务类型: ${input.type}`;
    task.updatedAt = new Date().toISOString();
    taskStore.save(task);
    return task;
  }

  // 后台执行：不 await，立即返回 taskId 给前端
  void (async () => {
    const update = (patch: TaskUpdate) => {
      Object.assign(task, patch);
      task.updatedAt = new Date().toISOString();
      taskStore.save(task);
    };
    const log = (entry: Omit<Parameters<typeof taskStore.addLog>[0], "taskId">) => {
      taskStore.addLog({ ...entry, taskId: task.id });
    };
    try {
      update({ status: "running" });
      await executor(task, update, log);
      update({ status: "completed", progress: 100, completedAt: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "任务失败";
      update({
        status: "failed",
        error: message,
        checkpoint: {
          completedStages: task.stages.filter((s) => s.status === "completed").length,
          failedStage: task.currentStage,
        },
      });
    }
  })();

  return task;
}
