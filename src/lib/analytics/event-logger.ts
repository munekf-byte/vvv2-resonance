// =============================================================================
// TGR Resonance: 統計分析レイヤー — 汎用イベントロガー (client-only)
// fire-and-forget + keepalive、失敗は黙殺してオフラインキューに退避。
// UX に一切の影響を与えない (await 禁止)。
// =============================================================================

import { enqueueOffline } from "./offline-queue";

/**
 * 統計分析イベントを送信する。
 *
 * - fire-and-forget: 戻り値なし、await しない
 * - 失敗時 (ネットワーク不通 / API エラー / SSR等): localStorage キューに退避
 * - 例外は内部で握りつぶす。呼び出し元のメインフローを絶対にブロックしない
 *
 * @param eventType エンドポイントのスラッグ (例: "cz-event", "at-set")
 * @param payload   送信するイベント本体 (1 件)
 */
export function logAnalyticsEvent(eventType: string, payload: unknown): void {
  if (typeof window === "undefined") return;

  try {
    const body = JSON.stringify({ events: [payload] });
    fetch(`/api/analytics/${eventType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) enqueueOffline(eventType, payload);
      })
      .catch(() => {
        enqueueOffline(eventType, payload);
      });
  } catch {
    enqueueOffline(eventType, payload);
  }
}
