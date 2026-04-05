"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 集計タブ v1.8
// 横スクロール禁止・iPhone Pro 幅完全収納
// sum-1〜sum-21 全項目表示
// =============================================================================

import { useRef, useCallback } from "react";
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
  totalGames: number | null; // sum-1: ユーザー入力
  onTotalGamesChange?: (v: number | null) => void;
}

// ── ユーティリティ ──────────────────────────────────────────────────────────────

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

function getAllArimas(entries: TGATEntry[]): TGArimaJudgment[] {
  return entries.flatMap((e) => e.rows.filter((r): r is TGArimaJudgment => r.rowType === "arima"));
}

function getBitesShort(bt: string): string {
  const m = bt.match(/^Table:(\S+)/);
  return m ? m[1] : bt.slice(0, 4);
}

// ── メインコンポーネント ─────────────────────────────────────────────────────

export function SummaryTab({ blocks, atEntries, totalGames, onTotalGamesChange }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);

  // ── 通常時集計 ──
  const sum2 = blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0); // 通常時消化G
  const sum1 = totalGames ?? sum2; // 総消化G（未入力時はsum2で代替）

  const czCount = blocks.filter((b) =>
    b.event === "レミニセンス" || b.event === "大喰いの利世"
  ).length;
  const epiCount = blocks.filter((b) => b.event === "エピソードボーナス").length;
  const directATCount = blocks.filter((b) => b.event === "直撃AT").length;
  const atWinCount = blocks.filter((b) => b.atWin).length;

  // ── 赫眼・精神世界 ──
  const allKakugan = blocks.flatMap((b) => b.kakugan);
  const kakuganTotal = allKakugan.length;
  const kakuganBreakdown = [...TG_KAKUGAN].map((k) => ({
    label: k, count: allKakugan.filter((v) => v === k).length,
  }));

  const allShinsekai = blocks.flatMap((b) => b.shinsekai);
  const shinsekaiTotal = allShinsekai.length;
  const shinsekaiBreakdown = [...TG_SHINSEKAI].map((s) => ({
    label: s, count: allShinsekai.filter((v) => v === s).length,
  }));

  // ── 設定示唆 ──
  const czFailSuggestions = blocks
    .filter((b) => b.endingSuggestion.startsWith("[cz失敗]"))
    .map((b) => b.endingSuggestion);

  const endScreenSuggestions = TG_ENDING_SUGGESTIONS
    .filter((s) => s.startsWith("[終了画面]"));
  const allEndScreenFromAT = getAllSets(atEntries)
    .map((s) => s.endingSuggestion ?? "")
    .filter((s) => s.startsWith("[終了画面]"));

  const trophyCount = blocks.filter((b) => b.trophy).length
    + getAllSets(atEntries).filter((s) => s.trophy).length;

  // 設定推定（簡易版: 確定情報から）
  const settingHints = inferSetting(czFailSuggestions, allEndScreenFromAT, trophyCount, blocks, atEntries);

  // ── AT集計 ──
  const allSets = getAllSets(atEntries);
  const allArimas = getAllArimas(atEntries);

  // キャラ別対決成績
  const charStats = [...TG_AT_CHARACTERS]
    .filter((c) => c !== "EDボナ")
    .map((char) => {
      const sets = allSets.filter((s) => s.character === char);
      const battles = sets.flatMap((s) => s.battles).filter((b) => b.result);
      const wins = battles.filter((b) => b.result === "○").length;
      const total = battles.length;
      return { char, sets: sets.length, wins, total };
    });

  // BITES テーブル分布
  const bitesStats = [...TG_BITES_TYPES].map((bt) => ({
    label: getBitesShort(bt),
    fullLabel: bt,
    count: allSets.filter((s) => s.bitesType === bt).length,
  }));
  const bitesTotal = allSets.filter((s) => s.bitesType).length;

  // BITES獲得履歴
  const bitesHistory = allSets
    .filter((s) => s.bitesCoins)
    .map((s) => ({ table: getBitesShort(s.bitesType), coins: s.bitesCoins }));

  // 直乗せ履歴
  const directAddHistory = allSets.flatMap((s) =>
    s.directAdds.filter((d) => d.trigger || d.coins != null)
      .map((d) => ({ trigger: d.trigger, coins: d.coins }))
  );

  // 有馬セット (1,3,5セット目)
  const arimaByPosition = computeArimaPositions(atEntries);

  // ゾーン内訳
  const zoneAll = computeZoneDistribution(blocks, "all");
  const zoneAfterAT = computeZoneDistribution(blocks, "afterAT");

  // ── 画像出力 ──
  const handleCapture = useCallback(async () => {
    if (!captureRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(captureRef.current, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `TG_Summary_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="pb-24">
      {/* 画像保存ボタン */}
      <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-end">
        <button
          onClick={handleCapture}
          className="text-[11px] font-mono font-bold px-4 py-2 rounded bg-gray-800 text-white active:scale-95 transition-transform"
        >
          画像で保存
        </button>
      </div>

      <div ref={captureRef} className="bg-white px-2 py-3 space-y-2">

        {/* ====== 通常時 ====== */}
        <CatHeader color="#1565c0" label="通常時" />
        <div className="grid grid-cols-2 gap-px bg-gray-300">
          <KV label="総消化G数" value={`${sum1.toLocaleString()} G`} />
          <KV label="通常時消化G数" value={`${sum2.toLocaleString()} G`} />
          <KV label="CZ(レミニ&利世)" value={`${czCount}回 ${prob(czCount, sum2)}`} />
          <KV label="エピボ" value={`${epiCount}回 ${prob(epiCount, sum2)}`} />
          <KV label="AT直撃" value={`${directATCount}回 ${prob(directATCount, sum2)}`} />
          <KV label="AT初当たり" value={`${atWinCount}回 ${prob(atWinCount, sum2)}`} />
        </div>

        {/* ====== 赫眼・精神世界 ====== */}
        <CatHeader color="#b71c1c" label="赫眼 / 精神世界" />
        <div className="grid grid-cols-2 gap-px bg-gray-300">
          <KV label="赫眼 回数" value={`${kakuganTotal}回 ${prob(kakuganTotal, sum1)}`} />
          <KV label="精神世界 回数" value={`${shinsekaiTotal}回 ${prob(shinsekaiTotal, sum2)}`} />
        </div>
        {kakuganTotal > 0 && (
          <BreakdownRow items={kakuganBreakdown} total={kakuganTotal} label="赫眼 内訳" />
        )}
        {shinsekaiTotal > 0 && (
          <BreakdownRow items={shinsekaiBreakdown} total={shinsekaiTotal} label="精神世界 内訳" />
        )}

        {/* ====== 設定示唆 ====== */}
        <CatHeader color="#e65100" label="設定示唆" />
        <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
          <p className="text-[8px] font-mono text-gray-500 mb-1">設定情報</p>
          <p className="text-[11px] font-mono font-bold text-gray-900">{settingHints || "情報不足"}</p>
        </div>

        {/* CZ失敗 終了画面示唆 */}
        {czFailSuggestions.length > 0 && (
          <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
            <p className="text-[8px] font-mono text-gray-500 mb-1">[cz失敗] 終了画面示唆</p>
            <div className="space-y-0.5">
              {groupCount(czFailSuggestions).map(({ value, count }) => (
                <p key={value} className="text-[8px] font-mono text-gray-700">
                  {extractSuggestionName(value)} <span className="font-bold">{count}回</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* [終了画面] 示唆 (AT側) */}
        <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
          <p className="text-[8px] font-mono text-gray-500 mb-1">[終了画面] 示唆</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {endScreenSuggestions.map((s) => {
              const c = allEndScreenFromAT.filter((v) => v === s).length;
              const t = allEndScreenFromAT.length;
              return (
                <p key={s} className="text-[8px] font-mono text-gray-700 truncate">
                  {extractSuggestionName(s)} <span className="font-bold">{c}回</span>{t > 0 && ` [${pct(c, t)}]`}
                </p>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-300">
          <KV label="トロフィーその他" value={`${trophyCount}回`} />
        </div>

        {/* ====== AT ====== */}
        <CatHeader color="#2e7d32" label="AT" />

        {/* キャラ対決成績 */}
        <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
          <p className="text-[8px] font-mono text-gray-500 mb-1">キャラクターと対決成績</p>
          <div className="grid grid-cols-3 gap-1">
            {charStats.map(({ char, sets, wins, total }) => (
              <div key={char} className="bg-white border border-gray-200 rounded px-1 py-1 text-center">
                <p className="text-[9px] font-mono font-bold text-gray-800">{char}</p>
                <p className="text-[7px] font-mono text-gray-500">{sets}set</p>
                <p className="text-[8px] font-mono font-bold">
                  {total > 0 ? `${wins}/${total}` : "—"}
                  {total > 0 && <span className="text-[7px] ml-0.5 opacity-70">[{pct(wins, total)}]</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BITES テーブル */}
        <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
          <p className="text-[8px] font-mono text-gray-500 mb-1">BITESテーブル</p>
          <div className="grid grid-cols-3 gap-1">
            {bitesStats.map(({ label, count }) => (
              <div key={label} className="flex justify-between bg-white border border-gray-200 rounded px-1.5 py-0.5">
                <span className="text-[8px] font-mono font-bold text-gray-700">{label}</span>
                <span className="text-[8px] font-mono">{count}回 {bitesTotal > 0 && `[${pct(count, bitesTotal)}]`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BITES獲得履歴 */}
        {bitesHistory.length > 0 && (
          <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
            <p className="text-[8px] font-mono text-gray-500 mb-1">BITES獲得履歴</p>
            <div className="flex flex-wrap gap-0.5">
              {bitesHistory.map((h, i) => (
                <SquareIcon key={i} top={h.table} bottom={h.coins} color="#14532d" />
              ))}
            </div>
          </div>
        )}

        {/* 有馬セット */}
        {arimaByPosition.length > 0 && (
          <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
            <p className="text-[8px] font-mono text-gray-500 mb-1">有馬set (1,3,5セット目)</p>
            <div className="grid grid-cols-3 gap-1">
              {arimaByPosition.map(({ pos, count, total }) => (
                <div key={pos} className="bg-white border border-gray-200 rounded px-1 py-1 text-center">
                  <p className="text-[8px] font-mono text-gray-500">{pos}セット目</p>
                  <p className="text-[9px] font-mono font-bold">
                    {count}回{total > 0 && ` [${pct(count, total)}]`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 直乗せ履歴 */}
        {directAddHistory.length > 0 && (
          <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
            <p className="text-[8px] font-mono text-gray-500 mb-1">直乗せ履歴</p>
            <div className="flex flex-wrap gap-0.5">
              {directAddHistory.map((d, i) => (
                <SquareIcon key={i} top={d.trigger} bottom={d.coins != null ? String(d.coins) : "—"} color="#1565c0" />
              ))}
            </div>
          </div>
        )}

        {/* ====== ゾーン ====== */}
        <CatHeader color="#6a1b9a" label="通常時モード / ゾーン" />
        <ZoneTable label="ゾーン内訳 [全体]" data={zoneAll} />
        <ZoneTable label="ゾーン内訳 [リセ頭]" data={zoneAfterAT} />

      </div>
    </div>
  );
}

// ── サブコンポーネント ────────────────────────────────────────────────────────

function CatHeader({ color, label }: { color: string; label: string }) {
  return (
    <div className="rounded-sm px-2 py-1" style={{ backgroundColor: color }}>
      <span className="text-[9px] font-mono font-bold text-white tracking-wider">{label}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-2 py-1.5 flex items-baseline justify-between gap-1">
      <span className="text-[8px] font-mono text-gray-500 shrink-0">{label}</span>
      <span className="text-[10px] font-mono font-bold text-gray-900 text-right">{value}</span>
    </div>
  );
}

function BreakdownRow({ items, total, label }: {
  items: { label: string; count: number }[];
  total: number;
  label: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1">
      <p className="text-[8px] font-mono text-gray-500 mb-0.5">{label}</p>
      <div className="flex gap-2">
        {items.map((item) => (
          <span key={item.label} className="text-[8px] font-mono text-gray-700">
            {item.label}: <span className="font-bold">{item.count}回</span>
            {total > 0 && <span className="opacity-70"> [{pct(item.count, total)}]</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function SquareIcon({ top, bottom, color }: { top: string; bottom: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded border overflow-hidden"
      style={{ width: "30px", height: "28px", borderColor: color }}
    >
      <span className="text-[6px] font-mono font-bold leading-none text-center w-full truncate px-0.5"
        style={{ backgroundColor: color, color: "#fff" }}>
        {top}
      </span>
      <span className="text-[8px] font-mono font-bold leading-none mt-0.5 text-gray-800">
        {bottom}
      </span>
    </div>
  );
}

function ZoneTable({ label, data }: { label: string; data: { zone: string; count: number; total: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
      <p className="text-[8px] font-mono text-gray-500">{label}: データなし</p>
    </div>
  );

  return (
    <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5">
      <p className="text-[8px] font-mono text-gray-500 mb-1">{label} (計{total}回)</p>
      {/* 棒グラフ */}
      <div className="flex rounded overflow-hidden border border-gray-300" style={{ height: "18px" }}>
        {data.filter((d) => d.count > 0).map((d) => (
          <div
            key={d.zone}
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: `${(d.count / total) * 100}%`,
              minWidth: d.count > 0 ? "16px" : 0,
              backgroundColor: zoneBarColor(d.zone),
              color: "#fff",
            }}
          >
            <span className="text-[6px] font-mono font-bold whitespace-nowrap">{d.zone}</span>
          </div>
        ))}
      </div>
      {/* テーブル */}
      <div className="grid grid-cols-5 gap-0.5 mt-1">
        {data.filter((d) => d.count > 0).map((d) => (
          <div key={d.zone} className="text-center">
            <p className="text-[7px] font-mono text-gray-500">{d.zone}</p>
            <p className="text-[8px] font-mono font-bold">{d.count} <span className="opacity-60">[{pct(d.count, total)}]</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}

function zoneBarColor(zone: string): string {
  const n = parseInt(zone);
  if (n <= 100) return "#1565c0";
  if (n <= 200) return "#2e7d32";
  if (n <= 300) return "#e65100";
  if (n <= 400) return "#ad1457";
  if (n <= 500) return "#6a1b9a";
  return "#b71c1c";
}

// ── 集計ヘルパー ─────────────────────────────────────────────────────────────

function groupCount(arr: string[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of arr) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([value, count]) => ({ value, count }));
}

function extractSuggestionName(s: string): string {
  const m = s.match(/\]\s*(.+?)\s*-/);
  return m ? m[1] : s;
}

function computeZoneDistribution(
  blocks: NormalBlock[],
  mode: "all" | "afterAT",
): { zone: string; count: number; total: number }[] {
  let filtered: NormalBlock[];
  if (mode === "all") {
    filtered = blocks;
  } else {
    // リセ頭: AT終了後の最初のブロックのみ
    filtered = [];
    for (let i = 0; i < blocks.length; i++) {
      if (i === 0 || blocks[i - 1].atWin) {
        filtered.push(blocks[i]);
      }
    }
  }

  const zones = [...TG_ZONES].filter((z) => z !== "不明");
  const total = filtered.length;
  return zones.map((zone) => ({
    zone,
    count: filtered.filter((b) => b.zone === zone).length,
    total,
  }));
}

function computeArimaPositions(atEntries: TGATEntry[]): { pos: number; count: number; total: number }[] {
  const positions = [1, 3, 5];
  return positions.map((pos) => {
    let count = 0;
    let total = 0;
    for (const entry of atEntries) {
      const sets = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
      if (sets.length >= pos) {
        total++;
        if (sets[pos - 1]?.character === "有馬") count++;
      }
    }
    return { pos, count, total };
  });
}

function inferSetting(
  czFail: string[],
  endScreen: string[],
  trophyCount: number,
  blocks: NormalBlock[],
  atEntries: TGATEntry[],
): string {
  const hints: string[] = [];

  // CZ失敗エンドカードから
  const all = [...czFail, ...endScreen];
  for (const s of all) {
    if (s.includes("設定6濃厚")) hints.push("6確定濃厚");
    else if (s.includes("設定4以上濃厚")) hints.push("4以上濃厚");
    else if (s.includes("設定5以上濃厚")) hints.push("5以上濃厚");
    else if (s.includes("設定3以上濃厚")) hints.push("3以上濃厚");
    else if (s.includes("設定2以上濃厚")) hints.push("2以上濃厚");
    else if (s.includes("設定1否定")) hints.push("1否定");
  }

  // トロフィーから
  const allTrophies = [
    ...blocks.map((b) => b.trophy),
    ...getAllSets(atEntries).map((s) => s.trophy ?? ""),
  ].filter(Boolean);
  for (const t of allTrophies) {
    if (t.includes("虹トロフィー")) hints.push("6確定濃厚");
    else if (t.includes("喰種柄トロフィー")) hints.push("5以上濃厚");
    else if (t.includes("金トロフィー")) hints.push("4以上濃厚");
    else if (t.includes("銀トロフィー")) hints.push("3以上濃厚");
    else if (t.includes("銅トロフィー")) hints.push("2以上濃厚");
  }

  // エンディングカードの確定系
  for (const entry of atEntries) {
    for (const row of entry.rows) {
      if (row.rowType !== "set") continue;
      const ec = row.endingCard;
      if (!ec) continue;
      if (ec.confirmed4 > 0) hints.push("6確定濃厚");
      if (ec.confirmed3 > 0) hints.push("5以上濃厚");
      if (ec.confirmed2 > 0) hints.push("4以上濃厚");
      if (ec.confirmed1 > 0) hints.push("3以上濃厚");
    }
  }

  if (hints.length === 0) return "情報不足";

  // 最も強い情報を返す
  const unique = [...new Set(hints)];
  const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
  const sorted = unique.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  return sorted.join(" / ");
}
