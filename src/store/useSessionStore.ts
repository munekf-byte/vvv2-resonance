// =============================================================================
// TOKYO GHOUL RESONANCE: セッション状態管理 (Zustand)
// エンジン計算なし — データ保持・操作のみ
// =============================================================================

import { create } from "zustand";
import type { PlaySession, NormalBlock, ATEntry, ATRound } from "@/types";

// -----------------------------------------------------------------------------
// Store 型定義
// -----------------------------------------------------------------------------

interface SessionState {
  session: PlaySession | null;
  isLoading: boolean;
  error: string | null;
}

interface SessionActions {
  loadSession: (session: PlaySession) => void;

  appendNormalBlock: (block: NormalBlock) => void;
  updateNormalBlock: (blockId: string, updated: NormalBlock) => void;
  deleteNormalBlock: (blockId: string) => void;

  appendATEntry: (entry: ATEntry) => void;
  updateATEntry: (atKey: string, updated: ATEntry) => void;
  deleteATEntry: (atKey: string) => void;

  appendATRound: (atKey: string, round: ATRound) => void;
  updateATRound: (atKey: string, roundId: string, updated: ATRound) => void;
  deleteATRound: (atKey: string, roundId: string) => void;

  updateStartDiff: (newStartDiff: number) => void;
  updateInitialThroughCount: (count: number) => void;

  clearSession: () => void;
  clearError: () => void;
}

type SetFn = (partial: Partial<SessionState & SessionActions>) => void;
type GetFn = () => SessionState & SessionActions;

// セッションを直接更新するヘルパー (エンジン計算なし)
function mutateSession(
  set: SetFn,
  get: GetFn,
  mutateFn: (s: PlaySession) => PlaySession
): void {
  const { session } = get();
  if (!session) return;
  try {
    set({ session: mutateFn(session), error: null });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : "更新エラー" });
  }
}

// -----------------------------------------------------------------------------
// Store 実装
// -----------------------------------------------------------------------------

export const useSessionStore = create<SessionState & SessionActions>(
  (set, get) => ({
    session: null,
    isLoading: false,
    error: null,

    loadSession: (session) => {
      set({ session, isLoading: false, error: null });
    },

    // ---- 通常ブロック ----
    appendNormalBlock: (block) =>
      mutateSession(set, get, (s) => ({
        ...s,
        normalBlocks: [...s.normalBlocks, block],
      })),

    updateNormalBlock: (blockId, updated) =>
      mutateSession(set, get, (s) => ({
        ...s,
        normalBlocks: s.normalBlocks.map((b) => (b.id === blockId ? updated : b)),
      })),

    deleteNormalBlock: (blockId) =>
      mutateSession(set, get, (s) => ({
        ...s,
        normalBlocks: s.normalBlocks.filter((b) => b.id !== blockId),
      })),

    // ---- ATエントリ ----
    appendATEntry: (entry) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: [...s.atEntries, entry],
      })),

    updateATEntry: (atKey, updated) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) => (e.atKey === atKey ? updated : e)),
      })),

    deleteATEntry: (atKey) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.filter((e) => e.atKey !== atKey),
      })),

    // ---- ATラウンド ----
    appendATRound: (atKey, round) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey ? { ...e, rounds: [...e.rounds, round] } : e
        ),
      })),

    updateATRound: (atKey, roundId, updated) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey
            ? { ...e, rounds: e.rounds.map((r) => (r.id === roundId ? updated : r)) }
            : e
        ),
      })),

    deleteATRound: (atKey, roundId) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey
            ? { ...e, rounds: e.rounds.filter((r) => r.id !== roundId) }
            : e
        ),
      })),

    // ---- セッション設定 ----
    updateStartDiff: (newStartDiff) =>
      mutateSession(set, get, (s) => ({ ...s, startDiff: newStartDiff })),

    updateInitialThroughCount: (count) =>
      mutateSession(set, get, (s) => ({ ...s, initialThroughCount: count })),

    // ---- ユーティリティ ----
    clearSession: () => set({ session: null, error: null }),
    clearError: () => set({ error: null }),
  })
);

// -----------------------------------------------------------------------------
// セレクター
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
  for (let i = inferences.length - 1; i >= 0; i--) {
    if (inferences[i] !== null) return inferences[i];
  }
  return null;
};
