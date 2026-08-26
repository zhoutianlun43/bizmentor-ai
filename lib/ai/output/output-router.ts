/**
 * Output Strategy Router（V1.7）：意图 → 输出模板（blocks + 质量规则）。
 */
import businessAnalysis from "../../../config/ai-output-templates/business-analysis.json";
import competitorAnalysis from "../../../config/ai-output-templates/competitor-analysis.json";
import productSelection from "../../../config/ai-output-templates/product-selection.json";
import executionPlan from "../../../config/ai-output-templates/execution-plan.json";
import type { OutputTemplate } from "./response-schema";
import type { AiIntent } from "./intent-analyzer";

const TEMPLATES: OutputTemplate[] = [businessAnalysis, competitorAnalysis, productSelection, executionPlan] as OutputTemplate[];

export function getTemplate(intent: AiIntent): OutputTemplate {
  return TEMPLATES.find((t) => t.intent === intent) ?? TEMPLATES[0];
}

/** 把模板转成系统提示中的结构要求 */
export function templateInstruction(t: OutputTemplate): string {
  return `输出结构要求（模板：${t.label}）：\n- 必须包含 blocks：${t.blocks.join(", ")}\n- 必须覆盖：${t.sections.join(" / ")}\n- 必填字段：${t.requiredFields.join(", ")}\n- 质量规则：${t.qualityRules.join("；")}`;
}
