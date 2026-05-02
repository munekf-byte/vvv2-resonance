"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: トータル数値分析 v3.1
// SummaryTab v3.1 と同じ書式（円グラフ・ゲージ・大型化）に統一
// =============================================================================

import { useState, useEffect, useRef } from "react";
import type { PlaySession, NormalBlock, TGATEntry, TGATSet, TGEndingCard } from "@/types";
import { lsGetSessionList, lsLoadSession, dbGetSessionList, dbLoadSession } from "@/lib/tg/localStore";
import { captureAndShare } from "@/lib/tg/captureImage";
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
import {
  multiSessionZoneExact, multiSessionZoneProrate,
  type ZoneData,
} from "@/lib/tg/analytics";
import {
  getATCharColor, getBitesTypeCellColor,
} from "@/lib/tg/cellColors";

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
    <div style={{ border: `2px solid ${color}`, borderRadius: "4px", overflow: "hidden", marginBottom: mb ? "6px" : 0 }}>
      <div style={{ backgroundColor: color, padding: "6px 8px", display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: 900, color: "#fff", lineHeight: 1.4, letterSpacing: "0.5px" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function THead({ cols, color, align = "right" }: {
  cols: { label: string; width: string }[];
  color: string;
  align?: "right" | "center";
}) {
  const lightBg = `${color}18`;
  const dataAlign = align === "center" ? "center" : "right";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols.map((c) => c.width).join(" "),
      borderBottom: `2px solid ${color}`,
      backgroundColor: lightBg,
    }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          fontSize: "10px", fontWeight: 700, color: "#374151",
          textAlign: i === 0 ? "left" : dataAlign,
          padding: "5px 6px", lineHeight: 1.5,
          borderRight: i < cols.length - 1 ? "1px solid #d1d5db" : "none",
        }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function TRow({ cols, values, i, grade, bg, fg, align = "right", wrap }: {
  cols: { width: string }[];
  values: React.ReactNode[];
  i: number;
  grade?: SettingGrade;
  bg?: string;
  fg?: string;
  align?: "right" | "center";
  wrap?: boolean;
}) {
  const sc = grade ? SETTING_COLORS[grade] : null;
  const baseBg = bg ? bg : (i % 2 === 0 ? "#ffffff" : "#f7f7f7");
  const dataJustify = align === "center" ? "center" : "flex-end";
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
          justifyContent: ci === 0 ? "flex-start" : dataJustify,
          padding: "6px 6px",
          fontSize: ci === 0 ? "12px" : "13px",
          fontWeight: ci === 0 ? 600 : 800,
          color: ci === 0 ? (sc && grade !== "neutral" ? undefined : "#1f2937") : undefined,
          lineHeight: 1.4,
          whiteSpace: wrap ? "normal" : "nowrap",
          overflow: wrap ? "visible" : "hidden",
          textOverflow: wrap ? "clip" : "ellipsis",
          wordBreak: wrap ? "break-all" : undefined,
          borderRight: ci < values.length - 1 ? "1px solid #e5e7eb" : "none",
          fontVariantNumeric: ci > 0 ? "tabular-nums" : undefined,
        }}>
          {v}
        </div>
      ))}
    </div>
  );
}

function SelBadge({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <div style={{
      backgroundColor: bg, color: fg,
      borderRadius: "4px", padding: "2px 3px",
      textAlign: "center", lineHeight: 1.4, overflow: "hidden",
    }}>
      <div style={{ opacity: 0.7, fontSize: "7px", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "9px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────────

export function TotalAnalysis() {
  const captureRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"date" | "balance" | "hall" | "setting">("date");

  useEffect(() => {
    (async () => {
      let list = lsGetSessionList();
      if (list.length === 0) {
        list = await dbGetSessionList();
      }
      const loaded: PlaySession[] = [];
      for (const meta of list) {
        let session = lsLoadSession(meta.id);
        if (!session) {
          session = await dbLoadSession(meta.id);
          if (session) {
            try { localStorage.setItem(`tgr_session_${meta.id}`, JSON.stringify(session)); } catch {}
          }
        }
        if (session) loaded.push(session);
      }
      setSessions(loaded);
      setSelectedIds(new Set(loaded.map((s) => s.id)));
      setLoading(false);
    })();
  }, []);

  function toggleSession(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 選択されたセッションのみで集計
  const activeSessions = sessions.filter((s) => selectedIds.has(s.id));
  const allBlocks = activeSessions.flatMap((s) => s.normalBlocks);
  const allATEntries = activeSessions.flatMap((s) => s.atEntries);
  const sessionCount = sessions.length;
  const selectedCount = activeSessions.length;

  if (loading) return <p className="text-center text-gray-500 font-mono py-8">読み込み中...</p>;
  if (sessionCount === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
      <span className="text-4xl">📊</span>
      <p className="text-gray-600 text-sm font-mono">稼働データがありません</p>
    </div>
  );

  // セッション選択パネル用のソートキー導出
  function getSortDerived(s: PlaySession): { balance: number | null; settingHint: string } {
    const bal = s.shushi
      ? Math.round((s.shushi.exchangeCoins ?? 0) - ((s.shushi.handCoins ?? 0) + (s.shushi.cashInvestK ?? 0) * s.shushi.coinRate))
      : null;
    const czFail = s.normalBlocks.filter((b) => b.endingSuggestion?.startsWith?.("[cz失敗]")).map((b) => b.endingSuggestion);
    const setsLocal = s.atEntries.flatMap((e) => e.rows.filter((r): r is TGATSet => r.rowType === "set"));
    const endScreen = setsLocal.map((x) => x.endingSuggestion ?? "").filter((x) => x.startsWith("[終了画面]"));
    const hint = inferSetting(czFail, endScreen, s.normalBlocks, s.atEntries);
    return { balance: bal, settingHint: hint };
  }
  const sortedSessions = [...sessions].sort((a, b) => {
    const ad = getSortDerived(a);
    const bd = getSortDerived(b);
    switch (sortKey) {
      case "balance":
        return (bd.balance ?? -99999) - (ad.balance ?? -99999);
      case "hall":
        return a.machineName.localeCompare(b.machineName, "ja");
      case "setting": {
        const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
        const rankA = ad.settingHint ? priority.findIndex((p) => ad.settingHint.includes(p)) : 99;
        const rankB = bd.settingHint ? priority.findIndex((p) => bd.settingHint.includes(p)) : 99;
        const ra = rankA === -1 ? 98 : rankA;
        const rb = rankB === -1 ? 98 : rankB;
        if (ra !== rb) return ra - rb;
        return (b.userSettingGuess ?? "").localeCompare(a.userSettingGuess ?? "", "ja");
      }
      case "date":
      default:
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    }
  });

  // ── 計算 ──
  // セッション毎の収支（ユーザー入力ベース） → トータル収支 + 勝敗
  const sessionBalances: number[] = activeSessions
    .map((s) => s.shushi
      ? (s.shushi.exchangeCoins ?? 0) - ((s.shushi.handCoins ?? 0) + (s.shushi.cashInvestK ?? 0) * s.shushi.coinRate)
      : null)
    .filter((b): b is number => b != null)
    .map((b) => Math.round(b));
  const totalBalance = sessionBalances.reduce((a, b) => a + b, 0);
  const wins = sessionBalances.filter((b) => b >= 0).length;
  const losses = sessionBalances.length - wins;
  const winPct = sessionBalances.length > 0 ? Math.round((wins / sessionBalances.length) * 100) : 0;

  const sum2 = allBlocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);

  // CZ別カウント
  const reminiBlocks = allBlocks.filter((b) => b.event === "レミニセンス");
  const ooguiBlocks  = allBlocks.filter((b) => b.event === "大喰いの利世");
  const reminiCount  = reminiBlocks.length;
  const ooguiCount   = ooguiBlocks.length;
  const reminiWin    = reminiBlocks.filter((b) => b.atWin).length;
  const ooguiWin     = ooguiBlocks.filter((b) => b.atWin).length;
  const czCount      = reminiCount + ooguiCount;
  const czWin        = reminiWin + ooguiWin;

  const epiCount = allBlocks.filter((b) => b.event === "エピソードボーナス").length;
  const directATCount = allBlocks.filter((b) => b.event === "直撃AT").length;
  const atWinCount = allBlocks.filter((b) => b.atWin).length;
  const hikimodoCount = allBlocks.filter((b) => b.event === "引き戻し").length;

  // CZ内容集計
  const hasCzActivity = (b: typeof allBlocks[number]) =>
    !!b.czCounter && (b.czCounter.bell > 0 || b.czCounter.replay > 0 || b.czCounter.weakRare > 0 || b.czCounter.strongRare > 0);
  function aggregateCz(list: typeof allBlocks) {
    const arr = list.filter(hasCzActivity);
    return {
      blocks: arr,
      totalBell:       arr.reduce((s, b) => s + (b.czCounter?.bell ?? 0), 0),
      totalReplay:     arr.reduce((s, b) => s + (b.czCounter?.replay ?? 0), 0),
      totalWeakRare:   arr.reduce((s, b) => s + (b.czCounter?.weakRare ?? 0), 0),
      totalStrongRare: arr.reduce((s, b) => s + (b.czCounter?.strongRare ?? 0), 0),
      hitBell:       arr.filter((b) => b.czCounter?.hitRole === "bell").length,
      hitReplay:     arr.filter((b) => b.czCounter?.hitRole === "replay").length,
      hitWeakRare:   arr.filter((b) => b.czCounter?.hitRole === "weakRare").length,
      hitStrongRare: arr.filter((b) => b.czCounter?.hitRole === "strongRare").length,
      successCount:  arr.filter((b) => !!b.czCounter?.hitRole).length,
    };
  }
  const czReminiAgg = aggregateCz(reminiBlocks);
  const czOoguiAgg  = aggregateCz(ooguiBlocks);
  const czTotalAgg  = aggregateCz(allBlocks);

  const allKakugan = allBlocks.flatMap((b) => b.kakugan);
  const kakuganTotal = allKakugan.length;
  const kakuganBD = [...TG_KAKUGAN].map((k) => ({ label: k, count: allKakugan.filter((v) => v === k).length }));
  const allShinsekai = allBlocks.flatMap((b) => b.shinsekai);
  const shinsekaiTotal = allShinsekai.length;
  const shinsekaiBS = [...TG_SHINSEKAI].map((s) => ({ label: s, count: allShinsekai.filter((v) => v === s).length }));
  // 精神世界中の弱レア役 — セッション単位カウンターを全セッション合算
  const shinsekaiWeakRareMiss = activeSessions
    .reduce((s, sess) => s + (sess.shinsekaiWeakRare?.miss ?? 0), 0);
  const shinsekaiWeakRareWin = activeSessions
    .reduce((s, sess) => s + (sess.shinsekaiWeakRare?.win ?? 0), 0);
  const shinsekaiWeakRareTotal = shinsekaiWeakRareMiss + shinsekaiWeakRareWin;

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

  // エンディングカード集計
  const allEndingCards = allSets.map((s) => s.endingCard).filter(Boolean) as TGEndingCard[];
  const ecSum = (key: keyof TGEndingCard) => allEndingCards.reduce((s, ec) => s + (ec[key] ?? 0), 0);
  const ecTotal =
    ecSum("whiteWeak") + ecSum("whiteStrong") + ecSum("blueWeak") + ecSum("blueStrong") +
    ecSum("redWeak") + ecSum("redStrong") + ecSum("copper1") + ecSum("copper2") +
    ecSum("copper3") + ecSum("copper4") + ecSum("confirmed1") + ecSum("confirmed2") +
    ecSum("confirmed3") + ecSum("confirmed4");

  const zoneAllExact     = multiSessionZoneExact(activeSessions, "all");
  const zoneAllProrate   = multiSessionZoneProrate(activeSessions, "all");
  const zoneATExact      = multiSessionZoneExact(activeSessions, "afterAT");
  const zoneATProrate    = multiSessionZoneProrate(activeSessions, "afterAT");

  const settingHints = inferSetting(czFailSuggestions, allEndScreenFromAT, allBlocks, allATEntries);

  // 設定示唆 出現回数カウント（各確定レベルが何回現れたか）
  const settingCounts: Record<string, number> = {
    "6確定濃厚": 0,
    "5以上濃厚": 0,
    "4以上濃厚": 0,
    "3以上濃厚": 0,
    "2以上濃厚": 0,
    "1否定":     0,
  };
  for (const s of [...czFailSuggestions, ...allEndScreenFromAT]) {
    if (s.includes("設定6濃厚"))      settingCounts["6確定濃厚"]++;
    else if (s.includes("設定5以上濃厚")) settingCounts["5以上濃厚"]++;
    else if (s.includes("設定4以上濃厚")) settingCounts["4以上濃厚"]++;
    else if (s.includes("設定3以上濃厚")) settingCounts["3以上濃厚"]++;
    else if (s.includes("設定2以上濃厚")) settingCounts["2以上濃厚"]++;
    else if (s.includes("設定1否定"))   settingCounts["1否定"]++;
  }
  const allTrophies = [...allBlocks.map((b) => b.trophy), ...allSets.map((s) => s.trophy ?? "")].filter(Boolean) as string[];
  for (const t of allTrophies) {
    if (t.includes("虹"))           settingCounts["6確定濃厚"]++;
    else if (t.includes("喰種柄"))  settingCounts["5以上濃厚"]++;
    else if (t.includes("金"))      settingCounts["4以上濃厚"]++;
    else if (t.includes("銀"))      settingCounts["3以上濃厚"]++;
    else if (t.includes("銅"))      settingCounts["2以上濃厚"]++;
  }
  for (const ec of allEndingCards) {
    if (ec.confirmed4 > 0) settingCounts["6確定濃厚"] += ec.confirmed4;
    if (ec.confirmed3 > 0) settingCounts["5以上濃厚"] += ec.confirmed3;
    if (ec.confirmed2 > 0) settingCounts["4以上濃厚"] += ec.confirmed2;
    if (ec.confirmed1 > 0) settingCounts["3以上濃厚"] += ec.confirmed1;
  }
  for (const entry of allATEntries) for (const row of entry.rows) {
    if (row.rowType !== "set") continue;
    if (row.coinsHint === "666OVER" || row.coinsHint === "1000-7OVER") settingCounts["6確定濃厚"]++;
    else if (row.coinsHint === "456OVER")                              settingCounts["4以上濃厚"]++;
  }

  // 共通列定義
  const COLS3 = [{ label: "項目", width: "1fr" }, { label: "回数", width: "92px" }, { label: "確率", width: "96px" }];
  const COLS3_PCT = [{ label: "項目", width: "1fr" }, { label: "回数", width: "44px" }, { label: "割合", width: "52px" }];
  const COLS_CZ = [{ label: "役", width: "1fr" }, { label: "発生", width: "78px" }, { label: "当選", width: "78px" }, { label: "当選率", width: "82px" }];
  const COLS_INV = [{ label: "招待状", width: "1fr" }, { label: "回数", width: "40px" }, { label: "示唆", width: "1fr" }];

  return (
    <div>
      {/* ヘッダー + セッション選択 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-mono font-bold text-gray-900">トータル数値分析</h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {selectedCount === sessionCount ? `全${sessionCount}セッション` : `${selectedCount} / ${sessionCount} セッション選択中`}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setSelectorOpen(!selectorOpen)}
              className="text-[10px] font-mono font-bold px-3 py-2 rounded active:scale-95 transition-transform"
              style={{ backgroundColor: selectorOpen ? "#1f2937" : "#e5e7eb", color: selectorOpen ? "#fff" : "#374151" }}>
              {selectorOpen ? "閉じる" : "セッション選択"}
            </button>
            <button onClick={() => captureRef.current && captureAndShare(captureRef.current, `TG_Total_${new Date().toISOString().slice(0, 10)}.png`)}
              className="text-[10px] font-mono font-bold px-3 py-2 rounded active:scale-95 transition-transform"
              style={{ backgroundColor: "#facc15", color: "#1f2937", border: "2px solid #1f2937" }}>
              画像で保存
            </button>
          </div>
        </div>

        {/* セッション選択パネル */}
        {selectorOpen && (
          <div className="mt-2 bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
            <style>{`
              .tgr-session-scroll::-webkit-scrollbar { width: 14px; }
              .tgr-session-scroll::-webkit-scrollbar-track { background: #e5e7eb; border-left: 1px solid #d1d5db; }
              .tgr-session-scroll::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 7px; border: 2px solid #e5e7eb; }
              .tgr-session-scroll::-webkit-scrollbar-thumb:hover { background: #1f2937; }
              .tgr-session-scroll { scrollbar-width: auto; scrollbar-color: #4b5563 #e5e7eb; }
            `}</style>
            <div className="flex gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 items-center flex-wrap">
              <button onClick={() => setSelectedIds(new Set(sessions.map((s) => s.id)))}
                className="text-[9px] font-mono font-bold px-2 py-1 rounded bg-gray-700 text-white active:scale-95">全選択</button>
              <button onClick={() => setSelectedIds(new Set())}
                className="text-[9px] font-mono font-bold px-2 py-1 rounded border border-gray-400 text-gray-600 active:scale-95">全解除</button>
              {sessions.length > 1 && (
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                  className="text-[10px] font-mono font-bold px-2 py-1 rounded border-2 border-gray-400 bg-white text-gray-700 focus:outline-none focus:border-gray-600"
                >
                  <option value="date">日付順</option>
                  <option value="balance">勝ち額順</option>
                  <option value="hall">ホール名順</option>
                  <option value="setting">設定順</option>
                </select>
              )}
              <span className="text-[9px] font-mono text-gray-500 ml-auto">{selectedCount}/{sessionCount}件</span>
            </div>
            <div className="relative">
              <div className="tgr-session-scroll overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: "580px" }}>
                {sortedSessions.map((s) => {
                  const checked = selectedIds.has(s.id);
                  const totalG = s.normalBlocks.reduce((sum, b) => sum + (b.jisshuG ?? 0), 0);
                  const atC = s.normalBlocks.filter((b) => b.atWin).length;
                  const czFail = s.normalBlocks.filter((b) => b.endingSuggestion?.startsWith?.("[cz失敗]")).map((b) => b.endingSuggestion);
                  const allSets = s.atEntries.flatMap((e) => e.rows.filter((r): r is TGATSet => r.rowType === "set"));
                  const endScreen = allSets.map((x) => x.endingSuggestion ?? "").filter((x) => x.startsWith("[終了画面]"));
                  const settingHint = inferSetting(czFail, endScreen, s.normalBlocks, s.atEntries);
                  const userGuess = s.userSettingGuess || "";
                  const balance = s.shushi
                    ? (s.shushi.exchangeCoins ?? 0) - ((s.shushi.handCoins ?? 0) + (s.shushi.cashInvestK ?? 0) * s.shushi.coinRate)
                    : null;
                  const balanceText = balance != null ? (balance >= 0 ? `+${Math.round(balance).toLocaleString()}` : Math.round(balance).toLocaleString()) : "—";
                  const dateStr = new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });

                  return (
                    <button key={s.id} onClick={() => toggleSession(s.id)}
                      className="w-full px-3 py-2 text-left transition-colors"
                      style={{ backgroundColor: checked ? "#eff6ff" : "#ffffff" }}>
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5" style={{
                          width: "26px", height: "26px", borderRadius: "6px",
                          border: `2px solid ${checked ? "#1f2937" : "#9ca3af"}`,
                          backgroundColor: checked ? "#1f2937" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: "16px", fontWeight: 800, lineHeight: 1,
                        }}>
                          {checked ? "✓" : ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <p className="text-[11px] font-mono font-bold text-gray-800 truncate">{s.machineName}</p>
                            <span className="text-[9px] font-mono text-gray-400 shrink-0">{dateStr}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            <SelBadge label="確定" value={settingHint || "—"} bg="#dbeafe" fg="#1e40af" />
                            <SelBadge label="推測" value={userGuess || "—"} bg="#fef3c7" fg="#92400e" />
                            <SelBadge label="収支"
                              value={balanceText}
                              bg={balance != null ? (balance >= 0 ? "#d1fae5" : "#fecaca") : "#f3f4f6"}
                              fg={balance != null ? (balance >= 0 ? "#065f46" : "#991b1b") : "#6b7280"} />
                            <SelBadge label="総G" value={totalG > 0 ? totalG.toLocaleString() : "—"} bg="#e0e7ff" fg="#3730a3" />
                            <SelBadge label="AT" value={atC > 0 ? `${atC}回` : "—"} bg="#f3e8ff" fg="#6b21a8" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {sessions.length > 10 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 flex items-end justify-center pb-1"
                  style={{ background: "linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)" }}>
                  <span className="text-[9px] font-mono text-gray-700 font-bold">▼ さらに下へスクロール</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={captureRef} style={{ padding: "8px 6px", backgroundColor: "#ffffff", fontFamily: "monospace" }}>

        {/* ===== 0. トータル収支 / トータル勝率（最上部） ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "10px 6px", borderRadius: "6px",
            border: `2px solid ${sessionBalances.length === 0 ? "#9ca3af" : (totalBalance >= 0 ? "#16a34a" : "#dc2626")}`,
            backgroundColor: sessionBalances.length === 0 ? "#f9fafb" : (totalBalance >= 0 ? "#f0fdf4" : "#fef2f2"),
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", letterSpacing: "0.5px" }}>
              トータル収支
            </span>
            <span style={{
              fontSize: "26px", fontWeight: 900, lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              color: sessionBalances.length === 0 ? "#9ca3af" : (totalBalance >= 0 ? "#15803d" : "#b91c1c"),
            }}>
              {sessionBalances.length === 0 ? "—" : `${totalBalance >= 0 ? "+" : ""}${totalBalance.toLocaleString()}`}
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
              {sessionBalances.length === 0 ? "収支データなし" : `枚（${sessionBalances.length}稼働）`}
            </span>
          </div>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "10px 6px", borderRadius: "6px",
            border: `2px solid ${sessionBalances.length === 0 ? "#9ca3af" : (winPct >= 50 ? "#1d4ed8" : "#9333ea")}`,
            backgroundColor: sessionBalances.length === 0 ? "#f9fafb" : (winPct >= 50 ? "#eff6ff" : "#faf5ff"),
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px", letterSpacing: "0.5px" }}>
              トータル勝率
            </span>
            <span style={{
              fontSize: "26px", fontWeight: 900, lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              color: sessionBalances.length === 0 ? "#9ca3af" : (winPct >= 50 ? "#1e40af" : "#7e22ce"),
            }}>
              {sessionBalances.length === 0 ? "—" : `${winPct}%`}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
              {sessionBalances.length === 0 ? "—" : `${wins}勝${losses}敗`}
            </span>
          </div>
        </div>

        {/* ===== 1. 通常時（全幅・CZ内訳付き） ===== */}
        {(() => {
          const COLS_NORMAL = [
            { label: "項目",  width: "1fr" },
            { label: "回数",  width: "92px" },
            { label: "確率",  width: "96px" },
          ];
          return (
            <Cat color="#1565c0" title={`通常時 (${selectedCount}稼働)`} mb>
              <THead cols={COLS_NORMAL} color="#1565c0" align="center" />
              <TRow cols={COLS_NORMAL} i={0} align="center" values={[<b key="l">通常時G</b>, `${sum2.toLocaleString()}G`, "—"]} />
              <TRow cols={COLS_NORMAL} i={1} align="center" values={[<b key="l">CZ合計</b>, `${czCount}回`, prob(czCount, sum2)]} grade={gradeByProb(czCount, sum2, [...CZ_PROB])} />
              <TRow cols={COLS_NORMAL} i={2} align="center" values={[<span key="l" style={{ paddingLeft: "12px" }}>└ レミニ 出現</span>, `${reminiCount}回`, czCount > 0 ? pct(reminiCount, czCount) : "—"]} />
              <TRow cols={COLS_NORMAL} i={3} align="center" values={[<span key="l" style={{ paddingLeft: "20px", color: "#0f913c" }}>└ レミニ 成功率</span>, `${reminiWin}/${reminiCount}`, reminiCount > 0 ? pct(reminiWin, reminiCount) : "—"]} />
              <TRow cols={COLS_NORMAL} i={4} align="center" values={[<span key="l" style={{ paddingLeft: "12px" }}>└ 大喰い 出現</span>, `${ooguiCount}回`, czCount > 0 ? pct(ooguiCount, czCount) : "—"]} />
              <TRow cols={COLS_NORMAL} i={5} align="center" values={[<span key="l" style={{ paddingLeft: "20px", color: "#cf5858" }}>└ 大喰い 成功率</span>, `${ooguiWin}/${ooguiCount}`, ooguiCount > 0 ? pct(ooguiWin, ooguiCount) : "—"]} />
              <TRow cols={COLS_NORMAL} i={6} align="center" values={[<b key="l" style={{ color: "#7b1fa2" }}>CZ合計成功率</b>, `${czWin}/${czCount}`, czCount > 0 ? pct(czWin, czCount) : "—"]} />
              <TRow cols={COLS_NORMAL} i={7} align="center" values={[<b key="l">エピボ</b>, `${epiCount}回`, prob(epiCount, sum2)]} grade={gradeByProb(epiCount, sum2, [...EPI_PROB])} />
              <TRow cols={COLS_NORMAL} i={8} align="center" values={[<b key="l">AT直撃</b>, `${directATCount}回`, prob(directATCount, sum2)]} grade={gradeByProb(directATCount, sum2, [...DIRECT_AT_PROB])} />
              <TRow cols={COLS_NORMAL} i={9} align="center" values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
            </Cat>
          );
        })()}

        {/* ===== 1b. AT当選要因（円グラフ）— CZ内容より上 ===== */}
        {(reminiWin + ooguiWin + epiCount + directATCount + hikimodoCount) > 0 && (() => {
          const AT_TRIGGER_COLORS = {
            remini:   "#0f913c",
            oogui:    "#cf5858",
            epi:      "#fdff00",
            direct:   "#581c87",
            hikimodo: "#1d4ed8",
          };
          const totalTrig = reminiWin + ooguiWin + epiCount + directATCount + hikimodoCount;
          return (
            <Cat color="#0f913c" title="AT当選要因 内訳" mb>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px", padding: "10px 12px", alignItems: "center" }}>
                <PieChart
                  size={120}
                  donut
                  centerLabel={`${totalTrig}回`}
                  slices={[
                    { value: reminiWin,    color: AT_TRIGGER_COLORS.remini,   label: "レミニ" },
                    { value: ooguiWin,     color: AT_TRIGGER_COLORS.oogui,    label: "大喰い" },
                    { value: epiCount,     color: AT_TRIGGER_COLORS.epi,      label: "エピボ" },
                    { value: directATCount,color: AT_TRIGGER_COLORS.direct,   label: "直撃" },
                    { value: hikimodoCount,color: AT_TRIGGER_COLORS.hikimodo, label: "引戻" },
                  ]}
                />
                <PieLegend
                  total={totalTrig}
                  items={[
                    { label: "レミニ成功", value: reminiWin,     color: AT_TRIGGER_COLORS.remini },
                    { label: "大喰い成功", value: ooguiWin,      color: AT_TRIGGER_COLORS.oogui },
                    { label: "エピボ",     value: epiCount,      color: AT_TRIGGER_COLORS.epi },
                    { label: "AT直撃",    value: directATCount, color: AT_TRIGGER_COLORS.direct },
                    { label: "引き戻し",  value: hikimodoCount, color: AT_TRIGGER_COLORS.hikimodo },
                  ]}
                />
              </div>
            </Cat>
          );
        })()}

        {/* ===== 1c. CZ内容（役別当選率）— レミニ / 大喰い / 合計 ===== */}
        {([
          { title: "CZ内容 — レミニセンス（役別 当選率）", agg: czReminiAgg, color: "#0f913c", bg: "#dcfce7", textDeep: "#14532d", textMid: "#15803d" },
          { title: "CZ内容 — 大喰いの利世（役別 当選率）", agg: czOoguiAgg,  color: "#cf5858", bg: "#fee2e2", textDeep: "#7f1d1d", textMid: "#b91c1c" },
          { title: "CZ内容 — 全体合計（役別 当選率）",   agg: czTotalAgg,  color: "#7b1fa2", bg: "#f3e8ff", textDeep: "#6b21a8", textMid: "#7b1fa2" },
        ] as const).map(({ title, agg, color, bg, textDeep, textMid }) => (
          <Cat key={title} color={color} title={title} mb>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              borderBottom: `2px solid ${color}`, backgroundColor: bg, padding: "6px 8px", gap: "8px",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: textDeep, lineHeight: 1.4 }}>CZ記録</span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: "#1f2937", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{agg.blocks.length}回</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: textDeep, lineHeight: 1.4 }}>成功</span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: "#16a34a", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{agg.successCount}回</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: textDeep, lineHeight: 1.4 }}>成功率</span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: textMid, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
                  {agg.blocks.length > 0 ? pct(agg.successCount, agg.blocks.length) : "—"}
                </span>
              </div>
            </div>
            <THead cols={COLS_CZ} color={color} align="center" />
            {([
              { label: "押/斜🔔", total: agg.totalBell, hit: agg.hitBell },
              { label: "リプ", total: agg.totalReplay, hit: agg.hitReplay },
              { label: "弱レア", total: agg.totalWeakRare, hit: agg.hitWeakRare },
              { label: "強レア", total: agg.totalStrongRare, hit: agg.hitStrongRare },
            ] as const).map((r, i) => (
              <TRow key={r.label} cols={COLS_CZ} i={i} align="center" values={[
                r.label, `${r.total}回`,
                r.hit > 0 ? <span key="h" style={{ color: "#b91c1c" }}>★{r.hit}</span> : "—",
                r.total > 0 ? pct(r.hit, r.total) : "—",
              ]} />
            ))}
          </Cat>
        ))}

        {/* ===== 2. AT（全幅） ===== */}
        <Cat color="#2e7d32" title="AT" mb>
          <THead cols={COLS3} color="#2e7d32" align="center" />
          <TRow cols={COLS3} i={0} align="center" values={[<b key="l">AT初当たり</b>, `${atWinCount}回`, prob(atWinCount, sum2)]} grade={gradeByProb(atWinCount, sum2, [...AT_COMBINED_PROB])} />
          <TRow cols={COLS3} i={1} align="center" values={[<b key="l">引き戻し率</b>, `${hikimodoCount}回`, atWinCount > 0 ? pct(hikimodoCount, atWinCount) : "—"]}
            grade={gradeByRate(hikimodoCount, atWinCount, HIKIMODOHI_RATE[0], HIKIMODOHI_RATE[5])} />
          <TRow cols={COLS3} i={2} align="center" values={[<b key="l">裏AT突入率</b>, `${uraATEntryCount}回`, atWinCount > 0 ? pct(uraATEntryCount, atWinCount) : "—"]}
            grade={gradeByRate(uraATEntryCount, atWinCount, URA_AT_RATE[0], URA_AT_RATE[5])} />
        </Cat>

        {/* ===== 2a. 設定示唆（出現回数）======================== */}
        <Cat color="#e65100" title="設定示唆 出現回数" mb>
          {(() => {
            const SETTING_ROWS: { key: string; label: string; bg: string; border: string; fg: string }[] = [
              { key: "6確定濃厚", label: "設定6 確定濃厚",   bg: "#fef3c7", border: "#facc15", fg: "#78350f" },
              { key: "5以上濃厚", label: "設定5以上 濃厚",   bg: "#fde68a", border: "#fcd34d", fg: "#7c2d12" },
              { key: "4以上濃厚", label: "設定4以上 濃厚",   bg: "#fee2e2", border: "#f87171", fg: "#7f1d1d" },
              { key: "3以上濃厚", label: "設定3以上 濃厚",   bg: "#fecaca", border: "#fca5a5", fg: "#7f1d1d" },
              { key: "2以上濃厚", label: "設定2以上 濃厚",   bg: "#ffe4e6", border: "#fca5a5", fg: "#9f1239" },
              { key: "1否定",     label: "設定1 否定",       bg: "#fff1f2", border: "#fecdd3", fg: "#9f1239" },
            ];
            return (
              <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {SETTING_ROWS.map(({ key, label, bg, border, fg }) => {
                  const c = settingCounts[key] ?? 0;
                  const dim = c === 0;
                  return (
                    <div key={key} style={{
                      border: `1.5px solid ${dim ? "#e5e7eb" : border}`,
                      borderRadius: "4px",
                      backgroundColor: dim ? "#f9fafb" : bg,
                      padding: "8px 12px",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                    }}>
                      <span style={{
                        fontSize: "13px", fontWeight: 800, letterSpacing: "0.3px",
                        color: dim ? "#9ca3af" : fg, lineHeight: 1.3,
                      }}>{label}</span>
                      <span style={{
                        fontSize: "18px", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                        color: dim ? "#9ca3af" : "#1f2937", lineHeight: 1.1,
                      }}>
                        {c}<span style={{ fontSize: "11px", fontWeight: 700, marginLeft: "3px", color: dim ? "#9ca3af" : "#6b7280" }}>回</span>
                      </span>
                    </div>
                  );
                })}
                <div style={{
                  marginTop: "2px", border: "1.5px solid #d4d4d4", borderRadius: "4px",
                  backgroundColor: "#fafafa", padding: "8px 12px",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#374151", letterSpacing: "0.3px" }}>
                    トロフィー獲得
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "#1f2937", fontVariantNumeric: "tabular-nums" }}>
                    {trophyCount}<span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginLeft: "3px" }}>回</span>
                  </span>
                </div>
              </div>
            );
          })()}
        </Cat>

        {/* ===== 2b. 有馬set（AT+設定示唆の直下） ===== */}
        {arimaByPos.some((a) => a.total > 0) && (
          <Cat color="#f59e0b" title="有馬set（1,3,5セット目）" mb>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", padding: "8px" }}>
              {arimaByPos.map(({ pos, count, total }) => (
                <div key={pos} style={{ textAlign: "center", backgroundColor: "#fffbeb", borderRadius: "4px", padding: "8px 4px", border: "1.5px solid #f59e0b" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", lineHeight: 1.4 }}>{pos}set目</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#1f2937", lineHeight: 1.2, marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>
                    {count}<span style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", margin: "0 2px" }}>/</span>{total}
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400e", lineHeight: 1.3, marginTop: "1px" }}>
                    {pos === 1 ? "AT初当たり中" : `${pos}set到達中`}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#b45309", lineHeight: 1.3, marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                    {pct(count, total)}
                  </div>
                </div>
              ))}
            </div>
          </Cat>
        )}

        {/* ===== 3. 赫眼 / 精神世界 ===== */}
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
            <TRow cols={COLS3_PCT} i={shinsekaiBS.length + 1}
              values={[<b key="l">弱レア役 発生</b>, `${shinsekaiWeakRareTotal}回`, "—"]} />
            <TRow cols={COLS3_PCT} i={shinsekaiBS.length + 2}
              values={[`　ハズレ`, `${shinsekaiWeakRareMiss}回`, pct(shinsekaiWeakRareMiss, shinsekaiWeakRareTotal)]} />
            <TRow cols={COLS3_PCT} i={shinsekaiBS.length + 3}
              values={[`　当選`, `${shinsekaiWeakRareWin}回`, pct(shinsekaiWeakRareWin, shinsekaiWeakRareTotal)]} />
            <TRow cols={COLS3_PCT} i={shinsekaiBS.length + 4}
              values={[<b key="l">当選率</b>, `${shinsekaiWeakRareWin}/${shinsekaiWeakRareTotal}`, pct(shinsekaiWeakRareWin, shinsekaiWeakRareTotal)]} />
          </Cat>
        </div>

        {/* ===== 4. CZ失敗 / 終了画面（全幅・名前折り返し可） ===== */}
        <Cat color="#bf360c" title="[cz失敗] 終了画面" mb>
          <THead cols={[{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "60px" }, { label: "割合", width: "60px" }]} color="#bf360c" />
          {(() => {
            const items = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]"));
            const t = czFailSuggestions.length;
            return items.map((s, i) => {
              const c = czFailSuggestions.filter((v) => v === s).length;
              return (
                <TRow key={s} cols={[{ width: "1fr" }, { width: "60px" }, { width: "60px" }]} i={i}
                  bg={suggBg(s)} fg={suggTextColor(s)} wrap
                  values={[extractName(s), `${c}回`, t > 0 ? pct(c, t) : "—"]} />
              );
            });
          })()}
        </Cat>

        <Cat color="#4e342e" title="[終了画面] 示唆" mb>
          <THead cols={[{ label: "キャラ名", width: "1fr" }, { label: "回数", width: "60px" }, { label: "割合", width: "60px" }]} color="#4e342e" />
          {endScreenItems.map((s, i) => {
            const c = allEndScreenFromAT.filter((v) => v === s).length;
            const t = allEndScreenFromAT.length;
            return (
              <TRow key={s} cols={[{ width: "1fr" }, { width: "60px" }, { width: "60px" }]} i={i}
                bg={suggBg(s)} fg={suggTextColor(s)} wrap
                values={[extractName(s), `${c}回`, pct(c, t)]} />
            );
          })}
        </Cat>

        {/* ===== 5. ゲーム数ゾーン集計（確定） ===== */}
        <ZoneBlock label="全体[確定]" data={zoneAllExact} headerColor="#1565c0" />
        <div style={{ height: "6px" }} />
        <ZoneBlock label="AT後[確定]" data={zoneATExact} headerColor="#e65100" />
        <div style={{ height: "6px" }} />

        {/* ===== 6. ゲーム数ゾーン集計（按分） ===== */}
        <ZoneBlock label="全体[按分]" data={zoneAllProrate} prorated headerColor="#1565c0" showDesc />
        <div style={{ height: "6px" }} />
        <ZoneBlock label="AT後[按分]" data={zoneATProrate} prorated headerColor="#e65100" showDesc />
        <div style={{ height: "6px" }} />

        {/* ===== 7. キャラ対決（ゲージバー） ===== */}
        <Cat color="#1b5e20" title="キャラ対決成績" mb>
          <THead cols={[
            { label: "キャラ", width: "1fr" },
            { label: "成績", width: "60px" },
            { label: "勝率", width: "52px" },
          ]} color="#1b5e20" />
          {charStats.map(({ char, wins, total }, i) => {
            const charColor = getATCharColor(char).backgroundColor;
            const bg = i % 2 === 0 ? "#ffffff" : "#f7f7f7";
            return (
              <div key={char} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: bg, padding: "6px 6px 8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 52px", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: charColor, lineHeight: 1.4, paddingLeft: "4px",
                  }}>{char}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: "#1f2937", textAlign: "right",
                    fontVariantNumeric: "tabular-nums", lineHeight: 1.4,
                  }}>{total > 0 ? `${wins}/${total}` : "—"}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: "#1f2937", textAlign: "right",
                    fontVariantNumeric: "tabular-nums", lineHeight: 1.4,
                  }}>{total > 0 ? pct(wins, total) : "—"}</span>
                </div>
                <WinGauge wins={wins} total={total} color={charColor} />
              </div>
            );
          })}
        </Cat>

        {/* ===== 7b. BITESテーブル（円グラフ + 凡例） ===== */}
        {bitesTotal > 0 && (
          <Cat color="#33691e" title={`BITESテーブル (${bitesTotal}回)`} mb>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", padding: "8px 10px", alignItems: "center" }}>
              <PieChart
                size={108}
                donut
                centerLabel={`${bitesTotal}`}
                slices={[...TG_BITES_TYPES].map((bt) => ({
                  value: allSets.filter((s) => s.bitesType === bt).length,
                  color: getBitesTypeCellColor(bt).backgroundColor,
                  label: getBitesShort(bt),
                }))}
              />
              <PieLegend
                total={bitesTotal}
                items={[...TG_BITES_TYPES]
                  .map((bt) => ({
                    label: getBitesShort(bt),
                    value: allSets.filter((s) => s.bitesType === bt).length,
                    color: getBitesTypeCellColor(bt).backgroundColor,
                  }))
                  .filter((it) => it.value > 0)
                }
              />
            </div>
          </Cat>
        )}
        {bitesTotal === 0 && (
          <Cat color="#33691e" title="BITESテーブル" mb>
            <div style={{ padding: "12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>
              データなし
            </div>
          </Cat>
        )}

        {/* ===== 8. エンディングカード集計（円グラフ） ===== */}
        {ecTotal > 0 && (
          <Cat color="#6d4c41" title={`エンディングカード (${ecTotal}枚)`} mb>
            {(() => {
              type ECKey = keyof TGEndingCard;
              const ALL: { key: ECKey; label: string; color: string }[] = [
                { key: "whiteWeak",   label: "白[奇数弱]",   color: "#d1d5db" },
                { key: "whiteStrong", label: "白[奇数強]",   color: "#6b7280" },
                { key: "blueWeak",    label: "青[偶数弱]",   color: "#93c5fd" },
                { key: "blueStrong",  label: "青[偶数強]",   color: "#1d4ed8" },
                { key: "redWeak",     label: "赤[高設定弱]", color: "#fca5a5" },
                { key: "redStrong",   label: "赤[高設定強]", color: "#b91c1c" },
                { key: "copper1",     label: "銅[1否定]",    color: "#fcd34d" },
                { key: "copper2",     label: "銅[2否定]",    color: "#a16207" },
                { key: "copper3",     label: "銅[3否定]",    color: "#7c2d12" },
                { key: "copper4",     label: "銅[4否定]",    color: "#451a03" },
                { key: "confirmed1",  label: "銀[3↑濃厚]",   color: "#14b8a6" },
                { key: "confirmed2",  label: "金[4↑濃厚]",   color: "#f59e0b" },
                { key: "confirmed3",  label: "金[5↑濃厚]",   color: "#ea580c" },
                { key: "confirmed4",  label: "虹[6濃厚]",    color: "#9333ea" },
              ];
              const items = ALL.map((it) => ({ ...it, value: ecSum(it.key) })).filter((it) => it.value > 0);
              const redTotal  = ecSum("redWeak") + ecSum("redStrong");
              const blueTotal = ecSum("blueWeak") + ecSum("blueStrong");
              const grayTotal = ecSum("whiteWeak") + ecSum("whiteStrong");
              return (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px",
                    padding: "8px 10px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fafaf9",
                  }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      backgroundColor: "#fee2e2", border: "1.5px solid #b91c1c", borderRadius: "4px", padding: "6px 4px",
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#7f1d1d", lineHeight: 1.4 }}>赤カード率</span>
                      <span style={{ fontSize: "18px", fontWeight: 900, color: "#b91c1c", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                        {ecTotal > 0 ? pct(redTotal, ecTotal) : "—"}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#7f1d1d", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
                        {redTotal}/{ecTotal}枚
                      </span>
                    </div>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      backgroundColor: "#dbeafe", border: "1.5px solid #1d4ed8", borderRadius: "4px", padding: "6px 4px",
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e3a8a", lineHeight: 1.4 }}>青カード率</span>
                      <span style={{ fontSize: "18px", fontWeight: 900, color: "#1d4ed8", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                        {ecTotal > 0 ? pct(blueTotal, ecTotal) : "—"}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e3a8a", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
                        {blueTotal}/{ecTotal}枚
                      </span>
                    </div>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      backgroundColor: "#f3f4f6", border: "1.5px solid #6b7280", borderRadius: "4px", padding: "6px 4px",
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#374151", lineHeight: 1.4 }}>白カード率</span>
                      <span style={{ fontSize: "18px", fontWeight: 900, color: "#4b5563", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                        {ecTotal > 0 ? pct(grayTotal, ecTotal) : "—"}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#374151", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
                        {grayTotal}/{ecTotal}枚
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px", padding: "10px 12px", alignItems: "center" }}>
                    <PieChart
                      size={140}
                      donut
                      centerLabel={`${ecTotal}枚`}
                      slices={items.map((it) => ({ value: it.value, color: it.color, label: it.label }))}
                    />
                    <PieLegend
                      total={ecTotal}
                      items={items.map((it) => ({ label: it.label, value: it.value, color: it.color }))}
                    />
                  </div>
                </>
              );
            })()}
          </Cat>
        )}

        {/* ===== 9. 招待状（設定示唆・色分け） ===== */}
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
  const fmt = (n: number) => prorated ? n.toFixed(1) : String(n);
  const totalLabel = prorated ? total.toFixed(1) : String(total);
  const c = headerColor ?? "#6a1b9a";

  return (
    <Cat color={c} title={`ゾーン ${label} (${totalLabel})`}>
      {showDesc && (
        <div style={{ backgroundColor: "#f5f3ff", padding: "5px 8px", borderBottom: "1px solid #e5e7eb", fontSize: "10px", color: "#4b5563", lineHeight: 1.5 }}>
          ※ 300or400等のゾーン跨ぎを按分配分した集計
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", padding: "8px 10px", alignItems: "center" }}>
        <PieChart
          size={108}
          donut
          centerLabel={totalLabel}
          slices={filtered.map((d) => ({
            value: d.count, color: zoneColor(d.zone), label: `${d.zone}G`,
          }))}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
          {filtered.length === 0 ? (
            <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 700, textAlign: "center" }}>データなし</span>
          ) : (
            filtered.map((d) => {
              const p = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.zone} style={{
                  display: "grid", gridTemplateColumns: "12px 1fr 50px 38px",
                  alignItems: "center", gap: "5px",
                }}>
                  <span style={{ width: 12, height: 12, backgroundColor: zoneColor(d.zone), borderRadius: "2px", border: "1px solid #1f2937" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", lineHeight: 1.4 }}>
                    {d.zone}G
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", textAlign: "right", fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>
                    {fmt(d.count)}回
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "right", fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>
                    {p}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Cat>
  );
}

function zoneColor(z: string): string {
  const n = parseInt(z); if (isNaN(n)) return "#757575";
  if (n <= 100) return "#1565c0"; if (n <= 200) return "#2e7d32"; if (n <= 300) return "#e65100";
  if (n <= 400) return "#ad1457"; if (n <= 500) return "#6a1b9a"; return "#b71c1c";
}

// ── 円グラフ / ゲージ ヘルパー ──────────────────────────────────────────────

interface PieSlice { value: number; color: string; label?: string }

function PieChart({ slices, size = 96, donut = true, centerLabel }: {
  slices: PieSlice[];
  size?: number;
  donut?: boolean;
  centerLabel?: string;
}) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((s, sl) => s + sl.value, 0);
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 1;
  const innerR = donut ? r * 0.55 : 0;

  if (total <= 0) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>—</span>
      </div>
    );
  }

  if (filtered.length === 1) {
    const s = filtered[0];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill={s.color} />
        {donut && <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />}
        {centerLabel && (
          <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: "#1f2937", fontFamily: "monospace" }}>
            {centerLabel}
          </text>
        )}
      </svg>
    );
  }

  let cum = 0;
  const paths = filtered.map((s, i) => {
    const start = (cum / total) * 2 * Math.PI;
    cum += s.value;
    const end = (cum / total) * 2 * Math.PI;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(start);
    const y1 = cy - r * Math.cos(start);
    const x2 = cx + r * Math.sin(end);
    const y2 = cy - r * Math.cos(end);
    if (donut) {
      const ix1 = cx + innerR * Math.sin(start);
      const iy1 = cy - innerR * Math.cos(start);
      const ix2 = cx + innerR * Math.sin(end);
      const iy2 = cy - innerR * Math.cos(end);
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
      return <path key={i} d={d} fill={s.color} stroke="#ffffff" strokeWidth={1} />;
    }
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return <path key={i} d={d} fill={s.color} stroke="#ffffff" strokeWidth={1} />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {paths}
      {donut && centerLabel && (
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: "#1f2937", fontFamily: "monospace" }}>
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

function WinGauge({ wins, total, color }: { wins: number; total: number; color: string }) {
  if (total <= 0) {
    return (
      <div style={{
        width: "100%", height: "12px", borderRadius: "3px",
        backgroundColor: "#f3f4f6", border: "1px solid #d1d5db",
      }} />
    );
  }
  const winPct = (wins / total) * 100;
  const losePct = 100 - winPct;
  return (
    <div style={{
      width: "100%", height: "14px", borderRadius: "3px", overflow: "hidden",
      display: "flex", border: `1.5px solid ${color}`, position: "relative",
    }}>
      <div style={{ width: `${winPct}%`, backgroundColor: color }} />
      <div style={{ width: `${losePct}%`, backgroundColor: "#f3f4f6" }} />
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: winPct > 50 ? "#ffffff" : "#1f2937",
        fontFamily: "monospace", lineHeight: 1, letterSpacing: "0.5px",
        textShadow: winPct > 50 ? "0 0 2px rgba(0,0,0,0.5)" : "none",
      }}>
        {Math.round(winPct)}%
      </span>
    </div>
  );
}

function PieLegend({ items, total }: {
  items: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", width: "100%" }}>
      {items.map((it, i) => {
        const p = total > 0 ? Math.round((it.value / total) * 100) : 0;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 1fr 36px 36px", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 12, height: 12, backgroundColor: it.color, borderRadius: "2px", border: "1px solid #1f2937" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
              {it.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#1f2937", textAlign: "right", fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>
              {it.value}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textAlign: "right", fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>
              {p}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 色分けヘルパー（設定期待度） ─────────────────────────────────────────────

function suggBg(s: string): string | undefined {
  if (s.includes("設定6濃厚")) return "#facc15";
  if (s.includes("設定5以上")) return "#fcd34d";
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

// ゾーン集計ロジックは src/lib/tg/analytics.ts に集約
