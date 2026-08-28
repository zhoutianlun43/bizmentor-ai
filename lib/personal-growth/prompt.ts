/**
 * Personal AI Life CEO 系统提示（V1.0）。
 * 角色融合 7 位专家，由「人生 CEO」综合输出；输出强制结构化（卡片/表格/时间线/评分），禁止连续长文。
 */
import type { PersonalGrowthBrain } from "./types";

const CEO_IDENTITY = `你是用户的「个人 AI 人生 CEO」（Personal AI Life CEO），负责用户的长期成长，而不是商业项目。
你的职责：理解用户本人 → 设计人生战略 → 推动每日成长 → 沉淀长期认知。
你的专家委员会（意见由你综合）：
1. 心理成长专家：人格分析、思维模式、情绪分析、行为模式。
2. 人生战略顾问：5年/10年规划、人生方向设计、长期价值判断。
3. 商业财富顾问：商业能力提升、财富认知、创业能力。
4. 学习科学专家：学习目标 → 知识地图 → 训练计划 → 反馈机制。
5. 执行力教练：拖延、目标失败原因、行动力问题。
6. 健康精力顾问：睡眠、运动、精力、压力。
7. 沟通关系专家：沟通、情商、领导力。

输出规则：
1. 只输出 JSON，不要 Markdown 代码块，不要任何额外文字。
2. 禁止连续长文本；优先用卡片/表格/时间线/评分。
3. 每条文本不超过 300 字；超过则拆分。
4. 结合用户的成长档案回答；不要编造用户没有提供的信息；信息不足时先提问。
5. 主动模式：发现被忽略的问题、成长机会、潜在风险、应学能力、应改习惯时，主动指出并说明依据。`;

export function buildLifeCEOSystemPrompt(brain: PersonalGrowthBrain): string {
  const lines = [CEO_IDENTITY, ""];
  const p = brain.personality;
  if (p) {
    lines.push("用户人格档案：", `- 性格：${p.traits.join("、") || "—"}`, `- 优势：${p.strengths.join("、") || "—"}`, `- 弱点：${p.weaknesses.join("、") || "—"}`, `- 压力模式：${p.stressPatterns.join("、") || "—"}`, `- 决策方式：${p.decisionStyle || "—"}`);
  }
  const s = brain.strategy;
  if (s) lines.push("用户人生战略：", `- 价值观：${s.values.join("、") || "—"}`, `- 长期目标：${s.longTermGoal || "—"}`, `- 五年目标：${s.fiveYearGoal || "—"}`, `- 十年方向：${s.tenYearDirection || "—"}`);
  if (brain.abilities) lines.push("能力模型：", `- 当前：${brain.abilities.current.map((a) => `${a.name}(${a.current}→${a.target})`).join("、") || "—"}`, `- 待提升：${brain.abilities.toImprove.join("、") || "—"}`);
  if (brain.motivation) lines.push("动力模型：", `- 让我成长：${brain.motivation.energizes.join("、") || "—"}`, `- 让我消耗：${brain.motivation.drains.join("、") || "—"}`, `- 让我坚持：${brain.motivation.sustains.join("、") || "—"}`);
  if (brain.insights?.length) lines.push("人生洞察：", ...brain.insights.slice(-6).map((i) => `- ${i.time.slice(0, 10)} ${i.content.slice(0, 80)}`));
  if (brain.knowledge?.length) lines.push("成长知识库（最近）：", ...brain.knowledge.slice(-6).map((k) => `- [${k.category}] ${k.title}`));
  if (brain.dailyReviews?.length) {
    const last = brain.dailyReviews[brain.dailyReviews.length - 1];
    lines.push("最近复盘：", `- ${last.date}：${last.reflection.slice(0, 80)}（评分 ${last.score?.overall ?? "—"}）`);
  }
  lines.push("", "结构化输出 JSON 示例：{\"format\":\"answer|table|timeline|summary|risk|text\",\"title\":\"标题\",\"blocks\":[{\"type\":\"summary\",\"conclusion\":\"结论\",\"confidence\":0.7,\"basis\":[\"依据\"]},{\"type\":\"table\",\"headers\":[\"维度\",\"状态\"],\"rows\":[[\"执行\",\"良好\"]]},{\"type\":\"timeline\",\"phases\":[{\"phase\":\"第1月\",\"goal\":\"目标\",\"actions\":[\"动作\"],\"metric\":\"指标\"}]},{\"type\":\"risk\",\"items\":[{\"risk\":\"风险\",\"impact\":\"影响\",\"probability\":\"概率\",\"mitigation\":\"应对\"}]},{\"type\":\"text\",\"paragraphs\":[\"段落\"]}]}");
  return lines.join("\n");
}

/** 首次建模 → 《个人成长战略蓝图 V1.0》 */
export function buildBlueprintTask(answers: string[]): string {
  const stageLabels = ["人生经历", "性格与思维模式", "事业财富目标", "能力结构", "生活方式", "价值观和人生愿景"];
  const lines = answers.map((a, i) => `【${stageLabels[i]}】\n${a || "（未填写）"}`).join("\n\n");
  return `请基于用户六阶段深度访谈回答，生成《个人成长战略蓝图 V1.0》。只输出 JSON：
{
  "blueprint": {
    "sections": {
      "个人画像": "一句话综合画像",
      "核心优势": ["优势1"],
      "限制因素": ["限制1"],
      "当前人生阶段判断": "阶段判断",
      "核心成长方向": "未来12个月核心方向",
      "12个月升级路线": [{"phase":"第1-3月","goal":"目标","actions":["动作"]}]
    }
  },
  "personality": {"traits":[],"strengths":[],"weaknesses":[],"stressPatterns":[],"decisionStyle":"","summary":""},
  "strategy": {"values":[],"longTermGoal":"","fiveYearGoal":"","tenYearDirection":""},
  "abilities": {"current":[{"name":"商业能力","current":40,"target":70}],"toImprove":[]},
  "motivation": {"energizes":[],"drains":[],"sustains":[]}
}
访谈记录：\n${lines}`;
}

/** 每日复盘 → 今日深度分析 + 专家委员会 + 明日计划 + 成长评分 */
export function buildDailyReviewTask(review: { plan: string; execution: string; reflection: string; mood: string; problems: string }): string {
  return `请对用户的每日成长记录做深度分析。只输出 JSON：
{
  "deepAnalysis": "今日深度分析（发生了什么→背后原因→行为模式→心理模式，≤400字）",
  "expertBoard": [
    {"expert":"psychology","role":"心理专家","insight":"洞察"},
    {"expert":"strategy","role":"战略专家","insight":"长期影响"},
    {"expert":"execution","role":"执行教练","insight":"行动优化"},
    {"expert":"learning","role":"学习专家","insight":"能力提升"},
    {"expert":"ceo","role":"人生CEO","insight":"最终建议"}
  ],
  "tomorrowPlan": ["明日最重要3件事"],
  "score": {"overall":70,"dimensions":[{"name":"认知成长","score":70,"note":""}],"strengths":[],"weaknesses":[],"improvement":[]}
}
每日记录：
今日计划：${review.plan || "—"}
今日执行：${review.execution || "—"}
今日复盘：${review.reflection || "—"}
情绪状态：${review.mood || "—"}
遇到的问题：${review.problems || "—"}`;
}
