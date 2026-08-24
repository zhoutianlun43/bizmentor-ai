/**
 * skill_tool（V0.4.2 Phase 9B-3）：让 AgentRuntime 按 skill id 调用商业技能。
 * 输入：{ skill, input } → SkillRegistry.invokeSkill
 */
import type { SkillRegistry } from "../../skills/registry";
import type { AgentTool } from "../types";

export function createSkillTool(registry: SkillRegistry): AgentTool {
  return {
    id: "skill_tool",
    name: "技能工具",
    description: "按 skill id 调用商业技能（如 product_selection / competitor_analysis）",
    async execute(ctx, input) {
      const { skill, input: skillInput } = (input ?? {}) as { skill: string; input?: unknown };
      if (!skill) throw new Error("skill_tool 需要 skill id");
      const output = await registry.invokeSkill(skill, ctx, skillInput);
      return { skill, output };
    },
  };
}