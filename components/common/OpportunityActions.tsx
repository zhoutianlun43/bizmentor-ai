/**
 * 统一商机操作（V1.x）：收藏/取消收藏/删除（软删+确认弹窗）+ AI 生命周期动作。
 * 任意来源商机（manual_create / ai_radar）共享；父组件负责执行动作与刷新。
 */
import { Ban, Bookmark, BookmarkCheck, Rocket, Sparkles, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import type { Opportunity } from "@/lib/types";
import type { PoolAction } from "@/lib/radar/pool-service";

interface Props {
  opportunity: Opportunity;
  busy?: boolean;
  /** 动作回调（父组件执行状态更新/跳转） */
  onAction?: (action: PoolAction, id: string) => void;
}

/** 统一操作按钮组：收藏 / 开始研究 / 推进 / 放弃 / 删除（软删） */
export function OpportunityActions({ opportunity, busy, onAction }: Props) {
  const router = useRouter();
  const status = opportunity.opportunityStatus ?? "discovered";
  const favorite = opportunity.isFavorite === true;
  const act = (a: PoolAction) => onAction?.(a, opportunity.id);

  function handleFavorite() {
    act(favorite ? "unfavorite" : "favorite");
  }

  function handleDelete() {
    if (!window.confirm("确定删除该商业机会？\n删除后：该项目不会出现在默认列表，但历史数据仍会保留。")) return;
    act("delete");
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Button size="sm" variant={favorite ? "secondary" : "ghost"} className="flex-1" disabled={busy} onClick={handleFavorite}>
        {favorite ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
        {favorite ? "已收藏" : "收藏"}
      </Button>
      <Button size="sm" variant="ghost" className="flex-1" disabled={busy} onClick={handleDelete}>
        <Trash2 className="size-3.5" />
        删除
      </Button>

      {opportunity.source === "ai" && status !== "deleted" && (
        <>
          {(status === "discovered" || status === "favorite") && (
            <>
              <Button size="sm" className="flex-1" disabled={busy} onClick={() => act("research")}><Sparkles className="size-3.5" />开始深度研究</Button>
              <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => act("promote")}><Rocket className="size-3.5" />推进</Button>
            </>
          )}
          {status === "researching" && (
            <Button size="sm" className="flex-1" onClick={() => router.push(`/opportunities/${opportunity.id}`)}><Sparkles className="size-3.5" />查看研究</Button>
          )}
          {status === "promoting" && (
            <>
              <Button size="sm" className="flex-1" onClick={() => router.push(`/opportunities/${opportunity.id}?tab=decision`)}><Zap className="size-3.5" />进入创业执行决策</Button>
              <Button size="sm" variant="ghost" className="flex-1" disabled={busy} onClick={() => act("reject")}><Ban className="size-3.5" />归档/放弃</Button>
            </>
          )}
          {status === "rejected" && (
            <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => act("restore")}>重新开启</Button>
          )}
        </>
      )}
    </div>
  );
}
