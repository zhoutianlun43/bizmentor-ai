# BizMentor-Master（完整项目圣经）

> 版本：V0.7.0 Product Release（审计日期 2026-08-24）
> 目的：**任何设备、任何 AI，只读本文件即可完完整整接手 BizMentor**（架构、代码、数据、部署、规范、阶段史、下一步）。
> 配套：`docs/bizmentor-manifest.json`（机器可读清单）、`docs/BizMentor-System-State.md`（状态+规则）、`docs/BizMentor-Asset-Inventory.md`（资产位置）。

---

## 1. 一句话定位

BizMentor = **Personal Business Operating System（个人 AI 商业助手）**：用户描述「我是谁、我做什么业务」，系统完成
**发现商机 → AI 研究 → 用户判断 → AI 评审 → 真实验证 → 评分更新 → 复盘 → 长期认知**的闭环，并提供每日经营简报与 AI 对话。
**不是聊天机器人，不是女装工具**——行业能力通过 Domain/Profile 通用化，未来用 Domain Plugin 扩展。

## 2. 技术栈

- Next.js 16.3.2（App Router + Turbopack）、React 19、TypeScript 5（strict）、TailwindCSS 4、pnpm 11
- Supabase（PostgREST + RLS，单用户 local-user）、zod、node:test、lucide-react
- PWA（app/manifest.ts + public/sw.js 离线缓存 + sync 重同步）
- 部署：腾讯云 Lighthouse（香港 2C2G）+ Caddy HTTPS + systemd

## 3. 目录结构与模块总览（完整）

```
bizmentor-ai/
├─ app/                    产品页面 + API（20 路由）
│  ├─ page.tsx             首页 Dashboard（AI Daily Assistant + 今日经营状态 + 入口）
│  ├─ onboarding/          首次进入：填个人+经营画像 → 保存 → BusinessContext
│  ├─ chat/                问 AI（自动加载 BusinessContext + 历史 + 认知确认）
│  ├─ skills/              技能中心（选品/竞品）
│  ├─ knowledge/           我的AI认知（确认/删除/新增 + 复盘）
│  ├─ profile/             我的（业务画像 + 认知入口 + 导出）
│  ├─ opportunities|projects|training/  商机/项目/训练（V0.1 页面）
│  └─ api/                 ai | chat | skill | review | knowledge-candidate | external-research
├─ components/             home(DailyAssistant/TodayBriefing/OnboardingGuard) · layout(BottomNav/UserStatusBar) · decision · research · ui · providers · migration
├─ lib/                    24 个领域模块（见下）
├─ public/                 sw.js + icons（PWA）
├─ supabase/schema.sql     全部表 DDL（含已应用/未应用）
├─ deploy/                 部署脚本（deploy-app.sh / Caddyfile / bizmentor.service / setup-server.sh）
├─ docs/                   本文件 + System-State + Asset-Inventory + manifest.json（双版本 .md/.html）
├─ scripts/migrate-localstorage.ts  localStorage→Supabase 迁移 CLI
└─ outputs/（工作区外）     41 份 Phase 报告 + screenshots/
```

### lib/ 模块清单（职责 + 关键文件）

| 模块 | 职责 | 关键文件 |
| --- | --- | --- |
| ai | AI Gateway：OpenAI/DeepSeek 多 Provider；Router（simple/research/reasoning 三级能力 + 自动升级 + 降级矩阵）；计价；ai_usage | gateway.ts / router.ts / providers/ / usage.ts |
| research | 商业研究引擎：9 阶段 Pipeline；Evidence（FACT/AI_INFERENCE/ASSUMPTION/NEEDS_VALIDATION 严格分级）；Source 追溯；Score v1 确定性计算 | pipeline.ts / service.ts / types.ts / prompts.ts / scoring.ts / stages/ |
| decision | 决策引擎：Investment Thesis + Unit Economics + AI Examiner（枚举规范化）+ 可执行验证方案；Execution 状态机/超期/摘要 | service.ts / thesis.ts / unit-economics.ts / examiner.ts / execution.ts / validation.ts |
| external | 外部情报层：Tavily（真实）+ DuckDuckGo fallback；统一标准化；meta 追踪（provider/degraded/attempts） | factory.ts / providers/tavily.ts / router.ts / standardize.ts |
| domain | 8 领域（ecommerce/saas/local_service/content_media/marketplace/physical_product/ai_service/unknown）：检测 + 画像 + research/decision 上下文注入 | detect.ts / registry.ts / types.ts |
| memory | 商业记忆：Decision Memory（AI prediction vs User prediction vs Actual result）；事件归档；模式检索；Cloud/Local | builder.ts / service.ts / retrieval.ts / supabase-repository.ts |
| knowledge | 个人知识：习惯/判断方式/行业经验/成功失败案例；**AI 候选→用户确认→长期认知** | knowledge-engine.ts / repository.ts |
| context | 统一经营上下文：BusinessOSContext + BusinessContextBuilder | context-builder.ts / types.ts |
| profile | Personal Profile（用户是谁）Local + Supabase 预留 | local-repository.ts / supabase-repository.ts |
| business | Business Profile（经营世界，businessTypes 通用枚举） | local-repository.ts / supabase-repository.ts |
| agent | Agent Runtime：生命周期状态机 / Tool Registry / 上下文恢复 / Run 审计 / Operating Loop（晨报/监控/晚报）/ Scheduler / Event 总线 | runtime.ts / lifecycle.ts / tool-registry.ts / context.ts / loops/ / tools/ |
| skills | 可插拔技能：product_selection / competitor_analysis | registry.ts / product-selection.ts / competitor-analysis.ts |
| llm | 产品层 LLM：OpenAI-compatible + DeepSeek；generate(messages)；BusinessContext 注入提示 | index.ts / openai-compatible.ts / deepseek.ts |
| conversation | 对话历史（Local 优先 + Supabase 预留） | local-repository.ts |
| settings | 用户设置（Local + Supabase + 缓存降级） | repository.ts / supabase-repository.ts |
| sync | SyncManager（updated_at LWW）+ AgentStateRepository 预留 | manager.ts / agent-state-repository.ts |
| identity | 身份：默认 local-user；AuthIdentityProvider（Auth Ready）；优先级 override > auth > env > local-user | resolver.ts / auth-provider.ts |
| repository | Repository Provider：Supabase/Local 切换（opportunity/research/decision/memory/profile/business） | provider.ts |
| supabase | 客户端（浏览器 anon / 服务端 service role）+ SupabaseRepositoryError | client.ts / server.ts / errors.ts |
| migration | localStorage→Supabase 迁移（8 表） | migrate.ts |
| pwa | PWA manifest 共享源 | manifest.ts |

## 4. 核心数据模型（关键 TS 类型，AI 据此理解数据流）

```ts
// 商机
Opportunity { id, name, description, source:"ai"|"user", status:"researching"|"validating"|"validated"|"abandoned", score?, createdAt, notes? }

// 研究运行（research_runs，report 为 jsonb）
ResearchRun { runId, opportunityId, status, stages[], findings[], scoreHistory[], sourceDocuments[], report? }
ResearchReport { opportunityName, executiveSummary, sections[], score, validationPlan[], nextActions[], sources[], conflicts[], competitors[], thesis?, unitEconomics?, meta{degraded,domain,...} }
EvidenceItem { claim, evidenceClass:"FACT"|"AI_INFERENCE"|"ASSUMPTION"|"NEEDS_VALIDATION", confidence, sourceRef? }
ScoreVersion { version, overall_score, score_breakdown[], confidence, assumptions, unknowns, validation_required, createdAt }

// 决策
UserDecision { id, opportunityId, runId?, decision:"proceed"|"validate"|"continue_research"|"pause"|"abandon", differentFromAi, judgment, aiScoreSnapshot?, createdAt, updatedAt }
UserDecisionReview { id, decisionId, score, strengths[], weaknesses[], reasoningGaps[], missingEvidence[], recommendedActions[], abilitySignals[], provider, provider_degraded }
ValidationTask { id, planId, assumption, hypothesis, method, sampleSize, successCriteria, failureCriteria, deadline, costEstimate, owner, relatedDimension?, priority?, status:"pending"|"running"|"completed"|"failed"|"cancelled", stateHistory[], resultId?, outcome? }
InvestmentThesis { coreHypothesis, logicChain[], keyAssumptions[], invalidators[], expectedUpside, decisionGate, confidence }
UnitEconomicsModel { domain, inputs{}, derived{grossMarginRate, contributionPerUnit, contributionRate, cac, paybackUnits, ltv, ltvCac}, assumptions[] }

// 记忆
DecisionMemoryRecord { decisionId, aiPrediction, userPrediction, outcome:"confirmed"|"rejected"|"uncertain"|"unknown", scoreDelta?, lesson, skills[], tags[] }
MemoryPattern { domain?, decision?, count, confirmRate, avgScore?, commonLessons[], records[] }

// 知识
KnowledgeRecord { id, userId, type:"habit"|"judgment_style"|"industry_experience"|"success_case"|"failure_case", content, tags[], source:"user_input"|"ai_suggestion"|"review"|"decision", confidence, confirmed, createdAt }
// 原则：AI 只能生成 confirmed=false 候选；用户 confirm 后才进入长期认知

// 上下文（Agent 每次运行统一入口）
BusinessOSContext { userId, personalProfile, businessProfile, confirmedKnowledge[], memoryPatterns[], activeProjects[], preferences{}, updatedAt }
AgentContext { userId, identity, activeOpportunity?, activeDecision?, executionSummary?, memoryPatterns[], recentEvents[], knowledgeRecords[], businessContext, createdAt }

// 对话
Conversation { id, userId, messages[{role,content,createdAt}], createdAt, updatedAt }
```

## 5. AI 架构

- **能力三级**：`simple`(DeepSeek 默认) / `research`(OpenAI Research) / `reasoning`(OpenAI Reasoning)；Router 按任务类型自动升级（examiner/final_report→reasoning；unit_economics/business_model→research）
- **降级**：DeepSeek 失败→OpenAI；OpenAI 失败→DeepSeek（普通任务），**Examiner/最终报告禁止静默降级**（返回 provider_degraded）
- **计价**：每 Provider 可配输入/输出 $/1M tokens，ai_usage 记录 provider/model/task/agent/tokens/cost/duration
- **产品层 LLM**（lib/llm）：DeepSeek 优先；`buildBusinessSystemPrompt(context)` 把 BusinessOSContext 注入个性化 system（非固定模板）
- 安全：Key 只在环境变量；禁止 NEXT_PUBLIC_ 暴露服务端 Key；禁止打印/提交

## 6. 研究引擎（Research Pipeline，9 阶段）

```
Opportunity → 1 Analyzer → 2 Planner → 3 External Research(真实搜索) → 4 Evidence Extraction
→ 5 Evidence Validation → 6 Synthesis → 7 Scoring(AI提案+确定性聚合 Score v1)
→ 8 Validation Plan → 9 Summary → ResearchReport
```
- 证据纪律：无来源不得标 FACT；无外部证据明确提示「证据不足」；多来源冲突显式显示；FACT 必须绑定 Source
- 评分：AI 只给维度提案，overall/confidence 由确定性函数计算（可复算）；Score v1/v2 版本化

## 7. 决策与执行

- Investment Thesis（AI 提炼投资论点）、Unit Economics（按领域 AI 提案输入 + 确定性计算毛利/回本/LTV）
- AI Examiner：评审用户判断（10 类弱点/12 能力信号），**输出枚举已做规范化**（防降级模型硬失败）
- Execution Engine：任务状态机（pending→running→completed/failed/cancelled，白名单+历史+actor）+ 超期检测 + 计划进度/摘要
- Validation Result：**只由用户输入，AI 不参与**；Score v2 用真实验证结果确定性更新

## 8. 记忆 / 知识 / 上下文

- Memory 记录「发生过什么」；Knowledge 总结「这个用户是什么样的人」（AI 候选→用户确认）
- BusinessContextBuilder 每次聚合 Profile + Business + confirmed Knowledge + Memory 模式 + 当前状态
- Agent 恢复流程：Identity → BusinessContextBuilder → AgentContext（换设备/重开 App 可恢复）

## 9. Agent Runtime / Skill / Operating Loop

- AgentRuntime.run(trigger, input)：恢复上下文 → planning(选工具) → executing → observing → reflecting → 记录 Run 审计
- 工具：research_tool / decision_tool / execution_tool / memory_tool / skill_tool / knowledge_tool / morning_briefing_tool / evening_review_tool / monitoring_tool
- 技能：product_selection（选品：Research+Memory 历史案例）、competitor_analysis（竞品拆解）
- 经营闭环：Morning Briefing（晨报）→ AnomalyDetector（日间监控）→ Evening Review（晚报复盘+沉淀记忆）
- Scheduler：App 打开/手动/测试触发（未来 cron/推送）

## 10. 产品（页面 + API + 用户流程）

```
首次访问 → /onboarding（个人+经营画像）→ 首页 Dashboard
  → AI Daily Assistant（今日关注/风险/下一步 + 为什么这样建议）
  → 今日经营状态（商机/研究/验证/超期）
  → 问AI（/chat：BusinessContext + 历史 + [确认加入AI认知]）
  → 技能中心（/skills）→ 我的AI认知（/knowledge：确认/删除/新增 + 复盘）
  → 我的（/profile：业务画像）
API：/api/chat（LLM）、/api/skill、/api/review、/api/knowledge-candidate、/api/ai、/api/external-research
底部导航：首页 / AI / 商机 / 技能 / 我的；顶部用户状态条
```

## 11. 数据层与数据库

- 存储抽象：Repository Provider（配置 Supabase → 云端，否则 Local）；localStorage 仅缓存/离线
- **生产 Supabase 已建表**：opportunities / research_runs / decisions / decision_reviews / validation_plans / validation_results / learning_events / score_updates / ai_usage
- **schema.sql 已设计未应用**：memory_records / profiles / business_profiles / user_settings / conversations（需在 Supabase SQL 编辑器执行 schema.sql 补齐；当前 profile/business 走本地回退）
- RLS：单用户 `user_id='local-user'`；未来 Auth 升级 `auth.uid()::text`

## 12. 环境变量（仅名称；用途）

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase
- `SUPABASE_SERVICE_ROLE_KEY`：**未配置**（服务端专用，未来）
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_RESEARCH_MODEL` / `OPENAI_REASONING_MODEL` + 4 项计价
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` + 2 项计价
- `NEXT_PUBLIC_APP_URL`、`AI_USAGE_FILE`、`TAVILY_API_KEY`、`EXTERNAL_INTELLIGENCE_PROVIDERS`、`IDENTITY_USER_ID`(可选)

## 13. 部署

- 生产：腾讯云 Lighthouse 香港 `43.129.179.207`（SSH `ubuntu` + `~/.ssh/id_ed25519_bizmentor`），代码 `/opt/bizmentor`
- Caddy HTTPS → 127.0.0.1:3000（Next.js `next start`，systemd `bizmentor`）
- 域名 `bizmentor.top`（DNSPod）；环境变量 `/opt/bizmentor/.env.production`
- 部署：`deploy/deploy-app.sh`（tar 排除 .env*/node_modules/.git → scp → pnpm build → systemctl）

## 14. 命令

```bash
pnpm dev            # 开发（0.0.0.0:3000）
pnpm test           # 单元测试（tsc + node:test，285 项）
pnpm lint           # eslint（0 warning 要求）
pnpm build          # next build（20 路由）
pnpm exec tsc --noEmit -p tsconfig.json   # 严格类型检查
pnpm test:integration # 真实 Supabase 集成测试
node scripts/migrate-localstorage.ts --file X.json --dry-run  # 迁移 dry-run
```

## 15. 开发规范 / 安全（AI 接手必须遵守）

1. 不改数据库 schema（除非明确授权）；扩展字段进 jsonb
2. 不修改既有 Pipeline 主流程；新能力走独立模块 + Repository 抽象
3. 不删/不改旧测试；新增保持 `pnpm test` 全绿；验收 = test + lint(0) + build + tsc
4. 安全：API Key 只存环境变量；禁止打印/提交/写报告；禁止 NEXT_PUBLIC_ 暴露服务端 Key
5. Agent 只编排不复制业务逻辑；领域经验进 registry 配置
6. 报告双版本 `.md` + `.html`（`work/md2html.mjs`）；每个 Phase 更新 `docs/BizMentor-System-State.md`
7. 不绑定行业；行业能力通过 Domain/Profile 通用化

## 16. 阶段史（一句话）

- V0.1 首页/商机/训练/项目（mock）
- V0.2 AI Gateway（OpenAI/DeepSeek 多 Provider + Router + 计价）
- V0.3-A 研究引擎（9 阶段 + Evidence/Source/Score）；V0.3-B 外部证据（Web Research）；V0.3-C 决策/验证/评分/学习闭环
- V0.4 在线化（腾讯云+Caddy+域名）；V0.4.1 数据层（Supabase/Repository/迁移）
- V0.5.0 10A 数据基础（Profile/Business/Context）
- V0.6.0 MVP 产品层（LLM/对话/技能/认知/简报）；V0.6.1 可用性（Onboarding/历史/AI 建议/认知确认）
- V0.7.0 发布（App Shell + 全流程闭环，已部署 bizmentor.top）

## 17. 已知问题 / 未完成

1. **无 git remote**（git 历史只在本机）——最优先修复
2. 新表未应用生产（profiles/business_profiles/memory_records/user_settings/conversations）
3. 用户知识/对话/记忆在 localStorage（未上云，清缓存即丢）
4. 无 SUPABASE_SERVICE_ROLE_KEY
5. 深度研究未接技能（/api/skill 目前 memory+确定性）
6. 聊天历史/设置未上云；无推送通知；无真实经营数据（订单/广告/库存）接入
7. OpenAI 当前不可用（研究/推理降级 DeepSeek，独立问题）

## 18. AI 快速接手指南

1. 读本文件（完整掌握架构/数据/规范/阶段）。
2. 读 `docs/BizMentor-System-State.md`（当前状态+规则+最近记录）+ `docs/bizmentor-manifest.json`（机器清单）。
3. 若要改代码：打开 `bizmentor-ai/`，先 `pnpm test` 确认基线。
4. 若要上线/部署：见第 13 节；改数据先看 `supabase/schema.sql` 应用状态。
5. 任何问题按第 15 节规范处理；完成后更新 System-State + 双版本报告。

> 本文件 + manifest.json + System-State = 便携完整知识；配合代码（可打包 zip 传到任何设备），即可无断点继续 BizMentor。