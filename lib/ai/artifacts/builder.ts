/**
 * Output Artifact System（V1.7）：预留未来产出 文字/表格/Excel/Word报告/PPT/PDF/图片海报/视频脚本。
 * 当前实现：text / table / report；其余 status=coming soon。
 */
export type ArtifactType = "text" | "table" | "report" | "slides" | "image" | "video";

export interface Artifact {
  type: ArtifactType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  status: "ready" | "coming_soon";
}

/** 从结构化输出构建制品（text/table/report ready，其余预留） */
export function buildArtifacts(out: { title: string; blocks: Array<{ type: string; [k: string]: unknown }> }): Artifact[] {
  const artifacts: Artifact[] = [];
  artifacts.push({ type: "text", title: out.title, content: out.blocks.filter((b) => b.type === "text").map((b) => (b.paragraphs as string[]).join("\n")).join("\n"), metadata: { format: out.title }, status: "ready" });
  const tableBlock = out.blocks.find((b) => b.type === "table") as { headers?: string[]; rows?: string[][] } | undefined;
  if (tableBlock?.headers) {
    const csv = "\uFEFF" + [tableBlock.headers, ...(tableBlock.rows ?? [])].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    artifacts.push({ type: "table", title: out.title + " - 表格", content: csv, metadata: { mime: "text/csv" }, status: "ready" });
  }
  artifacts.push({ type: "report", title: out.title, content: JSON.stringify(out, null, 2), metadata: { format: "html" }, status: "ready" });
  for (const t of ["slides", "image", "video"] as ArtifactType[]) {
    artifacts.push({ type: t, title: out.title, content: "", metadata: {}, status: "coming_soon" });
  }
  return artifacts;
}
