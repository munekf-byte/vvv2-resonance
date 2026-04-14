// =============================================================================
// TOKYO GHOUL RESONANCE: モード推定データテーブル
// docs/tg-mode-estimation.md の仕様マトリクスをコード化
// =============================================================================

import type { ModeKey } from "./modeEstimation";

// -----------------------------------------------------------------------------
// 1. 前兆フラグ判定テーブル (Hard Constraints)
//    ゾーン × 前兆種別 → モード排除/確定
// -----------------------------------------------------------------------------

export type ZenchoAction =
  | { type: "eliminate"; modes: ModeKey[] }       // 該当モードを0%に
  | { type: "confirmAbove"; floor: ModeKey }      // floor以上のモード濃厚（以下を0%に）
  | { type: "confirm"; mode: ModeKey }            // 単一モード確定（1.0）
  | { type: "boost"; modes: ModeKey[]; factor: number } // ソフトブースト
  | { type: "default" };                          // 補正なし

// MODE順序（下位→上位）: A < B < C < CH < PRE < HEAVEN
const MODE_ORDER: ModeKey[] = ["A", "B", "C", "CH", "PRE", "HEAVEN"];

/** floor以上のモードだけ残す（floorより下位を全排除） */
export function modesBelow(floor: ModeKey): ModeKey[] {
  const idx = MODE_ORDER.indexOf(floor);
  return MODE_ORDER.slice(0, idx);
}

/**
 * 前兆マトリクス
 * key1: ゾーンG数, key2: "前兆" | "東京上空" | "" (前兆なし)
 *
 * 仕様書 Section 2:
 *   50G  + 前兆(Stage)   → HEAVEN 濃厚
 *   50G  + 東京上空(NoStage) → CH以上 濃厚
 *   100G + なし(None)    → PRE 濃厚
 *   100G + 東京上空      → PRE 濃厚
 *   150G + なし          → B以上 期待（ソフト）
 *   150G + 前兆          → 本前兆濃厚（モード判定としてはdefault）
 *   150G + 東京上空      → B以上 濃厚
 *   200G + なし          → PRE 濃厚
 *   200G + 東京上空      → B以上 期待度UP（ソフト）
 *   250G + なし          → C以上 濃厚
 *   250G + 前兆          → 本前兆濃厚（default）
 *   250G + 東京上空      → C以上 濃厚
 *   300G + 東京上空      → CH 濃厚
 *   400G + なし          → C 濃厚
 *   500G + 東京上空      → CH 濃厚
 */
export const ZENCHO_MATRIX: Record<string, Record<string, ZenchoAction>> = {
  "50": {
    "前兆":     { type: "confirm", mode: "HEAVEN" },           // 天国濃厚
    "東京上空": { type: "confirmAbove", floor: "CH" },          // チャンス以上濃厚
    "前兆なし": { type: "default" },
    "":         { type: "default" },
  },
  "100": {
    "前兆":     { type: "default" },
    "東京上空": { type: "confirm", mode: "PRE" },               // 天国準備濃厚
    "前兆なし": { type: "confirm", mode: "PRE" },               // 天国準備濃厚
    "":         { type: "confirm", mode: "PRE" },
  },
  "150": {
    "前兆":     { type: "default" },                            // 本前兆（当選）濃厚
    "東京上空": { type: "confirmAbove", floor: "B" },           // 通常B以上濃厚
    "前兆なし": { type: "boost", modes: ["B", "C", "CH", "PRE", "HEAVEN"], factor: 1.5 }, // 通常B以上
    "":         { type: "boost", modes: ["B", "C", "CH", "PRE", "HEAVEN"], factor: 1.5 },
  },
  "200": {
    "前兆":     { type: "default" },
    "東京上空": { type: "boost", modes: ["B", "C", "CH", "PRE", "HEAVEN"], factor: 1.3 }, // B以上期待度UP
    "前兆なし": { type: "confirm", mode: "PRE" },               // 天国準備濃厚
    "":         { type: "confirm", mode: "PRE" },
  },
  "250": {
    "前兆":     { type: "default" },                            // 本前兆（当選）濃厚
    "東京上空": { type: "confirmAbove", floor: "C" },           // 通常C以上濃厚
    "前兆なし": { type: "confirmAbove", floor: "C" },           // 通常C以上濃厚
    "":         { type: "confirmAbove", floor: "C" },
  },
  "300": {
    "前兆":     { type: "default" },
    "東京上空": { type: "confirm", mode: "CH" },                // チャンス濃厚
    "前兆なし": { type: "confirm", mode: "CH" },                // チャンス濃厚
    "":         { type: "confirm", mode: "CH" },                // ★修正: default → CH濃厚
  },
  "400": {
    "前兆":     { type: "default" },
    "東京上空": { type: "default" },
    "前兆なし": { type: "confirm", mode: "C" },                 // 通常C濃厚
    "":         { type: "confirm", mode: "C" },
  },
  "500": {
    "前兆":     { type: "default" },
    "東京上空": { type: "confirm", mode: "CH" },                // チャンス濃厚
    "前兆なし": { type: "confirm", mode: "CH" },                // ★修正: default → CH濃厚
    "":         { type: "confirm", mode: "CH" },                // ★修正: default → CH濃厚
  },
  "600": {
    "前兆":     { type: "default" },                            // 本前兆濃厚
    "東京上空": { type: "default" },                            // 本前兆濃厚
    "前兆なし": { type: "default" },
    "":         { type: "default" },
  },
};

// -----------------------------------------------------------------------------
// 2. 招待状制約テーブル (Hard Constraints)
//    招待状の短縮キー → モード排除ルール
// -----------------------------------------------------------------------------

export interface InvitationConstraint {
  /** 直接排除するモード */
  eliminateModes?: ModeKey[];
  /** 残りG数上限（天井がこれを超えるモードを排除） */
  maxRemainingG?: number;
}

/** 各モードの天井G数 */
export const MODE_CEILINGS: Record<ModeKey, number> = {
  A: 600, B: 600, C: 500, CH: 600, PRE: 300, HEAVEN: 100,
};

/**
 * 招待状キーワード → 制約マッピング
 * 招待状は "短縮名 - 説明" 形式。短縮名部分でマッチ。
 */
export const INVITATION_CONSTRAINTS: Record<string, InvitationConstraint> = {
  "最悪の":   { eliminateModes: ["A", "B", "CH"] },         // 600G天井否定
  "3時までに": { maxRemainingG: 300 },                       // 残り300G以内
  "2時までに": { maxRemainingG: 200 },                       // 残り200G以内
  "今すぐ":   { maxRemainingG: 100 },                       // 残り100G以内
  "喰うか喰": { maxRemainingG: 200, eliminateModes: [] },   // 200G以内 or 500G以上（複雑、簡易実装）
};

// -----------------------------------------------------------------------------
// 3. アイキャッチテーブル (Soft/Hard)
// -----------------------------------------------------------------------------

export interface EyecatchEffect {
  type: "none" | "boost" | "hardConfirm";
  /** boostの場合: 対象モードに掛ける倍率 */
  boostModes?: ModeKey[];
  boostFactor?: number;
  /** hardConfirmの場合: 確定モード */
  confirmMode?: ModeKey;
}

export const EYECATCH_TABLE: Record<string, EyecatchEffect> = {
  "金木研":         { type: "none" },
  "霧嶋董香":       { type: "boost", boostModes: ["B", "C", "CH", "PRE", "HEAVEN"], boostFactor: 1.5 },
  "笛口雛実":       { type: "boost", boostModes: ["C", "CH", "PRE", "HEAVEN"], boostFactor: 2.0 },
  "月山習":         { type: "boost", boostModes: ["CH", "PRE", "HEAVEN"], boostFactor: 2.5 },
  "神代利世":       { type: "boost", boostModes: ["PRE", "HEAVEN"], boostFactor: 3.0 },
  "赫眼/喰種ver.":  { type: "hardConfirm", confirmMode: "HEAVEN" },
};

// -----------------------------------------------------------------------------
// 4. CZ失敗エンドカード → 次ブロック事前確率テーブル
//    endingSuggestion の [cz失敗] 系 → 次ブロックのモード下限
// -----------------------------------------------------------------------------

/**
 * CZエンドカードキャラ名 → 次ブロックで排除するモード
 * endingSuggestion例: "[cz失敗] 亜門鋼太朗 - 通常B以上濃厚"
 * → キャラ名 "亜門鋼太朗" を抽出してマッチ
 */
export const CZ_ENDCARD_TABLE: Record<string, ModeKey[]> = {
  // キャラ名 → 排除するモード（下位を排除 = 以上が濃厚）
  "金木研":         [],                                  // デフォルト
  "霧嶋董香":       ["A"],                               // B以上示唆
  "笛口雛実":       ["A"],                               // B以上示唆
  "亜門鋼太朗":     ["A"],                               // B以上濃厚
  "真戸呉緒":       ["A", "B"],                          // C以上濃厚
  "金木研（喰種）": ["A", "B", "C"],                     // CH以上濃厚
  "霧嶋董香（喰種）": ["A", "B", "C"],                   // CH以上濃厚
  "月山習":         ["A", "B", "C", "CH"],               // PRE以上濃厚
  "神代利世":       ["A", "B", "C", "CH", "PRE"],        // HEAVEN濃厚
  "鈴屋什造":       [],                                  // 偶数設定濃厚（モード補正なし）
  "梟":             [],                                  // 設定4以上（モード補正なし）
  "有馬貴将":       [],                                  // 設定6（モード補正なし）
};

/**
 * endingSuggestion からキャラ名を抽出
 * 例: "[cz失敗] 亜門鋼太朗 - 通常B以上濃厚" → "亜門鋼太朗"
 */
export function extractEndCardCharacter(endingSuggestion: string): string | null {
  if (!endingSuggestion.startsWith("[cz失敗]")) return null;
  const match = endingSuggestion.match(/\[cz失敗\]\s*(.+?)\s*-/);
  return match ? match[1].trim() : null;
}
