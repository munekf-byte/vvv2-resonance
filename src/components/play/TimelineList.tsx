"use client";
// =============================================================================
// VALVRAVE-RESONANCE: タイムラインリスト
// 最新イベントが一番上の逆時系列表示
// normalBlocks + atEntries を interleave して表示
// =============================================================================

import { useSessionStore, selectNormalBlocks, selectATEntries } from "@/store/useSessionStore";
import { NormalEventCard } from "./NormalEventCard";
import { ATSessionCard } from "./ATSessionCard";
import type { NormalBlock, ATEntry, ModeInferenceResult } from "@/types";

type TimelineItem =
  | { type: "normal"; block: NormalBlock; index: number; inference: ModeInferenceResult | null }
  | { type: "at"; entry: ATEntry };

export function TimelineList() {
  const normalBlocks = useSessionStore(selectNormalBlocks);
  const atEntries = useSessionStore(selectATEntries);
  const modeInferences = useSessionStore((s) => s.session?.modeInferences ?? []);

  // 逆時系列: 最新のブロックが先頭
  // ブロックN → ATEntry(N) → ブロックN-1 → ATEntry(N-1) → ...
  const items: TimelineItem[] = [];
  for (let i = normalBlocks.length - 1; i >= 0; i--) {
    const block = normalBlocks[i];
    const inference = (modeInferences[i] as ModeInferenceResult | null) ?? null;

    // AT エントリ (このブロックで当選したAT) を先に表示
    if (block.atKey) {
      const entry = atEntries.find((e) => e.atKey === block.atKey);
      if (entry) {
        items.push({ type: "at", entry });
      }
    }
    items.push({ type: "normal", block, index: i, inference });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="text-v2-text-muted text-sm font-mono text-center">
          データがありません
        </p>
        <p className="text-v2-text-muted text-xs font-mono text-center mt-1 opacity-60">
          右下の ＋ ボタンから通常イベントを入力してください
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-2">
      {items.map((item, idx) => {
        if (item.type === "at") {
          return (
            <ATSessionCard
              key={`at-${item.entry.atKey}`}
              entry={item.entry}
            />
          );
        }
        return (
          <NormalEventCard
            key={`normal-${item.block.id}`}
            block={item.block}
            index={item.index}
            inference={item.inference}
          />
        );
      })}
    </div>
  );
}
