"use client";
// =============================================================================
// VALVRAVE-RESONANCE: ATセッションカード (ブラッシュアップ版)
// アコーディオン形式 + タイムラインライン + ピーク差枚スタンプ
// =============================================================================

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { ATEntry, ATRound } from "@/types";
import { CUT_FLAG_ED } from "@/lib/engine/constants";

interface ATSessionCardProps {
  entry: ATEntry;
}

// ラウンドの「派手さ」に応じたバッジ色
function getRoundAccent(roundType: string) {
  const g = parseInt(roundType.replace(/[^0-9]/g, ""), 10) || 0;
  if (roundType === "究極") return { line: "bg-v2-gold",    text: "text-v2-gold",    bg: "bg-v2-gold-muted",    border: "border-v2-gold/40"    };
  if (g >= 200)             return { line: "bg-v2-gold",    text: "text-v2-gold",    bg: "bg-v2-gold-muted",    border: "border-v2-gold/40"    };
  if (g >= 100)             return { line: "bg-v2-purple-50", text: "text-v2-purple-50", bg: "bg-v2-purple-muted", border: "border-v2-purple/40" };
  if (g >= 50)              return { line: "bg-v2-cyan",    text: "text-v2-cyan",    bg: "bg-v2-cyan-muted",    border: "border-v2-cyan/40"    };
  return                           { line: "bg-v2-text-muted", text: "text-v2-text-muted", bg: "bg-v2-black-50", border: "border-v2-border" };
}

function RoundTimeline({ rounds }: { rounds: ATRound[] }) {
  if (rounds.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-v2-text-muted text-xs font-mono">
        ラウンドなし — 右下の＋からATラウンドを追加
      </div>
    );
  }

  // ピーク差枚を計算 (rounds の中で最大の calculatedDiff)
  const peakDiff = rounds.reduce((peak, r) => {
    if (r.calculatedDiff === null) return peak;
    return Math.max(peak, r.calculatedDiff);
  }, -Infinity);

  return (
    <div className="px-3 pb-3">
      {rounds.map((round, i) => {
        const accent = getRoundAccent(round.roundType);
        const diff = round.calculatedDiff;
        const diffPositive = (diff ?? 0) >= 0;
        const isPeak = diff !== null && diff === peakDiff;
        const isED = round.cutFlag === CUT_FLAG_ED;
        const isLast = i === rounds.length - 1;

        return (
          <div key={round.id} className="flex gap-0">
            {/* タイムラインライン列 */}
            <div className="flex flex-col items-center w-8 shrink-0 pt-1">
              {/* ドット */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.line}`} />
              {/* 縦線 (最後以外) */}
              {!isLast && (
                <div className="w-px flex-1 mt-0.5 bg-v2-border min-h-[20px]" />
              )}
            </div>

            {/* ラウンド内容 */}
            <div className={`flex-1 ml-2 mb-${isLast ? "0" : "2"}`}>
              <div className={`
                flex items-center justify-between
                rounded-lg px-3 py-2.5 border
                ${isPeak ? `${accent.bg} ${accent.border}` : "bg-v2-black-50 border-v2-border"}
              `}>
                {/* 左: R番号 + 種別 + フラグ */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-v2-text-muted text-xs font-mono shrink-0">
                    R{i + 1}
                  </span>
                  <span className={`font-mono font-bold text-sm ${accent.text}`}>
                    {round.roundType}
                  </span>

                  {/* 道中乗せ */}
                  {round.midBonusGames > 0 && (
                    <span className="text-v2-cyan text-xs font-mono bg-v2-cyan-muted px-1.5 py-0.5 rounded">
                      +{round.midBonusGames}G
                    </span>
                  )}

                  {/* 引戻し */}
                  {round.returnGames > 0 && (
                    <span className="text-v2-gold text-xs font-mono bg-v2-gold-muted px-1.5 py-0.5 rounded">
                      戻{round.returnGames}G
                    </span>
                  )}

                  {/* ED */}
                  {isED && (
                    <span className="text-v2-red-50 text-xs font-mono bg-v2-red-muted px-1.5 py-0.5 rounded border border-v2-red/30">
                      ED
                    </span>
                  )}

                  {/* ピーク */}
                  {isPeak && diff !== null && (
                    <span className="text-v2-gold text-xs font-mono">⚡PEAK</span>
                  )}
                </div>

                {/* 右: 差枚スタンプ */}
                {diff !== null && (
                  <span className={`
                    font-mono font-bold text-sm shrink-0 ml-2 tabular-nums
                    ${diffPositive ? "text-v2-green" : "text-v2-red-50"}
                    ${isPeak ? "text-base" : ""}
                  `}>
                    {diffPositive ? "+" : ""}{diff.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ATSessionCard({ entry }: ATSessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rounds = entry.rounds;

  // サマリー計算
  const totalRounds = rounds.length;
  const finalDiff = totalRounds > 0
    ? rounds[totalRounds - 1].calculatedDiff
    : null;
  const finalDiffPositive = (finalDiff ?? 0) >= 0;

  // 最大R種別ゲーム数 (ハイライト用)
  const maxGames = rounds.reduce((max, r) => {
    const g = parseInt(r.roundType.replace(/[^0-9]/g, ""), 10) || 0;
    return Math.max(max, g);
  }, 0);

  // ステータスバー: ラウンド種別の分布をミニバーで表示
  const roundBars = rounds.slice(0, 20).map((r) => {
    const accent = getRoundAccent(r.roundType);
    return accent.line;
  });

  return (
    <div className="bg-v2-purple-bg rounded-xl border border-v2-purple-muted overflow-hidden">
      {/* ヘッダー (タップでアコーディオン) */}
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          {/* 左: ATキー + ラウンド数 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-v2-purple/20 border border-v2-purple/40">
              <Zap size={14} className="text-v2-purple-50" />
            </div>
            <div>
              <span className="text-v2-purple-50 font-mono font-bold text-base">
                {entry.atKey}
              </span>
              <span className="text-v2-text-muted text-xs font-mono ml-1.5">
                {totalRounds}R
                {maxGames > 0 && (
                  <span className="ml-1 text-v2-gold">
                    MAX{maxGames}G
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 右: 最終差枚 + 展開アイコン */}
          <div className="flex items-center gap-2">
            {finalDiff !== null && (
              <span className={`font-mono font-bold text-base tabular-nums ${finalDiffPositive ? "text-v2-green" : "text-v2-red-50"}`}>
                {finalDiffPositive ? "+" : ""}{finalDiff.toLocaleString()}
              </span>
            )}
            <div className="text-v2-text-muted ml-1">
              {expanded
                ? <ChevronUp size={15} />
                : <ChevronDown size={15} />
              }
            </div>
          </div>
        </div>

        {/* ラウンドミニバー */}
        {roundBars.length > 0 && (
          <div className="flex gap-0.5 px-3 pb-2.5">
            {roundBars.map((colorCls, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${colorCls}`}
              />
            ))}
          </div>
        )}
      </button>

      {/* アコーディオン: ラウンドタイムライン */}
      {expanded && (
        <div className="border-t border-v2-purple-muted pt-2">
          <RoundTimeline rounds={rounds} />
        </div>
      )}
    </div>
  );
}
