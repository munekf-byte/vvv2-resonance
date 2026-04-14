"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 集計タブ v3.0
// 全セクション統一グリッドテーブル化
// 基本法則: 列ヘッダー(薄色) + 縦横罫線 + セル中央揃え + 固定列幅
// =============================================================================

import { useRef, useState, useEffect } from "react";
import { captureAndDownload, captureAndShare } from "@/lib/tg/captureImage";
import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment } from "@/types";
import {
  TG_KAKUGAN, TG_SHINSEKAI,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES,
  TG_AT_CHARACTERS, TG_BITES_TYPES,
  TG_ZONES, TG_INVITATIONS,
  TG_ENDING_CARD_LABELS, TG_COPPER_CARD_TYPES, TG_CONFIRMED_CARD_TYPES,
} from "@/lib/engine/constants";
import {
  gradeByProb, gradeByRate, SETTING_COLORS,
  CZ_PROB, EPI_PROB, DIRECT_AT_PROB, AT_COMBINED_PROB,
  URA_AT_RATE, HIKIMODOHI_RATE,
  type SettingGrade,
} from "@/lib/tg/settingDiff";
import {
  sessionZoneExact, sessionZoneProrate,
  type ZoneData,
} from "@/lib/tg/analytics";

interface Props {
  blocks: NormalBlock[];
  atEntries: TGATEntry[];
  sessionId: string;
  userSettingGuess?: string | null;
  uchidashi?: import("@/types").UchidashiState | null;
  finalResult?: number;
  userBalance?: number | null;
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

// ── 共通テーブルグリッド部品 ─────────────────────────────────────────────

/** カテゴリ枠 */
function Cat({ color, title, children, mb }: {
  color: string; title: string; children: React.ReactNode; mb?: boolean;
}) {
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: "3px", overflow: "hidden", marginBottom: mb ? "4px" : 0 }}>
      <div style={{ backgroundColor: color, padding: "4px 6px", display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 900, color: "#fff", lineHeight: 1.4, letterSpacing: "0.5px" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/** テーブルヘッダー行 */
function THead({ cols, color }: { cols: { label: string; width: string }[]; color: string }) {
  // 色を薄くする（カテゴリ色のライト版）
  const lightBg = `${color}18`;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols.map((c) => c.width).join(" "),
      borderBottom: `2px solid ${color}`,
      backgroundColor: lightBg,
    }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          fontSize: "7px", fontWeight: 700, color: "#6b7280",
          textAlign: i === 0 ? "left" : "right",
          padding: "2px 4px", lineHeight: 1.5,
          borderRight: i < cols.length - 1 ? "1px solid #d1d5db" : "none",
        }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** テーブルデータ行 */
function TRow({ cols, values, i, grade, bg, fg }: {
  cols: { width: string }[];
  values: React.ReactNode[];
  i: number;
  grade?: SettingGrade;
  bg?: string;
  fg?: string;
}) {
  const sc = grade ? SETTING_COLORS[grade] : null;
  const baseBg = bg ? bg : (i % 2 === 0 ? "#ffffff" : "#f7f7f7");
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols.map((c) => c.width).join(" "),
      backgroundColor: sc && grade !== "neutral" ? sc.bg : baseBg,
      color: fg ? fg : (sc && grade !== "neutral" ? sc.color : undefined),
      borderBottom: "1px solid #e5e7eb",
      ...(grade === "vhigh" ? { fontWeight: 700 } : {}),
    }}>
      {values.map((v, ci) => (
        <div key={ci} style={{
          display: "flex", alignItems: "center",
          justifyContent: ci === 0 ? "flex-start" : "flex-end",
          padding: "3px 4px",
          fontSize: ci === 0 ? "8px" : "9px",
          fontWeight: ci === 0 ? 400 : 700,
          color: ci === 0 ? (sc && grade !== "neutral" ? undefined : "#4b5563") : undefined,
          lineHeight: 1.5,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          borderRight: ci < values.length - 1 ? "1px solid #e5e7eb" : "none",
          fontVariantNumeric: ci > 0 ? "tabular-nums" : undefined,
        }}>
          {v}
        </div>
      ))}
    </div>
  );
}

function SqIcon({ top, bottom, bg }: { top: string; bottom: string; bg: string }) {
  return (
    <div style={{ width: "30px", display: "flex", flexDirection: "column", alignItems: "center", border: `1px solid ${bg}`, borderRadius: "2px", overflow: "hidden" }}>
      <span style={{ fontSize: "6px", fontWeight: 700, backgroundColor: bg, color: "#fff", width: "100%", textAlign: "center", lineHeight: 1.6, overflow: "hidden" }}>{top}</span>
      <span style={{ fontSize: "9px", fontWeight: 700, color: "#1f2937", lineHeight: 1.6 }}>{bottom}</span>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────────────

export function SummaryTab({ blocks, atEntries, sessionId, userSettingGuess, uchidashi, finalResult, userBalance }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);

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

  const sum2 = blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);
  const rawInput = totalGInput ? parseInt(totalGInput) || 0 : 0;
  const uchidashiG = uchidashi?.totalGames ?? 0;
  // 実稼働G数 = 液晶総消化G数 − 打ち出しトータルG数（入力がなければ周期合算にフォールバック）
  const sum1 = rawInput > 0 ? rawInput - uchidashiG : sum2;

  const czCount = blocks.filter((b) => b.event === "レミニセンス" || b.event === "大喰いの利世").length;

  // CZ内容集計
  const czBlocks = blocks.filter((b) => b.czCounter && (b.czCounter.bell > 0 || b.czCounter.replay > 0 || b.czCounter.weakRare > 0 || b.czCounter.strongRare > 0));
  const czTotalBell = czBlocks.reduce((s, b) => s + (b.czCounter?.bell ?? 0), 0);
  const czTotalReplay = czBlocks.reduce((s, b) => s + (b.czCounter?.replay ?? 0), 0);
  const czTotalWeakRare = czBlocks.reduce((s, b) => s + (b.czCounter?.weakRare ?? 0), 0);
  const czTotalStrongRare = czBlocks.reduce((s, b) => s + (b.czCounter?.strongRare ?? 0), 0);
  const czHitBell = czBlocks.filter((b) => b.czCounter?.hitRole === "bell").length;
  const czHitReplay = czBlocks.filter((b) => b.czCounter?.hitRole === "replay").length;
  const czHitWeakRare = czBlocks.filter((b) => b.czCounter?.hitRole === "weakRare").length;
  const czHitStrongRare = czBlocks.filter((b) => b.czCounter?.hitRole === "strongRare").length;
  const czSuccessCount = czBlocks.filter((b) => !!b.czCounter?.hitRole).length;
  const epiCount = blocks.filter((b) => b.event === "エピソードボーナス").length;
  const directATCount = blocks.filter((b) => b.event === "直撃AT").length;
  const atWinCount = blocks.filter((b) => b.atWin).length;

  const allKakugan = [
    ...blocks.flatMap((b) => b.kakugan),
    ...getAllSets(atEntries).flatMap((s) => s.kakugan ?? []),
  ];
  const edKakuganTotal = getAllSets(atEntries).reduce((s, set) => s + (set.edKakuganCount ?? 0), 0);
  const kakuganTotal = allKakugan.length + edKakuganTotal;
  const kakuganBD = [...TG_KAKUGAN].map((k) => ({ label: k, count: allKakugan.filter((v) => v === k).length }));

  const allShinsekai = blocks.flatMap((b) => b.shinsekai);
  const shinsekaiTotal = allShinsekai.length;
  const shinsekaiBS = [...TG_SHINSEKAI].map((s) => ({ label: s, count: allShinsekai.filter((v) => v === s).length }));

  const czFailSuggestions = blocks.filter((b) => b.endingSuggestion.startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
  const endScreenItems = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[終了画面]"));
  const allEndScreenFromAT = getAllSets(atEntries).map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));

  const trophyCount = blocks.filter((b) => b.trophy).length + getAllSets(atEntries).filter((s) => s.trophy).length;
  const settingHints = inferSetting(czFailSuggestions, allEndScreenFromAT, blocks, atEntries);

  const hikimodoCount = blocks.filter((b) => b.event === "引き戻し").length;

  const allSets = getAllSets(atEntries);
  const atEntriesWithType = atEntries.map((e) => {
    const firstSet = e.rows.find((r): r is TGATSet => r.rowType === "set");
    return firstSet?.atType ?? "通常AT";
  });
  const uraATEntryCount = atEntriesWithType.filter((t) => t === "裏AT" || t === "隠れ裏AT（推測）").length;

  const allInvitations = blocks.flatMap((b) => b.invitation);
  const invSettingItems = [...TG_INVITATIONS].filter((inv) =>
    inv.includes("偶数") || inv.includes("設定") || inv.includes("存分に") || inv.includes("特別な夜")
  );

  const charStats = [...TG_AT_CHARACTERS].filter((c) => c !== "EDボナ").map((char) => {
    const sets = allSets.filter((s) => s.character === char);
    const battles = sets.flatMap((s) => s.battles).filter((b) => b.result);
    return { char, sets: sets.length, wins: battles.filter((b) => b.result === "○").length, total: battles.length };
  });

  const bitesStats = [...TG_BITES_TYPES].map((bt) => ({ label: getBitesShort(bt), count: allSets.filter((s) => s.bitesType === bt).length }));
  const bitesTotal = allSets.filter((s) => s.bitesType).length;
  const bitesHistoryByAT: { atKey: string; items: { table: string; coins: string }[] }[] = atEntries.map((e) => ({
    atKey: e.atKey,
    items: e.rows.filter((r): r is TGATSet => r.rowType === "set" && !!r.bitesCoins)
      .map((s) => ({ table: getBitesShort(s.bitesType), coins: s.bitesCoins })),
  })).filter((g) => g.items.length > 0);

  const directHistoryByAT: { atKey: string; items: { trigger: string; coins: number | null }[] }[] = atEntries.map((e) => ({
    atKey: e.atKey,
    items: e.rows.filter((r): r is TGATSet => r.rowType === "set")
      .flatMap((s) => s.directAdds.filter((d) => d.trigger || d.coins != null).map((d) => ({ trigger: d.trigger, coins: d.coins }))),
  })).filter((g) => g.items.length > 0);
  const arimaByPos = computeArimaPositions(atEntries);

  // エンディングカード全AT集計
  const allEndingCards = getAllSets(atEntries).map((s) => s.endingCard).filter(Boolean) as import("@/types").TGEndingCard[];
  const ecSum = (key: keyof import("@/types").TGEndingCard) => allEndingCards.reduce((s, ec) => s + (ec[key] ?? 0), 0);
  const ecTotal =
    ecSum("whiteWeak") + ecSum("whiteStrong") + ecSum("blueWeak") + ecSum("blueStrong") +
    ecSum("redWeak") + ecSum("redStrong") + ecSum("copper1") + ecSum("copper2") +
    ecSum("copper3") + ecSum("copper4") + ecSum("confirmed1") + ecSum("confirmed2") +
    ecSum("confirmed3") + ecSum("confirmed4");

  const sessionForZone = { normalBlocks: blocks, uchidashi: uchidashi ?? null };
  const zoneAllExact     = sessionZoneExact(sessionForZone, "all");
  const zoneAllProrate   = sessionZoneProrate(sessionForZone, "all");
  const zoneATExact      = sessionZoneExact(sessionForZone, "afterAT");
  const zoneATProrate    = sessionZoneProrate(sessionForZone, "afterAT");

  // 共通列定義
  const COLS3 = [{ label: "項目", width: "1fr" }, { label: "回数", width: "52px" }, { label: "確率", width: "64px" }];
  const COLS3_PCT = [{ label: "項目", width: "1fr" }, { label: "回数", width: "44px" }, { label: "割合", width: "52px" }];
  const COLS_CZ = [{ label: "役", width: "1fr" }, { label: "発生", width: "40px" }, { label: "当選", width: "40px" }, { label: "当選率", width: "48px" }];
  const COLS_CHAR = [{ label: "キャラ", width: "1fr" }, { label: "成績", width: "52px" }, { label: "勝率", width: "48px" }];
  const COLS_SUGG = [{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "40px" }, { label: "割合", width: "48px" }];
  const COLS_INV = [{ label: "招待状", width: "1fr" }, { label: "回数", width: "40px" }, { label: "示唆", width: "1fr" }];

  function handleCapture() {
    if (!captureRef.current) return;
    captureAndDownload(captureRef.current, `TG_Summary_${new Date().toISOString().slice(0, 10)}.png`);
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <p className="text-[10px] font-mono font-bold text-red-600 leading-tight">
          ※ 液晶画面の総消化ゲーム数を下記に入力してください
        </p>
        <div className="flex gap-1.5 flex-shrink-0 ml-2">
          <button
            onClick={() => captureRef.current && captureAndShare(captureRef.current, `TG_Summary_${new Date().toISOString().slice(0, 10)}.png`, `#東京喰種レゾナンス #パチスロ`)}
            className="text-[10px] font-mono font-bold px-3 py-2 rounded text-white active:scale-95 transition-transform"
            style={{ backgroundColor: "#000000" }}>
            𝕏 共有
          </button>
          <button onClick={handleCapture}
            className="text-[10px] font-mono font-bold px-3 py-2 rounded bg-gray-800 text-white active:scale-95 transition-transform">
            画像で保存
          </button>
        </div>
      </div>

      {/* ===== 液晶総消化G数 入力欄（テーブル外・トップ） ===== */}
      <div style={{ padding: "8px 6px 0", backgroundColor: "#ffffff" }}>
        <div style={{
          border: "2px solid #ca8a04", borderRadius: "6px", backgroundColor: "#fffbeb",
          padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#92400e", fontFamily: "monospace", display: "block", lineHeight: 1.4 }}>
              液晶画面の
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#92400e", fontFamily: "monospace", display: "block", lineHeight: 1.4 }}>
              総消化ゲーム数
            </span>
          </div>
          <input type="number" value={totalGInput} onChange={(e) => handleTotalGChange(e.target.value)}
            placeholder="液晶の数値を入力"
            style={{
              flex: 1, backgroundColor: "#ffffff", border: "2px solid #ca8a04", borderRadius: "4px",
              fontSize: "16px", fontFamily: "monospace", fontWeight: 700, textAlign: "right",
              padding: "6px 8px", outline: "none",
            }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", fontFamily: "monospace", flexShrink: 0 }}>G</span>
        </div>
        {uchidashiG > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 2px 0", fontSize: "8px", fontFamily: "monospace", color: "#6b7280" }}>
            <span>打ち出し時: {uchidashiG.toLocaleString()}G</span>
            <span style={{ fontWeight: 700, color: rawInput > 0 ? "#14532d" : "#9ca3af" }}>
              実稼働: {rawInput > 0 ? `${(rawInput - uchidashiG).toLocaleString()}G` : "—"}
            </span>
          </div>
        )}
      </div>

      <div ref={captureRef} style={{ padding: "8px 6px", backgroundColor: "#ffffff", fontFamily: "monospace" }}>

        {/* ===== 0. SESSION RESULT ===== */}
        {(finalResult != null || userBalance != null) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "6px 4px", borderRadius: "3px",
              border: `2px solid ${finalResult != null ? (finalResult >= 0 ? "#16a34a" : "#dc2626") : "#d1d5db"}`,
              backgroundColor: finalResult != null ? (finalResult >= 0 ? "#f0fdf4" : "#fef2f2") : "#f9fafb",
            }}>
              <span style={{ fontSize: "8px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>計算上台差枚（概算）</span>
              <span style={{
                fontSize: "14px", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                color: finalResult != null ? (finalResult >= 0 ? "#16a34a" : "#dc2626") : "#9ca3af",
              }}>
                {finalResult != null ? `${finalResult >= 0 ? "+" : ""}${finalResult.toLocaleString()}枚` : "—"}
              </span>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "6px 4px", borderRadius: "3px",
              border: `2px solid ${userBalance != null ? (userBalance >= 0 ? "#16a34a" : "#dc2626") : "#d1d5db"}`,
              backgroundColor: userBalance != null ? (userBalance >= 0 ? "#f0fdf4" : "#fef2f2") : "#f9fafb",
            }}>
              <span style={{ fontSize: "8px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>あなたの収支</span>
              <span style={{
                fontSize: "14px", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                color: userBalance != null ? (userBalance >= 0 ? "#16a34a" : "#dc2626") : "#9ca3af",
              }}>
                {userBalance != null ? `${userBalance >= 0 ? "+" : ""}${userBalance.toLocaleString()}枚` : "未入力"}
              </span>
            </div>
          </div>
        )}

        {/* ===== 1. 通常時 | CZ内容 ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1565c0" title="通常時">
            <THead cols={COLS3} color="#1565c0" />
            <TRow cols={COLS3} i={0} values={[<b key="l">実稼働G数</b>, `${sum1.toLocaleString()}G`, "—"]} />
            <TRow cols={COLS3} i={1} values={[<b key="l">通常時G</b>, `${sum2.toLocaleString()}G`, "—"]} />
            <TRow cols={COLS3} i={2} values={[<b key="l">CZ</b>, `${czCount}回`, prob(czCount, sum2)]} grade={gradeByProb(czCount, sum2, [...CZ_PROB])} />
            <TRow cols={COLS3} i={3} values={[<b key="l">エピボ</b>, `${epiCount}回`, prob(epiCount, sum2)]} grade={gradeByProb(epiCount, sum2, [...EPI_PROB])} />
            <TRow cols={COLS3} i={4} values={[<b key="l">AT直撃</b>, `${directATCount}回`, prob(directATCount, sum2)]} grade={gradeByProb(directATCount, sum2, [...DIRECT_AT_PROB])} />
            <TRow cols={COLS3} i={5} values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
          </Cat>
          <Cat color="#7b1fa2" title="CZ内容">
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 52px 64px",
              borderBottom: "2px solid #7b1fa2", backgroundColor: "#f3e8ff", padding: "3px 4px",
            }}>
              <span style={{ fontSize: "8px", fontWeight: 700, color: "#4b5563" }}>CZ記録数</span>
              <span style={{ fontSize: "9px", fontWeight: 700, textAlign: "right", borderLeft: "1px solid #d1d5db", paddingLeft: "4px" }}>{czBlocks.length}回</span>
              <span style={{ fontSize: "8px", fontWeight: 700, textAlign: "right", color: "#7b1fa2", borderLeft: "1px solid #d1d5db", paddingLeft: "4px" }}>
                成功{czSuccessCount} ({czBlocks.length > 0 ? pct(czSuccessCount, czBlocks.length) : "—"})
              </span>
            </div>
            <THead cols={COLS_CZ} color="#7b1fa2" />
            {([
              { label: "押/斜🔔", total: czTotalBell, hit: czHitBell },
              { label: "リプ", total: czTotalReplay, hit: czHitReplay },
              { label: "弱レア", total: czTotalWeakRare, hit: czHitWeakRare },
              { label: "強レア", total: czTotalStrongRare, hit: czHitStrongRare },
            ] as const).map((r, i) => (
              <TRow key={r.label} cols={COLS_CZ} i={i} values={[
                r.label, `${r.total}回`,
                r.hit > 0 ? <span key="h" style={{ color: "#b91c1c" }}>★{r.hit}</span> : "—",
                r.total > 0 ? pct(r.hit, r.total) : "—",
              ]} />
            ))}
          </Cat>
        </div>

        {/* ===== 2. AT初当たり | 設定示唆（並列半幅） ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#2e7d32" title="AT">
            <THead cols={COLS3} color="#2e7d32" />
            <TRow cols={COLS3} i={0} values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
            <TRow cols={COLS3} i={1} values={[<b key="l">引き戻し率</b>, `${hikimodoCount}回`, atWinCount > 0 ? pct(hikimodoCount, atWinCount) : "—"]}
              grade={gradeByRate(hikimodoCount, atWinCount, HIKIMODOHI_RATE[0], HIKIMODOHI_RATE[5])} />
            <TRow cols={COLS3} i={2} values={[<b key="l">裏AT突入率</b>, `${uraATEntryCount}回`, atWinCount > 0 ? pct(uraATEntryCount, atWinCount) : "—"]}
              grade={gradeByRate(uraATEntryCount, atWinCount, URA_AT_RATE[0], URA_AT_RATE[5])} />
          </Cat>
          <Cat color="#e65100" title="設定示唆">
            <THead cols={[{ label: "項目", width: "1fr" }, { label: "内容", width: "1fr" }]} color="#e65100" />
            <TRow cols={[{ width: "1fr" }, { width: "1fr" }]} i={0} values={[<b key="l">確定設定</b>, <b key="v">{settingHints || "情報不足"}</b>]} />
            <TRow cols={[{ width: "1fr" }, { width: "1fr" }]} i={1} values={[<b key="l">推測設定</b>, <b key="v">{userSettingGuess || "未入力"}</b>]} />
            <TRow cols={[{ width: "1fr" }, { width: "1fr" }]} i={2} values={[<b key="l">トロフィー</b>, `${trophyCount}回`]} />
          </Cat>
        </div>

        {/* ===== 2b. 有馬set（AT+設定示唆の直下） ===== */}
        {arimaByPos.some((a) => a.total > 0) && (
          <Cat color="#f59e0b" title="有馬set（1,3,5セット目）" mb>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px", padding: "4px" }}>
              {arimaByPos.map(({ pos, count, total }) => (
                <div key={pos} style={{ textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "2px", padding: "3px 0", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: "7px", color: "#6b7280", lineHeight: 1.4 }}>{pos}set目</div>
                  <div style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.4 }}>{count}回 [{pct(count, total)}]</div>
                </div>
              ))}
            </div>
          </Cat>
        )}

        {/* ===== 3. 赫眼 / 精神世界 ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#b71c1c" title="赫眼">
            <THead cols={COLS3_PCT} color="#b71c1c" />
            <TRow cols={COLS3_PCT} i={0} values={[<b key="l">合計</b>, `${kakuganTotal}回`, prob(kakuganTotal, sum1)]} />
            {kakuganBD.map((k, i) => (
              <TRow key={k.label} cols={COLS3_PCT} i={i + 1} values={[`　${k.label}`, `${k.count}回`, pct(k.count, kakuganTotal)]} />
            ))}
          </Cat>
          <Cat color="#1a237e" title="精神世界">
            <THead cols={COLS3_PCT} color="#1a237e" />
            <TRow cols={COLS3_PCT} i={0} values={[<b key="l">合計</b>, `${shinsekaiTotal}回`, prob(shinsekaiTotal, sum2)]} />
            {shinsekaiBS.map((s, i) => (
              <TRow key={s.label} cols={COLS3_PCT} i={i + 1} values={[`　${s.label}`, `${s.count}回`, pct(s.count, shinsekaiTotal)]}
                grade={s.label === "精神33G" && s.count > 0 ? gradeByRate(s.count, shinsekaiTotal, 25, 60) : undefined} />
            ))}
          </Cat>
        </div>

        {/* ===== 4. CZ失敗 / 終了画面（ゾーン集計の直上） ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#bf360c" title="[cz失敗] 終了画面">
            <THead cols={[{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "44px" }]} color="#bf360c" />
            {TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]")).map((s, i) => {
              const c = czFailSuggestions.filter((v) => v === s).length;
              return <TRow key={s} cols={[{ width: "1fr" }, { width: "44px" }]} i={i} bg={suggBg(s)} fg={suggTextColor(s)} values={[extractName(s), `${c}回`]} />;
            })}
          </Cat>
          <Cat color="#4e342e" title="[終了画面] 示唆">
            <THead cols={COLS_SUGG} color="#4e342e" />
            {endScreenItems.map((s, i) => {
              const c = allEndScreenFromAT.filter((v) => v === s).length;
              const t = allEndScreenFromAT.length;
              return <TRow key={s} cols={COLS_SUGG} i={i} bg={suggBg(s)} fg={suggTextColor(s)} values={[extractName(s), `${c}回`, pct(c, t)]} />;
            })}
          </Cat>
        </div>

        {/* ===== 5. ゲーム数ゾーン集計（確定） ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <ZoneBlock label="全体[確定]" data={zoneAllExact} headerColor="#1565c0" />
          <ZoneBlock label="AT後[確定]" data={zoneATExact} headerColor="#e65100" />
        </div>

        {/* ===== 6. ゲーム数ゾーン集計（按分） ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <ZoneBlock label="全体[按分]" data={zoneAllProrate} prorated headerColor="#1565c0" showDesc />
          <ZoneBlock label="AT後[按分]" data={zoneATProrate} prorated headerColor="#e65100" showDesc />
        </div>

        {/* ===== 7. キャラ対決 / BITES ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1b5e20" title="キャラ対決成績">
            <THead cols={COLS_CHAR} color="#1b5e20" />
            {charStats.map(({ char, wins, total }, i) => (
              <TRow key={char} cols={COLS_CHAR} i={i} values={[
                char, total > 0 ? `${wins}/${total}` : "—", total > 0 ? pct(wins, total) : "—",
              ]} />
            ))}
          </Cat>
          <Cat color="#33691e" title="BITESテーブル">
            <THead cols={COLS3_PCT} color="#33691e" />
            {bitesStats.map(({ label, count }, i) => (
              <TRow key={label} cols={COLS3_PCT} i={i} values={[label, `${count}回`, pct(count, bitesTotal)]} />
            ))}
          </Cat>
        </div>

        {/* ===== 8. BITES獲得履歴（AT単位改行・揃え） ===== */}
        {bitesHistoryByAT.length > 0 && (
          <Cat color="#14532d" title="BITES獲得履歴" mb>
            <div style={{ padding: "4px" }}>
              {bitesHistoryByAT.map((group, gi) => {
                const bgColor = gi % 2 === 0 ? "#e8f5e9" : "#fff8e1";
                const LW = "24px";
                return (
                  <div key={group.atKey} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1px", backgroundColor: bgColor, borderRadius: "3px", padding: "2px 3px", marginBottom: "2px" }}>
                    <span style={{ width: LW, fontSize: "7px", fontWeight: 700, color: "#374151", lineHeight: 1.5, flexShrink: 0 }}>{group.atKey}</span>
                    {group.items.map((h, i) => <SqIcon key={i} top={h.table} bottom={h.coins} bg="#14532d" />)}
                  </div>
                );
              })}
            </div>
          </Cat>
        )}

        {/* ===== 9. 直乗せ履歴（AT単位改行・揃え） ===== */}
        {directHistoryByAT.length > 0 && (
          <Cat color="#1565c0" title="直乗せ履歴" mb>
            <div style={{ padding: "4px" }}>
              {directHistoryByAT.map((group, gi) => {
                const bgColor = gi % 2 === 0 ? "#e3f2fd" : "#fce4ec";
                const LW = "24px";
                return (
                  <div key={group.atKey} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1px", backgroundColor: bgColor, borderRadius: "3px", padding: "2px 3px", marginBottom: "2px" }}>
                    <span style={{ width: LW, fontSize: "7px", fontWeight: 700, color: "#374151", lineHeight: 1.5, flexShrink: 0 }}>{group.atKey}</span>
                    {group.items.map((d, i) => <SqIcon key={i} top={d.trigger} bottom={d.coins != null ? String(d.coins) : "—"} bg="#1565c0" />)}
                  </div>
                );
              })}
            </div>
          </Cat>
        )}

        {/* ===== 11. エンディングカード集計（色分け） ===== */}
        {ecTotal > 0 && (
          <Cat color="#6d4c41" title={`エンディングカード (${ecTotal}枚)`} mb>
            <THead cols={[{ label: "カード", width: "1fr" }, { label: "回数", width: "44px" }, { label: "割合", width: "48px" }]} color="#6d4c41" />
            {([
              ...TG_ENDING_CARD_LABELS.map((c) => ({ key: c.key as keyof import("@/types").TGEndingCard, label: c.label, bg: c.color + "30" })),
              ...TG_COPPER_CARD_TYPES.map((c) => ({ key: c.key as keyof import("@/types").TGEndingCard, label: c.label, bg: c.color + "30" })),
              ...TG_CONFIRMED_CARD_TYPES.map((c) => ({ key: c.key as keyof import("@/types").TGEndingCard, label: c.label, bg: ecConfirmedBg(c.key) })),
            ]).map((item, i) => {
              const count = ecSum(item.key);
              if (count === 0) return null;
              return <TRow key={item.key} cols={[{ width: "1fr" }, { width: "44px" }, { width: "48px" }]} i={i} bg={item.bg} values={[item.label, `${count}回`, pct(count, ecTotal)]} />;
            })}
          </Cat>
        )}

        {/* ===== 12. 招待状（設定示唆・色分け） ===== */}
        {invSettingItems.length > 0 && (
          <Cat color="#4a148c" title="招待状（設定示唆）" mb>
            <THead cols={COLS_INV} color="#4a148c" />
            {invSettingItems.map((inv, i) => {
              const sep = inv.indexOf(" - ");
              const name = sep !== -1 ? inv.slice(0, sep) : inv;
              const hint = sep !== -1 ? inv.slice(sep + 3) : "";
              const c = allInvitations.filter((v) => v === inv).length;
              return <TRow key={inv} cols={COLS_INV} i={i} bg={invBg(inv)} values={[name, `${c}回`, hint]} />;
            })}
          </Cat>
        )}

      </div>
    </div>
  );
}

// ── ゾーンブロック ──────────────────────────────────────────────────────────

function ZoneBlock({ label, data, prorated, headerColor, showDesc }: { label: string; data: { zone: string; count: number }[]; prorated?: boolean; headerColor?: string; showDesc?: boolean }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const filtered = data.filter((d) => d.count > 0);
  const cols = [{ label: "ゾーン", width: "1fr" }, { label: "回数", width: "50px" }, { label: "割合", width: "48px" }];
  const fmt = (n: number) => prorated ? n.toFixed(1) : String(n);
  const totalLabel = prorated ? total.toFixed(1) : String(total);
  const c = headerColor ?? "#6a1b9a";
  return (
    <Cat color={c} title={`ゾーン ${label} (${totalLabel})`}>
      {showDesc && (
        <div style={{ backgroundColor: "#f5f3ff", padding: "3px 6px", borderBottom: "1px solid #e5e7eb", fontSize: "7px", color: "#6b7280", lineHeight: 1.5 }}>
          ※ 300or400等のゾーン跨ぎを按分配分した集計
        </div>
      )}
      {/* カラーバー（出現ゾーンのみ） */}
      {total > 0 && (
        <div style={{ display: "flex", height: "16px" }}>
          {filtered.map((d) => (
            <div key={d.zone} style={{
              width: `${(d.count / total) * 100}%`, minWidth: "16px",
              backgroundColor: zoneColor(d.zone), color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "6px", fontWeight: 700, lineHeight: 1.5,
            }}>{d.zone}</div>
          ))}
        </div>
      )}
      <THead cols={cols} color={c} />
      {/* 全ゾーン固定ひな形 */}
      {data.map((d, i) => (
        <TRow key={d.zone} cols={cols} i={i} values={[
          `${d.zone}G`,
          d.count > 0 ? `${fmt(d.count)}回` : "—",
          d.count > 0 && total > 0 ? `${Math.round((d.count / total) * 100)}%` : "—",
        ]} />
      ))}
    </Cat>
  );
}

function zoneColor(z: string): string {
  const n = parseInt(z); if (isNaN(n)) return "#757575";
  if (n <= 100) return "#1565c0"; if (n <= 200) return "#2e7d32"; if (n <= 300) return "#e65100";
  if (n <= 400) return "#ad1457"; if (n <= 500) return "#6a1b9a"; return "#b71c1c";
}

// ── 集計ヘルパー ────────────────────────────────────────────────────────────

// ゾーン集計ロジックは src/lib/tg/analytics.ts に集約

// ── 色分けヘルパー（設定期待度） ─────────────────────────────────────────────

function suggBg(s: string): string | undefined {
  // 設定6濃厚（有馬/あんていく全員集合） → 鮮やか黄色
  if (s.includes("設定6濃厚")) return "#facc15";
  if (s.includes("設定5以上")) return "#fcd34d";
  // 設定4以上濃厚（梟/金木研&霧嶋） → 濃い赤系
  if (s.includes("設定4以上")) return "#f87171";
  if (s.includes("設定3以上")) return "#fecaca";
  if (s.includes("設定2以上")) return "#ffe4e6";
  if (s.includes("設定1否定")) return "#fff1f2";
  if (s.includes("偶数")) return "#dbeafe";
  if (s.includes("高設定示唆［強］") || s.includes("高設定示唆[強]")) return "#fef3c7";
  if (s.includes("高設定示唆［弱］") || s.includes("高設定示唆[弱]")) return "#fffbeb";
  if (s.includes("天国濃厚")) return "#fed7aa";
  if (s.includes("天国準備")) return "#ffedd5";
  if (s.includes("チャンス以上")) return "#fef3c7";
  if (s.includes("通常C以上")) return "#fffbeb";
  if (s.includes("通常B以上濃厚")) return "#fefce8";
  if (s.includes("通常B以上示唆")) return "#f9fafb";
  if (s.includes("奇数")) return "#fce7f3";
  return undefined;
}

/** 設定4以上/6濃厚は白テキストが必要かを判定 */
function suggTextColor(s: string): string | undefined {
  if (s.includes("設定4以上")) return "#ffffff";
  return undefined;
}

function invBg(inv: string): string | undefined {
  if (inv.includes("設定6")) return "#fde68a";
  if (inv.includes("設定4以上")) return "#fed7aa";
  if (inv.includes("設定4否定")) return "#fef3c7";
  if (inv.includes("設定3否定")) return "#fffbeb";
  if (inv.includes("設定2否定")) return "#fefce8";
  if (inv.includes("設定1否定")) return "#fff1f2";
  if (inv.includes("偶")) return "#dbeafe";
  return undefined;
}

function ecConfirmedBg(key: string): string {
  if (key === "confirmed4") return "#e9d5ff"; // 虹6濃厚
  if (key === "confirmed3") return "#fde68a"; // 金5以上
  if (key === "confirmed2") return "#fed7aa"; // 金4以上
  return "#e5e7eb"; // 銀3以上
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

export function inferSetting(czFail: string[], endScreen: string[], blocks: NormalBlock[], atEntries: TGATEntry[]): string {
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
    if (t.includes("虹")) hints.push("6確定濃厚"); else if (t.includes("喰種柄")) hints.push("5以上濃厚");
    else if (t.includes("金")) hints.push("4以上濃厚"); else if (t.includes("銀")) hints.push("3以上濃厚");
    else if (t.includes("銅")) hints.push("2以上濃厚");
  }
  for (const entry of atEntries) for (const row of entry.rows) {
    if (row.rowType !== "set" || !row.endingCard) continue;
    const ec = row.endingCard;
    if (ec.confirmed4 > 0) hints.push("6確定濃厚"); if (ec.confirmed3 > 0) hints.push("5以上濃厚");
    if (ec.confirmed2 > 0) hints.push("4以上濃厚"); if (ec.confirmed1 > 0) hints.push("3以上濃厚");
  }
  if (hints.length === 0) return "";
  const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
  return [...new Set(hints)].sort((a, b) => priority.indexOf(a) - priority.indexOf(b)).join(" / ");
}
