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
import { buildCognition } from "@/lib/project-agent/cognition";
import { buildStructuredSystemPrompt } from "@/lib/agent-output/prompt";
import { parseStructuredOutput, deriveKnowledgeDelta } from "@/lib/agent-output/parse";
import { extractJson } from "@/lib/research/schema";
import type { AgentMode, ProjectMemory } from "@/lib/project-agent/types";

const MAX = 60;
function pushCap(arr: string[], item: string): string[] {
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
    const cognition = buildCognition(opportunity, run, decisions);
    const memory = projectMemoryStore.get(projectId);
    return NextResponse.json({ cognition, memory, hasRun: Boolean(run?.report) });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "项目 AI 失败";
    return NextResponse.json({ error: "PROJECT_AGENT_FAILED", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const b = (body ?? {}) as { type?: string; projectId?: string; message?: string; mode?: AgentMode; url?: string; text?: string };
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
    const cognition = buildCognition(opportunity, run, decisions);

    if (b.type === "chat") {
      if (!b.message?.trim()) return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
      const mode = (b.mode ?? "manager") as AgentMode;
      const result = await runAI({
        capability: "reasoning",
        type: "conversation",
        agent: "project-agent",
        task: b.message,
        system: buildStructuredSystemPrompt(cognition, memory, run, mode),
        allowDegrade: true,
      });
      let structured;
      try {
        structured = parseStructuredOutput(extractJson(result.content), result.content);
      } catch {
        structured = parseStructuredOutput(null, result.content);
      }
      const knowledge = deriveKnowledgeDelta(structured);
      const summaryText = structured.blocks
        .map((blk) => (blk.type === "summary" ? blk.conclusion : blk.type === "text" ? blk.paragraphs.join("；") : `[${blk.type}] ${blk.title ?? ""}`))
        .join("；")
        .slice(0, 200);
      memory.knowledgeBase = pushCap(memory.knowledgeBase, `AI 回答（${structured.format}）：${b.message.slice(0, 60)} → ${summaryText}`);
      if (knowledge.newRisks) memory.changes = pushCap(memory.changes, `AI 识别新风险（${new Date().toISOString().slice(0, 10)}）`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ structured, knowledge, provider: result.provider, model: result.model });
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
      // 复盘：AI 判断历史 vs 验证结果
      const plans = await decisionRepo.listPlans();
      const plan = plans.find((p) => p.opportunityId === b.projectId);
      const results = plan ? await decisionRepo.listResults(plan.id) : [];
      const outcomeLines = results.length
        ? results.map((r) => `- ${r.outcome}: ${r.actualResult.slice(0, 80)}`)
        : ["- 暂无验证结果"];
      const reviewText = [
        `项目：${cognition.projectName}`,
        `AI 当时判断：${cognition.coreJudgment}`,
        `主要风险：${cognition.mainRisks.join("；") || "—"}`,
        `验证结果：${outcomeLines.join("\n")}`,
        `经验沉淀：${results.length ? "基于真实验证结果，判断/假设得到部分证实或证伪，已记录供后续项目参考。" : "暂无验证结果，先执行验证路线图再复盘。"}`,
      ].join("\n");
      memory.reviews = pushCap(memory.reviews, `复盘（${new Date().toISOString().slice(0, 10)}）：${reviewText.slice(0, 200)}`);
      projectMemoryStore.save(memory);
      return NextResponse.json({ review: reviewText });
    }

    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "项目 AI 失败";
    return NextResponse.json({ error: "PROJECT_AGENT_FAILED", message }, { status: 500 });
  }
}
