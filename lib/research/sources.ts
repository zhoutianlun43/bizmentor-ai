/**
 * ResearchSource 抽象（V0.3 不接真实 Web Search，但接口可扩展）。
 *
 * 支持的来源类型（未来）：
 * - USER_PROVIDED       用户输入 / 用户粘贴的资料
 * - EXTERNAL_WEB        外部网页（未来）
 * - OFFICIAL_SOURCE     官方来源（未来）
 * - PLATFORM_DATA       平台数据（未来）
 * - UPLOADED_DOCUMENT   上传文档（未来）
 *
 * Evidence First 规则：
 * - FACT 必须引用可验证来源；否则自动降级为 AI_INFERENCE / NEEDS_VALIDATION
 * - 当前没有外部证据时，报告必须显示「当前结论缺少外部证据，需要验证」
 */
import type { EvidenceClass, EvidenceItem, SourceDocument, SourceReference, UserMaterial } from "./types";

export type { ResearchSourceType, SourceDocument, SourceReference } from "./types";
import type { ResearchSourceType } from "./types";

/** 所有来源类型（含未来类型） */
export const RESEARCH_SOURCE_TYPES: ResearchSourceType[] = [
  "USER_PROVIDED",
  "EXTERNAL_WEB",
  "OFFICIAL_SOURCE",
  "PLATFORM_DATA",
  "UPLOADED_DOCUMENT",
];

/** 未来类型：需要真实外部能力（Web Search / 平台数据 / 上传） */
export const FUTURE_SOURCE_TYPES: ResearchSourceType[] = [
  "EXTERNAL_WEB",
  "OFFICIAL_SOURCE",
  "PLATFORM_DATA",
  "UPLOADED_DOCUMENT",
];

/** 缺少外部证据时的固定提示 */
export const NO_EXTERNAL_EVIDENCE_NOTICE = "当前结论缺少外部证据，需要验证";

/** 将用户资料转为来源文档（V0.3 唯一的真实 FACT 来源） */
export function toSourceDocuments(materials: UserMaterial[]): SourceDocument[] {
  return materials.map((m) => ({
    id: m.id,
    title: m.title,
    sourceType: "USER_PROVIDED" as const,
    content: m.content,
    createdAt: new Date().toISOString(),
  }));
}

/** 判断一个来源引用是否为「可验证的真实来源」 */
export function isRealSource(ref: SourceReference | undefined, docs: SourceDocument[]): boolean {
  if (!ref) return false;
  if (ref.sourceType === "USER_PROVIDED") {
    return Boolean(ref.sourceId && docs.some((d) => d.id === ref.sourceId));
  }
  if (ref.sourceType === "EXTERNAL_WEB") {
    // 未来：真实抓取到网页后才算证据
    return Boolean(ref.url);
  }
  // OFFICIAL_SOURCE / PLATFORM_DATA / UPLOADED_DOCUMENT：必须能在已知文档中找到
  return Boolean(ref.sourceId && docs.some((d) => d.id === ref.sourceId && d.sourceType === ref.sourceType));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function appendNote(note: string | undefined, addition: string): string {
  return note ? `${note}；${addition}` : addition;
}

/**
 * Evidence 强制规则（确定性逻辑，可单测）：
 * - confidence 越界 → clamp
 * - FACT 无 sourceRef → 降级 AI_INFERENCE
 * - FACT 有 sourceRef 但来源不可验证 → 降级 NEEDS_VALIDATION（附「缺少外部证据」提示）
 * - 其余分类保持不变
 */
export function enforceEvidenceRules(
  items: EvidenceItem[],
  availableDocs: SourceDocument[] = [],
): EvidenceItem[] {
  return items.map((item) => {
    const confidence = clamp01(item.confidence);
    let evidenceClass: EvidenceClass = item.evidenceClass;
    let note = item.note;
    if (evidenceClass === "FACT") {
      if (!item.sourceRef) {
        evidenceClass = "AI_INFERENCE";
        note = appendNote(note, "FACT 无来源，已自动降级为 AI_INFERENCE");
      } else if (!isRealSource(item.sourceRef, availableDocs)) {
        evidenceClass = "NEEDS_VALIDATION";
        note = appendNote(note, `${NO_EXTERNAL_EVIDENCE_NOTICE}（FACT 引用的来源不可用）`);
      }
    }
    return { ...item, confidence, evidenceClass, note };
  });
}