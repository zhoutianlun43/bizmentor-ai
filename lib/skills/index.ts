/** Skill System（V0.4.2 Phase 9B-3）对外出口 */
export { SkillRegistry } from "./registry";
export { createProductSelectionSkill } from "./product-selection";
export { createCompetitorAnalysisSkill } from "./competitor-analysis";
export { researchToSkillResult, sectionOf } from "./research-adapter";
export type {
  BizSkill,
  CompetitorAnalysisInput,
  CompetitorAnalysisResult,
  ProductSelectionInput,
  ProductSelectionResult,
  SkillDeps,
  SkillOutput,
  SkillResearchResult,
} from "./types";