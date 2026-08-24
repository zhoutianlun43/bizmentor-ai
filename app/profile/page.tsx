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
