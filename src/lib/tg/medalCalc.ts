// =============================================================================
// L東京喰種 RESONANCE — 差枚数計算エンジン
// docs/tg-medal-calculation.md 参照
// =============================================================================

import type { NormalBlock, TGATEntry, TGATSet, TGArimaJudgment, UchidashiState } from "@/types";

// ── 定数 ──────────────────────────────────────────────────────────────────────

/** コイン持ち: 50枚あたり約31G → 1Gあたり約1.613枚消費 */
const COIN_LOSS_PER_G = 50 / 31;

/** AT純増: 約4.0枚/G */
const PURE_INCREASE = 4.0;

/** 導入エピソード: 約10G → 40枚 */
const INTRO_GAIN = 10 * PURE_INCREASE; // 40

/** CZ継続: 8G固定 × 純増4.0 = 32枚 */
const CZ_GAIN_PER = 8 * PURE_INCREASE; // 32

// ── ATエントリの獲得枚数 ──────────────────────────────────────────────────────

function computeATEntryGain(entry: TGATEntry, event: string): number {
  const sets = entry.rows.filter((r): r is TGATSet => r.rowType === "set");
  const arimas = entry.rows.filter((r): r is TGArimaJudgment => r.rowType === "arima");

  const base =
    event === "ロングフリーズ" ? 2000 :
    event === "エピソードボーナス" ? 250 : 150;

  const intro = sets.length * INTRO_GAIN;

  const bites = sets.reduce((sum, s) => {
    const n = s.bitesCoins === "ED" || s.bitesCoins === "" ? 0 : Number(s.bitesCoins);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const direct = sets.reduce((sum, s) =>
    sum + s.directAdds.reduce((ds, d) => ds + (d.coins ?? 0), 0), 0);

  const ccg = arimas.reduce((sum, a) =>
    sum + (a.result === "成功" && a.ccgCoins ? a.ccgCoins : 0), 0);

  return base + intro + bites + direct + ccg;
}

// ── メイン: 差枚数スタンプ配列 ────────────────────────────────────────────────

/**
 * 各通常時ブロックの「イベント発生時」の差枚数スタンプを算出する。
 *
 * - スタンプはイベント発生の瞬間 = そのブロックの消費は含む、
 *   そのブロック由来のAT/CZ獲得は含まない（次ブロック以降に反映）
 * - 打ち出し時差枚数(samai)がある場合は全スタンプに加算
 */
export function computeMedalStamps(
  blocks: NormalBlock[],
  atLabels: Map<string, string>,
  atEntries: TGATEntry[],
  uchidashi: UchidashiState | null,
): number[] {
  const samai = uchidashi?.samai ?? 0;
  let cumLoss = 0;
  let cumGain = 0;
  const stamps: number[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // 1. このブロックの消費を加算（このブロックのG数分は消化済み）
    cumLoss += (block.jisshuG ?? 0) * COIN_LOSS_PER_G;

    // 2. スタンプ記録（この瞬間の差枚数）
    stamps.push(Math.round(cumGain - cumLoss + samai));

    // 3. このブロックのイベント後に発生する獲得を加算（次ブロックのスタンプに反映）
    const isCZ = block.event === "レミニセンス" || block.event === "大喰いの利世";
    if (isCZ) {
      cumGain += CZ_GAIN_PER;
    }

    if (block.atWin) {
      const atKey = atLabels.get(block.id);
      if (atKey) {
        const entry = atEntries.find((e) => e.atKey === atKey);
        if (entry) {
          cumGain += computeATEntryGain(entry, block.event);
        }
      }
    }
  }

  return stamps;
}
