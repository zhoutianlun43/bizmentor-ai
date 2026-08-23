/**
 * 外部研究 Provider 注册表。
 * 新增 Provider：实现 ExternalResearchProvider 并在注册表加一行，不改 Pipeline/UI。
 */
import { env } from "../../config/env";
import { duckduckgoProvider } from "./duckduckgo";
import type { ExternalResearchProvider } from "./types";

const providers: Record<string, ExternalResearchProvider> = {
  duckduckgo: duckduckgoProvider,
};

export function getExternalProvider(id?: string): ExternalResearchProvider {
  const provider = providers[id ?? env.externalResearchProvider];
  if (!provider) throw new Error(`未知外部研究 Provider: ${id ?? env.externalResearchProvider}`);
  return provider;
}