/**
 * External Intelligence Layer（V0.4.1 Phase 6.2-A）。
 * 目标：把「外部研究」从单一 Provider 升级为多 Provider + fallback 的智能情报层。
 * - 架构：Provider 注册表 + 优先级路由 + fallback 链
 * - 未来：Tavily / Bing / Google 只需实现 IntelligenceProvider 并注册，不改 Pipeline/UI
 * - 现有：DuckDuckGo 作为默认 fallback（无 Key 可用）
 * 原则：搜索结果不是事实；网页内容不是自动可信；外部结论必须可追溯 Source。
 */
import type {
  ExternalResearchFn,
  ExternalResearchInput,
  ExternalResearchOutput,
  ExternalSearchResult,
  ExtractedDocument,
} from "../research/external/types";

/** Provider 是否可用 */
export type IntelligenceProviderStatus = "configured" | "not_configured" | "disabled";

/** 外部情报 Provider 抽象：新增 Tavily/Bing/Google 只需实现本接口 */
export interface IntelligenceProvider {
  /** 唯一 id（与注册表/env 对齐，如 duckduckgo / tavily / bing / google） */
  id: string;
  /** 优先级（数值越小越先尝试） */
  priority: number;
  /** 是否已配置可用（如 Tavily/Bing/Google 未配 API Key 时返回 false，路由跳过） */
  isConfigured(): boolean;
  /** 状态（派生自 isConfigured） */
  readonly status: IntelligenceProviderStatus;
  /** 执行搜索（返回候选结果，不保证可信） */
  search(query: string, opts?: { limit?: number; timeoutMs?: number }): Promise<ExternalSearchResult[]>;
  /** 读取网页正文并提取元数据（可选；无 read 的 Provider 由通用 reader 兜底） */
  read?(url: string, opts?: { timeoutMs?: number }): Promise<ExtractedDocument>;
  /** 健康检查（可选） */
  healthCheck?(): Promise<boolean>;
}

/** 单次 Provider 尝试的结果（用于可观测性/降级追踪） */
export interface IntelligenceSearchAttempt {
  provider: string;
  ok: boolean;
  error?: string;
  durationMs: number;
}

/** 一次搜索的路由结果（含 fallback 信息） */
export interface IntelligenceSearchOutcome {
  query: string;
  results: ExternalSearchResult[];
  /** 实际提供结果的 Provider id */
  provider: string;
  /** 是否发生降级（主 Provider 失败后 fallback） */
  degraded: boolean;
  /** 尝试过的 Provider 明细 */
  attempts: IntelligenceSearchAttempt[];
  durationMs: number;
}

/** 外部情报层（注册表 + 路由 + Pipeline 兼容工厂） */
export interface ExternalIntelligenceLayer {
  /** 注册表（按 priority 排序） */
  providers(): IntelligenceProvider[];
  /** 启用且已配置的 Provider（路由候选） */
  enabled(): IntelligenceProvider[];
  /** 按 id 取 Provider */
  get(id: string): IntelligenceProvider | undefined;
  /** 带 fallback 的搜索 */
  search(query: string, opts?: { limit?: number; timeoutMs?: number }): Promise<IntelligenceSearchOutcome>;
  /** 带 fallback 的网页读取 */
  read(url: string, opts?: { timeoutMs?: number }): Promise<ExtractedDocument>;
  /** 生成 Pipeline 兼容的 ExternalResearchFn（不修改 Research Pipeline 主流程） */
  createResearchFn(): ExternalResearchFn;
}

/** 兼容类型再导出（调用方无需感知底层 research/external 位置） */
export type {
  ExternalResearchFn,
  ExternalResearchInput,
  ExternalResearchOutput,
  ExternalSearchResult,
  ExtractedDocument,
};