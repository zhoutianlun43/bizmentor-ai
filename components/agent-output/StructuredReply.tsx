/**
 * 商业组件库（V1.6）：结构化输出渲染 —— Summary Card / Data Table / Timeline / SWOT / Products / Content / Financial / Risk / Text。
 * 不直接渲染 Markdown；支持导出 CSV（表格）与 HTML 报告。
 */
"use client";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { OutputBlock, StructuredOutput } from "@/lib/agent-output/types";

function SummaryCard({ b }: { b: Extract<OutputBlock, { type: "summary" }> }) {
  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "核心判断"}{b.confidence !== undefined ? <span className="ml-2 text-[10px] text-slate-400">置信度 {Math.round(b.confidence * 100)}%</span> : null}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{b.conclusion}</p>
      {b.basis.length > 0 ? <ul className="mt-1.5 space-y-0.5">{b.basis.map((x, i) => <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400">· 依据：{x}</li>)}</ul> : null}
    </Card>
  );
}

function DataTable({ b }: { b: Extract<OutputBlock, { type: "table" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "数据表"}</p>
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full text-[10px] text-slate-600 dark:text-slate-300">
          <thead><tr>{b.headers.map((h, i) => <th key={i} className="border-b border-slate-200 pb-1 pr-2 text-left font-medium dark:border-slate-700">{h}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-800">{r.map((c, j) => <td key={j} className="py-1 pr-2 align-top">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function TimelineView({ b }: { b: Extract<OutputBlock, { type: "timeline" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "执行时间线"}</p>
      <div className="mt-2 space-y-0">
        {b.phases.map((p, i) => (
          <div key={i} className="relative flex gap-3 pb-3 last:pb-0">
            {i < b.phases.length - 1 ? <span className="absolute left-[11px] top-6 h-full w-px bg-indigo-200 dark:bg-indigo-800" /> : null}
            <span className="z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{p.phase}{p.goal ? ` · ${p.goal}` : ""}</p>
              <ul className="mt-0.5 space-y-0.5">{p.actions.map((a, j) => <li key={j} className="text-[11px] text-slate-600 dark:text-slate-300">· {a}</li>)}</ul>
              {p.owner || p.metric ? <p className="mt-0.5 text-[10px] text-slate-400">{p.owner ? `负责人：${p.owner}` : ""}{p.metric ? ` · 指标：${p.metric}` : ""}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SwotCard({ b }: { b: Extract<OutputBlock, { type: "swot" }> }) {
  const quad = [
    { label: "优势", items: b.strengths, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
    { label: "劣势", items: b.weaknesses, cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
    { label: "机会", items: b.opportunities, cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
    { label: "威胁", items: b.threats, cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  ];
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "SWOT"}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {quad.map((q) => (
          <div key={q.label} className={"rounded-xl px-2 py-1.5 " + q.cls}>
            <p className="text-[10px] font-semibold">{q.label}</p>
            <ul className="mt-0.5 space-y-0.5">{q.items.map((x, i) => <li key={i} className="text-[10px]">· {x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProductsCard({ b }: { b: Extract<OutputBlock, { type: "products" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "产品候选"}</p>
      <div className="mt-1.5 space-y-1.5">
        {b.items.map((it, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
            <div className="min-w-0 text-[11px] text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{it.name}{it.score !== undefined ? <span className="ml-1 text-[10px] text-indigo-500">评分 {it.score}</span> : null}</p>
              <p className="text-[10px] text-slate-400">供应 {it.supply ?? "—"} · 成本 {it.cost ?? "—"} · 售价 {it.price ?? "—"} · 利润 {it.profit ?? "—"} · 竞争 {it.competition ?? "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ContentBoard({ b }: { b: Extract<OutputBlock, { type: "content" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "内容计划"}</p>
      <div className="mt-1.5 space-y-1">
        {b.items.map((it, i) => (
          <div key={i} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <p className="font-medium"><span className="text-indigo-500">{it.date}</span> · {it.platform} · {it.title || it.topic}</p>
            <p className="text-[10px] text-slate-400">{it.format}{it.goal ? ` · 目标：${it.goal}` : ""}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FinancialTable({ b }: { b: Extract<OutputBlock, { type: "financial" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "利润模型"}</p>
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full text-[11px] text-slate-600 dark:text-slate-300">
          <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1 pr-2 text-slate-400">{r.item}</td><td className="py-1 pr-2 font-medium">{r.value}</td><td className="py-1 text-[10px] text-slate-400">{r.note ?? ""}</td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function RiskMatrix({ b }: { b: Extract<OutputBlock, { type: "risk" }> }) {
  return (
    <Card>
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.title ?? "风险矩阵"}</p>
      <div className="mt-1.5 space-y-1">
        {b.items.map((r, i) => (
          <div key={i} className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-slate-700 dark:bg-rose-950/30 dark:text-slate-300">
            <p className="font-medium">{r.risk} <span className="text-[10px] text-slate-400">（影响 {r.impact} · 概率 {r.probability}）</span></p>
            {r.mitigation ? <p className="text-[10px] text-slate-500 dark:text-slate-400">应对：{r.mitigation}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function TextBlock({ b }: { b: Extract<OutputBlock, { type: "text" }> }) {
  return (
    <div className="space-y-1.5">
      {b.paragraphs.map((p, i) => <p key={i} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{p}</p>)}
    </div>
  );
}

function BlockView({ b }: { b: OutputBlock }) {
  switch (b.type) {
    case "summary": return <SummaryCard b={b} />;
    case "table": return <DataTable b={b} />;
    case "timeline": return <TimelineView b={b} />;
    case "swot": return <SwotCard b={b} />;
    case "products": return <ProductsCard b={b} />;
    case "content": return <ContentBoard b={b} />;
    case "financial": return <FinancialTable b={b} />;
    case "risk": return <RiskMatrix b={b} />;
    case "text": return <TextBlock b={b} />;
    default: return null;
  }
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 导出表格为 CSV（Excel 可打开） */
function exportCsv(out: StructuredOutput) {
  const tableBlock = out.blocks.find((b) => b.type === "table") as Extract<OutputBlock, { type: "table" }> | undefined;
  const rows = tableBlock ? [tableBlock.headers, ...tableBlock.rows] : [];
  if (!rows.length) return;
  const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (out.title || "bizmentor") + ".csv";
  a.click();
}

/** 导出完整结构化报告为 HTML（可 Word/浏览器打开） */
function exportHtml(out: StructuredOutput) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocksHtml = out.blocks.map((b) => {
    if (b.type === "table") return `<h3>${esc(b.title ?? "表格")}</h3><table border="1" cellpadding="6"><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
    if (b.type === "summary") return `<h3>${esc(b.title ?? "核心判断")}</h3><p><b>${esc(b.conclusion)}</b></p><ul>${b.basis.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    if (b.type === "timeline") return `<h3>${esc(b.title ?? "时间线")}</h3><ol>${b.phases.map((p) => `<li><b>${esc(p.phase)}</b> ${esc(p.goal)}<ul>${p.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></li>`).join("")}</ol>`;
    if (b.type === "risk") return `<h3>${esc(b.title ?? "风险矩阵")}</h3><ul>${b.items.map((r) => `<li><b>${esc(r.risk)}</b>（影响 ${esc(r.impact)} · 概率 ${esc(r.probability)}）— ${esc(r.mitigation)}</li>`).join("")}</ul>`;
    if (b.type === "text") return b.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
    return "";
  }).join("");
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><title>${esc(out.title)}</title><style>body{font-family:sans-serif;max-width:760px;margin:0 auto;padding:24px}h1{font-size:18px}h3{margin-top:20px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccc;padding:6px;font-size:13px}li{font-size:13px;margin:2px 0}</style></head><body><h1>${esc(out.title)}</h1>${blocksHtml}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (out.title || "bizmentor") + ".html";
  a.click();
}

export function StructuredReply({ out }: { out: StructuredOutput }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{out.title}</p>
        <div className="flex gap-1">
          <button onClick={() => exportCsv(out)} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-indigo-500 dark:border-slate-700 dark:text-slate-400"><Download className="mr-0.5 inline size-3" />CSV</button>
          <button onClick={() => exportHtml(out)} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-indigo-500 dark:border-slate-700 dark:text-slate-400"><Download className="mr-0.5 inline size-3" />报告</button>
        </div>
      </div>
      <div className="space-y-2">
        {out.blocks.map((b, i) => <BlockView key={i} b={b} />)}
      </div>
    </div>
  );
}
