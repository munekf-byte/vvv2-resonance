"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: AT記録 閲覧画面
// グリッド: [✎36][セット36][キャラ48][不利益26][BITES50][直乗せ36][対決minmax(90px,1fr)][▼24]
// 横スクロール禁止 / 375px完全収納
// =============================================================================

import { useState } from "react";
import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment, TGATRow, TGEndingCard } from "@/types";
import {
  getATCharColor,
  getBitesTypeCellColor,
  getBitesTypeShort,
  getDisadvantageCellColor,
  getArimaResultColor,
  getBattleResultColor,
  getSuggestionListLines,
} from "@/lib/tg/cellColors";
import { TG_ENDING_CARD_LABELS, TG_COPPER_CARD_TYPES, TG_CONFIRMED_CARD_TYPES } from "@/lib/engine/constants";

interface Props {
  atKeyList: string[];
  atEntries: TGATEntry[];
  atEventMap?: Map<string, string>;
  blocks?: NormalBlock[];
  onAddRow: (atKey: string, rowType: "set" | "arima") => void;
  onEditRow: (atKey: string, row: TGATRow, rowIndex: number) => void;
  onDeleteRow: (atKey: string, rowId: string) => void;
}

// ─── グリッド定義 ─────────────────────────────────────────────────────────────
const COLS = "grid-cols-[32px_32px_44px_30px_46px_34px_minmax(80px,1fr)_22px]";

const HDR_BG   = "#1f2937";
const HDR_TEXT = "#f9fafb";
const COL_BR   = "border-r border-gray-400";
const ROW_BR   = "border-b border-gray-400";

// ─── サマリー計算 ─────────────────────────────────────────────────────────────

function computeSummary(entry: TGATEntry) {
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

  // 終了画面/トロフィー: 入力のあるSET行から収集
  const endingSuggestion = sets.find((s) => s.endingSuggestion)?.endingSuggestion ?? "";
  const trophy = sets.find((s) => s.trophy)?.trophy ?? "";

  return { setCount, bitesTotal, directTotal, ccgTotal, total: bitesTotal + directTotal + ccgTotal, endingSuggestion, trophy };
}

function directTotalCoins(s: TGATSet): number {
  return s.directAdds.reduce((sum, d) => sum + (d.coins ?? 0), 0);
}

function buildSetNumbers(rows: TGATRow[]): Map<string, number> {
  const map = new Map<string, number>();
  let count = 0;
  for (const r of rows) {
    if (r.rowType === "set") { count++; map.set(r.id, count); }
  }
  return map;
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function ATBlockList({ atKeyList, atEntries, atEventMap, blocks, onAddRow, onEditRow, onDeleteRow }: Props) {
  // ATキー → 対応する通常時イベントを取得
  function getATEvent(atKey: string): string {
    if (!atEventMap || !blocks) return "";
    for (const [blockId, label] of atEventMap) {
      if (label === atKey) {
        const block = blocks.find((b) => b.id === blockId);
        return block?.event ?? "";
      }
    }
    return "";
  }
  const [expandedRows,  setExpandedRows]  = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ atKey: string; rowId: string } | null>(null);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (atKeyList.length === 0) {
    return (
      <div className="mx-3 mt-3 p-8 flex flex-col items-center gap-3 text-center bg-white rounded border border-gray-300">
        <span className="text-4xl">⚡</span>
        <p className="text-gray-600 text-sm">AT記録がありません</p>
        <p className="text-gray-400 text-xs">通常時でAT初当たりを記録すると表示されます</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 py-1.5" style={{ backgroundColor: "#e8e2d8" }}>
        {atKeyList.map((atKey) => {
          const entry      = atEntries.find((e) => e.atKey === atKey) ?? { atKey, rows: [] };
          const summary    = computeSummary(entry);
          const setNumbers = buildSetNumbers(entry.rows);
          const event      = getATEvent(atKey);
          const baseCoins  = event === "ロングフリーズ" ? 2000 : event === "エピソードボーナス" ? 250 : 150;

          return (
            <ATBlock
              key={atKey}
              atKey={atKey}
              entry={entry}
              summary={summary}
              baseCoins={baseCoins}
              setNumbers={setNumbers}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              onAddRow={onAddRow}
              onEditRow={onEditRow}
              onDeleteRow={(rowId) => setDeleteConfirm({ atKey, rowId })}
            />
          );
        })}
      </div>

      {/* ===== 削除確認ポップアップ ===== */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center pb-8 px-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-700 px-5 py-4">
              <p className="text-white font-mono font-bold text-sm">⚠ 削除の確認</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-gray-900 font-mono text-sm font-bold">この行を削除します。</p>
              <p className="text-gray-500 font-mono text-xs">この操作は元に戻せません。</p>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 border-r border-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onDeleteRow(deleteConfirm.atKey, deleteConfirm.rowId);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-4 text-sm font-mono font-bold text-white bg-red-600 hover:bg-red-700"
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

// ─── ATBlock (1AT分) ──────────────────────────────────────────────────────────

interface ATBlockProps {
  atKey: string;
  entry: TGATEntry;
  summary: ReturnType<typeof computeSummary>;
  baseCoins: number;
  setNumbers: Map<string, number>;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  onAddRow: (atKey: string, rowType: "set" | "arima") => void;
  onEditRow: (atKey: string, row: TGATRow, rowIndex: number) => void;
  onDeleteRow: (rowId: string) => void;
}

function ATBlock({
  atKey, entry, summary, baseCoins, setNumbers, expandedRows, toggleRow,
  onAddRow, onEditRow, onDeleteRow,
}: ATBlockProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)", border: "1px solid #000000" }}>

      {/* ── ATサマリーヘッダー ── */}
      <div
        className="border-b-2 border-green-900"
        style={{ backgroundColor: "#14532d" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: summary.ccgTotal > 0 ? "40px 42px 1fr 1fr 1fr 1fr auto" : "40px 42px 1fr 1fr 1fr auto" }}>
          {/* AT番号 */}
          <div className="flex items-center justify-center border-r border-green-900 py-0.5">
            <span className="text-white font-mono font-black text-sm">{atKey}</span>
          </div>
          {/* セット数 */}
          <div className="flex items-center justify-center border-r border-green-900 py-0.5">
            <span className="text-[16px] font-mono font-black text-white leading-none">{summary.setCount}</span>
            <span className="text-[7px] font-mono font-bold text-gray-400 ml-0.5">set</span>
          </div>
          {/* BITES */}
          <ATHeaderCoinCell label="BITES" coins={summary.bitesTotal} />
          {/* 直乗せ */}
          <ATHeaderCoinCell label="直乗せ" coins={summary.directTotal} />
          {/* CCG死神（成功時のみ表示） */}
          {summary.ccgTotal > 0 && <ATHeaderCoinCell label="CCG" coins={summary.ccgTotal} />}
          {/* 合計獲得（概算） */}
          <ATHeaderCoinCell label="合計獲得(概算)" coins={summary.total + baseCoins + summary.setCount * 40} highlight />
          {/* 終了画面/トロフィー（hint表示） */}
          {(summary.endingSuggestion || summary.trophy) ? (
            <div className="flex items-center justify-center px-1.5 border-l border-green-900" style={{ backgroundColor: "#1a3d1f" }}>
              <span className="text-[7px] font-mono text-green-300 leading-tight text-center font-bold">
                {(() => {
                  const v = summary.endingSuggestion || summary.trophy;
                  return getSuggestionListLines(v)?.hint ?? v;
                })()}
              </span>
            </div>
          ) : <div />}
        </div>
      </div>

      {/* ── 列ヘッダー ── */}
      <div className={`grid ${COLS} border-b border-gray-400`} style={{ backgroundColor: "#374151" }}>
        {["✎", "SET", "キャラ", "不利益", "BITES", "直乗"].map((h, i) => (
          <div
            key={i}
            style={{ color: HDR_TEXT }}
            className={`text-[7px] font-mono font-bold text-center px-0.5 py-1 leading-tight ${COL_BR}`}
          >
            {h}
          </div>
        ))}
        <div
          style={{ color: "#9ca3af" }}
          className={`text-[7px] font-mono font-bold text-center py-1 leading-tight ${COL_BR}`}
        >
          対決
        </div>
        <div />
      </div>

      {/* ── データ行 ── */}
      {entry.rows.length === 0 ? (
        <div className="py-4 text-center text-gray-400 text-xs font-mono bg-white">
          行を追加してください
        </div>
      ) : (
        entry.rows.map((row, idx) => {
          const isExpanded = expandedRows.has(row.id);
          if (row.rowType === "set") {
            return (
              <SetRow
                key={row.id}
                row={row}
                setNum={setNumbers.get(row.id) ?? idx + 1}
                isExpanded={isExpanded}
                onToggle={() => toggleRow(row.id)}
                onEdit={() => onEditRow(atKey, row, idx)}
                onDelete={() => onDeleteRow(row.id)}
              />
            );
          } else {
            return (
              <ArimaRow
                key={row.id}
                row={row}
                isExpanded={isExpanded}
                onToggle={() => toggleRow(row.id)}
                onEdit={() => onEditRow(atKey, row, idx)}
                onDelete={() => onDeleteRow(row.id)}
              />
            );
          }
        })
      )}

      {/* ── 行追加ボタン（画像出力時は非表示） ── */}
      <div data-capture-hide="true" className="flex gap-2 px-3 py-2 border-t border-gray-300 bg-gray-50">
        <button
          onClick={() => onAddRow(atKey, "set")}
          className="flex-1 text-[11px] font-mono font-bold py-2 rounded bg-gray-700 text-white hover:bg-gray-800 transition-colors"
        >
          ＋ SET行追加
        </button>
        <button
          onClick={() => onAddRow(atKey, "arima")}
          className="flex-1 text-[11px] font-mono font-bold py-2 rounded border border-yellow-500 text-yellow-700 hover:bg-yellow-50 transition-colors"
          style={{ backgroundColor: "#fffde7" }}
        >
          ＋ ジャッジメント行追加
        </button>
      </div>
    </div>
  );
}

// ─── SummaryCell ─────────────────────────────────────────────────────────────

/** ATヘッダー枚数セル: ラベル+枚数密着（緑ヘッダー内） */
function ATHeaderCoinCell({ label, coins, highlight = false }: { label: string; coins: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-center px-1 py-0.5 border-r border-green-900">
      <span className="text-[6px] font-mono text-white font-bold leading-tight shrink-0 mr-0.5">{label}</span>
      <span
        className="text-[11px] font-mono font-black leading-none"
        style={{ color: highlight ? "#fde047" : "#ffffff" }}
      >
        {coins.toLocaleString()}<span className="text-[7px]">枚</span>
      </span>
    </div>
  );
}

// ─── BattleResultGrid: 対決成績 2階建て ──────────────────────────────────────

function BattleResultGrid({ battles }: { battles: TGATSet["battles"] }) {
  const top    = battles.slice(0, 5);
  const bottom = battles.slice(5, 10);
  const hasTwoRows = battles.length > 5;
  const fontSize = hasTwoRows ? "8px" : "13px";

  function resultStyle(result: string): React.CSSProperties {
    if (result === "○") return { backgroundColor: "#ffffff", color: "#16a34a" };
    if (result === "×") return { backgroundColor: "#ffffff", color: "#dc2626" };
    return { backgroundColor: "#f5f5f5", color: "#d1d5db" };
  }

  function ResultCell({ result }: { result: string }) {
    return (
      <div
        className="flex items-center justify-center flex-1 font-black"
        style={{ ...resultStyle(result), fontSize, minHeight: hasTwoRows ? "14px" : "18px" }}
      >
        {result || ""}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full divide-y divide-gray-300">
      <div className="flex flex-1 divide-x divide-gray-300">
        {Array.from({ length: 5 }, (_, i) => (
          <ResultCell key={i} result={top[i]?.result ?? ""} />
        ))}
      </div>
      {hasTwoRows && (
        <div className="flex flex-1 divide-x divide-gray-300">
          {Array.from({ length: 5 }, (_, i) => (
            <ResultCell key={i} result={bottom[i]?.result ?? ""} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BattleIconCard ──────────────────────────────────────────────────────────

function BattleIconCard({ num, trigger, result }: { num: number; trigger: string; result: string }) {
  const resultBg =
    result === "○" ? { backgroundColor: "#388e3c", color: "#fff" }   // 淡い緑
    : result === "×" ? { backgroundColor: "#e53935", color: "#fff" } // 淡い赤
    : { backgroundColor: "#e5e7eb", color: "#9ca3af" };

  return (
    <div
      className="flex flex-col rounded overflow-hidden border border-gray-300"
      style={{ width: "38px", minHeight: "58px" }}
    >
      {/* 番号 */}
      <div className="text-center text-[7px] font-mono text-gray-400 leading-none pt-0.5"
        style={{ backgroundColor: "#f9fafb" }}>
        {num}
      </div>
      {/* 上半分: 契機 */}
      <div
        className="flex flex-1 items-center justify-center text-center px-0.5 border-b border-gray-300"
        style={{ backgroundColor: "#f3f4f6", minHeight: "26px" }}
      >
        <span className="text-[7px] font-mono text-gray-700 leading-tight break-all">
          {trigger || "—"}
        </span>
      </div>
      {/* 下半分: 成績 */}
      <div
        className="flex items-center justify-center font-bold"
        style={{ ...resultBg, minHeight: "26px", fontSize: "12px" }}
      >
        {result || ""}
      </div>
    </div>
  );
}

// ─── DirectAddIconCard ────────────────────────────────────────────────────────

function DirectAddIconCard({ num, trigger, coins }: { num: number; trigger: string; coins: number | null }) {
  return (
    <div
      className="flex flex-col rounded overflow-hidden border border-blue-200"
      style={{ width: "42px", minHeight: "58px" }}
    >
      {/* 番号 */}
      <div className="text-center text-[7px] font-mono text-blue-300 leading-none pt-0.5"
        style={{ backgroundColor: "#eff6ff" }}>
        {num}
      </div>
      {/* 上半分: 役 */}
      <div
        className="flex flex-1 items-center justify-center text-center px-0.5 border-b border-blue-200"
        style={{ backgroundColor: "#dbeafe", minHeight: "26px" }}
      >
        <span className="text-[7px] font-mono text-blue-800 leading-tight break-all">
          {trigger || "—"}
        </span>
      </div>
      {/* 下半分: 枚数 */}
      <div
        className="flex items-center justify-center"
        style={{ backgroundColor: "#1e40af", minHeight: "26px" }}
      >
        <span className="text-[9px] font-mono font-bold text-white">
          {coins != null ? `${coins}` : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── SetRow ──────────────────────────────────────────────────────────────────

function SetRow({
  row, setNum, isExpanded, onToggle, onEdit, onDelete,
}: {
  row: TGATSet;
  setNum: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const charColor  = getATCharColor(row.character);
  const bitesColor = getBitesTypeCellColor(row.bitesType);
  const disadvColor = getDisadvantageCellColor(row.disadvantage);
  const dTotal     = directTotalCoins(row);

  // AT種別による行背景色
  const rowBg =
    row.atType === "裏AT"             ? "#f3e8ff" :  // パープル系薄い
    row.atType === "隠れ裏AT（推測）" ? "#fff1f2" :  // 薄いピンク
    "#eff6ff"; // 通常AT: 薄い水色

  // AT種別によるセット欄色
  const setBg =
    row.atType === "裏AT"
      ? { backgroundColor: "#c4b5fd", color: "#5b21b6" }     // パープル
      : row.atType === "隠れ裏AT（推測）"
      ? { backgroundColor: "#fecdd3", color: "#9f1239" }     // 薄いピンク
      : { backgroundColor: "#bfdbfe", color: "#1e40af" };    // 通常AT: 薄い水色

  return (
    <div className={`${ROW_BR}`} style={{ backgroundColor: rowBg }}>
      <div className={`grid ${COLS}`}>

        {/* 編集 */}
        <button
          onClick={onEdit}
          className={`flex items-center justify-center min-h-[32px] transition-colors active:bg-blue-100 ${COL_BR}`}
          style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
        >
          <span className="text-lg text-gray-500">✎</span>
        </button>

        {/* セット番号 (2行) - AT種別で色変え */}
        <div
          className={`flex flex-col items-center justify-center px-0.5 min-h-[32px] ${COL_BR}`}
          style={setBg}
        >
          <span className="text-[8px] font-mono leading-tight opacity-70">SET</span>
          <span className="text-[11px] font-mono font-bold">{setNum}</span>
        </div>

        {/* キャラ + ATタイプ */}
        <div
          className={`flex flex-col items-center justify-center px-0.5 py-1 min-h-[32px] ${COL_BR}`}
          style={charColor}
        >
          <span className="text-[9px] font-mono font-black leading-tight text-center w-full truncate text-center">
            {row.character || "—"}
          </span>
          {row.atType && (
            <span className="text-[7px] font-mono opacity-80 leading-tight">
              {row.atType === "裏AT" ? "裏" : row.atType === "隠れ裏AT（推測）" ? "隠裏" : "通常"}
            </span>
          )}
        </div>

        {/* 不利益 */}
        <div
          className={`flex items-center justify-center px-0.5 min-h-[32px] ${COL_BR}`}
          style={disadvColor}
        >
          <span className="text-[9px] font-mono font-bold text-center leading-tight">
            {row.disadvantage === "不利益⭕️" ? "⭕️" :
             row.disadvantage === "不利益❌" ? "❌" : "—"}
          </span>
        </div>

        {/* BITES */}
        <div
          className={`flex flex-col items-center justify-center px-0.5 py-1 min-h-[32px] ${COL_BR}`}
          style={bitesColor}
        >
          <span className="text-[8px] font-mono font-bold leading-tight text-center w-full truncate text-center">
            {row.bitesType ? getBitesTypeShort(row.bitesType) : "—"}
          </span>
          {row.bitesCoins && (
            <span className="text-[9px] font-mono font-black leading-tight">
              {row.bitesCoins === "ED" ? "ED" : `${row.bitesCoins}枚`}
            </span>
          )}
        </div>

        {/* 直乗せ合計 */}
        <div className={`flex items-center justify-center px-0.5 min-h-[32px] ${COL_BR}`}>
          <span className="text-[10px] font-mono font-bold text-gray-700">
            {dTotal > 0 ? `${dTotal}枚` : "—"}
          </span>
        </div>

        {/* 対決成績 2階建て */}
        <div className={`min-h-[32px] ${COL_BR}`}>
          <BattleResultGrid battles={row.battles} />
        </div>

        {/* ▼ */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center min-h-[32px] text-[10px] font-bold transition-colors"
          style={{ backgroundColor: "#374151", color: "#f9fafb" }}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {/* アコーディオン: 詳細 */}
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-300 px-3 py-3 space-y-3">

          {/* 赫眼状態 */}
          {(row.kakugan?.length ?? 0) > 0 && (
            <div>
              <span className="text-[9px] font-mono text-gray-500 block mb-1.5">赫眼状態</span>
              <div className="flex flex-wrap gap-1.5">
                {row.kakugan!.map((k, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: "#b10202", color: "#fff" }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 対決アイコン一覧 */}
          {row.battles.length > 0 && (
            <div>
              <span className="text-[9px] font-mono text-gray-500 block mb-1.5">対決</span>
              <div className="flex flex-wrap gap-1.5">
                {row.battles.map((b, i) => (
                  <BattleIconCard key={i} num={i + 1} trigger={b.trigger} result={b.result} />
                ))}
              </div>
            </div>
          )}

          {/* 直乗せアイコン一覧 */}
          {row.directAdds.length > 0 && (
            <div>
              <span className="text-[9px] font-mono text-gray-500 block mb-1.5">直乗せ</span>
              <div className="flex flex-wrap gap-1.5">
                {row.directAdds.map((d, i) => (
                  <DirectAddIconCard key={d.id} num={i + 1} trigger={d.trigger} coins={d.coins} />
                ))}
              </div>
            </div>
          )}

          {/* エンディングカード */}
          {row.endingCard && hasEndingCardData(row.endingCard) && (
            <div>
              <span className="text-[9px] font-mono text-gray-500 block mb-1.5">エンディングカード</span>
              <EndingCardSummary card={row.endingCard} />
            </div>
          )}

          {/* フリーメモ */}
          {row.memo && (
            <div className="px-2 py-1.5 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-[9px] text-yellow-700 font-mono mb-0.5 font-bold">メモ</p>
              <p className="text-[10px] text-gray-700 font-mono whitespace-pre-wrap">{row.memo}</p>
            </div>
          )}

          {/* アクション */}
          <div className="flex gap-2 justify-end border-t border-gray-200 pt-2">
            <button
              onClick={onDelete}
              className="text-[11px] font-mono px-3 py-1.5 text-red-600 border border-red-300 hover:bg-red-50 rounded"
            >
              🗑 この行を削除
            </button>
            <button
              onClick={onEdit}
              className="text-[11px] font-mono px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              編集
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ArimaRow ────────────────────────────────────────────────────────────────

function ArimaRow({
  row, isExpanded, onToggle, onEdit, onDelete,
}: {
  row: TGArimaJudgment;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resultColor = getArimaResultColor(row.result);

  return (
    <div className={`${ROW_BR}`}>
      <div className="flex items-stretch min-h-[32px]" style={resultColor}>
        {/* 編集 */}
        <button
          onClick={onEdit}
          className="flex items-center justify-center w-[36px] shrink-0 transition-colors active:opacity-70 border-r border-black/10"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        >
          <span className="text-lg opacity-60">✎</span>
        </button>

        {/* ラベル + 成否 */}
        <div className="flex-1 flex items-center px-3 gap-2">
          <span className="text-[9px] font-mono font-bold opacity-70 leading-tight whitespace-nowrap">
            有馬貴将<br />ジャッジメント
          </span>
          <span className="text-sm font-mono font-black">
            {row.result || "—"}
          </span>
          {row.role && (
            <span className="text-[10px] font-mono opacity-80">{row.role}</span>
          )}
          {row.ccgCoins != null && (
            <span
              className="font-mono font-bold ml-auto px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#b91c1c", color: "#fff", fontSize: "13px" }}
            >
              CCG {row.ccgCoins.toLocaleString()}枚
            </span>
          )}
        </div>

        {/* ▼ */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-[24px] shrink-0 text-[10px] font-bold border-l border-black/10"
          style={{ backgroundColor: "rgba(0,0,0,0.12)" }}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-300 px-3 py-2.5">
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDelete}
              className="text-[11px] font-mono px-3 py-1.5 text-red-600 border border-red-300 hover:bg-red-50 rounded"
            >
              🗑 この行を削除
            </button>
            <button
              onClick={onEdit}
              className="text-[11px] font-mono px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              編集
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── エンディングカード サマリー表示 ──────────────────────────────────────────

function hasEndingCardData(card: TGEndingCard): boolean {
  return (
    card.whiteWeak > 0 || card.whiteStrong > 0 ||
    card.blueWeak > 0 || card.blueStrong > 0 ||
    card.redWeak > 0 || card.redStrong > 0 ||
    card.copper1 > 0 || card.copper2 > 0 || card.copper3 > 0 || card.copper4 > 0 ||
    card.confirmed1 > 0 || card.confirmed2 > 0 || card.confirmed3 > 0 || card.confirmed4 > 0
  );
}

function EndingCardSummary({ card }: { card: TGEndingCard }) {
  const items: { label: string; count: number; bg: string; fg: string }[] = [];

  // 白/青/赤
  for (const { key, label, color, textColor } of TG_ENDING_CARD_LABELS) {
    const count = card[key as keyof TGEndingCard] as number;
    if (count > 0) items.push({ label: label.replace(/【|】/g, ""), count, bg: color, fg: textColor });
  }
  // 銅
  for (const { key, label, color, textColor } of TG_COPPER_CARD_TYPES) {
    const count = card[key as keyof TGEndingCard] as number;
    if (count > 0) items.push({ label: label.replace(/【|】/g, ""), count, bg: color, fg: textColor });
  }
  // 確定
  for (const { key, label, color, textColor, rainbow } of TG_CONFIRMED_CARD_TYPES) {
    const count = card[key as keyof TGEndingCard] as number;
    if (count > 0) items.push({
      label: label.replace(/【|】/g, ""),
      count,
      bg: rainbow ? "linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6)" : color,
      fg: textColor,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {items.map(({ label, count, bg, fg }, i) => (
        <span
          key={i}
          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
          style={bg.startsWith("linear") ? { background: bg, color: fg } : { backgroundColor: bg, color: fg }}
        >
          {label} x{count}
        </span>
      ))}
    </div>
  );
}
