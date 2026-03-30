// =============================================================================
// VALVRAVE-RESONANCE: ベイズモード推定エンジン (v2 — GAS完全移植)
// Project: V2-Web-Analytic | Version: 0.2.0
// GAS参照: user-seat-ver.8.4.gs
//   - calculateAllModes()
//   - processBlockInMemory()
//   - getPriorProbsFromHistory()
//   - bayesUpdate()
//   - bayesUpdateCeiling()
//   - applyPerformanceBonus()
//   - calculateSpecialTableProb()
//   - applyDecay()
//   - getEventTypeFromAreaC()
//   - checkPrev600()
// =============================================================================

import type {
  ModeProbabilities,
  ModeInferenceResult,
  BayesStep,
  NormalBlock,
  V2Mode,
} from "@/types";
import {
  DEFAULT_PRIOR,
  DECAY_FACTOR,
  PT_LIKELIHOODS,
  PT_CHAR_MAP,
  CEILING_LIKELIHOODS,
  MODE_TRANSITION,
  SPECIAL_TABLE_PRIOR,
  DIST_NORMAL,
  DIST_SPECIAL,
  MEMO_KEYWORD_HIGH_RANK,
  MEMO_KEYWORD_LOW_RANK,
} from "./constants";

// =============================================================================
// ユーティリティ
// =============================================================================

/**
 * 確率分布を正規化する (合計を1.0にする)
 */
function normalize(p: ModeProbabilities): ModeProbabilities {
  const total = p.A + p.B + p.C + p.H;
  if (total === 0) return { ...DEFAULT_PRIOR };
  return { A: p.A / total, B: p.B / total, C: p.C / total, H: p.H / total };
}

/**
 * 最有力モードを返す
 */
export function getMostLikelyMode(probs: ModeProbabilities): V2Mode {
  return (Object.keys(probs) as V2Mode[]).reduce((best, m) =>
    probs[m] > probs[best] ? m : best
  );
}

// =============================================================================
// applyDecay
// =============================================================================

/**
 * スルーカウント用Decay: AをBに流す
 *
 * GAS:
 *   function applyDecay(p) {
 *     const decayFactor = 0.9;
 *     const lostA = p.A * (1 - decayFactor);
 *     return { A: p.A * decayFactor, B: p.B + lostA, C: p.C, H: p.H };
 *   }
 */
export function applyDecay(p: ModeProbabilities): ModeProbabilities {
  const lostA = p.A * (1 - DECAY_FACTOR);
  return { A: p.A * DECAY_FACTOR, B: p.B + lostA, C: p.C, H: p.H };
}

// =============================================================================
// 事前確率の決定
// =============================================================================

/**
 * 前ブロックの情報からイベントタイプを判定する
 *
 * type 1 = リセット  (AT後 or 革命BONUS後)
 * type 2 = 引き継ぎ  (決戦BONUS後 or CZ後)
 *
 * GAS: getEventTypeFromAreaC()
 *   if (prevAT && prevAT !== '・' && prevAT !== '-') return 1;
 *   if (prevEvent1.includes('革命BONUS') || prevEvent2.includes('革命BONUS')) return 1;
 *   if (prevEvent1.includes('決戦BONUS') || ... || prevEvent1.includes('CZ')) return 2;
 *   return 1;
 */
export function getEventType(prevBlock: NormalBlock | null): 1 | 2 {
  if (!prevBlock) return 1;

  const prevAT = prevBlock.atKey ?? "";
  const prevEvent1 = prevBlock.event1;
  const prevEvent2 = prevBlock.event2;

  // AT後 → リセット
  if (prevAT && prevAT !== "・" && prevAT !== "-") return 1;
  // 革命BONUS後 → リセット
  if (prevEvent1.includes("革命BONUS") || prevEvent2.includes("革命BONUS")) return 1;
  // 決戦BONUS後 or CZ後 → 引き継ぎ
  if (
    prevEvent1.includes("決戦BONUS") ||
    prevEvent2.includes("決戦BONUS") ||
    prevEvent1.includes("CZ") ||
    prevEvent2.includes("CZ")
  ) return 2;

  return 1;
}

/**
 * モード遷移行列で次の事前確率を計算する (type 2 = 引き継ぎ)
 *
 * GAS: getPriorProbsFromHistory() → type 2 の分岐
 *   let nextA = p.A * 0.66 + p.H * 0.66
 *   let nextB = p.A * 0.29 + p.B * 0.66 + p.C * 0.32 + p.H * 0.31
 *   let nextC = p.A * 0.04 + p.B * 0.32 + p.C * 0.57 + p.H * 0.02
 *   let nextH = p.A * 0.01 + p.B * 0.02 + p.C * 0.43 + p.H * 0.01
 *   normalize → applyDecay
 */
function getTransitionPrior(prev: ModeProbabilities): ModeProbabilities {
  const { toA, toB, toC, toH } = MODE_TRANSITION;

  const nextA =
    prev.A * toA.A + prev.B * toA.B + prev.C * toA.C + prev.H * toA.H;
  const nextB =
    prev.A * toB.A + prev.B * toB.B + prev.C * toB.C + prev.H * toB.H;
  const nextC =
    prev.A * toC.A + prev.B * toC.B + prev.C * toC.C + prev.H * toC.H;
  const nextH =
    prev.A * toH.A + prev.B * toH.B + prev.C * toH.C + prev.H * toH.H;

  const normalized = normalize({ A: nextA, B: nextB, C: nextC, H: nextH });
  return applyDecay(normalized);
}

/**
 * ブロックの事前確率を決定する
 *
 * GAS: getPriorProbsFromHistory()
 *   index === 0 → DEFAULT_PRIOR (+ throughCount decay)
 *   eventType === 1 → DEFAULT_PRIOR
 *   eventType === 2 → transition from prev
 */
export function getPriorProbs(
  blockIndex: number,
  eventType: 1 | 2,
  prevResult: ModeInferenceResult | null,
  initialThroughCount: number
): ModeProbabilities {
  // 初回ブロック
  if (blockIndex === 0) {
    let p: ModeProbabilities = { ...DEFAULT_PRIOR };
    // スルーカウント分だけdecayを適用
    for (let i = 0; i < initialThroughCount; i++) {
      p = applyDecay(p);
    }
    return p;
  }

  // リセット (type 1)
  if (eventType === 1 || blockIndex < 1) {
    return { ...DEFAULT_PRIOR };
  }

  // 引き継ぎ (type 2)
  if (!prevResult) return { ...DEFAULT_PRIOR };
  return getTransitionPrior(prevResult.probabilities);
}

// =============================================================================
// bayesUpdate: 規定ptによるベイズ更新
// =============================================================================

/**
 * 規定pt1文字でベイズ更新する
 *
 * GAS: bayesUpdate(probs, pt, cycleNum)
 *   B は cycleNum < 4 のみ
 *   C は cycleNum < 6 のみ
 *   H は cycleNum < 2 のみ
 */
export function bayesUpdatePT(
  probs: ModeProbabilities,
  pt: string,
  cycleNum: number
): ModeProbabilities {
  const idx = PT_CHAR_MAP[pt];
  if (idx === undefined) return probs;

  const l = PT_LIKELIHOODS[idx];

  const pA = probs.A;
  const pB = cycleNum < 4 ? probs.B : 0;
  const pC = cycleNum < 6 ? probs.C : 0;
  const pH = cycleNum < 2 ? probs.H : 0;

  const postA = l.A * pA;
  const postB = l.B * pB;
  const postC = l.C * pC;
  const postH = l.H * pH;

  const total = postA + postB + postC + postH;
  if (total === 0) return probs;

  return {
    A: postA / total,
    B: postB / total,
    C: postC / total,
    H: postH / total,
  };
}

// =============================================================================
// bayesUpdateCeiling: 天井(周期)によるベイズ更新
// =============================================================================

/**
 * 周期確定でベイズ更新する
 *
 * GAS: bayesUpdateCeiling(probs, weekNum)
 */
export function bayesUpdateCeiling(
  probs: ModeProbabilities,
  weekNum: number
): ModeProbabilities {
  const l = CEILING_LIKELIHOODS[weekNum] ?? CEILING_LIKELIHOODS[0];

  const postA = l.A * probs.A;
  const postB = l.B * probs.B;
  const postC = l.C * probs.C;
  const postH = l.H * probs.H;

  const total = postA + postB + postC + postH;
  if (total === 0) return probs;

  return {
    A: postA / total,
    B: postB / total,
    C: postC / total,
    H: postH / total,
  };
}

// =============================================================================
// applyPerformanceBonus: ボイスメモ/手書きメモによる補正
// =============================================================================

/**
 * メモテキストのキーワードから確率補正を行う
 *
 * GAS: applyPerformanceBonus(probs, memoText)
 *   🟪機体/🟣ハルト → A *= 0.02
 *   🟣ソウイチ → H確定 (1.0)
 *   化け物/ec-白ピノ/ec-白 → (lA=0.2, lOthers=0.8) を回数分適用
 *   ナイス/自分で/🟦機体/🟥機体/ec-赤/ec-黒ピノ → (lA=0.8, lOthers=1.0) を回数分適用
 */
export function applyPerformanceBonus(
  probs: ModeProbabilities,
  memoText: string
): ModeProbabilities {
  let p = { ...probs };

  // A確率を激減 (🟪機体 or 🟣ハルト = 高モード示唆演出)
  if (memoText.includes("🟪機体") || memoText.includes("🟣ハルト")) {
    p.A *= 0.02;
  }

  // 天国確定 (🟣ソウイチ = 天国確定演出)
  if (memoText.includes("🟣ソウイチ")) {
    return { A: 0, B: 0, C: 0, H: 1.0 };
  }

  // 高確示唆キーワード (化け物 etc.)
  const countHigh = (memoText.match(MEMO_KEYWORD_HIGH_RANK) ?? []).length;
  for (let i = 0; i < countHigh; i++) {
    p = applyLikelihood(p, 0.2, 0.8);
  }

  // 低確示唆キーワード (ナイス etc.)
  const countLow = (memoText.match(MEMO_KEYWORD_LOW_RANK) ?? []).length;
  for (let i = 0; i < countLow; i++) {
    p = applyLikelihood(p, 0.8, 1.0);
  }

  const total = p.A + p.B + p.C + p.H;
  if (total === 0) return probs;

  return { A: p.A / total, B: p.B / total, C: p.C / total, H: p.H / total };
}

/**
 * 尤度でA vs その他を更新するヘルパー
 * GAS: updateWithLikelihood(probs, lA, lOthers)
 */
function applyLikelihood(
  p: ModeProbabilities,
  lA: number,
  lOthers: number
): ModeProbabilities {
  return {
    A: p.A * lA,
    B: p.B * lOthers,
    C: p.C * lOthers,
    H: p.H * lOthers,
  };
}

// =============================================================================
// calculateSpecialTableProb: 特殊テーブル疑惑スコア
// =============================================================================

/**
 * 規定pt履歴の「違和感」から特殊テーブル滞在確率を算出する
 *
 * GAS: calculateSpecialTableProb(ptSequence, modeProbsHistory, prevEventWas600)
 *
 * 返却値:
 *   null  → 評価対象外 (⑤⑥到達 or 直前ブロックが⑥)
 *   0     → ⑤⑥が含まれる (特殊テーブルなし)
 *   0〜1  → 特殊テーブル疑惑スコア
 */
export function calculateSpecialTableProb(
  ptSequence: string,
  modeProbsHistory: ModeProbabilities[],
  prevEventWas600: boolean
): number | null {
  // ⑤⑥到達 → 特殊テーブルではなくただの6周期
  if (ptSequence.includes("⑤") || ptSequence.includes("⑥")) return 0;
  // 直前が⑥ or 履歴が空 → 評価不能
  if (ptSequence.length < 1 || prevEventWas600) return null;

  let specialProb = SPECIAL_TABLE_PRIOR; // 0.05

  for (let i = 0; i < ptSequence.length; i++) {
    // 1周期目はスキップ (GAS: if (i === 0) continue)
    if (i === 0) continue;

    const pt = ptSequence[i] as keyof typeof DIST_NORMAL.A;
    const mP = modeProbsHistory[i];
    if (!mP) continue;

    // モード別の通常テーブル尤度
    const ln =
      (DIST_NORMAL.A[pt] ?? 0) * mP.A +
      (DIST_NORMAL.B[pt] ?? 0) * mP.B +
      (DIST_NORMAL.C[pt] ?? 0) * mP.C;

    // モード別の特殊テーブル尤度
    const ls =
      (DIST_SPECIAL.A[pt] ?? 0) * mP.A +
      (DIST_SPECIAL.B[pt] ?? 0) * mP.B +
      (DIST_SPECIAL.C[pt] ?? 0) * mP.C;

    // ベイズ更新: P(special|pt) = P(pt|special)×P(special) / P(pt)
    const denom = ls * specialProb + ln * (1 - specialProb);
    if (denom !== 0) {
      specialProb = (ls * specialProb) / denom;
    }
  }

  return specialProb;
}

// =============================================================================
// 1ブロックのモード推定
// =============================================================================

/**
 * 1ブロックのモード推定を実行する
 *
 * GAS: processBlockInMemory(row, index, areaC, results, initialThroughCount)
 *
 * @param block - 対象ブロック
 * @param blockIndex - ブロックインデックス (0始まり)
 * @param prevBlock - 前のブロック (null = 先頭)
 * @param prevResult - 前ブロックの推定結果 (null = 先頭)
 * @param initialThroughCount - 開始時スルーカウント
 * @param prevBlockPtSequence - 前ブロックのPT履歴 (checkPrev600用)
 */
export function inferBlockMode(
  block: NormalBlock,
  blockIndex: number,
  prevBlock: NormalBlock | null,
  prevResult: ModeInferenceResult | null,
  initialThroughCount: number,
  prevBlockPtSequence: string
): ModeInferenceResult {
  // ① イベントタイプの判定 (リセット or 引き継ぎ)
  const eventType = getEventType(prevBlock);

  // ② 事前確率の決定
  const priorProbs = getPriorProbs(
    blockIndex,
    eventType,
    prevResult,
    initialThroughCount
  );

  let current: ModeProbabilities = { ...priorProbs };
  const steps: BayesStep[] = [];
  const modeProbsHistory: ModeProbabilities[] = [];

  // ③ PT履歴でベイズ更新
  // GAS: for (let i = 0; i < ptSequence.length; i++) { currentProbs = bayesUpdate(...); }
  const ptSequence = block.ptHistory;
  for (let i = 0; i < ptSequence.length; i++) {
    const pt = ptSequence[i];
    const cycleNum = i + 1;
    const before = { ...current };
    current = bayesUpdatePT(current, pt, cycleNum);
    modeProbsHistory.push({ ...current });
    steps.push({ prior: before, evidence: pt, posterior: { ...current } });
  }

  // ④ 天井(周期)でベイズ更新
  // GAS: if (weekText.includes('周期')) { ... bayesUpdateCeiling(currentProbs, weekNum); }
  if (block.weekText.includes("周期")) {
    const m = block.weekText.match(/(\d+)周期/);
    if (m) {
      const weekNum = parseInt(m[1], 10);
      const before = { ...current };
      current = bayesUpdateCeiling(current, weekNum);
      steps.push({
        prior: before,
        evidence: block.weekText,
        posterior: { ...current },
      });
    }
  }

  // ⑤ パフォーマンスボーナス (メモキーワード)
  // GAS: memoText = currentBlock[13] + ',' + currentBlock[14]; applyPerformanceBonus(...)
  const memoText = block.memoAuto + "," + block.memoHandwritten;
  const beforeMemo = { ...current };
  current = applyPerformanceBonus(current, memoText);
  // メモで変化があった場合のみstepsに記録
  if (
    current.A !== beforeMemo.A ||
    current.B !== beforeMemo.B ||
    current.C !== beforeMemo.C ||
    current.H !== beforeMemo.H
  ) {
    steps.push({
      prior: beforeMemo,
      evidence: `memo:${memoText}`,
      posterior: { ...current },
    });
  }

  // ⑥ 特殊テーブル確率
  // GAS: const prevEventWas600 = checkPrev600(index, areaC);
  const prevEventWas600 = prevBlockPtSequence.includes("⑥");
  const specialTableScore = calculateSpecialTableProb(
    ptSequence,
    modeProbsHistory,
    prevEventWas600
  );

  return {
    priorProbs,
    probabilities: current,
    mostLikelyMode: getMostLikelyMode(current),
    specialTableScore,
    steps,
  };
}

// =============================================================================
// 全ブロックのモード推定 (セッション単位)
// =============================================================================

/**
 * セッション全ブロックのモード推定を順次実行する
 *
 * GAS: calculateAllModes() → results 配列の構築ループ
 *
 * @param normalBlocks - 通常ブロック一覧 (時系列順)
 * @param initialThroughCount - 開始時スルーカウント (P83セル)
 * @returns 各ブロックの推定結果 (データのないブロックは null)
 */
export function inferAllModes(
  normalBlocks: NormalBlock[],
  initialThroughCount: number
): (ModeInferenceResult | null)[] {
  const results: (ModeInferenceResult | null)[] = [];

  for (let i = 0; i < normalBlocks.length; i++) {
    const block = normalBlocks[i];

    // データがないブロックはスキップ
    // GAS: if (!blockData[1] && !blockData[4] && !blockData[9]) { results.push(null); continue; }
    const hasData =
      block.ptHistory || block.event1 || block.atKey;
    if (!hasData) {
      results.push(null);
      continue;
    }

    const prevBlock = i > 0 ? normalBlocks[i - 1] : null;
    const prevResult = i > 0 ? results[i - 1] : null;
    const prevPtSequence = prevBlock?.ptHistory ?? "";

    const result = inferBlockMode(
      block,
      i,
      prevBlock,
      prevResult,
      initialThroughCount,
      prevPtSequence
    );
    results.push(result);
  }

  return results;
}
