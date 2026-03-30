// =============================================================================
// VALVRAVE-RESONANCE: 表示フォーマットユーティリティ
// =============================================================================

/**
 * 差枚数を符号付きで表示する
 * 例: 1500 → "+1,500" | -500 → "-500"
 */
export function formatDiff(diff: number): string {
  const abs = Math.abs(diff).toLocaleString("ja-JP");
  return diff >= 0 ? `+${abs}` : `-${abs}`;
}

/**
 * ゲーム数を表示する
 * 例: 1234 → "1,234G"
 */
export function formatGames(games: number): string {
  return `${games.toLocaleString("ja-JP")}G`;
}

/**
 * 確率を%表示する (小数点1桁)
 * 例: 0.3456 → "34.6%"
 */
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

/**
 * ISO 8601 を "HH:MM" 形式で表示する
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}
