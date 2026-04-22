// =============================================================================
// Discord OAuth 開始エンドポイント
// /api/discord-oauth/start → state cookie 設定 → Discord 認可画面へリダイレクト
// =============================================================================

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  // 未ログインなら /pro に戻す
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/pro?discord=unauth`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    console.error("[discord-oauth/start] DISCORD_CLIENT_ID not configured");
    return NextResponse.redirect(`${origin}/pro?discord=unconfigured`);
  }

  const state = randomUUID();
  const redirectUri = `${origin}/api/discord-oauth/callback`;

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "none");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
