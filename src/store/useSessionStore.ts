// =============================================================================
// TOKYO GHOUL RESONANCE: セッション状態管理 (Zustand)
// =============================================================================

import { create } from "zustand";
import type { PlaySession, NormalBlock, TGATEntry, TGATRow, UchidashiState, ShushiData, TGShinsekaiCounter, PendingKakugan } from "@/types";

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

  updateUchidashi: (uchidashi: UchidashiState | null) => void;
  updateShushi: (shushi: ShushiData | null) => void;
  updateUserSettingGuess: (guess: string | null) => void;
  updateShinsekaiWeakRare: (counter: TGShinsekaiCounter) => void;

  /**
   * 赫眼 発生をマークして保留開始（バナー表示開始）
   * - 通常周期: { kind: "normal", blockId }
   * - AT SET 行: { kind: "at", atKey, rowId }
   */
  startPendingKakugan: (
    target:
      | { kind: "normal"; blockId: string }
      | { kind: "at"; atKey: string; rowId: string }
  ) => void;
  /** 保留中の赫眼を確定 — 発生時に焼き込んだ対象（周期 or AT SET）の kakugan[] に value を append */
  confirmPendingKakugan: (value: string) => void;
  /** 保留をキャンセル（発生元は何も変更しない） */
  cancelPendingKakugan: () => void;

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
        // 削除対象が pending の発生元だった場合は保留もクリア
        pendingKakugan: s.pendingKakugan?.blockId === blockId ? null : s.pendingKakugan,
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
        // 削除対象が pending の発生元 AT だった場合は保留もクリア
        pendingKakugan:
          s.pendingKakugan?.kind === "at" && s.pendingKakugan.atKey === atKey
            ? null
            : s.pendingKakugan,
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
        // 削除対象が pending の発生元 SET 行だった場合は保留もクリア
        pendingKakugan:
          s.pendingKakugan?.kind === "at"
          && s.pendingKakugan.atKey === atKey
          && s.pendingKakugan.rowId === rowId
            ? null
            : s.pendingKakugan,
      })),

    // ---- セッション設定 ----
    updateStartDiff: (newStartDiff) =>
      mutateSession(set, get, (s) => ({ ...s, startDiff: newStartDiff })),

    updateInitialThroughCount: (count) =>
      mutateSession(set, get, (s) => ({ ...s, initialThroughCount: count })),

    updateUchidashi: (uchidashi) =>
      mutateSession(set, get, (s) => ({ ...s, uchidashi })),

    updateShushi: (shushi) =>
      mutateSession(set, get, (s) => ({ ...s, shushi })),

    updateUserSettingGuess: (guess) =>
      mutateSession(set, get, (s) => ({ ...s, userSettingGuess: guess })),

    updateShinsekaiWeakRare: (counter) =>
      mutateSession(set, get, (s) => ({ ...s, shinsekaiWeakRare: counter })),

    // ---- 赫眼 後追い確定 ----
    startPendingKakugan: (target) =>
      mutateSession(set, get, (s) => {
        const now = new Date().toISOString();
        const pk: PendingKakugan =
          target.kind === "normal"
            ? { kind: "normal", blockId: target.blockId, startedAt: now }
            : { kind: "at", atKey: target.atKey, rowId: target.rowId, startedAt: now };
        return { ...s, pendingKakugan: pk };
      }),

    confirmPendingKakugan: (value) =>
      mutateSession(set, get, (s) => {
        const pk = s.pendingKakugan;
        if (!pk) return s;
        // AT 由来 — 発生時に焼き込んだ atKey + rowId の SET 行に追記
        if (pk.kind === "at" && pk.atKey && pk.rowId) {
          return {
            ...s,
            atEntries: s.atEntries.map((e) =>
              e.atKey === pk.atKey
                ? {
                    ...e,
                    rows: e.rows.map((r) =>
                      r.id === pk.rowId && r.rowType === "set"
                        ? { ...r, kakugan: [...(r.kakugan ?? []), value] }
                        : r
                    ),
                  }
                : e
            ),
            pendingKakugan: null,
          };
        }
        // normal 由来（kind 未指定の旧データも normal 扱い）
        if (!pk.blockId) return { ...s, pendingKakugan: null };
        return {
          ...s,
          normalBlocks: s.normalBlocks.map((b) =>
            b.id === pk.blockId ? { ...b, kakugan: [...b.kakugan, value] } : b
          ),
          pendingKakugan: null,
        };
      }),

    cancelPendingKakugan: () =>
      mutateSession(set, get, (s) => ({ ...s, pendingKakugan: null })),

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
