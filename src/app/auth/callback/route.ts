// =============================================================================
// VALVRAVE-RESONANCE: Google OAuth コールバックルート
// Google → Supabase → /auth/callback?code=... → /dashboard
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncProfile } from "@/lib/supabase/profile-sync";
import type { Database } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    console.error("[Auth Callback] code パラメータがありません");
    // [BYPASS] /login 隔離中 → /dashboard へ直接
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // ① code を session に交換
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[Auth Callback] exchangeCodeForSession error:", error?.message);
    // [BYPASS] /login 隔離中 → /dashboard へ直接
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ② Profile Sync: profiles テーブルに upsert
  await syncProfile(supabase, data.user);

  // ③ ダッシュボードへリダイレクト
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
