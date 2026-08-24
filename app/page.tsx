"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TodayBriefing } from "@/components/home/TodayBriefing";
import { DailyAssistant } from "@/components/home/DailyAssistant";
import { AbilityOverviewCard } from "@/components/home/AbilityOverviewCard";
import { CurrentProjectCard } from "@/components/home/CurrentProjectCard";
import { DailyOpportunityCard } from "@/components/home/DailyOpportunityCard";
import { DailyTrainingCard } from "@/components/home/DailyTrainingCard";
import { mockMentorProfile } from "@/lib/data/mock/mentor";
import { mockOpportunities } from "@/lib/data/mock/opportunities";
import { mockProjects } from "@/lib/data/mock/projects";
import { mockTrainingQuestions } from "@/lib/data/mock/training";
import { useOpportunities } from "@/lib/opportunity/hooks/use-opportunities";
import { getGreeting } from "@/lib/utils/format";
import type { Opportunity, Project, TrainingQuestion } from "@/lib/types";

/** 从 mock 数据中选出「今日商机 / 今日训练 / 当前项目」作为服务端渲染兜底 */
function pickFallbacks(): {
  dailyOpportunity: Opportunity;
  dailyTraining: TrainingQuestion;
  currentProject: Project;
} {
  const topMock =
    [...mockOpportunities]
      .filter((o) => o.score)
      .sort((a, b) => (b.score!.overall ?? 0) - (a.score!.overall ?? 0))[0] ??
    mockOpportunities[0];
  return {
    dailyOpportunity: topMock,
    dailyTraining:
      mockTrainingQuestions.find((q) => q.id === "t-case-membership") ??
      mockTrainingQuestions[0],
    currentProject: mockProjects[0],
  };
}

/** 挑选评分最高的商机作为「今日机会」 */
function pickTopOpportunity(list: Opportunity[]): Opportunity {
  return (
    [...list]
      .filter((o) => o.score)
      .sort((a, b) => (b.score!.overall ?? 0) - (a.score!.overall ?? 0))[0] ??
    list[0]
  );
}

export default function HomePage() {
  // 服务端/首次渲染用 mock 兜底；hydration 后自动切换为本地真实数据
  const { opportunities } = useOpportunities();
  const fallbacks = pickFallbacks();
  const dailyOpportunity =
    opportunities.length > 0 ? pickTopOpportunity(opportunities) : fallbacks.dailyOpportunity;

  // 问候语按当前时间计算：服务端/首次渲染用固定占位（不换行空格，保持头部高度），
  // mounted 后再按当前时间更新，避免 hydration mismatch（React error #418）
  const [greeting, setGreeting] = useState("\u00A0");
  useEffect(() => {
    // 挂载后（异步回调）再按当前时间计算，避免 hydration mismatch（React #418）
    // 与 react-hooks/set-state-in-effect 规则兼容（不在 effect 内同步 setState）
    const t = setTimeout(() => setGreeting(getGreeting()), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6 px-5 pb-4">
      <AppHeader title="BizMentor AI" subtitle={greeting} />

      {/* V0.6.0 MVP：今日经营状态 + 产品入口 */}
      <DailyAssistant />
      <TodayBriefing />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href="/chat" className="rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-xs font-medium text-white">问 AI</a>
        <a href="/skills" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">技能中心</a>
        <a href="/knowledge" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">我的AI认知</a>
      </div>

      <section aria-label="今日商业机会">
        <DailyOpportunityCard opportunity={dailyOpportunity} />
      </section>

      <section aria-label="今日商业训练">
        <DailyTrainingCard question={fallbacks.dailyTraining} />
      </section>

      <section aria-label="当前项目">
        <CurrentProjectCard project={fallbacks.currentProject} />
      </section>

      <section aria-label="商业能力概览">
        <AbilityOverviewCard abilities={mockMentorProfile.abilities} />
      </section>
    </div>
  );
}