# Supabase 数据层（V0.4.1 Phase 1 Task 1）

- 本阶段仅建立 schema 定义与 client 基础，**未接入业务、未迁移数据**。
- schema：`schema.sql`（opportunities / research_runs / decisions / decision_reviews / validation_plans / validation_results / learning_events / ai_usage + RLS + 索引）
- 应用：Phase 2 用 `supabase db push` 或 SQL 编辑器执行 `schema.sql`。
- 环境变量：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（浏览器）、`SUPABASE_SERVICE_ROLE_KEY`（仅服务端）。
