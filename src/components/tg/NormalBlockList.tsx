"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時ブロック一覧 (アコーディオン)
// 表示ルール: 終了画面示唆・トロフィー・招待状 は " - " 以降のみ表示
// AT番号: atWin=true ブロックを順番にカウントし AT1/AT2... を自動付与
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import { getSuggestionColors, getHintText } from "@/lib/tg/suggestionColors";

interface Props {
  blocks: NormalBlock[];
  /** blockId → "AT1" | "AT2" ... (PlayClientPage で計算済み) */
  atLabels: Map<string, string>;
  onEdit: (block: NormalBlock) => void;
  onDelete: (blockId: string) => void;
}

export function NormalBlockList({ blocks, atLabels, onEdit, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (blocks.length === 0) {
    return (
      <div className="v2-card p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-v2-black-50 border border-v2-border flex items-center justify-center">
          <span className="text-v2-text-muted text-xl">📋</span>
        </div>
        <p className="text-v2-text-secondary text-sm">通常時データがありません</p>
        <p className="text-v2-text-muted text-xs">下の「＋ 周期追加」で記録を始めましょう</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        const isExpanded = expandedId === block.id;
        const atLabel = atLabels.get(block.id); // "AT1" | "AT2" | undefined
        const cycleNum = index + 1;

        // 折りたたみ時のプレビュー用: 終了画面示唆 or トロフィー のヒント
        const previewSuggestion = block.endingSuggestion || block.trophy;
        const previewColors = previewSuggestion ? getSuggestionColors(previewSuggestion) : null;
        const previewHint   = previewSuggestion ? getHintText(previewSuggestion) : null;

        return (
          <div key={block.id} className="v2-card overflow-hidden">
            {/* ===== 行ヘッダー (タップで展開) ===== */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : block.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-v2-black-50"
            >
              {/* 周期番号 */}
              <span className="w-8 h-8 rounded-full bg-v2-black-100 border border-v2-border flex items-center justify-center text-xs font-mono font-bold text-v2-text-secondary flex-shrink-0">
                {cycleNum}
              </span>

              {/* メイン情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-bold text-v2-text-primary">
                    {block.zone || "未入力"}
                  </span>
                  {block.jisshuG != null && (
                    <span className="text-xs text-v2-text-muted font-mono">
                      {block.jisshuG}G
                    </span>
                  )}
                  {/* 折りたたみ時: 終了画面示唆ヒントバッジ */}
                  {!isExpanded && previewColors && previewHint && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${previewColors.bg} ${previewColors.text}`}>
                      {previewHint}
                    </span>
                  )}
                </div>
                {/* 当選契機 サブライン */}
                {block.winTrigger && block.winTrigger !== "不明" && (
                  <p className="text-[10px] text-v2-text-muted font-mono mt-0.5 truncate">
                    {block.winTrigger}
                  </p>
                )}
              </div>

              {/* AT バッジ (緑 = AT当選) */}
              {atLabel && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-mono font-bold bg-green-700 text-white">
                  {atLabel}
                </span>
              )}

              {/* 展開トグル */}
              <span className="flex-shrink-0 text-v2-text-muted text-xs">
                {isExpanded ? "▲" : "▼"}
              </span>
            </button>

            {/* ===== 展開コンテンツ ===== */}
            {isExpanded && (
              <div className="border-t border-v2-border px-4 py-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">

                  {/* 基本情報 */}
                  <Field label="実G数"    value={block.jisshuG != null ? `${block.jisshuG}G` : "—"} />
                  <Field label="ゾーン"   value={block.zone || "—"} />
                  <Field label="推定モード" value={block.estimatedMode || "—"} span />
                  <Field label="当選契機"  value={block.winTrigger || "—"} span />

                  {/* イベント (どちらか一方でもあれば表示) */}
                  {(block.event1 || block.event2) && (
                    <>
                      <Field label="イベント1" value={block.event1 || "なし"} />
                      <Field label="イベント2" value={block.event2 || "なし"} />
                    </>
                  )}

                  {/* 終了画面示唆: ヒントテキストのみ表示 */}
                  {block.endingSuggestion && (
                    <HintBadgeField label="終了画面示唆" value={block.endingSuggestion} span />
                  )}

                  {/* トロフィー: ヒントテキストのみ表示 */}
                  {block.trophy && (
                    <HintBadgeField label="トロフィー" value={block.trophy} span />
                  )}

                  {/* 特殊演出 */}
                  {block.kakugan   && <Field label="赫眼"   value={block.kakugan} />}
                  {block.shinsekai && <Field label="精神世界" value={block.shinsekai} />}

                  {/* 招待状: ヒントテキストのみ表示 */}
                  {block.invitation && (
                    <HintBadgeField label="招待状" value={block.invitation} span />
                  )}

                  {block.zencho && <Field label="前兆" value={block.zencho} />}
                </div>

                {/* 操作ボタン */}
                <div className="flex gap-2 justify-end pt-2 border-t border-v2-border">
                  <button
                    onClick={() => onDelete(block.id)}
                    className="text-xs font-mono px-3 py-1.5 text-red-600 border border-red-200 hover:bg-red-50 rounded transition-colors"
                  >
                    削除
                  </button>
                  <button
                    onClick={() => onEdit(block)}
                    className="v2-btn-secondary text-xs px-4 py-1.5"
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
  );
}

// ─── サブコンポーネント ────────────────────────────────────────────────────

/** 通常テキストフィールド */
function Field({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[10px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <p className="text-xs font-mono text-v2-text-primary">{value}</p>
    </div>
  );
}

/**
 * 示唆バッジフィールド
 * " - " より後のヒントテキストのみをバッジとして表示
 * 例: "[cz失敗] 亜門鋼太朗 - 通常B以上濃厚" → バッジ「通常B以上濃厚」
 */
function HintBadgeField({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  const colors = getSuggestionColors(value);
  const hint   = getHintText(value);

  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[10px] text-v2-text-muted font-mono mb-1">{label}</p>
      <span className={`inline-block text-xs font-mono font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
        {hint}
      </span>
    </div>
  );
}
