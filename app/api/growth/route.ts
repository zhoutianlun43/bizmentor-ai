/**
 * /api/growth —— Personal AI Life OS（个人成长中心，V1.0）。
 * chat：人生 CEO 对话；start-modeling / modeling-answer：首次六阶段深度建模 → 生成成长战略蓝图；
 * daily-review：每日复盘 → 深度分析 + 专家委员会 + 明日计划 + 成长评分；report：周报/月报；
 * proactive：AI 主动成长扫描；save-profile：个人画像编辑。
 */
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/identity";
import { personalGrowthStore } from "@/lib/personal-growth/store";
import { MODELING_STAGES } from "@/lib/personal-growth/questions";
import { generateBlueprint, runDailyReviewWithAI, chatWithLifeCEO, proactiveScan, generateReportWithAI, makeKnowledge } from "@/lib/personal-growth/agent";
import { parseStructuredOutput } from "@/lib/agent-output/parse";
import { extractJson } from "@/lib/research/schema";
import type { PersonalGrowthBrain } from "@/lib/personal-growth/types";

const MAX = 200;
function pushCap<T>(arr: T[], item: T): T[] {
  return [...arr, item].slice(-MAX);
}

export async function GET() {
  try {
    const userId = getCurrentUserId();
    const brain = personalGrowthStore.get(userId);
    return NextResponse.json({ brain, stages: MODELING_STAGES });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "个人成长中心失败";
    return NextResponse.json({ error: "GROWTH_FAILED", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const b = (body ?? {}) as {
    type?: string;
    stage?: number;
    answer?: string;
    message?: string;
    plan?: string; execution?: string; reflection?: string; mood?: string; problems?: string;
    reportType?: string;
    personality?: PersonalGrowthBrain["personality"];
    strategy?: PersonalGrowthBrain["strategy"];
    abilities?: PersonalGrowthBrain["abilities"];
    motivation?: PersonalGrowthBrain["motivation"];
  };

  try {
    const userId = getCurrentUserId();
    const brain: PersonalGrowthBrain = personalGrowthStore.get(userId);

    if (b.type === "start-modeling") {
      brain.modeling = { started: true, completed: false, currentStage: 0, answers: [] };
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, brain, stages: MODELING_STAGES, stage: MODELING_STAGES[0] });
    }

    if (b.type === "modeling-answer") {
      const stage = typeof b.stage === "number" ? b.stage : -1;
      const answer = (b.answer ?? "").trim();
      if (!brain.modeling.started || brain.modeling.completed) return NextResponse.json({ error: "MODELING_NOT_STARTED" }, { status: 400 });
      if (stage !== brain.modeling.currentStage || stage < 0 || stage >= MODELING_STAGES.length) return NextResponse.json({ error: "INVALID_STAGE" }, { status: 400 });
      if (!answer) return NextResponse.json({ error: "EMPTY_ANSWER" }, { status: 400 });
      brain.modeling.answers[stage] = answer;
      brain.modeling.currentStage = stage + 1;
      if (stage === MODELING_STAGES.length - 1) {
        // 六阶段完成 → 生成《个人成长战略蓝图 V1.0》
        brain.modeling.completed = true;
        const { blueprint } = await generateBlueprint(brain);
        brain.modeling.blueprint = JSON.stringify(blueprint, null, 2);
        brain.modeling.blueprintGeneratedAt = new Date().toISOString();
        if (blueprint.personality) brain.personality = blueprint.personality;
        if (blueprint.strategy) brain.strategy = blueprint.strategy;
        if (blueprint.abilities) brain.abilities = blueprint.abilities;
        if (blueprint.motivation) brain.motivation = blueprint.motivation;
        brain.insights = pushCap(brain.insights, { time: new Date().toISOString(), content: `完成首次深度建模：${blueprint.sections.核心成长方向}`, category: "strength", source: "建模" });
        brain.knowledge = pushCap(brain.knowledge, makeKnowledge("个人成长战略蓝图 V1.0", `核心成长方向：${blueprint.sections.核心成长方向}；核心优势：${blueprint.sections.核心优势.join("、")}`, "02 人生战略"));
        personalGrowthStore.save(brain);
        return NextResponse.json({ ok: true, done: true, brain, blueprint });
      }
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, done: false, brain, stages: MODELING_STAGES, stage: MODELING_STAGES[stage + 1] });
    }

    if (b.type === "chat") {
      const message = (b.message ?? "").trim();
      if (!message) return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
      const content = await chatWithLifeCEO(brain, message);
      let structured;
      try {
        structured = parseStructuredOutput(extractJson(content), content);
      } catch {
        structured = parseStructuredOutput(null, content);
      }
      // 重要交流自动沉淀知识库
      const summary = structured.blocks
        .map((blk) => (blk.type === "summary" ? blk.conclusion : blk.type === "text" ? blk.paragraphs.join("；") : `[${blk.type}] ${blk.title ?? ""}`))
        .join("；")
        .slice(0, 300);
      brain.knowledge = pushCap(brain.knowledge, makeKnowledge(`人生CEO对话：${message.slice(0, 30)}`, summary || content.slice(0, 300)));
      personalGrowthStore.save(brain);
      return NextResponse.json({ structured, knowledge: brain.knowledge.slice(-3) });
    }

    if (b.type === "daily-review") {
      const input = { plan: b.plan ?? "", execution: b.execution ?? "", reflection: b.reflection ?? "", mood: b.mood ?? "", problems: b.problems ?? "" };
      if (!input.plan.trim() && !input.execution.trim() && !input.reflection.trim()) {
        return NextResponse.json({ error: "EMPTY_REVIEW" }, { status: 400 });
      }
      const out = await runDailyReviewWithAI(brain, input);
      const today = new Date().toISOString().slice(0, 10);
      const review = {
        id: `r-${Date.now()}`,
        date: today,
        ...input,
        deepAnalysis: out.deepAnalysis,
        expertBoard: out.expertBoard,
        tomorrowPlan: out.tomorrowPlan,
        score: out.score,
        createdAt: new Date().toISOString(),
      };
      brain.dailyReviews = pushCap(brain.dailyReviews, review);
      brain.knowledge = pushCap(brain.knowledge, makeKnowledge(`每日复盘 ${today}`, `评分 ${out.score?.overall ?? "—"}；${input.reflection.slice(0, 120)}`, "05 每日复盘"));
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, review, brain });
    }

    if (b.type === "report") {
      const type = b.reportType === "monthly" ? "monthly" : "weekly";
      const report = await generateReportWithAI(brain, type);
      // 去重：同周期已存在则替换
      brain.reports = brain.reports.filter((r) => !(r.type === report.type && r.period === report.period));
      brain.reports = pushCap(brain.reports, report);
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, report, brain });
    }

    if (b.type === "proactive") {
      const insights = await proactiveScan(brain);
      for (const i of insights) {
        brain.insights = pushCap(brain.insights, i);
        brain.knowledge = pushCap(brain.knowledge, makeKnowledge(`AI 主动发现：${i.content.slice(0, 30)}`, `${i.content}；建议：${i.suggestion ?? ""}`, "07 人生洞察"));
      }
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, insights, brain });
    }

    if (b.type === "save-profile") {
      if (b.personality) brain.personality = b.personality;
      if (b.strategy) brain.strategy = b.strategy;
      if (b.abilities) brain.abilities = b.abilities;
      if (b.motivation) brain.motivation = b.motivation;
      personalGrowthStore.save(brain);
      return NextResponse.json({ ok: true, brain });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "个人成长中心失败";
    return NextResponse.json({ error: "GROWTH_FAILED", message }, { status: 500 });
  }
}
