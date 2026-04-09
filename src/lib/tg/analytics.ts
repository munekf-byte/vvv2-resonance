// =============================================================================
// TOKYO GHOUL RESONANCE: 集計分析 共通モジュール
// ゾーン集計（確定のみ / 加重按分）、フィルタ（全体 / 朝一 / リセ頭AT後）
// セッション独立性を保持 — allBlocks 結合禁止
// =============================================================================

import type { NormalBlock, PlaySession, UchidashiState } from "@/types";

// ── 確定ゾーン ──────────────────────────────────────────────────────────────

export const EXACT_ZONES = [
  "50", "100", "150", "200", "250", "300", "400", "500", "600",
] as const;

export type ZoneData = { zone: string; count: number }[];

// ── 加重按分マッピング ──────────────────────────────────────────────────────
// A or B → 0.5 ずつ均等
// 〇〇以内 / 〇〇以上 → 200G, 300G に比重を大きく

export const WEIGHTED_ZONE_MAP: Record<string, Record<string, number>> = {
  "50or100": { "50": 0.5, "100": 0.5 },

  "200以内": { "50": 0.1, "100": 0.1, "150": 0.1, "200": 0.35, "250": 0.0, "300": 0.35 },
  // ↑ 200以内 は 200G到達が最多パターン。300Gは含まないが200G天井絡みで重み付け
  // 修正: 200以内なので300は含まない → 200に重点
  "200以内_v2": undefined as never, // placeholder

  "300以内": { "50": 0.05, "100": 0.05, "150": 0.1, "200": 0.3, "250": 0.1, "300": 0.4 },
  // 300G天井 or 200G天井のいずれかに該当する可能性が高い

  "200以上": { "200": 0.3, "250": 0.1, "300": 0.3, "400": 0.15, "500": 0.1, "600": 0.05 },
  // 200G以上は通常A/Bで200-300Gが多い

  "300以上": { "300": 0.4, "400": 0.3, "500": 0.2, "600": 0.1 },
  // 300G以上は通常Aモードの300G天井が最も確率が高い

  "300 or 400": { "300": 0.5, "400": 0.5 },
  "400 or 500": { "400": 0.5, "500": 0.5 },
  "500 or 600": { "500": 0.5, "600": 0.5 },

  "600否定": {
    "50": 0.05, "100": 0.05, "150": 0.1, "200": 0.25,
    "250": 0.1, "300": 0.25, "400": 0.1, "500": 0.1,
  },
  // 600否定 = 500以内確定。200G/300G天井が主要
};

// 200以内を修正（300Gは範囲外）
(() => {
  WEIGHTED_ZONE_MAP["200以内"] = {
    "50": 0.1, "100": 0.15, "150": 0.25, "200": 0.5,
  };
  delete (WEIGHTED_ZONE_MAP as Record<string, unknown>)["200以内_v2"];
})();

// ── フィルタ区分 ────────────────────────────────────────────────────────────

export type ZoneFilterMode = "all" | "asaichi" | "afterAT";

/**
 * セッション単位でブロックをフィルタし、結果を返す
 *
 * - all: 全ブロック
 * - asaichi: uchidashi未設定 かつ index===0 のブロック（朝一1発目）
 * - afterAT: 前ブロックが atWin===true のブロック（AT後リセ頭）
 *            ※朝一1発目は含めない
 */
export function filterBlocksFromSession(
  session: Pick<PlaySession, "normalBlocks" | "uchidashi">,
  mode: ZoneFilterMode,
): NormalBlock[] {
  const blocks = session.normalBlocks;

  switch (mode) {
    case "all":
      return blocks;

    case "asaichi":
      // uchidashi が設定されている = 前任者あり → 朝一ではない
      if (session.uchidashi && hasUchidashiData(session.uchidashi)) return [];
      // セッション先頭ブロックのみ
      return blocks.length > 0 ? [blocks[0]] : [];

    case "afterAT":
      // 前ブロックが AT当選 → そのブロックがリセ頭
      // index===0 は朝一なので除外
      return blocks.filter((_, i) => i > 0 && blocks[i - 1].atWin);
  }
}

/** uchidashi に実質的なデータがあるか判定 */
function hasUchidashiData(u: UchidashiState): boolean {
  return (
    u.currentGames != null ||
    u.totalGames != null ||
    u.samai != null ||
    u.reminiscence != null ||
    u.rize != null ||
    u.episodeBonus != null
  );
}

/**
 * 複数セッションからフィルタ済みブロックを収集
 * セッション結合ではなく、セッションごとに独立してフィルタしてから結果をマージ
 */
export function collectFilteredBlocks(
  sessions: Pick<PlaySession, "normalBlocks" | "uchidashi">[],
  mode: ZoneFilterMode,
): NormalBlock[] {
  const result: NormalBlock[] = [];
  for (const session of sessions) {
    result.push(...filterBlocksFromSession(session, mode));
  }
  return result;
}

// ── ゾーン集計 ──────────────────────────────────────────────────────────────

/** 確定ゾーンのみカウント（曖昧ゾーンは除外） */
export function computeZoneExact(filteredBlocks: NormalBlock[]): ZoneData {
  return EXACT_ZONES.map((zone) => ({
    zone,
    count: filteredBlocks.filter((b) => b.zone === zone).length,
  }));
}

/** 加重按分込み（曖昧ゾーンをウェイトに基づいて配分） */
export function computeZoneProrate(filteredBlocks: NormalBlock[]): ZoneData {
  const counts: Record<string, number> = {};
  for (const z of EXACT_ZONES) counts[z] = 0;

  for (const b of filteredBlocks) {
    const z = b.zone;
    if (z === "不明" || z === "") continue;

    if ((EXACT_ZONES as readonly string[]).includes(z)) {
      counts[z] += 1;
    } else if (WEIGHTED_ZONE_MAP[z]) {
      const weights = WEIGHTED_ZONE_MAP[z];
      for (const [target, weight] of Object.entries(weights)) {
        if (weight > 0) counts[target] += weight;
      }
    }
  }

  return EXACT_ZONES.map((zone) => ({
    zone,
    count: Math.round(counts[zone] * 10) / 10,
  }));
}

// ── セッション単位の便利関数 ─────────────────────────────────────────────────

/** 単一セッション用: フィルタ → 確定集計 */
export function sessionZoneExact(
  session: Pick<PlaySession, "normalBlocks" | "uchidashi">,
  mode: ZoneFilterMode,
): ZoneData {
  return computeZoneExact(filterBlocksFromSession(session, mode));
}

/** 単一セッション用: フィルタ → 按分集計 */
export function sessionZoneProrate(
  session: Pick<PlaySession, "normalBlocks" | "uchidashi">,
  mode: ZoneFilterMode,
): ZoneData {
  return computeZoneProrate(filterBlocksFromSession(session, mode));
}

/** 複数セッション用: フィルタ → 確定集計 */
export function multiSessionZoneExact(
  sessions: Pick<PlaySession, "normalBlocks" | "uchidashi">[],
  mode: ZoneFilterMode,
): ZoneData {
  return computeZoneExact(collectFilteredBlocks(sessions, mode));
}

/** 複数セッション用: フィルタ → 按分集計 */
export function multiSessionZoneProrate(
  sessions: Pick<PlaySession, "normalBlocks" | "uchidashi">[],
  mode: ZoneFilterMode,
): ZoneData {
  return computeZoneProrate(collectFilteredBlocks(sessions, mode));
}
