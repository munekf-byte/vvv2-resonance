// =============================================================================
// VALVRAVE-RESONANCE: セッション状態管理 (Zustand v2)
// Project: V2-Web-Analytic | Version: 0.2.0
// =============================================================================

import { create } from "zustand";
import type {
  PlaySession,
  NormalBlock,
  ATEntry,
  ATRound,
  RecalculateOutput,
} from "@/types";
import { V2Engine, applyRecalculateOutput } from "@/lib/engine/V2Engine";

// -----------------------------------------------------------------------------
// Store 型定義
// -----------------------------------------------------------------------------

interface SessionState {
  /** 現在編集中のセッション */
  session: PlaySession | null;
  /** Engineの最新計算出力 */
  lastOutput: RecalculateOutput | null;
  /** ローディング */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

interface SessionActions {
  /** セッションをロードして再計算 */
  loadSession: (session: PlaySession) => void;

  // --- 通常ブロック ---
  appendNormalBlock: (block: NormalBlock) => void;
  updateNormalBlock: (blockId: string, updated: NormalBlock) => void;
  deleteNormalBlock: (blockId: string) => void;

  // --- ATエントリ ---
  appendATEntry: (entry: ATEntry) => void;
  updateATEntry: (atKey: string, updated: ATEntry) => void;
  deleteATEntry: (atKey: string) => void;

  // --- ATラウンド ---
  appendATRound: (atKey: string, round: ATRound) => void;
  updateATRound: (atKey: string, roundId: string, updated: ATRound) => void;
  deleteATRound: (atKey: string, roundId: string) => void;

  // --- セッション設定 ---
  updateStartDiff: (newStartDiff: number) => void;
  updateInitialThroughCount: (count: number) => void;

  /** セッションクリア */
  clearSession: () => void;
  /** エラークリア */
  clearError: () => void;
}

// -----------------------------------------------------------------------------
// ヘルパー: V2Engineの出力をセッションに適用してstoreを更新する
// -----------------------------------------------------------------------------

type SetFn = (partial: Partial<SessionState & SessionActions>) => void;
type GetFn = () => SessionState & SessionActions;

function withRecalculate(
  set: SetFn,
  get: GetFn,
  engineFn: (session: PlaySession) => RecalculateOutput
): void {
  const { session } = get();
  if (!session) return;
  try {
    const output = engineFn(session);
    const updatedSession = applyRecalculateOutput(session, output);
    set({ session: updatedSession, lastOutput: output, error: null });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : "計算エラー" });
  }
}

// -----------------------------------------------------------------------------
// Store 実装
// -----------------------------------------------------------------------------

export const useSessionStore = create<SessionState & SessionActions>(
  (set, get) => ({
    // 初期状態
    session: null,
    lastOutput: null,
    isLoading: false,
    error: null,

    // ---- loadSession ----
    loadSession: (session) => {
      set({ isLoading: true, error: null });
      try {
        const output = V2Engine.recalculate({ session });
        const updated = applyRecalculateOutput(session, output);
        set({ session: updated, lastOutput: output, isLoading: false });
      } catch (e) {
        set({
          error: e instanceof Error ? e.message : "セッション読み込みエラー",
          isLoading: false,
        });
      }
    },

    // ---- 通常ブロック ----
    appendNormalBlock: (block) =>
      withRecalculate(set, get, (s) => V2Engine.appendNormalBlock(s, block)),

    updateNormalBlock: (blockId, updated) =>
      withRecalculate(set, get, (s) =>
        V2Engine.updateNormalBlock(s, blockId, updated)
      ),

    deleteNormalBlock: (blockId) =>
      withRecalculate(set, get, (s) => V2Engine.deleteNormalBlock(s, blockId)),

    // ---- ATエントリ ----
    appendATEntry: (entry) =>
      withRecalculate(set, get, (s) => V2Engine.appendATEntry(s, entry)),

    updateATEntry: (atKey, updated) =>
      withRecalculate(set, get, (s) =>
        V2Engine.updateATEntry(s, atKey, updated)
      ),

    deleteATEntry: (atKey) =>
      withRecalculate(set, get, (s) => V2Engine.deleteATEntry(s, atKey)),

    // ---- ATラウンド ----
    appendATRound: (atKey, round) =>
      withRecalculate(set, get, (s) =>
        V2Engine.appendATRound(s, atKey, round)
      ),

    updateATRound: (atKey, roundId, updated) =>
      withRecalculate(set, get, (s) =>
        V2Engine.updateATRound(s, atKey, roundId, updated)
      ),

    deleteATRound: (atKey, roundId) =>
      withRecalculate(set, get, (s) =>
        V2Engine.deleteATRound(s, atKey, roundId)
      ),

    // ---- セッション設定 ----
    updateStartDiff: (newStartDiff) =>
      withRecalculate(set, get, (s) =>
        V2Engine.updateStartDiff(s, newStartDiff)
      ),

    updateInitialThroughCount: (count) =>
      withRecalculate(set, get, (s) =>
        V2Engine.updateInitialThroughCount(s, count)
      ),

    // ---- ユーティリティ ----
    clearSession: () =>
      set({ session: null, lastOutput: null, error: null }),

    clearError: () => set({ error: null }),
  })
);

// -----------------------------------------------------------------------------
// セレクター (コンポーネントからの便利アクセス)
// -----------------------------------------------------------------------------

export const selectTotalDiff = (s: SessionState): number =>
  s.session?.summary?.totalDiff ?? 0;

export const selectTotalGames = (s: SessionState): number =>
  s.session?.summary?.totalGames ?? 0;

export const selectNormalBlocks = (s: SessionState): NormalBlock[] =>
  s.session?.normalBlocks ?? [];

export const selectATEntries = (s: SessionState): ATEntry[] =>
  s.session?.atEntries ?? [];

export const selectLatestModeInference = (s: SessionState) => {
  const inferences = s.session?.modeInferences ?? [];
  // 最後の非nullな推定結果を返す
  for (let i = inferences.length - 1; i >= 0; i--) {
    if (inferences[i] !== null) return inferences[i];
  }
  return null;
};
