"use client";
// =============================================================================
// VALVRAVE-RESONANCE: 通常イベントカード
// タイムライン上の1通常ブロックを表示する
// =============================================================================

import type { NormalBlock, ModeInferenceResult } from "@/types";
import { ModeProbBar } from "./ModeProbBar";

interface NormalEventCardProps {
  block: NormalBlock;
  index: number;
  inference: ModeInferenceResult | null;
}

function EventBadge({ text, variant = "default" }: { text: string; variant?: "cz" | "kaku" | "kess" | "at" | "default" }) {
  const styles = {
    cz:      "bg-v2-cyan-muted text-v2-cyan border border-v2-cyan/30",
    kaku:    "bg-v2-red-muted text-v2-red-50 border border-v2-red/30",
    kess:    "bg-v2-gold-muted text-v2-gold border border-v2-gold/30",
    at:      "bg-v2-purple-muted text-v2-purple-50 border border-v2-purple/30",
    default: "bg-v2-black-50 text-v2-text-secondary border border-v2-border",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${styles[variant]}`}>
      {text}
    </span>
  );
}

function getEventVariant(text: string): "cz" | "kaku" | "kess" | "at" | "default" {
  if (text.includes("CZ")) return "cz";
  if (text.includes("革命")) return "kaku";
  if (text.includes("決戦")) return "kess";
  if (text.includes("AT") || text.includes("RUSH")) return "at";
  return "default";
}

export function NormalEventCard({ block, index, inference }: NormalEventCardProps) {
  const hasDiff = block.calculatedDiff !== null;
  const diff = block.calculatedDiff ?? 0;
  const diffPositive = diff >= 0;

  return (
    <div className="bg-v2-card rounded-lg border border-v2-border overflow-hidden">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-v2-border">
        <div className="flex items-center gap-2">
          <span className="text-v2-text-muted text-xs font-mono">#{index + 1}</span>
          <span className="text-v2-text-primary text-sm font-mono font-bold">
            {block.games.toLocaleString()}G
          </span>
          {block.czGames > 0 && (
            <span className="text-v2-text-muted text-xs font-mono">
              CZ{block.czGames}G
            </span>
          )}
        </div>
        {/* 差枚スタンプ */}
        {hasDiff && (
          <span className={`text-sm font-mono font-bold ${diffPositive ? "text-v2-green" : "text-v2-red-50"}`}>
            {diffPositive ? "+" : ""}{diff.toLocaleString()}
          </span>
        )}
      </div>

      {/* 本体 */}
      <div className="px-3 py-2 space-y-1.5">
        {/* PT履歴 */}
        {block.ptHistory && (
          <div className="flex items-center gap-2">
            <span className="text-v2-text-muted text-xs font-mono w-10 shrink-0">pt</span>
            <span className="text-v2-gold text-sm font-mono tracking-wider">
              {block.ptHistory}
            </span>
            {block.weekText && (
              <span className="text-v2-text-muted text-xs font-mono">
                ({block.weekText})
              </span>
            )}
          </div>
        )}

        {/* 契機 + イベント */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {block.trigger && (
            <EventBadge text={block.trigger} />
          )}
          {block.event1 && (
            <EventBadge text={block.event1} variant={getEventVariant(block.event1)} />
          )}
          {block.event2 && (
            <EventBadge text={block.event2} variant={getEventVariant(block.event2)} />
          )}
          {block.atKey && (
            <EventBadge text={block.atKey + " 当選"} variant="at" />
          )}
        </div>

        {/* ドルシア攻防戦 */}
        {block.dolciaPhases.some(Boolean) && (
          <div className="flex gap-1 mt-1">
            {block.dolciaPhases.map((phase, i) =>
              phase ? (
                <div
                  key={i}
                  className={`text-xs font-mono px-1 py-0.5 rounded border
                    ${phase.result === "✅"
                      ? "bg-v2-green-muted border-v2-green/30 text-v2-green"
                      : "bg-v2-red-muted border-v2-red/30 text-v2-red-50"
                    }`}
                >
                  {phase.chara ? phase.chara.slice(0, 3) : `⑤`[0]}
                  {phase.result}
                </div>
              ) : null
            )}
          </div>
        )}

        {/* モード推定 (コンパクト) */}
        {inference && (
          <div className="pt-1 border-t border-v2-border">
            <ModeProbBar
              probs={inference.probabilities}
              mostLikely={inference.mostLikelyMode}
              compact
            />
          </div>
        )}

        {/* メモ */}
        {(block.memoHandwritten || block.memoAuto) && (
          <p className="text-v2-text-muted text-xs font-mono">
            📝 {block.memoHandwritten || block.memoAuto}
          </p>
        )}
      </div>
    </div>
  );
}
