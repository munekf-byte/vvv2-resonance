"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時ブロック一覧
// 各カラムはセル全体を色塗り (ベタ塗り)
// 先頭列: 鉛筆マーク → 編集ダッシュボード起動
// アコーディオン: 赫眼・精神世界・招待状・前兆履歴 のみ (複数値対応)
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import { getHintText } from "@/lib/tg/suggestionColors";
import {
  getZoneCellStyle,
  getModeCellStyle,
  abbrevMode,
  getTriggerCellStyle,
  abbrevTrigger,
  getEventCellStyle,
  abbrevEvent,
  getSuggestionCellStyle,
} from "@/lib/tg/cellColors";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  blocks: NormalBlock[];
  atLabels: Map<string, string>;
  onEdit: (block: NormalBlock, index: number) => void;
  onDelete: (blockId: string) => void;
}

// ─── グリッド定義 ─────────────────────────────────────────────────────────────
// ✎ | 実G数 | ゾーン | モード | 契機 | イベント | AT | 終了示唆 | ▼
const GRID = "grid-cols-[18px_34px_30px_30px_38px_30px_28px_1fr_18px]";

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function NormalBlockList({ blocks, atLabels, onEdit, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (blocks.length === 0) {
    return (
      <div className="v2-card mx-3 p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-v2-black-50 border border-v2-border flex items-center justify-center">
          <span className="text-v2-text-muted text-xl">📋</span>
        </div>
        <p className="text-v2-text-secondary text-sm">通常時データがありません</p>
        <p className="text-v2-text-muted text-xs">下の「＋ 周期追加」で記録を始めましょう</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[340px]">

        {/* ===== 列ヘッダー ===== */}
        <div className="sticky top-[56px] z-30 bg-v2-black-100 border-y border-v2-border">
          <div className={`grid ${GRID} px-2 py-1 gap-px`}>
            {["✎", "実G", "ゾーン", "モード", "契機", "イベント", "AT", "示唆/TRP", ""].map((h, i) => (
              <span key={i} className="text-[8px] font-mono text-v2-text-muted text-center leading-tight">
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* ===== データ行 ===== */}
        <div className="divide-y divide-v2-border">
          {blocks.map((block, index) => {
            const isExpanded = expandedId === block.id;
            const atLabel    = atLabels.get(block.id);

            const suggValue = block.endingSuggestion || block.trophy;
            const suggHint  = suggValue ? getHintText(suggValue) : null;

            const hasExtras =
              block.kakugan.length > 0 ||
              block.shinsekai.length > 0 ||
              block.invitation.length > 0 ||
              block.zencho.length > 0;

            return (
              <div key={block.id} className="bg-white">

                {/* ── メイン行 ── */}
                <div className={`grid ${GRID} gap-px items-stretch`}>

                  {/* 鉛筆 → 編集 */}
                  <button
                    onClick={() => onEdit(block, index)}
                    className="flex items-center justify-center py-2 text-[11px] text-v2-text-muted hover:text-v2-red hover:bg-red-50 transition-colors"
                  >
                    ✎
                  </button>

                  {/* 実G数 */}
                  <Cell cls="bg-gray-50 text-v2-text-primary tabular-nums">
                    {block.jisshuG != null ? `${block.jisshuG}` : "—"}
                  </Cell>

                  {/* ゾーン */}
                  <Cell cls={getZoneCellStyle(block.zone)}>
                    {block.zone || "—"}
                  </Cell>

                  {/* 推定モード */}
                  <Cell cls={getModeCellStyle(block.estimatedMode)}>
                    {abbrevMode(block.estimatedMode)}
                  </Cell>

                  {/* 当選契機 */}
                  <Cell cls={getTriggerCellStyle(block.winTrigger)}>
                    {abbrevTrigger(block.winTrigger)}
                  </Cell>

                  {/* イベント */}
                  <Cell cls={getEventCellStyle(block.event)}>
                    {abbrevEvent(block.event)}
                  </Cell>

                  {/* AT */}
                  <Cell cls={atLabel ? "bg-green-700 text-white font-bold" : "bg-gray-100 text-gray-400"}>
                    {atLabel ?? "—"}
                  </Cell>

                  {/* 終了示唆 / トロフィー */}
                  <Cell cls={getSuggestionCellStyle(suggValue)}>
                    {suggHint ?? "—"}
                  </Cell>

                  {/* 展開ボタン */}
                  <button
                    onClick={() => hasExtras && setExpandedId(isExpanded ? null : block.id)}
                    className="flex items-center justify-center py-2 text-[10px] text-v2-text-muted hover:bg-v2-black-50 transition-colors"
                  >
                    {hasExtras ? (isExpanded ? "▲" : "▼") : ""}
                  </button>
                </div>

                {/* ── アコーディオン ── */}
                {isExpanded && (
                  <div className="bg-v2-black-50 border-t border-v2-border px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2.5">
                      {block.kakugan.length > 0 && (
                        <MultiField label="赫眼状態" values={block.kakugan} />
                      )}
                      {block.shinsekai.length > 0 && (
                        <MultiField label="精神世界" values={block.shinsekai} />
                      )}
                      {block.zencho.length > 0 && (
                        <MultiField label="前兆履歴" values={block.zencho} />
                      )}
                      {block.invitation.length > 0 && (
                        <MultiHintField label="招待状" values={block.invitation} />
                      )}
                      {block.endingSuggestion && block.trophy && (
                        <ExtraHintField label="トロフィー" value={block.trophy} />
                      )}
                    </div>
                    <div className="flex gap-2 justify-end border-t border-v2-border pt-2">
                      <button
                        onClick={() => onDelete(block.id)}
                        className="text-[11px] font-mono px-3 py-1 text-red-600 border border-red-200 hover:bg-red-50 rounded transition-colors"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => onEdit(block, index)}
                        className="v2-btn-secondary text-[11px] px-4 py-1"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── サブコンポーネント ───────────────────────────────────────────────────────

function Cell({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-center py-2 px-0.5 text-[9px] font-mono text-center leading-tight ${cls}`}>
      {children}
    </div>
  );
}

function MultiField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[9px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span key={i} className="text-[9px] font-mono bg-white border border-v2-border px-1 py-0.5 rounded">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function MultiHintField({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="col-span-2">
      <p className="text-[9px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => {
          const cls = getSuggestionCellStyle(v);
          const hint = getHintText(v);
          return (
            <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${cls}`}>
              {hint}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ExtraHintField({ label, value }: { label: string; value: string }) {
  const cls  = getSuggestionCellStyle(value);
  const hint = getHintText(value);
  return (
    <div>
      <p className="text-[9px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded ${cls}`}>
        {hint}
      </span>
    </div>
  );
}
