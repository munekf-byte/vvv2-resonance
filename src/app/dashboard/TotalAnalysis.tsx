"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: トータル数値分析
// 全セッションの集計値を表示
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
            <Row i={0}><Lbl b>通常時G</Lbl><Val>{sum2.toLocaleString()} G</Val></Row>
            <Row i={1} grade={gradeByProb(czCount, sum2, [...CZ_PROB])}><Lbl b>CZ(レミニ&利世)</Lbl><Val>{czCount}回 {prob(czCount, sum2)}</Val></Row>
            <Row i={2} grade={gradeByProb(epiCount, sum2, [...EPI_PROB])}><Lbl b>エピボ</Lbl><Val>{epiCount}回 {prob(epiCount, sum2)}</Val></Row>
            <Row i={3} grade={gradeByProb(directATCount, sum2, [...DIRECT_AT_PROB])}><Lbl b>AT直撃</Lbl><Val>{directATCount}回 {prob(directATCount, sum2)}</Val></Row>
            <Row i={4} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])}><Lbl b>AT初当たり</Lbl><Val>{atWinCount}回 {prob(atWinCount, sum2)}</Val></Row>
          </Cat>
          <Cat color="#7b1fa2" title="CZ内容">
            <Row i={0}><Lbl b>CZ記録数</Lbl><Val>{czBlocks.length}回 (成功{czSuccessCount})</Val></Row>
            <Row i={1}><Lbl>押/斜🔔</Lbl><Val>{czTotalBell}回 {czHitBell > 0 ? `★当${czHitBell}` : ""}</Val></Row>
            <Row i={2}><Lbl>リプ</Lbl><Val>{czTotalReplay}回 {czHitReplay > 0 ? `★当${czHitReplay}` : ""}</Val></Row>
            <Row i={3}><Lbl>弱レア</Lbl><Val>{czTotalWeakRare}回 {czHitWeakRare > 0 ? `★当${czHitWeakRare}` : ""}</Val></Row>
            <Row i={4}><Lbl>強レア</Lbl><Val>{czTotalStrongRare}回 {czHitStrongRare > 0 ? `★当${czHitStrongRare}` : ""}</Val></Row>
          </Cat>
        </div>

        {/* 赫眼/精神世界 */}
        <Cat color="#b71c1c" title="赫眼 / 精神世界" mb>
          <Row i={0}><Lbl b>赫眼</Lbl><Val>{kakuganTotal}回 {prob(kakuganTotal, sum2)}</Val></Row>
          {kakuganBD.map((k, i) => <Row key={k.label} i={i + 1}><Lbl>　{k.label}</Lbl><Val>{k.count}回 [{pct(k.count, kakuganTotal)}]</Val></Row>)}
          <Row i={kakuganBD.length + 1}><Lbl b>精神世界</Lbl><Val>{shinsekaiTotal}回 {prob(shinsekaiTotal, sum2)}</Val></Row>
          {shinsekaiBS.map((s, i) => <Row key={s.label} i={kakuganBD.length + 2 + i}
            grade={s.label === "精神33G" && s.count > 0 ? gradeByRate(s.count, shinsekaiTotal, 25, 60) : undefined}>
            <Lbl>　{s.label}</Lbl><Val>{s.count}回 [{pct(s.count, shinsekaiTotal)}]</Val></Row>)}
        </Cat>

        {/* 設定示唆 */}
        <Cat color="#e65100" title="設定示唆" mb>
          <Row i={0}><Lbl b>設定情報</Lbl><Val b>{settingHints || "情報不足"}</Val></Row>
          <Row i={1}><Lbl b>トロフィー他</Lbl><Val>{trophyCount}回</Val></Row>
        </Cat>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#bf360c" title="[cz失敗] 終了画面">
            {TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]")).map((s, i) => {
              const c = czFailSuggestions.filter((v) => v === s).length;
              return <Row key={s} i={i}><Lbl>{extractName(s)}</Lbl><Val>{c}回</Val></Row>;
            })}
          </Cat>
          <Cat color="#4e342e" title="[終了画面] 示唆">
            {endScreenItems.map((s, i) => {
              const c = allEndScreenFromAT.filter((v) => v === s).length;
              const t = allEndScreenFromAT.length;
              return <Row key={s} i={i}><Lbl>{extractName(s)}</Lbl><Val>{c}回 [{pct(c, t)}]</Val></Row>;
            })}
          </Cat>
        </div>

        {/* AT */}
        <Cat color="#2e7d32" title="AT" mb>
          <Row i={0} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])}><Lbl b>AT初当たり</Lbl><Val>{atWinCount}回 {prob(atWinCount, sum2)}</Val></Row>
          <Row i={1} grade={gradeByRate(hikimodoCount, atWinCount, HIKIMODOHI_RATE[0], HIKIMODOHI_RATE[5])}><Lbl b>引き戻し率</Lbl><Val>{hikimodoCount}回 {atWinCount > 0 ? `[${pct(hikimodoCount, atWinCount)}]` : "—"}</Val></Row>
          <Row i={2} grade={gradeByRate(uraATEntryCount, atWinCount, URA_AT_RATE[0], URA_AT_RATE[5])}><Lbl b>裏AT突入率</Lbl><Val>{uraATEntryCount}回 {atWinCount > 0 ? `[${pct(uraATEntryCount, atWinCount)}]` : "—"}</Val></Row>
        </Cat>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1b5e20" title="キャラ対決成績">
            {charStats.map(({ char, wins, total }, i) => (
              <Row key={char} i={i}><Lbl>{char}</Lbl><Val>{total > 0 ? `${wins}/${total} [${pct(wins, total)}]` : "—"}</Val></Row>
            ))}
          </Cat>
          <Cat color="#33691e" title="BITESテーブル">
            {bitesStats.map(({ label, count }, i) => (
              <Row key={label} i={i}><Lbl>{label}</Lbl><Val>{count}回 [{pct(count, bitesTotal)}]</Val></Row>
            ))}
          </Cat>
        </div>

        {arimaByPos.some((a) => a.total > 0) && (
          <Cat color="#f59e0b" title="有馬set（1,3,5セット目）" mb>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px", padding: "4px" }}>
              {arimaByPos.map(({ pos, count, total }) => (
                <div key={pos} style={{ textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "2px", padding: "3px 0" }}>
                  <div style={{ fontSize: "7px", color: "#6b7280", lineHeight: 1.4 }}>{pos}set目</div>
                  <div style={{ fontSize: "9px", fontWeight: 700, lineHeight: 1.4 }}>{count}回 [{pct(count, total)}]</div>
                </div>
              ))}
            </div>
          </Cat>
        )}

        {invSettingItems.length > 0 && (
          <Cat color="#4a148c" title="招待状（設定示唆）" mb>
            {invSettingItems.map((inv, i) => {
              const sep = inv.indexOf(" - ");
              const name = sep !== -1 ? inv.slice(0, sep) : inv;
              const hint = sep !== -1 ? inv.slice(sep + 3) : "";
              const c = allInvitations.filter((v) => v === inv).length;
              return (
                <Row key={inv} i={i}>
                  <Lbl>{name}</Lbl>
                  <span style={{ width: "28px", fontSize: "9px", fontWeight: 700, textAlign: "left", flexShrink: 0, lineHeight: 1.5 }}>{c}回</span>
                  <span style={{ flex: 1, fontSize: "7px", color: "#6b7280", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hint}</span>
                </Row>
              );
            })}
          </Cat>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <ZoneBlock label="ゾーン [全体]" data={zoneAll} />
          <ZoneBlock label="ゾーン [リセ頭]" data={zoneAfterAT} />
        </div>

      </div>
    </div>
  );
}

// ── レイアウト部品 ──────────────────────────────────────────────────────────

function Cat({ color, title, children, mb }: { color: string; title: string; children: React.ReactNode; mb?: boolean }) {
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: "3px", overflow: "hidden", marginBottom: mb ? "4px" : 0 }}>
      <div style={{ backgroundColor: color, padding: "2px 6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", lineHeight: 1.6 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ children, i, grade }: { children: React.ReactNode; i: number; grade?: SettingGrade }) {
  const sc = grade ? SETTING_COLORS[grade] : null;
  const baseBg = i % 2 === 0 ? "#ffffff" : "#f7f7f7";
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "3px 4px",
      backgroundColor: sc && grade !== "neutral" ? sc.bg : baseBg,
      color: sc && grade !== "neutral" ? sc.color : undefined,
      borderBottom: "1px solid #e5e7eb", lineHeight: 1.5,
      ...(grade === "vhigh" ? { fontWeight: 700 } : {}),
    }}>{children}</div>
  );
}

function Lbl({ children, b }: { children: React.ReactNode; b?: boolean }) {
  return <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "8px", color: "#4b5563", fontWeight: b ? 700 : 400, lineHeight: 1.5 }}>{children}</span>;
}

function Val({ children, b }: { children: React.ReactNode; b?: boolean }) {
  return <span style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: "#111827", fontWeight: b ? 700 : 400, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", paddingLeft: "4px", lineHeight: 1.5 }}>{children}</span>;
}

function ZoneBlock({ label, data }: { label: string; data: { zone: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const filtered = data.filter((d) => d.count > 0);
  return (
    <Cat color="#6a1b9a" title={`${label} (${total})`}>
      {total === 0 ? (
        <Row i={0}><Lbl>データなし</Lbl><Val>—</Val></Row>
      ) : (
        <>
          <div style={{ display: "flex", height: "16px" }}>
            {filtered.map((d) => (
              <div key={d.zone} style={{ width: `${(d.count / total) * 100}%`, minWidth: "16px", backgroundColor: zoneColor(d.zone), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6px", fontWeight: 700, lineHeight: 1.5 }}>{d.zone}</div>
            ))}
          </div>
          {filtered.map((d, i) => <Row key={d.zone} i={i}><Lbl>{d.zone}</Lbl><Val>{d.count}回 [{pct(d.count, total)}]</Val></Row>)}
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
  if (hints.length === 0) return "情報不足";
  const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
  return [...new Set(hints)].sort((a, b) => priority.indexOf(a) - priority.indexOf(b)).join(" / ");
}
