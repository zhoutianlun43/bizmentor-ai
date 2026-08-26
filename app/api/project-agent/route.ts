/**
 * /api/project-agent —— 项目 AI 主理人（V1.5）。
 * chat：项目绑定对话（认知+长期记忆+研究报告+模式）；analyze-url：真实读取网页 → 竞品分析 → 记忆；
 * analyze-text：用户资料分析 → 记忆；review：项目复盘（预测→实际→偏差→经验）。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAI } from "@/lib/ai/gateway";
import { createExternalResearchFn } from "@/lib/external";
import { SupabaseOpportunityRepository } from "@/lib/opportunity/supabase-repository";
import { SupabaseResearchRepository } from "@/lib/research/supabase-repository";
import { SupabaseDecisionRepository } from "@/lib/decision/supabase-repository";
import { env } from "@/lib/config/env";
import { getCurrentUserId } from "@/lib/identity";
import { projectMemoryStore } from "@/lib/project-agent/store";
import { buildDailyBrief } from "@/lib/project-agent/brief";
import { buildCognition } from "@/lib/project-agent/cognition";
import { buildStructuredSystemPrompt } from "@/lib/agent-output/prompt";
import { parseStructuredOutput, deriveKnowledgeDelta } from "@/lib/agent-output/parse";
import { analyzeIntent } from "@/lib/ai/output/intent-analyzer";
import { getTemplate, templateInstruction } from "@/lib/ai/output/output-router";
import { checkOutputQuality } from "@/lib/ai/output/output-quality-checker";
import { extractJson } from "@/lib/research/schema";
import { toBusinessFact } from "@/lib/project-agent/types";
import type { AgentMode, ProjectMemory } from "@/lib/project-agent/types";

const MAX = 60;
function pushCap(arr: string[], item: string): string[] {
  return [...arr, item].slice(-MAX);
}
function pushCapAny<T>(arr: T[], item: T): T[] {
  return [...arr, item].slice(-MAX);
}

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  if (!env.supabaseUrl || !env.supabaseAnonKey) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 500 });
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const userId = getCurrentUserId();
    const oppRepo = new SupabaseOpportunityRepository(supabase, { userId });
    const researchRepo = new SupabaseResearchRepository(supabase, { userId });
    const decisionRepo = new SupabaseDecisionRepository(supabase, { userId });
    const opportunity = await oppRepo.getOpportunity(projectId);
    if (!opportunity) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const run = await researchRepo.getRun(projectId);
    const decisions = await decisionRepo.listDecisions(projectId);
    const memory = projectMemoryStore.get(projectId);
    const cognition = buildCognition(opportunity, run, decisions, memory);
    return NextResponse.json({ cognition, memory, dailyBrief: buildDailyBrief(cognition, memory), hasRun: Boolean(run?.report) });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "项目 AI 失败";
    return NextResponse.json({ error: "PROJECT_AGENT_FAILED", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const b = (body ?? {}) as { type?: string; projectId?: string; message?: string; mode?: AgentMode; url?: string; text?: string; decisionId?: string; actualData?: string; prediction?: string; deviation?: string; aiLearning?: string; strategyStatus?: string; coreQuestion?: string; forbiddenActions?: string[]; northStarMetric?: string; keyMetrics?: Array<{ name: string; current: string; target: string }> };
  if (!b.projectId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  if (!env.supabaseUrl || !env.supabaseAnonKey) return NextResponse.json({ error: "NO_SUPABASE" }, { status: 500 });

  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const userId = getCurrentUserId();
    const oppRepo = new SupabaseOpportunityRepository(supabase, { userId });
    const researchRepo = new SupabaseResearchRepository(supabase, { userId });
    const decisionRepo = new SupabaseDecisionRepository(supabase, { userId });

    const opportunity = await oppRepo.getOpportunity(b.projectId);
    if (!opportunity) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const run = await researchRepo.getRun(b.projectId);
    const decisions = await decisionRepo.listDecisions(b.projectId);

    const memory: ProjectMemory = projectMemoryStore.get(b.projectId);
    // 兼容旧记忆记录（V1.8.1 新增字段可能缺失）
    memory.facts ??= [];
    memory.userDecisions ??= [];
    memory.changes ??= [];
    memory.aiJudgments ??= [];
    memory.decisionLog ??= [];
    memory.aiJudgmentChanges ??= [];
    memory.knowledgeBase ??= [];
    memory.reviews ??= [];
    memory.lessonsLearned ??= [];
    const cognition = buildCognition(opportunity, run, decisions, memory);

    if (b.type === "chat") {
      if (!b.message?.trim()) return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
      const mode = (b.mode ?? "manager") as AgentMode;
      const intent = analyzeIntent(b.message);
      const template = getTemplate(intent);
      const result = await runAI({
        capability: "reasoning",
        type: "conversation",
        agent: "project-agent",
        task: b.message,
        system: buildStructuredSystemPrompt(cognition, memory, run, mode) + "\n" + templateInstruction(template),
        allowDegrade: true,
      });
      let structured;
      try {
        structured = parseStructuredOutput(extractJson(result.content), result.content);
      } catch {
        structured = parseStructuredOutput(null, result.content);
      }
      const knowledge = deriveKnowledgeDelta(structured);
      const quality = checkOutputQuality(structured);
      const pu = structured.projectUpdate;
      if (pu) {
        const now = new Date().toISOString();
        // V1.9：商业数据库（结构化事实：FACT/INFERENCE/ASSUMPTION + 来源/可信度/影响）
        for (const x of pu.newFacts ?? []) memory.facts = pushCapAny(memory.facts, toBusinessFact(x as string | Parameters<typeof toBusinessFact>[0]));
        for (const x of pu.newRisks ?? []) memory.changes = pushCap(memory.changes, `AI 新风险（${now.slice(0, 10)}）：${x}`);
        if (pu.newJudgments?.length) {
          for (const j of pu.newJudgments) {
            memory.aiJudgmentChanges = pushCapAny(memory.aiJudgmentChanges, { time: now, before: j.before, after: j.after, reason: j.reason });
            memory.aiJudgments = pushCap(memory.aiJudgments, `AI 判断变化：${j.before ?? "—"} → ${j.after}（原因：${j.reason}）`);
          }
        }
        for (const x of pu.planChanges ?? []) memory.changes = pushCap(memory.changes, `方案变化（${now.slice(0, 10)}）：${x}`);
        if (pu.decision) {
          memory.decisionLog = pushCapAny(memory.decisionLog, { id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, time: now, decision: pu.decision.decision, reason: pu.decision.reason, basis: pu.decision.basis, status: "executing" });
          memory.userDecisions = pushCap(memory.userDecisions, `${now.slice(0, 10)}：${pu.decision.decision}（${pu.decision.reason}）`);
        }
        // V1.9：战略状态 / 指标更新（AI 维护，认知卡优先读取）
        if (pu.strategyUpdate) {
          memory.strategy ??= { currentStatus: "", coreQuestion: "", forbiddenActions: [] };
          if (pu.strategyUpdate.currentStatus) memory.strategy.currentStatus = pu.strategyUpdate.currentStatus;
          if (pu.strategyUpdate.coreQuestion) memory.strategy.coreQuestion = pu.strategyUpdate.coreQuestion;
          if (pu.strategyUpdate.forbiddenActions?.length) memory.strategy.forbiddenActions = pu.strategyUpdate.forbiddenActions;
          memory.changes = pushCap(memory.changes, `战略状态更新（${now.slice(0, 10)}）：${pu.strategyUpdate.currentStatus ?? "已更新"}`);
        }
        if (pu.metricsUpdate) {
          memory.metrics ??= { northStarMetric: "", keyMetrics: [] };
          if (pu.metricsUpdate.northStarMetric) memory.metrics.northStarMetric = pu.metricsUpdate.northStarMetric;
          if (pu.metricsUpdate.keyMetrics?.length) memory.metrics.keyMetrics = pu.metricsUpdate.keyMetrics;
        }
      }
      const summaryText = structured.blocks
        .map((blk) => (blk.type === "summary" ? blk.conclusion : blk.type === "text" ? blk.paragraphs.join("；") : `[${blk.type}] ${blk.title ?? ""}`))
        .join("；")
        .slice(0, 200);
      memory.knowledgeBase = pushCap(memory.knowledgeBase, `AI 回答（${structured.format}）：${b.message.slice(0, 60)} → ${summaryText}`);
      if (knowledge.newRisks) memory.changes = pushCap(memory.changes, `AI 识别新风险（${new Date().toISOString().slice(0, 10)}）`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ structured, knowledge, quality, intent, projectUpdate: structured.projectUpdate ?? null, provider: result.provider, model: result.model });
    }

    if (b.type === "analyze-url") {
      if (!b.url?.trim()) return NextResponse.json({ error: "EMPTY_URL" }, { status: 400 });
      const external = createExternalResearchFn();
      const out = await external({ query: b.url, area: "competition", limit: 1 });
      const doc = out.documents?.[0];
      const pageText = doc?.content?.slice(0, 4000) ?? "（未能读取网页正文）";
      const analysis = await runAI({
        capability: "reasoning",
        type: "competitor_research",
        agent: "project-agent",
        task: `请分析下面抓取的网页内容，输出竞品/商品分析：产品与价格、页面结构与卖点、用户评价要点、广告/营销信息、对我们的机会点。内容：\n${pageText}`,
        system: "你是 BizMentor 项目 AI 主理人。基于抓取内容输出结构化中文分析；内容不足就明确说不足，禁止编造。只输出分析正文。",
        allowDegrade: true,
      });
      memory.knowledgeBase = pushCap(memory.knowledgeBase, `竞品分析（${b.url.slice(0, 50)}）：${analysis.content.slice(0, 200)}`);
      memory.changes = pushCap(memory.changes, `新增竞品分析：${b.url.slice(0, 50)}（${new Date().toISOString().slice(0, 10)}）`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ analysis: analysis.content, source: { title: doc?.title, url: doc?.url, publisher: doc?.publisher } });
    }

    if (b.type === "analyze-text") {
      if (!b.text?.trim()) return NextResponse.json({ error: "EMPTY_TEXT" }, { status: 400 });
      const analysis = await runAI({
        capability: "reasoning",
        type: "conversation",
        agent: "project-agent",
        task: `请分析用户提供的资料，提取：关键事实、对项目的影响、建议动作。资料：\n${b.text.slice(0, 4000)}`,
        system: "你是 BizMentor 项目 AI 主理人。提取资料要点并给出对项目的影响与建议；不要编造。只输出分析正文。",
        allowDegrade: true,
      });
      memory.knowledgeBase = pushCap(memory.knowledgeBase, `用户资料分析：${analysis.content.slice(0, 200)}`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ analysis: analysis.content });
    }

    if (b.type === "review") {
      const plans = await decisionRepo.listPlans();
      const plan = plans.find((p) => p.opportunityId === b.projectId);
      const results = plan ? await decisionRepo.listResults(plan.id) : [];
      const outcomeLines = results.length ? results.map((r) => `- ${r.outcome}: ${r.actualResult.slice(0, 100)}`) : ["- 暂无验证结果"];
      const memoryCtx = [
        `项目事实：${(memory.facts ?? []).map((f) => (typeof f === "string" ? f : `[${f.type}] ${f.content}`)).join("；") || "暂无"}`,
        `决策记录：${(memory.decisionLog ?? []).map((d) => `${d.time.slice(0, 10)} ${d.decision}（${d.reason}）`).join("；") || "暂无"}`,
        `AI 判断变化：${(memory.aiJudgmentChanges ?? []).map((j) => `${j.before ?? "—"}→${j.after}：${j.reason}`).join("；") || "暂无"}`,
      ].join("\n");
      const result = await runAI({
        capability: "reasoning",
        type: "review",
        agent: "project-agent",
        task: `请基于以下项目资料生成项目复盘报告：目标完成情况、关键决策、成功因素、失败因素、新的认知、下一阶段计划。项目：${cognition.projectName}；当前阶段：${cognition.currentPhase}；核心判断：${cognition.coreJudgment}；风险：${cognition.mainRisks.join("；")}；验证结果：\n${outcomeLines.join("\n")}\n\n${memoryCtx}`,
        system: "你是 BizMentor 项目 AI 主理人。输出结构化复盘报告（用 summary/table/text blocks），必须包含：目标完成情况、关键决策、成功因素、失败因素、新的认知、下一阶段计划；只输出 JSON。",
        allowDegrade: true,
      });
      let reviewText = result.content;
      try {
        const parsed = parseStructuredOutput(extractJson(result.content), result.content);
        reviewText = parsed.blocks.map((blk) => (blk.type === "summary" ? blk.conclusion : blk.type === "text" ? blk.paragraphs.join("；") : `[${blk.type}] ${blk.title ?? ""}`)).join("；") || result.content;
      } catch {
        // 保留原文
      }
      memory.reviews = pushCap(memory.reviews, `复盘（${new Date().toISOString().slice(0, 10)}）：${reviewText.slice(0, 300)}`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ review: reviewText });
    }

    // V1.9：决策结果回填（决策闭环：实际数据 → 预测 → 偏差 → AI 学习）
    if (b.type === "decision-result") {
      if (!b.decisionId || !b.actualData?.trim()) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
      const target = memory.decisionLog.find((d) => d.id === b.decisionId);
      if (!target) return NextResponse.json({ error: "DECISION_NOT_FOUND" }, { status: 404 });
      const now = new Date().toISOString();
      target.result = {
        actualData: b.actualData.trim(),
        prediction: b.prediction?.trim() || undefined,
        deviation: b.deviation?.trim() || undefined,
        aiLearning: b.aiLearning?.trim() || undefined,
        updatedAt: now,
      };
      target.status = "done";
      if (b.aiLearning?.trim()) {
        memory.lessonsLearned = pushCap(memory.lessonsLearned, `${now.slice(0, 10)}：${b.aiLearning.trim()}`);
        memory.knowledgeBase = pushCap(memory.knowledgeBase, `决策学习（${target.decision.slice(0, 30)}）：${b.aiLearning.trim()}`);
      }
      if (b.deviation?.trim()) {
        memory.aiJudgmentChanges = pushCapAny(memory.aiJudgmentChanges, { time: now, before: b.prediction?.trim() || "预测", after: b.actualData.trim(), reason: `实际结果偏差：${b.deviation.trim()}` });
      }
      memory.changes = pushCap(memory.changes, `决策结果回填（${now.slice(0, 10)}）：${target.decision.slice(0, 40)} → ${b.actualData.trim().slice(0, 60)}`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ ok: true, memory });
    }

    // V1.9：更新项目战略状态 / 成功指标（认知卡优先读取）
    if (b.type === "update-state") {
      if (b.strategyStatus?.trim() || b.coreQuestion?.trim() || b.forbiddenActions?.length || b.northStarMetric?.trim() || b.keyMetrics?.length) {
        if (b.strategyStatus?.trim() || b.coreQuestion?.trim() || b.forbiddenActions?.length) {
          memory.strategy ??= { currentStatus: "", coreQuestion: "", forbiddenActions: [] };
          if (b.strategyStatus?.trim()) memory.strategy.currentStatus = b.strategyStatus.trim();
          if (b.coreQuestion?.trim()) memory.strategy.coreQuestion = b.coreQuestion.trim();
          if (b.forbiddenActions?.length) memory.strategy.forbiddenActions = b.forbiddenActions.map((x) => x.trim()).filter(Boolean).slice(0, 6);
          memory.changes = pushCap(memory.changes, `战略状态更新（${new Date().toISOString().slice(0, 10)}）：${b.strategyStatus?.trim() ?? "已更新"}`);
        }
        if (b.northStarMetric?.trim() || b.keyMetrics?.length) {
          memory.metrics ??= { northStarMetric: "", keyMetrics: [] };
          if (b.northStarMetric?.trim()) memory.metrics.northStarMetric = b.northStarMetric.trim();
          if (b.keyMetrics?.length) memory.metrics.keyMetrics = b.keyMetrics.map((m) => ({ name: m.name, current: m.current ?? "", target: m.target ?? "" })).filter((m) => m.name.trim()).slice(0, 8);
        }
        projectMemoryStore.save(memory);
      }
      const cognition2 = buildCognition(opportunity, run, decisions, memory);
      return NextResponse.json({ ok: true, memory, cognition: cognition2, dailyBrief: buildDailyBrief(cognition2, memory) });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "项目 AI 失败";
    return NextResponse.json({ error: "PROJECT_AGENT_FAILED", message }, { status: 500 });
  }
}
