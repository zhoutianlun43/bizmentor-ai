# BizMentor System State（项目连续性文档）

> **本文件是 BizMentor-AI 项目的「唯一事实来源」**。任何新的 Codex 窗口 / AI 助手 / 开发者接手前，必须先读本文件。
> 每个 Phase 完成后必须同步更新本文件（版本号、模块清单、数据资产、未解决问题）。

---

## 1. 当前版本

- **V0.7.0 Product Release + Git 远程备份**（App Shell / 全流程闭环 / 已推送 GitHub）
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
| lib/business | Business Profile（经营世界：名称/描述/businessTypes） | 10A-2 |
| lib/context | Business Context Layer（BusinessOSContext + Builder） | 10A-3 |
| lib/llm | **LLM Provider 抽象（OpenAI-compatible + DeepSeek）** | **V0.6.0** |
| app/chat · app/skills · app/knowledge | **MVP 产品页（对话/技能/知识）** | **V0.6.0** |
| app/api/chat · skill · review · knowledge-candidate | MVP API（对话/技能/复盘/认知提炼） | V0.6.0/1 |
| lib/conversation | **Conversation（聊天历史，Local 优先 + Supabase 预留）** | **V0.6.1** |
| app/onboarding | **Onboarding（首次进入：个人+经营画像）** | **V0.6.1** |
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
- ~~10A-1/2~~ ✅ Personal/Business Profile 数据基础层（已完成）
- ~~10A-3~~ ✅ Business Context Layer：统一经营上下文（Agent Runtime + Skill 接入）（已完成）
- ~~V0.6.0 MVP~~ ✅ Product Layer：AI 对话 / Dashboard / 技能中心 / 我的AI认知 / LLM（已完成）
- ~~V0.6.1~~ ✅ Product Usability：Onboarding / 对话历史 / AI Daily Assistant / Chat 认知确认（已完成）
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

---

## 16. V0.5.0 Phase 10A-3 完成记录（Business Context Layer）

- **lib/context/**：BusinessOSContext（userId/personalProfile/businessProfile/confirmedKnowledge/memoryPatterns/activeProjects/preferences/updatedAt）+ BusinessContextBuilder（聚合 Profile/Knowledge(仅 confirmed)/Memory/Repository 当前业务状态）+ ContextRepository（Local 实现；Supabase business_context_snapshots 预留，不建真实表）。
- **Agent Runtime 接入**：AgentContext 增加 businessContext；恢复流程升级为 Identity → BusinessContextBuilder → AgentContext（换设备/重开 App 可恢复完整经营状态）。
- **Skill 接入**：SkillRunContext = AgentContext & { businessContext }（只读；Skill 不得修改 Profile/Knowledge）。
- **测试**：277/277（新增 7：Profile 聚合 / confirmed 过滤 / Memory 注入 / Agent Runtime 恢复 / Skill 读取 / Local / Supabase Mock）。
- **下一阶段（建议）**：10A-4+ 待用户补充；候选方向：context 上云快照、Domain Plugin 骨架、Profile 接入 UI。

---

## 17. V0.6.0 MVP Product Layer 完成记录（第一批）

- **lib/llm/**：LlmProvider 抽象（OpenAI-compatible + DeepSeek，generate(messages)）+ buildBusinessSystemPrompt（把 BusinessOSContext 注入个性化 system，非固定模板）。
- **API**：/api/chat（BusinessContext → LLM → 回复）、/api/skill（SkillRegistry 调用，当前 memory+确定性）、/api/review（晚间复盘 → 知识候选）。
- **页面**：/chat（问 AI 对话）、/skills（技能中心）、/knowledge（我的AI认知：确认/删除/新增 + Learning Center 复盘）。
- **首页 Dashboard**：TodayBriefing（今日经营状态：商机/研究/验证/超期 + AI 建议 + 问AI/技能/知识入口）。
- **Repository Provider**：新增 getProfileRepository / getBusinessRepository。
- **测试**：283/283（新增 6：LLM Provider/HTTP 错误/getLlm/context 提示）。
- **下一批**：/api/skill 深度研究接入（runResearch 真实 ResearchService）；聊天历史持久化；PWA 安装与生产部署验证。

---

## 18. V0.6.1 Product Usability 完成记录

- **Onboarding**：/onboarding 首次进入表单（个人：称呼/地区/语言/身份；业务：类型/行业/产品/目标）→ 保存 Personal/Business Profile → 首页守卫跳转 → BusinessContext 自动生成。
- **Conversation**：lib/conversation/（Conversation { id, userId, messages[], createdAt, updatedAt }，Local 优先 + Supabase 预留）；/chat 持久化历史 + 只发最近 10 条。
- **AI Daily Assistant**：首页新增今日关注/风险/下一步 + 「为什么这样建议」展开来源（异常检测/历史模式/长期认知）。
- **Chat 认知确认**：/api/knowledge-candidate（LLM 提炼用户信息）→ 对话中显示 [确认加入AI认知] → 用户确认后进入 Knowledge（AI 不自动学习）。
- **测试**：285/285（新增 2：Conversation Local + Supabase mock）。
- **验收**：pnpm test/lint/tsc/build 全部通过（20 路由）。

---

## 19. V0.7.0 Product Release 完成记录

- **App Shell**：底部导航（首页/AI/商机/技能/我的）+ 顶部用户状态条（用户·经营名 + 完善资料）+ 全局 OnboardingGuard。
- **全流程闭环**：首次访问 → /onboarding 填画像 → 保存（Profile/Business 带本地回退，生产 Supabase 未建表也可用）→ 首页 Dashboard（AI Daily Assistant 建议 + 今日经营状态 + 问AI/技能/认知入口）→ 问AI（带上下文+历史）→ 技能中心 → 我的AI认知 → 复盘。
- **已发布**：代码部署到生产（bizmentor.top），/、/chat、/skills、/knowledge、/onboarding、/profile 全部 200；/api/chat 可调用（真实 LLM）。
- **线上验证**：onboarding→首页→chat 全链路通过；Dashboard 显示真实生产数据（商机/研究中/异常建议）。
- **截图**：outputs/screenshots/v070/（01-07）。
- **验收**：pnpm test 285/285、lint 0 警告、tsc/build 通过。

---

## 20. V0.8 AI 商业雷达完成记录

- **定位升级**：BizMentor = AI 商业机会发现与决策操作系统（行业无关，删除女装/电商固定假设）。
- **AI 商业雷达**：lib/radar/（RadarFinding + parse.ts）+ /api/radar/scan + /radar 页面（AI 主动扫描科技/消费/服务/制造/贸易/互联网/AI应用等领域，输出机会卡片：评分 0-100、建议 值得研究/继续观察/不建议进入）。
- **商机页双入口**：创建商机 + AI商业雷达；筛选优化为 全部/AI雷达发现/我的想法/研究中/验证中/已验证/已放弃（AI雷达发现 = source='ai'）。
- **Opportunity 扩展**：radar?: RadarFinding（jsonb）；schema.sql 末尾 add column if not exists radar jsonb（线上库需手动执行）。
- **数据流**：AI发现 → Opportunity(source=ai, radar) → Research Pipeline → Decision → Validation → Memory（复用现有流程，无孤立系统）。
- **测试**：289/289、lint/tsc/build 通过；已部署生产 bizmentor.top。

---

## 21. V0.8 修复记录（收藏/进入研究保存失败）

- **现象**：雷达扫描正常，但「收藏/进入研究」点击无效（静默失败）。
- **根因**：线上 Supabase 未执行 `alter table public.opportunities add column if not exists radar jsonb;`，而 SupabaseOpportunityRepository.toRow() 无条件携带 radar 字段 → INSERT 报 PGRST204（schema cache 缺列）→ hook 捕获后静默返回 undefined。
- **修复**：
  - SupabaseOpportunityRepository：create/update 遇缺 radar 列错误（PGRST204 或 42703）时自动去掉 radar 字段重试，功能立即可用；列存在后自动存结构化数据。
  - /radar 页面：保存失败显示明确错误；保存中禁用按钮防重复提交。
- **验证**：292/292 测试通过、lint/tsc/build 通过；用真实 Supabase（anon key + 真实仓库代码）端到端验证 CREATE（降级成功）→ GET → DELETE 清理。
- **部署**：已部署生产 bizmentor.top（BUILD_ID y0buE9z0lpQZ7bEkjRyux），/、/opportunities、/radar 均 200。
- **仍待办**：在 Supabase SQL Editor 执行 `alter table public.opportunities add column if not exists radar jsonb;` 后，雷达数据将改为结构化 jsonb 存储。


---

## 22. V0.8.1 AI 对话体验升级完成记录（个人 AI 商业伙伴）

- **角色重定义**：System Prompt 改为「用户的个人AI商业伙伴」——任务不是输出报告，而是陪伴用户进行商业判断（理解问题 → 简洁判断 → 关键追问 → 逐步深入）。
- **默认轻量对话**：默认回复 300-800 字、口语化自然；不再默认输出长篇报告。
- **画像读取**：system 注入 用户（称呼/地区/身份）、经营（行业/类型/产品/服务）、目标、偏好、已验证长期认知（优势/资源/经验/判断/案例）、历史决策模式（含验证率）、当前商机状态。
- **高级指令（深度能力保留）**：lib/llm/commands.ts 新增 /深度分析、/商业报告、/市场研究、/机会评估（含英文 deep/report/market/evaluate），触发时自动切深度模式并从消息中剥离指令令牌；/chat 页顶部新增指令快捷按钮。
- **知识记忆增强**：/api/knowledge-candidate 扩展提炼范围（优势/资源/目标/偏好/判断/经验/案例 + 类型映射）；仍需用户确认才进入长期 Knowledge。
- **UI**：/chat 标题改为「BizMentor AI / 你的个人商业智能助手」，气泡增加角色标签（你 / BizMentor AI）+ 指令快捷入口。
- **验证**：298/298 测试通过（新增 6）、lint/tsc/build 通过；线上实测：普通对话简洁追问、/深度分析 输出结构化深度内容（DeepSeek）。
- **部署**：已部署生产 bizmentor.top（BUILD_ID FsCcaV91ryM04hDIYT7iO）。


---

## 23. V0.8.2 AI 对话页 UI/UX 升级完成记录（ChatGPT 风格 + 多会话）

- **Markdown 渲染**：新增 lib/conversation/markdown.ts（轻量解析器：标题/加粗/斜体/行内代码/代码块/列表/引用/分隔线/链接/段落）+ components/chat/Markdown.tsx（渲染组件）；AI 回复不再显示原始 ##、**、- 符号，标题/列表/加粗按视觉元素渲染，段落间距自动优化。
- **多会话系统**：/chat 新增会话抽屉（今天/昨天/历史分组）+ 新建对话 + 选择/删除/重命名（行内编辑）；每个会话独立 messages/title/createdAt/updatedAt/userId，上下文互不影响。
- **会话数据结构**：Conversation 增加 title? 字段（首条用户消息自动生成标题，可手动重命名）；LocalConversationRepository.list 按 updatedAt 倒序；SupabaseConversationRepository 预留 title 字段（不建表、无迁移）。
- **快捷功能卡片**：替换文字按钮为 2×2 卡片式入口（SVG 图标）：深度分析(搜索+AI芯片/靛蓝)、商业报告(文件+数据/紫)、市场研究(地球+搜索/青)、机会评估(灯泡+趋势/琥珀)；点击插入 /指令 触发专业模式；空会话时展示。
- **品牌设计**：主色 #6366F1，辅助 #8B5CF6 / #06B6D4 / #F59E0B，浅色为主；用户气泡品牌色、AI 气泡白色卡片 + Markdown。
- **验证**：307/307 测试通过（新增 9：Markdown 解析 7 + 会话 title/排序 2）、lint 0 警告、tsc/build 通过；线上 /chat 200、新 UI 元素齐备、/api/chat 正常（DeepSeek）。
- **部署**：已部署生产 bizmentor.top（BUILD_ID -xFgNyey1G7toXtM-Lgz1）。


---

## 24. V0.9 决策型报告完成记录（AI 商业判断 + Executive Decision Card + 证据增强）

- **定位升级**：商业报告从「研究型」升级为「决策型」；新增 AI 商业判断模块（lib/decision/judgment.ts + businessJudgmentSchema + businessJudgmentPrompt）。
- **AI 商业判断输出**：是否建议进入（recommend_enter/conditional_enter/continue_observe/not_recommend）、一句话判断、推荐切入方向、不建议做什么、90 天验证计划（时间线）、第一批客户获取方案、置信度；绑定 opportunityId/runId 可追溯。
- **存储**：BusinessJudgment 写入 research_runs.report.judgment（jsonb，零 schema 迁移）；DecisionService.generateJudgment 生成并持久化；/api/judgment 服务端路由（anon key 直连 Supabase + AI Gateway，OpenAI 不可用时自动降级 DeepSeek）。
- **Executive Decision Card**：components/decision/ExecutiveDecisionCard.tsx，报告首页展示 机会评分/一句话判断/最大机会/最大风险/建议动作；无判断时用评分+投资论点降级展示。
- **BusinessJudgmentView**：完整判断视图（推荐徽章/切入方向/不建议清单/90天时间线/首批客户方案）。
- **证据增强**：EvidenceItem 新增 credibilityLevel(high/medium/low/unverified) + verificationMethod；evidenceItemSchema + toEvidenceItem 透传；报告证据列表显示「可信度等级 + 验证方式 + 来源」。
- **实验模块**：验证方案渲染升级为「商业验证实验」编号卡片（假设/方法/成功标准/effort）。
- **阅读体验**：卡片化、评分、时间线、行动列表；避免长文本。
- **ChatGPT 模式**：延续 V0.8.1（默认简洁 300-800 字，/指令 触发专业模式）。
- **验证**：311/311 测试通过（新增 4：judgment 生成/重试/不伪造/保存）、lint 0、tsc/build 通过；线上 /api/judgment 实测生成完整判断（conditional_enter + 4 阶段 90 天计划 + 首批客户），Supabase 持久化确认。
- **部署**：已部署生产 bizmentor.top（BUILD_ID llZmU-gdkQXnuxXuavdCe / eD41-Dn6fE34d5yjJz4fd）。


---

## 25. V0.9.1 AI 商业决策系统完成记录（证据中心 + Evidence Score + 决策委员会 + 验证任务中心）

- **商业证据中心 EvidenceCenter**：components/research/EvidenceCenter.tsx，每个研究维度展示 数据来源/来源类型/数据时间/可信度 + AI 推理比例（数据支持 = FACT 有真实来源占比）；报告章节原文折叠为「展开结论原文」，减少 AI 推断式长文。
- **Evidence Score**：新增 6 维度证据关联评分（市场机会20%/用户需求20%/商业化20%/竞争机会15%/技术可行性15%/风险10%）；AI 只给各维度分+证据，总分按权重确定性计算；证据覆盖（数据支持/AI推理比例）由证据类别确定性计算；lib/decision/evidence-score.ts + schema + prompt；DecisionService.generateEvidenceScore；/api/judgment 同时生成 judgment + evidenceScore（失败不阻塞）；报告页新增 EvidenceScoreCard。
- **AI 商业决策委员会**：components/decision/DecisionCommittee.tsx，报告/决策区顶部展示 AI 建议（推进/先验证/继续观察/暂停 + 理由）、决策依据（支持因素/反对因素/关键变量）、决策记录、AI 复盘（预测 vs 实际 + Score 版本变化）。
- **创始人判断**：UserJudgment 新增 我的商业假设 / 我的优势 / AI 可能错误的位置（表单 + 存储 + 评审上下文）。
- **验证任务中心**：决策面板「验证计划」升级为「验证任务中心」，显示任务状态统计（未开始/进行中/完成/失败取消）+ 状态徽章；任务由未验证假设自动生成（既有 Validation Execution Engine）。
- **真实数据研究框架**：延续外部研究（Tavily/Bing/DuckDuckGo）+ 来源可信度；竞品矩阵含 价格/目标用户/功能/优势；V0.9 证据字段（credibilityLevel/verificationMethod）进入研究提示词。
- **验证**：315/315 测试通过（新增 4：Evidence Score 生成/覆盖/不伪造/持久化）、lint 0、tsc/build 通过；线上 /api/judgment 实测同时生成 judgment + evidenceScore（6 维度，overall 4.7，数据支持 6.7%），Supabase 持久化确认。
- **部署**：已部署生产 bizmentor.top（BUILD_ID kjnY9rbt1sU5agXNo14N3）。


---

## 26. V1.0 产品架构调整完成记录（研究 / 执行决策 双 Tab）

- **模块拆分**：商机详情页拆分为两个独立 Tab ——「机会研究中心」与「创业执行决策」，可互相跳转。
- **机会研究中心（Research）**：定位商业机会研究中心，重点输出 宏观市场/用户画像/行业趋势/竞品案例/成败案例/市场机会判断（证据中心 + Evidence Score + 来源/可信度）；执行类内容（mvp/validation/nextAction 章节、验证实验、下一步行动）从研究视图隐藏（折叠为「执行相关内容」），不再输出大量执行方案。
- **创业执行决策（Decision）**：新组件 ExecutiveDecisionPanel，定位创业执行决策系统，基于研究结果生成 10 项执行方案：商业战略选择 / MVP 方案 / 产品设计 / 获客渠道详细打法 / 内容素材方案 / 标题案例 / 投放策略 / 销售方案 / 90 天执行计划 / 风险控制方案；含 AI 商业决策委员会 + 创始人判断 + 验证任务中心。
- **BusinessJudgment 扩展**：新增 strategyChoice/mvpPlan/productDesign/acquisitionChannels/contentPlan/headlineExamples/adStrategy/salesPlan/riskControl + version 字段；schema/prompt/生成器同步；DecisionService.generateJudgment 每次重新生成 version+1。
- **版本记录**：Research Version（研究运行按创建时间排序 v1/v2…，Tab 徽章展示）+ Decision Version（judgment.version，Tab 徽章 + 判断视图内展示）。
- **重新生成**：Research Tab「重新研究」；Decision Tab「生成/重新生成 AI 商业判断」。
- **验证**：316/316 测试通过（新增 1：版本递增 v1→v2）、lint 0、tsc/build 通过；线上 /api/judgment 实测输出 10 项执行方案（version:1），页面 200。
- **部署**：已部署生产 bizmentor.top（BUILD_ID 5Du4y9f3sTjgKoCyCVo-N）。


---

## 27. V1.1 机会研究中心优化完成记录（过程可视化 + 证据自动验证 + AI 商业验证路线图）

- **研究过程可视化**：ResearchProgress 升级为 Research Progress Timeline——进度条（完成/总阶段 + %）、当前研究阶段 + AI 执行动作、数据来源数量、已发现证据数量；新增 evidence-verify 阶段（10 阶段）。
- **证据不足自动验证**：新增证据自动验证阶段（evidence-verify，V1.1）：当 market/competition/willingnessToPay 等维度缺少外部来源证据时，不再直接输出「需验证」，自动执行 扩展搜索 → 增加数据源 → 重新分析（新来源进入综合/评分证据池）→ 生成验证结果；仍失败则输出失败原因诊断（无公开数据/搜索词过窄/需付费数据源）。报告新增「证据自动验证」卡片（4 步流程 + 每领域状态 + 诊断）。
- **AI 商业验证路线图**：90 天计划改为 3 阶段验证路线图（阶段1 市场验证 / 阶段2 产品验证 / 阶段3 商业验证），每阶段含 目标(goal) / AI动作(aiActions，研究类任务由 AI 自动执行) / 用户动作(userActions) / 成功标准(successMetric) / 风险(risk)；Day90Step 类型 + schema + prompt + 生成器 + 视图同步更新（兼容旧数据）。
- **Tab 边界保持**：机会研究中心回答「值不值得做」（证据/评分/自动验证），创业执行决策回答「如何做成功」（10 项执行方案/路线图/验证任务），内容不重复。
- **验证**：316/316 测试通过（管线 10 阶段断言更新）、lint 0、tsc/build 通过；线上 /api/judgment 实测输出新路线图格式（3 阶段 × 目标/AI动作/用户动作/成功标准/风险）。
- **部署**：已部署生产 bizmentor.top（BUILD_ID AbA1qzDH2XmMd5e1fQcmQ）。

---

## 28. V1.1.1 调试任务完成记录（真实链路检查 + 生产修复）

### 检查结论（按用户 5 点）
1. **Research Progress Timeline**：组件存在，但重新研究时 if(run) 分支不渲染时间线 → 已修复（running 时显示时间线）。
2. **Pipeline 10 阶段**：确认执行（analyzer→…→evidence-verify→…→summary）。
3. **evidence-verify 触发**：确认触发（真实运行 4 领域 recovered）。
4. **外部结果入库**：❌ 根因——/api/external-research 只接旧 DuckDuckGo provider（被反爬 202 → 0 结果），Tavily（已配 key）未接入路由 → 已修复（改用新情报层 createExternalResearchFn，Tavily+DDG 兜底）。
5. **Evidence Score 读真实来源**：❌ 原 prompt 只读章节文本 → 已修复（prompt 注入 report.sources 前 20 条真实来源，强制基于真实来源评分）。

### 额外发现并修复的生产 bug
- **synthesis 输出截断**：DeepSeek 默认 max_tokens≈4096，大 JSON 被截断 → 非法 JSON → 研究失败。callAiStage 支持 maxTokens；synthesis=16384、scoring/validation-plan/summary=8192。实测 synthesis 输出 5304 tokens 成功。
- **saveRun 失败**（unsupported Unicode escape sequence）：抓取网页正文含孤立代理项/控制字符，Postgres JSONB 拒绝 → SupabaseResearchRepository.toRow 增加 JSON 消毒器（替换孤立代理为 U+FFFD、清除非法控制符）+ 单测。
- **证据中心/验证卡/章节被折叠隐藏**：V1.0 折叠执行内容的 details 未闭合（缺 </div></details>），导致验证卡/证据中心/全部章节被包进折叠区 → 结构修复（下一步行动移入折叠区，证据内容回到可见区）。

### Prompt 修改（创业合伙人）
- AI 角色 = 创业合伙人（AI Co-Founder）：AI 负责 市场调研/数据收集/趋势分析/竞品分析/整理；用户只负责 提供资源、渠道、资金、做最终商业决策/审批。
- 禁止让用户完成市场调研、数据收集、访谈、问卷、抓取等研究类任务；day90Plan 的 aiActions 承担研究类任务，userActions 只能含 资源/决策/审批。

### 真实验证（浏览器 + 数据库）
- 真实重新研究：10 阶段全完成、外部研究 搜索7/来源12-19、evidence-verify 补 7 来源、synthesis 输出 5304 tokens 成功、无错误入库。
- 数据库：source_documents=19（真实来源：researchnester/theinsightpartners/woshipm/huxiu/tmtpost 等）；report.verification=recovered(4 领域 targetUser/demandStrength/moat/willingnessToPay)；insufficientEvidence 已清空（市场/竞争/付费意愿均获来源）。
- 判断（新 prompt）：AI 动作=自动抓取社区/收集竞品/分析访谈/调研渠道；用户动作=提供联系方式/审批/提供资金/提供客户名单——研究类任务全部由 AI 承担。
- 截图：outputs/screenshots/v111/（13 张：研究时间线 01/02/04、报告 03/05/07/13、证据验证卡 08、证据中心 09、过程记录 10、决策路线图 11、来源卡 12）。

### 验收
- 317/317 测试通过（新增：saveRun 消毒器单测）、lint 0、tsc/build 通过。
- 部署：bizmentor.top（最终 BUILD_ID xSWPj5UdGxWVmDK3xT1HM）。

---

## 29. V1.2 真实商业落地决策系统完成记录（商业操盘手报告）

- **定位**：机会研究中心 = 商业机会调查报告（WHY）；创业执行决策 = 商业操盘方案（HOW）。两个 Tab 保持，避免重复。
- **新模块 lib/operation/**：BusinessOperationPlan（商业操盘手报告）10 部分：市场真实需求验证（关键词×平台趋势表）/ 产品筛选矩阵（10-20 候选含供应/售价/采购/毛利/物流/利润/竞争难度/评分/推荐）/ 竞品深度拆解（5-10 真实竞品）/ 供应链（渠道/MOQ/周期/物流/成本，无真实数据 verified=false）/ 定价模型（采购-物流-佣金-广告-人工=真实成本，盈亏平衡广告成本/目标ROI）/ 页面优化（10+标题/主图方案/描述结构/SEO关键词）/ 内容增长系统（30 条计划：标题/结构/Hook/拍摄/展示/CTA/指标）/ 广告投放（分阶段预算/素材/指标/淘汰/放量规则）/ AI 操盘 90 天计划（阶段/目标/AI负责/用户负责/工具/输出/成功标准）/ 投资判断（YES/NO/验证后进入 + 市场/竞争/供应链/利润/增长/风险 + 最大未知 + 下一步关键实验）。
- **Pipeline**：生成前先真实数据采集（外部研究 Tavily → OperationSource[]），再 3 组子生成（A 市场+产品+供应链；B 竞品+定价；C 页面+内容30+广告+90天+投资判断），每组独立 schema + maxTokens + 重试。
- **sourceRequired**：所有数据条目带 sourceRequired/sourceRef；无真实数据必须显示「暂无真实来源，需要验证」，禁止 AI 编造（实测 pricing.totalCost 与 supplyChain 均诚实标注）。
- **接入**：DecisionService.generateOperationPlan + /api/operation（服务端：AI Gateway + createExternalResearchFn + Supabase anon 直连）；report.operationPlan（jsonb，无 schema 迁移）；ExecutiveDecisionPanel 新增「生成/重新生成操盘报告」按钮 + OperationPlanView；Decision v{n} 版本递增。
- **验证**：320/320 测试通过（新增 3：来源采集/生成完整/版本递增）、lint 0、tsc/build 通过；线上 /api/operation 实测生成 23KB 完整报告（6 真实来源 gminsights/myzaker/ithome/aliyun 等；10 产品候选/8 竞品/30 内容/3 广告/4 阶段；无真实数据处标注「暂无真实来源，需要验证」），入库确认。
- **部署**：bizmentor.top（BUILD_ID Em8mYvRpqQ5E0InhJKiEa）。
- **截图**：outputs/screenshots/v12/（8 张：市场验证 01/产品矩阵 02/竞品 03/供应链定价 04/页面优化 05/内容30 06/90天 07/投资判断 08）。

---

## 30. V1.2.1 AI 商业雷达数据持久化完成记录（长期机会资产库）

- **问题**：雷达扫描结果只存前端 state，离开页面即丢失；只有点击后才保存。
- **新流程**：AI 扫描 → 生成机会 → /api/radar/scan 服务端自动写入数据库（status=discovered，携带 scanId）→ 进入「发现机会池」→ 用户选择 收藏/进入研究。
- **数据模型**：OpportunityStatus 新增 discovered/reviewing（已发现/收集中）；Opportunity 新增 sourceType（manual_create/ai_radar）、scanId；RadarFinding 新增 scanId；OpportunityInput 新增 status。
- **扫描历史**：lib/radar/service.ts buildScanHistory —— 从机会列表按 scanId 分组推导（扫描时间/发现数量/进入研究数量），无需新表；再次进入页面自动恢复最近扫描（含真实评分/分类，从 notes 解析降级）。
- **持久化兼容**：线上 opportunities.radar 列仍未执行迁移 → 采用「scanId 编码进 notes」零迁移方案（scanId=xxx），fromRow 从 radar 或 notes 解析；V0.8 缺列降级继续生效。
- **页面**：雷达页新增 本次扫描发现/累计 AI 发现机会/扫描历史/重新扫描（不删历史）；收藏→reviewing、进入研究→researching+跳转；商机列表新增「已发现」筛选；详情页 discovered→researching 自动流转。
- **验收**（真实浏览器+数据库）：扫描 5 个自动入库；刷新后自动恢复最近扫描；重新登录（新浏览器）12 个 AI 机会仍在并恢复；点击进入研究后状态 researching（DB 分布 researching:3 / discovered:9，仅点过的进入研究）。
- **测试**：323/323（新增 3：批量入库/重读仍在/扫描历史统计）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID GjaP2cME07utUYUXxKbNl 起）。
- **截图**：outputs/screenshots/v121/（01 扫描自动保存/02 进入研究跳转/03 状态流转/04 重新登录恢复）。

---

## 31. V1.3 AI 商业雷达机会池管理完成记录（AI 持续发现商业机会资产库）

- **定位升级**：AI 商业雷达从「扫描一次生成几个商机」→「AI 持续发现商业机会资产库」：发现 → 评估 → 收藏观察 → 推进研究 → 放弃/删除，完整机会管理流程。
- **机会池**：新增 /radar/pool（AI 发现机会池）+ /radar/latest（本次扫描结果）；雷达首页 4 个可点击统计卡（本次扫描/累计/收藏/推进）。
- **状态管理**：新增 opportunityStatus 生命周期（discovered/favorite/researching/promoting/rejected/deleted）+ favoriteAt/promotedAt/rejectedAt/deletedAt/rejectReason；收藏→favorite、推进→promoting、放弃→rejected(保留原因)、删除→软删除(保留 deletedAt，禁止物理删除)、重新开启→restore。
- **操作**：每卡 收藏/开始深度研究(→researching+跳转机会研究中心)/推进/放弃(填原因)/删除(确认软删)；推进中卡支持 进入创业执行决策/归档放弃。
- **AI 推荐排序**：AI 优先级评分（基础评分+建议权重+用户关注加成），机会池默认按 优先级→最新→关注 排序。
- **持久化**：所有字段编码进 notes（scanId/oppStatus/时间戳/原因，零迁移，兼容缺 radar 列）；Supabase fromRow + Local 透传解析。
- **验证**（真实浏览器+数据库）：扫描自动入库；收藏/推进/放弃(原因)/删除(软删) 全部生效——DB 状态 {promoting:1, favorite:1, rejected:1(含原因), deleted:1(含deletedAt), 其余已发现}；删除后默认列表隐藏但数据库保留。
- **测试**：331/331（新增 8：20 个扫描入库/重读仍在/收藏5/推进3/放弃2保留原因/软删保留/研究流转/notes 往返/优先级排序）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID Ie_a-nQdJVBLCR9aQgjzH1）。
- **截图**：outputs/screenshots/v13/（01 收藏/02 池全部/03 收藏tab/04 推进tab/05 收藏填充/06 已放弃/07 删除后/08 雷达删除后）。

---

## 32. V1.x 全局商机管理与导航体验优化完成记录

- **统一商机操作系统**：收藏/删除不再专属 AI 雷达，所有来源商机（manual_create / ai_radar）统一支持 收藏 / 删除 / 推进 / 开始研究。
- **统一字段**：isFavorite（boolean）+ favoriteAt（所有来源共享收藏）；软删除 deletedAt + deletedBy（禁止物理删除）；默认列表隐藏但数据库保留。
- **统一组件**：components/common/OpportunityActions（收藏/取消收藏/删除+确认弹窗「确定删除该商业机会？删除后不会出现在默认列表，历史数据保留」/开始深度研究/推进/进入执行决策/归档放弃）+ components/common/BackButton（← 返回）。
- **页面接入**：我的商机列表卡加统一操作 + 「我的收藏」入口 + 详情链接带 from；AI 机会卡/机会池/收藏列表/推进列表全部使用 OpportunityActions；新增 /opportunities/favorites（我的收藏，isFavorite=true 全来源，支持取消收藏/开始研究/进入执行决策）。
- **智能返回**：详情页按来源返回（from=pool→机会池、from=radar→AI雷达、from=favorites→我的收藏、默认→我的商机）；机会池/本次扫描/我的收藏均加 BackButton；详情页加面包屑（首页 › 商机 › 机会名）。
- **备注清洗**：详情页备注用 stripRadarMeta 隐藏元数据尾巴（修复历史污染数据展示）。
- **修复**：setRadarMeta 的 display 提取改用 stripRadarMeta（修复 manual 商机取消收藏后 isFav=true 残留导致 isFavorite 无法取消的 bug）。
- **验证**（真实浏览器+数据库）：我的商机列表统一按钮；收藏→我的收藏页显示；删除→confirm→默认列表隐藏；详情页 from=pool 显示「返回机会池」+ 面包屑 + 备注清洗；点击返回正确跳转 /radar/pool。
- **测试**：334/334（新增 3：manual 收藏开关/软删保留/notes 清洗）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID G9141EfsdJnysmpUJSQkt）。
- **截图**：outputs/screenshots/v1x/（01 列表统一操作/02 我的收藏/03 删除后/04 详情返回+面包屑/05 返回机会池）。

---

## 33. V1.4 AI Agent 异步任务系统完成记录（Task Engine）

- **目标**：所有 AI 长任务（深度研究/AI商业判断/操盘报告/雷达扫描）脱离前端生命周期，后台独立运行；切页/关浏览器/锁屏/刷新均不中断。
- **Task Engine**：lib/tasks/ —— 统一任务模型（id/userId/projectId/taskType/status/progress/currentStage/stages/result/error/时间戳/checkpoint）+ TaskStore（服务器 .data/tasks.json 文件持久化，零数据库迁移，跨重启存活）+ Engine（createAndStartTask 立即返回 taskId，后台异步执行，逐阶段更新进度 + AgentExecutionLog 记录 input/output/model/成本）。
- **Executors**：research（服务端跑完整研究管线 + onStage 逐阶段更新进度/来源/证据，完成自动存 Supabase research_runs）、decision（判断→Evidence Score→操盘报告串行）、radar_scan（LLM 扫描 + 自动入库）。
- **API**：POST /api/tasks（创建+后台执行返回 taskId）、GET /api/tasks（列表）、GET /api/tasks/:id（轮询 + 日志）。
- **UI**：全局 AITaskBanner（轮询进行中任务，顶部显示「任务标题 · 阶段 · 进度% · 查看」）、TaskTimeline（进度条/当前阶段/阶段列表/搜索来源证据计数）、AI 任务中心 /tasks（进行中/已完成/失败分组，失败原因 + checkpoint「已完成 N 阶段失败于 X」）。
- **迁移**：ResearchPanel/雷达页/ExecutiveDecisionPanel 全部改为任务驱动（点击→POST 创建→返回 taskId→2s 轮询→完成刷新；进入页面自动恢复该商机进行中的任务）。
- **持久化**：文件存储（.data/tasks.json + agent-logs.jsonl），服务器重启后任务状态保留；任务中心可查看历史（含失败原因）。
- **修复**：引擎创建任务时未存 payload → 任务执行器收不到入参（已修复 + 回归测试）。
- **验证**（真实浏览器）：开始研究 → 切到首页 → 全局横幅显示「深度研究 · 20%」→ 后台继续（external-research→evidence-verify→scoring→validation-plan→完成）→ 任务中心「已完成」+ 查看结果 → 报告自动加载（执行器已存 Supabase）→ 刷新任务不丢；失败任务保留原因与 checkpoint。
- **测试**：338/338（新增 4：任务完成/失败checkpoint/未知类型/持久化跨实例）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID K8IoWbPhn9fciWyjLuZVl）。
- **截图**：outputs/screenshots/v14/（01 研究任务时间线/02 任务中心/03 进行中横幅/04 任务中心进行中/05 报告加载）。

---

## 34. V1.5 项目级 AI 主理人 Agent 完成记录（每个项目一个长期 AI 联合创始人）

- **入口**：商机详情页新增第三 Tab「AI项目主理人」（长期存在），顶部三 Tab：机会研究中心 / 创业执行决策 / AI项目主理人。
- **项目认知档案**：lib/project-agent/cognition.ts buildCognition —— 首次打开自动读取 商机描述/研究报告/Evidence/Evidence Score/判断/操盘报告/决策历史 → 生成 项目身份（AI商业主理人/长期联合创始人）、当前目标、核心判断、主要风险、关键事实（确定性提取，不重复生成）。
- **项目长期记忆**：lib/project-agent/store.ts —— 文件持久化（.data/project-memory.json，跨重启），每个项目独立：项目事实/用户决策/项目变化/AI判断历史/知识库/复盘。
- **对话**：/api/project-agent/chat —— 系统提示注入 认知+记忆+研究报告要点+模式；回答必须结合项目资料、引用历史判断时说明来源；回答自动写入知识库。
- **4 种模式**：顾问/主理人/投资人/运营（不同系统提示）。
- **URL 分析**：真实读取网页（外部研究）→ LLM 输出 竞品/价格/卖点/机会点 → 写入记忆 + 项目变化；数据不足诚实声明。
- **文本分析**：粘贴资料/截图文字 → 分析 → 记忆。
- **复盘**：AI 判断 vs 验证结果 → 预测/实际/偏差/经验 → 记忆。
- **主动吸收**：每次对话/URL/文本分析自动更新记忆；认知档案每次打开从最新研究实时重建（新研究完成自动生效）。
- **验证**（真实浏览器）：打开主理人 Tab 显示认知档案；问「最大风险」AI 结合本项目报告回答（引用置信度49%、评分反差、验证建议）；URL 抓取 The Insight Partners 报告并输出结构化分析；刷新后记忆持久化（项目变化+知识库保留对话与竞品分析）。
- **测试**：341/341（新增 3：认知档案/记忆持久化/系统提示）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID vqjFRpkyBnv-o8n26fDz7）。
- **截图**：outputs/screenshots/v15/（01 认知档案/02 对话回答/03 URL分析/04 记忆持久化）。
- **当前限制**：PDF/Excel/Word/图片二进制的解析未接（可用文本粘贴/URL 分析替代）；AI 主动提醒为简化版（基于记忆与验证结果）；可后续接入视觉模型与定时检查。

---

## 35. V1.6 AI 输出系统升级完成记录（商业顾问级结构化输出）

- **目标**：项目 AI 输出从「普通聊天文本」升级为「商业顾问级结构化内容」（麦肯锡报告 + 创业顾问 + AI 执行团队风格），不再连续大段文字。
- **Response Format Router**：lib/agent-output/prompt.ts —— 用户意图 → 最佳格式（竞品→表格+SWOT；运营→时间线+内容表；值不值得做→判断卡+风险矩阵；选品→产品表；成本利润→财务表；问答→分段文本≤300字）；系统提示强制输出 JSON blocks，禁止连续长文。
- **商业组件库**：components/agent-output/StructuredReply.tsx —— Summary Card（结论+置信度+依据）/ Data Table / Action Plan Timeline / SWOT Card / Product Research Card / Content Plan Board / Financial Model Table / Risk Matrix / Text；不渲染 Markdown。
- **解析器**：lib/agent-output/parse.ts —— LLM JSON 归一化 + 容错降级文本；deriveKnowledgeDelta 推断 新观点/新决策/新数据/新风险。
- **导出**：CSV（表格，Excel 可开）+ HTML 报告（Word/浏览器可开）按钮。
- **知识沉淀展示**：AI 回答后显示「已沉淀到项目知识库：新观点/新数据/新风险」+ 写入长期记忆（知识库 + 项目变化）。
- **图片**：新增「图片」按钮（诚实提示：DeepSeek 暂不支持视觉，建议粘贴截图文字用「分析资料」）。
- **URL/文本分析**：延续 V1.5。
- **验证**（真实浏览器）：问「分析值不值得做」→ 输出 核心判断卡（置信度65%+4条依据）+ 竞品对比表（Synthesia/HeyGen/D-ID/本项目）+ 风险矩阵（4项含影响/概率/应对）+ CSV/报告按钮 + 知识沉淀提示；刷新后记忆持久化（AI 识别新风险 2026-08-26 + 知识库保留）。
- **测试**：345/345（新增 4：blocks 解析/降级/脏块跳过/知识沉淀推断）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID hESwxq4yAHsa0Elo7TKY0）。
- **截图**：outputs/screenshots/v16/（01 结构化输出/02 记忆持久化）。
- **当前限制**：图片/视频理解需视觉模型（已给占位与提示）；Word/Excel/PPT/PDF 原生导出为 CSV+HTML 方案（可后续接 docx/xlsx/pptx 库）。

---

## 36. V1.7 AI 输出系统架构升级完成记录（Output Intelligence Layer）

- **Output Intelligence Layer**（lib/ai/output/）：
  - intent-analyzer.ts：AI 回答前判断用户意图（商业判断/竞品/选品/执行方案/市场/综合），确定性分类，零额外 LLM 成本。
  - output-router.ts：意图 → 输出模板（blocks + 必填字段 + 质量规则）；模板来自 config/ai-output-templates/*.json（business-analysis / competitor-analysis / product-selection / execution-plan）。
  - response-schema.ts：复用 agent-output 结构化类型。
  - output-quality-checker.ts：每次输出后自动检查 空泛建议（"做好/加强/努力"）/ 无依据判断（"市场巨大"无数据）/ 缺执行细节（产品缺供应成本售价利润、阶段缺负责人指标）。
- **商业输出模板系统**：4 个 JSON 模板定义 结构/必填字段/质量规则，驱动路由与系统提示。
- **多模态接口预留**（lib/ai/multimodal/）：MultimodalProvider { analyzeImage/analyzeVideo/analyzeDocument/generateVisual }，当前 MockProvider（"当前未接入视觉模型"），未来接入 GPT-4.1 Vision/Claude/Gemini/Qwen-VL/DeepSeek Vision 无需改业务。
- **文件理解层接口**（lib/ai/files/layer.ts）：FileAnalyzer + FileUnderstandingLayer（上传→分析→抽取→知识库→AI），当前 Mock（PDF/Excel/Word 解析器未来接入）。
- **Output Artifact System**（lib/ai/artifacts/builder.ts）：Artifact { type: text/table/report/slides/image/video, content, metadata, status }；当前 text/table/report ready，slides/image/video coming_soon。
- **UI**：项目 AI 面板顶部 快捷动作（重新分析/生成商业报告/生成执行计划/导出报告）+ 认知卡显示「当前理解」；回答后显示「⚠ AI 质量自检」+「✓ 已沉淀到项目知识库」。
- **验证**（真实浏览器）：生成商业报告 → 判断卡+市场证据表+竞争表+SWOT+成本利润+风险矩阵+下一步与量化指标；"帮我分析竞品" → 5 家横向对比表（价格/用户/优势/不足/可借鉴）+ SWOT + 机会点。
- **测试**：349/349（新增 4：意图分类/模板路由/质量审核/制品状态）、lint 0、tsc/build 通过。
- **部署**：bizmentor.top（BUILD_ID mYfSvqGQOVe_8k5pZLX79）。
- **截图**：outputs/screenshots/v17/（01 头部动作/02 商业报告/03 竞品分析）。
- **未来多模态接入方案**：实现真实 MultimodalProvider → registerMultimodalProvider 替换 Mock → 图片/视频输入走 FileUnderstandingLayer → 分析结果写入项目知识库 → AI 结合分析（业务无需重构）。
