/**
 * 结构化输出解析器（V1.6）：把 LLM 的 JSON 归一化为 StructuredOutput；容错降级为纯文本。
 */
import type { OutputBlock, ProjectUpdate, StructuredOutput } from "./types";

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function parseBlock(raw: Record<string, unknown>): OutputBlock | null {
  const type = raw.type as string;
  switch (type) {
    case "summary": {
      const conclusion = str(raw.conclusion);
      if (!conclusion) return null;
      return { type: "summary", title: str(raw.title) || undefined, conclusion, confidence: num(raw.confidence), basis: arr(raw.basis) };
    }
    case "table": {
      const headers = arr(raw.headers);
      const rows = Array.isArray(raw.rows) ? (raw.rows as unknown[]).filter(Array.isArray).map((r) => arr(r)) : [];
      if (headers.length === 0) return null;
      return { type: "table", title: str(raw.title) || undefined, headers, rows };
    }
    case "timeline": {
      const phases = Array.isArray(raw.phases)
        ? (raw.phases as Record<string, unknown>[]).map((p) => ({ phase: str(p.phase, "阶段"), goal: str(p.goal), actions: arr(p.actions), owner: str(p.owner) || undefined, metric: str(p.metric) || undefined }))
        : [];
      if (!phases.length) return null;
      return { type: "timeline", title: str(raw.title) || undefined, phases };
    }
    case "swot":
      return { type: "swot", title: str(raw.title) || undefined, strengths: arr(raw.strengths), weaknesses: arr(raw.weaknesses), opportunities: arr(raw.opportunities), threats: arr(raw.threats) };
    case "products": {
      const items = Array.isArray(raw.items)
        ? (raw.items as Record<string, unknown>[]).map((it) => ({ name: str(it.name, "产品"), supply: str(it.supply) || undefined, cost: str(it.cost) || undefined, price: str(it.price) || undefined, profit: str(it.profit) || undefined, competition: str(it.competition) || undefined, score: num(it.score) }))
        : [];
      if (!items.length) return null;
      return { type: "products", title: str(raw.title) || undefined, items };
    }
    case "content": {
      const items = Array.isArray(raw.items)
        ? (raw.items as Record<string, unknown>[]).map((it) => ({ date: str(it.date, "Day1"), platform: str(it.platform, "—"), topic: str(it.topic, ""), title: str(it.title, ""), format: str(it.format, ""), goal: str(it.goal, "") }))
        : [];
      if (!items.length) return null;
      return { type: "content", title: str(raw.title) || undefined, items };
    }
    case "financial": {
      const rows = Array.isArray(raw.rows)
        ? (raw.rows as Record<string, unknown>[]).map((r) => ({ item: str(r.item, "—"), value: str(r.value, ""), note: str(r.note) || undefined }))
        : [];
      if (!rows.length) return null;
      return { type: "financial", title: str(raw.title) || undefined, rows };
    }
    case "risk": {
      const items = Array.isArray(raw.items)
        ? (raw.items as Record<string, unknown>[]).map((r) => ({ risk: str(r.risk, "风险"), impact: str(r.impact, "—"), probability: str(r.probability, "—"), mitigation: str(r.mitigation, "") }))
        : [];
      if (!items.length) return null;
      return { type: "risk", title: str(raw.title) || undefined, items };
    }
    case "text": {
      const paragraphs = arr(raw.paragraphs);
      if (!paragraphs.length) return null;
      return { type: "text", paragraphs };
    }
    default:
      return null;
  }
}

/** 解析「本次项目更新」层（V1.8.1；V1.9：结构化事实 + 战略/指标更新） */
export function parseProjectUpdate(raw: unknown): ProjectUpdate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const pu = obj.projectUpdate as Record<string, unknown> | undefined;
  if (!pu || typeof pu !== "object") return undefined;
  const out: ProjectUpdate = {};
  const arr = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  // 新事实：支持纯文本 或 结构化（content/type/source/confidence/impact）
  if (Array.isArray(pu.newFacts)) {
    const facts: NonNullable<ProjectUpdate["newFacts"]> = [];
    for (const x of pu.newFacts as unknown[]) {
      if (facts.length >= 10) break;
      if (typeof x === "string" && x.trim()) { facts.push(x); continue; }
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (typeof o.content === "string" && o.content.trim()) {
          const type = o.type === "INFERENCE" || o.type === "ASSUMPTION" ? o.type : "FACT";
          facts.push({
            content: o.content.trim(),
            type,
            source: typeof o.source === "string" && o.source.trim() ? o.source.trim() : undefined,
            confidence: typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 100 ? Math.round(o.confidence) : undefined,
            impact: typeof o.impact === "string" && o.impact.trim() ? o.impact.trim() : undefined,
          });
        }
      }
    }
    out.newFacts = facts;
  }
  if (Array.isArray(pu.newRisks)) out.newRisks = arr(pu.newRisks);
  if (Array.isArray(pu.newJudgments)) {
    out.newJudgments = (pu.newJudgments as Record<string, unknown>[])
      .filter((j) => j && typeof j === "object")
      .map((j) => ({ before: typeof j.before === "string" ? j.before : undefined, after: typeof j.after === "string" ? j.after : "", reason: typeof j.reason === "string" ? j.reason : "" }))
      .filter((j) => j.after || j.reason)
      .slice(0, 5);
  }
  if (Array.isArray(pu.planChanges)) out.planChanges = arr(pu.planChanges);
  if (pu.decision && typeof pu.decision === "object") {
    const d = pu.decision as Record<string, unknown>;
    if (typeof d.decision === "string" && d.decision) {
      out.decision = { decision: d.decision, reason: typeof d.reason === "string" ? d.reason : "", basis: typeof d.basis === "string" ? d.basis : undefined };
    }
  }
  if (pu.strategyUpdate && typeof pu.strategyUpdate === "object") {
    const s = pu.strategyUpdate as Record<string, unknown>;
    out.strategyUpdate = {
      currentStatus: typeof s.currentStatus === "string" && s.currentStatus.trim() ? s.currentStatus.trim() : undefined,
      coreQuestion: typeof s.coreQuestion === "string" && s.coreQuestion.trim() ? s.coreQuestion.trim() : undefined,
      forbiddenActions: Array.isArray(s.forbiddenActions) ? (s.forbiddenActions as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 6) : undefined,
    };
    if (!out.strategyUpdate.currentStatus && !out.strategyUpdate.coreQuestion && !out.strategyUpdate.forbiddenActions?.length) delete out.strategyUpdate;
  }
  if (pu.metricsUpdate && typeof pu.metricsUpdate === "object") {
    const m = pu.metricsUpdate as Record<string, unknown>;
    const keyMetrics = Array.isArray(m.keyMetrics)
      ? (m.keyMetrics as Record<string, unknown>[])
          .filter((k) => k && typeof k === "object" && typeof k.name === "string" && k.name.trim())
          .map((k) => ({ name: (k.name as string).trim(), current: typeof k.current === "string" ? k.current : String(k.current ?? ""), target: typeof k.target === "string" ? k.target : String(k.target ?? "") }))
          .slice(0, 8)
      : undefined;
    out.metricsUpdate = {
      northStarMetric: typeof m.northStarMetric === "string" && m.northStarMetric.trim() ? m.northStarMetric.trim() : undefined,
      keyMetrics,
    };
    if (!out.metricsUpdate.northStarMetric && !out.metricsUpdate.keyMetrics?.length) delete out.metricsUpdate;
  }
  if (!out.newFacts?.length && !out.newRisks?.length && !out.newJudgments?.length && !out.planChanges?.length && !out.decision && !out.strategyUpdate && !out.metricsUpdate) return undefined;
  return out;
}

/** 解析 LLM JSON → StructuredOutput；失败则降级为纯文本 */
export function parseStructuredOutput(raw: unknown, fallbackText: string): StructuredOutput {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const blocks: OutputBlock[] = [];
    if (Array.isArray(obj.blocks)) {
      for (const b of obj.blocks) {
        if (b && typeof b === "object") {
          const block = parseBlock(b as Record<string, unknown>);
          if (block) blocks.push(block);
        }
      }
    }
    if (blocks.length > 0) {
      return {
        format: (str(obj.format) as StructuredOutput["format"]) || "report",
        title: str(obj.title, "AI 分析"),
        blocks,
        projectUpdate: parseProjectUpdate(raw),
      };
    }
  }
  return { format: "answer", title: "AI 分析", blocks: [{ type: "text", paragraphs: [fallbackText] }] };
}

/** 知识沉淀：根据输出块推断 新观点/新决策/新数据/新风险 */
export function deriveKnowledgeDelta(out: StructuredOutput): { newViews: boolean; newDecisions: boolean; newData: boolean; newRisks: boolean } {
  let newViews = false, newDecisions = false, newData = false, newRisks = false;
  for (const b of out.blocks) {
    if (b.type === "swot" || b.type === "summary") newViews = true;
    if (b.type === "timeline" || b.type === "content") newDecisions = true;
    if (b.type === "table" || b.type === "financial" || b.type === "products") newData = true;
    if (b.type === "risk") newRisks = true;
  }
  return { newViews, newDecisions, newData, newRisks };
}
