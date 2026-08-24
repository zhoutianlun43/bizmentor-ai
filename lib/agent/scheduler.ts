/**
 * Agent Scheduler 基础（V0.4.2 Phase 9B-2）。
 * 第一阶段：App 打开触发 / 手动触发 / 测试触发（不做服务器 7×24）。
 * 未来预留：cron / server worker / push notification。
 */
export interface ScheduledTask {
  id: string;
  name: string;
  /** 周期（ms）；0 = 仅手动触发 */
  intervalMs?: number;
  runOnRegister?: boolean;
  handler: () => Promise<void> | void;
}

export class AgentScheduler {
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly lastRun = new Map<string, number>();

  registerTask(task: ScheduledTask): void {
    if (this.tasks.has(task.id)) throw new Error(`调度任务已注册：${task.id}`);
    this.tasks.set(task.id, task);
    this.lastRun.set(task.id, 0);
    if (task.runOnRegister) void this.runTask(task.id);
  }

  has(id: string): boolean {
    return this.tasks.has(id);
  }

  list(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  /** 手动/测试触发单个任务 */
  async runTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`调度任务不存在：${id}`);
    this.lastRun.set(id, Date.now());
    await task.handler();
  }

  /** 运行所有到期任务（周期已过 / 从未运行且非仅手动）；返回运行的任务 id */
  async runDueTasks(now: number = Date.now()): Promise<string[]> {
    const ran: string[] = [];
    for (const task of this.tasks.values()) {
      const last = this.lastRun.get(task.id) ?? 0;
      const due = task.intervalMs !== undefined && task.intervalMs > 0 && now - last >= task.intervalMs;
      if (due) {
        await this.runTask(task.id);
        ran.push(task.id);
      }
    }
    return ran;
  }

  /** 测试用：重置 */
  reset(): void {
    this.tasks.clear();
    this.lastRun.clear();
  }
}