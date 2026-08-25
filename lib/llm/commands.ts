/**
 * Chat 高级指令（V0.8.1）：普通对话保持轻量；用户以 /指令 主动触发深度能力。
 * 支持：/深度分析 /商业报告 /市场研究 /机会评估（含英文 deep/report/market/evaluate）。
 */

export type ChatCommand = "deep" | "report" | "market" | "evaluate";

const COMMANDS: Array<{ command: ChatCommand; aliases: string[] }> = [
  { command: "deep", aliases: ["深度分析", "deep"] },
  { command: "report", aliases: ["商业报告", "report"] },
  { command: "market", aliases: ["市场研究", "market"] },
  { command: "evaluate", aliases: ["机会评估", "evaluate"] },
];

/** 别名匹配：英文忽略大小写；指令后必须是空白/结尾，避免误匹配（如 market 不匹配 marketplace） */
function matchAlias(text: string, alias: string): boolean {
  const candidates = text === text.toLowerCase() ? [text] : [text, text.toLowerCase()];
  return candidates.some((c) => {
    if (!c.startsWith(alias)) return false;
    const rest = c.slice(alias.length);
    return rest === "" || /^[\s，。,.!?！？]/.test(rest);
  });
}

/** 从消息开头识别高级指令；普通消息返回 null */
export function detectChatCommand(content: string): ChatCommand | null {
  const text = content.trimStart();
  if (!text.startsWith("/")) return null;
  const first = text.slice(1).trimStart();
  for (const { command, aliases } of COMMANDS) {
    if (aliases.some((alias) => matchAlias(first, alias))) return command;
  }
  return null;
}

/** 去掉消息开头的指令令牌，保留剩余正文（无正文返回空串） */
export function stripChatCommand(content: string): string {
  const text = content.trimStart();
  if (!text.startsWith("/")) return content.trim();
  const first = text.slice(1).trimStart();
  const found = COMMANDS.find((c) => c.aliases.some((alias) => matchAlias(first, alias)));
  if (!found) return content.trim();
  const alias = found.aliases.find((a) => matchAlias(first, a))!;
  return first.slice(alias.length).trim();
}
