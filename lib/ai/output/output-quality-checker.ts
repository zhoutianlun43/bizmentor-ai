/**
 * Output Quality Checker（V1.7）：每次 AI 输出后自动检查 空泛建议/无依据判断/缺执行细节。
 */
import type { StructuredOutput } from "../../agent-output/types";

export interface QualityIssue {
  type: "vague" | "ungrounded" | "missing_detail";
  message: string;
}

const VAGUE_PATTERNS = ["做好", "加强", "努力", "认真", "大力", "持续优化", "尽量", "充分", "重视", "提升整体"];

/** 检查结构化输出质量问题 */
export function checkOutputQuality(out: StructuredOutput): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const allText = out.blocks
    .map((b) => {
      if (b.type === "text") return b.paragraphs.join(" ");
      if (b.type === "summary") return b.conclusion + " " + b.basis.join(" ");
      if (b.type === "risk") return b.items.map((r) => r.risk + r.mitigation).join(" ");
      return "";
    })
    .join(" ");

  // 1. 空泛建议
  for (const p of VAGUE_PATTERNS) {
    if (allText.includes(p)) {
      issues.push({ type: "vague", message: `存在空泛表达「${p}」：请补充具体平台/账号/内容形式/标题/素材/发布时间/预算/指标。` });
      break;
    }
  }

  // 2. 无依据判断：出现"市场巨大/市场很大/前景广阔"但没有数据
  if (/市场(巨大|很大|广阔|潜力大)/.test(allText) && !/\d/.test(allText)) {
    issues.push({ type: "ungrounded", message: "「市场巨大」类判断缺少数据：请补充市场规模/来源/时间/可信度，或标注为 AI 推测。" });
  }

  // 3. 缺执行细节
  if (out.blocks.some((b) => b.type === "products")) {
    const p = out.blocks.find((b) => b.type === "products")!;
    if (p.type === "products") {
      const missing = p.items.filter((it) => !it.supply || !it.cost || !it.price || !it.profit);
      if (missing.length > 0) issues.push({ type: "missing_detail", message: `${missing.length} 个产品缺少 供应来源/成本/售价/利润，请补全。` });
    }
  }
  if (out.blocks.some((b) => b.type === "timeline")) {
    const tl = out.blocks.find((b) => b.type === "timeline")!;
    if (tl.type === "timeline") {
      const missing = tl.phases.filter((p) => !p.metric || !p.owner);
      if (missing.length > 0) issues.push({ type: "missing_detail", message: `${missing.length} 个阶段缺少 负责人/成功指标，请补全。` });
    }
  }

  return issues;
}
