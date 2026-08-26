import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRows, parseExport, summarize } from "../migrate";
import type { Opportunity } from "../../types";
import type { ResearchRun } from "../../research/types";
import type { DecisionData } from "../../decision/repository";

function sampleOpportunity(): Opportunity {
  return {
    id: "opp-mig-1",
    name: "迁移测试商机",
    description: "描述",
    source: "user",
    status: "researching",
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}

function sampleRun(): ResearchRun {
  return {
    runId: "run-mig-1",
    opportunityId: "opp-mig-1",
    status: "completed",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T01:00:00.000Z",
    stages: [],
    findings: [],
    scoreHistory: [],
    sourceDocuments: [],
  };
}

function sampleDecisionData(): DecisionData {
  return {
    decisions: [{ id: "dec-mig-1", opportunityId: "opp-mig-1", decision: "validate", differentFromAi: false, judgment: { why: "w", coreJudgment: "c", keyEvidence: "e", biggestRisk: "r", mostImportantAssumption: "a", expectedOutcome: "o" }, createdAt: "now", updatedAt: "now" }],
    reviews: [{ id: "rv-mig-1", decisionId: "dec-mig-1", score: 7.5, strengths: [], weaknesses: [], reasoningGaps: [], missingEvidence: [], recommendedActions: [], abilitySignals: [], provider: "deepseek", provider_degraded: false, createdAt: "now" }],
    plans: [],
    results: [],
    events: [],
    updates: [],
  };
}

test("parseExport：支持存储键映射格式", () => {
  const raw = {
    "bizmentor:v1:opportunities": [sampleOpportunity()],
    "bizmentor:v1:researchRuns": [sampleRun()],
    "bizmentor:v1:decisionData": sampleDecisionData(),
  };
  const data = parseExport(raw);
  assert.equal(data.opportunities.length, 1);
  assert.equal(data.researchRuns.length, 1);
  assert.equal(data.decisionData.decisions.length, 1);
});

test("parseExport：支持结构化格式", () => {
  const raw = { opportunities: [sampleOpportunity()], researchRuns: [sampleRun()], decisionData: sampleDecisionData() };
  const data = parseExport(raw);
  assert.equal(data.opportunities[0].id, "opp-mig-1");
});

test("summarize：统计各类数量", () => {
  const data = parseExport({ opportunities: [sampleOpportunity()], researchRuns: [sampleRun()], decisionData: sampleDecisionData() });
  const s = summarize(data);
  assert.equal(s.opportunities, 1);
  assert.equal(s.researchRuns, 1);
  assert.equal(s.decisions, 1);
  assert.equal(s.reviews, 1);
  assert.equal(s.plans, 0);
  assert.equal(s.events, 0);
});

test("buildRows：字段映射正确且保留原 id / user_id=local-user", () => {
  const data = parseExport({ opportunities: [sampleOpportunity()], researchRuns: [sampleRun()], decisionData: sampleDecisionData() });
  const rows = buildRows(data);
  assert.equal(rows.opportunities[0].id, "opp-mig-1");
  assert.equal(rows.opportunities[0].user_id, "local-user");
  assert.equal(rows.opportunities[0].score, null);
  assert.equal(rows.researchRuns[0].run_id, "run-mig-1");
  assert.equal(rows.researchRuns[0].opportunity_id, "opp-mig-1");
  assert.equal(rows.decisions[0].id, "dec-mig-1");
  assert.equal(rows.decisions[0].different_from_ai, false);
  assert.equal(rows.reviews[0].decision_id, "dec-mig-1");
  assert.equal(rows.reviews[0].score, 7.5);
  assert.equal(rows.reviews[0].provider, "deepseek");
});

test("buildRows：空导出不抛错", () => {
  const rows = buildRows(parseExport({}), "local-user");
  assert.equal(rows.opportunities.length, 0);
  assert.equal(rows.events.length, 0);
});


test("V2.0 buildRows：opportunities 行含 project_type（缺省 OPPORTUNITY）", () => {
  const rows = buildRows({ opportunities: [sampleOpportunity()], researchRuns: [sampleRun()], decisionData: sampleDecisionData() });
  assert.equal(rows.opportunities.length, 1);
  assert.equal(rows.opportunities[0].project_type, "OPPORTUNITY");
  const active = buildRows({ opportunities: [{ ...sampleOpportunity(), id: "opp-mig-2", projectType: "ACTIVE_PROJECT" }], researchRuns: [sampleRun()], decisionData: sampleDecisionData() });
  assert.equal(active.opportunities[0].project_type, "ACTIVE_PROJECT");
});
