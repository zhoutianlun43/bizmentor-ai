"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * 数据导出按钮（V0.4.1 Phase 5B 数据迁移准备）。
 * 把浏览器 localStorage 中以 bizmentor:v1: 开头的数据导出为
 * bizmentor-localstorage.json，供迁移工具写入 Supabase。
 * 纯前端功能：不读取 / 不写入服务器，不包含任何 API Key。
 */
export function ExportDataButton() {
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    const prefix = "bizmentor:v1:";
    const out: Record<string, unknown> = {};
    let count = 0;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        out[key] = JSON.parse(raw);
      } catch {
        out[key] = raw;
      }
      count += 1;
    }

    if (count === 0) {
      setMessage("没有找到需要导出的数据（未发现 bizmentor:v1: 开头的数据）。");
      return;
    }

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bizmentor-localstorage.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${count} 类数据，文件为 bizmentor-localstorage.json（已保存到下载目录）。`);
  };

  return (
    <Card className="mt-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">数据迁移</h3>
      <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        点击导出后，把下载的 <span className="font-medium text-slate-600 dark:text-slate-300">bizmentor-localstorage.json</span> 文件交给助手，即可迁移到云端数据库。
      </p>
      <Button onClick={handleExport} variant="secondary" className="w-full">
        导出数据
      </Button>
      {message && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>
      )}
    </Card>
  );
}
