/**
 * Evidence ↔ Source 绑定（V0.3-B 核心防伪机制）。
 * - sourceRef 只能引用真实文档：URL/title/publisher/retrievedAt/credibility 由系统从文档写入
 * - AI 引用了不存在的来源 → 移除引用；FACT 自动降级 NEEDS_VALIDATION
 * - 绑定后再执行 enforceEvidenceRules（无来源 FACT 继续降级）
 */
import { computeSourceCredibility } from "./external/credibility";
import { enforceEvidenceRules } from "./sources";
import type { EvidenceItem, SourceDocument } from "./types";

function appendNote(note: string | undefined, addition: string): string {
  return note ? `${note}；${addition}` : addition;
}

/** 把证据的 sourceRef 绑定到真实文档并写入元数据（AI 无法伪造 URL） */
export function bindEvidenceToSources(items: EvidenceItem[], docs: SourceDocument[]): EvidenceItem[] {
  return items.map((item) => {
    const ref = item.sourceRef;
    if (!ref) return item;
    const doc = ref.sourceId
      ? docs.find((d) => d.id === ref.sourceId)
      : ref.url
        ? docs.find((d) => d.url === ref.url)
        : undefined;
    if (!doc) {
      return {
        ...item,
        sourceRef: undefined,
        evidenceClass: item.evidenceClass === "FACT" ? "NEEDS_VALIDATION" : item.evidenceClass,
        note: appendNote(item.note, "引用了不存在的来源，已移除引用"),
      };
    }
    return {
      ...item,
      sourceRef: {
        sourceType: doc.sourceType,
        sourceId: doc.id,
        url: doc.url,
        title: doc.title,
        publisher: doc.publisher,
        retrievedAt: doc.retrievedAt ?? doc.createdAt,
        credibility: computeSourceCredibility(doc),
      },
    };
  });
}

/** 绑定 + 强制规则（推荐入口） */
export function bindAndEnforce(items: EvidenceItem[], docs: SourceDocument[]): EvidenceItem[] {
  return enforceEvidenceRules(bindEvidenceToSources(items, docs), docs);
}