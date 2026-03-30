"use client";
// =============================================================================
// VALVRAVE-RESONANCE: モード確率バー (A/B/C/H)
// =============================================================================

import type { ModeProbabilities } from "@/types";

interface ModeProbBarProps {
  probs: ModeProbabilities;
  mostLikely: "A" | "B" | "C" | "H";
  compact?: boolean;
}

const MODE_CONFIG = {
  A: { label: "A", color: "bg-blue-500",   textColor: "text-blue-400",   border: "border-blue-500/40" },
  B: { label: "B", color: "bg-v2-green",   textColor: "text-v2-green",   border: "border-v2-green/40" },
  C: { label: "C", color: "bg-v2-purple",  textColor: "text-v2-purple-50", border: "border-v2-purple/40" },
  H: { label: "H", color: "bg-v2-gold",    textColor: "text-v2-gold",    border: "border-v2-gold/40" },
} as const;

export function ModeProbBar({ probs, mostLikely, compact = false }: ModeProbBarProps) {
  const modes = (["A", "B", "C", "H"] as const);

  if (compact) {
    return (
      <div className="flex gap-1.5 items-center">
        {modes.map((m) => {
          const cfg = MODE_CONFIG[m];
          const pct = Math.round(probs[m] * 100);
          const isTop = m === mostLikely;
          return (
            <div
              key={m}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border
                ${isTop ? `${cfg.border} bg-black/60` : "border-transparent bg-black/20"}
              `}
            >
              <span className={`${cfg.textColor} font-bold ${isTop ? "text-sm" : ""}`}>
                {m}
              </span>
              <span className={isTop ? "text-v2-text-primary" : "text-v2-text-muted"}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* 積み上げバー */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {modes.map((m) => {
          const pct = probs[m] * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={m}
              className={`${MODE_CONFIG[m].color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      {/* 数値表示 */}
      <div className="flex gap-2">
        {modes.map((m) => {
          const cfg = MODE_CONFIG[m];
          const pct = Math.round(probs[m] * 100);
          const isTop = m === mostLikely;
          return (
            <div key={m} className="flex items-center gap-0.5">
              <span className={`text-xs font-mono font-bold ${cfg.textColor}`}>{m}</span>
              <span className={`text-xs font-mono ${isTop ? "text-v2-text-primary font-bold" : "text-v2-text-muted"}`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
