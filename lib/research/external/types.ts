/**
 * External Web Research 类型（V0.3-B）。
 * 原则：搜索结果不是事实；网页内容不是自动可信；外部结论必须可追溯到 Source。
 */
import type { ResearchArea, SourceDocument } from "../types";

/** 搜索结果（不是事实，只是候选） */
export interface ExternalSearchResult {
  title: string;
  url: string;
  snippet: string;
  /** 发布者 / 站点 */
  publisher: string;
  sourceType: "EXTERNAL_WEB" | "OFFICIAL_SOURCE";
  retrievedAt: string;
}

/** 读取到的网页文档（可作证据来源） */
export interface ExtractedDocument extends SourceDocument {
  url: string;
  publisher: string;
  retrievedAt: string;
}

/** 外部研究 Provider 抽象：新增 Provider 只需实现本接口并注册 */
export interface ExternalResearchProvider {
  id: string;
  /** 执行搜索（返回候选结果，不保证可信） */
  search(query: string, opts?: { limit?: number }): Promise<ExternalSearchResult[]>;
  /** 读取网页正文并提取元数据 */
  read(url: string): Promise<ExtractedDocument>;
}

/** 外部研究函数（Pipeline 注入；客户端经 /api/external-research 调用） */
export interface ExternalResearchInput {
  query: string;
  area: ResearchArea;
  limit?: number;
}

export interface ExternalResearchOutput {
  searches: Array<{
    taskId: string;
    area: ResearchArea;
    query: string;
    results: ExternalSearchResult[];
    documents: SourceDocument[];
  }>;
  /** 去重后的全部文档 */
  documents: SourceDocument[];
}

export type ExternalResearchFn = (input: ExternalResearchInput) => Promise<ExternalResearchOutput>;