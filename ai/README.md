# /ai — 未来 AI 客户端 / Prompts / 模型配置预留目录

- `client/`  OpenAI SDK 客户端封装（仅服务端）
- `prompts/` 提示词版本管理
- `models/`  模型路由与配置（参考 `lib/config/ai-models.ts`）

安全要求：API Key 只允许存在服务器环境变量；禁止 `NEXT_PUBLIC_OPENAI_API_KEY`。