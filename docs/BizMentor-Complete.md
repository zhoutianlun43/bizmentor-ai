# BizMentor 完整项目文档（ONE DOC）

> 版本：V0.7.0 Product Release ｜ 整理日期：2026-08-24
> **使用说明：把本文件（或本文件的 .html 版）提交给任何 AI / 放到任何设备，AI 读这一份即可完完整整知道 BizMentor 的内容、细节与全部资产。** 无需其他文件。

---

# 第一部分 · 项目内容与架构（模块/数据/流程/规范/阶段史）


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

1. ~~无 git remote~~ ✅ 已解决（GitHub 私有仓已推送）
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

---

# 第二部分 · 资产统计（代码/部署/数据库/环境变量/存储地图/风险）


## 1. 代码位置

| 项 | 值 |
| --- | --- |
| 项目绝对路径 | `C:\Users\周天伦\Documents\Codex\2026-08-23\files-pasted-by-the-user-bizmentor\bizmentor-ai` |
| 工作区父目录 | `C:\Users\周天伦\Documents\Codex\2026-08-23\files-pasted-by-the-user-bizmentor\`（outputs 报告、work 临时文件） |
| Git 状态 | 工作树干净 |
| Git remote | ✅ `https://github.com/zhoutianlun43/bizmentor-ai.git`（已配置并推送） |
| 当前 branch | `master` |
| 是否已推送远程 | ✅ **是**（master 已推送到 GitHub，完全同步） |
| package.json version | `0.1.0`（版本实际记录在 docs/BizMentor-System-State.md） |

### 最近 10 次 commit
```
d6073b7 docs(release): V0.7.0 发布记录
8c2fe59 fix(release): Profile/Business 仓库加本地回退
cb14238 feat(release): V0.7.0 App Shell + Product Flow
41a1bcf feat(ux): Product Usability Upgrade (V0.6.1)
9b834e2 feat(mvp): MVP Product Layer (V0.6.0)
511d992 feat(context): Business Context Layer (V0.5.0 10A-3)
9bcb0f7 feat(profile): Personal & Business Profile Layers (V0.5.0 10A-1/2)
7e1a529 feat(multi-device): Multi Device Foundation (V0.4.2 9B-5)
ec1fa1b feat(knowledge): Personal Knowledge System (V0.4.2 9B-4)
1f5fd4b feat(skills): Skill System (V0.4.2 9B-3)
```

---

## 2. 部署信息

| 项 | 值 |
| --- | --- |
| 公网地址 | https://bizmentor.top |
| 部署平台 | **腾讯云轻量应用服务器（Lighthouse）**，香港地域，Ubuntu 24.04，2C2G，公网 IPv4 `43.129.179.207` |
| 是否 Vercel / Cloudflare Pages | **否**（自托管 VPS） |
| 反向代理 | Caddy（HTTPS，监听 80/443 → 127.0.0.1:3000） |
| 进程管理 | systemd 服务 `bizmentor`（Next.js `next start --hostname 127.0.0.1 --port 3000`） |
| 服务器代码目录 | `/opt/bizmentor`（部署时 tar 上传，**不含 .git**） |
| 服务器环境变量 | `/opt/bizmentor/.env.production`（不入 Git） |
| SSH | `ubuntu@43.129.179.207`，本机密钥 `~/.ssh/id_ed25519_bizmentor` |
| 域名 | `bizmentor.top`（腾讯云 / DNSPod 注册，DNS 在 DNSPod：hubery.dnspod.net / aubrey.dnspod.net） |
| 部署配置（本地） | `deploy/deploy-app.sh`、`deploy/Caddyfile`、`deploy/bizmentor.service`、`deploy/setup-server.sh`、`deploy/.env.production.example` |
| 部署配置（服务器） | `/opt/bizmentor/deploy/`（同本地） |
| 绑定账号 | 腾讯云账号（域名/服务器）；SSH 密钥 `bizmentor-deploy`；无 Vercel/Cloudflare 账号绑定 |

---

## 3. 数据库信息

| 项 | 值 |
| --- | --- |
| 是否连接 Supabase | ✅ 是（生产 + 本地） |
| Supabase 项目 | `etxarbqpokyvobwibfbs`（区域 Singapore） |
| Supabase URL | `https://etxarbqpokyvobwibfbs.supabase.co`（仅示例域名，Key 见环境变量） |
| 认证 | 未接 Auth；单用户 `user_id='local-user'`，RLS 单用户策略 |

### 3.1 生产库已存在的表（2026-08-24 探测）

| 表 | 行数 | 说明 |
| --- | --- | --- |
| opportunities | 1 | 真实商机（万圣节产品海外社交媒体） |
| research_runs | 1 | 研究报告 |
| decisions | 2 | 用户决策 |
| decision_reviews | 0 | AI 评审 |
| validation_plans | 0 | 验证计划 |
| validation_results | 0 | 验证结果 |
| learning_events | 2 | 学习事件 |
| score_updates | 0 | 评分更新 |
| ai_usage | 0 | AI 用量（仅 service role） |

### 3.2 schema.sql 已设计但**未应用到生产**的表（HTTP 404）

`memory_records`、`profiles`、`business_profiles`、`user_settings`、`conversations`、`business_context_snapshots`

> 这些表 DDL 都在 `supabase/schema.sql`；当前 profile/business 通过**本地回退**工作。需要在 Supabase SQL 编辑器执行 schema.sql 补齐。

### 3.3 数据分布

- **云端（Supabase）**：opportunities、research_runs、decisions、learning_events（+ 其余空表）
- **仅 localStorage**：profiles/businessProfiles（回退）、knowledge、memory、conversations、agentRuns、settings、agentState、opportunities(dev)、researchRuns(dev)、decisionData(dev)、theme、onboarded

---

## 4. 环境变量（仅名称；Key 值绝不外泄）

### 4.1 本地 `.env.local`（开发机，gitignored）
| 变量 | 用途 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目地址 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名 key（浏览器） |
| OPENAI_API_KEY | OpenAI 服务端 Key |
| OPENAI_BASE_URL | OpenAI API 地址 |
| OPENAI_RESEARCH_MODEL / OPENAI_REASONING_MODEL | 研究/推理模型名 |
| OPENAI_RESEARCH_INPUT_PRICE_PER_1M / OUTPUT | 计价（美元/1M tokens） |
| OPENAI_REASONING_INPUT_PRICE_PER_1M / OUTPUT | 计价 |
| DEEPSEEK_API_KEY | DeepSeek 服务端 Key |
| DEEPSEEK_BASE_URL | DeepSeek API 地址 |
| DEEPSEEK_MODEL | DeepSeek 模型名 |
| DEEPSEEK_INPUT_PRICE_PER_1M / OUTPUT | 计价 |
| NEXT_PUBLIC_APP_URL | 应用公开地址 |
| AI_USAGE_FILE | ai_usage 落盘路径（默认 .data/ai_usage.jsonl） |

### 4.2 服务器 `.env.production`（/opt/bizmentor，不入 Git）
| 变量 | 用途 |
| --- | --- |
| NEXT_PUBLIC_APP_URL / SUPABASE_URL / SUPABASE_ANON_KEY | 同上 |
| OPENAI_API_KEY / BASE_URL / RESEARCH_MODEL / REASONING_MODEL + 计价 6 项 | OpenAI |
| DEEPSEEK_API_KEY / BASE_URL / MODEL + 计价 2 项 | DeepSeek |
| AI_USAGE_FILE | ai_usage 落盘 |
| TAVILY_API_KEY | Tavily 搜索 Key（真实外部研究） |
| EXTERNAL_INTELLIGENCE_PROVIDERS | 外部情报 Provider 顺序（tavily,duckduckgo） |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`：本地/服务器**均未配置**（当前用 anon + RLS）。
> 规则：Key 只存环境变量；禁止打印/提交/写入报告。

---

## 5. 当前数据存储地图

### 5.1 用户数据（localStorage 前缀 `bizmentor:v1:`，云端另注）
| 数据 | localStorage 键 | 云端 | 说明 |
| --- | --- | --- | --- |
| Profile | `profiles` | 预留（profiles 表未建） | 本地回退 |
| Business | `businessProfiles` | 预留（business_profiles 表未建） | 本地回退 |
| Knowledge | `knowledge` | 预留 | 仅本地 |
| Memory | `memory` | 预留（memory_records 未建） | 仅本地（记录+归档事件） |
| Conversation | `conversations` | 预留 | 仅本地 |
| Agent Run | `agentRuns` | 预留 | 仅本地 |
| Agent State | `agentState` | 预留 | 仅本地 |
| Settings | `settings` | 预留（user_settings 未建） | 本地 |
| 商机/研究/决策（生产） | 开发时 local | **Supabase** | 生产已上云 |
| 主题 / onboarded | `theme` / `onboarded` | 无 | 仅本地 |

### 5.2 开发数据
| 数据 | 位置 |
| --- | --- |
| Version / 版本历史 | `docs/BizMentor-System-State.md`（第 1 节 + 各 Phase 完成记录） |
| Architecture | `docs/BizMentor-System-State.md`（第 2 节）+ 各 Phase 架构报告（outputs/） |
| Roadmap / 下一阶段 | `docs/BizMentor-System-State.md`（第 9/16/17/18/19 节 + 未解决问题） |
| Changelog | **无独立 CHANGELOG**；git log + `outputs/` 41 份 Phase 报告充当 |
| 开发文档目录 | `docs/`（System-State + 本文件） |
| 报告存档 | `outputs/`（41 份 .md/.html 报告 + screenshots/） |
| 临时文件 | `work/`（迁移样例/评估数据/转换脚本，不入库） |

---

## 6. 当前风险（数据丢失矩阵）

| 场景 | 会丢失 | 不会丢失 |
| --- | --- | --- |
| 删除 ChatGPT | 对话记录（本线程聊天）；不涉及项目文件 | 代码/文档/云端数据 |
| 删除 Codex | Codex 线程历史；本地项目文件仍在磁盘 | 代码/文档/云端数据 |
| 换电脑 | 本机项目源码（无 git remote！）、.env.local、localStorage 全部（profiles/knowledge/conversations/memory/settings/agentRuns） | Supabase 云端数据 |
| 换手机 | 手机浏览器 localStorage（同上） | Supabase 云端数据 |
| 清浏览器缓存 | localStorage 全部（profiles 回退、knowledge、conversations、memory、settings、agentRuns、onboarded） | Supabase 云端数据 |

### 关键风险 TOP
1. **✅ 已解决：git remote 已配置并推送**（GitHub 私有仓 zhoutianlun43/bizmentor-ai）；换电脑可用 `git clone` 恢复全部源码+历史。
2. **🔴 用户知识/对话/画像在 localStorage**：清缓存/换设备即丢（Profile 有本地回退，但 knowledge/conversations/memory 无云端表）。
3. **🟠 新表未应用生产**：profiles/business_profiles/memory_records/user_settings/conversations 需在 Supabase 执行 schema.sql。
4. **🟠 无 service role key**：ai_usage 等仅 service role 能力不可用。
5. **🟡 package.json version 仍是 0.1.0**：版本号以 docs 为准，易混淆。

### 建议（非本次任务，供后续）
- ~~立即配置 git remote~~ ✅ 已完成（GitHub zhoutianlun43/bizmentor-ai，已推送）。
- 在 Supabase 应用新表；把 knowledge/conversations/settings 上云。
- 定期备份 .env.local + localStorage（或用导出按钮）。

---

## 附：快速接手清单
1. 读 `docs/BizMentor-System-State.md`（架构/版本/规则）。
2. 读本文件（资产位置）。
3. 代码在 `bizmentor-ai/`，测试 `pnpm test`，lint `pnpm lint`，构建 `pnpm build`。
4. 生产在腾讯云服务器，部署用 `deploy/deploy-app.sh`（或手动 tar+scp+pnpm build+systemctl）。
5. Key 只在环境变量；永不打印/提交。

---

# 第三部分 · 机器可读清单（manifest.json，AI 可程序化解析）

$('`json')
{
  "currentVersion": "V0.7.0 Product Release",
  "localOnly": [
    "git history (no remote)",
    "localStorage 数据：profiles/knowledge/memory/conversations/agentRuns/settings/theme/onboarded",
    ".env.local",
    "outputs/ 41 份报告",
    "work/ 临时文件"
  ],
  "project": "BizMentor AI",
  "schemaVersion": "1.0",
  "techStack": [
    "Next.js 16.3.2 (App Router, Turbopack)",
    "React 19",
    "TypeScript 5",
    "TailwindCSS 4",
    "Supabase",
    "zod",
    "node:test",
    "lucide-react",
    "pnpm 11"
  ],
  "libModules": [
    {
      "id": "ai",
      "keyFiles": [
        "lib/ai/gateway.ts",
        "lib/ai/router.ts",
        "lib/ai/providers/openai.ts",
        "lib/ai/providers/deepseek.ts",
        "lib/ai/usage.ts",
        "lib/ai/types.ts"
      ],
      "purpose": "AI Gateway：多 Provider（OpenAI/DeepSeek）+ Router（capability simple/research/reasoning）+ fallback + 计价 + ai_usage"
    },
    {
      "id": "research",
      "keyFiles": [
        "lib/research/pipeline.ts",
        "lib/research/service.ts",
        "lib/research/types.ts",
        "lib/research/prompts.ts",
        "lib/research/scoring.ts",
        "lib/research/stages/*.ts"
      ],
      "purpose": "商业研究引擎：9 阶段 Pipeline（Analyzer→Planner→External→Extraction→Validation→Synthesis→Scoring→ValidationPlan→Summary）+ Evidence/Source/Score"
    },
    {
      "id": "decision",
      "keyFiles": [
        "lib/decision/service.ts",
        "lib/decision/thesis.ts",
        "lib/decision/unit-economics.ts",
        "lib/decision/examiner.ts",
        "lib/decision/execution.ts",
        "lib/decision/validation.ts",
        "lib/decision/types.ts"
      ],
      "purpose": "决策引擎：Investment Thesis + Unit Economics + AI Examiner + 可执行验证方案；Execution Engine（状态机/超期/摘要）"
    },
    {
      "id": "external",
      "keyFiles": [
        "lib/external/factory.ts",
        "lib/external/providers/tavily.ts",
        "lib/external/router.ts",
        "lib/external/standardize.ts"
      ],
      "purpose": "外部情报层：Tavily + DuckDuckGo fallback，统一标准化，meta 追踪"
    },
    {
      "id": "domain",
      "keyFiles": [
        "lib/domain/detect.ts",
        "lib/domain/registry.ts",
        "lib/domain/types.ts"
      ],
      "purpose": "Business Domain：8 领域检测/画像（ecommerce/saas/...），research/decision 上下文注入"
    },
    {
      "id": "memory",
      "keyFiles": [
        "lib/memory/builder.ts",
        "lib/memory/service.ts",
        "lib/memory/retrieval.ts",
        "lib/memory/supabase-repository.ts"
      ],
      "purpose": "商业记忆：Decision Memory（AI vs 用户 vs 实际）+ 事件归档 + 模式检索（Cloud/Local）"
    },
    {
      "id": "knowledge",
      "keyFiles": [
        "lib/knowledge/knowledge-engine.ts",
        "lib/knowledge/repository.ts"
      ],
      "purpose": "个人知识：习惯/判断方式/经验/案例；AI 候选→用户确认→长期认知"
    },
    {
      "id": "context",
      "keyFiles": [
        "lib/context/context-builder.ts",
        "lib/context/types.ts"
      ],
      "purpose": "统一经营上下文：BusinessOSContext + Builder（Profile+Business+Knowledge+Memory+Repository）"
    },
    {
      "id": "profile",
      "keyFiles": [
        "lib/profile/local-repository.ts",
        "lib/profile/supabase-repository.ts"
      ],
      "purpose": "Personal Profile（用户是谁）Local + Supabase 预留"
    },
    {
      "id": "business",
      "keyFiles": [
        "lib/business/local-repository.ts",
        "lib/business/supabase-repository.ts"
      ],
      "purpose": "Business Profile（经营世界，businessTypes 通用枚举，不绑行业）"
    },
    {
      "id": "agent",
      "keyFiles": [
        "lib/agent/runtime.ts",
        "lib/agent/lifecycle.ts",
        "lib/agent/tool-registry.ts",
        "lib/agent/context.ts",
        "lib/agent/loops/*.ts",
        "lib/agent/tools/*.ts"
      ],
      "purpose": "Agent Runtime：生命周期状态机 + Tool Registry + 上下文恢复 + Run 审计 + Operating Loop（晨报/监控/晚报）+ Scheduler + Event"
    },
    {
      "id": "skills",
      "keyFiles": [
        "lib/skills/registry.ts",
        "lib/skills/product-selection.ts",
        "lib/skills/competitor-analysis.ts"
      ],
      "purpose": "可插拔商业技能：product_selection / competitor_analysis，AgentRuntime 经 skill_tool 调用"
    },
    {
      "id": "llm",
      "keyFiles": [
        "lib/llm/index.ts",
        "lib/llm/openai-compatible.ts"
      ],
      "purpose": "产品层 LLM：OpenAI-compatible + DeepSeek，generate(messages)，BusinessContext 注入提示"
    },
    {
      "id": "conversation",
      "keyFiles": [
        "lib/conversation/local-repository.ts"
      ],
      "purpose": "对话历史：Conversation，Local 优先 + Supabase 预留"
    },
    {
      "id": "settings",
      "keyFiles": [
        "lib/settings/repository.ts"
      ],
      "purpose": "用户设置：Local + Supabase(user_settings) + 缓存降级"
    },
    {
      "id": "sync",
      "keyFiles": [
        "lib/sync/manager.ts",
        "lib/sync/agent-state-repository.ts"
      ],
      "purpose": "数据同步：SyncManager（LWW）+ AgentStateRepository 预留"
    },
    {
      "id": "identity",
      "keyFiles": [
        "lib/identity/resolver.ts",
        "lib/identity/auth-provider.ts"
      ],
      "purpose": "身份：local-user 默认 + AuthIdentityProvider（Auth Ready）+ resolver 优先级"
    },
    {
      "id": "repository",
      "keyFiles": [
        "lib/repository/provider.ts"
      ],
      "purpose": "Repository Provider：Supabase/Local 切换（opportunity/research/decision/memory/profile/business）"
    },
    {
      "id": "supabase",
      "keyFiles": [
        "lib/supabase/client.ts",
        "lib/supabase/server.ts",
        "lib/supabase/errors.ts"
      ],
      "purpose": "Supabase 客户端（浏览器 anon / 服务端 service role）+ 统一错误"
    },
    {
      "id": "migration",
      "keyFiles": [
        "lib/migration/migrate.ts",
        "scripts/migrate-localstorage.ts"
      ],
      "purpose": "localStorage→Supabase 迁移 CLI（8 表）"
    },
    {
      "id": "pwa",
      "keyFiles": [
        "lib/pwa/manifest.ts",
        "public/sw.js"
      ],
      "purpose": "PWA manifest 共享源"
    }
  ],
  "commands": [
    "pnpm dev",
    "pnpm test",
    "pnpm lint",
    "pnpm build",
    "pnpm exec tsc --noEmit",
    "pnpm test:integration",
    "node scripts/migrate-localstorage.ts --file X.json --dry-run"
  ],
  "supabaseTables": [
    {
      "applied": true,
      "name": "opportunities",
      "purpose": "商机",
      "cloudCount": 1
    },
    {
      "applied": true,
      "name": "research_runs",
      "purpose": "研究运行",
      "cloudCount": 1
    },
    {
      "applied": true,
      "name": "decisions",
      "purpose": "决策",
      "cloudCount": 2
    },
    {
      "applied": true,
      "name": "decision_reviews",
      "purpose": "AI 评审"
    },
    {
      "applied": true,
      "name": "validation_plans",
      "purpose": "验证计划"
    },
    {
      "applied": true,
      "name": "validation_results",
      "purpose": "验证结果"
    },
    {
      "applied": true,
      "name": "learning_events",
      "purpose": "学习事件",
      "cloudCount": 2
    },
    {
      "applied": true,
      "name": "score_updates",
      "purpose": "评分更新"
    },
    {
      "applied": true,
      "name": "ai_usage",
      "purpose": "AI 用量（service role）"
    },
    {
      "applied": false,
      "name": "memory_records",
      "purpose": "决策记忆"
    },
    {
      "applied": false,
      "name": "profiles",
      "purpose": "个人画像"
    },
    {
      "applied": false,
      "name": "business_profiles",
      "purpose": "经营画像"
    },
    {
      "applied": false,
      "name": "user_settings",
      "purpose": "用户设置"
    },
    {
      "applied": false,
      "name": "conversations",
      "purpose": "对话历史"
    }
  ],
  "description": "Personal Business Operating System / AI Business Assistant",
  "keyDocs": [
    "docs/BizMentor-System-State.md",
    "docs/BizMentor-Asset-Inventory.md",
    "docs/BizMentor-Master.md"
  ],
  "deployment": {
    "env": "/opt/bizmentor/.env.production",
    "url": "https://bizmentor.top",
    "code": "/opt/bizmentor",
    "domain": "bizmentor.top (DNSPod)",
    "server": "Tencent Cloud Lighthouse HK 43.129.179.207 Ubuntu 24.04 2C2G",
    "https": "Caddy",
    "process": "systemd bizmentor -> next start 127.0.0.1:3000"
  },
  "routes": [
    "/(home)",
    "/chat",
    "/skills",
    "/knowledge",
    "/onboarding",
    "/profile",
    "/opportunities",
    "/opportunities/new",
    "/opportunities/[id]",
    "/projects",
    "/training",
    "/training/[id]",
    "/api/ai",
    "/api/chat",
    "/api/skill",
    "/api/review",
    "/api/knowledge-candidate",
    "/api/external-research"
  ],
  "envVars": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY(未配置)",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_RESEARCH_MODEL",
    "OPENAI_REASONING_MODEL",
    "OPENAI_*_PRICE_PER_1M",
    "DEEPSEEK_API_KEY",
    "DEEPSEEK_BASE_URL",
    "DEEPSEEK_MODEL",
    "DEEPSEEK_*_PRICE_PER_1M",
    "NEXT_PUBLIC_APP_URL",
    "AI_USAGE_FILE",
    "TAVILY_API_KEY",
    "EXTERNAL_INTELLIGENCE_PROVIDERS"
  ]
}
$('`')

---

> 附录：便携完整包 BizMentor-Portable-完整知识包.zip 内含本文件 + 代码 bundle（git clone bizmentor.bundle 可恢复全部历史）。