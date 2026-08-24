# BizMentor System State（项目连续性文档）

> **本文件是 BizMentor-AI 项目的「唯一事实来源」**。任何新的 Codex 窗口 / AI 助手 / 开发者接手前，必须先读本文件。
> 每个 Phase 完成后必须同步更新本文件（版本号、模块清单、数据资产、未解决问题）。

---

## 1. 当前版本

- **V0.5.0 Phase 10A-1/2**（Personal Business OS 数据基础：Personal Profile + Business Profile）
- 最近 Git commit：`（提交时更新为最新）`
- 技术栈：Next.js 16.3.2（App Router, Turbopack）+ React 19 + TypeScript 5 + Supabase + zod + node:test

## 2. 当前系统架构

```
用户触点（Web，未来 PWA/桌面/iOS）
  ↓
Agent Runtime（lib/agent：生命周期/工具编排/上下文/审计）  ← V0.4.2 9B-1
  ↓ 调用
Business Engine（lib/research · lib/decision · lib/domain · lib/external）
  ↓ 记忆
Business Memory（lib/memory + lib/knowledge[规划]）
  ↓ 身份
Identity（lib/identity，单用户 local-user，Auth 预留）
  ↓ 存储
Repository Provider（lib/repository：Supabase / Local 切换）
```

原则：**Agent 只编排，不复制业务逻辑；引擎链是工具、Memory 是记忆、Identity 是身份。**

## 3. 已完成模块列表

| 模块 | 能力 | 阶段 |
| --- | --- | --- |
| lib/ai | AI Gateway（OpenAI/DeepSeek 多 Provider + Router + usage） | V0.2 |
| lib/research | Research Pipeline（9 阶段）+ Evidence/Source/Score | V0.3-A/B |
| lib/decision | Decision Engine（Thesis/单位经济/Examiner）+ Execution Engine（状态机/超期/摘要） | V0.3-C / 7A / 7B-2 |
| lib/external | External Intelligence（Tavily + DDG fallback） | 6.2-A/B |
| lib/domain | Business Domain（8 领域检测/注入） | 6.1A/B |
| lib/memory | Business Memory（决策记忆/事件归档/模式检索） | 8A |
| lib/identity | Identity（local-user / Auth 预留） | 8B-2 |
| lib/repository | Repository Provider（Supabase/Local 切换） | 3A-3C |
| lib/agent | Agent Runtime（生命周期/工具/上下文/审计） | 9B-1 |
| lib/agent/loops | **Business Operating Loop（晨报/异常检测/晚报）** | **9B-2（本阶段）** |
| lib/agent/scheduler | **Agent Scheduler（App 打开/手动/测试触发）** | **9B-2** |
| lib/agent/events | Agent Event 总线（旁路 emit/subscribe） | 9B-2 |
| lib/skills | Skill System（BizSkill/Registry/选品/竞品） | 9B-3 |
| lib/knowledge | Personal Knowledge（习惯/判断方式/经验/案例 + 确认机制） | 9B-4 |
| lib/settings | **Settings Repository（本地缓存 + Supabase 云端同步）** | **9B-5（本阶段）** |
| lib/sync | **SyncManager（LWW 同步）+ AgentStateRepository 预留** | **9B-5** |
| lib/pwa | **PWA Manifest 共享源 + sw.js（离线/重同步）** | **9B-5** |
| lib/identity/auth | AuthIdentityProvider（Auth Ready，fallback local-user） | 9B-5 |
| lib/profile | **Personal Profile（用户是谁：名称/时区/语言/偏好）** | **10A-1（本阶段）** |
| lib/business | **Business Profile（经营世界：名称/描述/businessTypes）** | **10A-2（本阶段）** |
| lib/supabase | 浏览器/服务端客户端 + 统一错误 | 1/4A |
| lib/migration | localStorage → Supabase 迁移工具 | 5A |
| app/ | 首页/商机/项目/训练/我的 + /api/ai + /api/external-research | V0.1-9B-1 |

## 4. 数据资产说明

- **商机**：opportunities（Supabase 表，RLS 单用户 local-user）
- **研究**：research_runs（run_id + report jsonb：findings/score/validationPlan/sources/thesis/unitEconomics）
- **决策**：decisions / decision_reviews / validation_plans（tasks jsonb 含 stateHistory/priority）/ validation_results / score_updates / learning_events
- **记忆**：memory_records（决策记忆，V0.4.2 9B-1 时生产表**待应用**——需在 Supabase SQL 编辑器执行 schema.sql 的 memory_records DDL）
- **Agent 运行审计**：AgentRun（Local localStorage `bizmentor:v1:agentRuns`；未来 Supabase agent_runs 表）
- **经营循环产出**：DailyBriefing / DailyReview / AnomalyAlert（确定性生成，可保存/恢复；暂不落库，由调用方保存）
- **本地**：localStorage `bizmentor:v1:*`（开发/缓存）；**Supabase 是生产真相源**

## 5. 数据同步方案

- Repository Provider：配置 Supabase（URL + anon）→ 云端；否则 Local
- 本地 = 缓存/开发；写入优先走 Supabase
- 未来多设备：Supabase 唯一真相源 + 本地缓存只读副本；记忆（memory_records）跨设备共享
- 迁移工具：scripts/migrate-localstorage.ts（opportunities/research/decisions/…，8 表）

## 6. Identity 方案

- 当前：单用户固定 `local-user`（Identity Layer 解析；`IDENTITY_USER_ID` 环境变量可选覆盖）
- RLS：所有业务表 `user_id='local-user'` 单用户策略
- 未来：Supabase Auth → `auth.uid()::text = user_id`；Identity.source 预留 "auth"

## 7. Memory 方案

- 决策记忆：`buildDecisionMemory`（AI prediction vs User prediction vs Actual result）→ memory_records
- 事件归档：learning_events（表已存在）+ MemoryEngine 聚合（skill/signal/severity）
- 模式检索：retrievePatterns（领域/决策分组 + 验证率 + 高频经验）+ findSimilarDecisions
- 个人知识（Phase 9B-4 规划）：KnowledgeRecord（习惯/判断/经验/案例），confirmed 确认机制

## 8. 当前开发规则

1. 不改数据库 schema（除非明确授权迁移）；扩展字段进 jsonb
2. 不修改既有 Pipeline 主流程；新能力走独立模块 + Repository 抽象
3. 不删/不改旧测试；新增测试保持 `pnpm test` 全绿
4. 验收三件套：`pnpm test` / `pnpm lint`（0 warning）/ `pnpm build`（+ `pnpm exec tsc --noEmit`）
5. 安全：API Key 只存环境变量；禁止打印/提交；禁止 NEXT_PUBLIC_ 暴露服务端 Key
6. Agent 只编排，不复制业务逻辑；领域经验进 registry 配置，禁止硬编码分支
7. 报告双版本：`.md` + `.html`（用 work/md2html.mjs 生成）
8. 每个 Phase 完成：Git commit + 更新本文件 + 输出报告

## 9. 下一阶段计划

- ~~9B-2~~ ✅ Operating Loop：晨报/日间监控/晚报 + Scheduler + Event（已完成）
- ~~9B-3~~ ✅ Skill System：可插拔技能（选品/竞品）+ skill_tool（已完成）
- ~~9B-4~~ ✅ Personal Knowledge：用户长期认知（AI 候选 → 用户确认 → 进入 Context）（已完成）
- ~~9B-5~~ ✅ Multi Device Foundation：Auth Ready + Settings + PWA + Sync（已完成）
- ~~10A-1/2~~ ✅ Personal/Business Profile 数据基础层（已完成；10A-3+ 待用户补充任务说明）
- **9B-3** Skill System：可插拔技能（首批 product_selection + competitor_analysis）
- **9B-4** Personal Knowledge：习惯/判断/经验/案例 + 确认机制
- **9B-5** 多端就绪：PWA + SettingsRepository + 数据同步落地
- 之后：Auth/多用户、桌面壳（Tauri 预留）、服务端 cron 主动推送

## 10. 未解决问题

1. **memory_records 生产表未应用**：schema.sql 已含 DDL，需在 Supabase SQL 编辑器执行一次
2. **OpenAI 不可用**：research/reasoning 降级 DeepSeek（已知，独立于本阶段）
3. **Agent 主动调度依赖运行环境**：浏览器 Timer 需 App 打开；真正 7×24 需服务端 cron（另立）
4. **多用户/Auth**：未接；RLS 升级路径已设计
5. **本地→云端记忆**：本地 localStorage 记忆不自动上云（可选迁移）
6. **桌面端**：PWA 优先，Tauri 预留；未实施

---
*维护：每个 Phase 完成时更新本文件。*

---

## 11. Phase 9B-2 完成记录（Business Operating Loop）

- **新增模块**：
  - `lib/agent/loops/`：collect（状态收集）/ anomaly（AnomalyDetector：超期/未执行/失败/评分下降/证伪）/ briefing（晨报）/ review（晚报，自动沉淀决策记忆）/ types
  - `lib/agent/scheduler.ts`：registerTask / runTask / runDueTasks（App 打开/手动/测试触发；未来 cron/server worker 预留）
  - `lib/agent/events.ts`：旁路事件总线 emit/subscribe（RESEARCH_COMPLETED / DECISION_CREATED / VALIDATION_COMPLETED / TASK_OVERDUE / MEMORY_CREATED）
  - `lib/agent/tools/loops.ts`：morning_briefing_tool / evening_review_tool / monitoring_tool（AgentRuntime 可调用）
- **AgentRun 扩展**：triggerType / events / loopType / memoryWrites / duration（向后兼容）
- **数据流**：触发（App 打开/手动/测试）→ AgentRuntime → Loop 工具 → collectState（Repository/Memory/Execution）→ 产出（晨报/异常/晚报）→ recordDecision 沉淀记忆 → AgentRun 审计
- **Agent 主动能力**：晨报（今日状态/异常/建议/记忆洞察）；日间监控（异常检测 + 严重度排序）；晚报（复盘 + 决策对照 AI vs 用户 vs 实际 + 经验 + 明日动作）
- **当前限制**：Scheduler 仅 App 打开/手动/测试触发（无服务器 7×24）；晨报/晚报为确定性生成（AI 文案增强未做）；Loop 产出暂不落库（调用方保存）
- **测试**：243/243 通过（新增 6：晨报/异常/晚报/Scheduler/Event/Runtime 调用 Loop）

---

## 12. Phase 9B-3 完成记录（Skill System）

- **Skill 架构**：`lib/skills/` —— BizSkill 接口（id/name/description/domain/requiredTools/run）+ SkillRegistry（动态注册/唯一 id/重复报错/invokeSkill）+ SkillOutput（summary/structured/actions/evidence/createdAt）+ researchToSkillResult 适配器。
- **已实现技能**：
  - `product_selection`（选品分析助手）：Research + Domain(ecommerce) + Memory.similar（历史成功/失败案例注入）→ 市场机会/用户需求/竞争/风险/建议动作/历史案例
  - `competitor_analysis`（竞品拆解助手）：Research + External + Memory 模式 → 定位/定价/内容/流量/优势/弱点/可复制策略
- **AgentRuntime 集成**：`skill_tool` + `agent.run("skill", { skill, input })` 便捷调用；AgentRun 扩展 skillsUsed / skillResults。
- **数据流**：AgentRuntime → SkillRegistry → Skill → Engine Tools（research/memory）→ SkillOutput → AgentRun 审计。
- **原则**：Skill 不复制引擎逻辑，只编排；未注入 research 时诚实标记「需研究验证」，不伪造来源。
- **测试**：249/249（新增 6：Registry/调用/product_selection/competitor_analysis/Memory 注入/AgentRuntime 调用技能）。
- **下一阶段**：9B-4 Personal Knowledge（习惯/判断/经验/案例）→ 9B-5 多端就绪（PWA）。

---

## 13. Phase 9B-4 完成记录（Personal Knowledge System）

- **Knowledge 架构**：`lib/knowledge/` —— KnowledgeRecord（habit/judgment_style/industry_experience/success_case/failure_case；source：user_input/ai_suggestion/review/decision；confidence；confirmed）+ KnowledgeRepository（save/list/findByType/confirm/remove，Local 先实现，Supabase 预留）+ KnowledgeEngine（captureFromUserInput / captureFromDecision / captureFromReview / confirm）+ knowledgeInsights 辅助。
- **Memory 与 Knowledge 区别**：Memory 记录「发生过什么」（决策/事件）；Knowledge 总结「这个用户是什么样的人」（习惯/判断方式/偏好/经验）。
- **确认机制**：AI（规则）提取候选 → confirmed=false 入库 → 用户 confirm() → confirmed=true → 才进入 Agent Context；未确认只能作为临时建议，不影响核心决策。
- **数据流**：决策记忆/每日复盘/用户输入 → KnowledgeEngine 提取候选 → 用户确认 → Context.knowledgeRecords → Agent 运行时与 Skill 读取（选品参考价格/风险偏好，竞品参考行业经验）。
- **Agent 集成**：AgentContext.knowledgeRecords（恢复时只加载 confirmed）；knowledge_tool（retrieve/capture）；AgentRun.knowledgeReads/knowledgeWrites。
- **测试**：255/255（新增 6：CRUD/Capture/确认/未确认不进 Context/确认后加载/Skill 读取/AgentRuntime 调用）。
- **下一阶段**：9B-5 多端就绪（PWA + SettingsRepository + 数据同步落地）。

---

## 14. Phase 9B-5 完成记录（Multi Device Foundation）

- **Identity 多设备升级**：AuthIdentityProvider（getCurrentUser/isAuthenticated/resolveUserId/subscribeAuth/init）；优先级 explicit override > authenticated user > IDENTITY_USER_ID > local-user（resolver 新增独立 authUserId 槽位，业务层 getCurrentUserId() 不变）。
- **Settings Repository**：lib/settings/ —— LocalSettingsRepository（localStorage）+ SupabaseSettingsRepository（user_settings 表）+ CachedSettingsRepository（Supabase 成功→更新本地缓存；失败→读本地缓存离线降级）。
- **PWA 基础**：lib/pwa/manifest.ts 共享 manifest 源（app/manifest.ts 引用，/manifest.webmanifest 生成）；sw.js 增强（v2：新增 sync 事件网络恢复重同步 + refresh-cache 消息）。
- **Sync 基础层**：lib/sync/ —— SyncManager（push/pull/sync，updated_at Last-Write-Wins）；AgentStateRepository 预留（agent_state/agent_runs/knowledge_records 未来进 Supabase，Local 先实现）。
- **schema 新增**：user_settings 表（user_id unique + settings jsonb + RLS）。
- **数据同步方案**：Supabase 未来唯一真相源；localStorage = 缓存/离线降级；LWW 冲突策略；不迁移所有业务数据（框架先行）。
- **测试**：266/266（新增 11：Auth fallback/认证优先/状态监听、Settings CRUD/本地 fallback/缓存策略、Sync LWW/push/pull/sync、PWA manifest/sw.js）。
- **下一阶段（规划）**：接 Supabase Auth + RLS 升级（多用户）；生产应用 user_settings 表；AgentState/Settings 上云；PWA 完善。

---

## 15. V0.5.0 Phase 10A-1/2 完成记录（Personal Business OS 数据基础）

- **10A-1 Personal Profile**（lib/profile/）：PersonalProfile（id/userId/name/timezone/language/preferences/createdAt/updatedAt）；ProfileRepository（save/get/update）；LocalProfileRepository（localStorage）+ SupabaseProfileRepository（预留，profiles 表 DDL 已入 schema.sql）。
- **10A-2 Business Profile**（lib/business/）：BusinessProfile（id/userId/name/description/businessTypes/preferences/createdAt/updatedAt）；BusinessType 通用枚举（commerce/service/product/content/saas/marketplace/local_service，**不绑定行业**）；BusinessProfileRepository（save/get/update）；Local + Supabase（预留，business_profiles 表 DDL 已入 schema.sql）。
- **原则**：行业能力未来通过 Domain Plugin 扩展；本层只存通用用户/经营画像。
- **测试**：270/270（新增 4：Profile CRUD + Supabase mock、Business CRUD + Supabase mock）。
- **注意**：原任务消息在 10A-2 businessTypes 示例后截断，10A-3+ 子任务待用户补充。
- **下一阶段（待确认）**：10A-3+（用户补充）；预期方向：Profile 上云、Agent Context 集成、Domain Plugin 骨架。