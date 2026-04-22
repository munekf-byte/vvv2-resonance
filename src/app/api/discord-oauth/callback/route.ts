// =============================================================================
// Discord OAuth コールバック
// Discord からの code を受け取り、ユーザーID を取得して profiles に保存、
// is_pro なら即座にロール付与して /pro に戻す
// =============================================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const discordErr = url.searchParams.get("error");

  const back = (status: string) =>
    NextResponse.redirect(`${origin}/pro?discord=${status}`);

  if (discordErr) {
    return back("denied");
  }
  if (!code || !state) {
    return back("invalid");
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("discord_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return back("state_mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return back("unauth");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[discord-oauth/callback] OAuth not configured");
    return back("unconfigured");
  }

  // code → access_token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/discord-oauth/callback`,
    }),
  });
  if (!tokenRes.ok) {
    console.error("[discord-oauth/callback] token exchange failed:",
      tokenRes.status, await tokenRes.text());
    return back("token_failed");
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return back("token_failed");

  // access_token → Discord ユーザー情報
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    console.error("[discord-oauth/callback] user fetch failed:",
      userRes.status, await userRes.text());
    return back("user_failed");
  }
  const discordUser = (await userRes.json()) as { id?: string };
  const discordId = discordUser.id;
  if (!discordId || !/^\d{17,20}$/.test(discordId)) {
    return back("invalid_id");
  }

  // profiles に保存
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ discord_id: discordId })
    .eq("id", user.id);
  if (updateErr) {
    console.error("[discord-oauth/callback] update failed:", updateErr.message);
    return back("db_failed");
  }

  // is_pro なら即ロール付与
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  if (profile?.is_pro) {
    await grantDiscordRole(discordId, "TGR-Pro");
  }

  const response = back("success");
  response.cookies.delete("discord_oauth_state");
  return response;
}

async function grantDiscordRole(discordId: string, role: string) {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;
  if (!botApiUrl || !botApiSecret) {
    console.warn("[discord-oauth/callback] Bot API not configured");
    return;
  }
  try {
    const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord_id: discordId, role }),
    });
    if (!res.ok) {
      console.error("[discord-oauth/callback] bot api error:",
        res.status, await res.text());
    } else {
      console.log("[discord-oauth/callback] role granted:", role, "to", discordId);
    }
  } catch (err) {
    console.error("[discord-oauth/callback] bot api fetch failed:", err);
  }
}
