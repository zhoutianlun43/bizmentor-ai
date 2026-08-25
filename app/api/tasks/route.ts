/**
 * /api/tasks —— AI 任务系统入口（V1.4）。
 * POST：创建后台任务（立即返回 taskId，不阻塞）；GET：任务列表（任务中心）。
 */
import { NextResponse } from "next/server";
import { registerAllExecutors } from "@/lib/tasks/executors";
import { createAndStartTask } from "@/lib/tasks/engine";
import { taskStore } from "@/lib/tasks/store";
import { getCurrentUserId } from "@/lib/identity";

registerAllExecutors();

const VALID_TYPES = ["research", "judgment", "radar_scan", "operation_plan"];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const { type, projectId, title, payload } = (body ?? {}) as { type?: string; projectId?: string; title?: string; payload?: Record<string, unknown> };
  if (!type || !VALID_TYPES.includes(type) || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const task = createAndStartTask({
    type: type as "research",
    projectId,
    title,
    payload: payload ?? {},
    userId: getCurrentUserId(),
  });
  return NextResponse.json({ taskId: task.id });
}

export async function GET() {
  return NextResponse.json({ tasks: taskStore.list() });
}
