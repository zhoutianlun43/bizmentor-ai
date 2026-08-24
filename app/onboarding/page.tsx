"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { markOnboarded } from "@/components/home/OnboardingGuard";
import { getBusinessRepository, getProfileRepository } from "@/lib/repository/provider";
import type { BusinessType } from "@/lib/business/types";

const BUSINESS_TYPES: BusinessType[] = ["commerce", "service", "product", "content", "saas", "marketplace", "local_service"];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900";
const labelCls = "mt-3 block text-xs font-medium text-slate-500";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </>
  );
}

/** Onboarding（V0.6.1）：第一次访问 → 填写个人 + 经营画像 → 保存 → 生成 BusinessContext */
export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    region: "",
    language: "zh-CN",
    role: "",
    businessType: "commerce" as BusinessType,
    industry: "",
    productService: "",
    goal: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim()) {
      setError("请填写你的称呼");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await getProfileRepository().save({
        id: `profile-${Date.now()}`,
        userId: "local-user",
        name: form.name.trim(),
        timezone: form.region || "Asia/Shanghai",
        language: form.language,
        preferences: { role: form.role.trim() },
        createdAt: now,
        updatedAt: now,
      });
      await getBusinessRepository().save({
        id: `biz-${Date.now()}`,
        userId: "local-user",
        name: form.industry.trim() || "我的业务",
        description: form.productService.trim(),
        businessTypes: [form.businessType],
        preferences: { goal: form.goal.trim() },
        createdAt: now,
        updatedAt: now,
      });
      markOnboarded();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pb-8">
      <AppHeader title="欢迎使用 BizMentor" subtitle="先告诉我你是谁、做什么业务" />
      <Card className="mt-2">
        <h3 className="text-sm font-semibold">关于你</h3>
        <Field label="你的称呼" value={form.name} onChange={(v) => set("name", v)} placeholder="例如：周天伦" />
        <Field label="所在地区" value={form.region} onChange={(v) => set("region", v)} placeholder="例如：广东广州" />
        <label className={labelCls}>语言</label>
        <select className={inputCls} value={form.language} onChange={(e) => set("language", e.target.value)}>
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
        <Field label="工作身份" value={form.role} onChange={(v) => set("role", v)} placeholder="例如：创业者 / 店主 / 自由职业" />
      </Card>
      <Card className="mt-3">
        <h3 className="text-sm font-semibold">你的业务</h3>
        <label className={labelCls}>业务类型</label>
        <select className={inputCls} value={form.businessType} onChange={(e) => set("businessType", e.target.value)}>
          {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Field label="行业" value={form.industry} onChange={(v) => set("industry", v)} placeholder="例如：消费零售 / 科技服务" />
        <Field label="产品/服务" value={form.productService} onChange={(v) => set("productService", v)} placeholder="例如：你的产品或服务" />
        <Field label="你的目标" value={form.goal} onChange={(v) => set("goal", v)} placeholder="例如：三个月内验证一个新款" />
      </Card>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      <Button onClick={submit} disabled={busy} className="mt-4 w-full">{busy ? "保存中…" : "完成，开始使用"}</Button>
      <p className="mt-3 text-center text-[11px] text-slate-400">AI 会基于这些信息了解你；以后可在「我的」里修改。</p>
    </div>
  );
}