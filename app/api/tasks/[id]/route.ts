/**
 * GET /api/tasks/:id —— 单任务状态 + Agent 执行日志（前端轮询）。
 */
import { NextResponse } from "next/server";
import { taskStore } from "@/lib/tasks/store";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const task = taskStore.get(id);
  if (!task) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ task, logs: taskStore.logsFor(id) });
}
