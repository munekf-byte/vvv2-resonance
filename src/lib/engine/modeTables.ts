// =============================================================================
// TOKYO GHOUL RESONANCE: モード推定データテーブル v2.0
// ベイズ尤度更新方式
// docs/tg-mode-estimation.md 準拠
// =============================================================================

import type { ModeKey } from "./modeEstimation";

// -----------------------------------------------------------------------------
// 0. 共通ユーティリティ
// -----------------------------------------------------------------------------

const MODE_ORDER: ModeKey[] = ["A", "B", "C", "CH", "PRE", "HEAVEN"];

export function modesBelow(floor: ModeKey): ModeKey[] {
  const idx = MODE_ORDER.indexOf(floor);
  return MODE_ORDER.slice(0, idx);
}

// 0 = そのモードの天井超過により物理的に否定
const X = 0;

// -----------------------------------------------------------------------------
// 1. 前兆履歴 尤度マトリクス (Likelihood Matrix)
//    key1: ゾーンG数, key2: "前兆" | "東京上空" | "前兆なし" | ""
//    値: 各モードの尤度（乗算後に正規化） null = 補正なし
// -----------------------------------------------------------------------------

type ModeLikelihood = Record<ModeKey, number>;

// 尤度設計方針:
// - 「濃厚」= 期待度UP（0.40〜0.60）であり「確定」ではない
// - 他モード（天井未超過）には必ず 0.10〜0.20 の余地を残す
// - 複数ゾーンの情報が積み重なって初めてモードが絞り込まれる設計
// - HardConfirm(100%確定) は「50G前兆ステージ」「赫眼/喰種ver.」のみ
export const ZENCHO_LIKELIHOOD: Record<string, Record<string, ModeLikelihood | null>> = {
  "50": {
    //                                     A     B     C     CH    PRE   HEAVEN
    "前兆":     { A: 0.01, B: 0.01, C: 0.01, CH: 0.02, PRE: 0.05, HEAVEN: 0.90 }, // 天国ほぼ確定（唯一のHard級）
    "東京上空": { A: 0.05, B: 0.05, C: 0.10, CH: 0.30, PRE: 0.25, HEAVEN: 0.25 }, // CH以上濃厚
    "前兆なし": null,
    "":         null,
  },
  "100": {
    "前兆":     null,
    "東京上空": { A: 0.10, B: 0.10, C: 0.10, CH: 0.15, PRE: 0.55, HEAVEN: X }, // PRE寄り
    "前兆なし": { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.40, HEAVEN: X }, // PRE期待度UP
    "":         { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.40, HEAVEN: X },
  },
  "150": {
    "前兆":     null, // 本前兆（当選示唆、モード情報なし）
    "東京上空": { A: 0.05, B: 0.35, C: 0.25, CH: 0.15, PRE: 0.20, HEAVEN: X }, // B以上濃厚
    "前兆なし": { A: 0.10, B: 0.50, C: 0.15, CH: 0.15, PRE: 0.10, HEAVEN: X }, // B寄り
    "":         { A: 0.10, B: 0.50, C: 0.15, CH: 0.15, PRE: 0.10, HEAVEN: X },
  },
  "200": {
    "前兆":     null,
    "東京上空": { A: 0.10, B: 0.25, C: 0.20, CH: 0.20, PRE: 0.25, HEAVEN: X }, // B以上期待度UP
    "前兆なし": { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.40, HEAVEN: X }, // PRE期待度UP
    "":         { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.40, HEAVEN: X },
  },
  "250": {
    "前兆":     null, // 本前兆（当選示唆）
    "東京上空": { A: 0.05, B: 0.05, C: 0.35, CH: 0.25, PRE: 0.30, HEAVEN: X }, // C以上濃厚
    "前兆なし": { A: 0.05, B: 0.10, C: 0.50, CH: 0.20, PRE: 0.15, HEAVEN: X }, // C寄り
    "":         { A: 0.05, B: 0.10, C: 0.50, CH: 0.20, PRE: 0.15, HEAVEN: X },
  },
  "300": {
    "前兆":     null,
    "東京上空": { A: 0.05, B: 0.05, C: 0.10, CH: 0.60, PRE: X,    HEAVEN: X }, // CH寄り（東京上空は強め）
    "前兆なし": { A: 0.20, B: 0.20, C: 0.20, CH: 0.40, PRE: X,    HEAVEN: X }, // CH期待度UP
    "":         { A: 0.20, B: 0.20, C: 0.20, CH: 0.40, PRE: X,    HEAVEN: X },
  },
  "400": {
    "前兆":     null,
    "東京上空": null,
    "前兆なし": { A: 0.15, B: 0.15, C: 0.55, CH: X,    PRE: X,    HEAVEN: X }, // C寄り
    "":         { A: 0.15, B: 0.15, C: 0.55, CH: X,    PRE: X,    HEAVEN: X },
  },
  "500": {
    "前兆":     null,
    "東京上空": { A: 0.05, B: 0.05, C: X,    CH: 0.60, PRE: X,    HEAVEN: X }, // CH寄り
    "前兆なし": { A: 0.15, B: 0.15, C: X,    CH: 0.55, PRE: X,    HEAVEN: X }, // CH期待度UP
    "":         { A: 0.15, B: 0.15, C: X,    CH: 0.55, PRE: X,    HEAVEN: X },
  },
  "600": {
    "前兆":     null,
    "東京上空": null,
    "前兆なし": null,
    "":         null,
  },
};

// -----------------------------------------------------------------------------
// 2. 招待状制約テーブル (Hard Constraints)
// -----------------------------------------------------------------------------

export interface InvitationConstraint {
  eliminateModes?: ModeKey[];
  maxRemainingG?: number;
}

export const MODE_CEILINGS: Record<ModeKey, number> = {
  A: 600, B: 600, C: 500, CH: 600, PRE: 300, HEAVEN: 100,
};

export const INVITATION_CONSTRAINTS: Record<string, InvitationConstraint> = {
  "最悪の":    { eliminateModes: ["A", "B", "CH"] },
  "3時までに": { maxRemainingG: 300 },
  "2時までに": { maxRemainingG: 200 },
  "今すぐ":    { maxRemainingG: 100 },
  "喰うか喰":  { maxRemainingG: 200 },
};

// -----------------------------------------------------------------------------
// 3. アイキャッチテーブル (Soft/Hard)
// -----------------------------------------------------------------------------

export interface EyecatchEffect {
  type: "none" | "likelihood" | "hardConfirm";
  likelihood?: ModeLikelihood;
  confirmMode?: ModeKey;
}

export const EYECATCH_TABLE: Record<string, EyecatchEffect> = {
  "金木研":         { type: "none" },
  "霧嶋董香":       { type: "likelihood", likelihood: { A: 0.10, B: 0.35, C: 0.20, CH: 0.15, PRE: 0.10, HEAVEN: 0.10 } },
  "笛口雛実":       { type: "likelihood", likelihood: { A: 0.05, B: 0.10, C: 0.30, CH: 0.25, PRE: 0.15, HEAVEN: 0.15 } },
  "月山習":         { type: "likelihood", likelihood: { A: 0.02, B: 0.03, C: 0.10, CH: 0.25, PRE: 0.30, HEAVEN: 0.30 } },
  "神代利世":       { type: "likelihood", likelihood: { A: 0.01, B: 0.02, C: 0.05, CH: 0.10, PRE: 0.30, HEAVEN: 0.52 } },
  "赫眼/喰種ver.":  { type: "hardConfirm", confirmMode: "HEAVEN" },
};

// -----------------------------------------------------------------------------
// 4. CZ失敗エンドカード → 次ブロック事前確率テーブル
// -----------------------------------------------------------------------------

export const CZ_ENDCARD_TABLE: Record<string, ModeKey[]> = {
  "金木研":           [],
  "霧嶋董香":         ["A"],
  "笛口雛実":         ["A"],
  "亜門鋼太朗":       ["A"],
  "真戸呉緒":         ["A", "B"],
  "金木研（喰種）":   ["A", "B", "C"],
  "霧嶋董香（喰種）": ["A", "B", "C"],
  "月山習":           ["A", "B", "C", "CH"],
  "神代利世":         ["A", "B", "C", "CH", "PRE"],
  "鈴屋什造":         [],
  "梟":               [],
  "有馬貴将":         [],
};

export function extractEndCardCharacter(endingSuggestion: string): string | null {
  if (!endingSuggestion.startsWith("[cz失敗]")) return null;
  const match = endingSuggestion.match(/\[cz失敗\]\s*(.+?)\s*-/);
  return match ? match[1].trim() : null;
}
