/**
 * 轻量 Markdown 解析（V0.8.2 对话渲染用）。
 * 支持：标题(1-4级)、加粗、斜体、行内代码、代码块、无序/有序列表、引用、分隔线、链接、段落。
 * 输出结构化块数据，由 components/chat/Markdown.tsx 渲染（用户不可见原始符号）。
 */

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; code: string }
  | { type: "quote"; text: string }
  | { type: "divider" };

export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

const HEADING_RE = /^(#{1,4})\s+(.*)$/;
const DIVIDER_RE = /^\s*(?:---|\*\*\*|___)\s*$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const UL_RE = /^\s*[-*+]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const FENCE_RE = /^\s*(```|~~~)\s*$/;
const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

/** 解析行内格式：加粗/斜体/行内代码/链接/纯文本 */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1]) segments.push({ kind: "code", text: m[1].slice(1, -1) });
    else if (m[2]) segments.push({ kind: "bold", text: m[2].slice(2, -2) });
    else if (m[3]) segments.push({ kind: "italic", text: m[3].slice(1, -1) });
    else if (m[4]) {
      const inner = m[4].match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (inner) segments.push({ kind: "link", text: inner[1], href: inner[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/** 解析整段 Markdown → 块列表 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  const pushParagraph = (buf: string[]) => {
    const joined = buf.join("\n").trim();
    if (joined) blocks.push({ type: "paragraph", text: joined });
  };

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (FENCE_RE.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过结束围栏
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }

    // 标题
    const h = line.match(HEADING_RE);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2].trim() });
      i += 1;
      continue;
    }

    // 分隔线
    if (DIVIDER_RE.test(line)) {
      blocks.push({ type: "divider" });
      i += 1;
      continue;
    }

    // 引用（连续引用行合并）
    if (QUOTE_RE.test(line)) {
      const q: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        q.push(lines[i].match(QUOTE_RE)![1].trim());
        i += 1;
      }
      blocks.push({ type: "quote", text: q.join("\n") });
      continue;
    }

    // 无序列表（连续行合并）
    if (UL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        items.push(lines[i].match(UL_RE)![1].trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // 有序列表
    if (OL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        items.push(lines[i].match(OL_RE)![1].trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // 空行
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // 普通段落（收集到空行或下一个块类型）
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !FENCE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !DIVIDER_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !UL_RE.test(lines[i]) &&
      !OL_RE.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    pushParagraph(buf);
  }
  return blocks;
}
