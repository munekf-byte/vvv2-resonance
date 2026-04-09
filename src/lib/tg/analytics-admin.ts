// =============================================================================
// TOKYO GHOUL RESONANCE: 管理者用 クロス集計分析エンジン
// 設定セグメント振り分け・15ブロック集計マトリクス
// =============================================================================

import type { PlaySession, NormalBlock, TGATEntry, TGATSet, TGArimaJudgment } from "@/types";
import {
  CZ_PROB, EPI_PROB, DIRECT_AT_PROB, AT_COMBINED_PROB,
  URA_AT_RATE, HIKIMODOHI_RATE,
} from "@/lib/tg/settingDiff";
import { filterBlocksFromSession, computeZoneExact, computeZoneProrate } from "@/lib/tg/analytics";
import { TG_KAKUGAN, TG_SHINSEKAI, TG_ENDING_SUGGESTIONS, TG_AT_CHARACTERS, TG_BITES_TYPES, TG_INVITATIONS } from "@/lib/engine/constants";

// ── 設定セグメント定義 ──────────────────────────────────────────────────────

export const SETTING_SEGMENTS = [
  "全体",
  "推定低設定",
  "推定4",
  "推定456",
  "推定56",
  "推定6",
  "確定6",
] as const;

export type SettingSegment = (typeof SETTING_SEGMENTS)[number];

// ── セグメント判定ロジック ──────────────────────────────────────────────────

/** セッションのフィールドを安全に配列化 */
function safeBlocks(session: PlaySession): NormalBlock[] {
  return Array.isArray(session.normalBlocks) ? session.normalBlocks : [];
}
function safeEntries(session: PlaySession): TGATEntry[] {
  return Array.isArray(session.atEntries) ? session.atEntries : [];
}

/** 確定要素の最上位を判定 */
function detectConfirmedSetting(session: PlaySession): string | null {
  const blocks = safeBlocks(session);
  const entries = safeEntries(session);
  const allSets = entries.flatMap((e) =>
    (Array.isArray(e.rows) ? e.rows : []).filter((r): r is TGATSet => r.rowType === "set")
  );

  const hints: string[] = [];

  // CZ失敗終了画面 + AT終了画面示唆
  const czFail = blocks.filter((b) => (b.endingSuggestion ?? "").startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
  const endScreen = allSets.map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));
  for (const s of [...czFail, ...endScreen]) {
    if (s.includes("設定6濃厚")) hints.push("確定6");
    else if (s.includes("設定5以上濃厚")) hints.push("確定56");
    else if (s.includes("設定4以上濃厚")) hints.push("確定456");
    else if (s.includes("設定3以上濃厚")) hints.push("確定3以上");
    else if (s.includes("設定2以上濃厚")) hints.push("確定2以上");
  }

  // トロフィー
  const allTrophies = [
    ...blocks.map((b) => sStr(b.trophy)),
    ...allSets.map((s) => s.trophy ?? ""),
  ].filter(Boolean);
  for (const t of allTrophies) {
    if (t.includes("虹")) hints.push("確定6");
    else if (t.includes("喰種柄")) hints.push("確定56");
    else if (t.includes("金")) hints.push("確定456");
    else if (t.includes("銀")) hints.push("確定3以上");
    else if (t.includes("銅")) hints.push("確定2以上");
  }

  // エンディングカード
  for (const entry of entries) {
    for (const row of (Array.isArray(entry.rows) ? entry.rows : [])) {
      if (row.rowType !== "set" || !row.endingCard) continue;
      const ec = row.endingCard;
      if (ec.confirmed4 > 0) hints.push("確定6");
      if (ec.confirmed3 > 0) hints.push("確定56");
      if (ec.confirmed2 > 0) hints.push("確定456");
      if (ec.confirmed1 > 0) hints.push("確定3以上");
    }
  }

  if (hints.length === 0) return null;

  // 最上位を返す
  const priority = ["確定6", "確定56", "確定456", "確定3以上", "確定2以上"];
  return hints.sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0];
}

/**
 * セッションが各セグメントに含まれるか判定
 * 包含ルール: 上位は下位に算入
 */
export function classifySession(session: PlaySession): Set<SettingSegment> {
  const segments = new Set<SettingSegment>();
  segments.add("全体"); // 全セッションは全体に含まれる

  const confirmed = detectConfirmedSetting(session);
  const userGuess = session.userSettingGuess;

  if (confirmed) {
    // 確定要素がある → ユーザー推測を無視、確定ベースで分類
    switch (confirmed) {
      case "確定6":
        segments.add("確定6");
        segments.add("推定6");
        segments.add("推定56");
        segments.add("推定456");
        break;
      case "確定56":
        segments.add("推定56");
        segments.add("推定456");
        break;
      case "確定456":
        segments.add("推定456");
        break;
      case "確定3以上":
        segments.add("推定456"); // 3以上 → 456に含む
        break;
      case "確定2以上":
        // 2以上は低設定ではないが特定セグメントに断定できない
        break;
    }
  } else if (userGuess) {
    // 確定要素なし → ユーザー推測を採用
    switch (userGuess) {
      case "推定6":
        segments.add("推定6");
        segments.add("推定56");
        segments.add("推定456");
        break;
      case "推定56":
        segments.add("推定56");
        segments.add("推定456");
        break;
      case "推定456":
        segments.add("推定456");
        break;
      case "推定4":
        segments.add("推定4");
        segments.add("推定456");
        break;
      case "推定低設定":
        segments.add("推定低設定");
        break;
    }
  }

  return segments;
}

// ── 分析ブロック定義 ────────────────────────────────────────────────────────

export const ANALYSIS_BLOCKS = [
  "通常時",
  "CZ役別",
  "赫眼",
  "精神世界",
  "CZ失敗終了画面",
  "AT終了画面",
  "有馬set",
  "招待状",
  "AT性能",
  "対決成績",
  "BITES",
  "ゾーン全体",
  "ゾーン朝一",
  "ゾーンAT後",
  "設定示唆サマリ",
] as const;

export type AnalysisBlock = (typeof ANALYSIS_BLOCKS)[number];

// ── セグメント別データ集計 ──────────────────────────────────────────────────

export interface SegmentData {
  sessions: PlaySession[];
  blocks: NormalBlock[];
  atEntries: TGATEntry[];
}

export function buildSegmentMap(sessions: PlaySession[]): Record<SettingSegment, SegmentData> {
  const map: Record<SettingSegment, SegmentData> = {} as never;
  for (const seg of SETTING_SEGMENTS) {
    map[seg] = { sessions: [], blocks: [], atEntries: [] };
  }

  for (const session of (sessions || [])) {
    try {
      const segs = classifySession(session);
      for (const seg of segs) {
        map[seg].sessions.push(session);
        map[seg].blocks.push(...safeBlocks(session));
        map[seg].atEntries.push(...safeEntries(session));
      }
    } catch (e) {
      // 個別セッションのエラーは無視して続行
      console.warn("[buildSegmentMap] セッション処理エラー:", session?.id, e);
      map["全体"].sessions.push(session);
      map["全体"].blocks.push(...safeBlocks(session));
      map["全体"].atEntries.push(...safeEntries(session));
    }
  }

  return map;
}

// ── ヘルパー ────────────────────────────────────────────────────────────────

/** JSONB由来のブロックのフィールドを安全に取得 */
function sArr(v: unknown): string[] { return Array.isArray(v) ? v : []; }
function sStr(v: unknown): string { return typeof v === "string" ? v : ""; }

function prob(count: number, denom: number): string {
  if (denom <= 0 || count <= 0) return "—";
  return `1/${Math.round(denom / count).toLocaleString()}`;
}
function pct(count: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((count / total) * 100)}%`;
}
function getAllSets(entries: TGATEntry[]): TGATSet[] {
  return entries.flatMap((e) => e.rows.filter((r): r is TGATSet => r.rowType === "set"));
}

// ── 15ブロック集計関数 ──────────────────────────────────────────────────────

export type MatrixRow = { label: string; values: string[] };
export type MatrixBlock = { title: string; rows: MatrixRow[] };

export function computeBlock(blockName: AnalysisBlock, segMap: Record<SettingSegment, SegmentData>): MatrixBlock {
  const segs = SETTING_SEGMENTS;

  switch (blockName) {
    case "通常時": {
      const labels = ["通常時G", "CZ回数", "CZ確率", "エピボ回数", "エピボ確率", "AT直撃", "AT直撃確率", "AT初当たり", "AT確率"];
      return {
        title: "通常時",
        rows: labels.map((label) => ({
          label,
          values: segs.map((seg) => {
            const d = segMap[seg];
            const g = d.blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);
            const cz = d.blocks.filter((b) => sStr(b.event) === "レミニセンス" || sStr(b.event) === "大喰いの利世").length;
            const epi = d.blocks.filter((b) => sStr(b.event) === "エピソードボーナス").length;
            const direct = d.blocks.filter((b) => sStr(b.event) === "直撃AT").length;
            const at = d.blocks.filter((b) => b.atWin).length;
            switch (label) {
              case "通常時G": return g > 0 ? g.toLocaleString() : "—";
              case "CZ回数": return `${cz}`;
              case "CZ確率": return prob(cz, g);
              case "エピボ回数": return `${epi}`;
              case "エピボ確率": return prob(epi, g);
              case "AT直撃": return `${direct}`;
              case "AT直撃確率": return prob(direct, g);
              case "AT初当たり": return `${at}`;
              case "AT確率": return prob(at, g);
              default: return "—";
            }
          }),
        })),
      };
    }

    case "CZ役別": {
      const roles = [
        { key: "bell", label: "押/斜🔔" },
        { key: "replay", label: "リプ" },
        { key: "weakRare", label: "弱レア" },
        { key: "strongRare", label: "強レア" },
      ];
      const labels = ["CZ記録数", "成功数", "成功率", ...roles.flatMap((r) => [`${r.label}発生`, `${r.label}当選`, `${r.label}当選率`])];
      return {
        title: "CZ役別",
        rows: labels.map((label) => ({
          label,
          values: segs.map((seg) => {
            const d = segMap[seg];
            const czBlocks = d.blocks.filter((b) => b.czCounter && (b.czCounter.bell > 0 || b.czCounter.replay > 0 || b.czCounter.weakRare > 0 || b.czCounter.strongRare > 0));
            const success = czBlocks.filter((b) => !!b.czCounter?.hitRole).length;
            if (label === "CZ記録数") return `${czBlocks.length}`;
            if (label === "成功数") return `${success}`;
            if (label === "成功率") return pct(success, czBlocks.length);
            for (const r of roles) {
              const total = czBlocks.reduce((s, b) => s + ((b.czCounter as unknown as Record<string, number>)?.[r.key] ?? 0), 0);
              const hit = czBlocks.filter((b) => b.czCounter?.hitRole === r.key).length;
              if (label === `${r.label}発生`) return `${total}`;
              if (label === `${r.label}当選`) return `${hit}`;
              if (label === `${r.label}当選率`) return pct(hit, total);
            }
            return "—";
          }),
        })),
      };
    }

    case "赫眼": {
      const items = [...TG_KAKUGAN];
      return {
        title: "赫眼",
        rows: [
          { label: "合計", values: segs.map((seg) => `${segMap[seg].blocks.flatMap((b) => sArr(b.kakugan)).length}`) },
          ...items.map((k) => ({
            label: k,
            values: segs.map((seg) => {
              const all = segMap[seg].blocks.flatMap((b) => sArr(b.kakugan));
              const c = all.filter((v) => v === k).length;
              return `${c} (${pct(c, all.length)})`;
            }),
          })),
        ],
      };
    }

    case "精神世界": {
      const items = [...TG_SHINSEKAI];
      return {
        title: "精神世界",
        rows: [
          { label: "合計", values: segs.map((seg) => `${segMap[seg].blocks.flatMap((b) => sArr(b.shinsekai)).length}`) },
          ...items.map((k) => ({
            label: k,
            values: segs.map((seg) => {
              const all = segMap[seg].blocks.flatMap((b) => sArr(b.shinsekai));
              const c = all.filter((v) => v === k).length;
              return `${c} (${pct(c, all.length)})`;
            }),
          })),
        ],
      };
    }

    case "CZ失敗終了画面": {
      const items = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[cz失敗]"));
      return {
        title: "CZ失敗終了画面",
        rows: items.map((s) => {
          const name = s.match(/\]\s*(.+?)\s*-/)?.[1] ?? s;
          return {
            label: name,
            values: segs.map((seg) => {
              const c = segMap[seg].blocks.filter((b) => sStr(b.endingSuggestion) === s).length;
              return `${c}`;
            }),
          };
        }),
      };
    }

    case "AT終了画面": {
      const items = TG_ENDING_SUGGESTIONS.filter((s) => s.startsWith("[終了画面]"));
      return {
        title: "AT終了画面",
        rows: items.map((s) => {
          const name = s.match(/\]\s*(.+?)\s*-/)?.[1] ?? s;
          return {
            label: name,
            values: segs.map((seg) => {
              const sets = getAllSets(segMap[seg].atEntries);
              const c = sets.filter((st) => st.endingSuggestion === s).length;
              return `${c}`;
            }),
          };
        }),
      };
    }

    case "有馬set": {
      return {
        title: "有馬set（1,3,5set目）",
        rows: [1, 3, 5].map((pos) => ({
          label: `${pos}set目`,
          values: segs.map((seg) => {
            let count = 0, total = 0;
            for (const entry of segMap[seg].atEntries) {
              const sets = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
              if (sets.length >= pos) { total++; if (sets[pos - 1]?.character === "有馬") count++; }
            }
            return `${count}/${total} (${pct(count, total)})`;
          }),
        })),
      };
    }

    case "招待状": {
      const invItems = [...TG_INVITATIONS].filter((inv) =>
        inv.includes("偶数") || inv.includes("設定") || inv.includes("存分に") || inv.includes("特別な夜")
      );
      return {
        title: "招待状（設定示唆）",
        rows: invItems.map((inv) => {
          const sep = inv.indexOf(" - ");
          const name = sep !== -1 ? inv.slice(0, sep) : inv;
          return {
            label: name,
            values: segs.map((seg) => {
              const all = segMap[seg].blocks.flatMap((b) => sArr(b.invitation));
              return `${all.filter((v) => v === inv).length}`;
            }),
          };
        }),
      };
    }

    case "AT性能": {
      return {
        title: "AT性能",
        rows: [
          { label: "AT初当たり", values: segs.map((seg) => `${segMap[seg].blocks.filter((b) => b.atWin).length}`) },
          {
            label: "引き戻し率",
            values: segs.map((seg) => {
              const at = segMap[seg].blocks.filter((b) => b.atWin).length;
              const hiki = segMap[seg].blocks.filter((b) => sStr(b.event) === "引き戻し").length;
              return `${hiki}/${at} (${pct(hiki, at)})`;
            }),
          },
          {
            label: "裏AT突入率",
            values: segs.map((seg) => {
              const at = segMap[seg].blocks.filter((b) => b.atWin).length;
              const ura = segMap[seg].atEntries.filter((e) => {
                const first = e.rows.find((r): r is TGATSet => r.rowType === "set");
                return first && (first.atType === "裏AT" || first.atType === "隠れ裏AT（推測）");
              }).length;
              return `${ura}/${at} (${pct(ura, at)})`;
            }),
          },
        ],
      };
    }

    case "対決成績": {
      const chars = [...TG_AT_CHARACTERS].filter((c) => c !== "EDボナ");
      return {
        title: "対決成績",
        rows: chars.map((char) => ({
          label: char,
          values: segs.map((seg) => {
            const sets = getAllSets(segMap[seg].atEntries).filter((s) => s.character === char);
            const battles = sets.flatMap((s) => s.battles).filter((b) => b.result);
            const wins = battles.filter((b) => b.result === "○").length;
            return `${wins}/${battles.length} (${pct(wins, battles.length)})`;
          }),
        })),
      };
    }

    case "BITES": {
      const types = [...TG_BITES_TYPES];
      return {
        title: "BITESテーブル",
        rows: types.map((bt) => {
          const label = bt.match(/^Table:(\S+)/)?.[1] ?? bt.slice(0, 4);
          return {
            label,
            values: segs.map((seg) => {
              const sets = getAllSets(segMap[seg].atEntries);
              const total = sets.filter((s) => s.bitesType).length;
              const c = sets.filter((s) => s.bitesType === bt).length;
              return `${c} (${pct(c, total)})`;
            }),
          };
        }),
      };
    }

    case "ゾーン全体":
    case "ゾーン朝一":
    case "ゾーンAT後": {
      const mode = blockName === "ゾーン全体" ? "all" as const
        : blockName === "ゾーン朝一" ? "asaichi" as const : "afterAT" as const;
      const zones = ["50", "100", "150", "200", "250", "300", "400", "500", "600"];
      return {
        title: blockName,
        rows: zones.map((zone) => ({
          label: `${zone}G`,
          values: segs.map((seg) => {
            const filtered: NormalBlock[] = [];
            for (const s of segMap[seg].sessions) {
              filtered.push(...filterBlocksFromSession(s, mode));
            }
            const data = computeZoneProrate(filtered);
            const d = data.find((z) => z.zone === zone);
            const total = data.reduce((s, z) => s + z.count, 0);
            if (!d || d.count === 0) return "—";
            return `${d.count.toFixed(1)} (${pct(d.count, total)})`;
          }),
        })),
      };
    }

    case "設定示唆サマリ": {
      return {
        title: "設定示唆サマリ",
        rows: [
          { label: "セッション数", values: segs.map((seg) => `${segMap[seg].sessions.length}`) },
          { label: "総消化G数", values: segs.map((seg) => segMap[seg].blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0).toLocaleString()) },
          { label: "トロフィー", values: segs.map((seg) => {
            const t = segMap[seg].blocks.filter((b) => sStr(b.trophy)).length + getAllSets(segMap[seg].atEntries).filter((s) => s.trophy).length;
            return `${t}`;
          })},
        ],
      };
    }
  }
}

// ── Discordマークダウン生成 ──────────────────────────────────────────────────

export function generateDiscordMarkdown(
  selectedBlocks: MatrixBlock[],
  commentary: string,
): string {
  const lines: string[] = [];
  lines.push("# 📊 東京喰種レゾナンス 設定別クロス集計レポート");
  lines.push(`> 生成日時: ${new Date().toLocaleString("ja-JP")}`);
  lines.push("");

  for (const block of selectedBlocks) {
    lines.push(`## ${block.title}`);
    // ヘッダー
    const header = `| 項目 | ${SETTING_SEGMENTS.join(" | ")} |`;
    const sep = `|---${"|---".repeat(SETTING_SEGMENTS.length)}|`;
    lines.push(header);
    lines.push(sep);
    for (const row of block.rows) {
      lines.push(`| ${row.label} | ${row.values.join(" | ")} |`);
    }
    lines.push("");
  }

  if (commentary.trim()) {
    lines.push("## 💬 考察");
    lines.push(commentary.trim());
    lines.push("");
  }

  return lines.join("\n");
}
