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
  /** イベント (TG_EVENTS | "") — 1周期1イベント */
  event: string;
  /** AT初当り — true = "AT Get" */
  atWin: boolean;
  /** 終了画面示唆 (TG_ENDING_SUGGESTIONS | "") */
  endingSuggestion: string;
  /** トロフィー (TG_TROPHIES | "") */
  trophy: string;
  /** 赫眼状態 — 複数記録可 (TG_KAKUGAN values) */
  kakugan: string[];
  /** 精神世界 — 複数記録可 (TG_SHINSEKAI values) */
  shinsekai: string[];
  /** 招待状 — 複数記録可 (TG_INVITATIONS values) */
  invitation: string[];
  /** 前兆履歴 — 複数記録可 (TG_ZENCHO values) */
  zencho: string[];
  /** フリーメモ */
  memo?: string;
}

/** Store 互換エイリアス */
export type NormalBlock = TGNormalBlock;

// -----------------------------------------------------------------------------
// TG AT System: TGATEntry / TGATRow
// -----------------------------------------------------------------------------

/** 直乗せ1件 */
export interface TGDirectAdd {
  id: string;
  trigger: string;  // 弱🍒 / 🍉 / チャ目 / 強🍒 / 確定🍒
  coins: number | null;
}

/** 対決1回分（契機 + 勝敗） */
export interface TGBattle {
  trigger: string;  // 15G / 30G / 強🍒・チャ目 / etc.
  result: string;   // "○" | "×" | ""
}

/** エンディングカード記録 */
export interface TGEndingCard {
  whiteWeak: number;     // 白カード 奇数示唆〔弱〕回数
  whiteStrong: number;   // 白カード 奇数示唆〔強〕回数
  blueWeak: number;      // 青カード 奇数示唆〔弱〕回数
  blueStrong: number;    // 青カード 奇数示唆〔強〕回数
  redWeak: number;       // 赤カード 高設定示唆〔弱〕回数
  redStrong: number;     // 赤カード 高設定示唆〔強〕回数
  silverType: string;    // 銀カード種別 (TG_SILVER_CARD_TYPES | "")
  confirmedType: string; // 確定カード種別 (TG_CONFIRMED_CARD_TYPES | "")
}

/** SET行 — 喰種対決1SET分 */
export interface TGATSet {
  id: string;
  rowType: "set";
  atType: string;       // 通常AT / 裏AT / 隠れ裏AT（推測）
  character: string;    // 敵キャラ
  disadvantage: string; // - / 不利益⭕️ / 不利益❌  ※フォーム非表示・型は保持
  bitesType: string;    // BITES種別
  bitesCoins: string;   // BITES獲得: "50"〜"3000" | "ED" | ""
  kakugan?: string[];        // 赫眼状態 ※フォーム非表示・型は保持
  endingSuggestion?: string; // 終了画面示唆 ([終了画面] prefix のみ)
  trophy?: string;           // トロフィー
  endingCard?: TGEndingCard; // エンディングカード記録
  directAdds: TGDirectAdd[]; // 直乗せ max 10
  battles: TGBattle[];       // 対決（契機+成績） max 10
}

/** 有馬貴将ジャッジメント行 */
export interface TGArimaJudgment {
  id: string;
  rowType: "arima";
  result: string;          // 成功 / 失敗
  role: string;            // 小役ナシ / リプレイ / レア役
  ccgCoins: number | null; // 500 / 1000 / 2000
}

export type TGATRow = TGATSet | TGArimaJudgment;

/** AT初当たり1回分（連チャン継続分も含む） */
export interface TGATEntry {
  atKey: string;    // "AT1", "AT2" ...
  rows: TGATRow[];
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
  atEntries: TGATEntry[];
  summary: SessionSummary | null;
  modeInferences: null[];
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Supabase DB Row 型
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
