// =============================================================================
// 設定差判定ロジック
// 実績確率を設定別基準値と比較し、推定設定帯を返す
// =============================================================================

export type SettingGrade = "low" | "mid" | "high" | "vhigh" | "neutral";

/** 設定帯ごとの背景色 */
export const SETTING_COLORS: Record<SettingGrade, { bg: string; color: string }> = {
  neutral: { bg: "transparent", color: "#374151" },
  low:     { bg: "#fef2f2", color: "#991b1b" },     // 低設定域（赤薄）
  mid:     { bg: "#fffbeb", color: "#92400e" },     // 中間（黄薄）
  high:    { bg: "#f0fdf4", color: "#166534" },     // 高設定域（緑薄）
  vhigh:   { bg: "#dbeafe", color: "#1e40af" },     // 設定5以上域（青薄）
};

/**
 * 確率系の設定差判定
 * count回 / denomG消化 の実績を、設定1〜6の基準確率と比較
 * thresholds: [設定1確率, 設定2, 設定3, 設定4, 設定5, 設定6] (1/n形式の分母)
 */
export function gradeByProb(
  count: number,
  denom: number,
  thresholds: [number, number, number, number, number, number],
): SettingGrade {
  if (count <= 0 || denom <= 0) return "neutral";
  const actual = denom / count; // 実績の1/n
  // actual が小さいほど高確率 = 高設定寄り
  if (actual <= thresholds[5]) return "vhigh";  // 設定6以上
  if (actual <= thresholds[3]) return "high";   // 設定4以上
  if (actual <= thresholds[1]) return "mid";    // 設定2相当
  return "low";
}

/**
 * 割合系の設定差判定
 * rate = count/total の実績を、設定別基準%と比較
 * thresholds: [設定1%, 設定6%]
 */
export function gradeByRate(
  count: number,
  total: number,
  low: number,   // 設定1の基準%
  high: number,  // 設定6の基準%
): SettingGrade {
  if (total <= 0) return "neutral";
  const rate = (count / total) * 100;
  const mid = (low + high) / 2;
  const q3 = (mid + high) / 2;
  if (rate >= q3) return "vhigh";
  if (rate >= mid) return "high";
  if (rate >= low) return "mid";
  return "low";
}

// ── 各項目の設定別基準値 ──────────────────────────────────────────────────

/** CZ合算確率 (1/n) 設定1〜6 */
export const CZ_PROB = [262.6, 247.3, 234.4, 221.5, 212.4, 203.7] as const;

/** エピソードボーナス確率 (1/n) */
export const EPI_PROB = [6620.2, 5526.8, 4421.4, 3977.3, 3315.0, 2639.5] as const;

/** AT直撃確率 (1/n) */
export const DIRECT_AT_PROB = [28460.6, 21345.5, 14230.3, 11384.2, 9225.1, 7036.8] as const;

/** AT合算確率 (1/n) */
export const AT_COMBINED_PROB = [394.4, 358.7, 323.0, 297.2, 278.5, 261.3] as const;

/** 裏AT突入率 (%) */
export const URA_AT_RATE = [1.10, 1.56, 1.56, 2.34, 2.34, 3.32] as const;

/** 精神世界33G選択率の相対倍率 (設定6は設定1の約4倍) */
export const SHINSEKAI_33G_WEIGHT = [1.0, 1.5, 1.5, 2.5, 2.5, 4.0] as const;

/** AT引き戻し当選率 (%) */
export const HIKIMODOHI_RATE = [7.81, 9.77, 9.77, 11.72, 12.50, 15.23] as const;
