/** 任务执行器注册（V1.4） */
import { registerTaskExecutor } from "../engine";
import { researchExecutor } from "./research";
import { decisionExecutor } from "./decision";
import { radarScanExecutor } from "./radar";

export function registerAllExecutors(): void {
  registerTaskExecutor("research", researchExecutor);
  registerTaskExecutor("judgment", decisionExecutor);
  registerTaskExecutor("operation_plan", decisionExecutor);
  registerTaskExecutor("radar_scan", radarScanExecutor);
}
