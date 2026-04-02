"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: AT記録 閲覧画面
// グリッド: [編集36] [セット48] [キャラ68] [不利益38] [BITES78] [直乗せ50] [対決成績×10 各20px] [▼24]
// 横スクロール対応 / モデル画像忠実再現
// =============================================================================

import { useState } from "react";
import type { TGATEntry, TGATSet, TGArimaJudgment, TGATRow } from "@/types";
import {
  getATCharColor,
  getBitesTypeCellColor,
  getBitesTypeShort,
  getDisadvantageCellColor,
  getArimaResultColor,
  getBattleResultColor,
} from "@/lib/tg/cellColors";
import { TG_BATTLE_RESULT_HEADERS } from "@/lib/engine/constants";

interface Props {
  atKeyList: string[];       // ["AT1","AT2",...] 通常時から導出
  atEntries: TGATEntry[];
  onAddRow: (atKey: string, rowType: "set" | "arima") => void;
  onEditRow: (atKey: string, row: TGATRow, rowIndex: number) => void;
  onDeleteRow: (atKey: string, rowId: string) => void;
}

// ─── グリッド定義 ─────────────────────────────────────────────────────────────
const COLS = "grid-cols-[36px_48px_68px_38px_78px_50px_repeat(10,20px)_24px]";
const MIN_W = "min-w-[575px]";

const HDR_BG    = "#1f2937";
const HDR_TEXT  = "#f9fafb";
const COL_BR    = "border-r border-gray-400";
const ROW_BR    = "border-b border-gray-400";

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

  return { setCount, bitesTotal, directTotal, total: bitesTotal + directTotal + ccgTotal };
}

function directTotal(s: TGATSet): number {
  return s.directAdds.reduce((sum, d) => sum + (d.coins ?? 0), 0);
}

// SET番号カウント (arima行をスキップ)
function buildSetNumbers(rows: TGATRow[]): Map<string, number> {
  const map = new Map<string, number>();
  let count = 0;
  for (const r of rows) {
    if (r.rowType === "set") { count++; map.set(r.id, count); }
  }
  return map;
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function ATBlockList({ atKeyList, atEntries, onAddRow, onEditRow, onDeleteRow }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ atKey: string; rowId: string } | null>(null);

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
      <div className="space-y-0">
        {atKeyList.map((atKey) => {
          const entry = atEntries.find((e) => e.atKey === atKey) ?? { atKey, rows: [] };
          const summary   = computeSummary(entry);
          const setNumbers = buildSetNumbers(entry.rows);

          return (
            <ATBlock
              key={atKey}
              atKey={atKey}
              entry={entry}
              summary={summary}
              setNumbers={setNumbers}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
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
  setNumbers: Map<string, number>;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  onAddRow: (atKey: string, rowType: "set" | "arima") => void;
  onEditRow: (atKey: string, row: TGATRow, rowIndex: number) => void;
  onDeleteRow: (rowId: string) => void;
}

function ATBlock({
  atKey, entry, summary, setNumbers, expandedRow, setExpandedRow,
  onAddRow, onEditRow, onDeleteRow,
}: ATBlockProps) {
  return (
    <div className="border border-gray-400 mb-4 mx-3 rounded overflow-hidden">

      {/* ── ATサマリーヘッダー ── */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] border-b-2 border-gray-500"
        style={{ backgroundColor: HDR_BG }}>
        {/* ATキー */}
        <div className="px-3 py-2 flex items-center justify-center border-r border-gray-600">
          <span className="text-white font-mono font-black text-base tracking-wider">{atKey}</span>
        </div>
        {/* 喰種Set数 */}
        <SummaryCell label="喰種Set数" value={`${summary.setCount}Set`} />
        {/* BITES獲得 */}
        <SummaryCell label="BITES獲得" value={`${summary.bitesTotal.toLocaleString()}枚`} />
        {/* 直乗せ */}
        <SummaryCell label="直乗せ" value={`${summary.directTotal.toLocaleString()}枚`} />
        {/* 合計 */}
        <SummaryCell label="合計獲得枚数" value={`${summary.total.toLocaleString()}枚`} highlight />
      </div>

      {/* ── 列ヘッダー ── */}
      <div className="overflow-x-auto">
        <div className={MIN_W}>
          <div
            className={`grid ${COLS} border-b border-gray-400`}
            style={{ backgroundColor: "#374151" }}
          >
            {/* 固定列ヘッダー */}
            {["✎", "セット", "キャラ", "不利益", "BITES", "直乗せ"].map((h, i) => (
              <div
                key={i}
                style={{ color: HDR_TEXT }}
                className={`text-[8px] font-mono font-bold text-center px-0.5 py-1.5 leading-tight ${COL_BR}`}
              >
                {h}
              </div>
            ))}
            {/* 対決成績列ヘッダー */}
            {TG_BATTLE_RESULT_HEADERS.map((g, i) => (
              <div
                key={`g${i}`}
                style={{ color: "#9ca3af" }}
                className={`text-[7px] font-mono font-bold text-center py-1.5 leading-tight ${i < 9 ? COL_BR : ""}`}
              >
                {g}
              </div>
            ))}
            {/* ▼ */}
            <div />
          </div>

          {/* ── データ行 ── */}
          {entry.rows.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs font-mono">
              行を追加してください
            </div>
          ) : (
            entry.rows.map((row, idx) => {
              const isExpanded = expandedRow === row.id;
              if (row.rowType === "set") {
                return (
                  <SetRow
                    key={row.id}
                    row={row}
                    setNum={setNumbers.get(row.id) ?? idx + 1}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedRow(isExpanded ? null : row.id)}
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
                    onToggle={() => setExpandedRow(isExpanded ? null : row.id)}
                    onEdit={() => onEditRow(atKey, row, idx)}
                    onDelete={() => onDeleteRow(row.id)}
                  />
                );
              }
            })
          )}
        </div>
      </div>

      {/* ── 行追加ボタン ── */}
      <div className="flex gap-2 px-3 py-2 border-t border-gray-300 bg-gray-50">
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
          ＋ 有馬行追加
        </button>
      </div>
    </div>
  );
}

// ─── SummaryCell ─────────────────────────────────────────────────────────────

function SummaryCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 py-1.5 border-r border-gray-600 last:border-r-0">
      <span className="text-[8px] font-mono text-gray-400 leading-none">{label}</span>
      <span className={`text-[11px] font-mono font-bold mt-0.5 ${highlight ? "text-yellow-300" : "text-white"}`}>
        {value}
      </span>
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
  const charColor = getATCharColor(row.character);
  const bitesColor = getBitesTypeCellColor(row.bitesType);
  const disadvColor = getDisadvantageCellColor(row.disadvantage);
  const dTotal = directTotal(row);

  return (
    <div className={`${ROW_BR} bg-white`}>
      {/* メイン行 */}
      <div className={`grid ${COLS} ${MIN_W}`}>
        {/* 編集 */}
        <button
          onClick={onEdit}
          className={`flex items-center justify-center min-h-[44px] transition-colors active:bg-blue-100 ${COL_BR}`}
          style={{ backgroundColor: "#eef2f7" }}
        >
          <span className="text-lg text-gray-500">✎</span>
        </button>

        {/* セット番号 */}
        <div className={`flex items-center justify-center px-0.5 min-h-[44px] ${COL_BR}`}>
          <span className="text-[10px] font-mono font-bold text-gray-700">SET{setNum}</span>
        </div>

        {/* キャラ */}
        <div
          className={`flex flex-col items-center justify-center px-0.5 py-1 min-h-[44px] ${COL_BR}`}
          style={charColor}
        >
          <span className="text-[9px] font-mono font-black leading-tight text-center truncate w-full text-center">
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
          className={`flex items-center justify-center px-0.5 min-h-[44px] ${COL_BR}`}
          style={disadvColor}
        >
          <span className="text-[9px] font-mono font-bold text-center leading-tight">
            {row.disadvantage === "不利益⭕️" ? "⭕️" :
             row.disadvantage === "不利益❌" ? "❌" : "—"}
          </span>
        </div>

        {/* BITES (2行) */}
        <div
          className={`flex flex-col items-center justify-center px-0.5 py-1 min-h-[44px] ${COL_BR}`}
          style={bitesColor}
        >
          <span className="text-[8px] font-mono font-bold leading-tight text-center truncate w-full text-center">
            {row.bitesType ? getBitesTypeShort(row.bitesType) : "—"}
          </span>
          {row.bitesCoins && (
            <span className="text-[9px] font-mono font-black leading-tight">
              {row.bitesCoins === "ED" ? "ED" : `${row.bitesCoins}枚`}
            </span>
          )}
        </div>

        {/* 直乗せTOTAL */}
        <div className={`flex items-center justify-center px-0.5 min-h-[44px] ${COL_BR}`}>
          <span className="text-[10px] font-mono font-bold text-gray-700">
            {dTotal > 0 ? `${dTotal}枚` : "—"}
          </span>
        </div>

        {/* 対決成績 10枠 */}
        {Array.from({ length: 10 }, (_, i) => {
          const result = row.battleResults[i] ?? "";
          const color  = getBattleResultColor(result);
          const isLast = i === 9;
          return (
            <div
              key={i}
              className={`flex items-center justify-center min-h-[44px] ${!isLast ? COL_BR : ""}`}
              style={color}
            >
              <span className="text-[10px] font-bold">
                {result || ""}
              </span>
            </div>
          );
        })}

        {/* アコーディオントグル ▼ */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center min-h-[44px] text-[10px] font-bold transition-colors"
          style={{ backgroundColor: "#374151", color: "#f9fafb" }}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {/* アコーディオン: 詳細 */}
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-300 px-3 py-2.5 space-y-2">
          {/* 対決契機 */}
          <div className="flex gap-2 items-center">
            <span className="text-[9px] font-mono text-gray-500 w-16 shrink-0">対決契機</span>
            <span className="text-[10px] font-mono font-bold text-gray-800">
              {row.battleTrigger || "—"}
            </span>
          </div>

          {/* 直乗せ内訳 */}
          {row.directAdds.length > 0 && (
            <div className="flex gap-2 items-start">
              <span className="text-[9px] font-mono text-gray-500 w-16 shrink-0">直乗せ</span>
              <div className="flex flex-wrap gap-1">
                {row.directAdds.map((d) => (
                  <span key={d.id} className="text-[9px] font-mono px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded">
                    {d.trigger} +{d.coins}枚
                  </span>
                ))}
              </div>
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
      {/* メイン行: 横結合デザイン */}
      <div className={`flex items-stretch min-h-[44px] ${MIN_W}`} style={resultColor}>
        {/* 編集 */}
        <button
          onClick={onEdit}
          className="flex items-center justify-center w-[36px] shrink-0 transition-colors active:opacity-70 border-r border-black/10"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        >
          <span className="text-lg opacity-60">✎</span>
        </button>

        {/* ラベル + 成否 */}
        <div className="flex-1 flex items-center px-3 gap-3">
          <span className="text-[9px] font-mono font-bold opacity-70 leading-tight whitespace-nowrap">
            有馬貴将<br />ジャッジメント
          </span>
          <span className="text-sm font-mono font-black">
            {row.result || "—"}
          </span>
          {row.role && (
            <span className="text-[10px] font-mono opacity-80">{row.role}</span>
          )}
          {row.result === "成功" && row.ccgCoins && (
            <span className="text-[11px] font-mono font-bold ml-auto">
              CCGの死神 {row.ccgCoins.toLocaleString()}枚
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

      {/* アコーディオン */}
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
