/**
 * Provider 注册表。
 * 新增模型 Provider 时：新增 providers/xxx.ts 并在这里注册一行即可，
 * 不需要修改 Router / Gateway / 业务 Agent / UI。
 */
import { deepseekProvider } from "./deepseek";
import { openaiProvider } from "./openai";
import type { AiProviderName, ChatProvider } from "../types";

export const providers: Record<AiProviderName, ChatProvider> = {
  openai: openaiProvider,
  deepseek: deepseekProvider,
};

/** 按名称获取 Provider */
export function getProvider(name: AiProviderName): ChatProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`未知 AI Provider: ${name}`);
  return provider;
}