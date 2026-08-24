# BizMentor-Asset-Inventory（项目资产清单）

> 审计日期：2026-08-24
> 目的：任何 AI / 开发者接手本项目，只读本文件即可知道所有资产在哪里。
> 安全：本文件**只列变量名称，不包含任何 Key 值**。

---

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