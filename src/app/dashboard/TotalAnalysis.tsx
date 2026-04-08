"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: トータル数値分析 v3.0
// 統一テーブルグリッド化（SummaryTab v3.0準拠）
// =============================================================================

import { useState, useEffect, useRef } from "react";
import type { PlaySession, NormalBlock, TGATEntry, TGATSet } from "@/types";
import { lsGetSessionList, lsLoadSession } from "@/lib/tg/localStore";
import { captureAndDownload } from "@/lib/tg/captureImage";
import {
  TG_KAKUGAN, TG_SHINSEKAI,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES,
  TG_AT_CHARACTERS, TG_BITES_TYPES,
  TG_ZONES, TG_INVITATIONS,
} from "@/lib/engine/constants";
import {
  gradeByProb, gradeByRate, SETTING_COLORS,
  CZ_PROB, EPI_PROB, DIRECT_AT_PROB, AT_COMBINED_PROB,
  URA_AT_RATE, HIKIMODOHI_RATE,
  type SettingGrade,
} from "@/lib/tg/settingDiff";
import { inferSetting } from "@/components/tg/SummaryTab";

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

function Cat({ color, title, children, mb }: {
  color: string; title: string; children: React.ReactNode; mb?: boolean;
}) {
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: "3px", overflow: "hidden", marginBottom: mb ? "4px" : 0 }}>
      <div style={{ backgroundColor: color, padding: "2px 6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", lineHeight: 1.6 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function THead({ cols, color }: { cols: { label: string; width: string }[]; color: string }) {
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

function TRow({ cols, values, i, grade }: {
  cols: { width: string }[];
  values: React.ReactNode[];
  i: number;
  grade?: SettingGrade;
}) {
  const sc = grade ? SETTING_COLORS[grade] : null;
  const baseBg = i % 2 === 0 ? "#ffffff" : "#f7f7f7";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols.map((c) => c.width).join(" "),
      backgroundColor: sc && grade !== "neutral" ? sc.bg : baseBg,
      color: sc && grade !== "neutral" ? sc.color : undefined,
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
          lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          borderRight: ci < values.length - 1 ? "1px solid #e5e7eb" : "none",
          fontVariantNumeric: ci > 0 ? "tabular-nums" : undefined,
        }}>
          {v}
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────────

export function TotalAnalysis() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [allBlocks, setAllBlocks] = useState<NormalBlock[]>([]);
  const [allATEntries, setAllATEntries] = useState<TGATEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = lsGetSessionList();
    const blocks: NormalBlock[] = [];
    const atEntries: TGATEntry[] = [];
    for (const meta of list) {
      const session = lsLoadSession(meta.id);
      if (!session) continue;
      blocks.push(...session.normalBlocks);
      atEntries.push(...session.atEntries);
    }
    setAllBlocks(blocks);
    setAllATEntries(atEntries);
    setSessionCount(list.length);
    setLoading(false);
  }, []);

  if (loading) return <p className="text-center text-gray-500 font-mono py-8">読み込み中...</p>;
  if (sessionCount === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
      <span className="text-4xl">📊</span>
      <p className="text-gray-600 text-sm font-mono">稼働データがありません</p>
    </div>
  );

  // ── 計算 ──
  const sum2 = allBlocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);
  const czCount = allBlocks.filter((b) => b.event === "レミニセンス" || b.event === "大喰いの利世").length;
  const epiCount = allBlocks.filter((b) => b.event === "エピソードボーナス").length;
  const directATCount = allBlocks.filter((b) => b.event === "直撃AT").length;
  const atWinCount = allBlocks.filter((b) => b.atWin).length;
  const hikimodoCount = allBlocks.filter((b) => b.event === "引き戻し").length;

  const czBlocks = allBlocks.filter((b) => b.czCounter && (b.czCounter.bell > 0 || b.czCounter.replay > 0 || b.czCounter.weakRare > 0 || b.czCounter.strongRare > 0));
  const czTotalBell = czBlocks.reduce((s, b) => s + (b.czCounter?.bell ?? 0), 0);
  const czTotalReplay = czBlocks.reduce((s, b) => s + (b.czCounter?.replay ?? 0), 0);
  const czTotalWeakRare = czBlocks.reduce((s, b) => s + (b.czCounter?.weakRare ?? 0), 0);
  const czTotalStrongRare = czBlocks.reduce((s, b) => s + (b.czCounter?.strongRare ?? 0), 0);
  const czHitBell = czBlocks.filter((b) => b.czCounter?.hitRole === "bell").length;
  const czHitReplay = czBlocks.filter((b) => b.czCounter?.hitRole === "replay").length;
  const czHitWeakRare = czBlocks.filter((b) => b.czCounter?.hitRole === "weakRare").length;
  const czHitStrongRare = czBlocks.filter((b) => b.czCounter?.hitRole === "strongRare").length;
  const czSuccessCount = czBlocks.filter((b) => !!b.czCounter?.hitRole).length;

  const allKakugan = allBlocks.flatMap((b) => b.kakugan);
  const kakuganTotal = allKakugan.length;
  const kakuganBD = [...TG_KAKUGAN].map((k) => ({ label: k, count: allKakugan.filter((v) => v === k).length }));
  const allShinsekai = allBlocks.flatMap((b) => b.shinsekai);
  const shinsekaiTotal = allShinsekai.length;
  const shinsekaiBS = [...TG_SHINSEKAI].map((s) => ({ label: s, count: allShinsekai.filter((v) => v === s).length }));

  const czFailSuggestions = allBlocks.filter((b) => b.endingSuggestion.startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
  const endScreenItems = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[終了画面]"));
  const allSets = getAllSets(allATEntries);
  const allEndScreenFromAT = allSets.map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));
  const trophyCount = allBlocks.filter((b) => b.trophy).length + allSets.filter((s) => s.trophy).length;

  const atEntriesWithType = allATEntries.map((e) => {
    const firstSet = e.rows.find((r): r is TGATSet => r.rowType === "set");
    return firstSet?.atType ?? "通常AT";
  });
  const uraATEntryCount = atEntriesWithType.filter((t) => t === "裏AT" || t === "隠れ裏AT（推測）").length;

  const charStats = [...TG_AT_CHARACTERS].filter((c) => c !== "EDボナ").map((char) => {
    const sets = allSets.filter((s) => s.character === char);
    const battles = sets.flatMap((s) => s.battles).filter((b) => b.result);
    return { char, wins: battles.filter((b) => b.result === "○").length, total: battles.length };
  });

  const bitesStats = [...TG_BITES_TYPES].map((bt) => ({ label: getBitesShort(bt), count: allSets.filter((s) => s.bitesType === bt).length }));
  const bitesTotal = allSets.filter((s) => s.bitesType).length;

  const arimaByPos = [1, 3, 5].map((pos) => {
    let count = 0, total = 0;
    for (const entry of allATEntries) {
      const sets = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
      if (sets.length >= pos) { total++; if (sets[pos - 1]?.character === "有馬") count++; }
    }
    return { pos, count, total };
  });

  const allInvitations = allBlocks.flatMap((b) => b.invitation);
  const invSettingItems = [...TG_INVITATIONS].filter((inv) =>
    inv.includes("偶数") || inv.includes("設定") || inv.includes("存分に") || inv.includes("特別な夜")
  );

  const zoneAll = [...TG_ZONES].filter((z) => z !== "不明").map((zone) => ({ zone, count: allBlocks.filter((b) => b.zone === zone).length }));
  const afterATBlocks = allBlocks.filter((_, i) => i === 0 || allBlocks[i - 1].atWin);
  const zoneAfterAT = [...TG_ZONES].filter((z) => z !== "不明").map((zone) => ({ zone, count: afterATBlocks.filter((b) => b.zone === zone).length }));

  const settingHints = inferSetting(czFailSuggestions, allEndScreenFromAT, allBlocks, allATEntries);

  // 共通列定義
  const COLS3 = [{ label: "項目", width: "1fr" }, { label: "回数", width: "52px" }, { label: "確率", width: "64px" }];
  const COLS3_PCT = [{ label: "項目", width: "1fr" }, { label: "回数", width: "44px" }, { label: "割合", width: "52px" }];
  const COLS_CZ = [{ label: "役", width: "1fr" }, { label: "発生", width: "40px" }, { label: "当選", width: "40px" }, { label: "当選率", width: "48px" }];
  const COLS_CHAR = [{ label: "キャラ", width: "1fr" }, { label: "成績", width: "52px" }, { label: "勝率", width: "48px" }];
  const COLS_SUGG = [{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "40px" }, { label: "割合", width: "48px" }];
  const COLS_INV = [{ label: "招待状", width: "1fr" }, { label: "回数", width: "40px" }, { label: "示唆", width: "1fr" }];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-mono font-bold text-gray-900">トータル数値分析</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{sessionCount}セッションの合算</p>
        </div>
        <button onClick={() => captureRef.current && captureAndDownload(captureRef.current, `TG_Total_${new Date().toISOString().slice(0, 10)}.png`)}
          className="text-[11px] font-mono font-bold px-4 py-2 rounded bg-gray-800 text-white active:scale-95 transition-transform">
          画像で保存
        </button>
      </div>

      <div ref={captureRef} style={{ padding: "8px 6px", backgroundColor: "#ffffff", fontFamily: "monospace" }}>

        {/* 通常時 | CZ内容 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1565c0" title={`通常時 (${sessionCount}稼働)`}>
            <THead cols={COLS3} color="#1565c0" />
            <TRow cols={COLS3} i={0} values={[<b key="l">通常時G</b>, `${sum2.toLocaleString()}G`, "—"]} />
            <TRow cols={COLS3} i={1} values={[<b key="l">CZ</b>, `${czCount}回`, prob(czCount, sum2)]} grade={gradeByProb(czCount, sum2, [...CZ_PROB])} />
            <TRow cols={COLS3} i={2} values={[<b key="l">エピボ</b>, `${epiCount}回`, prob(epiCount, sum2)]} grade={gradeByProb(epiCount, sum2, [...EPI_PROB])} />
            <TRow cols={COLS3} i={3} values={[<b key="l">AT直撃</b>, `${directATCount}回`, prob(directATCount, sum2)]} grade={gradeByProb(directATCount, sum2, [...DIRECT_AT_PROB])} />
            <TRow cols={COLS3} i={4} values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
          </Cat>
          <Cat color="#7b1fa2" title="CZ内容">
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 52px 64px",
              borderBottom: "2px solid #7b1fa2", backgroundColor: "#7b1fa218", padding: "3px 4px",
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
                r.label,
                `${r.total}回`,
                r.hit > 0 ? <span key="h" style={{ color: "#b91c1c" }}>★{r.hit}</span> : "—",
                r.total > 0 ? pct(r.hit, r.total) : "—",
              ]} />
            ))}
          </Cat>
        </div>

        {/* 赫眼 / 精神世界 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#b71c1c" title="赫眼">
            <THead cols={COLS3_PCT} color="#b71c1c" />
            <TRow cols={COLS3_PCT} i={0} values={[<b key="l">合計</b>, `${kakuganTotal}回`, prob(kakuganTotal, sum2)]} />
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

        {/* 設定示唆 */}
        <Cat color="#e65100" title="設定示唆" mb>
          <THead cols={[{ label: "項目", width: "1fr" }, { label: "内容", width: "1fr" }]} color="#e65100" />
          <TRow cols={[{ width: "1fr" }, { width: "1fr" }]} i={0} values={[<b key="l">推定設定</b>, <b key="v">{settingHints || "情報不足"}</b>]} />
          <TRow cols={[{ width: "1fr" }, { width: "1fr" }]} i={1} values={[<b key="l">トロフィー</b>, `${trophyCount}回`]} />
        </Cat>

        {/* CZ失敗 / 終了画面 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#bf360c" title="[cz失敗] 終了画面">
            <THead cols={[{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "44px" }]} color="#bf360c" />
            {TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]")).map((s, i) => {
              const c = czFailSuggestions.filter((v) => v === s).length;
              return <TRow key={s} cols={[{ width: "1fr" }, { width: "44px" }]} i={i} values={[extractName(s), `${c}回`]} />;
            })}
          </Cat>
          <Cat color="#4e342e" title="[終了画面] 示唆">
            <THead cols={COLS_SUGG} color="#4e342e" />
            {endScreenItems.map((s, i) => {
              const c = allEndScreenFromAT.filter((v) => v === s).length;
              const t = allEndScreenFromAT.length;
              return <TRow key={s} cols={COLS_SUGG} i={i} values={[extractName(s), `${c}回`, pct(c, t)]} />;
            })}
          </Cat>
        </div>

        {/* AT */}
        <Cat color="#2e7d32" title="AT" mb>
          <THead cols={COLS3} color="#2e7d32" />
          <TRow cols={COLS3} i={0} values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
          <TRow cols={COLS3} i={1} values={[<b key="l">引き戻し率</b>, `${hikimodoCount}回`, atWinCount > 0 ? pct(hikimodoCount, atWinCount) : "—"]}
            grade={gradeByRate(hikimodoCount, atWinCount, HIKIMODOHI_RATE[0], HIKIMODOHI_RATE[5])} />
          <TRow cols={COLS3} i={2} values={[<b key="l">裏AT突入率</b>, `${uraATEntryCount}回`, atWinCount > 0 ? pct(uraATEntryCount, atWinCount) : "—"]}
            grade={gradeByRate(uraATEntryCount, atWinCount, URA_AT_RATE[0], URA_AT_RATE[5])} />
        </Cat>

        {/* キャラ / BITES */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1b5e20" title="キャラ対決成績">
            <THead cols={COLS_CHAR} color="#1b5e20" />
            {charStats.map(({ char, wins, total }, i) => (
              <TRow key={char} cols={COLS_CHAR} i={i} values={[char, total > 0 ? `${wins}/${total}` : "—", total > 0 ? pct(wins, total) : "—"]} />
            ))}
          </Cat>
          <Cat color="#33691e" title="BITESテーブル">
            <THead cols={COLS3_PCT} color="#33691e" />
            {bitesStats.map(({ label, count }, i) => (
              <TRow key={label} cols={COLS3_PCT} i={i} values={[label, `${count}回`, pct(count, bitesTotal)]} />
            ))}
          </Cat>
        </div>

        {/* 有馬 */}
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

        {/* 招待状 */}
        {invSettingItems.length > 0 && (
          <Cat color="#4a148c" title="招待状（設定示唆）" mb>
            <THead cols={COLS_INV} color="#4a148c" />
            {invSettingItems.map((inv, i) => {
              const sep = inv.indexOf(" - ");
              const name = sep !== -1 ? inv.slice(0, sep) : inv;
              const hint = sep !== -1 ? inv.slice(sep + 3) : "";
              const c = allInvitations.filter((v) => v === inv).length;
              return <TRow key={inv} cols={COLS_INV} i={i} values={[name, `${c}回`, hint]} />;
            })}
          </Cat>
        )}

        {/* ゾーン */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <ZoneBlock label="ゾーン [全体]" data={zoneAll} />
          <ZoneBlock label="ゾーン [リセ頭]" data={zoneAfterAT} />
        </div>

      </div>
    </div>
  );
}

// ── ゾーンブロック ──────────────────────────────────────────────────────────

function ZoneBlock({ label, data }: { label: string; data: { zone: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const filtered = data.filter((d) => d.count > 0);
  const cols = [{ label: "ゾーン", width: "1fr" }, { label: "回数", width: "44px" }, { label: "割合", width: "48px" }];
  return (
    <Cat color="#6a1b9a" title={`${label} (${total})`}>
      {total === 0 ? (
        <TRow cols={[{ width: "1fr" }]} i={0} values={["データなし"]} />
      ) : (
        <>
          <div style={{ display: "flex", height: "16px" }}>
            {filtered.map((d) => (
              <div key={d.zone} style={{ width: `${(d.count / total) * 100}%`, minWidth: "16px", backgroundColor: zoneColor(d.zone), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6px", fontWeight: 700, lineHeight: 1.5 }}>{d.zone}</div>
            ))}
          </div>
          <THead cols={cols} color="#6a1b9a" />
          {filtered.map((d, i) => (
            <TRow key={d.zone} cols={cols} i={i} values={[d.zone, `${d.count}回`, pct(d.count, total)]} />
          ))}
        </>
      )}
    </Cat>
  );
}

function zoneColor(z: string): string {
  const n = parseInt(z); if (isNaN(n)) return "#757575";
  if (n <= 100) return "#1565c0"; if (n <= 200) return "#2e7d32"; if (n <= 300) return "#e65100";
  if (n <= 400) return "#ad1457"; if (n <= 500) return "#6a1b9a"; return "#b71c1c";
}
