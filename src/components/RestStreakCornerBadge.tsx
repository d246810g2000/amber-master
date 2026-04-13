import React from "react";
import { cn } from "../lib/utils";

/** 連續未上場：右上角扇形標（與父層 overflow-hidden + rounded 裁切搭配） */
export function RestStreakCornerBadge({
  count,
  /** 與父卡片 rounded-xl / rounded-2xl 一致，否則僅 rounded-bl-full 時外緣仍是直角，看起來像 90° */
  cardCorner = "2xl",
}: {
  count: number;
  cardCorner?: "xl" | "2xl";
}) {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-[35] flex h-[22px] w-[22px] items-center justify-center p-0.5 md:h-6 md:w-6 md:p-1",
        "rounded-bl-full",
        cardCorner === "xl" ? "rounded-tr-xl" : "rounded-tr-2xl",
        /* 勿用 backdrop-blur／ring：在 button + overflow 裁切下 WebKit 常會把角標畫出圓角外，看起來像直角戳出場地 */
        "bg-slate-800/92 dark:bg-slate-950/88",
        "text-[6px] font-bold leading-none tabular-nums tracking-tight text-white antialiased md:text-[6.5px]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
      )}
      title={`連續 ${count} 場比賽未上場`}
    >
      <span className="inline-block translate-x-0.5 -translate-y-0.5">
        休{count}
      </span>
    </div>
  );
}
