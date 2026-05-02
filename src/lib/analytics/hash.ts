// =============================================================================
// TGR Resonance: 統計分析レイヤー — user_id ハッシュ化 (server-only)
// SHA-256(userId + ":" + pepper) で個人特定不可能化。
// pepper ローテーションは想定しない (漏洩時は再蓄積で対応)。
// =============================================================================

import { createHash } from "node:crypto";

export function hashUserId(userId: string): string {
  const pepper = process.env.ANALYTICS_HASH_PEPPER;
  if (!pepper) {
    throw new Error("ANALYTICS_HASH_PEPPER is not configured");
  }
  return createHash("sha256").update(`${userId}:${pepper}`).digest("hex");
}

export function hashOpaqueId(rawId: string): string {
  const pepper = process.env.ANALYTICS_HASH_PEPPER;
  if (!pepper) {
    throw new Error("ANALYTICS_HASH_PEPPER is not configured");
  }
  return createHash("sha256").update(`${rawId}:${pepper}`).digest("hex");
}
