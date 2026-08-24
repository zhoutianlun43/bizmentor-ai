"use client";

import { useEffect, useState } from "react";
import { getBusinessRepository, getProfileRepository } from "@/lib/repository/provider";

/** 顶部用户状态条（V0.7.0 App Shell）：显示用户/经营名 */
export function UserStatusBar() {
  const [label, setLabel] = useState("BizMentor");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, b] = await Promise.all([
          getProfileRepository().get("local-user"),
          getBusinessRepository().get("local-user"),
        ]);
        if (!cancelled) {
          if (p?.name && b?.name) setLabel(`${p.name} · ${b.name}`);
          else if (p?.name) setLabel(p.name);
          else if (b?.name) setLabel(b.name);
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
    <div className="flex items-center justify-between px-5 pt-3">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <a href="/onboarding" className="text-[11px] text-indigo-500">完善资料</a>
    </div>
  );
}