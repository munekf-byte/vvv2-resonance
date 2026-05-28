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

// 尤度設計方針 (v5.46 統合完全版 — NotebookLM 開発トリビア116回統合):
// - 濃厚事象は 0.80〜0.90 とし、他モードに 0.05〜0.10 の「遊び」を残す（100%固着回避）
// - 旧解析値（新ソースで言及されなかったセル）は残置し、新ソースのセルを上書きする差分パッチ方式
// - 「不明」タイプ = ユーザーがウォッチしたが判別不能 → 全モードに均等に近い微弱な重み
// - 「即前兆」ゾーン = AT終了直後/ブロック開始直後の煽り判定
// - HardConfirm(100%確定) は「赫眼/喰種ver.」「有馬失敗後」のみ
export const ZENCHO_LIKELIHOOD: Record<string, Record<string, ModeLikelihood | null>> = {
  "即前兆": {
    //                                     A     B     C     CH    PRE   HEAVEN
    "東京上空": { A: 0.05, B: 0.05, C: 0.05, CH: 0.10, PRE: 0.15, HEAVEN: 0.60 }, // 引き戻し/天国期待
    "不明":     { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.20, HEAVEN: 0.20 }, // 弱補正
    "":         null,
  },
  "50": {
    "前兆":     { A: 0.05, B: 0.05, C: 0.05, CH: 0.20, PRE: 0.20, HEAVEN: 0.45 }, // チャンス以上
    "東京上空": { A: 0.01, B: 0.01, C: 0.01, CH: 0.02, PRE: 0.05, HEAVEN: 0.90 }, // 天国濃厚
    "前兆なし": null,
    "不明":     { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.20, HEAVEN: 0.20 },
    "":         null,
  },
  "100": {
    "前兆":     null,
    "東京上空": { A: 0.10, B: 0.10, C: 0.10, CH: 0.15, PRE: 0.55, HEAVEN: X }, // PRE期待
    "前兆なし": { A: 0.05, B: 0.05, C: 0.05, CH: 0.05, PRE: 0.80, HEAVEN: X }, // 天国準備濃厚
    "不明":     { A: 0.20, B: 0.20, C: 0.20, CH: 0.20, PRE: 0.20, HEAVEN: X },
    "":         { A: 0.10, B: 0.10, C: 0.10, CH: 0.10, PRE: 0.60, HEAVEN: X }, // デフォルトもPRE寄り
  },
  "150": {
    "前兆":     { A: 0.10, B: 0.50, C: 0.10, CH: 0.10, PRE: 0.20, HEAVEN: X }, // 通常B以上
    "東京上空": { A: 0.01, B: 0.01, C: 0.01, CH: 0.02, PRE: 0.05, HEAVEN: X }, // 本前兆(当選)濃厚
    "前兆なし": { A: 0.10, B: 0.60, C: 0.10, CH: 0.10, PRE: 0.10, HEAVEN: X }, // B寄り（旧値維持）
    "不明":     { A: 0.25, B: 0.25, C: 0.25, CH: 0.25, PRE: X,    HEAVEN: X },
    "":         { A: 0.10, B: 0.50, C: 0.15, CH: 0.15, PRE: 0.10, HEAVEN: X },
  },
  "200": {
    "前兆":     { A: 0.30, B: 0.10, C: 0.30, CH: 0.10, PRE: 0.20, HEAVEN: X }, // A/C天井意識
    "東京上空": { A: 0.10, B: 0.40, C: 0.20, CH: 0.15, PRE: 0.15, HEAVEN: X }, // B以上期待UP
    "前兆なし": { A: 0.05, B: 0.05, C: 0.05, CH: 0.05, PRE: 0.80, HEAVEN: X }, // 天国準備濃厚
    "不明":     { A: 0.25, B: 0.25, C: 0.25, CH: 0.25, PRE: X,    HEAVEN: X },
    "":         { A: 0.15, B: 0.15, C: 0.15, CH: 0.15, PRE: 0.40, HEAVEN: X },
  },
  "250": {
    "前兆":     { A: 0.05, B: 0.05, C: 0.60, CH: 0.15, PRE: 0.15, HEAVEN: X }, // 通常C以上
    "東京上空": { A: 0.01, B: 0.01, C: 0.01, CH: 0.02, PRE: 0.05, HEAVEN: X }, // 本前兆濃厚
    "前兆なし": { A: 0.05, B: 0.10, C: 0.60, CH: 0.15, PRE: 0.10, HEAVEN: X }, // C寄り（旧値維持）
    "不明":     { A: 0.33, B: 0.33, C: 0.34, CH: X,    PRE: X,    HEAVEN: X },
    "":         { A: 0.05, B: 0.10, C: 0.50, CH: 0.20, PRE: 0.15, HEAVEN: X },
  },
  "300": {
    "前兆":     null,
    "東京上空": { A: 0.05, B: 0.05, C: 0.10, CH: 0.80, PRE: X,    HEAVEN: X }, // CH寄り
    "前兆なし": { A: 0.05, B: 0.05, C: 0.05, CH: 0.85, PRE: X,    HEAVEN: X }, // チャンス濃厚
    "不明":     { A: 0.33, B: 0.33, C: X,    CH: 0.34, PRE: X,    HEAVEN: X },
    "":         { A: 0.20, B: 0.20, C: 0.20, CH: 0.40, PRE: X,    HEAVEN: X },
  },
  "400": {
    "前兆":     null,
    "東京上空": null,
    "前兆なし": { A: 0.05, B: 0.05, C: 0.90, CH: X,    PRE: X,    HEAVEN: X }, // 通常C濃厚
    "不明":     { A: 0.50, B: 0.50, C: X,    CH: X,    PRE: X,    HEAVEN: X },
    "":         { A: 0.15, B: 0.15, C: 0.70, CH: X,    PRE: X,    HEAVEN: X },
  },
  "500": {
    "前兆":     null,
    "東京上空": { A: 0.05, B: 0.05, C: X,    CH: 0.80, PRE: X,    HEAVEN: X }, // CH寄り
    "前兆なし": { A: 0.05, B: 0.05, C: X,    CH: 0.90, PRE: X,    HEAVEN: X }, // チャンス濃厚
    "不明":     { A: 0.50, B: 0.50, C: X,    CH: X,    PRE: X,    HEAVEN: X },
    "":         { A: 0.15, B: 0.15, C: X,    CH: 0.70, PRE: X,    HEAVEN: X },
  },
  "600": {
    // UI削除済み（v5.41）。旧データ互換のため定義のみ残置。すべて null（補正なし）。
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
