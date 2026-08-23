# BizMentor AI

个人 AI 商业导师与商业机会操作系统。
帮助用户走完 **发现 → 理解 → 判断 → 验证 → 复盘 → 成长** 的完整闭环，而不是替用户做所有决定。

> 当前版本：**V0.1**（PWA 基础框架，全部使用本地 mock 数据，无真实 AI / 数据库 / 支付 / 多用户）。

## 功能（V0.1）

- 底部 5 个导航页面：首页 / 商机 / 项目 / 训练 / 我的
- 首页：今日商业机会（评分维度）、今日商业训练、当前项目、商业能力概览
- 商机：列表 + 筛选（AI发现/我发现的/研究中/验证中/已验证/已放弃）+ 新增商机（本地保存）+ 详情页
- 项目：项目列表（与商机严格区分）
- 训练：6 大分类 mock 题目，提交答案后进入「等待 AI 评分」（为 AI Examiner Agent 预留接口）
- 我的：商业等级 + 8 项能力评分（mock）
- PWA 基础：manifest、图标、theme color、mobile viewport、Service Worker
- 暗色 / 浅色主题切换（跟随系统，可手动切换并记忆）

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router）
- TypeScript（strict）
- Tailwind CSS v4
- lucide-react（图标）
- PWA（自定义 Service Worker + Web App Manifest）
- 本地存储：localStorage（未来替换为 Supabase）
- 包管理器：pnpm（当前环境未安装 npm，pnpm 命令等价）

## 环境要求

- Node.js ≥ 20（开发环境使用 v24.19.0）
- pnpm ≥ 9（开发环境使用 v11.19.0）

## 安装

```bash
pnpm install
```

## 启动开发服务器

```bash
pnpm dev
```

打开 http://localhost:3000。

## 构建（生产）

```bash
pnpm build
pnpm start
```

生产模式会注册 Service Worker，PWA 离线能力在 `pnpm start` 下生效。

## 配置环境变量

V0.1 **不需要**任何环境变量即可运行。

如需预留未来配置：复制 `.env.example` 为 `.env.local` 并按需填写。

```bash
cp .env.example .env.local
```

- `OPENAI_API_KEY`：仅服务端读取，严禁以 `NEXT_PUBLIC_` 前缀暴露，严禁提交到 Git
- `AI_MODEL_SIMPLE / AI_MODEL_RESEARCH / AI_MODEL_REASONING`：未来模型路由的模型名
- `NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY`：未来 Supabase 接口预留

所有环境变量统一在 `lib/config/env.ts` 与 `lib/config/ai-models.ts` 中读取，业务代码禁止直接访问 `process.env`。

## 运行测试 / 质量检查

自动化质量检查：

```bash
pnpm lint    # ESLint
pnpm test    # AI 网关单元测试（node:test，无需 API Key）
pnpm build   # 生产构建（包含 TypeScript 类型检查）
```

## PWA 验证

1. `pnpm build && pnpm start`
2. 浏览器打开 http://localhost:3000
3. DevTools → Application → Manifest / Service Workers 检查
4. iPhone Safari：打开页面 → 分享 → 添加到主屏幕
5. 手机访问：确保手机与电脑在同一局域网，访问 `http://<电脑IP>:3000`（见下方说明）

## 手机访问（本地局域网）

1. 电脑与手机连接同一 Wi-Fi
2. 查看电脑局域网 IP：Windows 下运行 `ipconfig`，找到 IPv4 地址（例如 `192.168.1.5`）
3. 手机浏览器访问 `http://192.168.1.5:3000`
4. 如无法访问，检查 Windows 防火墙是否放行 Node.js（或使用 `pnpm dev --hostname 0.0.0.0`）

> 注意：`next dev` 默认只监听 localhost。开发模式下手机访问需添加 `--hostname 0.0.0.0`：
> `pnpm dev --hostname 0.0.0.0`

## 目录结构

```
bizmentor-ai/
├── app/                 # 页面（App Router）
│   ├── page.tsx         # 首页
│   ├── opportunities/   # 商机（列表/新增/详情）
│   ├── projects/        # 项目
│   ├── training/        # 训练（列表/题目）
│   ├── profile/         # 我的
│   ├── layout.tsx       # 根布局（主题/底部导航/PWA meta）
│   └── manifest.ts      # PWA manifest
├── components/
│   ├── layout/          # 底部导航 / 页头
│   ├── ui/              # 通用 UI（卡片/徽章/进度条等）
│   ├── home/            # 首页区块组件
│   └── providers/       # 主题提供者
├── lib/
│   ├── types/           # 领域类型定义
│   ├── config/          # 环境变量 / AI 模型路由配置（集中管理）
│   ├── data/mock/       # mock 数据
│   ├── store/           # 本地存储（未来替换 Supabase）
│   └── utils/           # 工具函数
├── agents/              # 【未来】Agent 系统预留目录
├── ai/                  # 【未来】AI 客户端 / Prompts / 模型配置预留目录
├── skills/              # 【未来】Skill 版本管理预留目录
├── memory/              # 【未来】用户记忆预留目录
├── database/            # 【未来】数据库层预留目录
├── public/              # 静态资源（含 PWA 图标、sw.js）
└── scripts/             # 工具脚本（图标生成等）
```

## 未来路线（不在 V0.1 实现）

- AI Agent 系统（opportunity / research / strategy / finance / validation / examiner / mentor）
- 模型路由（简单任务 GPT-5.6 Luna；普通研究 GPT-5.6 Terra；复杂推理 GPT-5.6 Sol）
- Supabase 数据持久化与多用户
- AI 自动评分、报告生成、商机自动发现
- 通知系统、支付、自动任务、Skill 版本管理

## 版权 / 安全

- 所有 API Key 只存在于服务器环境变量，禁止出现在前端代码或 Git 历史中。

## AI 网关（V0.2）— 多 Provider 架构

BizMentor 使用多模型 Provider 架构（OpenAI + DeepSeek），业务 Agent 禁止直接调用任何 SDK，
统一通过 `lib/ai/gateway.ts` 的 `runAI()` 访问：

```ts
import { runAI } from "@/lib/ai/gateway";

const result = await runAI({
  capability: "simple",          // simple | research | reasoning
  task: "整理这段商机描述…",
  type: "opportunity_screening", // 任务类型（Router 可据此自动升级）
  agent: "opportunity",
});
```

路由规则（`lib/ai/router.ts`）：

| 能力等级 | 默认 Provider | 默认模型（环境变量可覆盖） |
| --- | --- | --- |
| simple | DeepSeek | `DEEPSEEK_MODEL`（默认 deepseek-chat） |
| research | OpenAI | `OPENAI_RESEARCH_MODEL`（默认 gpt-5.6-terra） |
| reasoning | OpenAI | `OPENAI_REASONING_MODEL`（默认 gpt-5.6-sol） |

- 自动升级：任务类型（如 `user_research` → research、`examiner` → reasoning）或显式 `escalate` 会抬升能力等级
- Fallback：DeepSeek 失败 → OpenAI（标记 `provider_degraded=true`）；OpenAI 失败仅对允许低质量降级的任务回退 DeepSeek；
  Examiner / 最终判断 / 最终报告禁止降级，失败会明确抛错
- 成本：统一由 `lib/ai/usage.ts` 计算并记录 `ai_usage`（provider/model/task/agent/inputTokens/outputTokens/
  estimatedCost/durationMs/success/createdAt + degraded/fallbackFrom/error），本地落盘 `.data/ai_usage.jsonl`
- 新增 Provider：只需新增 `lib/ai/providers/xxx.ts` 并在 `providers/index.ts` 注册，不改 Router/Gateway/UI
- 安全：`OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 仅服务端，严禁 `NEXT_PUBLIC_` 前缀

详细说明见 `lib/ai/README.md`。