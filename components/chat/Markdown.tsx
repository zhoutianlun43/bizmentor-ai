/**
 * Markdown 渲染组件（V0.8.2）。
 * 把 AI 回复中的 Markdown 渲染成 ChatGPT 风格的视觉元素：
 * 标题 / 列表 / 加粗 / 代码 / 引用 / 分隔线 / 链接，用户看不到原始符号。
 */
import { parseInline, parseMarkdown } from "@/lib/conversation/markdown";
import type { MarkdownBlock } from "@/lib/conversation/markdown";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        switch (seg.kind) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-slate-900 dark:text-white">
                {seg.text}
              </strong>
            );
          case "italic":
            return <em key={i}>{seg.text}</em>;
          case "code":
            return (
              <code key={i} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-indigo-600 dark:bg-slate-800 dark:text-indigo-300">
                {seg.text}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-500 dark:text-indigo-400 dark:decoration-indigo-800"
              >
                {seg.text}
              </a>
            );
          default:
            return <span key={i}>{seg.text}</span>;
        }
      })}
    </>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case "heading": {
      const level = Math.min(block.level, 4);
      const cls =
        level <= 2
          ? "text-base font-semibold text-slate-900 dark:text-white"
          : level === 3
            ? "text-sm font-semibold text-slate-900 dark:text-white"
            : "text-sm font-semibold text-slate-600 dark:text-slate-300";
      const Tag = level <= 2 ? "h2" : level === 3 ? "h3" : "h4";
      return (
        <Tag className={"mt-2 mb-1 " + cls}>
          <Inline text={block.text} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <Inline text={block.text} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className="mb-1 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mb-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="mb-1 overflow-x-auto rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {block.code}
        </pre>
      );
    case "quote":
      return (
        <blockquote className="mb-1 border-l-4 border-indigo-200 pl-3 text-sm italic text-slate-500 dark:border-indigo-800 dark:text-slate-400">
          <Inline text={block.text} />
        </blockquote>
      );
    case "divider":
      return <hr className="my-2 border-slate-200 dark:border-slate-700" />;
    default:
      return null;
  }
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="space-y-1.5">
      {parseMarkdown(content).map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}
