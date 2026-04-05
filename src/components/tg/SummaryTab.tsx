"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 集計タブ v1.9
// 横スクロール禁止・iPhone Pro幅完全収納
// カテゴリ縦長・2〜3列横並びレイアウト
// =============================================================================

import { useRef, useCallback, useState, useEffect } from "react";
import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment } from "@/types";
import {
  TG_KAKUGAN, TG_SHINSEKAI,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES,
  TG_AT_CHARACTERS, TG_BITES_TYPES,
  TG_ZONES,
} from "@/lib/engine/constants";

interface Props {
  blocks: NormalBlock[];
  atEntries: TGATEntry[];
  sessionId: string;
}

// ── ユーティリティ ──────────────────────────────────────────────────────────

function prob(count: number, denom: number): string {
  if (denom <= 0 || count <= 0) return "—";
  return `1/${Math.round(denom / count).toLocaleString()}`;
}
function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}
function getAllSets(entries: TGATEntry[]): TGATSet[] {
  return entries.flatMap((e) => e.rows.filter((r): r is TGATSet => r.rowType === "set"));
}
function getBitesShort(bt: string): string {
  const m = bt.match(/^Table:(\S+)/);
  return m ? m[1] : bt.slice(0, 4);
}
function extractName(s: string): string {
  const m = s.match(/\]\s*(.+?)\s*-/);
  return m ? m[1] : s;
}
function extractHint(s: string): string {
  const m = s.match(/-\s*(.+)$/);
  return m ? m[1] : "";
}
function groupCount(arr: string[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of arr) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([value, count]) => ({ value, count }));
}

// ── メインコンポーネント ─────────────────────────────────────────────────

export function SummaryTab({ blocks, atEntries, sessionId }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);

  // 総消化G数: localStorage 保存
  const lsKey = `tgr_totalG_${sessionId}`;
  const [totalGInput, setTotalGInput] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem(lsKey);
    if (saved) setTotalGInput(saved);
  }, [lsKey]);
  function handleTotalGChange(v: string) {
    setTotalGInput(v);
    localStorage.setItem(lsKey, v);
  }

  // ── 計算 ──
  const sum2 = blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);
  const sum1 = totalGInput ? parseInt(totalGInput) || sum2 : sum2;

  const czCount = blocks.filter((b) => b.event === "レミニセンス" || b.event === "大喰いの利世").length;
  const epiCount = blocks.filter((b) => b.event === "エピソードボーナス").length;
  const directATCount = blocks.filter((b) => b.event === "直撃AT").length;
  const atWinCount = blocks.filter((b) => b.atWin).length;

  const allKakugan = blocks.flatMap((b) => b.kakugan);
  const kakuganTotal = allKakugan.length;
  const kakuganBD = [...TG_KAKUGAN].map((k) => ({ label: k, count: allKakugan.filter((v) => v === k).length }));

  const allShinsekai = blocks.flatMap((b) => b.shinsekai);
  const shinsekaiTotal = allShinsekai.length;
  const shinsekaiBS = [...TG_SHINSEKAI].map((s) => ({ label: s, count: allShinsekai.filter((v) => v === s).length }));

  const czFailSuggestions = blocks.filter((b) => b.endingSuggestion.startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
  const endScreenItems = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[終了画面]"));
  const allEndScreenFromAT = getAllSets(atEntries).map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));

  const trophyCount = blocks.filter((b) => b.trophy).length + getAllSets(atEntries).filter((s) => s.trophy).length;
  const settingHints = inferSetting(czFailSuggestions, allEndScreenFromAT, blocks, atEntries);

  const allSets = getAllSets(atEntries);
  const charStats = [...TG_AT_CHARACTERS].filter((c) => c !== "EDボナ").map((char) => {
    const sets = allSets.filter((s) => s.character === char);
    const battles = sets.flatMap((s) => s.battles).filter((b) => b.result);
    return { char, sets: sets.length, wins: battles.filter((b) => b.result === "○").length, total: battles.length };
  });

  const bitesStats = [...TG_BITES_TYPES].map((bt) => ({ label: getBitesShort(bt), count: allSets.filter((s) => s.bitesType === bt).length }));
  const bitesTotal = allSets.filter((s) => s.bitesType).length;
  const bitesHistory = allSets.filter((s) => s.bitesCoins).map((s) => ({ table: getBitesShort(s.bitesType), coins: s.bitesCoins }));
  const directAddHistory = allSets.flatMap((s) => s.directAdds.filter((d) => d.trigger || d.coins != null).map((d) => ({ trigger: d.trigger, coins: d.coins })));
  const arimaByPos = computeArimaPositions(atEntries);

  const zoneAll = computeZoneDistribution(blocks, "all");
  const zoneAfterAT = computeZoneDistribution(blocks, "afterAT");

  // ── 画像出力 ──
  const handleCapture = useCallback(async () => {
    if (!captureRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(captureRef.current, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
    const link = document.createElement("a");
    link.download = `TG_Summary_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-end">
        <button onClick={handleCapture}
          className="text-[11px] font-mono font-bold px-4 py-2 rounded bg-gray-800 text-white active:scale-95 transition-transform">
          画像で保存
        </button>
      </div>

      <div ref={captureRef} className="bg-white px-1.5 py-2 text-[8px] font-mono">

        {/* ===== Row 1: 通常時 | 赫眼/精神世界 ===== */}
        <div className="grid grid-cols-2 gap-1 mb-1">

          {/* 通常時 */}
          <Cat color="#1565c0" title="通常時">
            <TR>
              <TD w>総消化G数</TD>
              <TDv>
                <input type="number" value={totalGInput} onChange={(e) => handleTotalGChange(e.target.value)}
                  placeholder={String(sum2)} className="w-full bg-yellow-50 border border-yellow-400 rounded text-[9px] font-mono font-bold text-right px-1 py-0.5 focus:outline-none" />
              </TDv>
            </TR>
            <TR><TD w>通常時G</TD><TDv>{sum2.toLocaleString()} G</TDv></TR>
            <TR><TD w>CZ(レミニ&利世)</TD><TDv>{czCount}回 {prob(czCount, sum2)}</TDv></TR>
            <TR><TD w>エピボ</TD><TDv>{epiCount}回 {prob(epiCount, sum2)}</TDv></TR>
            <TR><TD w>AT直撃</TD><TDv>{directATCount}回 {prob(directATCount, sum2)}</TDv></TR>
            <TR><TD w>AT初当たり</TD><TDv>{atWinCount}回 {prob(atWinCount, sum2)}</TDv></TR>
          </Cat>

          {/* 赫眼/精神世界 */}
          <Cat color="#b71c1c" title="赫眼 / 精神世界">
            <TR><TD w>赫眼</TD><TDv>{kakuganTotal}回 {prob(kakuganTotal, sum1)}</TDv></TR>
            {kakuganBD.map((k) => (
              <TR key={k.label}><TD>　{k.label}</TD><TDv>{k.count}回 [{pct(k.count, kakuganTotal)}]</TDv></TR>
            ))}
            <TR><TD w>精神世界</TD><TDv>{shinsekaiTotal}回 {prob(shinsekaiTotal, sum2)}</TDv></TR>
            {shinsekaiBS.map((s) => (
              <TR key={s.label}><TD>　{s.label}</TD><TDv>{s.count}回 [{pct(s.count, shinsekaiTotal)}]</TDv></TR>
            ))}
          </Cat>
        </div>

        {/* ===== Row 2: 設定示唆 ===== */}
        <Cat color="#e65100" title="設定示唆" className="mb-1">
          <TR><TD w>設定情報</TD><TDv bold>{settingHints || "情報不足"}</TDv></TR>
          <TR><TD w>トロフィー他</TD><TDv>{trophyCount}回</TDv></TR>
        </Cat>

        <div className="grid grid-cols-2 gap-1 mb-1">
          {/* CZ失敗 終了画面 */}
          <Cat color="#bf360c" title="[cz失敗] 終了画面">
            {TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]")).map((s) => {
              const c = czFailSuggestions.filter((v) => v === s).length;
              return (
                <TR key={s}><TD>{extractName(s)}</TD><TDv>{c}回</TDv></TR>
              );
            })}
          </Cat>

          {/* [終了画面] 示唆 */}
          <Cat color="#4e342e" title="[終了画面] 示唆">
            {endScreenItems.map((s) => {
              const c = allEndScreenFromAT.filter((v) => v === s).length;
              const t = allEndScreenFromAT.length;
              return (
                <TR key={s}><TD>{extractName(s)}</TD><TDv>{c}回 [{pct(c, t)}]</TDv></TR>
              );
            })}
          </Cat>
        </div>

        {/* ===== Row 3: AT ===== */}
        <Cat color="#2e7d32" title="AT" className="mb-1">
          <TR><TD w>AT初当たり</TD><TDv>{atWinCount}回 {prob(atWinCount, sum2)}</TDv></TR>
        </Cat>

        <div className="grid grid-cols-2 gap-1 mb-1">
          {/* キャラ対決 */}
          <Cat color="#1b5e20" title="キャラ対決成績">
            {charStats.map(({ char, sets, wins, total }) => (
              <TR key={char}>
                <TD>{char}</TD>
                <TDv>{total > 0 ? `${wins}/${total} [${pct(wins, total)}]` : "—"}</TDv>
              </TR>
            ))}
          </Cat>

          {/* BITESテーブル */}
          <Cat color="#33691e" title="BITESテーブル">
            {bitesStats.map(({ label, count }) => (
              <TR key={label}>
                <TD>{label}</TD>
                <TDv>{count}回 [{pct(count, bitesTotal)}]</TDv>
              </TR>
            ))}
          </Cat>
        </div>

        {/* 有馬set */}
        {arimaByPos.some((a) => a.total > 0) && (
          <Cat color="#455a64" title="有馬set (1,3,5セット目)" className="mb-1">
            <div className="grid grid-cols-3 gap-0.5">
              {arimaByPos.map(({ pos, count, total }) => (
                <div key={pos} className="text-center bg-gray-50 rounded py-0.5">
                  <span className="text-[7px] text-gray-500">{pos}set目</span>
                  <span className="block text-[9px] font-bold">{count}回 [{pct(count, total)}]</span>
                </div>
              ))}
            </div>
          </Cat>
        )}

        {/* BITES獲得履歴 */}
        {bitesHistory.length > 0 && (
          <Cat color="#14532d" title="BITES獲得履歴" className="mb-1">
            <div className="flex flex-wrap gap-px">
              {bitesHistory.map((h, i) => (
                <SqIcon key={i} top={h.table} bottom={h.coins} bg="#14532d" />
              ))}
            </div>
          </Cat>
        )}

        {/* 直乗せ履歴 */}
        {directAddHistory.length > 0 && (
          <Cat color="#1565c0" title="直乗せ履歴" className="mb-1">
            <div className="flex flex-wrap gap-px">
              {directAddHistory.map((d, i) => (
                <SqIcon key={i} top={d.trigger} bottom={d.coins != null ? String(d.coins) : "—"} bg="#1565c0" />
              ))}
            </div>
          </Cat>
        )}

        {/* ===== ゾーン ===== */}
        <div className="grid grid-cols-2 gap-1 mb-1">
          <ZoneBlock label="ゾーン [全体]" data={zoneAll} />
          <ZoneBlock label="ゾーン [リセ頭]" data={zoneAfterAT} />
        </div>

      </div>
    </div>
  );
}

// ── レイアウト部品 ──────────────────────────────────────────────────────────

function Cat({ color, title, children, className = "" }: {
  color: string; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`border border-gray-300 rounded overflow-hidden ${className}`}>
      <div className="px-1 py-0.5" style={{ backgroundColor: color }}>
        <span className="text-[8px] font-mono font-bold text-white">{title}</span>
      </div>
      <div className="divide-y divide-gray-200">{children}</div>
    </div>
  );
}

/** テーブル行 */
function TR({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center min-h-[18px]">{children}</div>;
}

/** ラベルセル */
function TD({ children, w }: { children: React.ReactNode; w?: boolean }) {
  return (
    <span className={`flex-1 min-w-0 truncate px-1 text-[7px] text-gray-600 ${w ? "font-bold" : ""}`}>
      {children}
    </span>
  );
}

/** 値セル — 右揃え固定幅 */
function TDv({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <span className={`shrink-0 text-right px-1 text-[8px] text-gray-900 tabular-nums whitespace-nowrap ${bold ? "font-bold" : ""}`}>
      {children}
    </span>
  );
}

function SqIcon({ top, bottom, bg }: { top: string; bottom: string; bg: string }) {
  return (
    <div className="flex flex-col items-center rounded border overflow-hidden"
      style={{ width: "28px", height: "26px", borderColor: bg }}>
      <span className="text-[5px] font-bold leading-none w-full text-center truncate"
        style={{ backgroundColor: bg, color: "#fff" }}>{top}</span>
      <span className="text-[8px] font-bold leading-none mt-0.5 text-gray-800">{bottom}</span>
    </div>
  );
}

function ZoneBlock({ label, data }: { label: string; data: { zone: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const filtered = data.filter((d) => d.count > 0);
  return (
    <Cat color="#6a1b9a" title={`${label} (${total})`}>
      {total === 0 ? (
        <TR><TD>データなし</TD><TDv>—</TDv></TR>
      ) : (
        <>
          {/* 棒グラフ */}
          <div className="flex" style={{ height: "14px" }}>
            {filtered.map((d) => (
              <div key={d.zone} className="flex items-center justify-center overflow-hidden"
                style={{ width: `${(d.count / total) * 100}%`, minWidth: "14px", backgroundColor: zoneColor(d.zone), color: "#fff" }}>
                <span className="text-[5px] font-bold">{d.zone}</span>
              </div>
            ))}
          </div>
          {filtered.map((d) => (
            <TR key={d.zone}><TD>{d.zone}</TD><TDv>{d.count}回 [{pct(d.count, total)}]</TDv></TR>
          ))}
        </>
      )}
    </Cat>
  );
}

function zoneColor(z: string): string {
  const n = parseInt(z); if (isNaN(n)) return "#757575";
  if (n <= 100) return "#1565c0";
  if (n <= 200) return "#2e7d32";
  if (n <= 300) return "#e65100";
  if (n <= 400) return "#ad1457";
  if (n <= 500) return "#6a1b9a";
  return "#b71c1c";
}

// ── 集計ヘルパー ────────────────────────────────────────────────────────────

function computeZoneDistribution(blocks: NormalBlock[], mode: "all" | "afterAT") {
  const filtered = mode === "all"
    ? blocks
    : blocks.filter((_, i) => i === 0 || blocks[i - 1].atWin);
  const zones = [...TG_ZONES].filter((z) => z !== "不明");
  return zones.map((zone) => ({ zone, count: filtered.filter((b) => b.zone === zone).length }));
}

function computeArimaPositions(atEntries: TGATEntry[]) {
  return [1, 3, 5].map((pos) => {
    let count = 0, total = 0;
    for (const entry of atEntries) {
      const sets = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
      if (sets.length >= pos) { total++; if (sets[pos - 1]?.character === "有馬") count++; }
    }
    return { pos, count, total };
  });
}

function inferSetting(czFail: string[], endScreen: string[], blocks: NormalBlock[], atEntries: TGATEntry[]): string {
  const hints: string[] = [];
  for (const s of [...czFail, ...endScreen]) {
    if (s.includes("設定6濃厚")) hints.push("6確定濃厚");
    else if (s.includes("設定5以上濃厚")) hints.push("5以上濃厚");
    else if (s.includes("設定4以上濃厚")) hints.push("4以上濃厚");
    else if (s.includes("設定3以上濃厚")) hints.push("3以上濃厚");
    else if (s.includes("設定2以上濃厚")) hints.push("2以上濃厚");
    else if (s.includes("設定1否定")) hints.push("1否定");
  }
  const allTrophies = [...blocks.map((b) => b.trophy), ...getAllSets(atEntries).map((s) => s.trophy ?? "")].filter(Boolean);
  for (const t of allTrophies) {
    if (t.includes("虹")) hints.push("6確定濃厚");
    else if (t.includes("喰種柄")) hints.push("5以上濃厚");
    else if (t.includes("金")) hints.push("4以上濃厚");
    else if (t.includes("銀")) hints.push("3以上濃厚");
    else if (t.includes("銅")) hints.push("2以上濃厚");
  }
  for (const entry of atEntries) {
    for (const row of entry.rows) {
      if (row.rowType !== "set" || !row.endingCard) continue;
      const ec = row.endingCard;
      if (ec.confirmed4 > 0) hints.push("6確定濃厚");
      if (ec.confirmed3 > 0) hints.push("5以上濃厚");
      if (ec.confirmed2 > 0) hints.push("4以上濃厚");
      if (ec.confirmed1 > 0) hints.push("3以上濃厚");
    }
  }
  if (hints.length === 0) return "情報不足";
  const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
  return [...new Set(hints)].sort((a, b) => priority.indexOf(a) - priority.indexOf(b)).join(" / ");
}
