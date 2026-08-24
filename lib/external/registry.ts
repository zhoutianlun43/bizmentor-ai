/**
 * IntelligenceProvider 注册表（V0.4.1 Phase 6.2-A）。
 * - list()：按 priority 升序
 * - enabled()：isConfigured() === true 的候选（路由只从 enabled 里选）
 * - 新增 Provider：实现 IntelligenceProvider → 加入 providers 列表即可
 */
import type { IntelligenceProvider } from "./types";

export class IntelligenceRegistry {
  private readonly items: IntelligenceProvider[];

  constructor(providers: IntelligenceProvider[]) {
    // 去重（后注册覆盖先注册），再按 priority 升序
    const byId = new Map<string, IntelligenceProvider>();
    for (const p of providers) byId.set(p.id, p);
    this.items = [...byId.values()].sort((a, b) => a.priority - b.priority);
  }

  list(): IntelligenceProvider[] {
    return [...this.items];
  }

  enabled(): IntelligenceProvider[] {
    return this.items.filter((p) => p.isConfigured());
  }

  get(id: string): IntelligenceProvider | undefined {
    return this.items.find((p) => p.id === id);
  }
}