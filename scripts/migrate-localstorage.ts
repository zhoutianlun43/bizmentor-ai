/**
 * localStorage → Supabase 迁移 CLI（V0.4.1 Phase 5 Task 5A）。
 *
 * 用法（需先配置 .env.local 的 Supabase URL + anon/service role）：
 *   dry-run：node .test-dist/scripts/migrate-localstorage.js --file <导出JSON> --dry-run
 *   正式  ：node .test-dist/scripts/migrate-localstorage.js --file <导出JSON>
 *
 * 导出 localStorage（在浏览器控制台执行，把结果存为 JSON 文件）：
 *   copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('bizmentor:v1:')))))
 *
 * 校验：迁移后按 id 逐个核对 Supabase 行数，与迁移前数量一致才算成功。
 * 不删除 localStorage；不修改业务逻辑 / schema。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRows, parseExport, summarize } from "../lib/migration/migrate";
import type { MigrationRows } from "../lib/migration/migrate";

// ---------- 工具 ----------
function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
}

function requireClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("未配置 NEXT_PUBLIC_SUPABASE_URL（.env.local）");
  // 优先 service role（绕过 RLS），其次 anon（RLS local-user 允许）
  const key = service || anon;
  if (!key) throw new Error("未配置 Supabase key（.env.local）");
  return createClient(url, key, service ? { auth: { persistSession: false } } : undefined);
}

// ---------- 写入 ----------
async function upsertTable(client: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict: string): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await client
    .from(table)
    .upsert(rows, { onConflict, count: "exact" });
  if (error) throw new Error(table + " 写入失败: " + error.message);
  return count ?? 0;
}

async function verifyByIds(client: SupabaseClient, table: string, idColumn: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await client.from(table).select(idColumn).in(idColumn, ids);
  if (error) throw new Error(table + " 校验失败: " + error.message);
  return (data?.length ?? 0);
}

// ---------- main ----------
async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const file = argValue(args, "--file");
  const dryRun = args.includes("--dry-run");
  if (!file) {
    console.error("用法: migrate-localstorage --file <导出JSON> [--dry-run]");
    process.exit(2);
  }
  if (!existsSync(file)) {
    console.error("文件不存在: " + file);
    process.exit(2);
  }

  const raw = JSON.parse(readFileSync(file, "utf8"));
  const data = parseExport(raw);
  const before = summarize(data);
  const rows: MigrationRows = buildRows(data);

  console.log("=== 迁移前数量（localStorage 导出） ===");
  for (const [k, v] of Object.entries(before)) console.log("  " + k + ": " + v);
  console.log("=== 待迁移行数 ===");
  const total =
    rows.opportunities.length + rows.researchRuns.length + rows.decisions.length +
    rows.reviews.length + rows.plans.length + rows.results.length + rows.events.length + rows.scoreUpdates.length;
  console.log("  合计: " + total);

  if (dryRun) {
    console.log("[dry-run] 仅检查，未写入任何数据。");
    return;
  }

  const client = requireClient();
  console.log("=== 开始迁移（写入 Supabase） ===");
  const inserted: Record<string, number> = {
    opportunities: await upsertTable(client, "opportunities", rows.opportunities, "id"),
    research_runs: await upsertTable(client, "research_runs", rows.researchRuns, "user_id,opportunity_id"),
    decisions: await upsertTable(client, "decisions", rows.decisions, "id"),
    decision_reviews: await upsertTable(client, "decision_reviews", rows.reviews, "id"),
    validation_plans: await upsertTable(client, "validation_plans", rows.plans, "id"),
    validation_results: await upsertTable(client, "validation_results", rows.results, "id"),
    learning_events: await upsertTable(client, "learning_events", rows.events, "id"),
    score_updates: await upsertTable(client, "score_updates", rows.scoreUpdates, "id"),
  };
  for (const [k, v] of Object.entries(inserted)) console.log("  写入 " + k + ": " + v);

  console.log("=== 迁移后校验（按 id 核对 Supabase） ===");
  const checks: Array<[string, string, string[]]> = [
    ["opportunities", "id", rows.opportunities.map((r) => String(r.id))],
    ["research_runs", "run_id", rows.researchRuns.map((r) => String(r.run_id))],
    ["decisions", "id", rows.decisions.map((r) => String(r.id))],
    ["decision_reviews", "id", rows.reviews.map((r) => String(r.id))],
    ["validation_plans", "id", rows.plans.map((r) => String(r.id))],
    ["validation_results", "id", rows.results.map((r) => String(r.id))],
    ["learning_events", "id", rows.events.map((r) => String(r.id))],
    ["score_updates", "id", rows.scoreUpdates.map((r) => String(r.id))],
  ];
  let allOk = true;
  for (const [table, idCol, ids] of checks) {
    const found = await verifyByIds(client, table, idCol, ids);
    const expected = ids.length;
    const ok = found === expected;
    if (!ok) allOk = false;
    console.log("  " + table + ": Supabase " + found + " / 期望 " + expected + (ok ? " ✓" : " ✗"));
  }
  console.log(allOk ? "✓ 迁移校验通过（数量一致）" : "✗ 迁移校验失败（数量不一致）");
  process.exitCode = allOk ? 0 : 1;
}

main().catch((e) => {
  console.error("迁移失败:", (e as Error).message);
  process.exit(1);
});
