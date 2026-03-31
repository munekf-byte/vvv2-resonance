// =============================================================================
// TOKYO GHOUL RESONANCE: 共有型定義
// =============================================================================

export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

// -----------------------------------------------------------------------------
// TGNormalBlock: 通常時の1周期
// -----------------------------------------------------------------------------

export interface TGNormalBlock {
  id: string;
  /** 実G数 */
  jisshuG: number | null;
  /** ゾーン (TG_ZONES) */
  zone: string;
  /** 推定モード (TG_MODES) */
  estimatedMode: string;
  /** 当選契機 (TG_WIN_TRIGGERS) */
  winTrigger: string;
  /** イベント1 (TG_EVENTS | "") */
  event1: string;
  /** イベント2 (TG_EVENTS | "") */
  event2: string;
  /** AT初当り — true = "AT Get" */
  atWin: boolean;
  /** 終了画面示唆 (TG_ENDING_SUGGESTIONS | "") */
  endingSuggestion: string;
  /** トロフィー (TG_TROPHIES | "") */
  trophy: string;
  /** 赫眼状態 (TG_KAKUGAN | "") */
  kakugan: string;
  /** 精神世界 (TG_SHINSEKAI | "") */
  shinsekai: string;
  /** 招待状 (TG_INVITATIONS | "") */
  invitation: string;
  /** 前兆履歴 (TG_ZENCHO | "") */
  zencho: string;
}

/** Store 互換エイリアス */
export type NormalBlock = TGNormalBlock;

// -----------------------------------------------------------------------------
// ATRound / ATEntry
// -----------------------------------------------------------------------------

export interface ATRound {
  id: string;
  atKey: string;
  roundIndex: number;
  roundType: string;
  cutFlag: string;
  midBonusGames: number;
  returnGames: number;
  specialGames: number;
  continueTrigger: string;
  stateText: string;
  stampInput: number | null;
  calculatedDiff: number | null;
}

export interface ATEntry {
  atKey: string;
  rounds: ATRound[];
}

// -----------------------------------------------------------------------------
// SessionSummary / PlaySession
// -----------------------------------------------------------------------------

export interface SessionSummary {
  totalDiff: number;
  totalGames: number;
  normalGames: number;
  atCount: number;
}

export interface PlaySession {
  id: string;
  userId: string;
  machineName: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  startDiff: number;
  initialThroughCount: number;
  normalBlocks: NormalBlock[];
  atEntries: ATEntry[];
  summary: SessionSummary | null;
  modeInferences: null[];
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Supabase DB Row型
// -----------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface PlaySessionRow {
  id: string;
  user_id: string;
  machine_name: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  start_diff: number;
  initial_through_count: number;
  normal_blocks: Json;
  at_entries: Json;
  summary: Json | null;
  mode_inferences: Json | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}
