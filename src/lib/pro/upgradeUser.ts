// =============================================================================
// 共通: ユーザーをPro昇格させる処理
//
// このヘルパーは Stripe Webhook と PayPay 手動承認 API の両方から呼ばれる。
// どちらの経路でも同じUX（is_pro / show_pro_popup / 昇格メール / Discordロール）
// を提供することを保証する。
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendProUpgradeEmail } from "@/lib/email/sendMail";

export type UpgradeResult = {
  ok: boolean;
  email?: string | null;
  displayName?: string | null;
  error?: string;
};

/**
 * 指定ユーザーを Pro に昇格させる。
 *
 * - profiles.is_pro = true
 * - profiles.show_pro_popup = true（次回ダッシュボード表示で祝福ポップアップ）
 * - 昇格通知メール送信（best-effort）
 * - Discord ロール付与（best-effort、discord_id 未連携ならスキップ）
 *
 * @param supabaseAdmin service_role キーで作成された SupabaseClient
 * @param userId 昇格対象ユーザーの id
 * @param fallbackEmail プロフィール未作成時に insert で使う email（Webhook経由用）
 */
export async function upgradeUserToPro(
  supabaseAdmin: SupabaseClient,
  userId: string,
  fallbackEmail?: string,
): Promise<UpgradeResult> {
  // 1) profiles を update（既存行の場合）
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ is_pro: true, show_pro_popup: true })
    .eq("id", userId)
    .select("id, email, display_name, discord_id")
    .maybeSingle();

  if (updateErr) {
    console.error("[upgradeUserToPro] update error:", updateErr.message);
    return { ok: false, error: updateErr.message };
  }

  let email: string | null | undefined = (updated as { email?: string } | null)?.email;
  let displayName: string | null | undefined = (updated as { display_name?: string | null } | null)
    ?.display_name;
  let discordId: string | null | undefined = (updated as { discord_id?: string | null } | null)
    ?.discord_id;

  // 2) 行が無ければ insert（Stripe Webhook の初回購入時など）
  if (!updated) {
    const insertEmail = fallbackEmail ?? "";
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email: insertEmail,
        is_pro: true,
        show_pro_popup: true,
      })
      .select("id, email, display_name, discord_id")
      .single();

    if (insertErr) {
      console.error("[upgradeUserToPro] insert error:", insertErr.message);
      return { ok: false, error: insertErr.message };
    }
    email = (inserted as { email?: string } | null)?.email;
    displayName = (inserted as { display_name?: string | null } | null)?.display_name;
    discordId = (inserted as { discord_id?: string | null } | null)?.discord_id;
  }

  // 3) 昇格通知メール（best-effort）
  if (email) {
    await sendProUpgradeEmail({ to: email, displayName }).catch((err) =>
      console.error("[upgradeUserToPro] sendProUpgradeEmail failed:", err),
    );
  } else {
    console.warn("[upgradeUserToPro] email 不明のためメール送信スキップ:", userId);
  }

  // 4) Discord ロール付与（best-effort）
  if (discordId) {
    await grantDiscordRole(discordId).catch((err) =>
      console.error("[upgradeUserToPro] grantDiscordRole failed:", err),
    );
  }

  return { ok: true, email, displayName };
}

async function grantDiscordRole(discordId: string): Promise<void> {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;
  if (!botApiUrl || !botApiSecret) {
    console.warn("[grantDiscordRole] Bot API URL/Secret 未設定、スキップ");
    return;
  }
  const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botApiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ discord_id: discordId, role: "TGR-Pro" }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[grantDiscordRole] Bot API error:", res.status, body);
  }
}
