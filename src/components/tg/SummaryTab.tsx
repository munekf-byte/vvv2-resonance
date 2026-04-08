"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 集計タブ v2.0
// 横スクロール禁止・iPhone Pro幅完全収納
// カテゴリ縦長・2〜3列横並び / 画像出力テキスト修正済み
// =============================================================================

import { useRef, useState, useEffect } from "react";
import { captureAndDownload } from "@/lib/tg/captureImage";
import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment } from "@/types";
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
function groupCount(arr: string[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of arr) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([value, count]) => ({ value, count }));
}

// ── メインコンポーネント ─────────────────────────────────────────────────

export function SummaryTab({ blocks, atEntries, sessionId }: Props) {
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
  const sum1 = totalGInput ? parseInt(totalGInput) || sum2 : sum2;

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

  // 引き戻し（イベント"引き戻し"）
  const hikimodoCount = blocks.filter((b) => b.event === "引き戻し").length;

  // 裏AT
  const allSets = getAllSets(atEntries);
  const uraATCount = allSets.filter((s) => s.atType === "裏AT" || s.atType === "隠れ裏AT（推測）").length;
  // AT当選回数ベースの裏AT率 (各ATEntryの最初のSETのatTypeで判定)
  const atEntriesWithType = atEntries.map((e) => {
    const firstSet = e.rows.find((r): r is TGATSet => r.rowType === "set");
    return firstSet?.atType ?? "通常AT";
  });
  const uraATEntryCount = atEntriesWithType.filter((t) => t === "裏AT" || t === "隠れ裏AT（推測）").length;

  // 招待状集計（設定差あり項目）
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
  // BITES獲得履歴 — AT単位でグループ化
  const bitesHistoryByAT: { atKey: string; items: { table: string; coins: string }[] }[] = atEntries.map((e) => ({
    atKey: e.atKey,
    items: e.rows.filter((r): r is TGATSet => r.rowType === "set" && !!r.bitesCoins)
      .map((s) => ({ table: getBitesShort(s.bitesType), coins: s.bitesCoins })),
  })).filter((g) => g.items.length > 0);

  // 直乗せ履歴 — AT単位でグループ化
  const directHistoryByAT: { atKey: string; items: { trigger: string; coins: number | null }[] }[] = atEntries.map((e) => ({
    atKey: e.atKey,
    items: e.rows.filter((r): r is TGATSet => r.rowType === "set")
      .flatMap((s) => s.directAdds.filter((d) => d.trigger || d.coins != null).map((d) => ({ trigger: d.trigger, coins: d.coins }))),
  })).filter((g) => g.items.length > 0);
  const arimaByPos = computeArimaPositions(atEntries);

  const zoneAll = computeZoneDistribution(blocks, "all");
  const zoneAfterAT = computeZoneDistribution(blocks, "afterAT");

  function handleCapture() {
    if (!captureRef.current) return;
    captureAndDownload(captureRef.current, `TG_Summary_${new Date().toISOString().slice(0, 10)}.png`);
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <p className="text-[10px] font-mono font-bold text-red-600 leading-tight">
          ※ 総消化ゲーム数はご自身で入力してください
        </p>
        <button onClick={handleCapture}
          className="text-[11px] font-mono font-bold px-4 py-2 rounded bg-gray-800 text-white active:scale-95 transition-transform flex-shrink-0 ml-2">
          画像で保存
        </button>
      </div>

      <div ref={captureRef} style={{ padding: "8px 6px", backgroundColor: "#ffffff", fontFamily: "monospace" }}>

        {/* ===== Row 1: 通常時 | 赫眼/精神世界 ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
          <Cat color="#1565c0" title="通常時">
            <Row i={0}>
              <Lbl b>総消化G数</Lbl>
              <Val>
                <input type="number" value={totalGInput} onChange={(e) => handleTotalGChange(e.target.value)}
                  placeholder={String(sum2)}
                  style={{ width: "100%", backgroundColor: "#fefce8", border: "1px solid #ca8a04", borderRadius: "2px", fontSize: "9px", fontFamily: "monospace", fontWeight: 700, textAlign: "right", padding: "1px 4px", outline: "none" }} />
              </Val>
            </Row>
            <Row i={1}><Lbl b>通常時G</Lbl><Val>{sum2.toLocaleString()} G</Val></Row>
            <Row i={2} grade={gradeByProb(czCount, sum2, [...CZ_PROB])}><Lbl b>CZ(レミニ&利世)</Lbl><Val>{czCount}回 {prob(czCount, sum2)}</Val></Row>
            <Row i={3} grade={gradeByProb(epiCount, sum2, [...EPI_PROB])}><Lbl b>エピボ</Lbl><Val>{epiCount}回 {prob(epiCount, sum2)}</Val></Row>
            <Row i={4} grade={gradeByProb(directATCount, sum2, [...DIRECT_AT_PROB])}><Lbl b>AT直撃</Lbl><Val>{directATCount}回 {prob(directATCount, sum2)}</Val></Row>
            <Row i={5} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])}><Lbl b>AT初当たり</Lbl><Val>{atWinCount}回 {prob(atWinCount, sum2)}</Val></Row>
          </Cat>

          {/* CZ内容 */}
          <Cat color="#7b1fa2" title="CZ内容">
            <Row i={0}>
              <Lbl b>CZ記録数</Lbl>
              <Val>{czBlocks.length}回 / 成功{czSuccessCount} / 成功率{czBlocks.length > 0 ? pct(czSuccessCount, czBlocks.length) : "—"}</Val>
            </Row>
            {/* テーブルヘッダー */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px 48px", borderBottom: "2px solid #7b1fa2", backgroundColor: "#f3e8ff", padding: "2px 4px" }}>
              <span style={{ fontSize: "7px", fontWeight: 700, color: "#6b7280", lineHeight: 1.5 }}>役</span>
              <span style={{ fontSize: "7px", fontWeight: 700, color: "#6b7280", textAlign: "right", lineHeight: 1.5 }}>発生</span>
              <span style={{ fontSize: "7px", fontWeight: 700, color: "#6b7280", textAlign: "right", lineHeight: 1.5 }}>当選</span>
              <span style={{ fontSize: "7px", fontWeight: 700, color: "#6b7280", textAlign: "right", lineHeight: 1.5 }}>当選率</span>
            </div>
            {([
              { label: "押/斜🔔", total: czTotalBell, hit: czHitBell },
              { label: "リプ", total: czTotalReplay, hit: czHitReplay },
              { label: "弱レア", total: czTotalWeakRare, hit: czHitWeakRare },
              { label: "強レア", total: czTotalStrongRare, hit: czHitStrongRare },
            ] as const).map((r, i) => (
              <div key={r.label} style={{
                display: "grid", gridTemplateColumns: "1fr 40px 40px 48px",
                padding: "3px 4px",
                backgroundColor: i % 2 === 0 ? "#ffffff" : "#f7f7f7",
                borderBottom: "1px solid #e5e7eb",
              }}>
                <span style={{ fontSize: "8px", color: "#4b5563", lineHeight: 1.5 }}>{r.label}</span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#111827", textAlign: "right", lineHeight: 1.5 }}>{r.total}回</span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: r.hit > 0 ? "#b91c1c" : "#9ca3af", textAlign: "right", lineHeight: 1.5 }}>
                  {r.hit > 0 ? `★${r.hit}` : "—"}
                </span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#111827", textAlign: "right", lineHeight: 1.5 }}>
                  {r.total > 0 ? pct(r.hit, r.total) : "—"}
                </span>
              </div>
            ))}
          </Cat>

          <Cat color="#b71c1c" title="赫眼 / 精神世界">
            <Row i={0}><Lbl b>赫眼</Lbl><Val>{kakuganTotal}回 {prob(kakuganTotal, sum1)}</Val></Row>
            {kakuganBD.map((k, i) => (
              <Row key={k.label} i={i + 1}><Lbl>　{k.label}</Lbl><Val>{k.count}回 [{pct(k.count, kakuganTotal)}]</Val></Row>
            ))}
            <Row i={kakuganBD.length + 1}><Lbl b>精神世界</Lbl><Val>{shinsekaiTotal}回 {prob(shinsekaiTotal, sum2)}</Val></Row>
            {shinsekaiBS.map((s, i) => (
              <Row key={s.label} i={kakuganBD.length + 2 + i}
                grade={s.label === "精神33G" && s.count > 0 ? gradeByRate(s.count, shinsekaiTotal, 25, 60) : undefined}>
                <Lbl>　{s.label}</Lbl><Val>{s.count}回 [{pct(s.count, shinsekaiTotal)}]</Val>
              </Row>
            ))}
          </Cat>
        </div>

        {/* ===== 設定示唆 ===== */}
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

        {/* ===== AT ===== */}
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

        {bitesHistoryByAT.length > 0 && (
          <Cat color="#14532d" title="BITES獲得履歴" mb>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", padding: "4px" }}>
              {bitesHistoryByAT.map((group, gi) => {
                const bgColor = gi % 2 === 0 ? "#e8f5e9" : "#fff8e1";
                return (
                  <div key={group.atKey} style={{ display: "flex", alignItems: "center", gap: "1px", backgroundColor: bgColor, borderRadius: "3px", padding: "2px 3px" }}>
                    <span style={{ fontSize: "7px", fontWeight: 700, color: "#374151", marginRight: "2px", lineHeight: 1.5 }}>{group.atKey}</span>
                    {group.items.map((h, i) => <SqIcon key={i} top={h.table} bottom={h.coins} bg="#14532d" />)}
                  </div>
                );
              })}
            </div>
          </Cat>
        )}

        {directHistoryByAT.length > 0 && (
          <Cat color="#1565c0" title="直乗せ履歴" mb>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", padding: "4px" }}>
              {directHistoryByAT.map((group, gi) => {
                const bgColor = gi % 2 === 0 ? "#e3f2fd" : "#fce4ec";
                return (
                  <div key={group.atKey} style={{ display: "flex", alignItems: "center", gap: "1px", backgroundColor: bgColor, borderRadius: "3px", padding: "2px 3px" }}>
                    <span style={{ fontSize: "7px", fontWeight: 700, color: "#374151", marginRight: "2px", lineHeight: 1.5 }}>{group.atKey}</span>
                    {group.items.map((d, i) => <SqIcon key={i} top={d.trigger} bottom={d.coins != null ? String(d.coins) : "—"} bg="#1565c0" />)}
                  </div>
                );
              })}
            </div>
          </Cat>
        )}

        {/* 招待状（設定差あり） */}
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

// ── レイアウト部品 (inline style for html2canvas compatibility) ──────────

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

function Row({ children, i, grade }: { children: React.ReactNode; i: number; grade?: SettingGrade }) {
  const sc = grade ? SETTING_COLORS[grade] : null;
  const baseBg = i % 2 === 0 ? "#ffffff" : "#f7f7f7";
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "3px 4px",
      backgroundColor: sc && grade !== "neutral" ? sc.bg : baseBg,
      color: sc && grade !== "neutral" ? sc.color : undefined,
      borderBottom: "1px solid #e5e7eb",
      lineHeight: 1.5,
      ...(grade === "vhigh" ? { fontWeight: 700 } : {}),
    }}>
      {children}
    </div>
  );
}

function Lbl({ children, b }: { children: React.ReactNode; b?: boolean }) {
  return (
    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "8px", color: "#4b5563", fontWeight: b ? 700 : 400, lineHeight: 1.5 }}>
      {children}
    </span>
  );
}

function Val({ children, b }: { children: React.ReactNode; b?: boolean }) {
  return (
    <span style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: "#111827", fontWeight: b ? 700 : 400, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", paddingLeft: "4px", lineHeight: 1.5 }}>
      {children}
    </span>
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
              <div key={d.zone} style={{
                width: `${(d.count / total) * 100}%`, minWidth: "16px",
                backgroundColor: zoneColor(d.zone), color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "6px", fontWeight: 700, lineHeight: 1.5,
              }}>{d.zone}</div>
            ))}
          </div>
          {filtered.map((d, i) => (
            <Row key={d.zone} i={i}><Lbl>{d.zone}</Lbl><Val>{d.count}回 [{pct(d.count, total)}]</Val></Row>
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

// ── 集計ヘルパー ────────────────────────────────────────────────────────────

function computeZoneDistribution(blocks: NormalBlock[], mode: "all" | "afterAT") {
  const filtered = mode === "all" ? blocks : blocks.filter((_, i) => i === 0 || blocks[i - 1].atWin);
  return [...TG_ZONES].filter((z) => z !== "不明").map((zone) => ({ zone, count: filtered.filter((b) => b.zone === zone).length }));
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
