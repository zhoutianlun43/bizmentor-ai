-- =============================================================
-- BizMentor Supabase Schema（V0.4.1 Phase 1 Task 1）
-- 说明：本阶段仅建立 schema 定义（基础），暂不执行迁移、暂不接入业务。
-- Phase 2：通过 supabase db push / SQL 编辑器应用本文件，再把 Repository 切换到 Supabase。
-- 设计：多用户就绪（user_id + RLS）；当前单用户阶段可把 user_id 固定为默认值。
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- 商机（opportunities）
-- -------------------------------------------------------------
create table if not exists public.opportunities (
  id text primary key,                          -- 应用侧字符串 id（mock 如 opp-ai-ecommerce / uid()）
  user_id text not null default 'local-user',   -- 单用户阶段固定；Auth 接入后改为 auth.uid()::text
  name text not null,
  description text not null,
  source text not null default 'user',          -- ai | user
  status text not null default 'researching',   -- researching | validating | validated | abandoned
  score jsonb,                                  -- OpportunityScore（jsonb）
  notes text,
  project_type text not null default 'OPPORTUNITY', -- V2.0：OPPORTUNITY=商业机会探索 / ACTIVE_PROJECT=已有运营项目
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_user_id_idx on public.opportunities (user_id);
create index if not exists opportunities_created_at_idx on public.opportunities (created_at desc);

-- -------------------------------------------------------------
-- 研究运行（research_runs）
-- -------------------------------------------------------------
create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(), -- 内部主键
  run_id text not null,                          -- 应用侧 runId（字符串）
  user_id text not null default 'local-user',    -- 单用户阶段固定；Auth 接入后改为 auth.uid()
  opportunity_id text not null,                  -- 应用侧 opportunityId（字符串，非 uuid）
  status text not null default 'running',        -- running | completed | degraded | failed
  stages jsonb not null default '[]'::jsonb,     -- StageRun[]
  findings jsonb not null default '[]'::jsonb,   -- ResearchFinding[]
  score_history jsonb not null default '[]'::jsonb, -- ScoreVersion[]
  source_documents jsonb not null default '[]'::jsonb,
  evidence_validation jsonb,                     -- CrossValidationResult
  report jsonb,                                  -- ResearchReport
  error jsonb,                                   -- { stage, type, message }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)               -- 每用户每商机一份研究（upsert 冲突键）
);

create index if not exists research_runs_user_id_idx on public.research_runs (user_id);
create index if not exists research_runs_opportunity_id_idx on public.research_runs (opportunity_id);

-- -------------------------------------------------------------
-- 决策（decisions）
-- -------------------------------------------------------------
create table if not exists public.decisions (
  id text primary key,                          -- 应用侧字符串 id（uid()）
  user_id text not null default 'local-user',   -- 单用户阶段固定；Auth 接入后改为 auth.uid()::text
  opportunity_id text not null,                 -- 应用侧 opportunityId（字符串）
  run_id text,                                  -- 应用侧 runId（字符串）
  decision text not null,                       -- proceed | validate | continue_research | pause | abandon
  different_from_ai boolean not null default false,
  judgment jsonb not null,                      -- UserJudgment
  ai_score_snapshot jsonb,                      -- AiScoreSnapshot
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decisions_user_id_idx on public.decisions (user_id);
create index if not exists decisions_opportunity_id_idx on public.decisions (opportunity_id);

-- -------------------------------------------------------------
-- AI 评审（decision_reviews）
-- -------------------------------------------------------------
create table if not exists public.decision_reviews (
  id text primary key,                          -- 应用侧字符串 id
  decision_id text not null,
  user_id text not null default 'local-user',
  score numeric not null,                       -- 评审分 0-10
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  reasoning_gaps jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  ability_signals jsonb not null default '[]'::jsonb,
  provider text,
  provider_degraded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists decision_reviews_decision_id_idx on public.decision_reviews (decision_id);

-- -------------------------------------------------------------
-- 验证计划（validation_plans）
-- -------------------------------------------------------------
create table if not exists public.validation_plans (
  id text primary key,                          -- 应用侧字符串 id
  decision_id text not null,
  user_id text not null default 'local-user',
  opportunity_id text not null,
  tasks jsonb not null default '[]'::jsonb,     -- ValidationTask[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_plans_decision_id_idx on public.validation_plans (decision_id);

-- -------------------------------------------------------------
-- 验证结果（validation_results，仅用户输入，AI 不参与）
-- -------------------------------------------------------------
create table if not exists public.validation_results (
  id text primary key,                          -- 应用侧字符串 id
  task_id text not null,
  plan_id text not null,
  decision_id text not null,
  user_id text not null default 'local-user',
  opportunity_id text not null,
  actual_sample text,
  actual_result text not null,
  user_feedback text,
  actual_conversion_rate numeric,
  actual_revenue numeric,
  actual_cost numeric,
  other_evidence text,
  outcome text not null,                        -- confirmed | rejected | uncertain
  submitted_by text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists validation_results_plan_id_idx on public.validation_results (plan_id);

-- -------------------------------------------------------------
-- 学习事件（learning_events，能力画像数据源）
-- -------------------------------------------------------------
create table if not exists public.learning_events (
  id text primary key,                          -- 应用侧字符串 id
  user_id text not null default 'local-user',
  opportunity_id text,
  decision_id text,
  skill text not null,
  signal text not null,                         -- positive | negative | neutral
  severity numeric not null default 0,
  evidence text,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_user_id_idx on public.learning_events (user_id);
create index if not exists learning_events_skill_idx on public.learning_events (skill);

-- -------------------------------------------------------------
-- 评分更新（score_updates，Score v2 变化可追溯）
-- -------------------------------------------------------------
create table if not exists public.score_updates (
  id text primary key,                          -- 应用侧字符串 id
  decision_id text,
  user_id text not null default 'local-user',
  from_version integer not null,
  to_version integer not null,
  before jsonb not null,                        -- ScoreVersion
  after jsonb not null,                         -- ScoreVersion
  reason text,
  new_evidence jsonb not null default '[]'::jsonb,
  validation_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists score_updates_decision_id_idx on public.score_updates (decision_id);

-- -------------------------------------------------------------
-- AI 用量（ai_usage，服务端写入，仅 service role 可访问）
-- -------------------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  task text,
  agent text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric not null default 0,
  duration_ms integer not null default 0,
  success boolean not null default true,
  degraded boolean not null default false,
  fallback_from text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);

-- -------------------------------------------------------------
-- Row Level Security（单用户，无 Auth）
-- -------------------------------------------------------------
-- 当前个人使用：不接 Auth，固定 user_id = 'local-user'，
-- 所有业务表允许（anon / service role）对 user_id='local-user' 的行进行读写。
-- 未来接入 Auth 后：把策略改为 using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id)。
-- -------------------------------------------------------------
alter table public.opportunities enable row level security;
alter table public.research_runs enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_reviews enable row level security;
alter table public.validation_plans enable row level security;
alter table public.validation_results enable row level security;
alter table public.learning_events enable row level security;
alter table public.ai_usage enable row level security;

create policy "single user opportunities" on public.opportunities
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user research_runs" on public.research_runs
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user decisions" on public.decisions
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user decision_reviews" on public.decision_reviews
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user validation_plans" on public.validation_plans
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user validation_results" on public.validation_results
  for all using (user_id = 'local-user') with check (user_id = 'local-user');
create policy "single user learning_events" on public.learning_events
  for all using (user_id = 'local-user') with check (user_id = 'local-user');

-- ai_usage：不开放 anon 策略（仅 service role 写入/读取，service role 自动绕过 RLS）

-- -------------------------------------------------------------
-- 商业记忆（memory_records，V0.4.1 Phase 8B-2：Cloud Memory Layer）
-- 每条决策一条记忆；record jsonb 存 DecisionMemoryRecord 全文；user_id 单用户 RLS
-- -------------------------------------------------------------
create table if not exists public.memory_records (
  id text primary key,
  decision_id text not null unique,
  user_id text not null default 'local-user',
  opportunity_id text not null,
  domain text,
  outcome text,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_records_user_id_idx on public.memory_records (user_id);
create index if not exists memory_records_domain_idx on public.memory_records (domain);
create index if not exists memory_records_outcome_idx on public.memory_records (outcome);

alter table public.memory_records enable row level security;
create policy "single user memory_records" on public.memory_records
  for all using (user_id = 'local-user') with check (user_id = 'local-user');

-- -------------------------------------------------------------
-- 用户设置（user_settings，V0.4.2 Phase 9B-5-B：多设备设置同步）
-- -------------------------------------------------------------
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "single user user_settings" on public.user_settings
  for all using (user_id = 'local-user') with check (user_id = 'local-user');

-- -------------------------------------------------------------
-- 个人画像（profiles，V0.5.0 Phase 10A-1：Personal Profile Layer）
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id text primary key,
  user_id text not null unique,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "single user profiles" on public.profiles
  for all using (user_id = 'local-user') with check (user_id = 'local-user');

-- -------------------------------------------------------------
-- 经营画像（business_profiles，V0.5.0 Phase 10A-2：Business Profile Layer）
-- -------------------------------------------------------------
create table if not exists public.business_profiles (
  id text primary key,
  user_id text not null unique,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
create policy "single user business_profiles" on public.business_profiles
  for all using (user_id = 'local-user') with check (user_id = 'local-user');

-- V0.8：AI 商业雷达发现（industry-agnostic）
alter table public.opportunities add column if not exists radar jsonb;

-- V2.0：项目类型（OPPORTUNITY=商业机会探索 / ACTIVE_PROJECT=已有运营项目；旧数据默认 OPPORTUNITY）
alter table public.opportunities add column if not exists project_type text not null default 'OPPORTUNITY';