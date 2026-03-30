"use client";
// =============================================================================
// VALVRAVE-RESONANCE: Sticky ヘッダー
// 現在の差枚数とモード推定確率をリアルタイム表示
// =============================================================================

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSessionStore, selectTotalDiff, selectLatestModeInference } from "@/store/useSessionStore";
import { ModeProbBar } from "./ModeProbBar";

interface StickyHeaderProps {
  sessionId: string;
}

export function StickyHeader({ sessionId }: StickyHeaderProps) {
  const totalDiff = useSessionStore(selectTotalDiff);
  const inference = useSessionStore(selectLatestModeInference);
  const isLoading = useSessionStore((s) => s.isLoading);
  const summary = useSessionStore((s) => s.session?.summary);

  const diffPositive = totalDiff >= 0;
  const diffColor = diffPositive ? "text-v2-green" : "text-v2-red-50";

  return (
    <header className="sticky top-0 z-40 bg-v2-black/95 backdrop-blur-sm border-b border-v2-border">
      <div className="px-3 pt-2 pb-2">
        {/* 上段: 戻るボタン + セッションID */}
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="text-v2-text-muted hover:text-v2-text-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-v2-text-muted text-xs font-mono truncate">
            {sessionId.slice(0, 8)}…
          </span>
          {isLoading && (
            <span className="ml-auto text-v2-text-muted text-xs font-mono animate-pulse">
              計算中…
            </span>
          )}
        </div>

        {/* 中段: 差枚 (大きく表示) */}
        <div className="flex items-end gap-3 mb-2">
          <div>
            <p className="text-v2-text-muted text-xs font-mono leading-none mb-0.5">
              差枚
            </p>
            <p className={`text-3xl font-mono font-bold leading-none ${diffColor}`}>
              {diffPositive ? "+" : ""}{totalDiff.toLocaleString()}
            </p>
          </div>
          {summary && (
            <div className="flex gap-3 mb-0.5">
              <div className="text-center">
                <p className="text-v2-text-muted text-xs font-mono leading-none">総G</p>
                <p className="text-v2-text-secondary text-sm font-mono font-bold">
                  {summary.totalGames.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-v2-text-muted text-xs font-mono leading-none">AT</p>
                <p className="text-v2-text-secondary text-sm font-mono font-bold">
                  {summary.atCount}
                </p>
              </div>
              <div className="text-center">
                <p className="text-v2-text-muted text-xs font-mono leading-none">CZ</p>
                <p className="text-v2-text-secondary text-sm font-mono font-bold">
                  {summary.czCount}/{summary.czSuccessCount}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 下段: モード推定確率 */}
        {inference ? (
          <ModeProbBar
            probs={inference.probabilities}
            mostLikely={inference.mostLikelyMode}
          />
        ) : (
          <div className="h-2 rounded-full bg-v2-black-50 flex items-center px-2">
            <span className="text-v2-text-muted text-xs font-mono">
              データなし — 最初のイベントを入力してください
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
