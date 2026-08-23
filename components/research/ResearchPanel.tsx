"use client";

import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/FormField";
import { ResearchProgress } from "./ResearchProgress";
import { ResearchReportView } from "./ResearchReportView";
import { ResearchService, LocalResearchRepository, createApiRunAi, createExternalResearchApi } from "@/lib/research";
import type { ResearchRun, StageRun } from "@/lib/research";
import type { Opportunity } from "@/lib/types";

interface ResearchPanelProps {
  opportunity: Opportunity;
  /** 已存在的研究运行（由页面通过 repository 读取） */
  run?: ResearchRun | undefined;
}

/** 商机研究面板：开始研究 / 阶段进度 / 结构化报告 */
export function ResearchPanel({ opportunity, run }: ResearchPanelProps) {
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageRun[]>([]);
  const [materials, setMaterials] = useState("");
  const [error, setError] = useState("");

  async function handleStart() {
    if (running) return;
    setRunning(true);
    setError("");
    setStages([]);
    const service = new ResearchService({
      repository: new LocalResearchRepository(),
      runAi: createApiRunAi(),
      externalResearch: createExternalResearchApi(),
    });
    try {
      await service.startResearch(
        {
          opportunity: {
            id: opportunity.id,
            name: opportunity.name,
            description: opportunity.description,
            notes: opportunity.notes,
          },
          materials: materials.trim()
            ? [{ id: "user-material-1", title: "用户补充资料", content: materials.trim() }]
            : [],
        },
        (stage) => setStages((prev) => [...prev, stage]),
      );
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) ?? "研究失败");
    } finally {
      setRunning(false);
    }
  }

  if (run) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">AI 研究报告</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStart}
            disabled={running}
          >
            <RefreshCw className="size-3.5" />
            重新研究
          </Button>
        </div>
        <ResearchReportView run={run} />
      </div>
    );
  }

  return (
    <Card className="mt-3">
      <div className="flex items-center gap-2">
        <Play className="size-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">商机研究</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        点击开始后，BizMentor 将执行：商机分析 → 研究规划 → 研究执行 → 综合 → 评分 → 验证方案 → 最终报告。
        当前无外部搜索能力，缺少外部证据的结论会明确标注「需验证」，不会被写成事实。
      </p>

      {running ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <ResearchProgress stages={stages} />
        </div>
      ) : (
        <>
          <TextArea
            label="补充资料（可选）"
            id="research-materials"
            placeholder="粘贴你已有的资料：行业报告、竞品信息、用户访谈记录等。这些是唯一可被标记为「事实」的来源。"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            className="mt-3 min-h-20"
          />
          <Button type="button" className="mt-3 w-full" onClick={handleStart}>
            <Play className="size-4" />
            开始 AI 研究
          </Button>
        </>
      )}

      {error ? (
        <p className="mt-3 text-xs text-rose-500" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}