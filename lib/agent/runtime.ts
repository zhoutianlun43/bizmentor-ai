/**
 * AgentRuntime（V0.4.2 Phase 9B-1）。
 * 流程：接收触发 → 恢复 Context → planning（选工具）→ executing（跑工具）→
 * observing（汇总结果）→ reflecting（生成结果）→ 记录 Run → 结束。
 * 每次运行可追踪（AgentRun + 生命周期历史）。
 */
import { uid } from "../store/storage";
import { recoverContext } from "./context";
import type { ContextRecoveryDeps } from "./context";
import { AgentLifecycle, canTransition } from "./lifecycle";
import { AgentToolRegistry } from "./tool-registry";
import { LocalAgentRunRepository } from "./runs";
import type { AgentRunRepository } from "./runs";
import type { AgentRun, AgentRunInput, AgentTool, AgentTrigger } from "./types";

export interface AgentRuntimeDeps {
  /** 上下文恢复依赖（Repository/Memory/Execution） */
  context: ContextRecoveryDeps;
  /** 可用工具（缺省空，调用方注册） */
  tools?: AgentTool[];
  /** Run 审计存储（缺省 Local） */
  runs?: AgentRunRepository;
}

export class AgentRuntime {
  private readonly contextDeps: ContextRecoveryDeps;
  private readonly registry: AgentToolRegistry;
  private readonly runs: AgentRunRepository;
  private readonly lifecycle: AgentLifecycle;

  constructor(deps: AgentRuntimeDeps) {
    this.contextDeps = deps.context;
    this.registry = new AgentToolRegistry();
    if (deps.tools) this.registry.registerMany(deps.tools);
    this.runs = deps.runs ?? new LocalAgentRunRepository();
    this.lifecycle = new AgentLifecycle();
  }

  registerTool(tool: AgentTool): void {
    this.registry.register(tool);
  }

  tools(): AgentTool[] {
    return this.registry.list();
  }

  getLifecycle(): AgentLifecycle {
    return this.lifecycle;
  }

  /** 运行一次 Agent（可追踪） */
  async run(trigger: AgentTrigger, input: AgentRunInput = {}): Promise<AgentRun> {
    const startedAt = new Date().toISOString();
    const userId = this.contextDeps.activeDecisionId ? "resolved-in-context" : "local-user";
    const run: AgentRun = {
      id: uid(),
      userId,
      trigger,
      status: "idle",
      toolsUsed: [],
      startedAt,
      triggerType: input.triggerType,
      events: input.events,
      loopType: input.loopType,
      memoryWrites: input.memoryWrites,
    };

    try {
      // 1) 恢复上下文
      const ctx = await recoverContext(this.contextDeps);
      run.userId = ctx.userId;

      // 2) planning：选择工具（input.skill 便捷 → 走 skill_tool）
      this.lifecycle.transition("planning");
      const effectiveTools = input.skill ? ["skill_tool"] : input.tools && input.tools.length > 0 ? input.tools : this.registry.list().map((t) => t.id);
      const effectiveArgs = input.skill
        ? { ...(input.args ?? {}), skill_tool: { skill: input.skill, input: input.skillInput ?? input.args?.skill_tool } }
        : input.args;
      const toolIds = effectiveTools;
      const selected = toolIds.map((id) => {
        const tool = this.registry.get(id);
        if (!tool) throw new Error(`未知工具：${id}`);
        return tool;
      });

      // 3) executing：依次执行
      this.lifecycle.transition("executing");
      const outputs: Record<string, unknown> = {};
      for (const tool of selected) {
        const toolStart = Date.now();
        try {
          const result = await tool.execute(ctx, effectiveArgs?.[tool.id]);
          run.toolsUsed.push({ toolId: tool.id, input: effectiveArgs?.[tool.id] ?? null, result, durationMs: Date.now() - toolStart });
          outputs[tool.id] = result;
        } catch (error) {
          run.toolsUsed.push({
            toolId: tool.id,
            input: input.args?.[tool.id] ?? null,
            error: safeMessage(error),
            durationMs: Date.now() - toolStart,
          });
          throw error;
        }
      }

      // 4) observing：汇总工具结果 + 技能记录
      this.lifecycle.transition("observing");
      const skillCall = run.toolsUsed.find((t) => t.toolId === "skill_tool");
      if (skillCall?.result) {
        const { skill, output } = skillCall.result as { skill?: string; output?: { summary?: string; createdAt?: string } };
        if (skill) {
          run.skillsUsed = [skill];
          run.skillResults = [{ skillId: skill, summary: output?.summary ?? "", createdAt: output?.createdAt ?? new Date().toISOString() }];
        }
      }
      const observation = { toolCount: selected.length, outputs };

      // 5) reflecting：生成最终结果
      this.lifecycle.transition("reflecting");
      run.result = observation;

      // 6) 结束
      this.lifecycle.transition("idle");
      run.status = "completed";
    } catch (error) {
      // 上下文恢复失败时 state 仍为 idle（idle→failed 非法），跳过转换
      if (canTransition(this.lifecycle.getState(), "failed")) this.lifecycle.transition("failed");
      run.status = "failed";
      run.error = safeMessage(error);
    } finally {
      // 每次运行结束回到 idle（failed→idle 合法），保证下次运行可继续
      if (this.lifecycle.getState() !== "idle" && canTransition(this.lifecycle.getState(), "idle")) {
        this.lifecycle.transition("idle");
      }
      run.completedAt = new Date().toISOString();
      run.duration = Date.parse(run.completedAt) - Date.parse(run.startedAt);
      await this.runs.save(run);
    }
    return run;
  }

  /** 查询历史 Run */
  async listRuns(): Promise<AgentRun[]> {
    return this.runs.list();
  }
}

function safeMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300);
  return String(err).slice(0, 300);
}