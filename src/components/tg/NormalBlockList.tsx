"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時ブロック一覧 (テーブル固定列)
// 閲覧画面: 実G数/ゾーン/推定モード/当選契機/イベント/AT/終了示唆 を常時表示
// アコーディオン: 赫眼・精神世界・招待状・前兆履歴 のみ
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import { getSuggestionColors, getHintText } from "@/lib/tg/suggestionColors";

// ─── 省略ヘルパー ─────────────────────────────────────────────────────────────

function abbrevMode(mode: string): string {
  if (!mode || mode === "不明") return "—";
  const short = mode.split(":")[0].trim();
  const map: Record<string, string> = {
    "朝一モード": "朝一",
    "通常A": "通常A",
    "通常B": "通常B",
    "通常C": "通常C",
    "チャンス": "チャンス",
    "天国準備": "天国P",
    "天国": "天国",
  };
  return map[short] ?? short;
}

function abbrevTrigger(t: string): string {
  if (!t || t === "不明") return "—";
  const map: Record<string, string> = {
    "ゲーム数": "G数",
    "ゲーム数orレア役": "G/レア",
    "🍉加算 ゲーム数": "🍉G",
    "強チェリー": "強チェ",
    "チャンス目": "ﾁｬﾝｽ目",
    "弱チェリー": "弱チェ",
    "確定チェリー": "確チェ",
    "精神世界": "精神",
    "精神世界 [赫眼]": "精神[赫]",
    "直撃": "直撃",
  };
  return map[t] ?? t;
}

function abbrevEvent(e: string): string {
  if (!e) return "—";
  const map: Record<string, string> = {
    "レミニセンス": "レミニ",
    "大喰いの利世": "利世",
    "エピソードボーナス": "EP-B",
    "直撃AT": "直AT",
    "引き戻し": "引戻",
    "ロングフリーズ": "LF",
  };
  return map[e] ?? e;
}

function getZoneStyle(zone: string): string {
  if (!zone || zone === "不明") return "bg-gray-100 text-gray-500";
  if (["50", "100"].includes(zone))        return "bg-sky-100 text-sky-700";
  if (["150", "200", "250"].includes(zone)) return "bg-blue-100 text-blue-700";
  if (["300", "400"].includes(zone))        return "bg-blue-200 text-blue-800";
  if (["500", "600"].includes(zone))        return "bg-indigo-200 text-indigo-800";
  return "bg-gray-50 text-gray-600";
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  blocks: NormalBlock[];
  /** blockId → "AT1" | "AT2" ... */
  atLabels: Map<string, string>;
  /** block + 0-based index を渡す */
  onEdit: (block: NormalBlock, index: number) => void;
  onDelete: (blockId: string) => void;
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

const GRID = "grid-cols-[20px_38px_38px_44px_48px_44px_32px_1fr_24px]";

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

        {/* ===== スティッキー列ヘッダー ===== */}
        <div className="sticky top-[56px] z-30 bg-v2-black-100 border-y border-v2-border">
          <div className={`grid ${GRID} px-2 py-1`}>
            {["#", "実G数", "ゾーン", "モード", "契機", "イベント", "AT", "終了示唆/トロフィー", ""].map((h, i) => (
              <span key={i} className="text-[8px] font-mono text-v2-text-muted text-center leading-tight">
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* ===== データ行 ===== */}
        <div className="divide-y divide-v2-border bg-white">
          {blocks.map((block, index) => {
            const isExpanded = expandedId === block.id;
            const atLabel = atLabels.get(block.id);

            // 終了画面示唆 優先、なければトロフィー
            const suggValue  = block.endingSuggestion || block.trophy;
            const suggHint   = suggValue ? getHintText(suggValue) : null;
            const suggColors = suggValue ? getSuggestionColors(suggValue) : null;

            // アコーディオンに表示するフィールドがあるか
            const hasExtras = !!(block.kakugan || block.shinsekai || block.invitation || block.zencho);

            return (
              <div key={block.id} className={atLabel ? "bg-green-50" : ""}>

                {/* ── メイン行 ── */}
                <div className={`grid ${GRID} px-2 py-2 items-center`}>

                  {/* # 周期番号 */}
                  <span className="text-[9px] font-mono text-v2-text-muted text-center">
                    {index + 1}
                  </span>

                  {/* 実G数 */}
                  <span className="text-[10px] font-mono text-v2-text-primary text-center tabular-nums">
                    {block.jisshuG != null ? `${block.jisshuG}G` : "—"}
                  </span>

                  {/* ゾーン バッジ */}
                  <div className="flex justify-center">
                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded leading-tight ${getZoneStyle(block.zone)}`}>
                      {block.zone || "—"}
                    </span>
                  </div>

                  {/* 推定モード */}
                  <span className="text-[10px] font-mono text-v2-text-secondary text-center truncate px-0.5">
                    {abbrevMode(block.estimatedMode)}
                  </span>

                  {/* 当選契機 */}
                  <span className="text-[10px] font-mono text-v2-text-secondary text-center truncate px-0.5">
                    {abbrevTrigger(block.winTrigger)}
                  </span>

                  {/* イベント */}
                  <span className="text-[10px] font-mono text-v2-text-secondary text-center truncate px-0.5">
                    {abbrevEvent(block.event)}
                  </span>

                  {/* AT バッジ */}
                  <div className="flex justify-center">
                    {atLabel ? (
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-green-700 text-white leading-tight">
                        {atLabel}
                      </span>
                    ) : (
                      <span className="text-[9px] text-v2-text-muted text-center">—</span>
                    )}
                  </div>

                  {/* 終了示唆 / トロフィー ヒントバッジ */}
                  <div className="flex items-center min-w-0 px-0.5">
                    {suggHint && suggColors ? (
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded truncate max-w-full leading-tight ${suggColors.bg} ${suggColors.text}`}>
                        {suggHint}
                      </span>
                    ) : (
                      <span className="text-[9px] text-v2-text-muted">—</span>
                    )}
                  </div>

                  {/* 展開ボタン (アコーディオン内容がある場合のみ) */}
                  <button
                    onClick={() => hasExtras && setExpandedId(isExpanded ? null : block.id)}
                    className="flex items-center justify-center"
                  >
                    {hasExtras ? (
                      <span className="text-[10px] text-v2-text-muted">{isExpanded ? "▲" : "▼"}</span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(block, index); }}
                        className="text-[9px] text-v2-text-muted"
                      >
                        ✎
                      </button>
                    )}
                  </button>
                </div>

                {/* ── アコーディオン: 追加情報のみ ── */}
                {isExpanded && (
                  <div className="bg-v2-black-50 border-t border-v2-border px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2.5">
                      {block.kakugan   && <ExtraField label="赫眼状態" value={block.kakugan} />}
                      {block.shinsekai && <ExtraField label="精神世界" value={block.shinsekai} />}
                      {block.zencho    && <ExtraField label="前兆履歴" value={block.zencho} />}
                      {block.invitation && (
                        <ExtraHintField label="招待状" value={block.invitation} span />
                      )}
                      {/* 終了示唆とトロフィーが両方ある場合は両方表示 */}
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

                {/* アコーディオンがない行: 行タップで編集 */}
                {!hasExtras && !isExpanded && (
                  <div className="flex justify-end px-2 pb-1 gap-2">
                    <button
                      onClick={() => onDelete(block.id)}
                      className="text-[10px] font-mono text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => onEdit(block, index)}
                      className="text-[10px] font-mono text-v2-text-muted hover:text-v2-text-primary"
                    >
                      編集
                    </button>
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

function ExtraField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <p className="text-[10px] font-mono text-v2-text-primary">{value}</p>
    </div>
  );
}

function ExtraHintField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  const colors = getSuggestionColors(value);
  const hint   = getHintText(value);
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[9px] text-v2-text-muted font-mono mb-0.5">{label}</p>
      <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
        {hint}
      </span>
    </div>
  );
}
