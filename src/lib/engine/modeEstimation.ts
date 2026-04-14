// =============================================================================
// TOKYO GHOUL RESONANCE: モード推定エンジン v2.0
// ベイズ尤度更新方式
// docs/tg-mode-estimation.md 準拠
// =============================================================================

import type { TGNormalBlock } from "@/types";
import {
  ZENCHO_LIKELIHOOD,
  INVITATION_CONSTRAINTS, MODE_CEILINGS,
  EYECATCH_TABLE,
  CZ_ENDCARD_TABLE, extractEndCardCharacter,
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

/** 継承時の減衰係数（誤判定の永続防止） */
const DECAY_FACTOR = 0.95;
const DECAY_FLOOR = (1 - DECAY_FACTOR) / ALL_MODES.length; // ≈ 0.0083

/** HEAVEN濃厚とみなす閾値 */
const HEAVEN_THRESHOLD = 0.50;

// -----------------------------------------------------------------------------
// メインAPI
// -----------------------------------------------------------------------------

export function estimateAllModes(blocks: TGNormalBlock[]): ModeProbs[] {
  const results: ModeProbs[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // 1. 事前確率の決定
    let probs = getPrior(i, blocks, results);

    // 2. 天井排除（Hard）— 現在G数で物理的に不可能なモードを0に
    probs = applyCeilingElimination(probs, block.jisshuG);

    // 3. 前兆履歴 尤度更新（Bayesian Soft）
    probs = applyZenchoLikelihood(probs, block.zencho);

    // 4. 招待状 ハード制約
    probs = applyInvitationConstraints(probs, block.invitation, block.jisshuG);

    // 5. アイキャッチ補正（Soft/Hard）
    const eyecatchArr = Array.isArray(block.eyecatch)
      ? block.eyecatch
      : (block.eyecatch ? [block.eyecatch] : []);
    probs = applyEyecatch(probs, eyecatchArr);

    // 6. 正規化
    probs = normalize(probs);

    results.push(probs);
  }

  return results;
}

// -----------------------------------------------------------------------------
// 事前確率の決定
// -----------------------------------------------------------------------------

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

  if (!prevProbs) return { ...DEFAULT_PRIORS };

  // 天国例外: 前ブロックでHEAVEN濃厚だったのにCZ失敗 → 転落 → リセット
  if (prevProbs.HEAVEN >= HEAVEN_THRESHOLD) {
    return { ...DEFAULT_PRIORS };
  }

  // 不転落継承 + Decay Factor（誤判定の永続防止）
  const inherited: ModeProbs = {} as ModeProbs;
  for (const mode of ALL_MODES) {
    inherited[mode] = prevProbs[mode] * DECAY_FACTOR + DECAY_FLOOR;
  }

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

  return normalize(inherited);
}

// -----------------------------------------------------------------------------
// 天井排除（Hard）
// -----------------------------------------------------------------------------

function applyCeilingElimination(probs: ModeProbs, jisshuG: number | null): ModeProbs {
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
// 前兆履歴 尤度更新（Bayesian）
// -----------------------------------------------------------------------------

function applyZenchoLikelihood(probs: ModeProbs, zencho: string[]): ModeProbs {
  if (!zencho || zencho.length === 0) return probs;

  let result = { ...probs };

  for (const entry of zencho) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;

    const zone = entry.slice(0, colonIdx);
    const type = entry.slice(colonIdx + 1);

    const zoneLikelihoods = ZENCHO_LIKELIHOOD[zone];
    if (!zoneLikelihoods) continue;

    const likelihood = zoneLikelihoods[type];
    if (!likelihood) continue; // null = 補正なし

    // ベイズ更新: posterior ∝ prior × likelihood
    for (const mode of ALL_MODES) {
      result[mode] *= likelihood[mode];
    }
    result = normalize(result);
  }

  return result;
}

// -----------------------------------------------------------------------------
// 招待状制約（Hard）
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
    for (const [keyword, constraint] of Object.entries(INVITATION_CONSTRAINTS)) {
      if (!inv.startsWith(keyword)) continue;

      if (constraint.eliminateModes) {
        for (const mode of constraint.eliminateModes) {
          result[mode] = 0;
        }
      }

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
// アイキャッチ補正（Soft/Hard）
// -----------------------------------------------------------------------------

function applyEyecatch(probs: ModeProbs, eyecatchArr: string[]): ModeProbs {
  if (!eyecatchArr || eyecatchArr.length === 0) return probs;

  let result = { ...probs };

  for (const eyecatch of eyecatchArr) {
    if (!eyecatch) continue;
    const effect = EYECATCH_TABLE[eyecatch];
    if (!effect || effect.type === "none") continue;

    if (effect.type === "hardConfirm" && effect.confirmMode) {
      for (const mode of ALL_MODES) {
        result[mode] = mode === effect.confirmMode ? 1.0 : 0;
      }
      return result; // 確定なので即リターン
    }

    if (effect.type === "likelihood" && effect.likelihood) {
      for (const mode of ALL_MODES) {
        result[mode] *= effect.likelihood[mode];
      }
      result = normalize(result);
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// ユーティリティ
// -----------------------------------------------------------------------------

function normalize(probs: ModeProbs): ModeProbs {
  const total = ALL_MODES.reduce((sum, m) => sum + probs[m], 0);
  if (total <= 0) return { ...DEFAULT_PRIORS };
  const result = {} as ModeProbs;
  for (const mode of ALL_MODES) {
    result[mode] = probs[mode] / total;
  }
  return result;
}

/** 上位N件のモード+パーセントを返す */
export function topModes(probs: ModeProbs, n: number = 2): { mode: ModeKey; pct: number }[] {
  return ALL_MODES
    .map((m) => ({ mode: m, pct: Math.round(probs[m] * 100) }))
    .filter((e) => e.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}
