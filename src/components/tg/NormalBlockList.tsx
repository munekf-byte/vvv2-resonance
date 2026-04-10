"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時ブロック一覧
// グリッド: [編集52px] [実G 1fr] [ゾーン 1fr] [モード 1fr] [契機46] [イベント46] [AT46] [示唆56] [▼26]
// 削除: アコーディオン内「この行を削除」→ 確認ポップアップ → OK で実行
// =============================================================================

import { useState } from "react";
import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment } from "@/types";
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
import { topModes, type ModeProbs } from "@/lib/engine/modeEstimation";

interface Props {
  blocks: NormalBlock[];
  atLabels: Map<string, string>;
  atEntries?: TGATEntry[];
  modeProbs?: ModeProbs[];
  onEdit: (block: NormalBlock, index: number) => void;
  onDelete: (blockId: string) => void;
}

// ─── ATサマリー計算 ──────────────────────────────────────────────────────────

function computeATSummary(entry: TGATEntry) {
  const sets   = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
  const arimas = entry.rows.filter((r): r is TGArimaJudgment => r.rowType === "arima");

  const setCount    = sets.length;
  const bitesTotal  = sets.reduce((sum, s) => {
    const n = s.bitesCoins === "ED" || s.bitesCoins === "" ? 0 : Number(s.bitesCoins);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const directTotal = sets.reduce((sum, s) =>
    sum + s.directAdds.reduce((ds, d) => ds + (d.coins ?? 0), 0), 0);
  const ccgTotal    = arimas.reduce((sum, a) =>
    sum + (a.result === "成功" && a.ccgCoins ? a.ccgCoins : 0), 0);

  const endingSuggestion = sets.find((s) => s.endingSuggestion)?.endingSuggestion ?? "";
  const trophy = sets.find((s) => s.trophy)?.trophy ?? "";

  // ジャッジメント結果サマリ
  const arimaResults = arimas.map((a) => a.result).filter(Boolean);
  const arimaLabel = arimaResults.length > 0
    ? `有馬${arimaResults.map((r) => r === "成功" ? "○" : "×").join("")}`
    : "";

  return { setCount, bitesTotal, directTotal, total: bitesTotal + directTotal + ccgTotal, endingSuggestion, trophy, arimaLabel };
}

// ─── グリッド ─────────────────────────────────────────────────────────────────
// 編集(52px固定) | 実G・ゾーン・モード (等幅1fr×3) | 契機・イベント・AT (46px×3) | 示唆(56px) | ▼(26px)
const COLS = "grid-cols-[52px_1fr_1fr_1fr_46px_46px_46px_56px_26px]";

const HDR_BG       = "#1f2937";
const HDR_TEXT     = "#f9fafb";
const COL_BORDER_R = "border-r border-gray-400";
const ROW_BORDER   = "border-b-2 border-gray-500";

export function NormalBlockList({ blocks, atLabels, atEntries, modeProbs, onEdit, onDelete }: Props) {
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // 削除確認中の blockId

  if (blocks.length === 0) {
    return (
      <div className="mx-3 mt-3 p-8 flex flex-col items-center gap-3 text-center bg-white rounded border border-gray-300">
        <span className="text-4xl">📋</span>
        <p className="text-gray-600 text-sm">通常時データがありません</p>
        <p className="text-gray-400 text-xs">下の「＋ 周期追加」で記録を始めましょう</p>
      </div>
    );
  }

  // 削除確認対象ブロック
  const confirmBlock = deleteConfirm ? blocks.find((b) => b.id === deleteConfirm) : null;

  function commitDelete() {
    if (!deleteConfirm) return;
    onDelete(deleteConfirm);
    setDeleteConfirm(null);
    setExpandedId(null);
  }

  return (
    <>
      <div className="border-x border-gray-400">

        {/* ===== スティッキー列ヘッダー ===== */}
        <div
          className={`sticky top-0 z-30 grid ${COLS} border-b-2 border-gray-500`}
          style={{ backgroundColor: HDR_BG }}
        >
          {["✎", "実G数", "ゾーン", "モード", "契機", "イベント", "AT", "示唆", ""].map((h, i) => (
            <div
              key={i}
              style={{ color: HDR_TEXT }}
              className={`text-[8px] font-mono font-bold text-center px-0.5 py-1.5 leading-tight ${i < 8 ? COL_BORDER_R : ""}`}
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

            const hasCZ = block.czCounter && (block.czCounter.bell > 0 || block.czCounter.replay > 0 || block.czCounter.weakRare > 0 || block.czCounter.strongRare > 0);
            const hasExtras =
              block.kakugan.length > 0 ||
              block.shinsekai.length > 0 ||
              block.invitation.length > 0 ||
              block.zencho.length > 0 ||
              !!block.memo ||
              !!modeProbs?.[index] ||
              !!hasCZ;

            return (
              <div key={block.id} className={`${ROW_BORDER} bg-white`}>

                {/* ── メイン行 ── */}
                <div className={`grid ${COLS}`}>

                  {/* 編集ボタン: 鉛筆マークのみ */}
                  <button
                    onClick={() => onEdit(block, index)}
                    className={`flex items-center justify-center min-h-[34px] transition-colors active:bg-blue-100 ${COL_BORDER_R}`}
                    style={{ backgroundColor: "#eef2f7" }}
                    title="タップして編集"
                  >
                    <span className="text-xl text-gray-500">✎</span>
                  </button>

                  {/* 実G数 */}
                  <Cell color={{ backgroundColor: "#f9fafb", color: "#111827" }} borderR>
                    <span className="text-[11px] font-bold">
                      {block.jisshuG != null ? `${block.jisshuG}G` : "—"}
                    </span>
                  </Cell>

                  {/* ゾーン */}
                  <Cell color={getZoneCellColor(block.zone)} borderR>
                    <span className={`font-bold ${block.zone && block.zone.length > 3 ? "text-[8px]" : "text-[11px]"}`}>
                      {block.zone || "—"}
                    </span>
                  </Cell>

                  {/* 推定モード */}
                  <Cell color={getModeCellColor(block.estimatedMode)} borderR>
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-[11px] font-bold">{abbrevMode(block.estimatedMode)}</span>
                      {modeProbs?.[index] && (
                        <span className="text-[7px] font-mono opacity-70 leading-none mt-0.5">
                          {topModes(modeProbs[index], 2).map((m) => `${m.mode}${m.pct}%`).join(" ")}
                        </span>
                      )}
                    </span>
                  </Cell>

                  {/* 当選契機 */}
                  <Cell color={getTriggerCellColor(block.winTrigger)} borderR>
                    <span className="text-[10px] font-bold">{abbrevTrigger(block.winTrigger)}</span>
                  </Cell>

                  {/* イベント */}
                  <Cell color={getEventCellColor(block.event)} borderR>
                    <span className="text-[10px] font-bold">{abbrevEvent(block.event)}</span>
                  </Cell>

                  {/* AT */}
                  <Cell color={atLabel ? AT_WIN_COLOR : AT_NONE_COLOR} borderR>
                    <span className={`text-[10px] ${atLabel ? "font-black" : "font-normal"}`}>
                      {atLabel ?? "—"}
                    </span>
                  </Cell>

                  {/* 示唆 (2行) */}
                  <div
                    className={`flex items-center justify-center py-1 px-0.5 min-h-[34px] ${COL_BORDER_R}`}
                    style={suggColor}
                  >
                    {suggLines ? (
                      <span className="flex flex-col items-center leading-[1.15] w-full">
                        <span className="text-[8px] font-bold truncate w-full text-center">{suggLines.name}</span>
                        <span className="text-[7px] opacity-80 truncate w-full text-center">{suggLines.hint}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono opacity-40">—</span>
                    )}
                  </div>

                  {/* アコーディオントグル */}
                  <button
                    onClick={() => hasExtras && setExpandedId(isExpanded ? null : block.id)}
                    className="flex items-center justify-center min-h-[34px] text-[10px] font-bold transition-colors"
                    style={
                      hasExtras
                        ? { backgroundColor: "#374151", color: "#f9fafb" }
                        : { backgroundColor: "#f3f4f6", color: "#d1d5db" }
                    }
                  >
                    {hasExtras ? (isExpanded ? "▲" : "▼") : ""}
                  </button>
                </div>

                {/* ── ATサマリーバー（AT当選ブロックのみ） ── */}
                {atLabel && atEntries && (() => {
                  const entry = atEntries.find((e) => e.atKey === atLabel);
                  if (!entry || entry.rows.length === 0) return null;
                  const s = computeATSummary(entry);
                  const isEpisode = block.event === "エピソードボーナス";
                  const baseCoins = isEpisode ? 250 : 150;
                  const grandTotal = s.total + baseCoins;
                  const suggHint = s.endingSuggestion ? getSuggestionListLines(s.endingSuggestion)?.hint : null;
                  const trophyHint = s.trophy ? getSuggestionListLines(s.trophy)?.hint : null;
                  return (
                    <div className="flex">
                      <div className="shrink-0" style={{ width: "44px" }} />
                      <div
                        className="flex-1 rounded-bl overflow-hidden"
                        style={{ border: "1.5px solid #14532d" }}
                      >
                        {/* 固定グリッド: AT番号 | Set | BITES | 直乗せ | 合計獲得 | 示唆 */}
                        <div style={{ display: "grid", gridTemplateColumns: "36px 38px 1fr 1fr 1fr auto" }}>
                          {/* AT番号 */}
                          <div className="flex items-center justify-center" style={{ backgroundColor: "#14532d" }}>
                            <span className="text-white font-mono font-black text-[10px]">{atLabel}</span>
                          </div>
                          {/* セット数 */}
                          <div className="flex items-center justify-center border-r border-gray-300">
                            <span className="text-[14px] font-mono font-black text-gray-900 leading-none">{s.setCount}</span>
                            <span className="text-[7px] font-mono font-bold text-gray-500 ml-0.5">set</span>
                          </div>
                          {/* BITES */}
                          <ATSummaryCoinCell label="BITES" coins={s.bitesTotal} />
                          {/* 直乗せ */}
                          <ATSummaryCoinCell label="直乗せ" coins={s.directTotal} />
                          {/* 合計獲得（概算） */}
                          <ATSummaryCoinCell label="合計獲得(概算)" coins={grandTotal} color="#14532d" />
                          {/* 終了画面/トロフィー */}
                          {/* ジャッジメント結果 */}
                          {s.arimaLabel && (
                            <div className="flex items-center justify-center px-1 border-l border-gray-300">
                              <span className="text-[7px] font-mono font-bold leading-tight text-center"
                                style={{ color: s.arimaLabel.includes("○") ? "#16a34a" : "#dc2626" }}>
                                {s.arimaLabel}
                              </span>
                            </div>
                          )}
                          {/* 終了画面/トロフィー */}
                          {(suggHint || trophyHint) ? (
                            <div className="flex items-center justify-center px-1 border-l border-gray-300">
                              <span className="text-[7px] font-mono text-gray-700 leading-tight text-center font-bold">
                                {suggHint || trophyHint}
                              </span>
                            </div>
                          ) : <div />}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── アコーディオン ── */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-400 px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                      {block.zencho.length > 0 && <ZenchoField values={block.zencho} />}
                      {block.kakugan.length > 0 && (
                        <MultiColorField
                          label="赫眼"
                          values={block.kakugan}
                          color={{ backgroundColor: "#b10202", color: "#ffffff" }}
                        />
                      )}
                      {block.shinsekai.length > 0 && <MultiField label="精神世界" values={block.shinsekai} />}
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

                    {/* CZ内容 */}
                    {hasCZ && block.czCounter && (
                      <div className="col-span-2 mb-1">
                        <p className="text-[9px] text-gray-500 font-mono mb-1">CZ内容</p>
                        <div className="flex gap-1.5">
                          {([
                            { key: "bell" as const, label: "押/斜🔔", bg: "#fef9c3", fg: "#713f12" },
                            { key: "replay" as const, label: "リプ", bg: "#cffafe", fg: "#155e75" },
                            { key: "weakRare" as const, label: "弱レア", bg: "#ede9fe", fg: "#5b21b6" },
                            { key: "strongRare" as const, label: "強レア", bg: "#c084fc", fg: "#fff" },
                          ]).map(({ key, label, bg, fg }) => {
                            const v = block.czCounter![key];
                            const isHit = block.czCounter!.hitRole === key;
                            if (v === 0 && !isHit) return null;
                            return (
                              <span key={key} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                                style={{ backgroundColor: bg, color: fg, border: isHit ? "2px solid #b91c1c" : "1px solid #d1d5db" }}>
                                {isHit && <span style={{ color: "#f59e0b" }}>★</span>}
                                {label}:{v}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* モード推定確率 */}
                    {modeProbs?.[index] && (
                      <div className="col-span-2 mb-1">
                        <p className="text-[9px] text-gray-500 font-mono mb-1 font-bold">モード推定</p>
                        <ModeProbBar probs={modeProbs[index]} />
                      </div>
                    )}

                    {/* フリーメモ */}
                    {block.memo && (
                      <div className="mb-3 px-2 py-1.5 bg-yellow-50 border border-yellow-300 rounded">
                        <p className="text-[9px] text-yellow-700 font-mono mb-0.5 font-bold">メモ</p>
                        <p className="text-[10px] text-gray-700 font-mono whitespace-pre-wrap">{block.memo}</p>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex gap-2 justify-end border-t border-gray-300 pt-2">
                      <button
                        onClick={() => setDeleteConfirm(block.id)}
                        className="text-[11px] font-mono px-3 py-1.5 text-red-600 border border-red-300 hover:bg-red-50 rounded transition-colors"
                      >
                        🗑 この行イベントを削除
                      </button>
                      <button
                        onClick={() => onEdit(block, index)}
                        className="text-[11px] font-mono px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                )}

                {/* ── ヤメ表示バナー（ブロック直下） ── */}
                {block.yame && (
                  <div
                    className="flex items-center justify-center gap-1.5 py-1"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                      ヤメ{block.jisshuG != null ? ` · ${block.jisshuG}G` : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 削除確認ポップアップ ===== */}
      {deleteConfirm && confirmBlock && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center pb-8 px-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-red-700 px-5 py-4">
              <p className="text-white font-mono font-bold text-sm">⚠ 削除の確認</p>
            </div>
            {/* 本文 */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-gray-900 font-mono text-sm font-bold">
                この行全体が削除されます。
              </p>
              <p className="text-gray-500 font-mono text-xs">
                よろしいですか？この操作は元に戻せません。
              </p>
              {/* 対象行プレビュー */}
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700 space-y-0.5">
                <p>周期 No.{blocks.indexOf(confirmBlock) + 1}
                  {confirmBlock.jisshuG != null ? ` · ${confirmBlock.jisshuG}G` : ""}
                  {confirmBlock.zone !== "不明" ? ` · ゾーン${confirmBlock.zone}` : ""}
                </p>
                {confirmBlock.atWin && <p className="text-green-700 font-bold">AT 初当り あり</p>}
              </div>
            </div>
            {/* ボタン */}
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={commitDelete}
                className="flex-1 py-4 text-sm font-mono font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                OK（削除する）
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
      className={`flex items-center justify-center py-1 px-0.5 text-center min-h-[34px] overflow-hidden ${borderR ? COL_BORDER_R : ""}`}
    >
      <span className="truncate w-full text-center">{children}</span>
    </div>
  );
}

function ZenchoField({ values }: { values: string[] }) {
  return (
    <div className="col-span-2">
      <p className="text-[9px] text-gray-500 font-mono mb-1">前兆履歴</p>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => {
          const col  = v.indexOf(":");
          const zone = col !== -1 ? v.slice(0, col) : v;
          const type = col !== -1 ? v.slice(col + 1) : "";
          return (
            <span key={i} className="text-[9px] font-mono bg-blue-50 border border-blue-300 text-blue-800 px-1.5 py-0.5 rounded">
              {zone}→{type}
            </span>
          );
        })}
      </div>
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

/** ATサマリー枚数セル: ラベル+枚数密着 */
function ATSummaryCoinCell({ label, coins, color }: { label: string; coins: number; color?: string }) {
  return (
    <div className="flex items-center justify-center px-1 border-r border-gray-300">
      <span className="text-[6px] font-mono text-gray-600 font-bold leading-tight shrink-0 mr-0.5">{label}</span>
      <span
        className="text-[11px] font-mono font-black leading-none"
        style={{ color: color ?? "#1f2937" }}
      >
        {coins.toLocaleString()}<span className="text-[7px]">枚</span>
      </span>
    </div>
  );
}

/** モード確率の横棒バー */
const MODE_BAR_COLORS: Record<string, string> = {
  A: "#f4cccc", B: "#fff2cc", C: "#d9ead3", CH: "#cfe2f3", PRE: "#d0e0e3", HEAVEN: "#a4c2f4",
};
const MODE_BAR_TEXT: Record<string, string> = {
  A: "#7c2d12", B: "#78350f", C: "#14532d", CH: "#1e3a5f", PRE: "#134e4a", HEAVEN: "#1e3a8a",
};

function ModeProbBar({ probs }: { probs: ModeProbs }) {
  const entries = (["A", "B", "C", "CH", "PRE", "HEAVEN"] as const)
    .map((m) => ({ mode: m, pct: Math.round(probs[m] * 100) }))
    .filter((e) => e.pct > 0);

  return (
    <div className="flex rounded overflow-hidden border border-gray-300" style={{ height: "22px" }}>
      {entries.map(({ mode, pct }) => (
        <div
          key={mode}
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: `${pct}%`,
            minWidth: pct > 0 ? "18px" : 0,
            backgroundColor: MODE_BAR_COLORS[mode],
            color: MODE_BAR_TEXT[mode],
          }}
        >
          <span className="text-[8px] font-mono font-bold whitespace-nowrap">
            {mode}{pct}
          </span>
        </div>
      ))}
    </div>
  );
}
