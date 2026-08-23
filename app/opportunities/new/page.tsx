"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextArea, TextField } from "@/components/ui/FormField";
import { addOpportunity } from "@/lib/store/opportunity-store";
import type { OpportunitySource } from "@/lib/types";

/** 新增商机：V0.1 保存到本地 mock 数据（localStorage），未来接入 Supabase */
export default function NewOpportunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<OpportunitySource>("user");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError("请填写商机名称与一句话描述");
      return;
    }
    addOpportunity({ name, description, source, notes });
    router.push("/opportunities");
  }

  return (
    <div className="px-5 pb-4">
      <AppHeader title="新增商机" subtitle="记录你发现的机会" />

      <form onSubmit={handleSubmit} className="mt-2 space-y-4">
        <Card className="space-y-4">
          <TextField
            label="商机名称"
            id="opportunity-name"
            placeholder="例如：AI × 电商运营自动化"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
          />
          <TextArea
            label="一句话描述"
            id="opportunity-description"
            placeholder="用一句话说明这个商机解决什么问题、面向谁"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={200}
          />
          <SelectField
            label="来源"
            id="opportunity-source"
            value={source}
            onChange={(e) => setSource(e.target.value as OpportunitySource)}
          >
            <option value="user">我发现的</option>
            <option value="ai">AI发现</option>
          </SelectField>
          <TextArea
            label="备注（可选）"
            id="opportunity-notes"
            placeholder="补充背景、想法或待验证的假设"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />

          {error ? (
            <p className="text-sm text-rose-500" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => router.back()}
            >
              取消
            </Button>
            <Button type="submit" className="flex-1">
              保存商机
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          当前保存到本地浏览器（V0.1），未来将同步到云端数据库。
        </p>
      </form>
    </div>
  );
}