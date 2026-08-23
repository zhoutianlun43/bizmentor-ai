import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecisionService, makeResearchRun } from "./helpers";

/** 12. 完整 E2E：Decision → Review → Validation → Result → Score v2 → Events */
test("完整决策验证闭环 E2E", async () => {
  const { service, researchRepo } = createDecisionService();
  await makeResearchRun(researchRepo, "opp-e2e");

  // 1) 决策 + 用户判断
  const { decision } = await service.createDecision({
    opportunityId: "opp-e2e",
    decision: "validate",
    differentFromAi: false,
    judgment: { why: "痛点真实", coreJudgment: "值得验证", keyEvidence: "访谈 5 人", biggestRisk: "获客", mostImportantAssumption: "愿意付费", expectedOutcome: "30 天验证" },
  });

  // 2) AI Examiner
  const { review } = await service.reviewDecision(decision.id, { name: "商机", description: "描述" });
  assert.equal(review.score, 7.5);

  // 3) 验证计划
  const plan = await service.createValidationPlan({
    decisionId: decision.id,
    opportunityId: "opp-e2e",
    tasks: [
      { assumption: "愿意付费", hypothesis: "h", method: "访谈", sampleSize: "10", successCriteria: "≥7", failureCriteria: "<4", deadline: "d", costEstimate: "c", owner: "o", relatedDimension: "willingnessToPay" },
      { assumption: "获客成本可控", hypothesis: "h2", method: "投放测试", sampleSize: "1000 曝光", successCriteria: "CAC<50", failureCriteria: "CAC>150", deadline: "d", costEstimate: "c", owner: "o", relatedDimension: "customerAcquisition" },
    ],
  });
  await service.updateTaskStatus(plan.tasks[0].id, "running");
  await service.updateTaskStatus(plan.tasks[0].id, "completed");

  // 4) 验证结果（真实数据）
  await service.submitValidationResult({
    taskId: plan.tasks[0].id,
    actualSample: "12 人",
    actualResult: "10 人愿意按月付费",
    userFeedback: "价格合理",
    actualConversionRate: 0.83,
    outcome: "confirmed",
    submittedBy: "user",
  });
  await service.submitValidationResult({
    taskId: plan.tasks[1].id,
    actualSample: "500 曝光",
    actualResult: "CAC 约 180 元，过高",
    userFeedback: "",
    outcome: "rejected",
    submittedBy: "user",
  });

  // 5) Score v2
  const { next, update } = await service.applyValidationToScore(decision.id);
  assert.equal(next.version, 2);
  assert.equal(update.validationResults.length, 2);

  const run = await researchRepo.getRun("opp-e2e");
  assert.equal(run?.scoreHistory.length, 2);

  // 6) Learning Events
  const events = await service.listEvents("opp-e2e");
  assert.ok(events.length >= 5);
  const skills = new Set(events.map((e) => e.skill));
  assert.ok(skills.has("strategic_judgment"));
  assert.ok(skills.has("validation"));
  assert.ok(skills.has("review"));
});