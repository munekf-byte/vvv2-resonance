// =============================================================================
// VALVRAVE-RESONANCE: V2Engine — 統合計算エンジン (v2 — GAS完全移植)
// Project: V2-Web-Analytic | Version: 0.2.0
//
// 責務:
//   1. ドミノ再計算 — 全イベントの calculatedDiff を先頭から末尾へ再計算
//      (GAS: calculateBalance())
//   2. モード推定 — ベイズ推定による滞在モード確率の逐次更新
//      (GAS: calculateAllModes())
//   3. セッション編集 API — appendBlock/updateBlock/deleteBlock
//
// 純粋関数設計: 全メソッドは副作用なし。入力を変更せず新オブジェクトを返す。
// =============================================================================

import type {
  PlaySession,
  RecalculateInput,
  RecalculateOutput,
  NormalBlock,
  ATEntry,
  ATRound,
  ModeInferenceResult,
} from "@/types";
import { recomputeSession } from "./calculator";
import { inferAllModes } from "./bayes";

// =============================================================================
// V2Engine クラス
// =============================================================================

export class V2Engine {
  // ---------------------------------------------------------------------------
  // メインAPI: 全体再計算
  // ---------------------------------------------------------------------------

  /**
   * セッション全体を再計算する (ドミノ再計算 + モード推定)
   *
   * 処理順:
   *   1. recomputeSession()  → 差枚スタンプ全更新
   *   2. inferAllModes()     → ベイズモード推定
   *
   * @param input - 再計算対象セッション
   * @returns 差枚スタンプ・モード推定結果更新済みの出力
   */
  static recalculate(input: RecalculateInput): RecalculateOutput {
    const { session } = input;

    // Step 1: 差枚ドミノ再計算
    const calcResult = recomputeSession(session);

    // Step 2: モード推定 (再計算済みブロックを使用)
    const modeInferences: (ModeInferenceResult | null)[] = inferAllModes(
      calcResult.normalBlocks,
      session.initialThroughCount
    );

    return {
      normalBlocks: calcResult.normalBlocks,
      atEntries: calcResult.atEntries,
      summary: calcResult.summary,
      modeInferences,
    };
  }

  // ---------------------------------------------------------------------------
  // 通常ブロック編集API
  // ---------------------------------------------------------------------------

  /**
   * 通常ブロックを末尾に追加して再計算する
   */
  static appendNormalBlock(
    session: PlaySession,
    block: NormalBlock
  ): RecalculateOutput {
    const updated = V2Engine._applyToSession(session, {
      normalBlocks: [...session.normalBlocks, block],
    });
    return V2Engine.recalculate({ session: updated });
  }

  /**
   * 通常ブロックを更新して再計算する
   */
  static updateNormalBlock(
    session: PlaySession,
    blockId: string,
    updated: NormalBlock
  ): RecalculateOutput {
    const newBlocks = session.normalBlocks.map((b) =>
      b.id === blockId ? updated : b
    );
    const updatedSession = V2Engine._applyToSession(session, {
      normalBlocks: newBlocks,
    });
    return V2Engine.recalculate({ session: updatedSession });
  }

  /**
   * 通常ブロックを削除して再計算する
   * 紐づくATエントリも削除する
   */
  static deleteNormalBlock(
    session: PlaySession,
    blockId: string
  ): RecalculateOutput {
    const target = session.normalBlocks.find((b) => b.id === blockId);
    const newBlocks = session.normalBlocks.filter((b) => b.id !== blockId);
    // 紐づくATエントリを削除
    const newAtEntries = target?.atKey
      ? session.atEntries.filter((e) => e.atKey !== target.atKey)
      : session.atEntries;

    const updatedSession = V2Engine._applyToSession(session, {
      normalBlocks: newBlocks,
      atEntries: newAtEntries,
    });
    return V2Engine.recalculate({ session: updatedSession });
  }

  // ---------------------------------------------------------------------------
  // ATエントリ編集API
  // ---------------------------------------------------------------------------

  /**
   * ATエントリ (= 全ラウンドセット) を追加して再計算する
   */
  static appendATEntry(
    session: PlaySession,
    entry: ATEntry
  ): RecalculateOutput {
    const updated = V2Engine._applyToSession(session, {
      atEntries: [...session.atEntries, entry],
    });
    return V2Engine.recalculate({ session: updated });
  }

  /**
   * ATエントリを更新して再計算する
   */
  static updateATEntry(
    session: PlaySession,
    atKey: string,
    updatedEntry: ATEntry
  ): RecalculateOutput {
    const newEntries = session.atEntries.map((e) =>
      e.atKey === atKey ? updatedEntry : e
    );
    const updated = V2Engine._applyToSession(session, {
      atEntries: newEntries,
    });
    return V2Engine.recalculate({ session: updated });
  }

  /**
   * ATエントリを削除して再計算する
   * 紐づくNormalBlockのatKeyもクリアする
   */
  static deleteATEntry(
    session: PlaySession,
    atKey: string
  ): RecalculateOutput {
    const newEntries = session.atEntries.filter((e) => e.atKey !== atKey);
    const newBlocks = session.normalBlocks.map((b) =>
      b.atKey === atKey ? { ...b, atKey: null } : b
    );
    const updated = V2Engine._applyToSession(session, {
      normalBlocks: newBlocks,
      atEntries: newEntries,
    });
    return V2Engine.recalculate({ session: updated });
  }

  // ---------------------------------------------------------------------------
  // ATラウンド編集API (ATエントリ内の個別ラウンド)
  // ---------------------------------------------------------------------------

  /**
   * ATラウンドを追加して再計算する
   */
  static appendATRound(
    session: PlaySession,
    atKey: string,
    round: ATRound
  ): RecalculateOutput {
    const entry = session.atEntries.find((e) => e.atKey === atKey);
    if (!entry) {
      throw new Error(`ATEntry not found: ${atKey}`);
    }
    const updatedEntry: ATEntry = {
      ...entry,
      rounds: [...entry.rounds, round],
    };
    return V2Engine.updateATEntry(session, atKey, updatedEntry);
  }

  /**
   * ATラウンドを更新して再計算する
   */
  static updateATRound(
    session: PlaySession,
    atKey: string,
    roundId: string,
    updatedRound: ATRound
  ): RecalculateOutput {
    const entry = session.atEntries.find((e) => e.atKey === atKey);
    if (!entry) {
      throw new Error(`ATEntry not found: ${atKey}`);
    }
    const updatedEntry: ATEntry = {
      ...entry,
      rounds: entry.rounds.map((r) => (r.id === roundId ? updatedRound : r)),
    };
    return V2Engine.updateATEntry(session, atKey, updatedEntry);
  }

  /**
   * ATラウンドを削除して再計算する
   */
  static deleteATRound(
    session: PlaySession,
    atKey: string,
    roundId: string
  ): RecalculateOutput {
    const entry = session.atEntries.find((e) => e.atKey === atKey);
    if (!entry) {
      throw new Error(`ATEntry not found: ${atKey}`);
    }
    const remainingRounds = entry.rounds.filter((r) => r.id !== roundId);
    // roundIndex を振り直す
    const reindexedRounds = remainingRounds.map((r, i) => ({
      ...r,
      roundIndex: i,
    }));
    const updatedEntry: ATEntry = { ...entry, rounds: reindexedRounds };
    return V2Engine.updateATEntry(session, atKey, updatedEntry);
  }

  // ---------------------------------------------------------------------------
  // セッション設定変更 (startDiff / initialThroughCount)
  // ---------------------------------------------------------------------------

  /**
   * startDiff を変更して再計算する
   * (= 前セッションからの引き継ぎ差枚を修正する)
   */
  static updateStartDiff(
    session: PlaySession,
    newStartDiff: number
  ): RecalculateOutput {
    const updated = V2Engine._applyToSession(session, {
      startDiff: newStartDiff,
    });
    return V2Engine.recalculate({ session: updated });
  }

  /**
   * initialThroughCount を変更して再計算する
   * (= 前回セッションのスルー回数を修正する → モード推定に影響)
   */
  static updateInitialThroughCount(
    session: PlaySession,
    count: number
  ): RecalculateOutput {
    const updated = V2Engine._applyToSession(session, {
      initialThroughCount: count,
    });
    return V2Engine.recalculate({ session: updated });
  }

  // ---------------------------------------------------------------------------
  // 内部ヘルパー
  // ---------------------------------------------------------------------------

  /**
   * セッションの一部フィールドを更新した新オブジェクトを返す
   */
  private static _applyToSession(
    session: PlaySession,
    patch: Partial<PlaySession>
  ): PlaySession {
    return { ...session, ...patch };
  }
}

// =============================================================================
// RecalculateOutput をセッションに適用するヘルパー
// =============================================================================

/**
 * V2Engine.recalculate() の出力をセッションに反映する
 * Zustand store での使用を想定
 */
export function applyRecalculateOutput(
  session: PlaySession,
  output: RecalculateOutput
): PlaySession {
  return {
    ...session,
    normalBlocks: output.normalBlocks,
    atEntries: output.atEntries,
    summary: output.summary,
    modeInferences: output.modeInferences,
    updatedAt: new Date().toISOString(),
  };
}
