/** 無課金者のセッション表示上限 */
export const FREE_SESSION_LIMIT = 3;

export function canViewSession(index: number, isPro: boolean): boolean {
  return isPro || index < FREE_SESSION_LIMIT;
}

export function canAccessTotalAnalysis(isPro: boolean): boolean {
  return isPro;
}
