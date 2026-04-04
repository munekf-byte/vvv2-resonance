// =============================================================================
// TOKYO GHOUL RESONANCE: モード推定エンジン
// docs/tg-mode-estimation.md 準拠
// GAS版 Valvrave2 calculateAllModes パターンを踏襲
// =============================================================================

import type { TGNormalBlock } from "@/types";
import {
  ZENCHO_MATRIX, modesBelow,
  INVITATION_CONSTRAINTS, MODE_CEILINGS,
  EYECATCH_TABLE,
  CZ_ENDCARD_TABLE, extractEndCardCharacter,
  type ZenchoAction,
} from "./modeTables";

// -----------------------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------------------

export type ModeKey = "A" | "B" | "C" | "CH" | "PRE" | "HEAVEN";
export type ModeProbs = Record<ModeKey, number>;

const ALL_MODES: ModeKey[] = ["A", "B", "C", "CH", "PRE", "HEAVEN"];

/** デフォルト事前確率 */
const DEFAULT_PRIORS: ModeProbs = {
  A: 0.40, B: 0.20, C: 0.10, CH: 0.15, PRE: 0.10, HEAVEN: 0.05,
};

/** HEAVEN濃厚とみなす閾値 */
const HEAVEN_THRESHOLD = 0.50;

// -----------------------------------------------------------------------------
// メインAPI
// -----------------------------------------------------------------------------

/**
 * 全ブロックのモード確率を一括計算
 * GAS版 calculateAllModes に相当
 */
export function estimateAllModes(blocks: TGNormalBlock[]): ModeProbs[] {
  const results: ModeProbs[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // 1. 事前確率の決定
    let probs = getPrior(i, blocks, results);

    // 2. 招待状ハード制約
    probs = applyInvitationConstraints(probs, block.invitation, block.jisshuG);

    // 3. アイキャッチ補正（ソフト/ハード）
    probs = applyEyecatch(probs, block.eyecatch);

    // 4. 前兆ハード判定（最強の証拠、最後に適用）
    probs = applyZenchoConstraints(probs, block.zencho);

    // 5. ゾーン・天井排除
    probs = applyZoneCeiling(probs, block.jisshuG);

    // 6. 正規化
    probs = normalize(probs);

    results.push(probs);
  }

  return results;
}

// -----------------------------------------------------------------------------
// 事前確率の決定
// -----------------------------------------------------------------------------

/**
 * ブロックiの事前確率を決定
 * - index 0 → デフォルト
 * - 前ブロックがAT当選 → リセット
 * - 前ブロックがCZ失敗 → 事後確率を継承（不転落）
 *   - 天国例外: 前ブロックHEAVEN濃厚 + CZ失敗 → リセット（転落あり）
 *   - CZ失敗エンドカード → 次ブロック事前確率にモード下限適用
 */
function getPrior(
  index: number,
  blocks: TGNormalBlock[],
  results: ModeProbs[],
): ModeProbs {
  if (index === 0) return { ...DEFAULT_PRIORS };

  const prevBlock = blocks[index - 1];
  const prevProbs = results[index - 1];

  // AT当選後 → フルリセット
  if (prevBlock.atWin) {
    return { ...DEFAULT_PRIORS };
  }

  // CZ失敗のケース → 事後確率を継承
  if (!prevProbs) return { ...DEFAULT_PRIORS };

  // 天国例外: 前ブロックでHEAVEN濃厚だったのにCZ失敗 → 転落 → リセット
  if (prevProbs.HEAVEN >= HEAVEN_THRESHOLD) {
    return { ...DEFAULT_PRIORS };
  }

  // 不転落継承: 前ブロックの事後確率を引き継ぐ
  const inherited: ModeProbs = { ...prevProbs };

  // CZ失敗エンドカード → 次ブロックのモード下限を適用
  if (prevBlock.endingSuggestion && prevBlock.endingSuggestion.startsWith("[cz失敗]")) {
    const character = extractEndCardCharacter(prevBlock.endingSuggestion);
    if (character && CZ_ENDCARD_TABLE[character]) {
      const eliminateModes = CZ_ENDCARD_TABLE[character];
      for (const mode of eliminateModes) {
        inherited[mode] = 0;
      }
    }
  }

  return inherited;
}

// -----------------------------------------------------------------------------
// 招待状制約
// -----------------------------------------------------------------------------

function applyInvitationConstraints(
  probs: ModeProbs,
  invitations: string[],
  jisshuG: number | null,
): ModeProbs {
  if (!invitations || invitations.length === 0) return probs;

  const result = { ...probs };
  const currentG = jisshuG ?? 0;

  for (const inv of invitations) {
    // 招待状のキーワードでマッチ
    for (const [keyword, constraint] of Object.entries(INVITATION_CONSTRAINTS)) {
      if (!inv.startsWith(keyword)) continue;

      // 直接排除
      if (constraint.eliminateModes) {
        for (const mode of constraint.eliminateModes) {
          result[mode] = 0;
        }
      }

      // 残りG数制限: 天井が currentG + maxRemainingG を超えるモードは維持
      // （天井が残りG以内のモードだけ残す）
      if (constraint.maxRemainingG != null) {
        const maxCeiling = currentG + constraint.maxRemainingG;
        for (const mode of ALL_MODES) {
          if (MODE_CEILINGS[mode] > maxCeiling) {
            result[mode] = 0;
          }
        }
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// アイキャッチ補正
// -----------------------------------------------------------------------------

function applyEyecatch(probs: ModeProbs, eyecatch: string): ModeProbs {
  if (!eyecatch) return probs;

  const effect = EYECATCH_TABLE[eyecatch];
  if (!effect || effect.type === "none") return probs;

  const result = { ...probs };

  if (effect.type === "hardConfirm" && effect.confirmMode) {
    // ハード確定: 指定モード以外を0に
    for (const mode of ALL_MODES) {
      result[mode] = mode === effect.confirmMode ? 1.0 : 0;
    }
    return result;
  }

  if (effect.type === "boost" && effect.boostModes && effect.boostFactor) {
    for (const mode of effect.boostModes) {
      result[mode] *= effect.boostFactor;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// 前兆ハード制約
// -----------------------------------------------------------------------------

function applyZenchoConstraints(probs: ModeProbs, zencho: string[]): ModeProbs {
  if (!zencho || zencho.length === 0) return probs;

  let result = { ...probs };

  for (const entry of zencho) {
    // format: "zone:type" (例: "100:前兆", "50:東京上空")
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;

    const zone = entry.slice(0, colonIdx);
    const type = entry.slice(colonIdx + 1);

    const zoneActions = ZENCHO_MATRIX[zone];
    if (!zoneActions) continue;

    const action: ZenchoAction = zoneActions[type] ?? zoneActions[""] ?? { type: "default" };

    result = applyZenchoAction(result, action);
  }

  return result;
}

function applyZenchoAction(probs: ModeProbs, action: ZenchoAction): ModeProbs {
  const result = { ...probs };

  switch (action.type) {
    case "eliminate":
      for (const mode of action.modes) {
        result[mode] = 0;
      }
      break;

    case "confirmAbove": {
      const below = modesBelow(action.floor);
      for (const mode of below) {
        result[mode] = 0;
      }
      break;
    }

    case "confirm":
      for (const mode of ALL_MODES) {
        result[mode] = mode === action.mode ? 1.0 : 0;
      }
      break;

    case "boost":
      for (const mode of action.modes) {
        result[mode] *= action.factor;
      }
      break;

    case "default":
      break;
  }

  return result;
}

// -----------------------------------------------------------------------------
// ゾーン天井排除
// -----------------------------------------------------------------------------

/**
 * 実G数がモードの天井を超過している場合、そのモードを排除
 * 例: 350Gで当選 → PRE(300G天井)やHEAVEN(100G天井)は不可能
 */
function applyZoneCeiling(probs: ModeProbs, jisshuG: number | null): ModeProbs {
  if (jisshuG == null || jisshuG <= 0) return probs;

  const result = { ...probs };
  for (const mode of ALL_MODES) {
    if (jisshuG > MODE_CEILINGS[mode]) {
      result[mode] = 0;
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// 正規化
// -----------------------------------------------------------------------------

function normalize(probs: ModeProbs): ModeProbs {
  const total = ALL_MODES.reduce((sum, m) => sum + probs[m], 0);
  if (total === 0) {
    // 全排除された場合はデフォルトに戻す
    return { ...DEFAULT_PRIORS };
  }
  const result: ModeProbs = { A: 0, B: 0, C: 0, CH: 0, PRE: 0, HEAVEN: 0 };
  for (const mode of ALL_MODES) {
    result[mode] = probs[mode] / total;
  }
  return result;
}

// -----------------------------------------------------------------------------
// ユーティリティ（UI用）
// -----------------------------------------------------------------------------

/** 上位N件のモードを取得 */
export function topModes(probs: ModeProbs, n: number = 2): { mode: ModeKey; pct: number }[] {
  return ALL_MODES
    .map((mode) => ({ mode, pct: Math.round(probs[mode] * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}

/** モード確率テキスト (例: "A42% B30% C15%") */
export function modeProbsText(probs: ModeProbs): string {
  return ALL_MODES
    .map((m) => `${m}${Math.round(probs[m] * 100)}%`)
    .join(" ");
}
