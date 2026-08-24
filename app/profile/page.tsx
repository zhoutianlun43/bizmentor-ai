"use client";
import { useEffect, useState } from "react";
import { getBusinessRepository, getProfileRepository } from "@/lib/repository/provider";
import { AppHeader } from "@/components/layout/AppHeader";
import { ExportDataButton } from "@/components/migration/ExportDataButton";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ABILITY_KEYS, ABILITY_LABELS } from "@/lib/constants";
import { mockMentorProfile } from "@/lib/data/mock/mentor";

/**
 * 我的页面：商业等级 + 能力评分。
 * V0.1 使用 mock 数据；未来由 AI 根据用户真实行为自动计算。
 */
export default function ProfilePage() {
  const profile = mockMentorProfile;
  const xpRatio = Math.min(100, Math.round((profile.xp / profile.xpToNext) * 100));
  const [business, setBusiness] = useState<string>("未设置经营");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, p] = await Promise.all([getBusinessRepository().get("local-user"), getProfileRepository().get("local-user")]);
        if (!cancelled) {
          if (b?.name) setBusiness(`${b.name}（${b.businessTypes.join("、")}）`);
          if (p?.name) setUserName(p.name);
        }
      } catch {
        // 忽略
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 pb-4">
      <AppHeader title="我的" subtitle="你的商业能力画像" />

      {/* 商业等级 */}
      <Card className="mt-2 bg-gradient-to-br from-indigo-600 to-violet-600 text-white dark:from-indigo-700 dark:to-violet-800">
        <p className="text-xs font-medium text-indigo-100">商业等级</p>
        <p className="mt-1 text-2xl font-bold">
          Lv.{profile.level} {profile.title}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={xpRatio} className="flex-1 bg-white/20" />
          <span className="text-xs font-medium tabular-nums text-indigo-100">
            {profile.xp} / {profile.xpToNext} XP
          </span>
        </div>
        <p className="mt-2 text-[11px] text-indigo-200">
          通过训练、判断与项目验证积累经验值，升级你的商业等级。
        </p>
      </Card>

      {/* V0.7.0：业务画像 + 认知入口（打通） */}
      <Card className="mt-3">
        <h3 className="text-sm font-semibold">我的业务</h3>
        <p className="mt-1 text-xs text-slate-500">{userName ? `${userName} · ` : ""}{business}</p>
        <div className="mt-2 flex gap-2">
          <a href="/onboarding" className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">完善资料</a>
          <a href="/knowledge" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">我的AI认知</a>
        </div>
      </Card>

      {/* 能力评分 */}
      <Card className="mt-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">能力评分</h3>
        <div className="space-y-3">
          {ABILITY_KEYS.map((key) => (
            <ScoreBar key={key} label={ABILITY_LABELS[key]} value={profile.abilities[key]} max={100} />
          ))}
        </div>
      </Card>

      {/* 数据迁移（V0.4.1 Phase 5B）：导出 localStorage → Supabase */}
      <ExportDataButton />

      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        V0.1 为 mock 数据。未来 AI 会根据你的训练成绩、商机判断与项目验证结果自动计算并更新能力画像。
      </p>
    </div>
  );
}
