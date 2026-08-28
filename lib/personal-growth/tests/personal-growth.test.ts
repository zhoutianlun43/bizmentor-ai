/**
 * Personal AI Life OS（V1.0）测试：持久化/蓝图兜底/知识分类/评分/周报聚合。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { PersonalGrowthStore } from "../store";
import { emptyBrain, KNOWLEDGE_CATEGORIES } from "../types";
import { extractBlueprintFallback, categorizeKnowledge, makeKnowledge } from "../agent";
import { computeFallbackScore, normalizeScore } from "../score";
import { buildDeterministicReport } from "../report";
import { MODELING_STAGES } from "../questions";

const tmp = path.join(os.tmpdir(), "bizmentor-growth-test-" + Date.now());
process.env.AI_USAGE_FILE = path.join(tmp, "usage.jsonl");

test("V1.0 MODELING_STAGES：六阶段访谈完整", () => {
  assert.equal(MODELING_STAGES.length, 6);
  assert.ok(MODELING_STAGES[0].title.includes("人生经历"));
  assert.ok(MODELING_STAGES[5].title.includes("价值观"));
  for (const s of MODELING_STAGES) assert.ok(s.questions.length >= 2);
});

test("V1.0 PersonalGrowthStore：写入/读取持久化（跨实例）", () => {
  const store = new PersonalGrowthStore();
  const brain = emptyBrain("local-user");
  brain.modeling.completed = true;
  brain.personality = { traits: ["理性"], strengths: ["执行"], weaknesses: ["拖延"], stressPatterns: ["熬夜"], decisionStyle: "先分析再决定", summary: "测试画像" };
  brain.dailyReviews = [];
  store.save(brain);
  const fresh = new PersonalGrowthStore();
  const got = fresh.get("local-user");
  assert.equal(got.modeling.completed, true);
  assert.equal(got.personality?.decisionStyle, "先分析再决定");
  assert.ok(Array.isArray(got.insights));
  assert.ok(Array.isArray(got.knowledge));
});

test("V1.0 emptyBrain：默认字段完整", () => {
  const b = emptyBrain("u1");
  assert.equal(b.userId, "u1");
  assert.equal(b.modeling.started, false);
  assert.equal(b.modeling.completed, false);
  assert.deepEqual(b.dailyReviews, []);
  assert.deepEqual(b.reports, []);
  assert.deepEqual(b.knowledge, []);
  assert.ok(b.updatedAt);
});

test("V1.0 extractBlueprintFallback：无 LLM 也能产出蓝图与画像", () => {
  const answers = [
    "大学创业失败后进入电商行业，三年做到月销百万",
    "内向但坚定，压力时先独处再行动，决策靠数据和直觉",
    "目标建立一家可持续的 AI 商业服务公司，财富自由",
    "优势：商业洞察、执行力；瓶颈：公开表达",
    "作息规律但运动少，工作让我消耗，写作让我充满能量",
    "价值观：创造价值、长期主义；十年后成为行业思想领袖",
  ];
  const bp = extractBlueprintFallback(answers);
  assert.ok(bp.sections.个人画像.length > 0);
  assert.ok(bp.sections.核心优势.length >= 1);
  assert.ok(bp.sections["12个月升级路线"].length >= 3);
  assert.ok(bp.personality && bp.personality.traits.length >= 1);
  assert.ok(bp.strategy && bp.strategy.values.length >= 1);
  assert.ok(bp.abilities && bp.abilities.current.length >= 3);
  assert.ok(bp.motivation && bp.motivation.energizes.length >= 1);
});

test("V1.0 categorizeKnowledge：自动分类 01-07", () => {
  assert.equal(categorizeKnowledge("我的优势是执行力强，性格偏理性"), "01 人格档案");
  assert.equal(categorizeKnowledge("五年目标：成为行业专家，长期价值优先"), "02 人生战略");
  assert.equal(categorizeKnowledge("今天学习了一个新方法并做了刻意练习"), "04 学习记录");
  assert.equal(categorizeKnowledge("今日复盘：计划完成 80%，情绪平静"), "05 每日复盘");
  assert.equal(categorizeKnowledge("我决定减少无效社交，把时间投入学习"), "06 决策记录");
  assert.equal(categorizeKnowledge("AI 发现我容易在压力下逃避问题"), "07 人生洞察");
});

test("V1.0 makeKnowledge：生成知识条目并分类", () => {
  const k = makeKnowledge("每日复盘 2026-08-28", "评分 75；今天完成了学习计划", "05 每日复盘");
  assert.ok(k.id);
  assert.equal(k.category, "05 每日复盘");
  assert.ok(k.createdAt);
});

test("V1.0 computeFallbackScore：6 维度 + 总分 0-100", () => {
  const score = computeFallbackScore({ plan: "完成学习与复盘", execution: "完成 80%，推进了项目", reflection: "今天很充实，学会了复盘方法，原因是目标清晰", mood: "平静且充实", problems: "偶有分心，需要改进专注" });
  assert.equal(score.dimensions.length, 6);
  assert.ok(score.overall >= 0 && score.overall <= 100);
  for (const d of score.dimensions) assert.ok(d.score >= 0 && d.score <= 100);
  assert.ok(Array.isArray(score.strengths));
  assert.ok(Array.isArray(score.weaknesses));
  assert.ok(score.improvement.length >= 1);
});

test("V1.0 normalizeScore：越界值被钳制", () => {
  const s = normalizeScore({ overall: 999, dimensions: [{ name: "认知", score: -5 }, { name: "执行", score: 120 }] });
  assert.ok(s);
  assert.equal(s.overall, 100);
  assert.equal(s.dimensions[0].score, 0);
  assert.equal(s.dimensions[1].score, 100);
  assert.equal(normalizeScore(null), undefined);
});

test("V1.0 buildDeterministicReport：周报聚合（评分/重复问题/周期）", () => {
  const brain = emptyBrain("u1");
  brain.dailyReviews = [
    { id: "r1", date: "2026-08-24", plan: "p", execution: "e", reflection: "完成突破", mood: "好", problems: "拖延", score: { overall: 70, dimensions: [], strengths: [], weaknesses: [], improvement: [] }, createdAt: "2026-08-24T00:00:00Z" },
    { id: "r2", date: "2026-08-25", plan: "p", execution: "e", reflection: "有进步", mood: "好", problems: "拖延", score: { overall: 80, dimensions: [], strengths: [], weaknesses: [], improvement: [] }, createdAt: "2026-08-25T00:00:00Z" },
    { id: "r3", date: "2026-09-01", plan: "p", execution: "e", reflection: "x", mood: "x", problems: "", score: undefined, createdAt: "2026-09-01T00:00:00Z" },
  ];
  const report = buildDeterministicReport(brain, "weekly", new Date("2026-08-25T12:00:00Z"));
  assert.equal(report.type, "weekly");
  assert.equal(report.period, "2026-W35");
  assert.ok(report.summary.includes("2 次"));
  assert.ok(report.summary.includes("75"));
  assert.ok(report.sections.some((s) => s.title === "核心问题" && s.content.includes("拖延")));
});

test("V1.0 知识分类常量：7 类", () => {
  assert.equal(KNOWLEDGE_CATEGORIES.length, 7);
});
