// =============================================================================
// VALVRAVE-RESONANCE: 差枚数計算エンジン (v2 — GAS完全移植)
// Project: V2-Web-Analytic | Version: 0.2.0
// GAS参照: user-seat-ver.8.4.gs calculateBalance()
//
// 計算フロー (1ブロック):
//   1. myDiff -= normG * 1.529          ← 通常G消費
//   2. hitBalance = startDiff + myDiff  ← NormalBlock.calculatedDiff (当選の底)
//   3. myDiff -= czG * 1.529            ← CZ消費
//   4. myDiff += bonusPayout            ← ボーナス獲得
//   5. for each ATRound:
//        if rIdx > 0: myDiff -= 3.3*1.529   ← ハラキリ消費
//        gain = g * 9.0
//        if 切断║ED: gain += 200; if retG: gain -= retG*9
//        else:       if retG: myDiff -= retG*1.529
//        myDiff += gain
//        round.calculatedDiff = startDiff + myDiff  ← ATRound.calculatedDiff
// =============================================================================

import type {
  NormalBlock,
  ATEntry,
  ATRound,
  PlaySession,
  SessionSummary,
} from "@/types";
import {
  COST_NET,
  AT_NET_PER_GAME,
  HARAKIRI_COST,
  ED_BONUS,
  BONUS_PAYOUT_KAKU_SUCCESS,
  BONUS_PAYOUT_KAKU_FAIL,
  BONUS_PAYOUT_KESS,
  CUT_FLAG_ED,
} from "./constants";

// =============================================================================
// 内部ユーティリティ
// =============================================================================

/**
 * 値から数値を抽出する
 * GAS: const extractNum = (val) => { ... }
 *
 * 対象:
 *   - number → そのまま返す
 *   - "10"   → 10
 *   - "50||D"  → 50
 *   - "100||D" → 100
 *   - "究極"   → 0 (数値なし)
 *   - "・"     → 0
 *   - ""       → 0
 */
export function extractNum(val: unknown): number {
  if (typeof val === "number") return val;
  const str = String(val ?? "").trim();
  if (str === "・" || str === "") return 0;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// =============================================================================
// ボーナス払い出し計算
// =============================================================================

/**
 * 1ブロックのボーナス払い出し枚数を返す
 *
 * GAS:
 *   if (ev1.includes('革命BONUS') || ev2.includes('革命BONUS'))
 *     bonusGet = (inputBonus > 0) ? inputBonus : ((at) ? 539 : 468)
 *   else if (ev1.includes('決戦BONUS') || ev2.includes('決戦BONUS'))
 *     bonusGet = 72
 */
export function calcBonusPayout(block: NormalBlock): number {
  const { event1, event2, atKey, bonusActual } = block;

  const isKaku = event1.includes("革命BONUS") || event2.includes("革命BONUS");
  const isKess = event1.includes("決戦BONUS") || event2.includes("決戦BONUS");

  if (isKaku) {
    // 実測値が入力されていればそれを優先
    if (bonusActual !== null && bonusActual > 0) return bonusActual;
    // AT当選かどうかで成功/失敗を判断
    return atKey ? BONUS_PAYOUT_KAKU_SUCCESS : BONUS_PAYOUT_KAKU_FAIL;
  }

  if (isKess) {
    return BONUS_PAYOUT_KESS;
  }

  return 0;
}

// =============================================================================
// ATラウンド G数計算
// =============================================================================

/**
 * 1ラウンドの総消化G数を返す
 *
 * GAS:
 *   g += extractNum(d[1])   // R種別
 *   g += extractNum(d[6])   // 道中乗せ
 *   g += extractNum(d[19])  // 特殊G
 */
export function calcRoundTotalGames(round: ATRound): number {
  return (
    extractNum(round.roundType) +
    round.midBonusGames +
    round.specialGames
  );
}

// =============================================================================
// ドミノ再計算 (メイン)
// =============================================================================

export interface RecomputeResult {
  normalBlocks: NormalBlock[];
  atEntries: ATEntry[];
  summary: SessionSummary;
}

/**
 * セッション全体の差枚スタンプをドミノ再計算する
 *
 * GAS: calculateBalance() の完全移植
 * 引数のsession は変更せず、新しいオブジェクトを返す (純粋関数)
 */
export function recomputeSession(session: PlaySession): RecomputeResult {
  const { startDiff, normalBlocks, atEntries, initialThroughCount: _itc } = session;

  // ----- ATマップの構築 (atKey → ATEntry) -----
  // GAS: atMap = {}; for (let i = 0; i < atRange.length; i += 2) { ... }
  const atMap = new Map<string, ATEntry>();
  atEntries.forEach((entry) => atMap.set(entry.atKey, entry));

  // ----- ディープコピー (副作用ゼロを保証) -----
  const newNormalBlocks: NormalBlock[] = normalBlocks.map((b) => ({
    ...b,
    dolciaPhases: [...b.dolciaPhases],
  }));
  const newAtEntries: ATEntry[] = atEntries.map((e) => ({
    ...e,
    rounds: e.rounds.map((r) => ({ ...r })),
  }));
  const newAtMap = new Map<string, ATEntry>();
  newAtEntries.forEach((e) => newAtMap.set(e.atKey, e));

  // ----- 集計カウンター -----
  let myDiff = 0;
  let totalGames = 0;
  let normalGamesTotal = 0;
  let atCount = 0;
  let czCount = 0;
  let czSuccessCount = 0;
  let kakuBonusCount = 0;
  let kakuBonusSuccessCount = 0;
  let kessBonusCount = 0;
  let kessBonusSuccessCount = 0;

  // ----- メインループ -----
  for (const block of newNormalBlocks) {
    // ① 通常G消費
    // GAS: const consume = normG * 1.529; myDiff -= consume;
    const normG = block.games;
    myDiff -= normG * COST_NET;
    totalGames += normG;
    normalGamesTotal += normG;

    // ★ 差枚スタンプ (当選の瞬間の底 = 通常G消費直後)
    // GAS: const hitBalance = Math.round(startDiff + myDiff);
    block.calculatedDiff = Math.round(startDiff + myDiff);

    // ② CZ消費
    // GAS: myDiff -= (czG * 1.529);
    const czG = block.czGames;
    myDiff -= czG * COST_NET;
    totalGames += czG;

    // ③ ボーナス獲得
    // GAS: if (ev1.includes('革命BONUS') ...) { bonusGet = ...; }
    const bonusPayout = calcBonusPayout(block);
    myDiff += bonusPayout;

    // ----- イベントカウント -----
    const isCZ = block.event1 === "CZ";
    const isKaku =
      block.event1.includes("革命BONUS") || block.event2.includes("革命BONUS");
    const isKess =
      block.event1.includes("決戦BONUS") || block.event2.includes("決戦BONUS");
    const isSuccess = /革命|決戦|RUSH/.test(block.event2);

    if (isCZ) {
      czCount++;
      if (isSuccess) czSuccessCount++;
    }
    if (isKaku) {
      kakuBonusCount++;
      if (block.atKey) kakuBonusSuccessCount++;
    }
    if (isKess) {
      kessBonusCount++;
      if (block.atKey) kessBonusSuccessCount++;
    }

    // ④ AT計算
    // GAS: if (atKey && atMap[atKey]) { rounds.forEach((round, rIdx) => { ... }); }
    const atKey = block.atKey;
    if (atKey) {
      const entry = newAtMap.get(atKey);
      if (entry) {
        atCount++;

        for (let rIdx = 0; rIdx < entry.rounds.length; rIdx++) {
          const round = entry.rounds[rIdx];

          // ハラキリ消費 (2ラウンド目以降)
          // GAS: if (rIdx > 0) myDiff -= (3.3 * 1.529);
          if (rIdx > 0) {
            myDiff -= HARAKIRI_COST;
          }

          // ラウンドG数合計
          // GAS: g += extractNum(d[1]) + extractNum(d[6]) + extractNum(d[19])
          const g = calcRoundTotalGames(round);
          let gain = g * AT_NET_PER_GAME;

          // ED特殊処理 / 引戻し処理
          const retG = round.returnGames;
          if (round.cutFlag === CUT_FLAG_ED) {
            // 切断║ED: ED恩恵 + 残りG減算
            // GAS: gain += 200; if (retVal > 0) gain -= (retVal * 9);
            gain += ED_BONUS;
            if (retG > 0) {
              gain -= retG * AT_NET_PER_GAME;
            }
          } else {
            // 通常: 引戻しG数を通常消費として減算
            // GAS: if (retVal > 0) myDiff -= (retVal * 1.529);
            if (retG > 0) {
              myDiff -= retG * COST_NET;
            }
          }

          myDiff += gain;
          totalGames += g;
          if (retG > 0 && round.cutFlag !== CUT_FLAG_ED) totalGames += retG;

          // ★ ATラウンド差枚スタンプ
          // GAS: round.diff = Math.round(startDiff + myDiff);
          round.calculatedDiff = Math.round(startDiff + myDiff);
        }
      }
    }
  }

  const summary: SessionSummary = {
    totalDiff: Math.round(myDiff),
    totalGames,
    normalGames: normalGamesTotal,
    atCount,
    czCount,
    czSuccessCount,
    kakuBonusCount,
    kakuBonusSuccessCount,
    kessBonusCount,
    kessBonusSuccessCount,
  };

  return {
    normalBlocks: newNormalBlocks,
    atEntries: newAtEntries,
    summary,
  };
}
