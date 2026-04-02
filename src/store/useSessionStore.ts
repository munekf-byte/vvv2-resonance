// =============================================================================
// TOKYO GHOUL RESONANCE: セッション状態管理 (Zustand)
// =============================================================================

import { create } from "zustand";
import type { PlaySession, NormalBlock, TGATEntry, TGATRow } from "@/types";

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

  appendTGATEntry: (entry: TGATEntry) => void;
  updateTGATEntry: (atKey: string, updated: TGATEntry) => void;
  deleteTGATEntry: (atKey: string) => void;

  appendTGATRow: (atKey: string, row: TGATRow) => void;
  updateTGATRow: (atKey: string, rowId: string, updated: TGATRow) => void;
  deleteTGATRow: (atKey: string, rowId: string) => void;

  updateStartDiff: (newStartDiff: number) => void;
  updateInitialThroughCount: (count: number) => void;

  clearSession: () => void;
  clearError: () => void;
}

type SetFn = (partial: Partial<SessionState & SessionActions>) => void;
type GetFn = () => SessionState & SessionActions;

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

    // ---- TG ATエントリ ----
    appendTGATEntry: (entry) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: [...s.atEntries, entry],
      })),

    updateTGATEntry: (atKey, updated) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) => (e.atKey === atKey ? updated : e)),
      })),

    deleteTGATEntry: (atKey) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.filter((e) => e.atKey !== atKey),
      })),

    // ---- TG ATRow ----
    appendTGATRow: (atKey, row) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey ? { ...e, rows: [...e.rows, row] } : e
        ),
      })),

    updateTGATRow: (atKey, rowId, updated) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey
            ? { ...e, rows: e.rows.map((r) => (r.id === rowId ? updated : r)) }
            : e
        ),
      })),

    deleteTGATRow: (atKey, rowId) =>
      mutateSession(set, get, (s) => ({
        ...s,
        atEntries: s.atEntries.map((e) =>
          e.atKey === atKey
            ? { ...e, rows: e.rows.filter((r) => r.id !== rowId) }
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

export const selectNormalBlocks = (s: SessionState): NormalBlock[] =>
  s.session?.normalBlocks ?? [];

export const selectATEntries = (s: SessionState): TGATEntry[] =>
  s.session?.atEntries ?? [];
