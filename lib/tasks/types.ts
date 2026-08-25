/**
 * AI Agent 异步任务系统类型（V1.4）。
 * 所有 AI 长任务（研究/判断/雷达扫描/执行方案）脱离前端生命周期，后台独立运行。
 */
export type TaskType = "research" | "judgment" | "radar_scan" | "evidence_verify" | "content_generate" | "operation_plan";

export type TaskStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

/** 任务阶段快照（时间线） */
export interface TaskStage {
  stage: string;
  label?: string;
  status: "completed" | "failed" | "running" | "pending";
  provider?: string;
  searched?: number;
  sourcesFound?: number;
  evidenceFound?: number;
}

/** AI 任务（持久化到服务器文件，跨重启） */
export interface Task {
  id: string;
  userId: string;
  /** 关联商机/项目 id（可空：雷达全局扫描） */
  projectId?: string;
  taskType: TaskType;
  title: string;
  /** 任务入参（商机/材料等） */
  payload?: Record<string, unknown>;
  status: TaskStatus;
  /** 0-100 */
  progress: number;
  currentStage?: string;
  currentStageLabel?: string;
  stages: TaskStage[];
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** 失败时的 checkpoint：已完成阶段数（供继续/诊断） */
  checkpoint?: { completedStages: number; failedStage?: string };
}

/** Agent 执行日志：AI 到底做了什么（逐阶段） */
export interface AgentExecutionLog {
  id: string;
  taskId: string;
  stage: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  status: "started" | "completed" | "failed";
  note?: string;
  timestamp: string;
}

export interface CreateTaskInput {
  type: TaskType;
  projectId?: string;
  title: string;
  payload: Record<string, unknown>;
  userId?: string;
}
