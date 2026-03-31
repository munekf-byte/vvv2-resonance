"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時ブロック一覧
// ヘッダー: 濃色固定 / 各セルは hex inline スタイルでベタ塗り
// 示唆列: 2行表示 (キャラ名 + ヒント)
// 罫線: 全セル・全行を明確に区切る
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import {
  getZoneCellColor,
  getModeCellColor,
  abbrevMode,
  getTriggerCellColor,
  abbrevTrigger,
  getEventCellColor,
  abbrevEvent,
  getSuggestionOrTrophyColor,
  getSuggestionListLines,
  AT_WIN_COLOR,
  AT_NONE_COLOR,
  type CellColor,
} from "@/lib/tg/cellColors";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  blocks: NormalBlock[];
  atLabels: Map<string, string>;
  onEdit: (block: NormalBlock, index: number) => void;
  onDelete: (blockId: string) => void;
}

// ─── グリッド定義 ─────────────────────────────────────────────────────────────
// ✎ | 実G数 | ゾーン | モード | 契機 | イベント | AT | 示唆/TRP
const COLS = "grid-cols-[22px_34px_32px_32px_38px_30px_28px_1fr]";

// ─── ヘッダー色定義 ──────────────────────────────────────────────────────────
const HDR_BG   = "#1f2937"; // gray-800
const HDR_TEXT = "#f9fafb"; // gray-50
const ROW_BORDER = "border-b border-gray-400";
const COL_BORDER_R = "border-r border-gray-400";

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function NormalBlockList({ blocks, atLabels, onEdit, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (blocks.length === 0) {
    return (
      <div className="mx-3 mt-3 p-8 flex flex-col items-center gap-3 text-center bg-white rounded border border-gray-300">
        <span className="text-4xl">📋</span>
        <p className="text-gray-600 text-sm">通常時データがありません</p>
        <p className="text-gray-400 text-xs">下の「＋ 周期追加」で記録を始めましょう</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[340px] border border-gray-400">

        {/* ===== スティッキー列ヘッダー ===== */}
        <div
          className={`sticky top-[56px] z-30 grid ${COLS} border-b-2 border-gray-500`}
          style={{ backgroundColor: HDR_BG }}
        >
          {["✎", "実G数", "ゾーン", "モード", "契機", "イベント", "AT", "終了示唆/TRP"].map((h, i) => (
            <div
              key={i}
              style={{ color: HDR_TEXT }}
              className={`text-[8px] font-mono font-bold text-center px-0.5 py-1.5 leading-tight ${i < 7 ? COL_BORDER_R : ""}`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* ===== データ行 ===== */}
        <div>
          {blocks.map((block, index) => {
            const isExpanded = expandedId === block.id;
            const atLabel    = atLabels.get(block.id);

            const suggColor = getSuggestionOrTrophyColor(block.endingSuggestion, block.trophy);
            const suggValue = block.endingSuggestion || block.trophy;
            const suggLines = suggValue ? getSuggestionListLines(suggValue) : null;

            const hasExtras =
              block.kakugan.length > 0 ||
              block.shinsekai.length > 0 ||
              block.invitation.length > 0 ||
              block.zencho.length > 0;

            return (
              <div key={block.id} className={ROW_BORDER}>

                {/* ── メイン行 ── */}
                <div className={`grid ${COLS}`}>

                  {/* 鉛筆 → 編集 */}
                  <button
                    onClick={() => onEdit(block, index)}
                    className={`flex items-center justify-center py-2 text-[12px] text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ${COL_BORDER_R}`}
                  >
                    ✎
                  </button>

                  {/* 実G数 */}
                  <Cell color={{ backgroundColor: "#f9fafb", color: "#111827" }} borderR>
                    {block.jisshuG != null ? `${block.jisshuG}` : "—"}
                  </Cell>

                  {/* ゾーン */}
                  <Cell color={getZoneCellColor(block.zone)} borderR>
                    {block.zone || "—"}
                  </Cell>

                  {/* 推定モード */}
                  <Cell color={getModeCellColor(block.estimatedMode)} borderR>
                    {abbrevMode(block.estimatedMode)}
                  </Cell>

                  {/* 当選契機 */}
                  <Cell color={getTriggerCellColor(block.winTrigger)} borderR>
                    {abbrevTrigger(block.winTrigger)}
                  </Cell>

                  {/* イベント */}
                  <Cell color={getEventCellColor(block.event)} borderR>
                    {abbrevEvent(block.event)}
                  </Cell>

                  {/* AT */}
                  <Cell color={atLabel ? AT_WIN_COLOR : AT_NONE_COLOR} borderR>
                    <span className={atLabel ? "font-bold" : ""}>{atLabel ?? "—"}</span>
                  </Cell>

                  {/* 終了示唆 / トロフィー (2行) */}
                  <button
                    onClick={() => hasExtras && setExpandedId(isExpanded ? null : block.id)}
                    className="flex items-center justify-center py-1.5 px-1 min-h-[36px]"
                    style={suggColor}
                  >
                    {suggLines ? (
                      <span className="flex flex-col items-center leading-[1.1] text-[8px] font-mono">
                        <span className="font-bold">{suggLines.name}</span>
                        <span className="opacity-80">{suggLines.hint}</span>
                        {hasExtras && (
                          <span className="opacity-60 text-[7px] mt-0.5">{isExpanded ? "▲" : "▼"}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono opacity-50">
                        {hasExtras ? (isExpanded ? "▲" : "▼") : "—"}
                      </span>
                    )}
                  </button>
                </div>

                {/* ── アコーディオン ── */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-400 px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2.5">
                      {block.zencho.length > 0 && (
                        <MultiField label="前兆履歴" values={block.zencho} />
                      )}
                      {block.kakugan.length > 0 && (
                        <MultiColorField
                          label="赫眼"
                          values={block.kakugan}
                          color={{ backgroundColor: "#b10202", color: "#ffffff" }}
                        />
                      )}
                      {block.shinsekai.length > 0 && (
                        <MultiField label="精神世界" values={block.shinsekai} />
                      )}
                      {block.invitation.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-[9px] text-gray-500 font-mono mb-1">招待状</p>
                          <div className="flex flex-wrap gap-1">
                            {block.invitation.map((v, i) => (
                              <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end border-t border-gray-300 pt-2">
                      <button
                        onClick={() => onDelete(block.id)}
                        className="text-[11px] font-mono px-3 py-1 text-red-600 border border-red-300 hover:bg-red-50 rounded transition-colors"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => onEdit(block, index)}
                        className="text-[11px] font-mono px-4 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
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

function Cell({
  color, children, borderR = false,
}: {
  color: CellColor;
  children: React.ReactNode;
  borderR?: boolean;
}) {
  return (
    <div
      style={color}
      className={`flex items-center justify-center py-2 px-0.5 text-[9px] font-mono text-center leading-tight min-h-[36px] ${borderR ? COL_BORDER_R : ""}`}
    >
      {children}
    </div>
  );
}

function MultiField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[9px] text-gray-500 font-mono mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span key={i} className="text-[9px] font-mono bg-white border border-gray-300 px-1 py-0.5 rounded">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function MultiColorField({ label, values, color }: { label: string; values: string[]; color: CellColor }) {
  return (
    <div>
      <p className="text-[9px] text-gray-500 font-mono mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span key={i} style={color} className="text-[9px] font-mono px-1.5 py-0.5 rounded">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
