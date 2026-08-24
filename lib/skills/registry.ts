/**
 * Skill Registry（V0.4.2 Phase 9B-3）。
 * 动态注册 / 查询 / 列举 / 调用；skill id 唯一，重复注册报错。
 */
import type { AgentContext } from "../agent/types";
import type { BizSkill, SkillOutput } from "./types";

export class SkillRegistry {
  private readonly skills = new Map<string, BizSkill>();

  registerSkill(skill: BizSkill): void {
    if (this.skills.has(skill.id)) throw new Error(`技能已注册：${skill.id}`);
    this.skills.set(skill.id, skill);
  }

  registerSkills(skills: BizSkill[]): void {
    for (const s of skills) this.registerSkill(s);
  }

  getSkill(id: string): BizSkill | undefined {
    return this.skills.get(id);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }

  listSkills(): BizSkill[] {
    return [...this.skills.values()];
  }

  /** 调用技能（AgentRuntime 可调用） */
  async invokeSkill(id: string, context: AgentContext, input: unknown): Promise<SkillOutput> {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`未知技能：${id}`);
    return skill.run(context, input);
  }
}