# lib/ai — 多 Provider AI 网关（V0.2）

## 架构

```
业务 Agent（未来）
    │  只允许调用 runAI(...)
    ▼
lib/ai/gateway.ts   —— 统一入口：选路 / fallback / 用量记录
    │
    ▼
lib/ai/router.ts    —— 能力等级 → Provider + Model（支持自动升级）
    │
    ▼
lib/ai/providers/   —— Provider 抽象（openai.ts / deepseek.ts / 未来 xxx.ts）
    │
    ▼
OpenAI / DeepSeek  HTTP API（服务端）
```

## 使用方式（业务 Agent）

```ts
import { runAI } from "@/lib/ai/gateway";

// 低成本任务：DeepSeek
const screen = await runAI({
  capability: "simple",
  task: "把这段商机描述整理成：用户 / 痛点 / 付费意愿 / 竞品 / 风险 五个字段。",
  type: "opportunity_screening",
  agent: "opportunity",
});

// 初筛判断值得深入研究 → 显式升级到 OpenAI Research
const deep = await runAI({
  capability: "simple",
  task: "对上述商机做深度市场研究：市场规模、用户分层、竞品拆解。",
  type: "user_research",   // 任务类型会自动抬升到 research
  agent: "research",
});

// 最终决策（Examiner / 最终判断）：OpenAI Reasoning，禁止降级
const verdict = await runAI({
  capability: "reasoning",
  task: "根据用户答案与评分标准给出 0-10 分与理由。",
  type: "examiner",
  agent: "examiner",
  isFinalDecision: true,
});
```

## 路由规则

| 能力等级 | 默认 Provider | 默认 Model（环境变量可覆盖） |
| --- | --- | --- |
| simple | DeepSeek | `DEEPSEEK_MODEL`（默认 deepseek-chat） |
| research | OpenAI | `OPENAI_RESEARCH_MODEL`（默认 gpt-5.6-terra） |
| reasoning | OpenAI | `OPENAI_REASONING_MODEL`（默认 gpt-5.6-sol） |

- 自动升级：`type`（如 `user_research` → research、`examiner` → reasoning）或显式 `escalate` 会抬升能力等级
- 最终决策类任务（`final_judgment` / `examiner` / `final_report` / `strategy` / `review`）：固定 reasoning，禁止降级

## Fallback 规则

| 场景 | 行为 |
| --- | --- |
| DeepSeek 失败 | 自动 fallback 到 OpenAI Research（质量升级），`provider_degraded=true` |
| OpenAI 失败（非最终决策） | 允许低质量降级时 fallback 到 DeepSeek，`provider_degraded=true` |
| OpenAI 失败（Examiner / 最终判断 / 最终报告） | **禁止降级**，抛出 `AiGatewayError(PROVIDER_FAILED)`，不会静默降级 |
| 两个 Provider 都失败 | 抛出 `AiGatewayError(ALL_PROVIDERS_FAILED)` |

## 成本与用量

- 成本计算统一在 `usage.ts`，支持 OpenAI 与 DeepSeek，通过环境变量覆盖单价（USD / 1M tokens）
- 每次调用写入 `ai_usage`：provider / model / task / agent / inputTokens / outputTokens /
  estimatedCost / durationMs / success / createdAt（+ degraded / fallbackFrom / error）
- 本地落盘：`.data/ai_usage.jsonl`（可用 `AI_USAGE_FILE` 覆盖路径）；未来接入数据库

## 新增 Provider（扩展点）

1. 新增 `providers/xxx.ts`，实现 `ChatProvider` 接口（`chat(req)` 返回归一化内容与 token 数）
2. 在 `providers/index.ts` 注册一行
3. 在 `lib/config/ai-models.ts` 补充默认模型（模型名来自环境变量）
4. 在 `usage.ts` 补充计价

不需要修改：Router / Gateway / 业务 Agent / UI。

## 安全

- `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 只允许在服务端环境变量
- 严禁 `NEXT_PUBLIC_OPENAI_API_KEY` / `NEXT_PUBLIC_DEEPSEEK_API_KEY`
- `lib/ai` 只在服务端使用，禁止被客户端组件 import