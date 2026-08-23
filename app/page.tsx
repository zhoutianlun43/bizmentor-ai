"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AbilityOverviewCard } from "@/components/home/AbilityOverviewCard";
import { CurrentProjectCard } from "@/components/home/CurrentProjectCard";
import { DailyOpportunityCard } from "@/components/home/DailyOpportunityCard";
import { DailyTrainingCard } from "@/components/home/DailyTrainingCard";
import { useLocalData } from "@/lib/hooks/use-local-data";
import { mockMentorProfile } from "@/lib/data/mock/mentor";
import { mockOpportunities } from "@/lib/data/mock/opportunities";
import { mockProjects } from "@/lib/data/mock/projects";
import { mockTrainingQuestions } from "@/lib/data/mock/training";
import { loadOpportunities } from "@/lib/store/opportunity-store";
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
  const opportunities = useLocalData(loadOpportunities, mockOpportunities);
  const fallbacks = pickFallbacks();
  const dailyOpportunity =
    opportunities.length > 0 ? pickTopOpportunity(opportunities) : fallbacks.dailyOpportunity;

  return (
    <div className="space-y-6 px-5 pb-4">
      <AppHeader title="BizMentor AI" subtitle={getGreeting()} />

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