"use client";
// =============================================================================
// VALVRAVE-RESONANCE: 入力 FAB (Floating Action Button)
// 「＋通常入力」「＋ATラウンド」をトグル展開で切り替え
// =============================================================================

import { useState } from "react";
import { Plus, X, AlignLeft, Zap } from "lucide-react";
import { useSessionStore, selectATEntries } from "@/store/useSessionStore";
import { NormalEventModal } from "./NormalEventModal";
import { ATRoundModal } from "./ATRoundModal";

export function InputFAB() {
  const [expanded, setExpanded] = useState(false);
  const [normalOpen, setNormalOpen] = useState(false);
  const [atOpen, setAtOpen] = useState(false);

  const atEntries = useSessionStore(selectATEntries);
  const hasAT = atEntries.length > 0;

  const openNormal = () => {
    setExpanded(false);
    setNormalOpen(true);
  };

  const openAT = () => {
    setExpanded(false);
    setAtOpen(true);
  };

  return (
    <>
      {/* 展開時のオーバーレイ */}
      {expanded && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* サブボタン群 (展開時) */}
        {expanded && (
          <div className="flex flex-col items-end gap-2 mb-1">
            {/* ATラウンド入力 */}
            {hasAT && (
              <button
                type="button"
                onClick={openAT}
                className="
                  flex items-center gap-2
                  bg-v2-purple hover:bg-v2-purple-200 active:bg-v2-purple-400
                  text-white font-mono font-bold text-sm
                  pl-3 pr-4 py-2.5 rounded-full
                  shadow-lg shadow-v2-purple-muted/50
                  transition-all duration-150 active:scale-95
                "
              >
                <Zap size={16} strokeWidth={2.5} />
                <span>ATラウンド</span>
              </button>
            )}

            {/* 通常イベント入力 */}
            <button
              type="button"
              onClick={openNormal}
              className="
                flex items-center gap-2
                bg-v2-red hover:bg-v2-red-200 active:bg-v2-red-400
                text-white font-mono font-bold text-sm
                pl-3 pr-4 py-2.5 rounded-full
                shadow-lg shadow-v2-red-muted/50
                transition-all duration-150 active:scale-95
              "
            >
              <AlignLeft size={16} strokeWidth={2.5} />
              <span>通常入力</span>
            </button>
          </div>
        )}

        {/* メイン FAB */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label="入力メニューを開く"
          className={`
            w-14 h-14 rounded-full flex items-center justify-center
            font-mono font-bold
            shadow-lg
            transition-all duration-200 active:scale-90
            ${expanded
              ? "bg-v2-black-50 border border-v2-border text-v2-text-secondary rotate-45"
              : "bg-v2-red hover:bg-v2-red-200 text-white animate-pulse-red shadow-v2-red-muted/50"
            }
          `}
        >
          {expanded ? <X size={22} /> : <Plus size={26} strokeWidth={2.5} />}
        </button>
      </div>

      {/* モーダル */}
      <NormalEventModal
        isOpen={normalOpen}
        onClose={() => setNormalOpen(false)}
      />
      <ATRoundModal
        isOpen={atOpen}
        onClose={() => setAtOpen(false)}
      />
    </>
  );
}
